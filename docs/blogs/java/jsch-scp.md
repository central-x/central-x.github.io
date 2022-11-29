# 基于 JSch 实现 Scp 文件传输
## 概述
&emsp;&emsp;JSch 是一个纯 Java 实现的 SSH2 类库，支持连接到一个 sshd 服务器。这里记录一下如何通过 JSch 实现 Scp 传输文件的逻辑。

&emsp;&emsp;注意，如果要传输一个文件夹的的话，递归调用这些方法即可。传输文件夹的时候，如果这个文件夹里面的文件数量比较多，那么有可能会比较慢，可以选用 Sftp [[链接](/blogs/java/jsch-sftp)]来实现上传下载。如果只传输一个文件的情况下， Scp 和 Sftp 的传输速度差不太多；如果文件数量特别大的情况下，Sftp 要远远快于 Scp。

&emsp;&emsp;上传文件和下载文件是一个相反的过程，可以对照着看。

&emsp;&emsp;以下代码中的 IOStreamx、Filex 等工具类由 central-framework [[链接](https://github.com/central-x/central-framework)]提供。

## 上传文件
### 总体流程
&emsp;&emsp;使用 JSch 实现文件下传需要通过以下流程实现。

1. 连接到服务器
2. 读取 ack（确认服务器已准备好）
3. 发送 `C0644 {filesize} {filename}\n`
4. 读取 ack （确认服务器已准备好传输）
5. 发送文件流
6. 发送 ack （通知服务器文件已完成传输）
7. 读取 ack（确认服务器已完成传输）

### 实现代码

```java
    /**
     * 将本地文件传输到远程服务器的指定路径
     *
     * @param host       主机
     * @param username   用户名
     * @param port       端口
     * @param password   密码
     * @param localFile  本地文件
     * @param remotePath 远程路径
     */
    public int scpFileTo(String host, String username, int port, String password, File localFile, Path remotePath) throws JSchException {
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
            var channel = (ChannelExec) session.openChannel("exec");
            // 将文件保存到服务器的指定路径
            channel.setCommand("scp -t " + remotePath.toString().replace(" ", "\\ ").replace("(", "\\(").replace(")", "\\)"));

            try (var output = IOStreamx.buffered(channel.getOutputStream()); var input = IOStreamx.buffered(channel.getInputStream())) {
                channel.connect();

                // 读取 ack
                if (readAck(input) != 0) {
                    return -1;
                }

                // 写入文件大小和文件名
                IOStreamx.writeLine(output, Stringx.format("C0644 {} {}", localFile.length(), localFile.getName()), StandardCharsets.UTF_8);

                // 读取 ack
                if (readAck(input) != 0) {
                    return -1;
                }

                // 写入文件内容
                try (var stream = IOStreamx.buffered(Files.newInputStream(localFile.toPath(), StandardOpenOption.READ))) {
                    IOStreamx.transfer(stream, output);
                }

                // 发送 ack
                sendAck(output);

                // 读取 ack
                if (readAck(input) != 0) {
                    return -1;
                }

                // 结束
                return 0;
            } catch (JSchException | IOException ex) {
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
     * 读取 ack 信号
     */
    protected int readAck(InputStream stream) throws IOException {
        // 读 1 个字节，用于确认
        int b = stream.read();
        if (b == 0) {
            // 成功
            return b;
        }
        if (b == -1) {
            // 失败
            return b;
        }
        if (b == 1 || b == 2) {
            // 读取异常信息
            var err = IOStreamx.readLine(stream, StandardCharsets.UTF_8);
            throw new ShellException(b, err);
        }
        return b;
    }

    /**
     * 发送 ack 信息
     */
    protected void sendAck(OutputStream stream) throws IOException {
        stream.write(0);
        stream.flush();
    }
```

## 下载文件
### 总体流程
&emsp;&emsp;使用 JSch 实现文件上传需要通过以下流程实现。

1. 连接到服务器
2. 发送 ack（告诉服务器本地已准备好）
3. 接收 `C0644 {filesize} {filename}\n`
4. 发送 ack （告诉服务器已准备好传输数据流）
5. 接收文件流
6. 读取 ack
7. 发送 ack（告诉服务器已完成传输）

### 实现代码

```java
    /**
     * 将服务器的文件传输到本地路径
     *
     * @param host       主机
     * @param username   用户名
     * @param port       端口
     * @param password   密码
     * @param remoteFile 远程文件
     * @param localPath  本地路径
     */
    public int scpFileFrom(String host, String username, int port, String password, Path remoteFile, Path localPath) throws JSchException {
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
            var channel = (ChannelExec) session.openChannel("exec");
            // 传输服务器指定文件
            channel.setCommand("scp -f " + remoteFile.toString().replace(" ", "\\ ").replace("(", "\\(").replace(")", "\\)"));

            try (var output = IOStreamx.buffered(channel.getOutputStream()); var input = IOStreamx.buffered(channel.getInputStream())) {
                channel.connect();
                channel.start();

                // 发送 ack
                sendAck(output);

                // 读取文件大小和文件名
                // C0644 {filesize} {filename}\n
                var meta = IOStreamx.readLine(input, StandardCharsets.UTF_8);
                var metas = meta.split(" ");
                // 解析文件大小
                var fileSize = Long.parseLong(metas[1]);
                // 解析文件名
                var filename = metas[2];

                // 发送 ack
                sendAck(output);

                var localFile = new File(localPath.toFile(), filename);
                Filex.delete(localFile);
                Assertx.mustTrue(localFile.createNewFile(), RuntimeException::new, "无法访问文件: " + localFile.getAbsolutePath());

                // 读取指定长度的数据流，并写入文件
                try (var stream = IOStreamx.buffered(Files.newOutputStream(localFile.toPath(), StandardOpenOption.WRITE))) {
                    IOStreamx.transfer(input, stream, fileSize);
                }

                // 读取 ack
                if (readAck(input) != 0) {
                    return -1;
                }

                // 发送 ack
                sendAck(output);

                // 结束
                return 0;
            } catch (JSchException | IOException ex) {
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
     * 读取 ack 信号
     */
    protected int readAck(InputStream stream) throws IOException {
        // 读 1 个字节，用于确认
        int b = stream.read();
        if (b == 0) {
            // 成功
            return b;
        }
        if (b == -1) {
            // 失败
            return b;
        }
        if (b == 1 || b == 2) {
            // 读取异常信息
            var err = IOStreamx.readLine(stream, StandardCharsets.UTF_8);
            throw new ShellException(b, err);
        }
        return b;
    }

    /**
     * 发送 ack 信息
     */
    protected void sendAck(OutputStream stream) throws IOException {
        stream.write(0);
        stream.flush();
    }
```