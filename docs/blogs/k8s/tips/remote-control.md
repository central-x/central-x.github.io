# 本地控制远端 Kubernetes 集群
## 概述

&emsp;&emsp;在上一篇笔记中，已经完成了 Kubernetes 集群的搭建工作。在接下来的笔记里需要开始学习 Kubernetes 的一些操作。由于 Kubernetes 的主节点在远程服务器上，在远程服务器上有时不是特别方便执行一些文件（如 Pod 的声明文件等）编辑操作，如果在本地完成文件编辑，还需要将这些文件复制到主节点上才能正常工作，相对操作起来会比较麻烦。

&emsp;&emsp;因此，在这篇笔记里，记录一下如何在本地去操作 Kubernetes 集群。

## 步骤
&emsp;&emsp;远程上 Kubernetes 集群的主节点，然后获取 /etc/kubernetes/admin.conf 文件，将这个文件复制到本地。本地安装 kubectl 工具，然后设置 kubectl 工具使用 /etc/kubernetes/admin.conf 文件即可。

```bash
# 本地创建 /etc/kubernetes 目录
$ mkdir /etc/kubernetes

# 将主节点的 admin.conf 文件复制到本地相同目录下
$ scp root@10.10.10.11:/etc/kubernetes/admin.conf /etc/kubernetes/admin.conf

# 本地安装 kubectl 工具，这里假设以 CentOS7 为例
$ yum install kubectl

# 编辑 ~/.bash_profile，添加环境变量
$ nano ~/.bash_profile

# 在 ～/.bash_profile 添加以下内容，我不太会用 vi，习惯用 nano，根据情况可以选择不加 KUBE_EDITOR 环境变量
export KUBECONFIG=/etc/kubernetes/admin.conf
export KUBE_EDITOR=nano

# 使环境变量生效
$ source ~/.bash_profile

# 获取 Kubernetes 集群信息
$ kubectl cluster-info
Kubernetes control plane is running at https://10.10.10.11:6443
CoreDNS is running at https://10.10.10.11:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.

# 获取 Kubernetes 节点信息
$ kubectl get nodes
NAME                 STATUS   ROLES           AGE     VERSION
master.cluster.k8s   Ready    control-plane   5d20h   v1.24.1
node1.cluster.k8s    Ready    <none>          5d20h   v1.24.1
node2.cluster.k8s    Ready    <none>          5d20h   v1.24.1
node3.cluster.k8s    Ready    <none>          2d10h   v1.24.1
```

&emsp;&emsp;接下来就可以在本地操作 Kubernetes 集群了。