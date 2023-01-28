# Deployment
## 概述
&emsp;&emsp;Deployment 是基于 ReplicaSet 的资源，支持声明式地更新应用程序。Deployment 是一种更高阶资源，用于ukbl者应用程序并以声明的方式升级应用，而不是通过 ReplicationController 或 ReplicaSet 进行部署。

&emsp;&emsp;使用 Deployment 可以更容易地更新应用程序，因为可以直接定义单个 Deployment 资源所需达到的状态，并让 Kubernetes 处理中间的状态。

## 声明

```yaml
apiVersion: apps:v1
kind: Deployment
metadata:
  name: kubia
spec:
  replicas: 3
  template:
    metadata:
      name: kubia
      labels:
        app: kubia
    spec:
      containers:
      - image: luksa/kubia:v1
        name: nodejs
```

```bash
# 创建一个 Deployment 资源
$ kubectl create -f kubia-deployment-v1.yaml --record

# 展示 Deployment 滚动过程中的状态
$ kubectl rollout status deployment kubia
deployment kubia successfully rolled out

# 获取 replica set 列表
$ kubectl get replicasets
NAME                 DESIRED    CURRENT    AGE
kubia-11506449497    3          3          10s

# 获取 pod 列表
$ kubectl get po
NAME                      READY     STATUS    RESTARTS   AGE
kubia-1506449474-otnnh    1/1       Running   0          18s
kubia-1506449474-vmn7x    1/1       Running   0          18s
kubia-1506449474-xis6m    1/1       Running   0          18s
```

> 注意，创建时使用了 `--record` 选项，这个选项会记录历史版本号，在之后的操作中非常有用。

&emsp;&emsp;通过 ReplicaSet 创建 Pod 时，他们的名称是由 ReplicaSet 的名称加上一个运行时生成的随机字符串组成。现在由 Deployment 创建的三个 Pod 名称中均包含一个额外的数字，这个数字实际上是对应 Deployment 中的 Pod 模板的哈希值。

## 升级
&emsp;&emsp;升级时，只需要修改 Deployment 资源中定义的 Pod 模板，Kubernetes 会自动将实际的系统状态收敛为资源中定义的状态，匹配期望的状态。如何达到新的系统状态的过程是由 Deployment 的升级策略决定的，默认策略是执行滚动升级（策略名为 RollingUpdate），另一种是 Recreate 策略，两种策略的区别如下:

- RollingUpdate 策略会渐进地删除旧的 Pod，与此同时创建新的 Pod，使应用程序在整个升级过程中都处于可用状态，并确保其处理请求的能力没有因为升级而有所影响。升级过程中的 Pod 数量可以在期望副本数的一定区间内浮动。如果应用能够支持多个版本同时对外提供服务，则推荐使用这个策略来升级应用。
- Recreate 策略会一次性删除所有旧版本的 Pod 之后，创建新的 Pod，整个行为类似于修改 ReplicationSet 的 Pod 模板，然后删除所有的 Pod。如果你的应用程序不支持多个版本同时对外提供服务，需要在启动新版本之前完全停用旧版本，那么需要使用这种策略。但是使用这种策略的话，会导致应用程序出现短暂的不可用。

```yaml
apiVersion: apps:v1
kind: Deployment
metadata:
  name: kubia
spec:
  replicas: 3
  minReadySeconds: 10             # 指定新创建的 Pod 在创建成功运行多久之后，才会继续创建下一个 Pod。
  strategy:                       # 配置升级策略
    type: RollingUpdate           # 指定升级方式
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0           # 设置为 0，确保升级过程中 Pod 是被挨个替换的
  template:
    metadata:
      name: kubia
      labels:
        app: kubia
    spec:
      containers:
      - image: luksa/kubia:v2    # 修改镜像版本为 v2
        name: nodejs
```

> - strategy.rollingUpdate.maxSurge: 决定了 Deployment 配置中期望的副本数之外，最多允许超出的 Pod 实例的数量。默认值为 25%，所以 Pod 实例最多可以比期望数量多 25%。如果期望副本数被设置为 4，那么在滚动升级期间，不会运行超过 5 个 Pod 实例。当把百分数转换成绝对值时，会将数字四舍五入。
> - strategy.rollingUpdate.maxUnavailable: 决定了在滚动升级期间，相对于期望副本数能够允许多少 Pod 实例处理不可用状态。默认值 25%，所以可用 Pod 实例的数量不能低于期望副本数的 75%。百分数转换成绝对值时会四舍五入。如果期望副本数设置为 4，并且百分比为 25%，那么只能有一个 Pod 处于不可用状态，在整个发布过程中，总是保持至少有三个 Pod 实例处理可用状态来提供服务。

```bash
# 应用 Deployment 新的修改
$ kubectl apply -f kubia-deployment-v2.yaml

# 获取 ReplicaSet 信息
$ kubectl get rs
NAME                DESIRED    CURRENT    AGE
kubia-1506449474    0          0          24m
kubia-1581357123    3          3          23m
```

## 回滚
&emsp;&emsp;Deployment 在完成升级之后，原来的 ReplicaSet 并没有删除，通过 Kubernetes 可以取消最后一次部署的 Deployment。

```bash
# 快速回滚 kubia
$ kubectl rollout undo deployment kubia
deployment "kubia" rolled back

# 显示 Deployment 的滚动升级历史
# 注意，CHANG_CAUSE 只有在创建时带有 --record 参数时才会记录
$ kubectl rollout history deployment kubia
deployments "kubia"
REVISION    CHANGE-CAUSE
2           kubectl set image deployment kubia nodejs=luksa/kubia:v2
3           kubectl set image deployment kubia nodejs=luksa/kubia:v3

# 回滚到特定的 Deployment 版本
$ kubectl rollout undo deployment kubia --to-revision=1
```

## 配合就绪探针阻止出错版本的滚动升级
&emsp;&emsp;在 Deployment 中设置 minReadySeconds 属性，除了可以减慢滚动升级速率，更重要的功能是避免部团出错版本的应用。

&emsp;&emsp;minReadySeconds 属性指定新创建的 Pod 至少要成功运行多久之后，才能将其视为可用。在 Pod 可用之前，滚动升级的过程不会继续。

```yaml
apiVersion: apps:v1
kind: Deployment
metadata:
  name: kubia
spec:
  replicas: 3
  minReadySeconds: 10             # 指定新创建的 Pod 在创建成功运行多久之后，才会继续创建下一个 Pod。
  strategy:                       # 配置升级策略
    type: RollingUpdate           # 指定升级方式
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0           # 设置为 0，确保升级过程中 Pod 是被挨个替换的
  template:
    metadata:
      name: kubia
      labels:
        app: kubia
    spec:
      containers:
      - image: luksa/kubia:v3
        name: nodejs
        readinessProbe:
          periodSeconds: 1        # 定义一个就绪探针，并每隔一秒钟执行一次
          httpGet:
            path: /
            port: 8080
```

```bash
# 升级 Deployment
$ kubectl apply -f kubia-deployment-v3-with-readinesscheck.yaml
```

&emsp;&emsp;隔一段时间后，可以看到请求并没有切换到 v3 的 Pod.

```bash
$ kube get po
NAME                       READY    STATUS     RESTARTS
kubia-11163142519-7ws0i    0/1      Running    0
kubia-17665119474-jvslk    1/1      Running    0
kubia-17665119474-pmb26    1/1      Running    0
kubia-17665119474-xk5g3    1/1      Running    0
```

&emsp;&emsp;这是由于就绪探针一直失败，因此该 Pod 会从 Service 的 Endpoint 中移除，因此请求无法到达新的服务。rollout status 命令显示只有一个新副本启动，之后滚动升级过程没有再继续下去，因为新的 Pod 一直处理不可用状态。即使变为就绪状态之后，也至少需要保持 10 秒，才是真正可用的。在这之前，滚动升级过程将不再创建任何新的 Pod，因为当前 maxUnavailable 属性设置为 0，所以也不会删除任何原始的 Pod。

&emsp;&emsp;默认情况下，在 10 分钟内不能完成滚动升级的话，将被视为失败。如果运行 `kubectl describe deploy kubia` 命令，将会显示一条 ProgressDeadline-Exceeded 的记录。因为滚动过程不再继续，所以只能通过 rollout undo 命令来取消滚动升级。

```bash
$ kubectl rollout undo deployment kubia
deployment "kubia" rolled back
```