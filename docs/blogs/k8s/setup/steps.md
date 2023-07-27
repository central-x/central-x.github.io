# 搭建 Kubernetes 环境（通用步骤）
### 概述
&emsp;&emsp;以下步骤是控制节点（master[x].cluster.k8s）和工作节点（node[x].cluster.k8s）都需要执行的步骤，用于搭建 Kubernetes
的基础运行环境。

## 操作步骤
### 更新网络配置
&emsp;&emsp;需要将所有 Kubernetes 集群节点的服务器的 DNS 服务器指向 svc.cluster.k8s，这样就可以统一主机名解析。

```bash
# 修改当前服务器的 hostname
$ hostnamectl --static set-hostname master1.cluster.k8s

# 修改网络
$ vi /etc/sysconfig/network-scripts/ifcfg-ens192

# 将 DNS 服务器指向 svc.cluster.k8s 的 IP 地址
# 这样可以集中管理主机名解析
DNS1="10.10.20.0"

# 重启生效
$ reboot

# 查看域名是否能正常解析
$ ping mirror.cluster.k8s -c 4
PING mirror.cluster.k8s (10.10.20.0) 56(84) bytes of data.
64 bytes from svc.cluster.k8s (10.10.20.0): icmp_seq=1 ttl=64 time=0.292 ms
64 bytes from svc.cluster.k8s (10.10.20.0): icmp_seq=2 ttl=64 time=0.484 ms
64 bytes from svc.cluster.k8s (10.10.20.0): icmp_seq=3 ttl=64 time=0.477 ms
64 bytes from svc.cluster.k8s (10.10.20.0): icmp_seq=4 ttl=64 time=0.459 ms

--- mirror.cluster.k8s ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3002ms
rtt min/avg/max/mdev = 0.292/0.428/0.484/0.079 ms
```

### 更新系统环境
&emsp;&emsp;在上一章节完成 svc.cluster.k8s 服务器的搭建之后，我们就可以通过该服务器提供的 yum 源来更新系统环境和安装
docker、kubernetes 环境了。

```bash
# 删除系统自身的 yum 源
$ rm -f /etc/yum.repos.d/CentOS-*

# 然后添加 nexus3 提供的 yum 源
$ curl -o /etc/yum.repos.d/mirror.repo http://mirror.cluster.k8s/repository/raw/mirror.repo

# CentOS 7 的默认内核是 3.10.0
# Kubernetes 要求内核在 4.19 及以上，因此需要更新内核
$ uname -r
3.10.0-1160.el7.x86_64

# 更新内核
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
$ yum install -y nano net-tools wget bind-utils telnet nfs-utils
```

### 调整系统环境

```bash
# 关闭、禁用、卸载 firewalld 防火墙
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

### 调整系统参数

```bash
# 安装 ipvsadm 和 ipset 模块
$ yum install -y ipvsadm ipset sysstat conntrack libseccomp

# 开机启动内核模块
$ nano /etc/modules-load.d/ipvs.conf

# 以下内容是 /etc/modules-load.d/ipvs.conf 文件的内容
ip_vs
ip_vs_lc
ip_vs_wlc
ip_vs_rr
ip_vs_wrr
ip_vs_lblc
ip_vs_lblcr
ip_vs_dh
ip_vs_sh
ip_vs_fo
ip_vs_nq
ip_vs_sed
ip_vs_ftp
ip_vs_sh
nf_conntrack
ip_tables
ip_set
xt_set
ipt_set
ipt_rpfilter
ipt_REJECT
ipip

# 加载模块
$ systemctl enable --now systemd-modules-load.service

# 调整内核参数
$ nano /etc/sysctl.d/k8s.conf

# 以下是 /etc/sysctl.d/k8s.conf 文件的内容
net.ipv4.ip_forward=1
net.bridge.bridge-nf-call-iptables=1
net.bridge.bridge-nf-call-ip6tables=1
fs.may_detach_mounts=1
net.ipv4.conf.all.route_localnet=1
vm.overcommit_memory=1
vm.swappiness=0 
vm.panic_on_oom=0
fs.inotify.max_user_watches=89100
fs.file-max=52706963
fs.nr_open=52706963
net.netfilter.nf_conntrack_max=2310720

net.ipv4.tcp_keepalive_time=600
net.ipv4.tcp_keepalive_probes=3
net.ipv4.tcp_keepalive_intvl=15
net.ipv4.tcp_max_tw_buckets=36000
net.ipv4.tcp_tw_reuse=1
net.ipv4.tcp_max_orphans=327680
net.ipv4.tcp_orphan_retries=3
net.ipv4.tcp_syncookies=1
net.ipv4.tcp_max_syn_backlog=16384
net.ipv4.ip_conntrack_max=65536
net.ipv4.tcp_max_syn_backlog=16384
net.ipv4.tcp_timestamps=0
net.core.somaxconn=16384

# 应用系统设置
$ sysctl --system

# 完成系统参数更新后，重启
$ reboot

# 确保重启后内核依旧加载
$ lsmod | grep --color=auto -e ip_vs -e nf_conntrack
ip_vs_ftp              16384  0 
nf_nat                 45056  1 ip_vs_ftp
ip_vs_sed              16384  0 
ip_vs_nq               16384  0 
ip_vs_fo               16384  0 
ip_vs_sh               16384  0 
ip_vs_dh               16384  0 
ip_vs_lblcr            16384  0 
ip_vs_lblc             16384  0 
ip_vs_wrr              16384  0 
ip_vs_rr               16384  0 
ip_vs_wlc              16384  0 
ip_vs_lc               16384  0 
ip_vs                 155648  25 ip_vs_wlc,ip_vs_rr,ip_vs_dh,ip_vs_lblcr,ip_vs_sh,ip_vs_fo,ip_vs_nq,ip_vs_lblc,ip_vs_wrr,ip_vs_lc,ip_vs_sed,ip_vs_ftp
nf_conntrack          147456  2 nf_nat,ip_vs
nf_defrag_ipv6         24576  2 nf_conntrack,ip_vs
nf_defrag_ipv4         16384  1 nf_conntrack
libcrc32c              16384  4 nf_conntrack,nf_nat,xfs,ip_vs
```

### 安装容器运行时
&emsp;&emsp;Kubernetes 在 1.24.0 版本移除了 dockershim
的支持[[链接](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.24.md#dockershim-removed-from-kubelet)]
，因此将不再直接支持 Docker，所以我们这边使用 containerd 作为容器运行时。

> &emsp;&emsp;实际上 Docker 底层也是使用 containerd 作为运行时。在使用 Kubernetes 时，一般都是通过更高级的 kubectl
> 工具来控制容器，因此使用 Docker 和直接使用 containerd 没什么特别大区别。

```bash
# 配置 containerd 所需的模块
$ nano /etc/modules-load.d/containerd.conf

# 以下内容是 /etc/modules-load.d/containerd.conf 文件的内容
overlay
br_netfilter

# 加载模块
$ modprobe br_netfilter && modprobe overlay

# 安装 containerd
$ yum install -y containerd.io

# 导出 containerd 的配置
$ containerd config default > /etc/containerd/config.toml

# 编辑 config.toml，添加 docker.io、registry.k8s.io 的本地镜像仓库
$ nano /etc/containerd/config.toml

# 为 docker.io、registry.k8s.io、mirror.cluster.k8s 添加镜像仓库，这样 containerd 就会通过 http://mirror.cluster.k8s 来拉取镜像，因此就不需要访问互联网了
      [plugins."io.containerd.grpc.v1.cri".registry.configs]
        # 这一段是用于允许 containerd 拉取非 https 协议的镜像源
       	[plugins."io.containerd.grpc.v1.cri".registry.configs."mirror.cluster.k8s".tls]
          insecure_skip_verify = true
        # 如果 registry 需要验证信息，可以配置访问的帐号密码
#        [plugins."io.containerd.grpc.v1.cri".registry.configs."mirror.cluster.k8s".auth]
#          username = "admin"
#          password = "nexus_password"

      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
          endpoint = ["http://mirror.cluster.k8s"]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."registry.k8s.io"]
          endpoint = ["http://mirror.cluster.k8s"]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."mirror.cluster.k8s"]
          endpoint = ["http://mirror.cluster.k8s"]

# 重启 containerd 服务
# 注意，一定要使用 systemctl 来管理 containerd 进程（也就是 Cgroup driver），否则会与 kubelet 不一致导致 kubeadm 初始化失败
$ systemctl daemon-reload
$ systemctl start containerd && systemctl enable containerd

# 查看 containerd 版本
$ containerd --version
containerd containerd.io 1.6.21 3dce8eb055cbb6872793272b4f20ed16117344f8
```

&emsp;&emsp;因为没有安装 docker，因此 docker 相关的命令可能就没办法使用了。可以安装 crictl
工具[[链接](https://github.com/kubernetes-sigs/cri-tools/releases)]，该工具基本可以代替
docker，如 `crictl pull xxxx`、`crictl images` 等。

```bash
# 下载 crictl 的可执行文件到 /usr/local/bin 目录下，并添加可执行权限
$ curl -o /usr/local/bin/crictl http://mirror.cluster.k8s/repository/raw/crictl-linux-amd64-v1.27.1
$ chmod +x /usr/local/bin/crictl

# 修改 crictl 配置
$ nano /etc/crictl.yaml
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
debug: false

# 测试 crictl 是否正常
$ crictl ps
CONTAINER           IMAGE               CREATED             STATE               NAME                ATTEMPT             POD ID              POD
```

### 安装 kubeadm
&emsp;&emsp;kubeadm 是 Kubernetes 官方提供的快速搭建集群的工具，通过该工具可以很方便地搭建起 Kubernetes 集群。

```bash
# 安装 kubeadm
$ yum install -y kubeadm

# 修改 kubeadmin 的配置，使其与容器关联起来
$ nano /usr/lib/systemd/system/kubelet.service.d/10-kubeadm.conf

# 在最后一行添加以下内容
Environment="KUBELET_EXTRA_ARGS=--container-runtime=remote --runtime-request-timeout=15m --container-runtime-endpoint=unix:///run/containerd/containerd.sock"

# 启动 kubelet
$ systemctl start kubelet && systemctl enable kubelet

# 获取 kubectl 版本信息
$ kubectl version
WARNING: This version information is deprecated and will be replaced with the output from kubectl version --short.  Use --output=yaml|json to get the full version.
Client Version: version.Info{Major:"1", Minor:"27", GitVersion:"v1.27.4", GitCommit:"fa3d7990104d7c1f16943a67f11b154b71f6a132", GitTreeState:"clean", BuildDate:"2023-07-19T12:20:54Z", GoVersion:"go1.20.6", Compiler:"gc", Platform:"linux/amd64"}
Kustomize Version: v5.0.1
The connection to the server localhost:8080 was refused - did you specify the right host or port?
```

&emsp;&emsp;使用 kubeadm 部署 Kubernetes 时，会自动生成证书，但是这些证书只有 1
年有效期[[文档](/blogs/k8s/tips/kubeadm-certs)]。为了避免因为证书过期而导致集群出现问题，我们使用修改源码后重新编译过的
kubeadm 来初始化 Kubernetes 集群。

```bash
# 备份原来的 kubeadm（也可以不备份）
$ mv /usr/bin/kubeadm /usr/bin/kubeadm_bak

# 下载新的 kubeadm 可执行文件，并添加可执行权限
$ curl -o /usr/bin/kubeadm http://mirror.cluster.k8s/repository/raw/kubeadm-linux-amd64-v1.27.4
$ chmod +x /usr/bin/kubeadm

# 查看信息
$ kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"27+", GitVersion:"v1.27.4-dirty", GitCommit:"fa3d7990104d7c1f16943a67f11b154b71f6a132", GitTreeState:"dirty", BuildDate:"2023-07-26T18:49:53Z", GoVersion:"go1.20.6", Compiler:"gc", Platform:"linux/amd64"}
```