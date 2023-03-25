# 数据存储
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

&emsp;&emsp;一般情况下，Kubernetes 会在 Pod 所在的节点的磁盘上创建 emptyDir 卷，因此其性能取决于节点的磁盘类型。我们也可以通知 Kubernetes 在 tmfs 文件系统（使用内存而非硬盘）上创建 emptyDir。

```yaml
  volumes:
  - name: html
    emptyDir:
      medium: Memory
```

### gitRepo
&emsp;&emsp;gitRepo 基本上也是一个 emptyDir 卷，它通过克隆 Git 仓库并在 Pod 启动时检出特定版本来填充数据。

::: warning 注意
&emsp;&emsp;在创建 gitRepo 卷后，它并不能和对应的 repo 保持同步。删除 Pod 重新创建的 Pod 将包含最新的提交。如果需要保持卷的内容是最新的，需要通过另一个容器去控制。
:::

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
&emsp;&emsp;大多数 Pod 应该忽略它们所在的主机节点，因此不应该访问节点文件系统上的任何文件。但是某些系统级别的 Pod（通常由 DaemonSet 管理）确实需要读取节点的文件或使用节点文件系统来访问节点设备。Kubernetes 通过 HostPath 卷实现了这一点。

&emsp;&emsp;HostPath 卷指向节点文件系统上的特定文件或目录。hostPath 卷在 Pod 被删除时，里面的内容不会被删除。

::: tip 提示
&emsp;&emsp;在一些场景下，会将数据库也部署到 Kubernetes 里，为了提升数据库性能，可能会将数据库 Pod 调度到固定节点，使用 hostPath 卷来提升数据库的读写性能。
:::

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mysql
spec:
  containers:
    - image: mysql:8.0.33
      name: mysql
      volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
      ports:
        - containerPort: 3306
          protocol: TCP
  volumes:
    - name: mysql-data
      hostPath:
        path: /data/mysql
        type: DirectoryOrCreate
```

&emsp;&emsp;在配置 HostPath 时，type 参数用于表达不同的挂载类型，常用的 type 值如下：

- 空字符串：默认选项，意味着挂载 HostPath 卷之前不会执行任何检查。
- DirectoryOrCreate：如果给定路径的目录不存在，那么将根据需要创建一个权限为 0755 的空目录，和 Kubelet 具有相同的组和权限。
- Directory：目录必须存在于给定的路径下。
- FileOrCreate：如果给定路径的文件不存在，那么将根据需要创建一个权限为 0644 的空文件，和 Kubelet 具有相同的组和权限。
- File：文件必须存在于给定的路径下。
- Socket：UNIX 套接字，必须存在于给定路径中。
- CharDevice：字符设备，必须存在于给定路径中。
- BlockDevice：块设备，必须存在于给定路径中。

### nfs
&emsp;&emsp;在非生产集群上，可以搭建一个 NFS 服务器用于文件共享。但在生产环境上，一般不建议使用 NFS 作为后端存储，因为 NFS 存在单点故障，并且存在很大的性能瓶颈。

&emsp;&emsp;在挂载 NFS 卷前，可以先检查服务器的 NFS 服务器是否正常。

```bash
# 检测 NFS 服务器是否正常，以及获取挂载点
$ showmount -e 10.10.20.1
Export list for 10.10.20.1:
/home/data 10.10.0.1/16
```

::: tip 提示
&emsp;&emsp;可以参考初始化存储节点[[链接](/blogs/k8s/setup/storage)]文档来初始化 NFS 存储服务器。
:::

&emsp;&emsp;在声明 Pod 时，就可以直接使用 NFS 卷来保存数据了。

```yaml
  # 声明 nfs 卷
  volumes:
  - name: data
    nfs:
      server: 10.10.20.1
      path: /home/data
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

### 持久卷（PV）
&emsp;&emsp;集群管理员提前创建 PV，用于解决对存储概念不是很了解的技术人员对存储的需求。和单独配置 Volume 类似，PV 也可以使用 NFS、HostPath 等常用的存储后端，并且可以提供更加高级的配置，比如访问模式、空间大小以及回收策略等。目前 PV 的提供方式有两种：

- 静态 PV：由管理员提前手动创建，手动或自动（需 Volume 插件支持）回收。
- 动态 PV：由 StorageClass 提供，根据 PVC 动态生成 PV 并绑定 PVC，由 StorageClass 根据配置自动管理 PV 的回收策略。

```yaml
# 基于 NFS 的 PV
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 1Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
    - ReadOnlyMany
  persistentVolumeReclaimPolicy: Recycle
  storageClassName: nfs-slow
  nfs:
    path: /home/data
    server: 10.10.20.1
---
# 基于 HostPath 的 PV
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ssd-pv
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /data/mysql
```

&emsp;&emsp;配置参数说明：

- capacity：容量
- volumeMode：卷的模式，目前支持 Filesystem（文件系统）和 Block（块），其中 Block 类型需要后端存储支持，默认为文件系统。
- accessModes：PV 的访问模式
  - ReadWriteOnce：可以被单节点以读写模式挂载，命令行中被缩写为 RWO
  - ReadOnlyMany：可以被多个节点以只读模式挂载，命令行中被缩写为 ROX
  - ReadWriteMany：可以被多个节点以读写模式挂载，命令行中被缩写为 RWX
  - ReadWriteOncePod：只能被一个 Pod 以读写的模式挂载，命令中可以被缩写为 RWOP
- persistentVolumeReclaimPolicy：PV 回收策略
  - Retain：保留，该策略允许 Kubernetes 管理员手动回收资源。当删除 PVC 时，PV 仍然存在，Volume 被视为已释放，管理员可以手动回收卷（删除 PV 并重新声明资源）。注意，该 PV 无法再次使用，如果此时有新的 PVC，该 PVC 将一直处于 Pending 状态。
  - Recycle：回收，如果 Volume 插件支持，Recycle 策略会对卷执行 `rm -rf` 清理该 PV，并使其可以用于下一个新的 PVC，但是本策略将来会被弃用，目前只有 NFS 和 HostPath 支持该策略。
  - Delete：删除，如果 Volume 插件支持，删除 PVC 时会同时删除 PV，动态卷默认为 Delete。
- storageClassName：PV 的类，一个特定类型的 PV 只能绑定到特定类别的 PVC
- nfs：NFS 服务配置。不同的 StorageClass 有不同的选项。
  - path：NFS 服务器上的共享目录
  - server：NFS 服务器 IP 地址

&emsp;&emsp;通过以下命令查看已创建的 PV 的状态。

```bash
$ kubectl get pv
NAME     CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS   REASON   AGE
nfs-pv   10Gi       RWO,ROX        Recycle          Available           nfs-slow                24s
ssd-pv   10Gi       RWO            Retain           Available           manual                  24s
```

&emsp;&emsp;其中 STATUS 表示当前 PV 的状态，状态包括以下：

- Available：可用，没有被 PVC 绑定的空闲资源
- Bound：已绑定，已经被 PVC 绑定
- Released：已释放，PVC 被删除，但是资源还未被重新使用
- Failed：失败，自动回收失败

### 持久卷声明（PVC）
&emsp;&emsp;Kubernetes 管理员提前创建了 PV 之后，用户就可以通过 PersistentVolumeClaim（PVC）来使用 PV 了。PVC 是其他技术人员在 Kubernetes 上对存储的申请，它可以标明一个程序需要用到什么样的后端存储、多大的空间以及以什么访问模式进行挂载。

&emsp;&emsp;在实际使用时，虽然用户通过 PVC 获取存储支持，但是用户可能需要具有不同性质的 PV 来解决不同的问题，比如使用 SSD 硬盘来提高性能。所以集群管理员需要根据不同的存储后端来提供各种 PV，而不仅仅是大小和访问模式的区别，并且无须让用户了解这些卷的具体实现方式和存储类型，达到了存储的解藕，降低了存储使用的复杂度。

&emsp;&emsp;在上面，我们声明了 ssd-pv，此时可以创建一个 PVC 即可与其绑定。

::: warning 注意
&emsp;&emsp;PV 和 PVC 绑定时，需要 StorageClassName 相同且其它参数一致才可以进行绑定。
:::

```yaml
apiVersion: v1
kind: PersistentVolumeClain
metadata:
  name: mysql-pvc
spec:
  resources:
    requrests:
      storage: 3Gi           # 申请 3GB 的存储空间
  accessModes:               # 允许单个客户端访问（同时支持读取和写入操作） 
    - ReadWriteOnce
  storageClassName: "manual" 
```

&emsp;&emsp;通过以下命令查看 PV、PVC 的状态。

```bash
$ kubectl get pvc
NAME        STATUS   VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
mysql-pvc   Bound    ssd-pv   10Gi       RWO            manual         7s

$ kubectl get pv
NAME     CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM            STORAGECLASS   REASON   AGE
nfs-pv   10Gi       RWO,ROX        Recycle          Available                    nfs-slow                3m21s
ssd-pv   10Gi       RWO            Retain           Bound       prod/mysql-pvc   manual                  3m21s
```

&emsp;&emsp;PV 和 PVC 状态显示，mysql-pvc 和 ssd-pv 已经绑定。

### 使用持久卷
&emsp;&emsp;PVC 与 PV 绑定后，就可以在 Pod 中使用该 PVC 了。在卷声明中，可以直接通过名称引用 PVC。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mysql
spec:
  containers:
  - image: mysql:8.0.33
    name: mysql
    ports:
      - name: socket
        containerPort: 3306
        protocol: TCP
    env:
      - name: MYSQL_ROOT_PASSWORD
        value: root
    volumeMounts:
      - name: mysql-data
        mountPath: /var/lib/mysql
  volumes:
    - name: mysql-data
      # 通过名称引用 PVC
      persistentVolumeClaim:
        claimName: mysql-pvc
```


&emsp;&emsp;下图展示了 Pod 直接使用，或者通过持久卷和持久卷声明使用 HostPath 持久卷的逻辑。

![](./assets/volumn-pvc.svg)

&emsp;&emsp;使用 PV 和 PVC 这种方式从基础设施获取存储，对于应用程序开发人员（或者集群用户）来说更加简单，这是因为研发人员不需要关心底层实际使用的存储技术。

### 动态持久卷
&emsp;&emsp;静态持久卷的管理过程，需要 Kubernetes 管理员事先声明 PV 之后，才能让 PVC 和 Pod 使用。当公司的 Kubernetes 集群很多，并且使用它们的技术人员过多时，对于 PV 的创建是一个很耗时、耗力的工作，并且达到一定规模后，过多的 PV 将难以维护。因此 Kubernetes 设计了 StorageClass 来动态管理集群中的 PV，这样 Kubernetes 管理员就无须浪费大量时间在 PV 的管理中。

&emsp;&emsp;Kubernetes 管理员可以只创建 StorageClass 链接到不同的存储，如 Ceph、NFS、公有云提供的存储等，之后有存储需求的技术人员创建 PVC 指向这些 StorageClass 即可。StorageClass 会自动创建 PV 供 Pod 使用，也可以使用 StatefulSet 的 volumeClaimTemplate 自动分别为每一个 Pod 申请一个 PVC。

&emsp;&emsp;定义一个 StorageClass 需要包含 provisioner、parameters 和 reclaimPolicy 字段，这些字段会在 StorageClass 需要动态制备 PV 时使用。其中制备器（Provisioner）[[链接](https://kubernetes.io/zh-cn/docs/concepts/storage/storage-classes/#provisioner)]用于决定使用哪个卷插件来制备 PV。

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
reclaimPolicy: Retain
allowVolumeExpansion: true
mountOptions:
  - debug
volumeBindingMode: Immediate
```

&emsp;&emsp;在 Kubernetes in Setup 的初始化存储节点章节中，我们已经通过 Helm 初始化了 NFS StorageClass，那么我们就可以直接使用 PVC 指定该 StorageClass 来动态制备 PV 了。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nginx-logs-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: nfs
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps:/v1
kind: Deployment
metadta:
  name: front-end
spec:
  template:
    spec:
      containers:
        - name: front-end
          image: nginx:1.24.0
          volumeMounts:
            - name: logs
              mountPath: /var/log/nginx
      volumes:
        - name: logs
          persistentVolumeClaim:
            claimName: nginx-logs-pvc
```

&emsp;&emsp;声明 PVC 之后，我们再来查看一下 PV 和 PVC 的状态。

```bash
# 获取 PVC 状态，发现该 PVC 已经处理绑定状态了
$ kubectl get pvc     
NAME             STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
nginx-logs-pvc   Bound    pvc-d330a54b-69e2-43a4-98d9-95fb4c6f35ff   1Gi        RWO            nfs            8s

# 获取 PV 状态，发现已经自动创建了一个 pvc-01f50db3-d28e-467e-881f-09efb4c69a89 持久卷，并且该持久卷的大小于 PVC 是相同的
$ kubectl get pv      
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                 STORAGECLASS   REASON   AGE
pvc-d330a54b-69e2-43a4-98d9-95fb4c6f35ff   1Gi        RWO            Delete           Bound    prod/nginx-logs-pvc   nfs                     12s

# 同时登录 storage.cluster.k8s 服务器，发现在 /home/data 目录下已经创建了一个文件夹
$ ll -h /home/data
总用量 0
drwxrwxrwx 2 root root 41 6月  19 00:09 prod-nginx-logs-pvc-pvc-d330a54b-69e2-43a4-98d9-95fb4c6f35ff
```