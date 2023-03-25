# ReplicaSet
## 概述
&emsp;&emsp;Pod 代表了 Kubernetes 中的基本部署单元，但是实际的用例中，我们希望部署能自动保持运行，并且保持健康，无须任何手动干预。要做到这一点，我们几乎不会直接创建 Pod，而是通过创建 ReplicaSet、ReplicationController、Deployment 这样的高级别资源，再由这些高级别资源来创建并管理实际的 Pod。

&emsp;&emsp;ReplicaSet 的目的是维护一组在任何时候都处于运行状态的 Pod 副本的稳定集合。如果 Pod 因为任何原因消失（如节点从集群中消失），ReplicaSet 会注意到缺少的 Pod 并创建替代 Pod。

&emsp;&emsp;ReplicaSet 确保任何时间都有指定数量的 Pod 副本在运行。然而，Deployment 是一个更高级的概念，它管理 ReplicaSet，并向 Pod 提供声明式的更新以衣许多其他有用的功能。因此我们建议使用 Deployment 而不是直接使用 ReplicaSet，除非你需要自定义更新业务流程或根本不需要更新。

## 基础声明

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: frontend
  labels:
    app: guestbook
    tier: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      tier: frontend
  template:
    metadata:
      labels:
        tier: frontend
    spec:
      containers:
      - name: php-redis
        image: gcr.io/google_samples/gb-frontend:v3
```

## 命令

```bash
# 查看你所创建的 ReplicaSet
$ kubectl get rs
NAME       DESIRED   CURRENT   READY   AGE
frontend   3         3         3       6s

# 查看 ReplicaSet 的状态
$ kubectl describe rs/frontend
Name:         frontend
Namespace:    default
Selector:     tier=frontend
Labels:       app=guestbook
              tier=frontend
Annotations:  kubectl.kubernetes.io/last-applied-configuration:
                {"apiVersion":"apps/v1","kind":"ReplicaSet","metadata":{"annotations":{},"labels":{"app":"guestbook","tier":"frontend"},"name":"frontend",...
Replicas:     3 current / 3 desired
Pods Status:  3 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  tier=frontend
  Containers:
   php-redis:
    Image:        gcr.io/google_samples/gb-frontend:v3
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age   From                   Message
  ----    ------            ----  ----                   -------
  Normal  SuccessfulCreate  117s  replicaset-controller  Created pod: frontend-wtsmm
  Normal  SuccessfulCreate  116s  replicaset-controller  Created pod: frontend-b2zdv
  Normal  SuccessfulCreate  116s  replicaset-controller  Created pod: frontend-vcmts

# 删除 ReplicaSet
$ kubectl delete rs frontend

# 删除 ReplicaSet，但是不删除它创建的 Pod
$ kubectl delete rs frontend --cascade=orphan
```