# Dockerfile
## 概述
&emsp;&emsp;Docker 镜像是 Docker 运行应用程序的基础，而 Dockerfile 用于描述 Docker 镜像的构建过程。Dockerfile
文件里面保存了镜像编译过程中用到的所有指令。

&emsp;&emsp;本文档用于介绍编写 Dockerfile 文件时常用的指令。

&emsp;&emsp;完成 Dockerfile 文件的编写后，可以通过 Docker Buildx [[链接](/blogs/docker/buildx)]或 Docker Buildx
Bake [[链接](/blogs/docker/buildx-bake)]工具将镜像构建出来。

## 格式
&emsp;&emsp;我们来看看一个简单的 Dockerfile 示例：

```dockerfile
# 必须以 FORM 开头，指定本镜像的基础镜像
FROM nginx:1.25.3

# 添加静态文件指镜像中
ADD ./html.tar.gz /usr/share/nginx

# 指定镜像暴露的端口号
EXPOSE 80

# 镜像的启动命令
CMD ["nginx", "-g", "daemon off;"]
```

## 指令
### FROM
&emsp;&emsp;`FROM` 指令会初始化一个新的构建阶段，并为这个构建阶段设置基础镜像（Base Image）作为接下来的指令的运行环境。因此，一个有效的
Dockerfile 文件必须以 `FROM` 指令开头。

```txt
FROM [--platform=<platform>] <image>[:<tag>|@<digest>] [AS <name>]
```

&emsp;&emsp;使用 `FROM` 指令时，需要注意以下内容：

- 只有 `ARG` 指令可以出现在 `FROM` 之前，如：

```dockerfile
ARG IMAGE_VERSION=latest
FROM base:${IMAGE_VERSION}
```

- 在一个 Dockerfile 文件中，`FROM` 指令可以出现多次，用于多阶段构建。最后编译出来的镜像只与最后的 `FROM`
  指令有前，前面的 `FROM` 指令主要用于辅助构建。
- 可以通过 `AS name` 的方式为 `FROM`
  指令创建的构建阶段命名。后续的指令可以通过这个名称引用该构建阶段，如 `COPY --from=name>` 从指定阶段中复制文件到当前构建阶段。
- `tag` 和 `digest` 都是可选项。如果两者都没有指定，则默认使用 `latest` 标签。
- 如果镜像存在多个指令集，可以通过 `--platform` 选项指定镜像的指令集。如果未指定该选项，则默认使用构建时当前的指令集类型。

### RUN
&emsp;&emsp;`RUN` 指令用于执行任意命令并创建新的层（layer），这些层是只读的。`RUN` 指令支持以下两种格式：

- `RUN <command>`：以 shell 格式执行，在 Linux 中默认使用 `/bin/sh -c` 执行，在 Windows 中默 认使用 `cmd /S /C` 执行。
- `RUN ["executable", "param1", "param2"]`: 以 exec 格式执行。

&emsp;&emsp;需要注意，以 shell 格式执行命令时，可以用到很多 shell 命令的特性，如：

```dockerfile
RUN /bin/bash -c 'source $HOME/.bashrc && \
echo $HOME'

# 上面的命令等价于
RUN /bin/bash -c 'source $HOME/.bashrc && echo $HOME'
```

&emsp;&emsp;使用 exec 格式执行命令时，需要以 JSON 数组的方式传递命令，这意味着你必须每个命令词都使用双引号（"）包起来，如：

```dockerfile
RUN ["/bin/bash", "-c", "echo hello"]
```

&emsp;&emsp;与 shell 格式命令不同的地方，exec 不会通过 shell 执行，这个意味着普通 shell 中的命令处理过程不会发生成 exec
上。如 `RUN ["echo", "$HOME"]` 命令不会将 `$HOME` 替换为环境变量的值。如果你想 exec 格式的命令也可以处理 shell
格式的命令，可以使用 `RUN ["sh", "-c", "echo $HOME"]` 这样的方式执行命令。这个替换过程是由 shell 执行的，而非 docker。

&emsp;&emsp;如果 `RUN` 命令没有变动，那么 `RUN` 命令会在接下来的构建中被缓存。如 `RUN apt-get dist-upgrade -y`
命令会在下一次构建中继续使用，而非每次构建都重复执行，这将大大加速构建速度。如果你不想使用缓存，可以在构建时使用 `--no-cache`
标识，如 `docker build --no-cache`。

> 在 Dockerfile 最佳实践[[链接](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)]中查看更多关于 RUN 的推荐用法。

### CMD
&emsp;&emsp;在 Dockerfile 中，`CMD` 只能出现一次，如果出现多次，则以最后出现的 `CMD` 指令为准。`CMD` 指令支持以下三种格式：

- `CMD ["executable", "param1", "param2"]`: 以 exec 格式执行（推荐）
- `CMD ["param1", "param2"]`: 作为 ENTRYPOINT 的默认参数
- `CMD command param1 param2`: 以 shell 格式执行

&emsp;&emsp;`CMD`
指令的主要作用是为容器运行提供默认值。这些默认值包括可执行文件、相关参数。如果没有包含可执行文件，那么你还需要指定 `ENTRYPOINT`
指令。

&emsp;&emsp;如果 `CMD` 指令用于向 `ENTRYPOINT` 指令传递默认参数，那么这两个指令都应该使用 JSON 数组格式。

&emsp;&emsp;如果用户在执行 `docker run` 命令时指定了参数，那么这些参数将会覆盖 `CMD` 指定的参数。

> 注意，不要混淆了 `RUN` 指令和 `CMD` 指令。`RUN` 指令会在编译的时候直接执行并生成一个镜像层，而 `CMD` 在编译期并不会真正执行，该指令主要用于指定镜像在运行时的命令。

### LABEL
&emsp;&emsp;`LABEL` 指令用于添加一些标签元数据（metadata）到镜像。`LABEL` 指令支持以下用法:

```dockerfile
LABEL "com.example.vendor"="ACME Incorporated"
LABEL com.example.label-with-value="foo"
LABEL version="1.0"
LABEL description="This text illustrates \
that label-values can span multiple lines."
```

> 注意使用双引号（"）而非单引号（'），特别是当你想使用字符串解包功能时（如 `LABEL example="foo-$ENV_VAR"`），单引号将认为括号中的字符串是不需要解包操作的。

&emsp;&emsp;标签存在继承性，即父镜像的标签会被继承到子镜像中。如果子镜像存在同名但不同值的标签，则子镜像的标签会覆盖父镜像标签。

&emsp;&emsp;通过 `docker image inspect` 命令，可以查看镜像的标签信息。如：

```bash
$ docker image inspect --format='{{json .Config.Labels}}' <image-name>

{
  "com.example.vendor": "ACME Incorporated",
  "com.example.label-with-value": "foo",
  "version": "1.0",
  "description": "This text illustrates that label-values can span multiple lines.",
  "multi.label1": "value1",
  "multi.label2": "value2",
  "other": "value3"
}
```

### EXPOSE
&emsp;&emsp;`EXPOSE` 指令用于通知 Docker 容器在运行时将监控指定的网络端口。你同时可以指定端口是监听 TCP 还是
UDP。如果不指定协议，则默认监听 TCP 协议。`EXPOSE` 指令的格式如下：

```dockerfile
EXPOSE <port> [<port>/<protoccol>...]
```

&emsp;&emsp;`EXPOSE`
指令并不会正真监听或暴露一个端口，该指令的作用主要用于给使用这个镜像的用户提供文档性的指引，告诉用户本镜像将会监听哪些端口。正真暴露端口的时候，是通过在执行 `docker run`
命令时添加 `-p` 参数完成的。

```dockerfile
# 以 udp 协议监听 80 端口
EXPOSE 80/udp

# 如果要同时监听 tcp 和 udp 端口，则需要以下两行
EXPOSE 80/tcp
EXPOSE 80/udp
```

### ENV
&emsp;&emsp;`ENV` 指令用通过用键 `<key>` 值 `<value>` 对的方式声明环境变量。这个环境变量会被接下来的指令所使用。`ENV`
指令的格式如下：

```dockerfile
ENV MY_NAME="John Doe"
ENV MY_DOG=Rex\ The\ Dog
ENV MY_CAT=fluffy

# 支持一次性声明多个环境变量
ENV MY_NAME="John Doe" MY_DOG=Rex\ The\ Dog \
    MY_CAT=fluffy
```

&emsp;&emsp;使用 `ENV` 指令声明的环境变量，会持久化到镜像的运行时。通过 `docker inspect`
命令查看镜像的环境变量，在运行镜像时可以通过 `docker run --env <key>=<value>` 的方式修改环境变量。

&emsp;&emsp;在构建过程中，构建阶段（stage）会继承所有的父阶段或先祖阶段使用 `ENV` 指令声明的环境变量。

&emsp;&emsp;环境变量的持化久可能会引起不必要的副作用，比如 `ENV DEBIAN_FRONTEND=noninteractive` 会修改 `apt-get`
的行为，这会造成使该镜像的用户产生疑惑。如果一个环境变量只在构建阶段使用，在运行时不需要的话，可以通过以下方式替换：

```dockerfile
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y ...

# 也可以通过 ARG 的方式
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y ...
```

### ADD
&emsp;&emsp;`ADD` 指令用于向镜像添加文件。`ADD` 指令的格式如下：

```dockerfile
ADD [--chown=<user>:<group>] [--chmod=<perms>] [--checksum=<checksum>] <src>... <dest>
```

> 注意，--chown 和 --chmod 功能仅支持 Linux 基础的镜像，不支持 Windows 基础的镜像。

&emsp;&emsp;`ADD` 指令可以用于添加文件、文件夹或远程 URL。如果 `<src>`
资源是本地文件或文件夹，应使用构建上下文的相对路径。`<src>` 还支持 Go 语言的
filepath.Match[[链接](https://pkg.go.dev/path/filepath#Match)]的匹配规则。

```dockerfile
# 添加所有以 hom 开头的文件
ADD home* /mydir/

# 添加所有名称符合 hom[x].txt 的文件
ADD hom?.txt /mydir
```

&emsp;&emsp;注意，`<dest>` 一般是绝对路径。如果是相对路径时，参考物为 `WORKDIR`：

```dockerfile
# test.txt 将会被添加到 <WORKDIR>/relativeDir/
ADD test.txt relativeDir/

# test.txt 将会被添加到 /absoluteDir/
ADD test.txt /absoluteDir/
```

&emsp;&emsp;除非特别指定了 `--chown`，所有添加的文件、文件夹都是以 UID 为 0 的用户、GID 为 0 的分组身分创建的。`--chown`
参数支持指定用户名（username）或分组名（groupname）字符串，或直接使用 UID、GID
数字以两者的任意组合。如果是通过用户名（username）或分组名（groupname）来指定，则容器会通过 `/etc/passwd` 和 `/etc/group`
文件将用户名和分组名翻译成对应的 UID 或 GID。以下的 `--chown` 的使用方法都是正确的：

```dockerfile
ADD --chown=55:mygroup files* /somedir/
ADD --chown=bin files* /somedir/
ADD --chown=1 files* /somedir/
ADD --chown=10:11 files* /somedir/
ADD --chown=myuser:mygroup files* /somedir/
```

&emsp;&emsp;如果在容器里找到不到 `/etc/passwd` 和 `/etc/group` 文件，或在这文件里面找到 `--chown` 指定的名称，`ADD`
指令将执行失败。直接使用 UID、GID 不会依赖和查找上述两个文件。

&emsp;&emsp;当 `<src>` 是远程文件 URL 时，下载回来的文件将被授到 `600` 权限。如果远程文件 URL 返回了 `Last-Modified`
响应头，那么这个时间戳将作为文件的 `mtime` 值。

&emsp;&emsp;除了以上内容，`ADD` 指令还遵循以下规则：

- `<src>` 路径必须在构建上下文内，这意味着不支持 `ADD ../something /something` 这种操作。这是因为 `docker build`
  的第一个步骤就是将上下文里面的文件复制到 docker 的守护进程中，然后再执行构建操作；
- 如果 `<src>` 是一个 URL，并且 `<dest>`以 `/` 结束，那么将会从 URL 中去推断文件名并下载到 `<dest>/<filename>`
  。例如 `ADD http://example.com/test.txt /workspace/` 将会创建 `/workspace/test/txt`；
- 如果 `<src>` 是一个文件夹，那么整个文件夹包括文件元数据将会被完整拷贝（不包括 `<src>` 的文件元数据）；
- 如果 `<src>` 是一个本地 tar 压缩包（常见的压缩格式，如 identity,gzip,bzip2 或 xz），那么在添加时将会被自动解压成文件夹。远程
  URL 不会被自动解压；
- 如果 `<src>` 是其它任意类型的文件，都只会只拷贝文件的数据而不拷贝文件的元数据。如果 `<dest>` 以 `/`
  结束，那么将会把文件复制到 `<dest>/<src.filename>`；
- 如果多个 `<src>` 被指定，无论是直接指定还是通过匹配符匹配，`<dest>` 必须是一个文件夹，也就是必须以 `/` 结束；
- 如果 `<dest>` 没有以 `/` 结束，那么将认为这是一个常规文件，因此 `<src>` 的数据会直接写入到 `<dest>` 中；
- 如果 `<dest>` 不存在，那么在复制的过程中会自动创建对应的文件夹及文件。

### COPY
&emsp;&emsp;`COPY` 指令与 `ADD` 指令的作用差不多，用于复制文件到镜像内。`COPY` 指令的语法如下：

```dockerfile
COPY [--chown=<user>:<group>] [--chmod=<perms>] <src>... <dest>
```

&emsp;&emsp;`COPY` 指令与 `ADD` 指令的行为基本一致。两者有以下的区别：

- `COPY` 指令支持通过 `--from=<stage-name>` 的方式从前面的构建阶段（以 `FROM .. AS <stage-name>` 创建）中复制文件；
- `COPY` 不支持 `<http src>`；
- 如果 `<src>` 是一个本地 tar 压缩包，`COPY` 仅仅只是复制，而 `ADD` 会自动解压；

### ENTRYPOINT
&emsp;&emsp;`ENTRYPOINT` 指令用于配置容器就像一个可执行程序一般启动。`ENTRYPOINT` 的语法如下：

```dockerfile
# 以 shell 格式执行
ENTRYPOINT command param1 param2

# 以 exec 格式执行
ENTRYPOINT ["executable", "param1", "param2"]
```

&emsp;&emsp;`docker run <image>` 的命令行参数会被追加到 exec 格式的 `ENTRYPOINT`，并覆盖所有 `CMD`
传递的参数。如 `docker run <image> -d` 命令会将 `-d` 参数传递给 `ENTRYPOINT`。通过 `docker run --entrypoint`
可以在运行时覆盖 `ENTRYPOINT` 指令。

&emsp;&emsp;如果使用的是 shell 格式的 `ENTRYPOINT` 指令，那么 `CMD` 或 `docker run` 命令的参数将不会被传递给 `ENTRYPOINT`
。除此之外，使用 shell 格式的 `ENTRYPOINT` 最终是以 `/bin/sh -c`
的方式去运行程序的，这将导致程序无法接收信号量（signals）。这意味着可执行文件不会成为容器 `PID 1` 的进程，因此也就无法接收到
Unix 信号，如可执行文件无法接收到 `docker stop <container>` 触发的 `SIGTERM` 信号量。

#### exec 格式
&emsp;&emsp;你可以使用 exec 格式的 `ENTRYPOINT` 去设置那些几乎固定的命令与参数去运行容器，然后再通过 `CMD`
去设置那些容易变动的参数，如：

```dockerfile
FROM ubuntu
ENTRYPOINT ["top", "-b"]
CMD ["-c"]
```

&emsp;&emsp;当你运行这个容器的时候，你可以发现 `top` 是这个容器的唯一进程：

```bash
$ docker run -it --rm --name test top -H
top - 18:44:42 up 1 min,  0 users,  load average: 0.22, 0.08, 0.03
Threads:   1 total,   1 running,   0 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.4 us,  1.3 sy,  0.0 ni, 97.9 id,  0.0 wa,  0.0 hi,  0.4 si,  0.0 st
MiB Mem :  15997.7 total,  14234.2 free,    856.0 used,    907.4 buff/cache
MiB Swap:   1024.0 total,   1024.0 free,      0.0 used.  14810.8 avail Mem 

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
    1 root      20   0    7312   3200   2816 R   0.0   0.0   0:00.00 top
```

&emsp;&emsp;另起一个终端，执行以下命令，发现容器是以 `top -b -H` 命令启动的：

```bash
$ docker exec -it test ps aux
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.0   7280  3200 pts/0    Ss+  18:45   0:00 top -b -H
root         7  0.0  0.0   7060  2816 pts/1    Rs+  18:45   0:00 ps aux
```

&emsp;&emsp;现在你可以通过 `docker stop test` 的方式优雅地请求关闭 `top` 进程了：

```bash
$ docker stop test 
test
```

&emsp;&emsp;接下来我们看另一个例子。下面的 Dockerfile 中展示了使用 `ENTRYPOINT` 在前台运行 Apache：

```dockerfile
FROM debian:stable
RUN apt-get update && apt-get install -y --force-yes apache2
EXPOSE 80 443
VOLUME ["/var/www", "/var/log/apache2", "/etc/apache2"]
ENTRYPOINT ["/usr/sbin/apache2ctl", "-D", "FOREGROUND"]
```

&emsp;&emsp;如果你需要通过一个脚本来启动可执行文件，你可以通过 `exec` 和 `gosu` 命令来确保最终这个可执行文件可以接收到
Unix 信号量：

```shell
#!/usr/bin/env bash
set -e

if [ "$1" = 'postgres' ]; then
    chown -R postgres "$PGDATA"

    if [ -z "$(ls -A "$PGDATA")" ]; then
        gosu postgres initdb
    fi

    exec gosu postgres "$@"
fi

exec "$@"
```

&emsp;&emsp;最后，如果你需要在可执行文件关闭前做一些额外的清理工作，那么你需要确保 `ENTRYPOINT` 指定的脚本可以接收到 Unix
信号量：

```shell
#!/bin/sh
# Note: I've written this using sh so it works in the busybox container too

# USE the trap if you need to also do manual cleanup after the service is stopped,
#     or need to start multiple services in the one container
trap "echo TRAPed signal" HUP INT QUIT TERM

# start service in background here
/usr/sbin/apachectl start

echo "[hit enter key to exit] or run 'docker stop <container>'"
read

# stop service and clean up here
echo "stopping apache"
/usr/sbin/apachectl stop

echo "exited $0"
```

&emsp;&emsp;通过 `docker run -it --rm -p 80:80 --name test apache` 的方式去运行上面的镜像，然后你就可以通过 `docker exec`
或 `docker top` 来测试是否可以正常工作。同时还可以通过 `docker stop` 通过脚本去停止 Apache：

```bash
$ docker exec -it test ps aux

USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.1  0.0   4448   692 ?        Ss+  00:42   0:00 /bin/sh /run.sh 123 cmd cmd2
root        19  0.0  0.2  71304  4440 ?        Ss   00:42   0:00 /usr/sbin/apache2 -k start
www-data    20  0.2  0.2 360468  6004 ?        Sl   00:42   0:00 /usr/sbin/apache2 -k start
www-data    21  0.2  0.2 360468  6000 ?        Sl   00:42   0:00 /usr/sbin/apache2 -k start
root        81  0.0  0.1  15572  2140 ?        R+   00:44   0:00 ps aux

$ docker top test

PID                 USER                COMMAND
10035               root                {run.sh} /bin/sh /run.sh 123 cmd cmd2
10054               root                /usr/sbin/apache2 -k start
10055               33                  /usr/sbin/apache2 -k start
10056               33                  /usr/sbin/apache2 -k start

$ /usr/bin/time docker stop test

test
real	0m 0.27s
user	0m 0.03s
sys	0m 0.03s
```

&emsp;&emsp;与上面介绍的 `RUN`、`CMD` 指令一样，如果你使用的是 exec 格式的命令，那么命令将不再受到常规的 shell
处理过程，如 `ENTRYPOINT ["echo", "$HOME"]` 将不会把 `$HOME` 替换为环境变量的值。如果你想要用上 shell
的处理过程，可以使用 `ENTRYPOINT ["sh", "-c", "echo $HOME"]` 的方式运行可执行文件，但是这种方式将会导致可执行文件不是 PID
1 进程，因此将接收不到 Unix 信号量。

#### shell 格式
&emsp;&emsp;你可以直接为 `ENTRYPOINT` 指定一串字符串，那么这个字符串将会被 `/bin/sh -c` 的方式执行。这种式格会使用 shell
来处理命令中的环境变量的替换，同时也会忽略来自 `CMD` 指令或 `docker run`
指令提供的参数。为了确保可执行程序能够正确地接收 `docker stop` 发出来的信号量，你需要记得使用 `exec` 来启动可执行程序：

```dockerfile
FROM ubuntu
ENTRYPOINT exec top -b
```

&emsp;&emsp;当你运行起上面的镜像，你可以发现只有一个 `PID 1` 的进程：

```bash
$ docker run -it --rm --name test top

Mem: 1704520K used, 352148K free, 0K shrd, 0K buff, 140368121167873K cached
CPU:   5% usr   0% sys   0% nic  94% idle   0% io   0% irq   0% sirq
Load average: 0.08 0.03 0.05 2/98 6
  PID  PPID USER     STAT   VSZ %VSZ %CPU COMMAND
    1     0 root     R     3164   0%   0% top -b
```

&emsp;&emsp;因此该进程可以通过 `docker stop` 干净利落(在 0.2s 内)地退出。

```bash
$ /usr/bin/time docker stop test

test
real	0m 0.20s
user	0m 0.02s
sys	0m 0.04s
```

&emsp;&emsp;如果你忘记使用 `exec` 作为 `ENTRYPOINT` 的启动项，如：

```dockerfile
FROM ubuntu
ENTRYPOINT top -b
CMD -- --ignored-param1
```

&emsp;&emsp;那么再次运行起这个镜像时，可以发现 `top` 不是唯的的进程，其进程号也不是 `PID 1`。

```bash
$ docker run -it --name test top --ignored-param2

top - 13:58:24 up 17 min,  0 users,  load average: 0.00, 0.00, 0.00
Tasks:   2 total,   1 running,   1 sleeping,   0 stopped,   0 zombie
%Cpu(s): 16.7 us, 33.3 sy,  0.0 ni, 50.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   1990.8 total,   1354.6 free,    231.4 used,    404.7 buff/cache
MiB Swap:   1024.0 total,   1024.0 free,      0.0 used.   1639.8 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
    1 root      20   0    2612    604    536 S   0.0   0.0   0:00.02 sh
    6 root      20   0    5956   3188   2768 R   0.0   0.2   0:00.00 top
```

&emsp;&emsp;此时，执行 `docker stop test` 命令关闭容器时，会发现进程无法干净利落（超过了
10s）地被关闭，而是因为操作超时被发送 `SIGKILL` 信号量继而被强制杀死进程。

```bash
$ docker exec -it test ps waux

USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.4  0.0   2612   604 pts/0    Ss+  13:58   0:00 /bin/sh -c top -b --ignored-param2
root         6  0.0  0.1   5956  3188 pts/0    S+   13:58   0:00 top -b
root         7  0.0  0.1   5884  2816 pts/1    Rs+  13:58   0:00 ps waux

$ /usr/bin/time docker stop test

test
real	0m 10.19s
user	0m 0.04s
sys	0m 0.03s
```

#### CMD 与 ENTRYPOINT 的协作
&emsp;&emsp;`CMD` 指令和 `ENTRYPOINT` 指令都可以用于指定运行容器时需要执行的命令。以下有几个两者协作的一些规约：

- Dockerfile 必须至少指定一个 `CMD` 或 `ENTRYPOINT` 指令；
- 如果你希望将容器作为一个可执行程序来使用，那么应使用 `ENTRYPOINT` 指令；
- `CMD` 主要用于向 `ENTRYPOINT` 传递默认参数；
- `CMD` 可以在运执容器时被另外的参数覆盖；

&emsp;&emsp;以下表示展示了不同的 `ENTRYPOINT`/`CMD` 组合将会最终如何执行命令：

|                            | No ENTRYPOINT              | ENTRYPOINT exec_entry p1_entry | ENTRYPOINT ["exec_entry", "p1_entry"]          |
|----------------------------|----------------------------|--------------------------------|------------------------------------------------|
| No CMD                     | error, not allowed         | /bin/sh -c exec_entry p1_entry | exec_entry p1_entry                            |
| CMD ["exec_cmd", "p1_cmd"] | exec_cmd p1_cmd            | /bin/sh -c exec_entry p1_entry | exec_entry p1_entry exec_cmd p1_cmd            |
| CMD exec_cmd p1_cmd        | /bin/sh -c exec_cmd p1_cmd | /bin/sh -c exec_entry p1_entry | exec_entry p1_entry /bin/sh -c exec_cmd p1_cmd |

&emsp;&emsp;最后要注意的是，如果在当前镜像设置了 `ENTRYPOINT`，这会将父镜像指定的 `CMD` 指令清除了。因此如果你想使用 `CMD` 指令，那么你必须要在当前镜像指定 `CMD` 指令，无法复用父镜像的 `CMD` 指令。

### VOLUME
&emsp;&emsp;`VOLUME` 指令用于使用指定的名称创建一个挂载点，用于标记该路径是由本地宿主或其它容器提供的存储卷。`VOLUME` 支持以下语法：

```dockerfile
VOLUME "<mount-point>"

VOLUME ["<mount-point1>", "<mount-point2>", ...]
```

&emsp;&emsp;由于容器每次都是以全新的方式创建，这导至可执行文件无法持久化数据。用户在创建容器时，应将可持久化的存储卷挂载到容器指定的挂载点，以保证可执行文件的数据文件得以保存。

### USER
&emsp;&emsp;`USER` 指令用于设置当前构建阶段接下来的指令所使用的用户名（或 UID）或用户分组名（名 GID）（可选）。指定的用户会被用于 `RUN` 指令、`ENTRYPOINT` 指令和 `CMD` 指令。`USER` 指令语法如下：

```dockerfile
# USER runner
# USER runner:runner
USER <user>[:<group>]

# USER 200:200
USER UID[:GID]
```

&emsp;&emsp;注意，在使用 `USER` 指令前，应提前创建用户。

### WORKDIR
&emsp;&emsp;`WORKDIR` 指令用于指定接下来指令的工作目录，这将影响到 `RUN`、`CMD`、`ENTRYPOINT`、`COPY`、`ADD` 指令计算相对路径的结果。如果 `WORKDIR` 指定的径路不存在，则这个路径会自动创建。`WORKDIR` 指令的语法如下：

```dockerfile
WORKDIR /path/to/workdir
```

&emsp;&emsp;在一个 Dockerfile 文件中，`WORKDIR` 指令可以多次重复使用。如果提供的是一个相同路径，那么将会基于上一个 `WORKDIR` 的基础上计算下一个 `WORKDIR` 的路径。如以下：

```dockerfile
WORKDIR /a
WORKDIR b
WORKDIR c
RUN pwd
```

&emsp;&emsp;最终 `pwd` 将输出 `/a/b/c`。同时，`WORKDIR` 支持解析由 `ENV` 定义的环境变量。如：

```dockerfile
ENV DIRPATH=/path
WORKDIR $DIRPATH/$DIRNAME
RUN pwd
```

&emsp;&emsp;最终 `pwd` 将输出 `/path/$DIRNAME`。如果 `WORKDIR` 没有被指定，则默认的工作目录是 `/`。

### ARG
&emsp;&emsp;`ARG` 指令用于定义一个可以由用户通过 `docker build --build-arg <varname>=<value>` 的方式在构建期间传递的变量。`ARG` 指定的语法如下：

```dockerfile
ARG <name>[=<default value>]
```

&emsp;&emsp;如果用户指定了一个 Dockerfile 没有声明的变量，那么在构建过程中将会输出警告：

```txt
[Warning] One or more build-args [foo] were not consumed.
```

&emsp;&emsp;一个 Dockerfile 文件可以声明多个 `ARG` 指令。注意，不推荐使用 `ARG` 在构建期传递密钥（如 GitHub 密钥、用户凭证等）。构建期变量可以通过 `docker history` 命令获取，因此存在泄露风险。

&emsp;&emsp;Docker 已经预定义了以下 `ARG` 变量，因此你可以在不声明的情况下直接使用这些变量：

- HTTP_PROXY
- http_proxy
- HTTPS_PROXY
- https_proxy
- FTP_PROXY
- ftp_proxy
- NO_PROXY
- no_proxy
- ALL_PROXY
- all_proxy

&emsp;&emsp;上面的参数，可以直接通过 `--build-arg` 传递，如：

```bash
$ docker build --build-arg HTTPS_PROXY=https://user:pass@my-proxy.example.com .
```

&emsp;&emsp;这些预定义的变量不会在 `docker history` 中输出，以减少意外泄露敏感信息如上面的 `<user>` 和 `<pass>`。

&emsp;&emsp;当你使用 BuildKit[[链接](https://docs.docker.com/build/buildkit/)]构建镜像时，Docker 还提供了一些列预定义的 `ARG` 变量，用于提供编译平台（platform）相关信息以及目标镜像平台（target platform）信息。目标平台可以通过 `docker build --platform` 的方式指定。

&emsp;&emsp;以下的 `ARG` 变量会在编译期自动设置：

- `TARGETPLATFORM`: 构建目标的平台信息，如 `linux/amd64`、`linux/arm/v7`、`windows/amd64`；
- `TARGETOS`: `TARGETPLATFORM` 的 OS 部份，如 `linux/arm/v7` 里面的 `linux`；
- `TARGETARCH`: `TARGETPLATFORM` 的指令集部份，如 `linux/arm/v7` 里面的 `arm`；
- `TARGETVARIANT`: `TARGETPLATFORM` 的指令集变种部份，如 `linux/arm/v7` 里面的 `v7`；
- `BUILDPLATFORM`: 执行构建过程的编译平台信息；
- `BUILDOS`: `BUILDPLATFORM` 的 OS 部份；
- `BUILDARCH`: `BUILDPLATFORM` 的指令集部份;
- `BUILDVARIANT`: `BUILDPLATFORM` 的指令集变种部份;

&emsp;&emsp;如果你需要使用到上述 `ARG` 变量，你需要在 Dockerfile 中声明但不需要赋值这变量。如：

```dockerfile
FROM alpine
ARG TARGETPLATFORM
RUN echo "I'm building for $TARGETPLATFORM"
```

### ONBUILD
&emsp;&emsp;`ONBUILD` 指令用于添加延迟执行的触发器指令，这此指令将在那些以本镜像作为基础镜像的构建过程中被执行。`ONBUILD` 指令的语法如下：

```dockerfile
# ONBUILD ADD . /app/src
# ONBUILD RUN /usr/local/bin/python-build --dir /app/src
ONBUILD INSTRUCTION
```

&emsp;&emsp;这个指令主要用于父镜像依赖子镜像相关参数的场景下。如父镜像需要一些由子镜像定义的环境变量来控制镜像行为。举个例子，如果你的的镜像是一个可重用的 Python 应用编译器，它需要将应用的源代码添加到指定的文件夹下，然后执行相关构建脚本。因为父镜像不可能在构建期去添加子镜像（因为子镜像此时还不在）的源代码，因此这个应用编译器的镜像将非常难以定义。当然，你可以简单地将这些指令拷贝到子镜像的 Dockerfile 文件中从而解决上述问题，但始终这种行为不够高效、优雅的，并且当构建行为发生变化时，父镜像也很难更新所有子镜像的指令。

&emsp;&emsp;为了解决上述问题，`ONBUILD` 指令可以添加延迟执行的脚本到下一阶段的构建过程中。`ONBUILD` 的执行逻辑如下：

1. 当镜像构建器在解析 Dockerfile 的过程中，当它遇到 `ONBUILD` 指令时，会将这个指令作为元数据（metadata）添加到镜像中。`ONBUILD` 指令本身不会对当前镜像产生影响；
2. 在结束构建时，所有触发器将会被存储到键为 `OnBuild` 的镜像清单中（image manifest）。这些内容可以通过 `docker inspect` 命令查询到；
3. 接来下，这个镜像将会被其它镜像通过 `FORM` 指令指定为基础镜像。镜像流处理器在解析到 `FROM` 指令时，会去查询该镜像的 `ONBUILD` 指令，并与声明时相同的顺序执行这些触发器。如果任意触发器执行失败，那么 `FORM` 指定也会中断，因此导致构建失败。如果所有的触发器都执行成功，那么 `FORM` 指令才能完成并执行接下来的构建过程；
4. 触发器将会在镜像编译完毕后清理，也就是说孙镜像将不会再执行这些触发器。

&emsp;&emsp;以下面的 Dockerfile 为例：

```dockerfile
ONBUILD ADD . /app/src
ONBUILD RUN /usr/local/bin/python-build --dir /app/src
```

### STOPSIGNAL
&emsp;&emsp;`STOPSIGNAL` 指令用于指定过容器退出时所使用的信号量。`STOPSIGNAL` 指令的语法如下：

```dockerfile
# STOPSIGNAL SIGKILL
# STOPSIGNAL 9
STOPSIGNAL <signal>
```

&emsp;&emsp;`<signal>` 可以是信号量名称，如 `SIGKILL`，也可以是一个内核系统调用表（kernel's syscall table）的序号，如 `9`。默认值为 `SIGTERM`。在容器运行时，也可以通过 `docker run --stop-signal` 的方式覆盖。

### HEALTHCHECK
&emsp;&emsp;`HEALTHCHECK` 指令用于告诉 Docker 如何去检测容器是否还在正常工作。像 WebServer 一样，虽然它已经不能正常接收新的连接了，但是由于进程还存在，因此 Docker 无法感知其是否还处理正常工作中。`HEALTHCHECK` 指令的语法如下：

```dockerfile
# HEALTHCHECK --interval=5m --timeout=3s CMD curl -f http://localhost/ || exit 1
# HEALTHCHECK --interval=5m --timeout=3s CMD ["curl", "-f", "http://localhost/"]
HEALTHCHECK [OPTIONS] CMD command

# 禁用健康检测
HEALTHCHECK NONE
```

&emsp;&emsp;如果容器指定了健康检测，那么容器就有了健康状态（health status）。这个状态初始时为 `starting`；当健康检测通过时，状态变更为 `healthy`；当经过一系列次数的检测失败后，状态变更为 `unhealthy`.

&emsp;&emsp;`HEALTHCHECK` 支持以下检测选项：

- `--interval=DURATION`: 检测间隔，默认为 30s；
- `--timeout=DURATION`: 检测超时时间，默认为 30s；
- `--start-period=DURATION`: 应用启动周期，默认为 0s;
- `--start-interval=DURATION`: 起动周期的健康检测间隔，默认为 5s；
- `--retries=N`: 失败重试次数，默认为 3。

&emsp;&emsp;容器会在启动后，间隔 `interval` 时间后开始执行健康检查，之后每隔 `interval` 再次检查。如果检查返回结果的时间超过 `timeout` 则会被判定为失败。在失败次数超过 `retries` 次后，容器的健康状态会变更为 `unhealthy`。`start period` 用于指定容器启动需要的时间，健康探针在这段时间如果检测失败的话，不会计入最大失败次数，但是如果检测成功，则认为当前容器已经完成启动，在这之后的检测失败会计入失败次数中。`start interval` 用于指定在启动时间内健康探针的检测间隔。

&emsp;&emsp;一个 Dockerfile 只能有一个 `HEALTHCHECK` 指令，如果声明了多次指令，则最后声明的指令有效。

&emsp;&emsp;`CMD` 返回的状态码将作为容器是否健康的标识。返回状态码可能存在以下：

- 0: 检测成功（success），当前的容器是健康可用的；
- 1: 检测失败（unhealthy），代表当前容器不能正常工作；
- 2: 保留（reserved），不要使用本次退出状态码。

&emsp;&emsp;为了方便 DEBUG 探针失败的原因，所有使用命令使用 stdout 输出的文本（UTF-8 编码）会被存储起来，后续可以使用 `docker inspect` 查询这些日志。不过这些日志只会保留 4069 字节。
