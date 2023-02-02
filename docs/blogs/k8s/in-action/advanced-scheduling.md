# 高级调度
## 概述
&emsp;&emsp;Kubernetes 允许你去影响 Pod 被调度到哪个节点。

## 污点和容忍度
&emsp;&emsp;节点污点(Taint)和 Pod 容忍度(Toleration)主要被用于限制哪些 Pod 可以被调度到某个节点。只有当一个 Pod 容忍某个节点的污点，这个 Pod 才能被调度到该节点。在 Kubernetes 上，一个集群的主节点需要设置污点，这样才能保证只有控制面板 Pod 才能部署在主节点上。

```bash
# 显示主节点信息
$ kubectl describe node master.cluster.k8s
Name:               master.cluster.k8s
Roles:              control-plane
Labels:             beta.kubernetes.io/arch=amd64
                    beta.kubernetes.io/os=linux
                    kubernetes.io/arch=amd64
                    kubernetes.io/hostname=master.cluster.k8s
                    kubernetes.io/os=linux
                    node-role.kubernetes.io/control-plane=
                    node.kubernetes.io/exclude-from-external-load-balancers=
Annotations:        flannel.alpha.coreos.com/backend-data: {"VNI":1,"VtepMAC":"d2:d2:f9:79:f5:46"}
                    flannel.alpha.coreos.com/backend-type: vxlan
                    flannel.alpha.coreos.com/kube-subnet-manager: true
                    flannel.alpha.coreos.com/public-ip: 10.10.20.0
                    kubeadm.alpha.kubernetes.io/cri-socket: unix:///var/run/containerd/containerd.sock
                    node.alpha.kubernetes.io/ttl: 0
                    volumes.kubernetes.io/controller-managed-attach-detach: true
CreationTimestamp:  Tue, 16 May 2023 18:51:06 +0800
Taints:             node-role.kubernetes.io/control-plane:NoSchedule
Unschedulable:      false
```

&emsp;&emsp;主节点包含一个污点，污点包含了一个 key、value，以及一个 effect，表现为 `<key>=<value>:<effect>`。上面显示的主节点的污点信息，包含一个为 `node-role.kubernetes.io/control-plane` 的 key，一个空的 value，以及值为 `NoSchedule` 的 effect。这个污点将阻止 Pod 调茺到这个节点上面，除非有 Pod 能容忍这个污点，而通常容忍这个污点的 Pod 都是系统级别的 Pod。

&emsp;&emsp;每个污点都可以关联一个效果，效果包含了以下三种:

- NoSchedule: 表示如果 Pod 没有容忍这些污点，Pod 则不能被调度到包含这些污点的节点上。
- PreferNoSchedule: 是 NoSchedule 的一个宽松的版本，表示尽量阻止 Pod 被调度到这个节点上，但是如果没有其他节点可以调度，Pod 依然会被调度到这个节点上。
- NoExecute: 与 NoSchedule 及 PreferNoSchedule 不同的是，两者只在调度期起作用，而 noExecute 也会影响正在节点上运行着的 Pod。如果一个节点上添加了 NoExecute 污点，那些在该节点上运行着的 Pod 如果没有容忍这个 NoExecute 污点，将会从这个A节点驱除。

### 在节点上添加自定义污点
&emsp;&emsp;假设你有一个单独的 Kubernetes 集群，上面同时有生产环境和非生产环境的流量。其中最重要的一点是，非生产环境的 pod 不能运行在生产环境的节点上。可以通过在生产环境的节点上添加污点来满足这个要求。

```bash
# 给 node1.cluster.k8s 节点添加 key 为 node-type，value 为 production，effect 为 NoSchedule 的污点
# 这样常规的 Pod 将不会被部署到该节点上
$ kubectl taint node node1.cluster.k8s node-type=production:NoSchedule

# 删除污点
$ kubectl taint node node1.cluster.k8s node-type=production:NoSchedule-
```

### 在 Pod 上添加污点容忍度
&emsp;&emsp;为了将生产环境的 Pod 部署到生产环境节点上，Pod 需要能容忍那些你添加在节点上的污点。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prod
spec:
  replicas: 5
  template:
    spec:
      ...
      tolerations:
      - key: node-type       # 此处的污点容忍度允许 Pod 被调度到生产环境节点上
        operator: Euqal
        value: production
        effect: NoSchedule
```

> 注意，上面的配置可以让 Pod 同时被调度到生产节点和非生产节点。如果你不想生产环境的 Pod 被调度到非生产节点上，那么你也需要在非生产环境节点设置污点信息，例如 `node-type=non-production:NoSchedule`，那么生产环境的 Pod 就只会调度到生产环境的节点上了。

## 节点亲缘性
&emsp;&emsp;污点机制可以用来让 Pod 远离特定的节点，而节点亲缘性（node affinity）机制允许你通知 Kubernetes 将 Pod 只调度到某个节点子集上。早期的节点亲缘性是通过 Pod 描述中的 nodeSelector 字段来实现，但是它不能满足你的所有需求，因此一种更强大的机制被引入。

&emsp;&emsp;首先，节点必须加上合适的标签。然后声明 Pod 时，对这些标签声明亲和性。

```yaml
apiVersion: apps/v1
kind: Deployment
metadta:
  name: pref
spec:
  template:
    ...
    spec:
      affinity:
        nodeAffinity: 
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 80                # 节点优先调度到 zone1。这是最重要的偏好
            preference:
              matchExpressions:
              - key: availability-zone
                operator: In
                values:
                - zone1
          - weight: 20                # 同时优先调度 Pod 到独占节点，但是该优先级为 zone 优先级的 1/4
            preference:
              matchExpressions:
              - key: share-type
                operator: In
                values:
                - dedicated
    ...
```

## Pod 亲缘性
&emsp;&emsp;节点亲缘性规则主要影响 Pod 被调度到哪个节点。但是这些规则只影响了 Pod 和节点之间的亲缘性，但是有时候也希望有能力指定 Pod 自身之间的亲缘性。比如你有一个前端 Pod 和一个后端 Pod，将这些节点部署得比较靠近，可能降低延时，提高应用的性能，那么就应该告诉 Kubernetes 将你的 Pod 部署在任何它觉得合适的地方，同时确保 2 个 Pod 是靠近的。这种功能可以通过 Pod 亲缘性来实现。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  labels:
    app=backed
spec:
  template:
    ...
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 5
  template:
    ...
    spec:
      affinity:
        podAffinity:                                        # 定义节点亲比性规则
          requiredDuringSchedulingIgnoredDuringExecution:   # 定义一个强制性要求，而不是偏好
          - topologyKey: kubernetes.io/hostname             # 本次部署的 pod 必须被调度到匹配 Pod 选择器的节点上
            labelSelector:
              matchLabels:
                app: backend

```

> 上面的部署将创建包含强制性要求的 Pod，要求 Pod 将被调度到和其他包含 app=backend 标签的 Pod 所在的相同节点上（通过 topologyKey 字段指定）。

&emsp;&emsp;topologyKey 常见的取值有:

- `kubernetes.io/hostname`：代表节点
- `topology.kubernetes.io/zone`：代表区域
- `topology.kubernetes.io/region`：代表地域


&emsp;&emsp;除了通过 Pod 亲缘性将 Pod 进行协同部署，还可以通过 Pod 非亲比性来让 Pod 远离彼此。它和 Pod 亲缘性的表示方式一样，只不过是将 podAffinity 字段换成 podAntiAffinity，这将导致调度器永远不会选择那些有包含 podAntiAfinity 匹配标签的 Pod 所在的节点。

> Pod 非亲缘性应用场景举例:
>
> - 如果两个集合的 Pod 运行在同一个节点上会影响彼此的性能，在这种情况下，你需要告知调度器永远不要将这些 Pod 部署在同一个节点上。
> - 强制让调度器将同一组的 Pod分在不同可用性区域或者地域，这样让整个区域或地域失效之后，不会使得整个服务完全不可用。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fronted
spec:
  replicas: 5
  template:
    metadata:               # 定义前端 Pod 的标签
      labels:
        app: frontend
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:  # 定义 Pod 非亲缘性强制性要求
          - topologyKey: kubernetes.io/hostname            # 一个前端 Pod 必须不能调度到有 app=frontend 标签的 Pod 运行的节点上
            labelSelector:
              matchLabels:
                app: frontend
    containers:
    ...
```

> &emsp;&emsp;上面定义需要创建 5 个 Pod 实体，但是如果你的节点只有 2 个的话，那么其余 3 个将一直处理 Pending 状态，因为调度器不允许这些 Pod 调度到同一个节点上。在这种情况下，你可能应该制定软性要求（使用 preferredDuringSchedulingIgnoredDuringExecution 字段）。