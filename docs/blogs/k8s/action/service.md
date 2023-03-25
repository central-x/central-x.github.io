# 服务发布
## 概述
&emsp;&emsp;在没有 Kubernetes 的场景下，每个应用都可以有固定的访问地址，系统间的通信都是通过固定的 IP 地址通信。但是在 Kubernetes 在世界里，这一点并不适用，主要是因为：

- Pod 是短暂的：它们随时会启动或者关闭
- Pod 的数量是不确定的：它们可能根据 ReplicaSet 的调整而随时新增或减少实体
- Pod 的 IP 不能提前感知：客户端不能提前知道提供服务的 Pod 的 IP 地址

&emsp;&emsp;为了解决以上问题，Kubernetes 提供了一种资源类型 -- 服务（Service），用于为一组功能相同的 Pod 提供单一不变的接入点的资源。当服务存在时，它的 IP 地址和不会发生改变。客户端通过该 IP 地址和端口号建立连接，这些连接会被路由到提供该服务的任意一个 Pod 上。

![](./assets/service.svg)

## 声明

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubia
spec:
  ports:
  - name: http           # 端口名称
    port: 80             # 服务可用端口
    targetPort: 8080     # 服务转发到的容器端口
  - name: https          # 一个服务可以转发多个接口
    port: 443        
    targetPort: 8443     
  selector:              # Pod 选择器，服务的转发目标
    app: kubia
```

> &emsp;&emsp;通过给不同的端口命名，这样对于一些不是众所周知的端口号，使得 Service 的声明更清晰。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kubia
spec:
  containers:
  - name: kubia
    ports:
    - name: http
      containerPort: 8080
    - name: https
      containerPort: 8443
---
apiVersion: v1
kind: Service
metadata:
  name: kubia
spec:
  ports:
  - name: http
    port: 80
    targetPort: http     # 转发目标也可以使用 http 名称引用
  - name: https
    port: 443
    targetPort: https
  selector:
    app: kubia
```

> &emsp;&emsp;通过命名端口的方式，最大的好处就是当 Pod 更换端口也无须更改服务的 spec。

## 服务发现
### 通过环境变量发现服务
&emsp;&emsp;在 Pod 开始运行的时候，Kubernetes 会初始化一系列的环境变量指向现在存在的服务。如果你创建的服务早于客户端 Pod 的创建，那么客户端的 Pod 上的进程可以根据环境变量获得服务的 IP 地址和端口号。


### 通过 DNS 发现服务
&emsp;&emsp;在 kube-system 命名空间下，其中有一个 Pod 被称作 kube-dns，该 Pod 运行 DNS 服务，在集群中的其它 Pod 都被配置成使用其作为 DNS 服务器（Kubernetes 通过修改每个容器的 /etc/resolv.conf 文件实现）。

&emsp;&emsp;每个服务在内部 DNS 服务器中注册了一个 DNS 条目，客户端的 Pod 在知道服务的名称下，就可以通过全限定域名（FQDN）来访问，而不是通过环境变量。

&emsp;&emsp;比如 `kubia.default.svc.cluster.local`，kubia 对应于服务名称，default 表示服务所在命名空间，而 svc.cluster.local 是所有集群本地服务名称中使用的可配置集群域名缀。FQDN 可以简化，如果 Pod 和 Service 所在的命名空间相同，则可以直接通过服务的名称访问服务，如 `kubia`

```bash
$ kubectl exec -it kubia03inly bash

$ curl http://kubia.default.svc.cluster.local
You've hit kubia-5asi2

$ curl http://kubia.default
You've hit kubia-3inly

$ curl http://kubia
You've hit kubia-8awf3
```

### 无法 ping 通服务 IP
&emsp;&emsp;由于服务 IP 是一个虚拟的 IP，因此服务可以响应请求，但是不能响应 ping。

### Endpoint
&emsp;&emsp;服务（Service）并不是和 Pod 直接相连的，有一种资源介于两者之间 -- 这就是 Endpoint 资源。Endpoint 资源就是暴露一个服务的 IP 地址和端口的列表，Endpoint 资源和其他资源一样，可以通过 kubectl info 来获取它的基本信息。

```bash
$ kubectl get endpoints kubia
NAME    ENDPOINTS                                        AGE
kubia   10.108.1.4:8080,10.108.2.5:8080,10.108.2.6:8080  1h
```

&emsp;&emsp;一般情况下我们不会独立去操作它，因此忽略。

## 服务公开
&emsp;&emsp;部署好应用之后，除了需要让内部应用间能相互访问，我们还需要让外部的客户端能够访问这些应用。有几种方式可以在外部访问服务：

- 将服务的类型设置为 NodePort: 每个集群节点都会在节点上打开一个端口，对于 NodePort 服务，每个集群节点在节点本身上打开一个端口，并将在该端口上接收到的流量重定向到基础服务。该服务仅在内部集群 IP 和端口上才能访问，但也可以通过所有节点上专用的端口访问。
- 将服务的类型设置成 LoadBalance，NodePort 类型的一种扩展: 这使得服务可以通过一个专用的负截均衡器来访问，这是由 Kubernetes 中正在运行的云基础设施提供的。负载均衡器将流量重定向到跨所有节点的节点端口。客户端通过负载均衡器的 IP 连接到服务。
- 创建一个 Ingress 资源: 它运行在 HTTP 层，因此可以提供比工作在第 4 层的服务更多的功能。

### NodePort
&emsp;&emsp;NodePort 服务可以让 Kubernetes 在其所有节点上保留一个端口（所有节点上都使用相同的端口号），并将传入的连接转发给作为服务部份的 Pod。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubia
spec:
  type: NodePort
  ports:
  - name: http
    port: 80
    targetPort: 8080
    nodePort: 30123      # 通过集群节点的 30123 端口可以访问该服务
  selector:
    app: kubia
```

&emsp;&emsp;如下图所示，Kubernetes 将在每个工作节点上监听 30123 端口，然后转发到服务后，再由服务转发给 Pod。客户端可以通过任意节点上的 30123 端口访问到 Pod 了。

![](./assets/service-nodeport.svg)

&emsp;&emsp;使用 NodePort 时，需要注意以下问题:

- 每个服务都会有一个独立的端口，端口不能复用
- 端口范围只能是 30000～32767
- 如果节点的 IP 地址发生变化，需要手工处理

### LoadBalancer
&emsp;&emsp;负载均衡器服务一般由云提供商提供，自行搭建的 Kubernetes 一般情况下不包含该类型的服务。云服务商会额外提供一个负载均衡器服务器，用于在 NodePort 的基础上提供对节点的负载均衡。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubia
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 8080
  selector:
    app: kubia
```

&emsp;&emsp;如下图所示:

![](./assets/service-loadbalancer.svg)

&emsp;&emsp;本方式最大的缺点是每个用 LoadBalancer 暴露的服务都会有它自己的 IP 地址，每个用到的 LoadBalancer 都需要付费。

### Ingress
&emsp;&emsp;Ingress 资源是 Kubernetes 集群的流量入口，提供了基于域名（主机名）或路径的路由服务，可以将多个 Service 合并成一个入口，扮演着「智能路由」或集群入口的角色。需要注意的是，Ingress 资源必须有 Ingress Controller 在集群中运行时才能正常工作。不同的 Kubernetes 环境使用不同的控制器实现，不同的控制器也有着不同（但类似）的行为表现。

&emsp;&emsp;在一些云服务商如 Google Kubernetes Engine，他们一般会提供带有 HTTP 负载均衡模块功能的 Ingress Controller，因此他们的行为模式更像 LoadBalancer。

![](./assets/ingress-loadbalancer.svg)

&emsp;&emsp;而如果是我们自行搭建的 Kubernetes 集群，一般没有提供 Ingress Controller，那么需要我们根据需求自行选择 Ingress Controller 实现。常见的 Ingress Controller 有HAProxy、Treafik、Kubernetes 官方维护的 Nginx、Nginx 开源版、Nginx商业版等。由于我们一般无法提供负载均衡模块，因此我们选用的 Ingress Controller 的行为模式更像 NodePort。

&emsp;&emsp;以 Kubernetes 官方维护的 Ingress Nginx 为例，它的 Ingress Controller 实际上就是一个 Pod，这个 Pod 会被调度到指定的节点上，然后开放指定的端口（一般是 80 和 443）。这个 Pod 通过监听 Kubernetes 集群的 Ingress 资源，从而动态更新 Pod 里的 Nginx 配置文件并重新加载 Nginx 进程，从而达到即时更新路由的效果。

![](./assets/ingress-nodeport.svg)

&emsp;&emsp;注意，上图的 LoadBalancer 可以选用硬件负载均衡器或软件负载均衡器，这是根据可用性要求自行添加的，它不属于 Ingress Controller 的一部份。如果没有高可用需求，将基中一个节点的 IP 提供给客户也是一种选择。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minimal-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx-example
  rules:
  - http:
      paths:
      - path: /testpath
        pathType: Prefix
        backend:
          service:
            name: test
            port:
              number: 80
```