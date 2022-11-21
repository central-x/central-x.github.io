# 下载 yum 的离线安装包
## 概述
&emsp;&emsp;在生产环境中，因为安全原因，经常会不提供外网访问权限。在这种环境下，想要安装软件或更新软件，就需要提前将离线安装包下载下来，然后通过相关途径将安装包复制到生产环境系统中才行。

&emsp;&emsp;由于使用 yum 来安装或更新软件都非常方便，因此我搜索了一下 yum 如何下载离线安装包的方法，这里做一下笔记。

## 步骤
### 下载 rpm 包
&emsp;&emsp;找一台环境与生产环境一致的电脑，并且这台电脑需要可以联接互联网。然后通过以下命令将安装包下载到指定的本地目录里：

```bash
# 下载所有系统/软件更新相关的包
$ mkdir /root/packages/centos/7/x86_64/updates
$ yum update --downloadonly --downloaddir=/root/packages/centos/7/x86_64/updates

# 下载 docker-ce 以及依赖到 docker 目录下
$ mkdir /root/packages/centos/7/x86_64/docker
$ yum install docker-ce --downloadonly --downloaddir=/root/packages/centos/7/x86_64/docker
 
# 下载 docker-ce 的更新包到 docker 目录下
$ yum update docker-ce --downloadonly --downloaddir=/root/packages/centos/7/x86_64/docker
```

&emsp;&emsp;如果你只知道命令，但是不知道是什么包提供的，可以通过以下方法来查询命令所在包:

```bash
# 通过以下命令，可以看到 netstat 是由 net-tools 包提供的功能
$ yum provides "*/netstat"
已加载插件：fastestmirror
Loading mirror speeds from cached hostfile
 * base: mirrors.aliyun.com
 * elrepo: hkg.mirror.rackspace.com
 * extras: mirrors.aliyun.com
 * updates: mirrors.ustc.edu.cn
base/7/x86_64/filelists_db                                                                                                                                                | 7.2 MB  00:00:00     
docker-ce-stable/7/x86_64/filelists_db                                                                                                                                    |  32 kB  00:00:00     
elrepo/filelists_db                                                                                                                                                       |  46 kB  00:00:00     
extras/7/x86_64/filelists_db                                                                                                                                              | 277 kB  00:00:00     
updates/7/x86_64/filelists_db                                                                                                                                             | 8.7 MB  00:00:00     
net-tools-2.0-0.25.20131004git.el7.x86_64 : Basic networking tools
源    ：base
匹配来源：
文件名    ：/bin/netstat

# 如果你有已经安装了该工具的系统，那么可以在该系统下通过以下命令快速查找
$ rpm -qf `which netstat`
net-tools-2.0-0.25.20131004git.el7.x86_64
```

### 安装 rpm 包
&emsp;&emsp;安装离线 rpm 包的方式，可以选择以下两种之一：

- 如果你管理的服务器比较少，那么可以通过线下复制的方式，将安装包复制到服务器，然后通过下以命令安装：

```bash
# 安装 docker 目录下所有的 rpm 包
# -i, --install: 安装软件包
# -v, --verbose: 提供更多的详细信息输出
# -h, --hash:    软件包安装的时候列出哈希标记
$ rpm -ivh ./docker/*

# 更新 docker 目录下的所有的 rpm 包
# -U, --upgrade: 升级软件包
# -v, --verbose: 提供更多的详细信息输出
# -h, --hash:    软件包安装的时候列出哈希标记
$ rpm -Uvh ./docker/*
```

- 如果你管理的服务器比较多，那么可以搭建 rpm 私服，然后将下载好的 rpm 包上传到私服，其它服务器将 rpm 源指向私服，即可安装这些软件包：

&emsp;&emsp;目前市面上有很多工具都提供了包管理工具，如 GitLab、Nexus3 等等，简单一点也可以自己起个服务器，然后用 nginx、httpd 这些服务器来托管：

```bash
# 安装 createrepo 工具包
$ yum install -y createrepo
 
# 创建相关 rpm 源的目录
$ mkdir /root/packages/centos/7/x86_64/os && createrepo /root/centos/7/x86_64/os

# 然后将相关的 rpm 分类放到以上指定的目录之后，通过以下命令更新源
$ createrepo --update createrepo /root/centos/7/x86_64/os
```

&emsp;&emsp;然后通过 nginx 暴露 yum 源（如果不懂 Nginx，可以参考我之前的笔记[[链接](/blogs/linux/nginx)]）：

```bash
# 修改 /etc/nginx/nginx.conf
server {
    # 监听端口
    listen 80;

    # 托管 yum 源
    location /packages/ {
        autoindex on;
        root /root/packages;
    }
}
```

&emsp;&emsp;完成以上步骤之后，就可以将其它服务器的 yum 源切换到自己托管的源了。

```bash
# 将原来的服务器的 yum 源移除(先备份起来)
$ mv /etc/yum.repos.d /etc/yum.repos.d.bak

# 创建新源
$ mkdir /etc/yum.repos.d && nano /etc/yum.repos.d/centos.repo

# 以下是 /etc/yum.repo.d/centos.repo 的文件内容
[base]
name=CentOS-$releasever - Base
failovermethod=priority
baseurl=http://10.10.10.10/packages/centos/$releasever/$basearch/os/
enabled=1
gpgcheck=0

[updates]
name=CentOS-$releasever - Updates
failovermethod=priority
baseurl=http://10.10.10.10/packages/centos/$releasever/$basearch/updates/
enabled=1
gpgcheck=0

[extras]
name=CentOS-$releasever - Extras
failovermethod=priority
baseurl=http://10.10.10.10/packages/centos/$releasever/$basearch/extras/
enabled=1
gpgcheck=0


# EPEL (Extra Packages for Enterprise Linux), 是由 Fedora Special Interest Group 维护的 Enterprise Linux（RHEL、CentOS）中经常用到的包。
[elrepo]
name=ELRepo.org Community Enterprise Linux Repository - el7
baseurl=http://10.10.10.10/packages/centos/$releasever/$basearch/elrepo/
enabled=1
gpgcheck=0

[elrepo-kernel]
name=ELRepo.org Community Enterprise Linux Kernel Repository - el7
baseurl=http://10.10.10.10/packages/centos/$releasever/$basearch/elrepo-kernel/
enabled=0
gpgcheck=0

[elrepo-extras]
name=ELRepo.org Community Enterprise Linux Extras Repository - el7
baseurl=http://10.10.10.10/packages/centos/$releasever/$basearch/elrepo-extras/
enabled=0
gpgcheck=0

# Nginx 源
[nginx]
name=nginx repo
baseurl=http://10.10.10.10/packages/centos/$releasever/$basearch/nginx/
enabled=1
gpgcheck=0

# Docker 源
[docker]
name=Docker CE Stable - $basearch
baseurl=http://10.10.10.10/packages/centos/$releasever/$basearch/docker/
enabled=1
gpgcheck=0

# Kubernetes 源
[kubernetes]
name=Kubernetes
baseurl=http://10.10.10.10/packages/centos/$releasever/$basearch/kubernetes/
enabled=1
gpgcheck=0
```