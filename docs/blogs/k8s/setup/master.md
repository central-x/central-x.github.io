# 初始化主节点
## 概述
&emsp;&emsp;本章节主要介绍了 Kubernetes 集群主节点的初始化工作。Kubernetes 集群主节点在初始化时，有以下两种模式可以选：

- 普通模式：主节点只有一个，API Server 的入口地址就是这个节点的地址。
- 高可用模式：主节点有多个，并提供一个主节点的负载入口地址，API Server 的入口地址就是这个负载地址，再由这个负载地址将请求转发到这些主节点上。

&emsp;&emsp;个人建议统一按照高可用模式的方式去搭建 Kubernetes 集群。如果主节点没有多个，那么负载地址只需要将流量直接转发给该节点即可。如果后续有更多的主机资源加入进来之后，可以随时加这些主机加入主节点集群，让主节点集群变成高可用状态。

## 搭建高可用入口
&emsp;&emsp;搭建高可用集群需要 3 台或以上的主节点，并且提供 3 台主节点的统一访问入口。这个访问入口有多种实现思路，包括：

- 使用 NetScaler、F5 之类的硬件负载器，将流量转发到这些主节点。由于硬件负载器的工作稳定性非常高，因此一般认为已经达到高可用状态；
- 使用 Nginx、HAProxy 之类的软件负载器，将流量转发到这些主节点。Nginx、HAProxy 这些反向代理软件的工作稳定性也非常高，但是服务器层面可能无法保证是可高用，因此可能存在单点故障；
- 使用 Keepalived 生成虚拟 IP，当其中一台主节点挂了之后，虚拟 IP 自动切换到另一台主节点上。由于虚拟 IP 会自动在节点间切换，因此一般也认为已经达到高可用状态。如果使用 Keepalived 作为高可用方案，一般还要配合 Nginx 或 HAProxy 这些反向代理软件，将流量负载到所有主节点上，降低单点压力。

&emsp;&emsp;对于以上三种方案，有条件的可以使用硬件负载；如果可以申请到虚拟 IP（有些环境不允许使用虚拟 IP），可以使用 Keepalived；如果以上两个方案都没办法，可以选择使用软件负载器。

&emsp;&emsp;如果对高可用集群的拓扑结构还没有清晰认识的，可以回到概述文档[[链接](/blogs/k8s/setup/)]里回顾一下。

> &emsp;&emsp;如果没有 3 台或以上的主节点，可以搭建只有 1 台主节点的高可用入口，搭建过程完全一致。高可用入口建议使用域名/主机名来表示，不要直接使用 IP，这样将来高可用入口如果要发生变更的话，只需要修改一下 DNS 服务即可。

### Keepalived + Nginx
&emsp;&emsp;Keepalived 方案虽然可以达到高可用，但是该方案会将所有流量都流向一个节点，其余的节点将处于「无事可做」的状态。为了让节点间的压力平衡一点，一般还要在这些节点上搭建反向代理软件，将流量平均到各个节点上，降低单点压力。在本文档里，反向代理软件我们使用 Nginx。

#### 安装 Nginx

&emsp;&emsp;我们需要在三台主节点（master[x].cluster.k8s）上都安装 Nginx 服务，并且三台服务器的 Nginx 配置也是相同的。

```bash
# 安装 nginx 服务
$ yum install -y nginx

# 修改 nginx 配置文件
$ vi /etc/nginx/nginx.conf
```

&emsp;&emsp;Nginx 服务的配置文件的内容如下:

- **/etc/nginx/nginx.conf**

```nginx
# 注意，这个 stream 节点在 http 节点下面，与 http 节点平级，不要写入 http 节点内
stream {
    log_format basic '$remote_addr [$time_local] '
                 '$protocol $status $bytes_sent $bytes_received '
                 '$session_time';
    access_log /var/log/nginx/stream-access.log basic buffer=32k;

    error_log  /var/log/nginx/stream-error.log notice;

    # 包含 conf.d 下所有以 .stream 结尾的配置
    include /etc/nginx/conf.d/*.stream;
}
```

- **/etc/nginx/conf.d/kubernetes.stream**

```nginx
upstream lb_kubernetes {
    server 10.10.20.11:6443 weight=1;
    # 下面两个节点的环境还没搭好，可以先设为备用服务器，不参与负载
    # 如果希望下面两节点也参与负载，可以在所有主节点都完成初始化之后，把 backup 选项删除即可
    server 10.10.20.12:6443 weight=1 backup;
    server 10.10.20.13:6443 weight=1 backup;
}

server {
    # 监听 16433 端口，后续通过此端口访问 kubernetes 集群
    listen 16433;
    ssl_preread on;

    proxy_pass lb_kubernetes;
    proxy_connect_timeout 300s;
    proxy_timeout 300s;
}
```

```bash
# 启用 nginx 服务
$ systemctl start nginx && systemctl enable nginx

# 测试 nginx 服务是否正常可用
$ telnet 10.10.20.11 16433
Trying 10.10.20.11...
Connected to 10.10.20.11.
Escape character is '^]'.
Connection closed by foreign host.
```

#### 安装 Keepalived
&emsp;&emsp;部署 Keepalived 后，会生成一个虚拟 IP，我们就可以通过这个虚似 IP 访问主节点，从而保证主节点的高可用。在本方案里，如果 nginx 挂了，或者整个服务器挂了，Keepalived 会自动切换到其它的节点。更多关于 Keepalived 的信息，可以参考我另一篇文档[[链接](/blogs/linux/keepalived)]。

&emsp;&emsp;在三台主节点（master[x].cluster.k8s），执行以下命令，安装 Keepalived 服务。

```bash
# 安装 keepalived 服务
$ yum install -y keepalived

# 创建 nginx 进程检测脚本
$ vi /etc/keepalived/check_alived.sh

#!/bin/bash
# 检测 nginx 是否启正常
if [ `ps -C nginx --no-header | wc -l` -eq 0 ]; then
    # nginx 不正常，则代表当前节点无法正常工作
    echo "nginx is not alived";
    # 尝试重启 nginx 服务
    systemctl restart nginx;
    exit 1;
else
    echo "nginx is alived";
    exit 0;
fi

# 给进程检测脚本添加可执行权限
$ chmod +x /etc/keepalived/check_alived.sh
```

&emsp;&emsp;在三台主节点中，选取其中一台作为 Keepalived 的主节点，其余为备用节点。在这里我们选用 master1.cluster.k8s 作为 Keepalived 的主节点，master2.cluster.k8s 和 master3.cluster.k8s 为备用节点。

&emsp;&emsp;修改 master1.cluster.k8s 节点的 Keepalived 配置文件。

- **/etc/keepalived/keepalived.conf**

```nginx
! Configuration File for keepalived

global_defs {
    router_id LVS_DEVEL
    script_user root
    enable_script_security
}

vrrp_script check_alived {
    script "/etc/keepalived/check_alived.sh"
    interval 2
    fail 1
    rise 1
}

vrrp_instance VI_1 {
    state MASTER                  # 主节点
    interface ens192              # 虚拟 IP 绑定的网络接口
    mcast_src_ip 10.10.20.11      # 主节点 IP 地址
    virtual_router_id 51
    priority 110                  # 主节点的优先级最高
    advert_int 2
    authentication {
        auth_type PASS
        auth_pass KP_PASS
    }
    virtual_ipaddress {           # 虚拟 IP 地址
        10.10.20.10
    }
    track_script {
        check_alived
    }
}
```

&emsp;&emsp;修改 master2.cluster.k8s 节点和 master3.cluster.k8s 节点的 keepalived 配置文件。注意有注释的地方。

- **/etc/keepalived/keepalived.conf**

```nginx
! Configuration File for keepalived

global_defs {
    router_id LVS_DEVEL
    script_user root
    enable_script_security
}

vrrp_script check_alived {
    script "/etc/keepalived/check_alived.sh"
    interval 2
    fail 1
    rise 1
}

vrrp_instance VI_1 {
    state BACKUP                  # 备用节点
    interface ens192              # 虚拟 IP 绑定的网络接口
    mcast_src_ip 10.10.20.12      # 备用节点 IP 地址
    virtual_router_id 51
    priority 100                  # 备用节点的优先级。比需比主节点要低。
    advert_int 2
    authentication {
        auth_type PASS
        auth_pass KP_PASS
    }
    virtual_ipaddress {           # 虚拟 IP 地址
        10.10.20.10
    }
    track_script {
        check_alived
    }
}
```

&emsp;&emsp;最后启用 Keepalived 服务即可。

```bash
# 启用 Keepalived 服务
$ systemctl start keepalived && systemctl enable keepalived

# 测试 Keepalived 服务是否正常
# PING 虚拟 IP，看看虚拟 IP 会不会响应
$ ping 10.10.20.10 -c 4
PING 10.10.20.10 (10.10.20.10) 56(84) bytes of data.
64 bytes from 10.10.20.10: icmp_seq=1 ttl=64 time=0.120 ms
64 bytes from 10.10.20.10: icmp_seq=2 ttl=64 time=0.083 ms
64 bytes from 10.10.20.10: icmp_seq=3 ttl=64 time=0.077 ms
64 bytes from 10.10.20.10: icmp_seq=4 ttl=64 time=0.127 ms

--- 10.10.20.10 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3070ms
rtt min/avg/max/mdev = 0.077/0.101/0.127/0.025 ms

# 测试虚拟 IP 的 Nginx 服务是否正常
# 如果测试不通过的话，需要检查一下防火墙、Nginx、Keepalived、SELinux 等的状态和配置是否有问题
$ telnet 10.10.20.10 16433
Trying 10.10.20.10...
Connected to 10.10.20.10.
Escape character is '^]'.
Connection closed by foreign host.
```

#### 修改 DNS 服务
&emsp;&emsp;修改 svc.cluster.k8s 服务器上的 DNS 服务的 hosts 文件，将 master.cluster.k8s 映射为 10.10.20.10，这样就可以直接通过域名来访问 Kubernetes 的主节点集群。

```bash
# 修改 DNS 服务的 hosts 文件，添加一条 master.cluster.k8s 记录
$ nano docker-compose/svc-dns/hosts

# 添加以下记录后，保存退出即可（10.10.20.10 是 Keepalived 虚拟出来的 IP）
10.10.20.10 master.cluster.k8s

# 测试域名解析是否正常
$ telnet master.cluster.k8s 16443
Trying 10.10.20.10...
Connected to master.cluster.k8s.
Escape character is '^]'.
Connection closed by foreign host.
```

### 软件负载器
&emsp;&emsp;软件负载器相对基它方案来说，是最简单以及我们最熟悉的方案。本方案只需要找一台服务器部署 Nginx、HAProxy 这些反向代理软件，将流量负载到主节点上，即可完成软件负载器的搭建工作。

&emsp;&emsp;由于所有流量都要通过该软件负载器所在的服务器，因此我们要尽可能保证该服务器的稳定性。如果该服务器宕机，可能会让集群无法正常工作，因此我们最好不要在这台服务器上部署一些高负载的应用，确保该服务器正常运行。

&emsp;&emsp;本方案里，我们选用 Nginx 作为软件负载器。

#### 安装 Nginx
&emsp;&emsp;找一台空闲的服务器（如果资源匮乏，复用 svc.cluster.k8s 也可以），安装 Nginx 并修改相关配置:

```bash
# 安装 nginx 服务
$ yum install -y nginx

# 修改 nginx 配置文件
$ vi /etc/nginx/nginx.conf
```

&emsp;&emsp;Nginx 服务的配置文件的内容如下:

- **/etc/nginx/nginx.conf**

```nginx
# 注意，这个 stream 节点在 http 节点下面，与 http 节点平级，不要写入 http 节点内
stream {
    log_format basic '$remote_addr [$time_local] '
                 '$protocol $status $bytes_sent $bytes_received '
                 '$session_time';
    access_log /var/log/nginx/stream-access.log basic buffer=32k;

    error_log  /var/log/nginx/stream-error.log notice;

    # 包含 conf.d 下所有以 .stream 结尾的配置
    include /etc/nginx/conf.d/*.stream;
}
```

- **/etc/nginx/conf.d/kubernetes.stream**

```nginx
upstream lb_kubernetes {
    server 10.10.20.11:6443 weight=1;
    # 下面两个节点的环境还没搭好，可以先设为备用服务器，不参与负载
    # 如果希望下面两节点也参与负载，可以在所有主节点都完成初始化之后，把 backup 选项删除即可
    server 10.10.20.12:6443 weight=1 backup;
    server 10.10.20.13:6443 weight=1 backup;
}

server {
    # 监听 16433 端口，后续通过此端口访问 kubernetes 集群
    listen 16433;
    ssl_preread on;

    proxy_pass lb_kubernetes;
    proxy_connect_timeout 300s;
    proxy_timeout 300s;
}
```

```bash
# 启用 nginx 服务
$ systemctl start nginx && systemctl enable nginx

# 测试 nginx 服务是否正常可用
$ telnet 10.10.20.11 16433
Trying 10.10.20.11...
Connected to 10.10.20.11.
Escape character is '^]'.
Connection closed by foreign host.
```

#### 修改 DNS 服务
&emsp;&emsp;修改 svc.cluster.k8s 服务器上的 DNS 服务的 hosts 文件，将 master.cluster.k8s 映射为 Nginx 所在服务器，这样就可以直接通过域名来访问 Kubernetes 的主节点集群。

```bash
# 修改 DNS 服务的 hosts 文件，添加一条 master.cluster.k8s 记录
$ nano docker-compose/svc-dns/hosts

# 添加以下记录后，保存退出即可（这里是复用了 svc.cluster.k8s 节点）
10.10.20.0 master.cluster.k8s

# 测试域名解析是否正常
$ telnet master.cluster.k8s 16443
Trying 10.10.20.0...
Connected to master.cluster.k8s.
Escape character is '^]'.
Connection closed by foreign host.
```

## 初始化
### 修改配置文件
&emsp;&emsp;在完成上面的步骤和测试之后，在主节点（master1.cluster.k8s）服务器上执行以下命令，导出默认的 Kubernetes 配置：

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
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 10.10.20.11 # 此处修改为当前主节点的 IP
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
  imagePullPolicy: IfNotPresent
  name: master1.cluster.k8s   # 修改为主节点的 hostname
  taints: null
---
apiServer:
  certSANs:
  - master.cluster.k8s # 集群入口域名
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controlPlaneEndpoint: master.cluster.k8s:16443 # 此处修改集群入口域名和反向代理端口
controllerManager: {}
dns: {}
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: registry.k8s.io
kind: ClusterConfiguration
kubernetesVersion: 1.27.2 # 修改为当前版本
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

### 初始化主节点
&emsp;&emsp;开始初始化主节点：

```bash
# 初始化主节点，开始部署
$ kubeadm init --config=kubeadm-config.yaml --upload-certs | tee kubeadm-init.log

# 如果发现最后输出以下信息，说明主节点初始化成功
# 注意保存好两个 token 和 certificate-key
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

You can now join any number of the control-plane node running the following command on each as root:

  kubeadm join master.cluster.k8s:16443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:ee3da16b9d7e53d54209c5910a5629d88b52d77b51fc77ba29206dec74431972 \
        --control-plane --certificate-key 31ce9f38771e99ddbb834e3694e13fff9f3e4741bf5bc09e9182f751a0d0cb24

Please note that the certificate-key gives access to cluster sensitive data, keep it secret!
As a safeguard, uploaded-certs will be deleted in two hours; If necessary, you can use
"kubeadm init phase upload-certs --upload-certs" to reload certs afterward.

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join master.cluster.k8s:16443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:ee3da16b9d7e53d54209c5910a5629d88b52d77b51fc77ba29206dec74431972

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

# 获取节点信息
# 由于还没安装 flannel 网络插件导入 coredns 无法初始化，因此 master 节点还处于 NotReady 状态
$ kubectl get nodes
NAME                  STATUS     ROLES           AGE   VERSION
master1.cluster.k8s   NotReady   control-plane   54s   v1.27.2

# 获取系统命名空间的 pod 运行情况
$ kubectl -n kube-system get po
NAME                                          READY   STATUS    RESTARTS      AGE
coredns-5d78c9869d-lmqtg                      0/1     Pending   0             46s
coredns-5d78c9869d-sm29p                      0/1     Pending   0             46s
etcd-master1.cluster.k8s                      1/1     Running   0             61s
kube-apiserver-master1.cluster.k8s            1/1     Running   0             59s
kube-controller-manager-master1.cluster.k8s   1/1     Running   0             61s
kube-proxy-xxdhb                              1/1     Running   3 (30s ago)   46s
kube-scheduler-master1.cluster.k8s            1/1     Running   0             60s

# 查看证书有效期，全部证书有效期为 10 年
$ kubeadm certs check-expiration
[check-expiration] Reading configuration from the cluster...
[check-expiration] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'

CERTIFICATE                EXPIRES                  RESIDUAL TIME   CERTIFICATE AUTHORITY   EXTERNALLY MANAGED
admin.conf                 Jun 10, 2033 22:06 UTC   9y              ca                      no      
apiserver                  Jun 10, 2033 22:06 UTC   9y              ca                      no      
apiserver-etcd-client      Jun 10, 2033 22:06 UTC   9y              etcd-ca                 no      
apiserver-kubelet-client   Jun 10, 2033 22:06 UTC   9y              ca                      no      
controller-manager.conf    Jun 10, 2033 22:06 UTC   9y              ca                      no      
etcd-healthcheck-client    Jun 10, 2033 22:06 UTC   9y              etcd-ca                 no      
etcd-peer                  Jun 10, 2033 22:06 UTC   9y              etcd-ca                 no      
etcd-server                Jun 10, 2033 22:06 UTC   9y              etcd-ca                 no      
front-proxy-client         Jun 10, 2033 22:06 UTC   9y              front-proxy-ca          no      
scheduler.conf             Jun 10, 2033 22:06 UTC   9y              ca                      no      

CERTIFICATE AUTHORITY   EXPIRES                  RESIDUAL TIME   EXTERNALLY MANAGED
ca                      Jun 10, 2033 22:06 UTC   9y              no      
etcd-ca                 Jun 10, 2033 22:06 UTC   9y              no      
front-proxy-ca          Jun 10, 2033 22:06 UTC   9y              no      
```

### 安装 Helm
&emsp;&emsp;Helm 是 Kubernetes 的包管理器，通过 Helm 可以很方便地给集群安装或卸载资源包，后续部署包时，一般建议通过 helm 来管理。一般情况下，我们需要将 Helm 部署到主节点上。

```bash
# 将 helm 下载并安装到指定目录
$ curl -o /usr/local/bin/helm http://mirror.cluster.k8s/repository/raw/helm-linux-amd64-v3.12.0

# 添加可执行权限
$ chmod +x /usr/local/bin/helm

# 查看是否正常
$ helm version
version.BuildInfo{Version:"v3.12.0", GitCommit:"c9f554d75773799f72ceef38c51210f1842a1dea", GitTreeState:"clean", GoVersion:"go1.20.3"}

# 查看是否能连接到集群
$ helm list
NAME 	NAMESPACE	REVISION	UPDATED                                STATUS  	CHART       	APP VERSION

# 添加 helm 仓库
$ helm repo add mirror http://mirror.cluster.k8s/repository/helm/
"mirror" has been added to your repositories
```

### 安装 flannel
&emsp;&emsp;flannel 是 Kubernetes 的网络插件。这里使用 helm 安装 flannel。

```bash
# 安装 kube-flannel 插件
$ helm install kube-flannel mirror/kube-flannel
NAME: kube-flannel
LAST DEPLOYED: Tue Jun 13 02:55:47 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None

# 获取 helm 列表
$ helm list
NAME        	NAMESPACE	REVISION	UPDATED                               	STATUS  	CHART              	APP VERSION
kube-flannel	default  	1       	2023-06-12 06:09:54.92844014 +0800 CST	deployed	kube-flannel-0.22.0	0.22.0  

# 安装 kube-flannel 插件后，再获取节点信息
# 可以发现节点已初始化
$ kubectl get nodes
NAME                  STATUS   ROLES           AGE    VERSION
master1.cluster.k8s   Ready    control-plane   116s   v1.27.2

# 获取系统命名空间的 pod 运行情况，全部正常运行
$ kubectl -n kube-system get po
NAME                                          READY   STATUS    RESTARTS      AGE
coredns-5d78c9869d-lmqtg                      1/1     Running   0             109s
coredns-5d78c9869d-sm29p                      1/1     Running   0             109s
etcd-master1.cluster.k8s                      1/1     Running   0             2m4s
kube-apiserver-master1.cluster.k8s            1/1     Running   0             2m2s
kube-controller-manager-master1.cluster.k8s   1/1     Running   0             2m4s
kube-proxy-xxdhb                              1/1     Running   3 (93s ago)   109s
kube-scheduler-master1.cluster.k8s            1/1     Running   0             2m3s
```

### 初始化备用主节点
&emsp;&emsp;在其它备用主节点上，通过以下命令初始化并加入 Kubernetes 集群。

```bash
# 这个命令是在主节点（master1.cluster.k8s）初始化时打印在命令行里的
# 直接复制该命令到其它主节点上执行即可
$ kubeadm join master.cluster.k8s:16443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:ee3da16b9d7e53d54209c5910a5629d88b52d77b51fc77ba29206dec74431972 \
        --control-plane --certificate-key 31ce9f38771e99ddbb834e3694e13fff9f3e4741bf5bc09e9182f751a0d0cb24

This node has joined the cluster and a new control plane instance was created:

* Certificate signing request was sent to apiserver and approval was received.
* The Kubelet was informed of the new secure connection details.
* Control plane label and taint were applied to the new node.
* The Kubernetes control plane instances scaled up.
* A new etcd member was added to the local/stacked etcd cluster.

To start administering your cluster from this node, you need to run the following as a regular user:

        mkdir -p $HOME/.kube
        sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
        sudo chown $(id -u):$(id -g) $HOME/.kube/config

Run 'kubectl get nodes' to see this node join the cluster.

# 如果你想在这个节点上也可以管理集群，那么通过以下命令完成配置即可
# 编辑 ~/.bash_profile，添加环境变量
$ nano ~/.bash_profile

# 在 ～/.bash_profile 添加以下内容，我不太会用 vi，习惯用 nano，根据情况可以选择不加 KUBE_EDITOR 环境变量
export KUBECONFIG=/etc/kubernetes/admin.conf
export KUBE_EDITOR=nano

# 使环境变量生效
$ source ~/.bash_profile
```

&emsp;&emsp;回到主节点（master1.cluster.k8s）上执行以下命令，查看各节点的状态。

```bash
$ kubectl get nodes
NAME                  STATUS   ROLES           AGE     VERSION
master1.cluster.k8s   Ready    control-plane   4m14s   v1.27.2
master2.cluster.k8s   Ready    control-plane   84s     v1.27.2
master3.cluster.k8s   Ready    control-plane   18s     v1.27.2

$ kubectl get po -n kube-system
NAME                                          READY   STATUS    RESTARTS        AGE
coredns-5d78c9869d-lmqtg                      1/1     Running   0               4m5s
coredns-5d78c9869d-sm29p                      1/1     Running   0               4m5s
etcd-master1.cluster.k8s                      1/1     Running   0               4m20s
etcd-master2.cluster.k8s                      1/1     Running   0               91s
etcd-master3.cluster.k8s                      1/1     Running   0               26s
kube-apiserver-master1.cluster.k8s            1/1     Running   0               4m18s
kube-apiserver-master2.cluster.k8s            1/1     Running   0               91s
kube-apiserver-master3.cluster.k8s            1/1     Running   0               26s
kube-controller-manager-master1.cluster.k8s   1/1     Running   1 (81s ago)     4m20s
kube-controller-manager-master2.cluster.k8s   1/1     Running   0               91s
kube-controller-manager-master3.cluster.k8s   1/1     Running   0               26s
kube-proxy-nrxp4                              1/1     Running   0               27s
kube-proxy-wgd5z                              1/1     Running   0               92s
kube-proxy-xxdhb                              1/1     Running   3 (3m49s ago)   4m5s
kube-scheduler-master1.cluster.k8s            1/1     Running   1 (77s ago)     4m19s
kube-scheduler-master2.cluster.k8s            1/1     Running   0               90s
kube-scheduler-master3.cluster.k8s            1/1     Running   0               26s
```

### 命令过期处理
&emsp;&emsp;因为主节点可以访问集群的敏感信息，因此主节点的 certificate-key 会在 2 个小时后过期，而 token 会在 24 小时后过期。如果后续还有新的主节点想加入集群，就需要通过以下命令生成新的 certificate-key 和 token。

```bash
# 生成新的 certificate-key
$ kubeadm init phase upload-certs --upload-certs
W0613 02:58:56.062625    3936 version.go:104] could not fetch a Kubernetes version from the internet: unable to get URL "https://dl.k8s.io/release/stable-1.txt": Get "https://dl.k8s.io/release/stable-1.txt": dial tcp: lookup dl.k8s.io on 10.10.20.0:53: server misbehaving
W0613 02:58:56.062682    3936 version.go:105] falling back to the local client version: v1.27.1
[upload-certs] Storing the certificates in Secret "kubeadm-certs" in the "kube-system" Namespace
[upload-certs] Using certificate key:
7e2d3f6d64605d57905f2b8e57a4ff3a32b2753b3b3fdcfe7834eacb4d7bf488

# 生成新的 token 及加入集群的命令
$ kubeadm token create --print-join-command
kubeadm join master.cluster.k8s:16443 --token 8nlczr.ni69skrz2r5ijx16 --discovery-token-ca-cert-hash sha256:ee3da16b9d7e53d54209c5910a5629d88b52d77b51fc77ba29206dec74431972

# 将上面生成的新 certificate-key 拼接到命令后面，新节点就可以使用新的该命令来加入集群了
$ kubeadm join master.cluster.k8s:16443 --token 8nlczr.ni69skrz2r5ijx16 
        --discovery-token-ca-cert-hash sha256:ee3da16b9d7e53d54209c5910a5629d88b52d77b51fc77ba29206dec74431972
        --control-plane --certificate-key 7e2d3f6d64605d57905f2b8e57a4ff3a32b2753b3b3fdcfe7834eacb4d7bf488
```