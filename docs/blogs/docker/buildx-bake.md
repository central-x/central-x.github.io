# Docker Buildx Bake
## 概述
&emsp;&emsp;一般情况下，我们通常是使用 `docker build` 命令去构建 Docker 镜像。但是随着镜像的完善，我们需要面对多指令集的问题，于是就需要使用 `docker buildx` 命令去构建支持多指令集的 Docker 镜像[[链接](/blogs/docker/multi-arch)]。再随着微服务项目的发展，我们每次为项目构建 Docker 镜像时，不仅要考虑多指令集的问题，还要考虑如何进行整体镜像构建。

&emsp;&emsp;这时，`docker buildx bake` [[链接](https://docs.docker.com/build/bake/)]工具应运而生。

&emsp;&emsp;使用容器的管理作为例子，单个容器实例可以使用 `docker run` 来运行，单机多容器实例可以用 `docker compose` 来解决，多机多容器实例就需要用 `docker machine` 或 `kubernetes` 来解决了。而 `docker buildx bake` 正是为了解决多镜像的构建问题而抽象的高层构建命令。

&emsp;&emsp;Buildx 提供了高层级的构建命令，而 Bake 让你可以一次性构建应用的所有镜像。通过 Bake，我们可以通过配置文件定义所有的构建行为，因此每个人获取到这份构建配置文件后，都可以以相同的构建行为去构建应用镜像，从而保证镜像构建的统一性。

## 配置文件
### 文件格式
&emsp;&emsp;Docker Bake 配置文件支持以下文件的格式：

- HashiCorp Configuration Language(HCL，官方推荐，同时也支持更多功能和语法)
- JSON
- YAML(Compose file)

&emsp;&emsp;Bake 通过以下次序在当前目录上依次搜索并加载配置文件（以合并的方式），排序越后，优先级越高：

1. compose.yaml
2. compose.yml
3. docker-compose.yml
4. docker-compose.yaml
5. docker-bake.json
6. docker-bake.override.json
7. docker-bake.hcl
8. docker-bake.override.hcl

### 语法
&emsp;&emsp;Bake 配置文件支持以下属性类型：

- target: 构建目标
- group: 构建分组，可以将多个目标组合起来
- variable: 变量（一般通过环境变量传参）
- function: 自定义 Bake 函数（一般用内置的为主，比较少自定义函数）

&emsp;&emsp;一个简单的示例（HCL 格式）：

```hcl
group "default" {
    targets = ["webapp"]
}

variable "TAG" {
    default = "latest"
}

target "webapp" {
    dockerfile = "Dockerfile"
    tags = ["docker.io/username/webapp:${TAG}"]
}
```

### 常用配置属性
#### Target
&emsp;&emsp;一个 `target` 代表一个 `docker build` 构建过程，每个 target 会产生一个镜像。如下面这个构建命令：

```bash
$ docker build \
  --file=Dockerfile.webapp \
  --tag=docker.io/username/webapp:latest \
  https://github.com/username/webapp
```

&emsp;&emsp;使用 Bake 配置文件可以像以下方式表示：

```hcl
target "webapp" {
    dockerfile = "Dockerfile.webapp"
    tags = ["docker.io/username/webapp:latest"]
    context = "https://github.com/username/webapp"
}
```

&emsp;&emsp;除了上面提及的配置选项，Bake 还提供了其它配置选项。

##### target.args
&emsp;&emsp;`args` 属性用于向构建过程中传递参数，在 Dockerfile 中可以通过 `ARG` 来接收参数。这个属性与 `--build-arg` 的作用相同。

```hcl
target "webapp" {
    args = {
        VERSION = "1.0.0-SNAPSHOT"
    }
}
```

```dockerfile
FROM centos7
# 获取构建时传递进来的参数
ARG VERSION
```

##### target.context
&emsp;&emsp;用于指定构建时的上下文。

```hcl
target "webapp" {
    context = "./src/www"
}
```

##### target.contexts
&emsp;&emsp;额外的构建上下文，与 `--build-context` 的作用相同。这个属性提供了一个 map 数据结构保存着构建上下文，在构建过程中可以通过名称引用它们。

&emsp;&emsp;Bake 的上下文支持多种类型，如本地文件夹、Git 地址或其它 Bake targets。Bake 会根据地址自动识别 context 的类型：

| Context 类型            | 样例                                        |
|-----------------------|-------------------------------------------|
| 容器镜像（Container image） | `docker-image://alpine@sha256:0123456789` |
| Git URL               | `https://github.com/user/proj.git`        |
| HTTP URL              | `https://example.com/files`               |
| 本地目录（Local directory） | `../path/to/src`                          |
| Bake target           | `target:base`                             |

- **使用指定镜像**

```hcl
target "webapp" {
    contexts = {
        alpine = "docker-image://alpine:3.13"
    }
}
```

```dockerfile
# 引用 bake 声明的基础镜像
FROM alpine

RUN echo "Hello world"
```

- **使用本地目录**

```hcl
target "webapp" {
    contexts = {
        src = "../path/to/source"
    }
}
```

```dockerfile
# 引用 bake 声明的 src 镜像
FROM scratch AS src
FROM golang

COPY --from=src . .

RUN echo "Hello world"
```

- **使用另一个 target 作为基础镜像**

```hcl
target "base" {
    dockerfile = "baseapp.Dockerfile"
}

target "webapp" {
    contexts = {
        baseapp = "target:base"
    }
}
```

```dockerfile
# 引用 bake 声明的 baseapp 上下文
FROM baseapp

RUN echo "Hello world"
```

##### target.dockerfile
&emsp;&emsp;指定构建镜像时所使用的 Dockerfile 文件，与 `--file` 的作用相同。

```hcl
target "webapp" {
    dockerfile = "./src/www/Dockerfile"
}
```

##### target.inherits
&emsp;&emsp;target 支持从其它 target 中继承属性，因此可以将一些通用的属性抽离出来，在不同的 target 中复用。使用 `inherits` 属性为指定的 target 声明继承关系。

```hcl
variable "TAG" {
    default = "latest"
}

target "_platforms" {
    platforms = ["linux/amd64", "linux/arm64"]
}

target "_release" {
    args = {
        BUILDKIT_CONTEXT_KEEP_GIT_DIR = 1
        BUILDX_EXPERIMENTAL = 0
    }
}

target "webapp" {
    inherits = ["_platforms", "_release"]
    tags = ["docker.io/username/webapp:${TAG}"]
}
```

&emsp;&emsp;target 支持多重继承，Bake 在解析继承关系时，后面继承的属性会覆盖前面继承的属性。

##### target.labels
&emsp;&emsp;为镜像指定标签，与 `--label` 的作用相同。

```hcl
target "webapp" {
    labels = {
        "org.opencontainers.image.source" = "https://github.com/username/myapp"
        "com.docker.image.source.entrypoint" = "Dockerfile"
    }
}
```

##### target.platforms
&emsp;&emsp;声明构建时的指令集，与 `--platform` 的作用相同。

```hcl
target "webapp" {
    platforms = ["linux/amd64", "linux/arm64"]
}
```

##### target.tags
&emsp;&emsp;指定构建镜像时的 tag 名称，与 `--tag` 的作用相同。

```hcl
target "webapp" {
    tags = [
        "docker.io/username/webapp:latest",
        "docker.io/username/webapp:1.0.0"
    ]
}
```

#### Group
&emsp;&emsp;Groups 用于将多个构建目标组织起来，在编译时可以选定构建目标。

```hcl
# 默认构建所有
group "default" {
    target = ["db", "webapp", "service"]
}

# 只构建应用，不构建 db
group "app" {
    target = ["webapp", "service"]
}

target "webapp" {
    dockerfile = "Dockerfile.webapp"
    tags = ["docker.io/username/webapp:latest"]
}

target "service" {
    dockerfile = "Dockerfile.service"
    tags = ["docker.io/username/service:latest"]
}

target "db" {
    dockerfile = "Dockerfile.db",
    tags = ["docker.ip/username/db:latest"]
}
```

```bash
# 不传构建分组，则默认构建 default 分组
$ docker buildx bake

# 只构建指定分组
$ docker buildx bake app
```

#### Variable
&emsp;&emsp;HCL 配置文件支持变量（Variable）的声明。在编写配置文件时，可以通过 `${}` 的方式替换为变量的值。

```hcl
variable "TAG" {
    default = "latest"
}

target "webapp" {
    dockerfile = "Dockerfile.webapp"
    tags = ["docker.io/username/webapp:${TAG}"]
}
```

&emsp;&emsp;在执行 Bake 命令时，可以通过环境变量（Environments）或命令来覆盖变量值，如:

```bash
$ TAG=1.0.0 docker buildx bake webapp
```

##### 内置变量
&emsp;&emsp;Bake 内置了以下两个变量，因此不需要声明就可以直接使用它们：

| 变量名                 | 描述                              |
|---------------------|---------------------------------|
| BAKE_CMD_CONTEXT    | 执行 Bake 时上下文地址                  |
| BAKE_LOCAL_PLATFORM | 返回当前编译环境的指令集信息（如 `linux/amd64`） |

##### 使用环境变量作为默认值
&emsp;&emsp;可以将环境变量作为 Bake 变量的默认值，如下：

```hcl
variable "HOME" {
    default = "$HOME"
}
```

##### 替换变量值
&emsp;&emsp;在使用变量的时候，必须使用花括号包起变量的名称：

```hcl
variable "HOME" {
    default = "$HOME"
}

target "webapp" {
    # 不能正常工作
    ssh = ["default=$HOME/.ssh/id_rsa"]
    # 可以正常工作
    ssh = ["default=${HOME}/.ssh/id_rsa"]
}
```

#### Function
&emsp;&emsp;Bake 内置了一系列函数[[链接](https://github.com/docker/buildx/blob/master/bake/hclparser/stdlib.go)]用于解析 HCL 配置文件：

```hcl
target "webapp" {
    dockerfile = "Dockerfile.webapp"
    tags = ["docker.io/username/webapp:latest"]
    args = {
        buildno = "${add(123, 1)}"
    }
}
```

&emsp;&emsp;另外，Bake 也支持自定义函数[[链接](https://github.com/hashicorp/hcl/tree/main/ext/userfunc)]：

```hcl
function "increment" {
    params = [number]
    result = number + 1
}

target "webapp" {
    dockerfile = "Dockerfile.webapp"
    tags = ["docker.io/username/webapp:latest"]
    args = {
        buildno = "${increment(123)}"
    }
}
```

## 构建指令
### 构建配置文件
&emsp;&emsp;Bake 支持通过模板语法来提升配置文件的灵活性。通过变量（Variables）和模板语法，让构建过程变得更灵活和强大。在上面的章节中，我们已经知道了如何声明和替换变量，那么接来下我们来看看如何构建配置文件。

#### 通过全局属性构建
&emsp;&emsp;如果你不确定你的配置文件是否正确，也不确定最终执行的效果，那么可以使用 `docker buildx bake --print app` 命令来查看最终执行的配置信息。
假设已有以下配置文件：

```hcl
# docker-bake.hcl
variable "FOO" {
    default = "abc"
}

target "app" {
    args = {
        v1 = "pre-${FOO}"
    }
}
```

&emsp;&emsp;在该配置文件同目录下执行以下命令，查最终执行的配置信息：

```bash
$ docker buildx bake --print app

{
    "group": {
        "default": {
            "targets": ["app"]
        }
    },
    "target": {
        "app": {
            "context": ".",
            "dockerfile": "Dockerfile",
            "args": {
                "v1": "pre-abc"
            }
        }
    }
}
```

&emsp;&emsp;在 `docker-bake.hcl` 同级目录下新建 `env.hcl` 文件用于覆盖变量值：

```hcl
# env.hcl
WHOAMI="myuser"
FOO="def=${WHOAMI}"
```

&emsp;&emsp;在该目录下再次执行命令：

```bash
$ docker buildx bake -f docker-bake.hcl -f env.hcl --print app

{
    "group": {
        "default": {
            "targets": ["app"]
        }
    },
    "target": {
        "app": {
            "context": ".",
            "dockerfile": "Dockerfile",
            "args": {
                "v1": "pre-def-myuser"
            }
        }
    }
}
```
#### 通过资源属性构建
&emsp;&emsp;在编写 hcl 配置文件时，你也可以通过引用其它构建目标（targets）的属性来构建配置文件。

```hcl
target "foo" {
    dockerfile = "${target.foo.name}.Dockerfile"
    tags = [target.foo.name]
}

target "bar" {
    dockerfile = "${target.foo.name}.Dockerfile"
    tags = [target.bar.name]
}
```

&emsp;&emsp;在该目录下执行以下命令查看最终配置文件：

```bash
$ docker buildx bake --print foo bar

{
    "group": {
        "default": {
            "targets": ["foo", "bar"]
        }
    },
    "target": {
        "foo": {
            "context": ".",
            "dockerfile": "foo.Dockerfile",
            "tags": ["foo"]
        },
        "bar": {
            "context": ".",
            "dockerfile": "foo.Dockerfile",
            "tags": ["bar"]
        }
    }
}
```

#### 通过命令行覆盖属性构建
&emsp;&emsp;Bake 支持通过命令行 `--set` 传参的方式覆盖属性。如以下的 hcl 文件和命令：

```hcl
target "app" {
    args = {
        mybuildarg = "foo"
    }
}
```

```bash
# 覆盖构建目标 app 的属性 args.mybuildarg、platform 的值
$ docker buildx bake --set app.args.mybuildarg=bar --set app.platform=linux/arm64 app --print

{
    "group": {
        "default": {
            "targets": ["app"]
        }
    },
    "target": {
        "app": {
            "context": ".",
            "dockerfile": "Dockerfile",
            "args": {
                "mybuildarg": "bar"
            },
            "platforms": ["linux/arm64"]
        }
    }
}
```
&emsp;&emsp;Bake 命令行工具支持 Match[[链接](https://golang.org/pkg/path/#Match)]匹配语法，如：

```bash
# 覆盖所有名称以 foo 开头的构建目标的 args.mybuildarg 属性
$ docker buildx bake --set foo*.args.mybuildarg=value
# 覆盖所有的构建目标的 platform 属性
$ docker buildx bake --set *.platform=linux/arm64
```

&emsp;&emsp;Bake 命令行工具支持覆盖构建目标的以下属性：

- args
- cache-from
- cache-to
- context
- dockerfile
- labels
- no-cache
- output
- platform
- pull
- secrets
- ssh
- tags
- target

#### 文件间引用变量
&emsp;&emsp;在构建的过程中，如果指定了多个配置文件，则配置文件之间可以相互引用变量。如以下：

```hcl
# docker-bake1.hcl
variable "FOO" {
    # 引用了 docker-bake2.hcl 中定义的 BASE 变量
    default = upper("${BASE}def")
}

variable "BAR" {
    default = "-${FOO}-"
}

target "app" {
    args = {
        v1 = "pre-${BAR}"
    }
}
```

```hcl
# docker-bake2.hcl
variable "BASE" {
    default = "abc"
}

target "app" {
    args = {
        # 引用了 docker-bake1.hcl 中定义的 FOO 变量
        v2 = "${FOO}-post"
    }
}
```

```bash
$ docker buildx bake -f docker-bake1.hcl -f docker-bake2.hcl --print app

{
    "group": {
        "default": {
            "targets": ["app"]
        }
    },
    "target": {
        "app": {
            "context": ".",
            "dockerfile": "Dockerfile",
            "args": {
                "v1": "pre--ABCDEF-",
                "v2": "ABCDEF-post"
            }
        }
    }
}
```

#### 通过环境变量注入变量
&emsp;&emsp;Bake 支持将同名环境变量注入到变量中。如：

```hcl
# docker-bake.hcl
group "default" {
    targets = ["webapp"]
}

variable "TAG" {
    default = "latest"
}

target "webapp" {
    tags = ["docker.io/username/webapp:${TAG}"]
}
```

&emsp;&emsp;如果没有环境变量时，编译结果如下：

```bash
$ docker buildx bake --print webapp

{
    "group": {
        "default": {
            "targets": ["webapp"]
        }
    },
    "target": {
        "webapp": {
            "context": ".",
            "dockerfile": "Dockerfile",
            "tags": ["docker.io/username/webapp:latest"]
        }
    }
}
```

&emsp;&emsp;如果有同名环境变量 TAG 时，编译结果如下：

```bash
$ TAG=$(git rev-parse --short HEAD) docker buildx bake --print webapp

{
    "group": {
        "default": {
            "targets": ["webapp"]
        }
    },
    "target": {
        "webapp": {
            "context": ".",
            "dockerfile": "Dockerfile",
            "tags": ["docker.io/username/webapp:985e9e9"]
        }
    }
}
```

### 构建镜像
&emsp;&emsp;完成构建配置文件的编写后，接下来我们需要将镜像构建出来。

- **准备构建环境（QEMU）**

&emsp;&emsp;`tonistiigi/binfmt` 镜像主要用于交叉编译。该镜像提供了多种指令集的编译模拟器，因此在该镜像中可以编译出多种指令集的镜像。

```bash
$ docker run --rm --privileged tonistiigi/binfmt:latest --install all
```

- **准备构建环境（Buildx）**

&emsp;&emsp;在执行 bake 命令前，我们需要准备 buildx 的构建空间[[链接](https://docs.docker.com/engine/reference/commandline/buildx_create/)]。在创建这个构建空间时，我们需要指定相关驱动、配置等信息。

```bash
$ docker buildx create --use --name=<context-name> \
  --driver docker-container \
  --driver-opt image=moby/buildkit:master \
  --driver-opt network=host
```

- **登录 Registry**

&emsp;&emsp;如果想在镜像构建完毕后自动推送到镜像仓库，那么需要提前创建会话。

```bash
# 如果构建目标中包含多个 registry 的 tag，那么每个 registry 都需要执行登录操作
$ docker login <registry> -u <username> -p <password>
```

- **执行构建**

&emsp;&emsp;完成以上准备工作后，即可开始构建镜像。

```bash
# 开始构建并推送镜像
# <target> 为本次构建的目标，如果不传 <target>，则默认构建 default 分组中指定的构建目标
$ docker buildx bake --push <target>
```

- **清理构建环境（Buildx）**

&emsp;&emsp;完成构建后，我们可以将构建空间释放。

```bash
# 删除在准备阶段创建的构建空间
$ docker buildx rm <context-name>
```

## 持续集成
&emsp;&emsp;以上命令都是通过本地执行命令完成构建。在现代化项目管理中，我们可以利用持续集成工具协助我们自动完成以上过程。

### GitHub Actions
&emsp;&emsp;GitHub Actions[[链接](https://github.com/features/actions)]是 GitHub 提供的免费自动化构建工具。GitHub 还同时提供了 GitHub Actions 插件市场[[链接](https://github.com/marketplace?type=actions)]，开发者们可以将构建动作上传到这里，简化持续集成的过程。

&emsp;&emsp;如果要使用 GitHub Actions，需要在 Git 项目下创建持续集成配置文件 `.github/workflows/<action>.yaml`，后续每次提交代码时，GitHub 都将读取该文件并根据文件的条件触发自动构建任务。

&emsp;&emsp;如以下配置文件[[链接](https://github.com/central-x/containers/blob/master/.github/workflows/openjdk.yaml)]，声明了在当 master 分支被提交代码时，将触发自动构建 openjdk8 的镜像并推送到 DockerHub 上。

```yaml
#################################################################
# Azul Zulu OpenJDK
# https://www.azul.com
name: Build and push OpenJDK images

on:
  push:
    branches:
      - master

jobs:
  #################################################################
  # OpenJDK 8
  openjdk8:
    name: Build and push OpenJDK 8 images
    runs-on: ubuntu-latest
    env:
      OPENJDK_FULL_VERSION: 8.0.392
      OPENJDK_SHORT_VERSION: 8
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Set up Docker(QEMU)
        uses: docker/setup-qemu-action@v3
      - name: Set up Docker(Buildx)
        uses: docker/setup-buildx-action@v3
        with:
          driver-opts: image=moby/buildkit:master
          platforms: linux/amd64,linux/arm64
      - name: Login to DockerHub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - name: Build and push OpenJDK 8(Alpine)
        uses: docker/bake-action@v4
        with:
          targets: openjdk-alpine
          workdir: ./openjdk
          push: true
        env:
          OPENJDK_AMD64_PACKAGE: https://cdn.azul.com/zulu/bin/zulu8.74.0.17-ca-jdk8.0.392-linux_musl_x64.tar.gz
          OPENJDK_ARM64_PACKAGE: https://cdn.azul.com/zulu/bin/zulu8.74.0.17-ca-jdk8.0.392-linux_musl_aarch64.tar.gz
      - name: Test image OpenJDK 8(Alpine)
        run: docker run --rm centralx/openjdk:$OPENJDK_FULL_VERSION-alpine java -version
```

&emsp;&emsp;在上述的配置文件中，通过环境变量将参数注入到 hcl 中，从而控制整个编译过程。