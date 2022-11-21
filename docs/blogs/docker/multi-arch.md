# 构建多指令集镜像
## 概述
&emsp;&emsp;目前，CPU 有多种指令集类型。有些软件（特别是使用 C、C++ 语言的）需要在不同的指令集硬件上运行时，需要编译成对应的可执行文件才行。而 Docker 镜像也面临着这种问题。

&emsp;&emsp;为此，Docker 推出了 buildx 工具，可以将镜像打包为多指令集镜像，开发者在不同指令集的硬件上拉取镜像时，就可以拉取对应的镜像。

## 步骤
### 拉取编译镜像
&emsp;&emsp;在编译时，宿主机一般就只是某一种架构（如 x86），因此在一个宿主机是没办法编译出所有架构的，因此可以借助 Docker 的镜像来提供编译环境，做到类似交叉编译的效果。

```bash
$ docker run --privileged --rm tonistiigi/binfmt --install all
```

### 编写 Dockerfile
&emsp;&emsp;在编写 Dockerfile 时，需要通过 --platform=$TARGETPLATFORM 来获取当前编译环境的架构信息。这里以编译一个 clash-dashboard [[链接](https://github.com/Dreamacro/clash-dashboard)] 的 Docker 镜像为例子。

```docker
FROM --platform=$TARGETPLATFORM nginx:1.22.0
MAINTAINER Alan Yeh "alan@yeh.cn"

RUN rm -rf /usr/share/nginx/html

ADD ./html.tar.gz /usr/share/nginx

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 构建镜像
&emsp;&emsp;在 Dockerfile 的相同目录下，执行以下命令，构建多指令集的镜像，并将其推送到 DockerHub。

```bash
# 在构建前，需要登录一下
$ docker login

# 新建 Builder 实例
$ docker buildx create --use --name=clash-dashboard --driver docker-container --driver-opt image=dockerpracticesig/buildkit:master

# 查看当前实例
$ docker buildx ls

# 构建镜像并推送
# 这里指定了需要构建 8 种指令集的镜像
# 需要注意的时，这里需要参考 Dockerfile 的基础镜像可以支持哪些指令集。如果基础镜像不支持，那么你的镜像也是没办法支持的
$ docker buildx build --platform linux/386,linux/amd64,linux/arm/v5,linux/arm/v7,linux/arm64/v8,linux/mips64le,linux/ppc64le,linux/s390x -t centralx/clash-dashboard:latest . --push

# 完成构建后，删除 Buidler 实例
$ docker buildx rm clash-dashboard
```