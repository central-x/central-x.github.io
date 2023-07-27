# 搭建基础服务环境
## 概述
&emsp;&emsp;在生产环境中，为了保证服务器在安全环境下运行，一般情况下不允许访问外部网络（或限制条件下访问），因此需要额外一台服务器
svc.cluster.k8s，用于搭建 yum 源、registry 源，这样就可以在有网络的环境下将 rpm 包、docker 镜像下载下来之后，再上传到
svc.cluster.k8s 服务器上供 Kubernetes 集群使用。

&emsp;&emsp;DNS 服务主要用于集中管理所有服务器的 hostname 映射。搭建完 DNS 服务之后，将其它服务器的的 DNS 服务器地址指定为
svc.cluster.k8s 节点的 IP 地址，后续就可以直接通过 hostname 访问其它服务器。如果不想搭建 DNS 服务，那么就需要修改所有服务器的
hosts 文件，添加对应的 hostname 映射关系。

## 操作步骤
### 搭建 Docker 运行环境
&emsp;&emsp;下面使用了 docker-compose 来快速搭建基础环境。首选需要将离线安装包里面的 svc.cluster.k8s
目录下所有文件上传到服务器，然后执行以下命令，完成 Docker 运行环境的搭建:

```bash
# 修改服务器的 hostname
$ hostnamectl --static set-hostname svc.cluster.k8s

# 由于 firewalld 防火墙与 docker 服务有冲突，因此卸载 firewalld
# 使用 iptables 来代替 firewalld
$ systemctl stop firewalld && systemctl disable firewalld && yum -y remove firewalld

# 永久禁用 SELinux
$ setenforce 0 && sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config

# 禁用交换分区，并写入挂载表
$ swapoff -a && sed -i '/swap/s/^/#/' /etc/fstab

# 重启生效
$ reboot

# 安装 Docker 环境
$ yum install -y ~/packages/*

# 启动 docker 并允许开机自启动
$ systemctl start docker && systemctl enable docker

# 安装 docker-compose，并添加可执行权限
$ cp ~/raw/docker-compose-linux-amd64-v2.20.2 /usr/local/bin/docker-compose
$ chmod +x /usr/local/bin/docker-compose

# 输出 docker 版本号
$ docker --version
Docker version 24.0.5, build ced0996

# 输出 docker-compose 版本号
$ docker-compose --version
Docker Compose version v2.20.2
```

### 导入 Docker 镜像
&emsp;&emsp;由于生产环境是离线环境，因此 Docker 是无法拉取镜像的。为了能顺利启动基础环境，我们需要手动将离线的 docker
镜像导入进来。

```bash
# 导入镜像
$ docker load -i ~/docker-images.tar

# 查看是否导入成功
$ docker images
REPOSITORY        TAG       IMAGE ID       CREATED        SIZE
nginx             1.24.0    1e96add5ea29   2 months ago   142MB
sonatype/nexus3   3.54.1    8b717f0e77d3   2 months ago   606MB
coredns/coredns   1.10.1    ead0a4a53df8   5 months ago   53.6MB
```

### 启动环境
&emsp;&emsp;完成以上 Docker 运行环境的搭建之后，就可以通过 docker-compose 快速启动环境了。

```bash
# 进入 docker-compose 目录
$ cd ~/docker-compose

# 修改 DNS 服务配置
$ vi ~/docker-compose/svc-dns/hosts
# 服务节点域名映射
10.10.20.0    svc.cluster.k8s
10.10.20.0    mirror.cluster.k8s

# 存储节点域名映射
10.10.20.1    storage.cluster.k8s

# 流量入口节点域名映射
10.10.20.2    loadbalancer.cluster.k8s

# 控制节点域名映射
10.10.20.0    master.cluster.k8s # 如果是搭建高可用环境，那么此 IP 是控制节点的负载入口，这里复用了 svc.cluster.k8s 节点
10.10.20.11   master1.cluster.k8s
10.10.20.12   master2.cluster.k8s
10.10.20.13   master3.cluster.k8s

# 工作节点域名映射
10.10.20.21   node1.cluster.k8s
10.10.20.22   node2.cluster.k8s
10.10.20.23   node3.cluster.k8s # 后续其余工作节点可以依次往下加

# 启动服务
$ docker-compose up -d
```

### 验证环境
&emsp;&emsp;完成以上步骤之后，我们需要验证环境是否正常。

```bash
# 输出 Docker 进程信息，查看是否为 3 个
$ docker ps
CONTAINER ID   IMAGE                    COMMAND                   CREATED          STATUS          PORTS                                                                                                                     NAMES
60ef98e845b6   sonatype/nexus3:3.54.1   "/uid_entrypoint.sh …"    12 seconds ago   Up 11 seconds   8081/tcp                                                                                                                  svc-nexus
152c22afa425   nginx:1.24.0             "/docker-entrypoint.…"    12 seconds ago   Up 11 seconds   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp, 0.0.0.0:16443->16443/tcp, :::16443->16443/tcp   svc-nginx
515e1822a2ed   coredns/coredns:1.10.1   "/coredns"                12 seconds ago   Up 11 seconds   0.0.0.0:53->53/tcp, 0.0.0.0:53->53/udp, :::53->53/tcp, :::53->53/udp                                                      svc-dns

# 修改当前服务器的 DNS 地址，将 DNS 地址指向自己
$ vi /etc/sysconfig/network-scripts/ifcfg-ens192
DNS1=10.10.20.0

# 修改 DNS 后需要重启网络
$ service network restart

# 测试 DNS 服务器是否可以正常解析域名
$ ping mirror.cluster.k8s -c 4
PING mirror.cluster.k8s (10.10.20.0) 56(84) bytes of data.
64 bytes from svc.cluster.k8s (10.10.20.0): icmp_seq=1 ttl=64 time=0.014 ms
64 bytes from svc.cluster.k8s (10.10.20.0): icmp_seq=2 ttl=64 time=0.062 ms
64 bytes from svc.cluster.k8s (10.10.20.0): icmp_seq=3 ttl=64 time=0.064 ms
64 bytes from svc.cluster.k8s (10.10.20.0): icmp_seq=4 ttl=64 time=0.062 ms

--- mirror.cluster.k8s ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3001ms
rtt min/avg/max/mdev = 0.014/0.050/0.064/0.022 ms

# 测试 nexus 服务
$ curl http://mirror.cluster.k8s/v2/
{"errors":[{"code":"UNAUTHORIZED","message":"access to the requested resource is not authorized","detail":null}]}
```

## 运维工作
### 更新基础服务器的环境
&emsp;&emsp;由于刚始时搭建 svc.cluster.k8s 服务器的时候，因为离线的原因，导致系统默认的 yum 源没办法使用，因此也没办法更新系统环境。但是当
nexus3 环境搭建起来了之后，我们就可以通过 nexus3 提供的 yum 源来更新自身的环境了。

```bash
# 删除系统自身的 yum 源
$ rm -f /etc/yum.repos.d/CentOS-*

# 然后添加 nexus3 提供的 yum 源
$ curl -o /etc/yum.repos.d/mirror.repo http://mirror.cluster.k8s/repository/raw/mirror.repo

# 更新内核
# CentOS 7 的默认内核是 3.10.0
$ uname -r
3.10.0-1160.el7.x86_64

# 安装 5.4 内核
$ yum install -y kernel-lt

# 设置开机从新内核启动 
$ grub2-set-default 'CentOS Linux (5.4.250-1.el7.elrepo.x86_64) 7 (Core)'

# 升级内核后需要重新启动
$ reboot

# 查看当前内核版本
$ uname -r
5.4.250-1.el7.elrepo.x86_64

# 卸载旧内核
$ yum remove -y kernel kernel-tools

# 重启系统，可以发现旧内核已经没有了
$ reboot

# 升级系统依赖
$ yum update -y

# 在更新系统后，不知道为什么删掉的那些 yum 源又回来了，因此又得删一遍
$ rm -f /etc/yum.repos.d/CentOS-*

# 安装常用工具
$ yum install -y nano net-tools wget bind-utils telnet
```

&emsp;&emsp;另外，由于 firewalld 经常与 docker 冲突，因此在搭建环境时将 firewalld 删除了，这里我们需要将 iptables
相关的服务安装上，后续将直接通过 iptables 来控制防火墙。关于 iptables
更多相关操作，可以查看我另一篇文档[[链接](/blogs/linux/iptables)]。

```bash
# 安装 iptables
$ yum install -y iptables iptables-services

# 启用 iptables
$ systemctl start iptables && systemctl enable iptables

# 清空 iptables 配置
$ iptables -F && service iptables save

# 重启 iptables
$ systemctl restart iptables
```

### 更新 DNS 服务
&emsp;&emsp;如果后续新增了节点，可以通过以下步骤完成 DNS 信息的更新

```bash
# 修改 DNS 服务配置文件，新增/修改域名映射信息
# 修改完后会立即生效，不需要重启服务
$ vi ~/docker-compose/svc-dns/hosts
```

&emsp;&emsp;如果需要修改 CoreDNS 的配置，则可以通过以下步骤完成。

```bash
# 修改 CoreDNS 配置
$ vi ~/docker-compose/svc-dns/Corefile

# 查看 Docker 进程信息
$ docker ps
CONTAINER ID   IMAGE                    COMMAND                  CREATED          STATUS          PORTS                                                                      NAMES
377b598bf478   sonatype/nexus3:3.53.1   "/opt/sonatype/nexus…"   35 minutes ago   Up 35 minutes   8081/tcp                                                                   svc-nexus
39d15ddbc5a1   nginx:1.24.0             "/docker-entrypoint.…"   35 minutes ago   Up 35 minutes   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp   svc-nginx
530c034d9167   coredns/coredns:1.10.1   "/coredns"               35 minutes ago   Up 8 minutes    0.0.0.0:53->53/tcp, 0.0.0.0:53->53/udp, :::53->53/tcp, :::53->53/udp       svc-dns

# 重启 DNS 服务，使 Corefile 生效
$ docker restart 530c034d9167
```

### 更新 yum 源
&emsp;&emsp;这个包已经内置了 CentOS7 常用的 yum 包。如果后续发现服务器缺失了其它 rpm
包，可以通过我另一篇文档[[链接](/blogs/linux/download-yum)]将相关的 rpm
包下载到本地，然后再上传到服务器上。完成上传之后，其它的服务器就可以像有网络一样正常安装/更新软件了。

&emsp;&emsp;下面的代码是通过通过 shell 脚本上传 rpm 包到 nexus 私库。

- **upload.sh**

```sh
workingDir=$(pwd)

for rpm in `ls $1*.rpm`
do
    # 将 --user 后面的参数修改为当前仓库的帐号密码
    # 将后面的地址修改为 nexus 仓库的访问地址
    result=`curl -v --user 'admin:nexus_password' --upload-file $workingDir/$rpm http://mirror.cluster.k8s/repository/yum-docker-ce/$rpm`
    echo "$result: $rpm"
done
```

### 更新、发布 Docker 镜像
&emsp;&emsp;在生产环境中，由于服务器是不能访问外部网络的，因此需要运维人员手动将 Docker 镜像导入到 nexus3 提供 Registry
私库中，然后 Kubernetes 集群通过镜像加速服务从这个 Registry 私库中拉取并部署 Pod。

&emsp;&emsp;由于我们搭建的 nexus3 无法提供 https 访问协议，因此需要配置 docker 允许以不安全的方式访问 Registry
私库，具体操作可以参考我另一篇文档[[链接](/blogs/docker/setup#访问-dokcer-私库)]

&emsp;&emsp;完成上述的操作之后，就可以通过以下方式将 Docker 镜像上传到 Registry 私库。

```bash
# 登录 Docker Registry
$ docker login mirror.cluster.k8s
Username: amdin
Password:
WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded

# 导入 Docker 镜像，这里以 nexus3-3.53.1.tar 为例
$ docker load -i nexus3-3.53.1.tar

# 给这个镜像打上新的 tag
# 新的 tag 需要是 mirror.cluster.k8s/* 的格式，这样 docker 才会将该镜像推送到 nexus 私库
$ docker tag sonatype/nexus3:3.53.1 mirror.cluster.k8s/sonatype/nexus3:3.53.1

# 上传镜像到 nexus 私库
$ docker push mirror.cluster.k8s/sonatype/nexus3:3.53.1
```

::: tip 注意
&emsp;&emsp;一些 Docker 官方镜像如 `nginx:1.24.0`，如果想要上传到 mirror.cluster.k8s 做镜像加速的话，新的 tag
名称应该是 `mirror.cluster.k8s/library/nginx:1.24.0`，而不能是 `mirror.cluster.k8s/nginx:1.24.0`。
:::