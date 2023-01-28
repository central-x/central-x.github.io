# 探针技术
## 概述
&emsp;&emsp;Kubernetes 支持通过探针技术来保证 Pod 的正常运行。

## 存活探针（liveness probe）
&emsp;&emsp;Kubernetes 可以通过存活探针检查容器是否还在运行。如果探测失败，Kubernetes 将定期执行探针并重新启动容器。Kubernetes 支持以下三种探测容器的机制：

- HTTP GET 探针：对容器的 IP 地址（你指定的端口和路径）执行 HTTP GET 请求。如果探测器收到响应，且状态码在 200 ~ 399 区间范围内，则认为探测成功。
- TCP 套接字探针：尝试与容器指定的端口建立 TCP连接。如果连接成功则认为控测成功。
- Exec 探针：在容器内执行任意命令，并检查命令的退出状态码。如果状态码返回 0 则探测成功。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kubia-manual # Pod 的名称
spec:
  containers: # 容器所用的镜像
  - image: mirror.central-x.com/kubia:1.0.0
    name: kubia
    livenessProbe: # HTTP GET 存活探针
      httpGet:
        path: /
        port: 8080
      initialDelaySeconds: 15 # Pod 启动 15 秒后再启动存活探针（支持 delay[延迟]、timeout[超时]、period[周期]等）
    ports:
    - containerPort: 8080
      protocol: TCP
```

> **获取崩溃容器的应用日志**
> 
> &emsp;&emsp;通过 kubectl logs 打印的是当前容器的日志，如果想知道为什么前一个容器的日志，可以通过 kubectl logs --previous 获取。

&emsp;&emsp;设计存活探针时应遵循以下设计：
- 应该检查什么：应用应该从内存运行的所有重要组件执行状态检查，而没有任何外部因素的影响。例如数据库无法连接时，Web 服务器的存活探针不应该返回失败（因为就算重启也没办法解决数据库无法连接的问题），否则容器将反复重启直到数据库恢复。
- 保持探针轻量：存活探针不应消耗太多计算资源。默认情况下，探测器的执行频率相对比较高，必须在一秒内执行完毕。


## 就绪探针（readiness probe）
&emsp;&emsp;就绪探测器会定期调用就绪探针，用于确定特定的 Pod 是否已经准备好接收客户端请求。当容器的准备就绪探测返回成功时，表示容器已准备好接收请求。就绪探针与存活探针一样，支持以下三种探针类型。

- HTTP GET 探针：对容器的 IP 地址（你指定的端口和路径）执行 HTTP GET 请求。如果探测器收到响应，且状态码在 200 ~ 399 区间范围内，则认为探测成功。
- TCP 套接字探针：尝试与容器指定的端口建立 TCP连接。如果连接成功则认为控测成功。
- Exec 探针：在容器内执行任意命令，并检查命令的退出状态码。如果状态码返回 0 则探测成功。

&emsp;&emsp;如果一个容器的就绪探针探测失败，则 Kubernetes 将该容器从端点对象（Endpoint）中移除。与存活探针不一样的是，存活探针探测失败时，Kubernetes 将创建新的 Pod 去替换原有的 Pod；就绪探针探测失败时，则代表该 Pod 无法接收请求，但并不会重新创建。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kubia-manual # Pod 的名称
spec:
  containers: # 容器所用的镜像
  - image: mirror.central-x.com/kubia:1.0.0
    name: kubia
    readinessProbe: # HTTP GET 就绪探针
      httpGet:
        path: /api/ready
        port: 8080
      initialDelaySeconds: 15 # Pod 启动 15 秒后再启动存活探针（支持 delay[延迟]、timeout[超时]、period[周期]等）
    ports:
    - containerPort: 8080
      protocol: TCP
```
