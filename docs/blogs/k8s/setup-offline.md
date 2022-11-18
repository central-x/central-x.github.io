---
title: 搭建 Kubernetes 1.24.1 环境（离线）
---

# {{ $frontmatter.title }}
## 概述
&emsp;&emsp;在上一篇笔记中，已经完成了在有网络的情况下的搭建 Kubernetes 1.24.1 环境了。但是在生产环境中，很多情况下一般是不允许服务器连接网络的，因此这里再记一篇笔记，记录一下关于如何在内网（离线）环境下搭建 Kubernetes 环境。

&emsp;&emsp;准备好 4 台虚拟机：

- 10.10.10.10（svc.cluster.k8s）：运行 DNS 服务、Registry 服务、Yum 源（还可以加入 NTP 服务等）
- 10.10.10.11（master.cluster.k8s）：主节点
- 10.10.10.12（node1.cluster.k8s）：工作节点
- 10.10.10.13（node2.cluster.k8s）：工作节点

&emsp;&emsp;为了方便搭建环，我将本篇文档里面用到的内容放在附件中[[链接](https://download.csdn.net/download/Flowy/85623839)]，可以自行下载。

## 步骤
### 生成 SSL 证书
&emsp;&emsp;由于 Registry 需要使用 SSL 证书，因此需要提前生成 SSL 证书。SSL 证书可以通过我之前的笔记[[链接](/blogs/linux/ssl)]来生成，也可以直接使用我在压缩包 ssl 目录下提供的证书。

&emsp;&emsp;本次笔记里面，需要用到根据证（root.crt），以及通用 SSL 证书（cluster.k8s ）。

### 搭建 DNS、Registry、Yum 服务
&emsp;&emsp;由于 Docker 在搭建基础环境存在无与论比的优势，因此在 10.10.10.10 这台服务器上，我们直接通过 Docker 和 Compose 来创建相关服务，这样可以快速搭建一个新的基础环境。

&emsp;&emsp;将我提供的包里面的 svc.cluster.k8s 目录下的所有文件，都上传到 10.10.10.10 这台服务器上，然后通过以下命令直接安装 docker 环境。

```bash
# 将本地的 SSH 证书添加到 svc.cluster.k8s(10.10.10.10) 服务器上，这样后续操作时就不需要输入登录密码了
$ ssh-copy-id root@10.10.10.10
 
# 将压缩包里的 svc.cluster.k8s 目录下的所有文件上传到服务器
$ scp -r ./svc.cluster.k8s/* root@10.10.10.10:~

# 然后登录上服务器
$ ssh root@10.10.10.10

# firewalld 与 docker 存在冲突，因此关闭、禁用、卸载 firewalld 防火墙
$ systemctl stop firewalld && systemctl disable firewalld && yum -y remove firewalld

# 安装 docker 运行环境
$ yum install -y ~/docker/packages/*

# 启动 docker 并允许开机自启动
$ systemctl start docker && systemctl enable docker

# 安装 docker-compose，并添加可执行权限
$ cp ~/docker/compose/docker-compose-linux-x86_64-v2.6.0 /usr/local/bin/docker-compose
$ chmod +x /usr/local/bin/docker-compose

# 输出 docker 版本号
$ docker --version
Docker version 20.10.17, build 100c701

# 输出 docker-compose 版本号
$ docker-compose --version
Docker Compose version v2.6.0
```

&emsp;&emsp;由于服务器是离线环境，因此我们需要手动将搭建基础环境的镜像导入为本地镜像，这样 Docker Compose 就不需要从网络上去加载镜像了。通过以下命令导入 DNS、Nginx、Registry 的镜像。

```bash
# 导入镜像
$ docker load -i ~/docker/images/coredns-1.9.3.tar
$ docker load -i ~/docker/images/nginx-1.22.0.tar
$ docker load -i ~/docker/images/registry-2.8.1.tar

# 查看镜像信息
$ docker images
REPOSITORY        TAG       IMAGE ID       CREATED       SIZE
nginx             1.22.0    f9c88cc1c21a   2 weeks ago   142MB
coredns/coredns   1.9.3     5185b96f0bec   2 weeks ago   48.8MB
registry          2.8.1     773dbf02e42e   2 weeks ago   24.1MB
```

&emsp;&emsp;使用 docker-compose 创建服务，完成 DNS、Registry、Yum 服务的搭建。

```bash
# 启动服务
$ cd ~/docker-compose && docker-compose up -d
```

&emsp;&emsp;等待 docker-compose 命令执行完毕完，svc.cluster.k8s 这台服务器就已经完成了 DNS、Registry、Yum 源的环境搭建了。

&emsp;&emsp;在我提供的环境中，已经将相关的域名解析信息添加到 DNS 服务器中，如果你需要修改这些解析信息，可以通过修改 ~/docker-compose/svc-dns/hosts 文件完成相关操作。在压缩包里的 DNS 服务器的配置文件中，已添加以下解析信息：


- 10.10.10.10 yum.cluster.k8s：Yum 源
- 10.10.10.10 registry.cluster.k8s：容器镜像源
- 10.10.10.10 cluster.k8s
- 10.10.10.11 master.cluster.k8s：主节点域名映射
- 10.10.10.12 node1.cluster.k8s：工作节点域名映射
- 10.10.10.13 node2.cluster.k8s：工作节点域名映射

&emsp;&emsp;如果需要修改 Registry、Yum 源的域名信息，你还需要同时修改 ~/docker-compose/svc-nginx/conf.d 目录下的相关配置（注意 SSL 证书也需要与之匹配）。

### 测试 svc.cluster.k8s 环境
&emsp;&emsp;搭建好 svc.cluster.k8s 环境之后，我们需要测试一下 DNS、Registry、Yum 服务器是否工作正常。我们通过在 master.cluster.k8s 这台服务器来完成相关测试。

```bash
# 将本地的 SSH 证书添加到 master.cluster.k8s(10.10.10.11) 服务器上，这样后续操作时就不需要输入登录密码了
$ ssh-copy-id root@10.10.10.11

# 将压缩包里面的 cluster.k8s 目录下的所有文件复制到服务器
$ scp -r ./cluster.k8s/* root@10.10.10.11:~

# 远程登录上 master.cluster.k8s 服务器
$ ssh root@10.10.10.11

# 将自签名的根证书添加到系统的证书信任列表中，否则在访问服务器的时候，会报证书不受信任错误
$ cat ~/ssl/root.crt >> /etc/pki/tls/certs/ca-bundle.crt

# 修改服务器服的网卡配置，将 DNS 设置为 10.10.10.10
$ vi /etc/sysconfig/network-scripts/ifcfg-ens192

# 重启网络，使配置生效
$ systemctl restart network

# 测试 DNS 服务是否可以正常解析域名
# 如果是新装的系统，可能没有安装 bind-utils 工具包，因此 nslookup 命令可能无法使用，可以使用 ping 代替
$ nslookup registry.cluster.k8s 10.10.10.10
Server:		10.10.10.10
Address:	10.10.10.10#53

Name:	registry.cluster.k8s
Address: 10.10.10.10

# 测试 Registry 服务
$ curl https://registry.cluster.k8s/v2/
{}

# 测试 Yum 服务
$ curl https://yum.cluster.k8s
<html>
<head><title>Index of /</title></head>
<body>
<h1>Index of /</h1><hr><pre><a href="../">../</a>
<a href="centos/">centos/</a>                                            05-Jun-2022 23:38                   -
</pre><hr></body>
</html>
```

&emsp;&emsp;如果 DNS、Registry、Yum 源服务不能正常工作，那么就需要继续排查一下。

### 更新系统环境
&emsp;&emsp;在离线环境中，CentOS7 原来的 yum 源是没办法访问的，因此我们需要将原来的 yum 删了，切换成上面搭建的 yum.cluster.k8s 源。

```bash
# 删除系统原来的 yum 源
$ rm -f /etc/yum.repos.d/CentOS-*

# 添加自己搭建的 yum 源信息
# 如果你修改了 yum 源的访问地址，那么需要修改完 centos.repo 里面的地址之后再复制
$ cp ~/yum.repos.d/centos.repo /etc/yum.repos.d/centos.repo
```

&emsp;&emsp;完成以上步骤之后，当前系统的 yum 源就指向了我们搭建好的 yum 源服务，然后我们就可以像联网一样去安装和更新软件了。

&emsp;&emsp;接下来，我们将 CentOS7 的内核更新到 5.4.197，并更新系统依赖和常用工具。

```bash
# 更新系统内核，CentOS 7 的默认内核是 3.10.0
$ uname -r
3.10.0-1160.el7.x86_64

# 安装 5.4.197 内核
$ yum --enablerepo=elrepo-kernel install -y kernel-lt

# 设置开机从新内核启动 
$ grub2-set-default 'CentOS Linux (5.4.197-1.el7.elrepo.x86_64) 7 (Core)'

# 升级内核后需要重新启动
$ reboot

# 查看当前内核版本
$ uname -r
5.4.197-1.el7.elrepo.x86_64

# 卸载旧内核
$ yum remove -y kernel kernel-tools

# 重启系统，可以发现旧内核已经没有了
$ reboot

# 升级系统依赖
$ yum update -y

# 在更新系统后，不知道为什么删掉的那些 yum 源又回来了，因此又得删一遍
$ rm -f /etc/yum.repos.d/CentOS-*

# 安装常用工具
$ yum install -y nano net-tools wget bind-utils
```

&emsp;&emsp;调整系统环境与参数。

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

```bash
# 将 ssl 目录下的自签名根证书复制到指定目录，containerd 在拉取镜像时会验证 registry.cluster.k8s 的证书有效性
$ cp ~/ssl/root.crt /etc/ssl/certs/root.crt

# 安装 containerd
$ yum install -y containerd.io

# 导出 containerd 的配置
$ containerd config default > /etc/containerd/config.toml

# 编辑 config.toml，添加 docker.io、k8s.gcr.io 的本地镜像仓库
$ nano /etc/containerd/config.toml

# 添加 registry.cluster.k8s 仓库的证书配置，否则 containerd 在拉取镜像时会报证书异常
# 如果 registry 需要验证信息，还可以配置访问的帐号密码
# 为 docker.io、k8s.gcr.io、cluster.k8s 添加镜像仓库，这样 containerd 就会通过 registry.cluster.k8s 仓库来拉取镜像，因此就不需要访问互联网了
      [plugins."io.containerd.grpc.v1.cri".registry.configs]
        [plugins."io.containerd.grpc.v1.cri".registry.configs."registry.cluster.k8s".tls]
          ca_file = "/etc/ssl/certs/root.crt"
#        [plugins."io.containerd.grpc.v1.cri".registry.configs."registry.cluster.k8s".auth]
#          username = "test"
#          password = "test"

      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
          endpoint = ["https://registry.cluster.k8s"]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."k8s.gcr.io"]
          endpoint = ["https://registry.cluster.k8s"]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."cluster.k8s"]
          endpoint = ["https://registry.cluster.k8s"]

# 重启 containerd 服务
# 注意，一定要使用 systemctl 来管理 containerd 进程（也就是 Cgroup driver），否则会与 kubelet 不一致导致 kubeadm 初始化失败
$ systemctl daemon-reload
$ systemctl start containerd && systemctl enable containerd

# 查看 containerd 版本
$ containerd --version
containerd containerd.io 1.6.6 10c12954828e7c7c9b6e0ea9b0c02b01407d3ae1
```

&emsp;&emsp;因为没有安装 docker，因此 docker 相关的命令可能就没办法使用了。可以安装 crictl 工具[[链接](https://github.com/kubernetes-sigs/cri-tools/releases)]，该工具基本可以代替 docker，如 crictl pull xxxx。Kubernetes 不使用这个，因此如果没有这种需求的话，可以跳过下面的步骤。

```bash
# 将压缩目录里面的 crictl-v1.24.2 文件传输到 /usr/local/bin 目录下，然后并添加可执行权限
$ cp ~/crictl/crictl-v1.24.2 /usr/local/bin/crictl
$ chmod +x /usr/local/bin/crictl

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
Client Version: version.Info{Major:"1", Minor:"24", GitVersion:"v1.24.1", GitCommit:"3ddd0f45aa91e2f30c70734b175631bec5b5825a", GitTreeState:"clean", BuildDate:"2022-05-24T12:26:19Z", GoVersion:"go1.18.2", Compiler:"gc", Platform:"linux/amd64"}
Kustomize Version: v4.5.4
The connection to the server localhost:8080 was refused - did you specify the right host or port?
```

### 克隆虚拟机
&emsp;&emsp;以上步骤是每一个 Kubernetes 节点都需要执行的操作。接下来需要你线下完成虚拟机的克隆工作，用于组建 Kubernetes 集群。

&emsp;&emsp;将 master.cluster.k8s 节点的虚拟机克隆两份，通过以下命令修改新虚拟机的 hostname 和 ip。

```bash
# 修改当前虚拟机的 hostname
$ hostnamectl --static set-hostname node1.master.k8s

# 修改当前虚拟机的 IP
$ nano /etc/sysconfig/network-scripts/ifcfg-ens192

# 重启生效
$ reboot
```

### 初始化主节点
&emsp;&emsp;在主节点，也就是主机名为 master.cluster.k8s 的服务器上，完成以下工作：

```bash
# 导出 kubeadm 的默认配置
$ kubeadm config print init-defaults > kubeadm-config.yaml
```

&emsp;&emsp;修改配置文件 kubeadm-config.yaml。

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
  advertiseAddress: 10.10.10.11 # 此处修改为主节点的 IP
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

&emsp;&emsp;开始初始化主节点：

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

kubeadm join 10.10.10.11:6443 --token abcdef.0123456789abcdef \
	--discovery-token-ca-cert-hash sha256:e07a6fd39fab881fabe0d7c53cceb6d1cf08644ab8e36b6c53402ad61f9907a0 

# 编辑 ~/.bash_profile，添加环境变量
$ nano ~/.bash_profile

# 在 ～/.bash_profile 添加以下内容，我不太会用 vi，习惯用 nano，根据情况可以选择不加 KUBE_EDITOR 环境变量
export KUBECONFIG=/etc/kubernetes/admin.conf
export KUBE_EDITOR=nano

# 使环境变量生效
$ source ~/.bash_profile

# 修改 kube-proxy 的配置，否则 kube-proxy 会一直处于 CrashLoopBackOff 状态
# 找到 featureGates: 和 SupportIPVSProxyMode: true 这两行，将其注释后保存退出即可
$ kubectl edit cm kube-proxy -n kube-system

# 添加 flannel 网络插件
$ kubectl apply -f ~/flannel/kube-flannel.yml

# 获取节点信息
# 刚开始一段时间，Kubernetes 还在初始化 flannel 插件，因此 master 节点还处理 NotReady 状态
# 等待一段时间后，master 节点的状态就会变更为 Ready 了
$ kubectl get nodes
NAME                 STATUS   ROLES           AGE   VERSION
master.cluster.k8s   Ready    control-plane   74s   v1.24.1

# 获取系统命名空间的 pod 运行情况
$ kubectl -n kube-system get po
NAME                                         READY   STATUS    RESTARTS      AGE
coredns-6d4b75cb6d-9csf7                     1/1     Running   0             70s
coredns-6d4b75cb6d-jp4ck                     1/1     Running   0             70s
etcd-master.cluster.k8s                      1/1     Running   0             84s
kube-apiserver-master.cluster.k8s            1/1     Running   0             85s
kube-controller-manager-master.cluster.k8s   1/1     Running   0             82s
kube-flannel-ds-74v65                        1/1     Running   0             37s
kube-proxy-xzpk5                             1/1     Running   3 (54s ago)   69s
kube-scheduler-master.cluster.k8s            1/1     Running   0             83s
```

### 初始化工作节点
&emsp;&emsp;在 node1.cluster.k8s 服务器和 node2.cluster.k8s 服务器上，执行以下命令：

```bash
# 将当前节点加入到 Kubernetes 集群
$ kubeadm join 10.10.10.11:6443 --token abcdef.0123456789abcdef \
	--discovery-token-ca-cert-hash sha256:e07a6fd39fab881fabe0d7c53cceb6d1cf08644ab8e36b6c53402ad61f9907a0 

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
NAME                 STATUS     ROLES           AGE     VERSION
master.cluster.k8s   Ready      control-plane   2m39s   v1.24.1
node1.cluster.k8s    NotReady   <none>          27s     v1.24.1
node2.cluster.k8s    NotReady   <none>          21s     v1.24.1

# 在主节点获取 kube-system 的 pod 初始化情况
# 可以发现 Kubernetes 已经在 node1 和 node2 节点中初始化着 kube-proxy 和 kube-flannel
# 等待一段时间后，初始化完毕
$ kubectl -n kube-system get po
NAME                                         READY   STATUS    RESTARTS        AGE
coredns-6d4b75cb6d-9csf7                     1/1     Running   0               2m43s
coredns-6d4b75cb6d-jp4ck                     1/1     Running   0               2m43s
etcd-master.cluster.k8s                      1/1     Running   0               2m57s
kube-apiserver-master.cluster.k8s            1/1     Running   0               2m58s
kube-controller-manager-master.cluster.k8s   1/1     Running   0               2m55s
kube-flannel-ds-74v65                        1/1     Running   0               2m10s
kube-flannel-ds-h5ggj                        1/1     Running   0               41s
kube-flannel-ds-hnbb5                        1/1     Running   0               47s
kube-proxy-4hrmf                             1/1     Running   0               41s
kube-proxy-htx8r                             1/1     Running   0               47s
kube-proxy-xzpk5                             1/1     Running   3 (2m27s ago)   2m42s
kube-scheduler-master.cluster.k8s            1/1     Running   0               2m56s

# 等待一段时间后，再次获取节点信息，发现两个新加入的节点都已经变为 Ready 状态了
$ kubectl get nodes
NAME                 STATUS   ROLES           AGE     VERSION
master.cluster.k8s   Ready    control-plane   3m22s   v1.24.1
node1.cluster.k8s    Ready    <none>          70s     v1.24.1
node2.cluster.k8s    Ready    <none>          64s     v1.24.1

# 如果后续还想加新的节点到 Kubernetes 集群中，那么再次执行上面 kubeadm join 命令，会发现输出以下内容
error execution phase preflight: couldn't validate the identity of the API Server: could not find a JWS signature in the cluster-info ConfigMap for token ID "abcdef"
To see the stack trace of this error execute with --v=5 or higher

# 这是因为主节点已经初始化超过 24 小时了
# 在初始化主节点章节中，可以看到在 kubeadm-config.yaml 配置中定义了 token 的失效时间是 24 小时，因此之前的 token abcdef.0123456789abcdef 已经失效了
# 解决办法是重新生成一个 token，并使用新的 token 来执行 kubeadm join 命令
$ kubeadm token create
exd3wy.8ga18gnj1mbrx0pa

$ kubeadm join 10.10.10.11:6443 --token exd3wy.8ga18gnj1mbrx0pa \
	--discovery-token-ca-cert-hash sha256:1a5a75d46629808b0e46fabaf4986d8ee3288d6c079649c45b52cb3768966f76
```

&emsp;&emsp;以上就是 Kubernetes 1.24.1 在离线环境下的环境搭建过程了。Enjoy yourself！