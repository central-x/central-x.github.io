# Pod 与集群节点的自动伸缩
## 概述
&emsp;&emsp;我们可以通过调高 ReplicationSet、Deployment 等可伸缩资源的 replicas 字段来手动实现 Pod 中应用的横向扩容。如果负载的变化是长时间内逐淅发生的，手动扩容也可以接受，但指望靠人工干预来处理突发而不可预测的流量增长，仍然不够理想。

&emsp;&emsp;Kuberneters 可以监控你的 Pod，并在检测到 CPU 使用率或其他度量增长时自动对它们扩容。如果 Kubernetes 运行在云端基础架构上，它甚至能在现有节点无法承载更多 Pod 之时自动新建更多节点。

## 横向自动申缩
&emsp;&emsp;横向 Pod 自动伸缩是指由控制器客量的 Pod 的副本数量的自动伸缩。它由 Horizontal 控制器执行，我们通过创建一个 horizontalpodAutoscaler（HPA）资源来启用和配置目标数值所需的副本数量，进而调整目标资源的 replicas 字段。

![](./assets/horizontal-autoscaler.svg)

&emsp;&emsp;自动伸缩的过程可以分为三个步骤：

- 获取被伸缩资源对象所管理的所有 Pod 度量
- 计算使度量数值达到（或接近）所指定目标数值所需的 Pod 数量
- 更新被伸缩资源的 replicas 字段

### 获取 Pod 度量
&emsp;&emsp;Autoscaler 本身不负责采集 Pod 度量数据，而是从另外的来源获取。一但 Autoscaler 获得了它所调整的资源（Deployment、ReplicaSet、StatefulSet）所辖 Pod 的全部度量，它便可以利用这些度量计算出所需的副本数量。它需要计算出一个合适的副本数量，以使所有副本上度量的平均值尽量接近配置的目标值。

![](./assets/autoscaler.svg)

&emsp;&emsp;完成副本数量的计算后，Autoscaler 控制器通过 Scale 子资源来修改被伸缩资源的 replicas 字段。这意味着只要 API 服务器为某个可伸缩资源暴露了 Scale 子资源，Autoscaler 即可操作该资源。目前暴露了 Scale 子资源的资源有：

- Deployment
- ReplicaSet
- ReplicationController
- StatefulSet

### 基于 CPU 使用率进行自动伸缩
&emsp;&emsp;设假你用了几个 Pod 来提供服务，如果它们的 CPU 使用率达到了 100%，显然它们已经找不住压力了，要么进行纵向扩容（scale up）增加它们可用的 CPU 时间，要么进行横向扩容（scale out）增加 Pod 数量，这样平均 CPU wkgq用率就应该下降了。

&emsp;&emsp;因为 CPU 使用通常是不稳定的，比较靠谱的做法是在 CPU 被压垮之前就横向扩容，可能平均负载达到或超过 80% （一定不要超过 90%）的时候就进行扩容。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubia
spec:
  replicas: 3              # 手动设置初始副本数量
  template:
    metadata:
      name: kubia
      labels:
        app: kubia
    spec:
      containers:
      - image: luksa/kubia:v1
        name: nodejs
        resources:         # 确保所创建的 Pod 指定了 CPU 资源请求，这样才有可能实现自动伸缩
          requests:
            cpu: 100m
```

> Autoscaler 通过对比 Pod 的实际 CPU 使用与它请求的 CPU 资源来确认 CPU 使用率。

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kubia-autoscaler
spec:
  minReplicas: 1      # 最小副本数
  maxReplicas: 5      # 最大副本数
  scaleTargetRef:     # 该 Autoscaler 将作用于的目标资源
    apiVersion: v1
    kind: Deployment
    name: kubia
  metrics:            # 每个 Pod 都使用所请求 CPU 的 30%
  - type: Resource
    resources:
      name: cpu
      targetAverageUtilization: 30    # 
```

> &emsp;&emsp;Autoscaler 会持续调整副本的数量以使 CPU 使用率接近 30%，但是它永远不会调整到少于 1 个或多于 5 个。
>
> &emsp;&emsp;另外，一定要确保自动伸缩的目标是 Deployment 而不是底层的 ReplicaSet。这样才能确保预期的副本数量在应用更新后继续保持。
>
> &emsp;&emsp;Autoscaler 在伸缩容时，不是立马生效的，每次扩容操作之间的时间间隔也有限制。目前，只有当 3 分钟内没有任何伸缩操作时才会触发扩容，缩容操作要在 5 分钟内没有任何伸缩操作时才会触发。因此可能会观察到度量数据很明显应该触发伸缩但却没有触发。

```bash
# 获取 Autoscaler 信息
$ kubectl get hpa
NAME                REFERENCE           TARGETS            MINPODS    MAXPODS    REPLICAS
kubia-autoscaler    Deployment/kubia    <unknown> / 30%    1          5          0

# 由于当前运行三个空无一请求的 Pod，它们的 CPU 使用率应该接近 0，预期 Autocaler 将它们收缩到 1 个 Pod。
$ kubectl get deployment
NAME     DESIRED    CURRENT    UP-TO-DATE    AVAILABLE    AGE
kubia    1          1          1             1            23m

# 并行观察多个资源
$ watch -n l kubectl get hpa, deployment
NAME                REFERENCE           TARGETS     MINPODS    MAXPODS    REPLICAS  AGE
kubia-autoscaler    Deployment/kubia    0% / 30%    1          5          0         45m

NAME     DESIRED    CURRENT    UP-TO-DATE    AVAILABLE    AGE
kubia    1          1          1             1            23m
```

### 确定度量
&emsp;&emsp;不是所有度量都适合作为自动伸缩的基础，如通过 Pod 中容器的内存占用并不是自动伸缩的一个好度量。如果增加副本数不能导致被观测度量平均值的线性（或者至少接近线性）下降，那么 autoscaler 就不能正常工作。

### 集群节点的横向伸缩
&emsp;&emsp;HPA 在需要的时候会创建更多的 Pod 实例，但万一所有的节点都满了，放不下更多 Pod 时，就可能要删除一些已有的 Pod 或纵向缩容它们。除了缩容已有的 Pod，还可以通过向集群添加更多节点，提升集群容量来增加资源。如果你的 Kubernetes 集群运行在自建基础架构上，那么得添加一台物理机，并将其加入集群。但如果你的集群运行于云端基础架构之上，就可能做到自动化增加集群节点。

&emsp;&emsp;Kubernetes 支持在需要时立即自动从云服务提供者请求更多节点。该特性由 Cluster Autoscaler 执行。Cluster Autoscaler 负责在在由于节点资源不足而无法调度某 Pod 到已有节点时，自动部署新节点。它也会在节点长时间使用率低下的情况下下线节点。集群自动伸缩在以下云服务提供商可用：

- Google Kubernetes Engine(GKE)
- Google Compute Engine(GCE)
- Amazon Web Services(AWS)
- Microsoft Azure
