# 计算资源管理
## 概述
&emsp;&emsp;在创建 Pod 时，可以指定容器对 CPU 和内存的资源请求量（即 requests），以及资源限制量（即 limits）。这两个参数不在 Pod 的定义里，而是针对每个容器单独指定。Pod 对资源的请求量和限制量是它所包含的所有容器的请求量和限制量的总和。

## 资源请求量
&emsp;&emsp;调度器在调度 Pod 是否适合调度到某个节点时，只通过 Pod 的申请总量进行判断，而不根据节点当前实际使用量进行判断。调度器首先排除那些不满足需求的节点，然后根据预先配置的优先级函数对其余节点进行排序。

&emsp;&emsp;CPU requests 不仅仅在调度时起作用，它还决定着剩余（未使用）的 CPU 时间如何在 Pod 之间分配。如果两个 Pod 都全力使用 CPU（未指定 limits 下），那么会根据 Pod 的 rquests 时间比例分配 CPU 时间。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: requests-pod
spec:
  containers:
  - image: busybox
    command: ["dd", "if=/dev/zero", "of=/dev/null"]
    name: main
    resources:
      requests:
        cpu: 200m       # 申请 200 毫秒（即一个 CPU 核心时间的 1/5）
        memory: 10Mi    # 申请 10MB 内存
```

## 资源限制量
&emsp;&emsp;Pod 的容器资源申请量（requests）保证了每个容器能够获得它所需要资源的最小量，还可以通过资源限制量（limits）来限制容器可以消耗资源的最大量。CPU 是一种可压缩资源，意味着我们可以在不对容器内运行的进程产生不利影响的同时，对其使用量进行限制。而内存是不一种不可压缩资源，一但系统为进程分配了一块内存，这块内存在进程主动释放之前将无法被回收，单个故障 Pod 或恶意 Pod 可以导致整个节点不可用。因此我们需要限制容器的最大内存分配量。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: requests-pod
spec:
  containers:
  - image: busybox
    command: ["dd", "if=/dev/zero", "of=/dev/null"]
    name: main
    resources:
      limits:
        cpu: 1          # 这个容器允许最大使用 1 核 CPU
        memory: 20Mi    # 这个容器允许最大使用 20MB 内存
```

&emsp;&emsp;需要注意的是，limits 是不受节点可分配资源量的约束的，所有 limits 的总和允许超过节点资源总量的 100%。如果节点资源使用量超过 100%，一些容器将被杀掉。

&emsp;&emsp;当容器内运行的进程尝试使用比限额更多的资源时会被 Kubernetes 杀掉（OOMKilled）。如果 Pod 的重启策略为 Always 或 OnFailure，进程将会立即重启，因此用户可能根本察觉不到它被杀掉。但是如果它继续超限并被杀死，Kubernetes 会再次尝试重启，并开始培加下次重启的间隔时间。这种情况下用户会看到 Pod 处理 CrashLoopBackOff 状态。

```bash
# 查看 Pod 状态
$ kubectl get po
NAME         READY    STATUS              RESTARTS     AGE
memoryhog    0/1      CrashLoopBackOff    3            1m

# 查看 Pod Crash 原因
$ kubectl describe pod
Name:       memoryhog
...
Containers:
  main:
    ...
    State:            Terminated
      Reason:         OOMKilled                         # 当前容器因为 OOM 被杀死
      Exit Code:      137
      Started:        Tue, 27 Dec 2016 14:55:53 +0100
      Finished:       Tue, 27 Dec 2016 14:55:58 +0100
    Last State:       Terminated
      Reason:         OOMKilled                         # 上一个容器同样因为 OOM 被杀死
      Exit Code:      137
      Started:        Tue, 27 Dec 2016 14:55:37 +0100
      Finished:       Tue, 27 Dec 2016 14:55:50 +0100
    Ready:            False
...
```

&emsp;&emsp;在容器内看到的始终是节点的内存，而不是容器本身的内存。对于 Java 程序来说，这是很大的问题，尤其是不使用 -Xmx 选项指定虚拟机的最大堆大小时，JVM 会将其设置为主机总物量内存的百分值，因此 JVM 可以会迅速超过预先配置的内存限额，然后被 OOM 杀死。同样的，容器内可以看到节点所有的 CPU 核。一些程序通过查询系统 CPU 核数来决定启动工作线程数的数量，这将让程序快速启动大量线程，所有线程都会争夺（可能极其）有限的 CPU 时间。

&emsp;&emsp;因此不要依赖应用程序从系统获取的 CPU 数量，你可能需要使用 Downward API 将 CPU 限额传递到容器并使用这个值。

&emsp;&emsp;需要注意，如果只设置了 limits，但是没有设置 requests，那么 requests 默认与 limits 相同。

## QoS
&emsp;&emsp;如果出现资源不足时，Kubernetes 无法自己做出正确决策去杀掉哪个容器去释放资源，因此就需要一种方式让我们可以指定哪种 Pod 在该场景中优先级更高。Kubernetes 将 Pod 划分为 3 种 QoS 等级：

- BestEffort: 优先级最低
- Burstable
- Guaranteed: 优先级最高

&emsp;&emsp;QoS 等级不能直接设置，Kuberentes 会根据 Pod 所包含的容器的资源 requests 和 limits 配置分配对应等级。

- BestEffort: 分配给那些没有为任何容器设置任何 requests 和 limits 的 Pod。在这个等级运行的容器没有任何资源保证。在最坏情况下，它们分不到任何 CPU 时间，同时在需要为其他 Pod 释放内存时，这些容器会第一批被杀死。不过因为 BestEffort 没有配置内存 limits，当有充足的可用内存时，这些容器可以使用任意多的内存。
- Guaranteed: 分配给那些所有资源 requests 和 limits 相等的 Pod。这些 Pod 的容器可以使用它所申请的等额资源，但是无法消耗更多的资源。对于一个 Guaranteed 级别的 Pod，需要满足以下条件
  - CPU 和内存都要设置 requests 和 limits
  - 每个容器都需要设置资源量
  - 它们必须相等（每个容器的每种资源的 requests 和 limits 必须相等）
- Burstable: 介于 BestEffort 和 Guaranteed 之间，其它所有的 Pod 都属于这个等级。Burstable 等级的 Pod 可以获得它们所申请的等额资源，并可以使用额外的资源（不超过 limits）。

![](./assets/qos.svg)

&emsp;&emsp;以上是容器的 QoS 等级关系。而 Pod 的 QoS 等级与容器的 QoS 等级有关。如果至少有一个容器的 QoS 等级与其他不同，无论这个容器是什么等级，这个 Pod 的 QoS 等级都是 Burstable 等级。下表展示了 Pod 的 QoS 等级与其中两个容器的 QoS 等级之间的对应关系。


| 容器 1 的 QoS 等级<img width=320/> | 容器 2 的 QoS 等级<img width=320/> | Pod 的 QoS 等级<img width=320/> |
|--------------------|--------------------|-----------------|
| BestEffort         | BestEffort         | BestEffort      |
| BestEffort         | Burstable          | Burstable       |
| BestEffort         | Guaranteed         | Burstable       |
| Burstable          | Burstable          | Burstable       |
| Burstable          | Guaranteed         | Burstable       |
| Guaranteed         | Guaranteed         | Guaranteed      |


&emsp;&emsp;BestEffort 等级的 Pod 首先被杀掉，其余是 Burstable Pod，最后是 Guarranted。Guaranteed Pod 只有在系统进程需要内存时才会被杀掉。

&emsp;&emsp;如果所有 Pod 的 QoS 等级相同，则通过 OutOfMemory 分数的值决定杀死哪个进程。OOM 分数由两个参数计算得出：进程已消耗内存占可用内存的百分比，与一个基于 Pod QoS 等级和容器内存申请量固定的 OOM 分数调节因子。对于两个 Burstable 等级单容器 Pod，系统会杀掉内存实际使用量占内存申请量比例更高的 Pod。

## LimitRange
&emsp;&emsp;用户可以通过创建一个 LimitRange 资源来避免必须配置每个容器。LimitRange 资源不仅允许用户（为每个命名空间）指定能给容器配置的每种资源的最小和最大限额，还支持在没有显示指定资源 requests 时为容器设置默认值。

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: example
spec:
  limits:
  - type: Pod                      # 指定整个 Pod 的资源 limits
    min:                           # Pod 中所有的容器的 CPU 和内存的请求量之和的最小值
      cpu: 50m
      memory: 5Mi
    max:                           # Pod 中所有容器的 CPU 和内存请求量之和的最大值
      cpu: 1
      memory: 1Gi
  - type: Container
    defaultRequest:                # 容器没有指定 CPU 或内存请求量（requests）时的默认值
      cpu: 100m
      memory: 10Mi
    default:                       # 容器没有指定 CPU 或内存限制量（limits）时的默认值
      cpu: 200m
      memory: 10Mi
    min:                           # 容器的 CPU 和内存的资源 request 和 limits 的最小值
      cpu: 50m
      memory: 5Mi
    max:                           # 容器的 CPU 和内存的资源 request 和 limits 最大值
      cpu: 1
      memory: 1Gi
    maxLimitRequestRatio:          # 每种资源 requests 与 limits 的最大比值
      cpu: 4
      memory: 10
  - type: PersistentVolumeClaim    # 指定请求 PVC 存储容量的最小值和最大值
    min:
      storage: 1Gi
    max:
      storage: 10Gi
```

&emsp;&emsp;LimitRange 插件会对 Pod 的 spec 进行校验，如果校验失败，将直接拒绝。因此 LimitRange 对象的一个广泛应用场景就是阻止用户创建大于单个节点资源量的 Pod。如果没有 LimitRange，API 服务器将欣然接收 Pod 的创建请求，但是永远无法法调度成功。

```bash
# 创建一个超过 LimitRange 限制的 Pod
$ kubectl create -f limits-pod-too-big.yaml
Error from server (Forbidden): error when creating "limits-pod-too-bing.yaml"
pods "too-big" is forbiddend: [
    maximum cpu usage per Pod is 1, but request is 2.,
    maximum cpu usage per Container is 1, but request is 2.
]
```

## ResourceQuota
&emsp;&emsp;LimitRange 只应用于单个 Pod，可以用 ResourceQuota 资源来控制命名空间中所有 Pod 允许使用的 CPU 和内存总量。

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cpu-and-mem
spec:
  hard:
    requests.cpu: 400m
    requests.memory: 200Mi
    requests.storage: 500Gi        # 可声明存储总量
    ssd.storageclass.storage.k8s.io/request.storage: 300Gi     # StorageClass ssd 的可申请的存储量
    standard.storageclass.storage.k8s.io/request.storage: 1Ti
    limits.cpu: 600m
    limits.memory: 500Mi
```

&emsp;&emsp;用图来表示的话，ResourceQuota 对象应用于它所创建的那个命名空间下所有 Pod 资源的 requests 和 limits 总量，而 ResourceLimit 是限制 Pod 的资源总量。

![](./assets/resource-quota.svg)

&emsp;&emsp;可以通过命令查看当前 ResourceQuota 资源用量情况。

```bash
# 查看 quota 配额
$ kubectl describe quota
Name:           cpu-and-mem
Namespace:      default
Resource         Used   Hard
---------        ----   ----
limits.cpu       200m   600m
limits.memory    100Mi  500Mi
requests.cpu     100m   400m
requests.memory  10Mi   200Mi
```

&emsp;&emsp;需要注意的是，创建 ResourceQuota 资源时，需要同时创建 LimitRange。如果只创建了 ResourceQuota 但是没有创建 LimitRange 的话，那些没有限制资源的 Pod 将无法成功创建。

&emsp;&emsp;除了可以限制 CPU、内存资源总量，还可以限制持外化、可创建对象的个数。

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: other
spec:
  hard:
    requests.storage: 500Gi        # 可声明存储总量
    ssd.storageclass.storage.k8s.io/request.storage: 300Gi     # StorageClass ssd 的可申请的存储量
    standard.storageclass.storage.k8s.io/request.storage: 1Ti
    pods: 10                       # 最多创建 10 个 Pod
    replicationcontrollers: 5      # 最多创建 5 个 Replication Controller
    secrets: 10
    configmaps: 10
    persistentvolumeclaims: 4
    services: 5                    # 最多创建 5 个 Service，其中最多 1 个 LoadBalancer 类型和 2 个 NodePort 类型
    services.loadbalancers: 1
    services.nodeports: 2
    ssd.storageclass.storage.k8s.io/persistentvolumeclaims: 2  # 最多声明 2 个 StorageClass 为 ssd 的 PVC
```

## 监控 Pod 的资源使用量
&emsp;&emsp;待补充