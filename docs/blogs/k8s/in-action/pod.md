# Pod
## 概述
&emsp;&emsp;Pod 是一组并置的容器，代表了 Kubernetes 中的基本构建模块。在实际应用中，我们不会直接使用 Pod 这种类型的模块，而是使用更高级的 ReplicationController、ReplicaSet、Deployment 这些资源。但是为了更好地理解 Kubernetes 的运行机制，我们还是要了解一下 Pod 的运行机制。

&emsp;&emsp;以下是 Pod 的一些关键知识点：
1. Pod 用于将多个密切相关的进程（容器）绑定在一起，并作为一个单元进行管理（如将 Sidecar 与微服务绑定在一起）。Pod 可以包含多个容器，也可以只包含一个容器。
2. 当一个 Pod 包含多个容器时，这些容器总是运行于同一个工作节点（Node）上。
3. 每个 Pod 都有独立的 IP 地址（内部地址），Pod 与 Pod 之间都能像在无 NAT 的平坦网络中一样相互通信，就像局域网（LAN）上的计算机一样。
4. 扩容时，Pod 将作为最小的基础单元。

### 原理
&emsp;&emsp;Kubernetes 通过配置容器来让一个 Pod 内的所有容器共享相同的 Linux 命名空间（Network、UTS），从而让容器共享一些资源。因此每个进程注意不能绑定相同的端口号，否则会导致端口冲突。

### 准备工作
&emsp;&emsp;为了学习接下来的东西，需要先创建一个容器镜像。我们在本地机器（或另一台服务器上面），完成一个镜像的创建工作。镜像内容如下：

```
kubia
 ├── app.js
 └── Dockerfile
```

- app.js

```js
const http = require('http');
const os = require('os');

console.log("Kubernetes server starting...");

var handler = function(request, response) {
    console.log("Received request from " + request.connection.remoteAddress);

    response.writeHead(200);
    response.end("You've hit " + os.hostname() + "\n");
}

var www = http.createServer(handler);
www.listen(8080);
```

- Dockerfile

```dockerfile
FROM node:18
ADD app.js /app.js
ENTRYPOINT ["node", "app.js"]
```

&emsp;&emsp;然后使用以下命令构建镜像并推送到 Registry。

```bash
# 在 kubia 目录下，构建容器镜像
$ docker build -t deploy.cluster.k8s/kubia:1.0.0 .

# 推送到 Registry 供 Kubernetes 集群使用
$ docker push deploy.cluster.k8s/kubia:1.0.0
```

## 基础声明
&emsp;&emsp;创建 kubia-manual.yaml 文件，用于 Pod 的声明，内容如下：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kubia-manual # Pod 的名称
  labels: # 为 Pod 添加两个标签
    creation_method: manual
    env: prod
spec:
  containers: # 容器所用的镜像
  - image: cluster.k8s/kubia
    name: kubia
    ports:
    - containerPort: 8080
      protocol: TCP

```

## 命令

### 创建 Pod
```bash
# 从 yaml 文件创建 Pod
$ kubectl create -f kubia-manual.yaml

# 得到运行中的 Pod 的完整 yaml 格式的定义
$ kubectl get po kubia-manual -o yaml

# 得到运行中的 Pod 的完整 json 格式的定义
$ kubectl get po kubia-manual -o json
```

### 查看 Pod
```bash
# 查看 Pod 列表
$ kubectl get pods
NAME           READY   STATUS    RESTARTS   AGE
kubia-manual   1/1     Running   0          26s

# 查看 Pod 列表(显示其标签)
$ kubectl get po --show-labels
NAME           READY   STATUS    RESTARTS   AGE   LABELS
kubia-manual   1/1     Running   0          2s    creation_method=manual,env=prod

# 根据标签筛选 Pod
$ kubectl get po -l creation_method=manual
NAME           READY   STATUS    RESTARTS   AGE
kubia-manual   1/1     Running   0          101s

# 查看应用程序日志
$ kubectl logs kubia-manual

# 如果 Pod 中包含多个容器，则必须要指定容器
$ kubectl logs kubia-manual -c kubia
```

### 访问 Pod
&emsp;&emsp;由于创建 Pod 时，Kubernetes 可能会随机挑选一个合适的节点去创建 Pod 实例，因此我们没有办法直接到找到该容器所在的节点并访问它。如果要访问 Pod，可以用创建 service，以方便在外部访问该 Pod。由于后面有一章节专门介绍 service，因此这里不打算使用 service，而是使用 Kubernetes 提供的端口转发功能。

```bash
# 将本地的 8888 端口的请求转发到名为 kubia-manual 的 Pod 的 8080 端口
# 注意，本命令在启动后会一直阻塞到使用 ctrl + c 中断
$ kubectl port-forward kubia-manual 8888:8080
Forwarding from 127.0.0.1:8888 -> 8080
```

&emsp;&emsp;另起一个终端窗口，通过 curl 访问 Pod。

```bash
$ curl localhost:8888
You've hit kubia-manual
```

&emsp;&emsp;下图可以用于表示上面的端口转发的过程：

![](./assets/pods-1.svg)

### 将 Pod 调度到特定节点
&emsp;&emsp;Kubernetes 对运行在其上的应用程序隐藏实时的基础加构，因此我们不应该特别告诉 Kubernetes 必须将 Pod 调度到哪个节点上，而是告诉 Kubernetes 该 Pod 需要什么资源/特性，再由 Kuberntes 自行决定部署到哪个节点上。

&emsp;&emsp;这种情况下，一般使用标签（Label）及选择器（Selector）来完成该功能。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kubia-manual # Pod 的名称
spec:
  nodeSelector:  # 节点选择器要求 Kubernetes 只将 Pod 部署到包含标签 gpu=true 的节点上
    gpu: "true"
  containers: # 容器所用的镜像
  - image: cluster.k8s/kubia
    name: kubia
    ports:
    - containerPort: 8080
      protocol: TCP

```

### 命名空间
&emsp;&emsp;通过命名空间，可以将 Pod 对象分割成完全独立且不重叠的组。命名空间是一种和其他资源一样的 Kubernetes 资源，因此可以通过将 YAML 文件提交到 Kubernetes API 服务器来创建资源。

- custom-namespace.yaml

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: custom-namespace
```

&emsp;&emsp;然后就可以通过 `kubectl create -f custom-namespace.yaml` 命令提交文件到 Kubernetes API 服务器。也可以使用 `kubectl create namespace custom-namespace` 命令快速创建命名空间。

&emsp;&emsp;如果想在指定的命名空间中创建资源，可以选择在 metadata 字段中添加一个 namespace: custom-namespace 属性，也可以在使用 kubectl create 命令创建资源时指定命名空间：

```bash
$ kubectl create -f kubia-manual.yaml -n custom-namespace
```

&emsp;&emsp;在查询、操作资源时，如果不指定命名空间，kubectl 将在当前上下文中配置的默认命名空间中执行操作。可以通过以下命令切换当前默认的命名空间

```bash
$ kubectl config set-context $(kubectl config current-context) --namespace custom-namespace
```

> 提示，如果嫌弃上面的命令太长了，可以通过设置别名 `alias kdc='kubectl config set-context $(kubectl config current-context) --namespace`。然后就可以使用 `kcd custom-namespace` 在命令行里切换命名空间了。


### 在指定的 Pod 下面执行命令

```bash
$ kubectl exec kubia-7nog1 -- curl -s http://10.111.249.153
```

### 停止和删除 Pod

```bash
# 根据名称删除 Pod
$ kubectl delete po kubia-manual

# 根据标签选择器删除 Pod
$ kubectl elete po -l creation_method=manual

# 通过删除整个命名空间来删除 Pod
$ kubectl delete ns custom-namespace

# 删除命名空间中所有的 Pod，但保留命名空间
$ kubectl kubect delete po -all
```