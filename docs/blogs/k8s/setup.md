---
title: 搭建 Kubernetes 1.24.1 环境
---

# {{ $frontmatter.title }}
## 概述

　　最近在学习 Kubernetes，刚好家里有台服务器，因此希望在自己的服务器上搭建环境，方便学习。结合了官方文档、搜索出无数的文档，终于搭建成功了，这里记录一下。

　　本文档使用 kubeadm 来创建 Kubernetes 集群。搭建集群需要满足以下条件

- 3 台或以上奇数台 Linux 主机（可以是虚拟机）
- 每台主机 2GB 或更多内存
- 每台主机 2 核 CPU 或更多
- 集群中的所有机器的网络彼此均能相互连接（公网或内网都行）
- 节点之中不可以有重复的主机名、MAC 地址、product_uuid
- 禁用交换分区
- 开启机器上的指定端口（6443）
- 内核在 4.4 及以上

　　可以参考我的另一篇笔记[链接]，通过 Exsi 模板来快速创建虚拟机。虽然是通过模板来创建虚拟机，但是 Exsi 已经帮我们处理好主机的 MAC 地址、product_uuid 信息了。根据该笔记，虚拟机已经完成了内核升级和工具升级相关的工作了，因此本文档不再赘述。

　　本文档里面，使用了 3 台 Exsi 虚拟的 CentOS7 主机，其 IP 和主机名分别如下：

- 10.10.2.1：master.cluster.k8s
- 10.10.2.2：node1.cluster.k8s
- 10.10.2.3：node2.cluster.k8s

　　为了保证主机间可以通过域名互通，你有以下两种方案来解决域名印射问题：

1. 自建 DNS 服务器：你可以通过我的另一篇笔记[链接]来完成 DNS 的搭建工作，并在 DNS 服务器上添加 3 条域名解析记录。然后在搭建虚拟机的时候，将 DNS 服务器指向自建的服务器 IP 即可。
2. 在每一台服务器的 /etc/hosts 文件里，添加 3 条域名解析记录。

## 步骤
### 调整系统环境与参数

```bash
# 关闭、禁用、卸载 firewalld 防火墙
$ systemctl stop firewalld && systemctl disable firewalld && yum -y remove firewalld

# 安装 iptables
$ yum install -y iptables iptables-services

# 启用 iptables
$ systemctl start iptables && systemctl enable iptables

# 清空 iptables
$ iptables -F && service iptables save

# 在 iptables 添加规则，开放 6443 端口
$ nano /etc/sysconfig/iptables

# 以下是在 /etc/sysconfig/iptables 文件内容中修改
# 添加 6443 端口开放记录(在 COMMIT 前面添加)
-A INPUT -m state --state NEW -m tcp -p tcp --dport 6443 -j ACCEPT

# 重启 iptables
$ systemctl restart iptables

# 永久禁用 SELinux
$ setenforce 0 && sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config

# 禁用交换分区，并写入挂载表
$ swapoff -a && sed -i '/swap/s/^/#/' /etc/fstab

# 重启生效
$ reboot

# 开启内核模块
$ modprobe br_netfilter && modprobe ip_vs && modprobe ip_vs_rr && modprobe ip_vs_wrr && modprobe ip_vs_sh && modprobe nf_conntrack

# 开机启动内核模块
$ nano /etc/modules-load.d/k8s.conf

# 以下内容是 /etc/modules-load.d/k8s.conf 文件的内容
br_netfilter
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh 
nf_conntrack

# 调整内核参数
$ nano /etc/sysctl.d/k8s.conf

# 以下是 /etc/sysctl.d/k8s.conf 文件的内容
net.bridge.bridge-nf-call-iptables=1
net.bridge.bridge-nf-call-ip6tables=1
net.ipv4.ip_forward=1
vm.swappiness=0 
vm.panic_on_oom=0
fs.inotify.max_user_instances=8192
fs.inotify.max_user_watches=1048576
fs.file-max=52706963
fs.nr_open=52706963
net.ipv6.conf.all.disable_ipv6=1
net.netfilter.nf_conntrack_max=2310720

# 应用系统设置
$ sysctl --system
```

### 安装容器运行时
　　Kubernetes 1.24.0 开始 Docker 支持功能现已弃用，而是转向使用容器标准 containerd[[链接](https://containerd.io)]。其实 containerd 也是 Docker 捐献给社区，而且 Docker 本身底层也是依赖该模块。

```bash
# 安装 Docker 源
$ yum install -y yum-utils
$ yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 containerd
$ yum install -y containerd.io

# 导出 containerd 的配置
$ containerd config default > /etc/containerd/config.toml

# Kubernetes 在安装的过程中，需要拉取 k8s.gcr.io 仓库里面的镜像，而这个网址在国内是没办法访问的
# 因此，你可以选择使用镜像代理，也可以选择给 containerd 设置代理
$ nano /lib/systemd/system/containerd.service

# 以下内容添加到 /lib/systemd/system/containerd.service 文件的 [Service] 节点下
# 如果你没有代理，那么这一步可以跳过
Environment="HTTP_PROXY=http://10.10.10.10:7890/"
Environment="HTTPS_PROXY=http://10.10.10.10:7890/"
Environment="ALL_PROXY=socks5://10.10.10.10:7890/"
Environment="NO_PROXY=10.96.0.0/16,10.244.0.0/16,10.10.0.0/16,127.0.0.1,localhost"

# 重启 containerd 服务
# 注意，一定要使用 systemctl 来管理 containerd 进程（也就是 Cgroup driver），否则会与 kubelet 不一致导致 kubeadm 初始化失败
$ systemctl daemon-reload
$ systemctl start containerd && systemctl enable containerd

# 查看 containerd 版本
$ containerd --version
containerd containerd.io 1.6.4 212e8b6fa2f44b9c21b2798135fc6fb7c53efc16
```

　　因为没有安装 docker，因此 docker 相关的命令可能就没办法使用了。可以安装 crictl 工具，该工具基本可以代替 docker，如 crictl pull xxxx。Kubernetes 不使用这个，因此如果没有这种需求的话，可以跳过下面的步骤。

```bash
# 下载并解压到用户目录
$ wget https://github.com/kubernetes-sigs/cri-tools/releases/download/v1.24.2/crictl-v1.24.2-linux-amd64.tar.gz
$ tar zxvf crictl-v1.24.2-linux-amd64.tar.gz -C /usr/local/bin

# 修改 crictl 配置
$ nano /etc/crictl.yaml
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
debug: false

$ crictl ps
CONTAINER           IMAGE               CREATED             STATE               NAME                ATTEMPT             POD ID              POD
```

### 安装 kubeadm
　　Kubernetes 官网给的 yum 源是 packages.cloud.google.com 的，如果有代理，可以使用官方的源，如果没有代理，可以使用阿里云的镜像源。

```bash
# 添加 kubernetes 源
$ nano /etc/yum.repos.d/kubernetes.repo

# 以下是 /etc/yum.repos.d/kubernetes.repo 文件的内容
# 如果你有代理，可以使用官方的源
[kubernetes]
name=Kubernetes
baseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-\$basearch
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
exclude=kubelet kubeadm kubectl

# 如果你没有代理，可以使用阿里云的源
[kubernetes]
name=Kubernetes
baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=http://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg http://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg

# 安装 kubeadm
$ yum install -y kubeadm

# 修改 kubeadm 的配置，使其与容器关联起来
$ nano /usr/lib/systemd/system/kubelet.service.d/10-kubeadm.conf

# 在最后一行添加以下内容
Environment="KUBELET_EXTRA_ARGS=--container-runtime=remote --runtime-request-timeout=15m --container-runtime-endpoint=unix:///run/containerd/containerd.sock"

# 启动 kubelet
$ systemctl start kubelet && systemctl enable kubelet

# 获取 kubectl 版本信息
$ kubectl version
WARNING: This version information is deprecated and will be replaced with the output from kubectl version --short.  Use --output=yaml|json to get the full version.
Client Version: version.Info{Major:"1", Minor:"24", GitVersion:"v1.24.1", GitCommit:"3ddd0f45aa91e2f30c70734b175631bec5b5825a", GitTreeState:"clean", BuildDate:"2022-05-24T12:26:19Z", GoVersion:"go1.18.2", Compiler:"gc", Platform:"linux/amd64"}
Kustomize Version: v4.5.4
The connection to the server localhost:8080 was refused - did you specify the right host or port?
```

　　以上步骤是所有 Kubernetes 节点都需要执行的操作。如果你是使用 Exsi 的虚拟机来完成环境搭建的，那么到了这一步，你可以将系统导出来进行复制之后，再继续完成下面的步骤。

### 初始化主节点
　　在主节点，也就是主机名为 master.cluster.k8s 的服务器上，完成以下工作：

```bash
# 导出 kubeadm 的默认配置
$ kubeadm config print init-defaults > kubeadm-config.yaml
```

　　修改配置文件 kubeadm-config.yaml。

```yaml
apiVersion: kubeadm.k8s.io/v1beta3
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef # 修改为你自己私有的 token，不改也没关系，24小时之后会过期
  ttl: 24h0m0s # 控制 token 过期时间，可以不改
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 10.10.2.1 # 此处修改为主节点的 IP
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
  imagePullPolicy: IfNotPresent
  name: node
  taints: null
---
apiServer:
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controllerManager: {}
dns: {}
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: k8s.gcr.io
kind: ClusterConfiguration
kubernetesVersion: 1.24.1 # 这里改为与当前 Kubernetes 相同的版本号
networking:
  dnsDomain: cluster.local
  podSubnet: 10.244.0.0/16 # 使用 flannel 模型通信，这个 IP 的值需要固定为这个值
  serviceSubnet: 10.96.0.0/16 # 创建 Service 时的网段
scheduler: {}
---
# 指定使用 ipvs 网络通信
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
featureGates:
  SupportIPVSProxyMode: true
mode: ipvs
```

　　开始初始化主节点

```bash
# 初始化主节点，开始部署
# node-name 改为主节点主机名
$ kubeadm init --config=kubeadm-config.yaml --node-name=master.cluster.k8s --upload-certs | tee kubeadm-init.log

# 如果发现最后输出以下信息，说明主节点初始化成功
# 注意保存好后面那个 token
Your Kubernetes control-plane has initialized successfully!

To start using your cluster, you need to run the following as a regular user:

  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config

Alternatively, if you are the root user, you can run:

  export KUBECONFIG=/etc/kubernetes/admin.conf

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join 10.10.2.1:6443 --token abcdef.0123456789abcdef \
	--discovery-token-ca-cert-hash sha256:a6a5f3053948441b33321e15434958417a09b8cb79ac176889d85494291d9635 

# 编辑 ~/.bash_profile，添加环境变量
$ nano ～/.bash_profile

# 在 ～/.bash_profile 添加以下内容，我不太会用 vi，习惯用 nano，根据情况可以选择不加 KUBE_EDITOR 环境变量
export KUBECONFIG=/etc/kubernetes/admin.conf
export KUBE_EDITOR=nano

# 修改 kube-proxy 的配置，否则 kube-proxy 会一直处于 CrashLoopBackOff 状态
# 找到 featureGates: 和 SupportIPVSProxyMode: true 这两行，将其注释后保存退出即可
$ kubectl edit cm kube-proxy -n kube-system

# 添加 flannel 网络插件
$ wget https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
$ kubectl apply -f kube-flannel.yml

# 获取节点信息
# 刚开始一段时间，Kubernetes 还在初始化 flannel 插件，因此 master 节点还处理 NotReady 状态
# 等待一段时间后，master 节点的状态就会变更为 Ready 了
$ kubectl get nodes
NAME                 STATUS   ROLES           AGE     VERSION
master.cluster.k8s   Ready    control-plane   8m31s   v1.24.1

# 获取系统命名空间的 pod 运行情况
$ kubectl -n kube-system get po
NAME                                         READY   STATUS    RESTARTS        AGE
coredns-6d4b75cb6d-rxjlc                     1/1     Running   0               5m55s
coredns-6d4b75cb6d-s2ns5                     1/1     Running   0               5m55s
etcd-master.cluster.k8s                      1/1     Running   0               6m7s
kube-apiserver-master.cluster.k8s            1/1     Running   0               6m8s
kube-controller-manager-master.cluster.k8s   1/1     Running   0               6m8s
kube-flannel-ds-vdjz6                        1/1     Running   0               3m47s
kube-proxy-8xcnm                             1/1     Running   4 (5m11s ago)   5m55s
kube-scheduler-master.cluster.k8s            1/1     Running   0               6m7s
```

### 初始化工作节点
　　在 node1.cluster.k8s 服务器和 node2.cluster.k8s 服务器上，执行以下命令：

```bash
# 将当前节点加入到 Kubernetes 集群
$ kubeadm join 10.10.2.1:6443 --token abcdef.0123456789abcdef \
	--discovery-token-ca-cert-hash sha256:a6a5f3053948441b33321e15434958417a09b8cb79ac176889d85494291d9635

# 如果输出以下内容，则表示已经初始化成功
[preflight] Running pre-flight checks
[preflight] Reading configuration from the cluster...
[preflight] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'
[kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
[kubelet-start] Writing kubelet environment file with flags to file "/var/lib/kubelet/kubeadm-flags.env"
[kubelet-start] Starting the kubelet
[kubelet-start] Waiting for the kubelet to perform the TLS Bootstrap...

This node has joined the cluster:
* Certificate signing request was sent to apiserver and a response was received.
* The Kubelet was informed of the new secure connection details.

Run 'kubectl get nodes' on the control-plane to see this node join the cluster.

# 在主节点再次获取节点信息
# 可以发现 node1 和 node2 已经加入到集群了
$ kubectl get nodes
NAME                 STATUS     ROLES           AGE   VERSION
master.cluster.k8s   Ready      control-plane   11m   v1.24.1
node1.cluster.k8s    NotReady   <none>          5s    v1.24.1
node2.cluster.k8s    NotReady   <none>          4s    v1.24.1

# 在主节点获取 kube-system 的 pod 初始化情况
# 可以发现 Kubernetes 已经在 node1 和 node2 节点中初始化着 kube-proxy 和 kube-flannel
# 等待一段时间后，初始化完毕
$ kubectl -n kube-system get po
NAME                                         READY   STATUS              RESTARTS      AGE
coredns-6d4b75cb6d-rxjlc                     1/1     Running             0             12m
coredns-6d4b75cb6d-s2ns5                     1/1     Running             0             12m
etcd-master.cluster.k8s                      1/1     Running             0             13m
kube-apiserver-master.cluster.k8s            1/1     Running             0             13m
kube-controller-manager-master.cluster.k8s   1/1     Running             0             13m
kube-flannel-ds-824d5                        0/1     Init:0/2            0             88s
kube-flannel-ds-kfvgp                        0/1     Init:0/2            0             89s
kube-flannel-ds-vdjz6                        1/1     Running             0             10m
kube-proxy-8xcnm                             1/1     Running             4 (12m ago)   12m
kube-proxy-9rvj4                             0/1     ContainerCreating   0             88s
kube-proxy-bxctz                             0/1     ContainerCreating   0             89s
kube-scheduler-master.cluster.k8s            1/1     Running             0             13m

# 等待一段时间后，再次获取节点信息，发现两个新加入的节点都已经变为 Ready 状态了
$ kubectl get nodes
NAME                 STATUS   ROLES           AGE     VERSION
master.cluster.k8s   Ready    control-plane   21m     v1.24.1
node1.cluster.k8s    Ready    <none>          9m51s   v1.24.1
node2.cluster.k8s    Ready    <none>          9m50s   v1.24.1

# 如果后续还想加新的节点到 Kubernetes 集群中，那么再次执行上面 kubeadm join 命令，会发现输出以下内容
error execution phase preflight: couldn't validate the identity of the API Server: could not find a JWS signature in the cluster-info ConfigMap for token ID "abcdef"
To see the stack trace of this error execute with --v=5 or higher

# 这是因为主节点已经初始化超过 24 小时了
# 在初始化主节点章节中，可以看到在 kubeadm-config.yaml 配置中定义了 token 的失效时间是 24 小时，因此之前的 token abcdef.0123456789abcdef 已经失效了
# 解决办法是重新生成一个 token，并使用新的 token 来执行 kubeadm join 命令
$ kubeadm token create
exd3wy.8ga18gnj1mbrx0pa

$ kubeadm join 10.10.2.1:6443 --token exd3wy.8ga18gnj1mbrx0pa \
	--discovery-token-ca-cert-hash sha256:1a5a75d46629808b0e46fabaf4986d8ee3288d6c079649c45b52cb3768966f76
```

　　以上就是 Kubernetes 1.24.1 的环境搭建过程了。Enjoy yourself！