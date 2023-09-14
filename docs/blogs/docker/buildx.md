# Docker Buildx
## 概述
&emsp;&emsp;Buildx 是 Docker 推出的高层级镜像构建工具，用于替换早期的镜像构建工具 `docker build`。在后面较新版本的 Docker Desktop 和 Docker Engine（23.0+）中，在执行 `docker build` 命令时，实际上也是通过 Buildx 工具来完成构建过程的。

&emsp;&emsp;Buildx 不仅仅是 `build` 的升级版，而且包含了一系列工具去创建和管理构建工具。

&emsp;&emsp;使用 Buildx 时，一般遵循以下流程：

![](./assets/buildx.svg)

## 构建镜像
### 准备构建环境（QEMU）
&emsp;&emsp;目前，市面上常用的 CPU 有多种指令集类型。有些软件（特别是使用 C、C++ 语言编写的）需要将源代码编译成对应指令集的可执行文件才可以对应的 CPU 上运行。而 Docker 镜像也面临着这种问题。

&emsp;&emsp;在编译镜像时，如果这个镜像需要支持多指令集类型，那么就需要在各种指令集的编译环境下完成编译。`tonistiigi/binfmt` 镜像提供了多种指令集的编译摸拟器，因此可以在该镜像中编译出多种指令集的镜像。

```bash
# 本命令一般情况下只需要执行一次
$ docker run --rm --privileged tonistiigi/binfmt:latest --install all
```

### 准备构建环境（Buildx）
&emsp;&emsp;在执行 buildx 命令前，我们需要准备 buildx 的构建空间[[链接](https://docs.docker.com/engine/reference/commandline/buildx_create/)]。在创建这个构建空间时，我们需要指定相关驱动、配置信息等。

```bash
$ docker buildx create --use --name=<context-name> \
  --driver docker-container \
  --driver-opt image=moby/buildkit:master \
  --driver-opt network=host
```

### 登录 Registry
&emsp;&emsp;如果想在镜像构建完毕后自动推送到指定的镜像仓库，那么需要提前创建会话。

```bash
# 如果构建目标中包含多个 registry 的 tag，那么每个 registry 都需要执行登录操作
$ docker login <registry> -u <username> -p <password>
```

### 执行构建
&emsp;&emsp;完成以上准备工作后，即可开始构建镜像。

```bash
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
```

### 退出 Registry
&emsp;&emsp;本步骤不是必要步骤，但是在做自动化构建时，应及时退出 Registry 以保证仓库的安全。

```bash
$ docker logout <registry>
```

### 清理构建资源
&emsp;&emsp;完成构建之后，可以将相关构建资源清理和释放。

```bash
$ docker buildx rm <context-name>
```

## 常见问题
### 无法推送到私有仓库
&emsp;&emsp;一般情况下，为了方便工作及保证应用安全，我们不会将公司的应用发布到公有镜像托管服务，如 DockerHub、GitHub Packages。市面上有许多支持私有化部署的 Docker 镜像托管服务，如 Nexus3、Harber 等。如果你搭建的私有化镜像托管服务没有办法提供 https 协议访问时，那么使用上面的方式构建镜像时可能会提供镜像仓库访问失败的问题。

&emsp;&emsp;在这种情况下，我们需要提前创建构建环境的配置文件 `/etc/buildkitd.toml`，文件内容如下：

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

&emsp;&emsp;在准备构建环境（Buildx）环节添加 `--config` 标识并指定上面的配置文件即可。

```bash
$ docker buildx create --use --name=<context-name> \
  --driver docker-container \
  --driver-opt image=moby/buildkit:master \
  --driver-opt network=host \
  --config /etc/buildkitd.toml
```