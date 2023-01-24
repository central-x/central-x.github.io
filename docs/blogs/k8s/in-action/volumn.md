# Volumn
## 概述
&emsp;&emsp;Pod 在运行过程中，一般情况下拥有独立的文件系统（文件系统来自于容器镜像）。当 Pod 的生命周期结束时，容器上面的创建的文件等也会随之消失，新的 Pod 的容器并没办法获取前一个容器写入文件系统内的任何内容，即使新启动的容器与原容器运行在同一个 Pod 中。

&emsp;&emsp;在某些场景下，我们可能希望新的容器可以在之前的容器结束的位置继续运行。Kubernetes 通过定义存储卷来满足这个需求。存储卷不像 Pod 这样的顶级资源，而是被定义为 Pod 的一部分，并和 Pod 共享相同的生命周期。这意味着 Pod 启动时创建卷，并在删除 Pod 时销毁卷。因此在容器重新启动期间，卷的内容将保持不变，而重新启动容器之后，新容器可以识别前一个容器写入卷的所有文件。另外，如果一个 Pod 包含多个容器，那么这个卷可以同时被所有容器使用。

&emsp;&emsp;有多种卷类型可供选择。其中一些是通用的，而另一些可能依赖于云服务商提供:

- emptyDir: 用于存储临时数据的简单空目录。
- gitRepo: 通过检出 Git 仓库的内容来初始化的卷。
- hostPath: 用于将目录从工作节点的文件系统挂载到 Pod 中。
- nfs: 挂载到 pod 中的 NFS 共享卷。
- gcePersistentDisk(Google高效能型存储磁盘卷)、awsElasticBlockStore(AmazonWeb服务弹性块存储卷)、azureDisk(Microsoft Azure 磁盘盘卷): 用于挂载云服务商提供的特定存储类型。
- cinder、cephfs、iscsi、flocker、glusterfs、quobyte、rbd、flexVolume、vsphere-Volume、photomPersistentDisk、scaleIO: 用于挂载其他类型的网络存储
- configMap、secret、downwardAPI: 用于将 Kubernetes 部份资源和集群信息公开给 Pod 的特殊类型的卷。
- persistentVolumeClaim: 一种使用预置或者动态配置的持久存储类型

## 类型
### emptyDir
&emsp;&emsp;emptyDir 顾名思义，卷从一个空目录开始，运行在 Pod 内的应用程序可以写入它需要的任何文件。因为卷的生存周期与 Pod 的生存周期相关联，所以当删除 Pod 时，卷的内容就会丢失。

&emsp;&emsp;emptyDir 卷对于在同一个 Pod 中运行的容器之间共享文件特别有用。但是它也可以被单个容器用于将数据临时写入磁盘，例如在大型数据集上执行排序操作时，没有那么多内存可供使用。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fortune
spec:
  containers:
  - image: luksa/fortune
    name: html-generator
    volumeMounts:            # 挂载名为 html 的卷，用于自动生成 html 内容
    - name: html
      mountPath: /var/htdocs
  - image: nginx:alpine
    name: web-server
    volumeMounts:            # 挂载名为 html 的卷，并设为只读。通过 nginx 将卷里的内容展示出来
    - name: html
      mountPath: /usr/share/nginx/html
      readOnly: true
    ports:
    - containerPort: 80
      protocol: TCP
  volumes:                   # 声明一个名为 html 的卷，挂载到上面的两个容器中
  - name: html
    emptyDir: {}
```

&emsp;&emsp;一般情况下，Kubernetes 会在 Pod 所在的节点的磁盘上创建 emptyDir 卷，因此其性能取决于节点的磁盘类型。我们也可以通过 Kubernetes 在 tmfs 文件系统（存在内存而非硬盘）上创建 emptyDir。

```yaml
  volumes:
  - name: html
    emptyDir:
      medium: Memory
```

### gitRepo
&emsp;&emsp;gitRepo 基本上也是一个 emptyDir 卷，它通过克隆 Git 仓库并在 Pod 启动时检出特定版本来填充数据。

> 注意：在创建 gitRepo 卷后，它并不能和对应的 repo 保持同步。删除 Pod 重新创建的 Pod 将包含最新的提交。如果需要保持卷的内容是最新的，需要通过容器去控制。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gitrepo-volume-pod
spec:
  containers:
  - image: nginx:alpine
    name: web-server
    volumeMounts:
    - name: html
      mountPath: /usr/share/nginx/html
      readOnly: true
    ports:
    - containerPort: 80
      protocol: TCP
  volumes:
  - name: html
    gitRepo:
      repository: https://github.com/luksa/kubia-website-example.git
      revision: master
      directory: .
```

### hostPath
&emsp;&emsp;大多数 Pod 应该忽略它们所在的主机节点，因此不应该访问节点文件系统上的任何文件。但是某些系统级别的 Pod（通常由 DaemonSet 管理）确实需要读取节点的文件或使用节点文件系统来访问节点设备。Kubernetes 通过 hostPath 卷实现了这一点。

&emsp;&emsp;hostPath 卷指向节点文件系统上的特定文件或目录。hostPath 卷在 Pod 被删除时，里面的内容不会被删除。

### nfs
&emsp;&emsp;在自建服务器上，可以搭建一个 NFS 服务器用于文件共享。

```yaml
  volumes:
  - name: data
    nfs:
      server: 1.2.3.4
      path: /some/path
```

## 存储技术解耦
&emsp;&emsp;在上述的卷声明的过程中，都要求 Pod 的开发人员了解集群中可用的真实网络存储的基础结构。例如，要创建支持 NFS 协议的卷，开发人员必须知道 NFS 节点所在的实际服务器。

&emsp;&emsp;理想情况是，在 Kubernetes 上部署应用程序的开发人员不需要知道底层使用的是哪种存储技术，同理他们也不需要了解应该使用哪些类型的物理服务器来运行 Pod，与基础设施相关的交互是集群管理员独有的控制领域。

&emsp;&emsp;持久卷的声明过如下:

1. 集群管理员创建某类型的网络存储（NSF 接口或者类似的）
2. 然后管理员通过向 Kubernetes API 传递 PV 申明来创建持久卷（PV）
3. 用户创建一个持久卷声明（PVC）
4. Kubernetes 找到一个具有足够容量的 PV，将其置于访问模式，并将 PVC 绑定到 PV
5. 用户创建一个 Pod 并通过卷配置来引用 PVC

### 声明持久卷（PV）

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mongodb-pv
spec:
  capacity:
    storage: 1Gi
  accessModes:
  - ReadWriteOnce
  - ReadOnlyMany
  persistentVolumeReclaimPolicy: Retain
  gcePersistentDisk:
    pdName: mongodb
    fsType: ext4
```

```bash
$ kubectl get pv
NAME         CAPACITY    ACCESSMODES    STATUS    CLAIM
mongodb-pv   1Gi         RWO,ROX        Bound     default/mongodb-pv
```

### 通过创建持久卷声明（PVC）来获取持久卷

```yaml
apiVersion: v1
kind: PersistentVolumeClain
metadata:
  name: mongodb-pvc
spec:
  resources:
    requrests:
      storage: 1Gi       # 申请 1GiB 的存储空间
  accessModes:           # 允许单个客户端访问（同时支持读取和写入操作） 
  - ReadWriteOnce
  storageClassName: "" 
```

```bash
$ kubectl get pvc
NAME           STATUS     VOLUME        CAPACITY    ACCESSMODES    AGE
mongodb-pvc    Bound      mongodb-pv    1Gi         RWO,ROX        3s
```

PVC 状态显示已与持久卷的 mongodb-pv 绑定。访问模式的简写:

- RWO: ReadWriteOnce，仅允许单个节点挂载读写；
- ROX: ReadOnlyMany，允许多个节点挂载只读；
- RWX: ReadWriteMany，允许多个节点挂载读写这个卷。

### 在 Pod 中使用持久卷

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mongodb
spec:
  containers:
  - image: mongo
    name: mongodb
    volumeMounts:
    - name: mongodb-data
      mountPath: /data/db
    ports:
    - containerPort: 127.0.0.1
      protocol: TCP
  volumes:
  - name: mongodb-data
    persistentvolumeClaim:
      claimName: mongodb-pvc
```

```bash
$ kubectl exec -it mongodb mongo
MongoDb shell version: 3.2.8
connecting to: mongodb://127.0.0.1:27017
Welcome to the MongoDB shell.
```

&emsp;&emsp;下图展示了 Pod 可以直接使用，或者通过持久卷和持久卷声明，这两种方式使用 GCE 持久磁盘。

![](./assets/volumn-pvc.svg)

### 通过 StorageClass 资源定义可用存储类型

```
storageclass-fast-hostpath.yaml 
```