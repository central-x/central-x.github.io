---
title: 搭建 Docker 环境
---

# {{ $frontmatter.title }}
## 概述
&emsp;&emsp;记录一下在 CentOS7 环境下的 Docker 搭建过程。注意，在开始搭建 Docker 环境前，可以参考另一篇笔记[[链接](/blogs/exsi/template)]来完成 CentOS7 的初始化、更新工作。

## 步骤

```bash
# 由于 firewalld 防火墙与 docker 服务有冲突，因此卸载 firewalld
# 可以使用 iptables 来代替 firewalld
$ systemctl stop firewalld && systemctl disable firewalld && yum -y remove firewalld

# 添加 Docker 源
$ yum install -y yum-utils
$ yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker
$ yum install -y docker-ce

# 启动 Docker 服务，并添加开机自启
$ systemctl start docker && systemctl enable docker

# 安装 Docker Compose
$ curl -L "https://github.com/docker/compose/releases/download/2.6.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 为 docker-compose 添加可执行权限
$ chmod +x /usr/local/bin/docker-compose

# 输出 docker 版本号
$ docker --version
Docker version 20.10.16, build aa7e414

# 输出 docker-compose 版本号
$ docker-compose --version
Docker Compose version v2.6.0
```