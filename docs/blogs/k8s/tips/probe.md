# 探针技术
## 概述
&emsp;&emsp;Kubernetes 支持通过探针技术来保证 Pod 的正常运行。

&emsp;&emsp;不同的探针的主要区别是执行时机与影响不同，但它们的配置都是相同的，如下：

- exec: 命令探针，在容器内执行任意命令，并检查命令的退出状态码。如果状态码返回 0 则探测成功。
  - exec.command（String[]）: 待执行命令，该命令将在根目录（`/`）下执行。注意，这个命令是通过 exec 来执行，因此 shell 相关功能是不能起作用的。
- httpGet: Http Get 探针，对容器的 IP 地址（你指定的端口和路径）执行 HTTP GET 请求。如果探测器收到响应，且状态码在 200 ~ 399 区间范围内，则认为探测成功。
  - httpGet.port（IntOrString, required）: 端口名或端口号
  - httpGet.host（String）: 访问该地址时的域名（也可以在 Header 中添加 Host 请求头）
  - httpGet.httpHeaders (HttpHeader[])
    - httpGet.httpHeaders.name (String, required): 请求头名称
    - httpGet.httpHeaders.value (String, required): 请求头值
  - httpGet.path (String): 请求路径
  - httpGet.scheme (String): 请求协议，默认使用 HTTP 协议。
- tcpSocket: 套接字探针，尝试与容器指定的端口建立 TCP连接。如果连接成功则认为控测成功。
  - tcpSocket.port (IntOrString, required): 端口名或端口号
  - tcpSocket.host (String): 连接时的域名，默认是 Pod 的 IP
- grpc: gRPC 探针。服务返回 SERVING 状态码表示检查成功
    - grpc.port (Int32, required):
    - grpc.service (String)
- initialDelaySeconds (Int32): 容器启动后，探针延迟初始化的秒数。
- terminationGracePeriodSeconds (Int64): Pod 在关闭时，为进程保留的优雅关机时间，时间耗尽时，将发送 KILL 信号。如果未设置此值，将引用 Pod 的 terminationGracePeriodSeconds 值。在设置此值时，应保证保留的时间需要大于进程清理资源的时间。如果值为设置 0，则 Pod 在关闭时将强杀进程，进程将没有任何机会释放资源。此字段处于 beta 阶段。
- periodSeconds (Int32): 探针检测间隔，默认为 10 秒，最小值为 1 秒。
- timeoutSeconds (Int32): 探针超时时间，默认 1 秒，最小值为 1 秒。
- failureThreshold (Int32): 探针失败阈值，连续探测失败时次数。默认为 3 次，最小值为 1 次。
- successThreshold (Int32): 探针成功阈值，连续探测成功时次数。默认为 1 次，最小值为 1 次。启动探针的成功阈值必须为 1。

## 探针类型
### 存活探针（liveness probe）
&emsp;&emsp;<font color=red>Kubernetes 通过存活探针检查容器是否存活（RUNNING 状态）。</font>如果设定了存活探针，Kubernetes 将定期执行探针，探测失败超过阈值（`failureThreshold`）后将认为 Pod 不再存活，继而重新启动容器。

&emsp;&emsp;若容器没有提供启动探针，则默认容器状态为存活。设计存活探针时应遵循以下设计原则：

- 如果容器里的进程在遭遇问题时能够自我崩溃（crash）的话，那么不需要为这个容器设置存活探针。因为当容器的进程退出时，Kubernetes 会自动感知并根据 Pod 的 `restartPolicy` 重启容器；
- 如果容器里的进程在遭遇问题时不能自我崩溃，如 Web 容器容易遇到无响应问题，那么必须要为这个容器设置存活探针，否则 Kubernetes 无法感知 Pod 当前是否还能正常工作，导致系统长时间宕机；
- 如果没有启动探针（startup probe），则一定要设置 initialDelaySeconds 属性，否则容器启动时探针就开始工作了，容易在应用还未完成初始化时时就被 Kubernetes 杀死；
- 存活探针不应消耗太多计算资源。默认情况下，探测器的执行频率相对比较高（10 秒一次），因此必须在一秒内执行完毕；

> **获取崩溃容器的应用日志**
>
> &emsp;&emsp;通过 kubectl logs 打印的是当前容器的日志，如果想知道为什么前一个容器的日志，可以通过 kubectl logs --previous 获取。

### 就绪探针（readiness probe）
&emsp;&emsp;<font color=red>Kubernetes 通过就绪探针确定 Pod 是否已经准备好接收客户端请求。</font>当容器的准备就绪探测返回成功时，表示容器已准备好接收请求。

&emsp;&emsp;如果一个容器的就绪探针探测失败，则 Kubernetes 将该容器从所有的服务（Service）的端点对象（Endpoint）中移除。与存活探针不一样的是，存活探针探测失败时，Kubernetes 将创建新的 Pod 去替换原有的 Pod；就绪探针探测失败时，则代表该 Pod 无法接收请求，但并不会重新创建。

&emsp;&emsp;就绪探针会持续探测，如果发现 Pod 检测成功，则 Kubernetes 会重新将 Pod 加回 Endpoint 列表中。

&emsp;&emsp;若容器没有提供启动探针，则默认容器可以接受请求。设计存活探针时应遵循以下设计原则：

- 一般建议为 Pod 设置就绪探针，否则 Pod 在启动阶段就会被加入 Endpoint 列表中，客户端此时会看到“链接被拒绝”等类型的错误；
- 就绪探针的检测频率和超时时间应根据应用程序的特性和需求进行设置，以确保能够及时处理应用程序的就绪状态变化。

### 启动探针（startup probe）
&emsp;&emsp;<font color=red>Kubernetes 通过启动探针检查容器内的应用是否启动完成。</font>如果设定了启动探针，则在启动探针成功前，其余两个探针都会被禁用。

&emsp;&emsp;Kubernetes 会在 Pod 的启动阶段定期执行探针，直到探测成功 1 次时，认为容器启动成功。

&emsp;&emsp;若容器没有提供启动探针，则默认启动状态为成功。

&emsp;&emsp;启动探针对于那些持有需要长时间启动的容器的 Pod 较为有用。你可以配置一个单独的配置用于在容器启动时控测，而不是设置一个长间隔的存活探针。设计启动探针时应遵循以下设计原则：

- 如果容器的启动时间超过 `initialDelaySeconds + failureThreshold x periodSeconds`，那么建议设置启动探针；
- 启动探针的探测点一般与存活探针一致；
- `failureThreshold` 应该设置到足够大的时间，以保证容器能正常启动；
- 启动探针在成功之前，容器的状态为 NOTREADY，此时 Pod 不会被加入 Endpoint 列表中，因此请求也不会转发给这个 Pod

## 设计
### 精简设计
&emsp;&emsp;如果为了简单保证程序的可用性，可以只保留启动探针和存活探针。启动探针保证了 Pod 在启动过程中不会接收到外部请求，同时也为应用保留了足够的启动时间。

&emsp;&emsp;启动完成之后，启动探针停止工作，存活探针开始工作。存活探针在发现 Pod 的探测失败达到阈值时，触发 Pod 的下线与重启工作，因此 Service 的流量也不会再导入到这个 Pod 中。等待新的 Pod 启动完成后再次加入集群。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: central-gateway
spec:
  containers: # 容器所用的镜像
  - name: gateway
    image: centralx/central-gateway:1.0.0
    ports:
    - name: http
      containerPort: 3000
      protocol: TCP
    # 启动探针，给应用的启动时间为 (10 + 5 * 10) = 60 秒时间
    # 如果应用在 60 秒内无法完成启动，Kubernetes 将杀死该 Pod 并创建新的 Pod
    # 因此需要保证应用有充足的时间启动
    startupProbe:
      httpGet:
        port: http
        path: /api/__probe
      initialDelaySeconds: 10 # 在 Pod 启动 10 秒后再激活启动探针
      periodSeconds: 5 # 每 5 秒探测一次
      failureThreshold: 10 # 允许连续失败 10 次
    
    # 存活探针，在启动探针成功一次之后激活
    # 如果应用在 30 秒内都无法响应存活探针的探测，那么 Kubernetes 将杀死该 Pod 并创建新的 Pod
    # 业务系统需要根据自身对可用性的要求调整探测频率和失败阈值
    livenessProbe: # HTTP GET 存活探针
      httpGet:
        port: http
        path: /api/__probe
      periodSeconds: 10 # 每 10 秒探测一次
      failureThreshold: 3 # 允许连练失败 3 次
```

### 完整设计
&emsp;&emsp;在精简设计的基础上，可以再加入就绪探针。一些比较重量级的应用，重新创建 Pod 需要比较高的成本时，我们可以适当放宽存活探针的限制，并利用就绪探针防止应用在无法响应时还涌入请求，导致请求失败。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: central-gateway
spec:
  containers: # 容器所用的镜像
  - name: gateway
    image: centralx/central-gateway:1.0.0
    ports:
    - name: http
      containerPort: 3000
      protocol: TCP
    # 启动探针，给应用的启动时间为 (10 + 5 * 10) = 60 秒时间
    # 如果应用在 60 秒内无法完成启动，Kubernetes 将杀死该 Pod 并创建新的 Pod
    # 因此需要保证应用有充足的时间启动
    startupProbe:
      httpGet:
        port: http
        path: /api/__probe
      initialDelaySeconds: 10 # 在 Pod 启动 10 秒后再激活启动探针
      periodSeconds: 5 # 每 5 秒探测一次
      failureThreshold: 10 # 允许连续失败 10 次
    
    # 存活探针，在启动探针成功一次之后激活
    # 如果应用在 120 秒内都无法响应存活探针的探测，那么 Kubernetes 将杀死该 Pod 并创建新的 Pod
    # 业务系统需要根据自身对可用性的要求调整探测频率和失败阈值
    livenessProbe: # HTTP GET 存活探针
      httpGet:
        port: http
        path: /api/__probe
      periodSeconds: 20 # 每 20 秒探测一次
      failureThreshold: 6 # 允许连练失败 6 次

    # 就绪探针，在启动探针成功一次之后激活
    # 如果启用在 30 秒内都无法响应就绪探针的探测，那么 Kubernetes 会把 Pod 的状态改为 NotReady，并将该 Pod 从 Endpoint 列表中移除
    # 如果在达到存活探针的失败阈值之前，程序恢复响应了，那么 Pod 将恢复工作，因此 Pod 不需要被重启
    # 如果想确保当前 Pod 可以正常提供服务，可以调整成功阈值（successThreshold），如成功响应 3 次之后才认为 Pod 恢复正常
    # 就绪探针只影响该 Pod 是否加入 Endpoint 列表，不影响存活探针判断是否对其重启，两者独立工作
    readinessProbe:
      httpGet:
        port: http
        path: /api/__probe
      periodSeconds: 10
      failureThreshold: 3
      successThreshold: 3
```