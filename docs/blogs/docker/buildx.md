# 构建多指令集镜像
## 概述
&emsp;&emsp;目前，CPU 有多种指令集类型。有些软件（特别是使用 C、C++ 语言的）需要在不同的指令集硬件上运行时，需要编译成对应的可执行文件才行。而 Docker 镜像也面临着这种问题。

&emsp;&emsp;为此，Docker 推出了 buildx 工具，可以将镜像打包为多指令集镜像，开发者在不同指令集的硬件上拉取镜像时，就可以拉取对应的镜像。

## 步骤
### 拉取编译镜像
&emsp;&emsp;在编译时，宿主机一般就只是某一种架构（如 x86），因此在一个宿主机是没办法编译出所有架构的，因此可以借助 Docker 的镜像来提供编译环境，做到类似交叉编译的效果。

```bash
# 安装跨平台模拟器 QUME，后续构建时都需要依赖它
# 本命令一般情况下只需要执行一次
$ docker run --rm --privileged tonistiigi/binfmt:latest --install all
```

### 编写 Dockerfile
&emsp;&emsp;在编写 Dockerfile 时，需要通过 --platform=$TARGETPLATFORM 来获取当前编译环境的架构信息。这里以编译一个 java 的 Docker 镜像为例子。

```docker
FROM --platform=$TARGETPLATFORM centos:7.9.2009 as builder
# 通过这个参数来获取当前架构信息
# 一般取值为 linux/amd64、linux/arm64 这样
ARG TARGETPLATFORM
ENV LANG C.UTF-8

MAINTAINER Alan Yeh "alan@yeh.cn"

RUN rm -rf /usr/share/nginx/html

ADD ./html.tar.gz /usr/share/nginx

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 构建并推送镜像
&emsp;&emsp;在 Dockerfile 的相同目录下，执行以下命令，构建多指令集的镜像，并将其推送到 DockerHub。

```bash
# 在构建前，需要登录一下
$ docker login

# 新建 Builder 实例
# 注意，<image-name> 需要更换为待编译的镜像的名称
$ docker buildx create --use --name=<image-name> \
  --driver docker-container \
  --driver-opt image=moby/buildkit:master \
  --driver-opt network=host

# 构建镜像并推送
# 这里指定了需要构建 8 种指令集的镜像
# 需要注意的时，这里需要参考 Dockerfile-alpine 的基础镜像可以支持哪些指令集。如果基础镜像不支持，那么你的镜像也是没办法支持的
# 可以通过 -t 指定镜像的标签。
# 注意，<repository> 需要变为你的私库或 docker.io 的用户名
# <image-name> 需要更换为待编译的镜像名
$ docker buildx build \
  --platform linux/386,linux/amd64,linux/arm/v5,linux/arm/v7,linux/arm64/v8,linux/mips64le,linux/ppc64le,linux/s390x \
  -t <repository>/<image-name>:latest \
  -t <repository>/<image-name>:<version> \
  . --push

# 完成构建后，删除 Buidler 实例
$ docker buildx rm <image-name>
```

### 构建并推送镜像（私有仓库）
&emsp;&emsp;如果你搭建的 Docker Registry 没办法提供 https 协议访问，那么使用上面的方式构建镜像时，会提示访问镜像仓库失败的问题。在这种情况下，我们需要提前创建构建镜像的配置文件 `/etc/buildkitd.toml`，文件内容如下：

```toml
debug = true
# 将 mirror.cluster.k8s 仓库设为 docker.io 加速镜像
# 如果在 mirror.cluster.k8s 仓库里没找到镜像，才会去 docker.io 上找镜像
[registry."docker.io"]
  mirrors = ["mirror.cluster.k8s"]
  http = true
  insecure = true

# 设置为允许不安全访问，也就是使用 http 协议访问 mirror.cluster.k8s
[registry."mirror.cluster.k8s"]
  http = true
  insecure = true
```

&emsp;&emsp;构建镜像时，需要使用以下命令来构建：

```bash
# 新建 Builder 实例
$ docker buildx create --use --name=<image-name> \
  --driver docker-container \
  --driver-opt image=moby/buildkit:master \
  --driver-opt network=host \
  --config /etc/buildkitd.toml

# 构建镜像并推送
# 需要注意的时，这里需要参考 Dockerfile-alpine 的基础镜像可以支持哪些指令集。如果基础镜像不支持，那么你的镜像也是没办法支持的
$ docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <repository>/<image-name>:latest \
  -t <repository>/<image-name>:<version> \
  . --push

# 完成构建后，删除 Buidler 实例
$ docker buildx rm clash-dashboard
```