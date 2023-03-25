# 有状态应用管理
## 概述
&emsp;&emsp;StatefulSet（有状态集，缩写为 sts）常用于部署有状态的且需要有序启动的应用程序，比如部署 ElasticSearch 集群、RabbitMQ集群、Redis 集群等。部署这些集群的时候，通常要求每一个实例都是一个独立的个体，它们有独立的访问地址、独立的数据存储、独立的应用标识等。

&emsp;&emsp;和 Deployment 类似，StatefulSet 管理基于相同容器规约的一组 Pod，但是和 Deployment 不同的是，StatefulSet 为它们的每一个 Pod 维护了一个有粘性的 ID，这些 Pod 是基于相同的规约来创建的，但是不能相互规换；无论怎么调度，每个 Pod 都有一个永久不变的 ID。

&emsp;&emsp;StatefulSet 相对 Deployment 具有以下特点：

- 每个 Pod 具有稳定的、唯一的网络标识符，不会因为重启、删除、下线等原因而发生改变；
- 每个 Pod 具有稳定的、独立的持久存储，重新创建的 Pod 仍然与原来的 Pod 具有一样的存储信息；
- 有序的、优雅的部署和扩展。在部署、更新、扩容、缩容时，StatefulSet 会保证 Pod 的启动顺序，在上一个 Pod 完成操作后再开始操作下一个 Pod。

## 定义
&emsp;&emsp;定义一个 StatefulSet 前，需要提前准备以下工作：

- Kubernetes 管理员提前声明持久卷（PV），或者提供 StorageClass 提供动态持久卷[[链接](/blogs/k8s/action/volumn)]；
- 提前创建 Headless Service，用于负责 Pod 的网络通信。

```yaml
# 创建无头服务
apiVersion: v1
kind: Service
metadata:
  name: nginx-headless
  labels:
    app: nginx
spec:
  ports:
    - port: 80
      name: http
  clusterIp: None
  selector:
    app: nginx
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  # 指事实上无头服务
  serviceName: nginx-headless
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.24.0
          ports:
            - containerPort: 80
              name: http
```

::: tip 提示
&emsp;&emsp;在 StatefulSet 完成创建后，可以通过 `nginx-0.nginx-headless.default.svc.cluster.local` 来访问第 1 个 Pod 实例，通过 `nginx-1.nginx-headless.default.svc.cluster.local` 来访问第二个实例。
:::

&emsp;&emsp;StatefulSet 管理的 Pod 部署和扩展的规则如下：

- 对具有 N 个副本的 StatefulSet，将按顺序从 0 到 N-1 开始创建 Pod。
- 当删除 Pod 时，将按照 N-1 到 0 的反顺序终止。
- 在缩放 Pod 之前，必须保证当前的 Pod 是 Running（运行中）或者 Ready（就绪）。
- 在终止 Pod 之前，它所有的继任者必须是完全关闭状态。