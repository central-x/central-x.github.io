# 集中管理集群
## 概述
&emsp;&emsp;部署 Kubernetes 之后，后续其余各个服务器节点的 CPU 、内存资源等基本就交给 Kubernetes
进行集中管理了，后续集群管理员只需要操作主节点，即可将应用轻松部署到集群中。

&emsp;&emsp;但是在实际生产环境的管理过程中，集群由于是离线管理的，因此部署时，需要将 Docker 镜像、Helm 包复制到集群并上传到
Docker Registry 和 Helm 私库，再操作 Kubernetes 部署到集群中。由于 Docker Registry 和 Helm 私库都部署在 svc.cluster.k8s
节点中，因此可以让 svc.cluster.k8s 作为整个集群的管理节点，这样每次运维时，就可以只需要登录一个服务器节点就可以完成所有操作了。

## 操作过程
&emsp;&emsp;根据我另一篇文档[[链接](/blogs/k8s/tips/remote-control)]，让 svc.cluster.k8s 可以远程控制 Kubernetes 集群。

```bash
# 在 svc.cluster.k8s 节点中，创建以下目录
$ mkdir /etc/kubernetes

# 将 master1.cluster.k8s 节点的配置文件下拉
$ scp root@master1.cluster.k8s:/etc/kubernetes/admin.conf /etc/kubernetes/admin.conf

# 本地安装 kubectl 客户端
$ yum install kubectl

# 编辑 ~/.bash_profile，添加环境变量，该文件最后添加下面两行配置
$ vi ~/.bash_profile

export KUBECONFIG=/etc/kubernetes/admin.conf
export KUBE_EDITOR=nano

# 保存后让变量生效
$ source ~/.bash_profile

# 获取 Kubernetes 集群信息
$ kubectl cluster-info
Kubernetes control plane is running at https://master.cluster.k8s:16443
CoreDNS is running at https://master.cluster.k8s:16443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

&emsp;&emsp;同时，在 svc.cluster.k8s 节点上，安装 helm 客户端，就可以在本地通过 helm 管理 Kubernetes 集群了。

```bash
# 将 helm 下载并安装到指定目录
$ curl -o /usr/local/bin/helm http://mirror.cluster.k8s/repository/raw/helm-linux-amd64-v3.12.2

# 添加可执行权限
$ chmod +x /usr/local/bin/helm

# 查看是否正常
$ helm version
version.BuildInfo{Version:"v3.12.2", GitCommit:"1e210a2c8cc5117d1055bfaa5d40f51bbc2e345e", GitTreeState:"clean", GoVersion:"go1.20.5"}

# 查看是否能连接到集群
$ helm list -n kube-system
NAME               	NAMESPACE  	REVISION	UPDATED                                	STATUS  	CHART                    	APP VERSION
kube-dashboard     	kube-system	1       	2023-07-27 04:49:18.64526989 +0800 CST 	deployed	kube-dashboard-2.7.0     	2.7.0      
kube-flannel       	kube-system	1       	2023-07-27 04:20:53.353204291 +0800 CST	deployed	kube-flannel-v0.22.0     	v0.22.0    
kube-metrics-server	kube-system	1       	2023-07-27 04:47:23.939085564 +0800 CST	deployed	kube-metrics-server-0.6.3	0.6.3      
nfs-permanent      	kube-system	1       	2023-07-27 04:39:13.846105718 +0800 CST	deployed	nfs-permanent-4.0.18     	4.0.2      
nfs-temporary      	kube-system	1       	2023-07-27 04:39:36.230024145 +0800 CST	deployed	nfs-temporary-4.0.18     	4.0.2      

# 添加 helm 仓库
$ helm repo add mirror http://mirror.cluster.k8s/repository/helm/
"mirror" has been added to your repositories
```