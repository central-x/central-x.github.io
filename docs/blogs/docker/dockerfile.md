# Dockerfile
## 概述
&emsp;&emsp;Docker 镜像是 Docker 运行应用程序的基础，而 Dockerfile 用于描述 Docker 镜像的构建过程。Dockerfile 文件里面保存了镜像编译过程中用到的所有指令。

&emsp;&emsp;本文档用于介绍编写 Dockerfile 文件时常用的指令。

&emsp;&emsp;完成 Dockerfile 文件的编写后，可以通过 Docker Buildx [[链接](/blogs/docker/buildx)]或 Docker Buildx Bake [[链接](/blogs/docker/buildx-bake)]工具将镜像构建出来。

## 格式
&emsp;&emsp;我们来看看一个简单的 Dockerfile 示例：

```dockerfile
# 指定本镜像的基础镜像
FROM nginx:1.25.3

# 添加静态文件指镜像中
ADD ./html.tar.gz /usr/share/nginx

# 指定镜像暴露的端口号
EXPOSE 80

# 镜像的启动命令
CMD ["nginx", "-g", "daemon off;"]
```
