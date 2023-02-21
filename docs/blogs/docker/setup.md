# 搭建 Docker 环境
## 概述
&emsp;&emsp;记录一下在 CentOS7 环境下的 Docker 搭建过程。注意，在开始搭建 Docker 环境前，可以参考另一篇笔记[[链接](/blogs/exsi/template)]来完成 CentOS7 的初始化、更新工作。

## 搭建步骤
### 配置基础环境

```bash
# 由于 firewalld 防火墙与 docker 服务有冲突，因此卸载 firewalld
# 可以使用 iptables 来代替 firewalld
$ systemctl stop firewalld && systemctl disable firewalld && yum -y remove firewalld

# 安装 iptables
$ yum install -y iptables iptables-services

# 启用 iptables
$ systemctl start iptables && systemctl enable iptables

# 清空 iptables 配置
$ iptables -F && service iptables save

# 重启 iptables
$ systemctl restart iptables

# 永久禁用 SELinux
$ setenforce 0 && sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config

# 禁用交换分区，并写入挂载表
$ swapoff -a && sed -i '/swap/s/^/#/' /etc/fstab

# 重启生效
$ reboot
```

### 安装 Docker
```bash
# 添加 Docker 源
$ yum install -y yum-utils
$ yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker
$ yum install -y docker-ce

# 启动 Docker 服务，并添加开机自启
$ systemctl start docker && systemctl enable docker

# 安装 Docker Compose
$ curl -L "https://github.com/docker/compose/releases/download/2.16.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 为 docker-compose 添加可执行权限
$ chmod +x /usr/local/bin/docker-compose

# 输出 docker 版本号
$ docker --version
Docker version 23.0.1, build cb74dfc

# 输出 docker-compose 版本号
$ docker-compose --version
Docker Compose version v2.16.0
```

## 使用技巧
### 导出/导入 Docker 镜像
&emsp;&emsp;在一些生产环境，服务器是无法访问外部 Docker Registry 服务的，因此需要在本地将相关镜像下载下来，然后导出到生产环境去使用。在这种场影下，可以通过以下方法完成镜像的导出与导入。

```bash
# 将 Dokcer 镜像保存为 tar 文件
# 注意，这里要用镜像名称来导出，不要用镜像的 hash 来导出
$ docker save sonatype/nexus3:3.47.1 -o nexus3-3.47.1.tar

# 将导出来的镜像文件复制到指定的服务器，用以下命令即可导入镜像
$ docker load -i nexus3-3.47.1.tar

# 查看是否导入成功
$ docker images
REPOSITORY        TAG       IMAGE ID       CREATED        SIZE
sonatype/nexus3   3.47.1    d2fd210c6f4c   3 months ago   545MB
```

### 访问 Dokcer 私库
&emsp;&emsp;我们搭建 Docker Registry 私库之后，如果你没有办法为其配置 HTTPS 访问，那么就需要配置 Docker，使其允许以不安全的方式（以 http 的方式）访问 Registry 私库。

```bash
# 查看当前 Docker 信息
$ docker info
...
 Insecure Registries:
  127.0.0.0/8
 Live Restore Enabled: false

# 创建 Docker 配置文件，添加 insecure-registries 选项
$ vi /etc/docker/daemon.json

{
    "insecure-registries": [
        "mirror.cluster.k8s",
        "registry.cluster.k8s"
    ]
}

# 重启 Docker 服务
$ systemctl daemon-reload
$ systemctl restart docker

# 再次查看 Docker 信息，发现 Insecure Registries 已经添加上去了
$ docker info
...
 Insecure Registries:
  registry.cluster.k8s
  mirror.cluster.k8s
  127.0.0.0/8
 Live Restore Enabled: false
```

### 添加 Docker 镜像加速服务
&emsp;&emsp;在没有网络的环境，或者我们需要做镜像加速时，可以通过修改 Docker 的配置文件，使其优先从镜像加速服务中拉取镜像。

```bash
# 查看当前 Docker 信息
$ docker info
...
 Insecure Registries:
  127.0.0.0/8
 Live Restore Enabled: false

# 创建 Docker 配置文件，添加 registry-mirrors 选项
# 如果你的镜像加速服务是以 http 协议提供的，那么还需要添加 insecure-registries 选项
$ vi /etc/docker/daemon.json

{
    "insecure-registries": [
        "mirror.cluster.k8s",
    ],
    "registry-mirrors": [
        "http://mirror.cluster.k8s"
    ]
}

# 重启 Docker 服务
$ systemctl daemon-reload
$ systemctl restart docker

# 再次查看 Docker 信息，发现 Registry Mirrors 已经添加上去了
$ docker info
...
 Insecure Registries:
  mirror.cluster.k8s
  127.0.0.0/8
 Registry Mirrors:
  http://mirror.cluster.k8s/
 Live Restore Enabled: false
```
