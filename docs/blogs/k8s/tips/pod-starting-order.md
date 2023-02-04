# 以固定顺序启动 Pod
## 概述
&emsp;&emsp;当你使用 Kubernetes 来运行多个 Pod 的应用的时候，Kubernetes 没有内置的方法来先运行某些 Pod 然后等这些 Pod 运行成功后再运行其它 Pod。当然你也可以先发布第一个应用的配置，然后等待 Pod 启动完毕再发布第二个应用的配置。但是通常情况下，系统都是定义在一个单独的 YAML 或 JSON 文件中，这些文件包含了多个 Pod、服务或者其他对象的定义。

&emsp;&emsp;Kubernetes API 服务器只能按照 YAML/JSON 文件中定义对象的顺序来进行处理，但是仅仅意味着它们在被写入到 etcd 的时候是有顺序的，无法保证 Pod 会根据这个顺序启动。但是你可以阻止一个主容器的启动，直到它的预置条件被满足。这个是通过在 Pod 中包含一个叫作 init 的容器来实现的。

&emsp;&emsp;一个 Pod 可以拥有任意数量的 init 容器，init 容器是顺序执行的，并且仅当最后一个 init 容器执行完毕才会去启动主容器。换句话说， init 容器可以一直等待直到主容器所依赖的服务启动完成并可以提供服务。当这个服务启动并且可以提供服务之后，init 容器就执行结束了，然后主容器就可以启动了。

## 定义

```yaml
spec:
  initContainers:
  - name: init
    image: busybox
    command:
    - sh
    - -c
    - 'while true; do echo "Waiting for fortune service to come uo..."; wget http://fortune -q -T 1 -O /dev/null > /dev/null 2>/dev/null && break; sleep 1; done; echo "Service is up! Starting main container."'
```

> &emsp;&emsp;虽然通过 init 容器可以达到延迟 Pod 主容器的启动，直到预置的条件被满足，但是更佳的实践是构建一个法面要它所依赖的服务都准备好后才能启动的应用。也就是这个 Pod 需要在它所依赖的服务还没准备好时也能正常启动。为了保证这个 Pod 能正常对外提供服务，我们可以通过 Readiness 探针来感知这个情况。