# 初始化存储节点
## 概述
&emsp;&emsp;Kubernetes 支持多种类型的存储，如 NFS、Rook、Ceph 集群、Minio 等，这些存储将会被声明成卷，从而支持应用进行一些持久化存储。

&emsp;&emsp;本文将列出一些常用的存储搭建过程，运维人员应根据实际情况选择。同时，为了减少 Kubernetes 管理员管理 PV 的工作量，在本文也提供了这些存储类型对应的 StorageClass 来自动管理 PV 的申请和释放的过程。

## NFS
&emsp;&emsp;NFS 是非常常用的文件存储技术，但是其存在单点故障，因此在生产环境需要慎用。

### 安装 NFS 服务
&emsp;&emsp;选择一台服务器作为存储服务器，安装 nfs 相关服务。

```bash
# 安装 nfs-utils 和 rpcbind
$ yum install -y nfs-utils rpcbind

# 启用 rpcbind
$ systemctl start rpcbind && systemctl enable rpcbind

# 测试 rpcbind 是否在运行
$ telnet 10.10.20.1 111
Trying 10.10.20.1...
Connected to 10.10.20.1.
Escape character is '^]'.
Connection closed by foreign host.

# 查看端口占用情况
$ netstat -tunlp | grep 111
tcp        0      0 0.0.0.0:111             0.0.0.0:*               LISTEN      2473/rpcbind        
tcp6       0      0 :::111                  :::*                    LISTEN      2473/rpcbind        
udp        0      0 0.0.0.0:111             0.0.0.0:*                           2473/rpcbind        
udp6       0      0 :::111                  :::*                                2473/rpcbind

# 对外暴露存储
$ nano /etc/exports

# 以下是 /etc/exports 文件的内容
# /home/data 是对外暴露的存储目录
# 10.0.0.1/16 表示 10.10.*.* 的服务器可以访问这个共享
# rw 表示读写权限，no_root_squash 表示使用者是 root 时，其权限转为匿名使用者
/home/data 10.0.0.1/16(rw,no_root_squash)

# 启用 nfs
$ systemctl start nfs && systemctl enable nfs

# 测试
$ showmount -e 10.10.20.1
Export list for 10.10.20.1:
/home/data 10.10.0.1/16
```

&emsp;&emsp;由于不知道 Pod 会被调度到哪个节点，因此所有服务器的节点都需要安装上 nfs-utils 才能正常挂载。

```bash
# 其余工作节点只需要安装了就可以了，不需要做配置
$ yum install -y nfs-utils
```

### 使用 NFS
&emsp;&emsp;在声明 Pod 时，可以直接使用这个 NFS。

```yaml
apiVersion: apps:/v1
kind: Deployment
metadta:
  name: deployment_name
spec:
  template:
    spec:
      containers:
        - name: container_name
          image: nginx:1.24.0
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          nfs:
            server: 10.10.20.1
            path: /home/data
```

### StorageClass
&emsp;&emsp;Kubernetes 在私有部署时，没有包含内置的 NFS StorageClasse 提供程序，因此需要安装额外的 StorageClass。这里使用 NFS Subdirectory External Provisione[[链接](https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner)]。

&emsp;&emsp;使用 Helm 来安装 NFS Subdirectory External Provisione。

```bash
# 安装 nfs-subdir-external-provisioner
# nfs.server 是 NFS 服务器地址
# nfs.path 是 NFS 提供的挂载地址
$ helm install nfs-provisioner mirror/nfs-subdir-external-provisioner \
  -n kube-system \
  --set nfs.server=10.10.20.1 \
  --set nfs.path=/home/data \
  --set storageClass.name=nfs
```

::: tip 提示
&emsp;&emsp;nfs-subdir-external-provisioner 提供了很多高级选项，包括 PV 回收策略、磁盘回收策略等等。可以通过 helm pull mirror/nfs-subdir-external-provisioner 将 helm 包拉取到本地后，解压查看 values.yaml 文件了解更多。
:::