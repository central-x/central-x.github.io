# 基于 JSch 实现 Sftp 文件传输
## 概述
&emsp;&emsp;JSch 是一个纯 Java 实现的 SSH2 类库，支持连接到一个 sshd 服务器。这里记录一下如何通过 JSch 实现 Sftp 传输文件的逻辑。

&emsp;&emsp;以下代码中的 IOStreamx、Filex 等工具类由 central-framework [[链接](https://github.com/central-x/central-framework)]提供。

## 上传文件（夹）

```java
    /**
     * 将文件（夹）上传到服务器的指定路径
     *
     * @param host       主机名
     * @param username   用户名
     * @param port       端口
     * @param password   密码
     * @param localFile  本地文件（夹）
     * @param remotePath 服务器路径，支持相对路径，如 ~/test
     */
    public void sftpTo(String host, String username, int port, String password, File localFile, Path remotePath) throws JSchException {
        var factory = new JSch();
        // 创建会话
        var session = factory.getSession(username, host, port);
        // 设置连接密码
        session.setPassword(password);
        session.setConfig("StrictHostKeyChecking", "no");

        try {
            // 连接服务器
            session.connect();

            // 传输频道
            var channel = (ChannelSftp) session.openChannel("sftp");

            try {
                channel.connect();
                // 进入指定路径
                this.cd(channel, remotePath);

                // 传输文件（夹）
                if (localFile.isDirectory()) {
                    this.sftpDirectoryTo(channel, localFile);
                } else if (localFile.isFile()) {
                    this.sftpFileTo(channel, localFile);
                } else {
                    throw new IOException("不支持的文件: " + localFile.getAbsolutePath());
                }
            } catch (SftpException | IOException ex) {
                throw new RuntimeException(ex.getLocalizedMessage(), ex);
            } finally {
                // 结束连接
                channel.disconnect();
            }
        } finally {
            session.disconnect();
        }
    }

    /**
     * 传输文件夹到服务器
     *
     * @param channel   传输频道
     * @param directory 文件夹
     */
    private void sftpDirectoryTo(ChannelSftp channel, File directory) throws IOException, SftpException {
        this.cd(channel, directory.getName());

        var files = directory.listFiles();
        if (Arrayx.isNotEmpty(files)) {
            for (var file : files) {
                if (file.isDirectory()) {
                    this.sftpDirectoryTo(channel, file);
                } else if (file.isFile()) {
                    this.sftpFileTo(channel, file);
                } else {
                    throw new IOException("不支持的文件: " + file.getAbsolutePath());
                }
            }
        }

        this.cd(channel, "..");
    }

    /**
     * 传输文件到服务器
     *
     * @param channel 传输频道
     * @param file    文件
     */
    private void sftpFileTo(ChannelSftp channel, File file) throws IOException, SftpException {
        try (var input = IOStreamx.buffered(Files.newInputStream(file.toPath(), StandardOpenOption.READ))) {
            channel.put(input, file.getName());
        }
    }

    /**
     * 进入文件夹，如果没有，则创建
     *
     * @param channel   传输频道
     * @param directory 文件夹
     */
    private void cd(ChannelSftp channel, String directory) throws SftpException {
        // 尝试直接进入目录
        try {
            channel.cd(directory);
        } catch (SftpException ex) {
            // 进入失败，可能目录不存在
            if (ex.id == 2) {
                // No such file
                channel.mkdir(directory);
                channel.cd(directory);
            } else {
                throw new ShellException("无法进入文件夹: " + directory, ex);
            }
        }
    }

    /**
     * 进入指定路径
     *
     * @param channel 传输频道
     * @param path    路径
     */
    private void cd(ChannelSftp channel, Path path) throws SftpException {
        if (path.isAbsolute()) {
            // 如果是绝对路径，则需要先进入 /
            this.cd(channel, "/");
        }
        for (int i = 0, count = path.getNameCount(); i < count; i++) {
            var name = path.getName(i).toString();
            if ("~".equals(name)) {
                this.cd(channel, Path.of(channel.getHome()));
            } else if (".".equals(name)) {
                // 进入当前目录，忽略
            } else {
                this.cd(channel, name);
            }
        }
    }
```

## 下载文件（夹）

```java
    /**
     * 将服务器上的文件（夹）传输到本地指定路径
     *
     * @param host       主机名
     * @param username   用户名
     * @param port       端口
     * @param password   密码
     * @param remoteFile 服务器文件（夹）
     * @param localPath  本地路径
     */
    public void sftpFrom(String host, String username, int port, String password, Path remoteFile, Path localPath) throws JSchException {
        var factory = new JSch();
        // 创建会话
        var session = factory.getSession(username, host, port);
        // 设置连接密码
        session.setPassword(password);
        session.setConfig("StrictHostKeyChecking", "no");

        try {
            // 连接服务器
            session.connect();

            // 传输频道
            var channel = (ChannelSftp) session.openChannel("sftp");

            try {
                channel.connect();

                // 将相对路径转成绝对路径
                remoteFile = toAbsolute(channel, remoteFile);

                // 查询路径状态
                // 文件不存在时会抛异常
                var stat = channel.stat(remoteFile.toString());

                if (stat.isDir()) {
                    this.sftpDirectoryFrom(channel, remoteFile, localPath);
                } else {
                    this.sftpFileFrom(channel, remoteFile, localPath);
                }
            } catch (SftpException | IOException ex) {
                throw new RuntimeException(ex.getLocalizedMessage(), ex);
            } finally {
                // 结束连接
                channel.disconnect();
            }
        } finally {
            session.disconnect();
        }
    }

    /**
     * 将相对路径转成绝对路径
     *
     * @param channel 传输路径
     * @param path    路径
     */
    private Path toAbsolute(ChannelSftp channel, Path path) throws SftpException, IOException {
        if (path.isAbsolute()) {
            return path.toAbsolutePath();
        } else {
            return switch (path.getName(0).toString()) {
                case "." -> Path.of(channel.pwd()).resolve(path.subpath(1, path.getNameCount())).toAbsolutePath();
                case ".." -> Path.of(channel.pwd()).resolve(path).toAbsolutePath();
                case "~" -> Path.of(channel.getHome()).resolve(path.subpath(1, path.getNameCount())).toAbsolutePath();
                default -> throw new IOException("解析路径异常");
            };
        }
    }

    /**
     * 将服务器文件夹传输到本地
     *
     * @param channel   传输频道
     * @param directory 文件夹
     */
    private void sftpDirectoryFrom(ChannelSftp channel, Path directory, Path localPath) throws IOException, SftpException {
        var localDirectory = localPath.resolve(directory.getFileName());
        if (!localDirectory.toFile().exists() || !localDirectory.toFile().isDirectory()) {
            Assertx.mustTrue(localDirectory.toFile().mkdirs(), IOException::new, "无法访问本地指定路径: " + localPath);
        }

        var files = channel.ls(directory.toString());
        for (var file : files) {
            if (file instanceof ChannelSftp.LsEntry entry) {
                if (".".equals(entry.getFilename()) || "..".equals(entry.getFilename())) {
                    continue;
                } else {
                    if (entry.getAttrs().isDir()) {
                        sftpDirectoryFrom(channel, directory.resolve(entry.getFilename()), localDirectory);
                    } else {
                        sftpFileFrom(channel, directory.resolve(entry.getFilename()), localDirectory);
                    }
                }
            }
        }
    }

    /**
     * 将服务器文件传输到本地
     *
     * @param channel 传输频道
     * @param file    文件
     */
    private void sftpFileFrom(ChannelSftp channel, Path file, Path localPath) throws IOException, SftpException {
        var localFile = localPath.resolve(file.getFileName()).toFile();
        if (localFile.exists()) {
            if (localFile.isFile()) {
                Filex.delete(localFile);
            }
        }
        Assertx.mustTrue(localFile.createNewFile(), IOException::new, "无法访问路径: " + localPath);
        try (var output = IOStreamx.buffered(Files.newOutputStream(localFile.toPath(), StandardOpenOption.WRITE))) {
            channel.get(file.toString(), output);
        }
    }
```