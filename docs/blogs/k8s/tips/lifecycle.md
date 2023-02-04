# 容器生合周期
## 概述
&emsp;&emsp;Pod 允许定义两种生命周期钩子:

- 启动后（Post-start）钩子
- 停止前（Pre-stop）钩子

&emsp;&emsp;这些生命周期的钩子是基于每个容器来指定的。生命周期钩子与存活探针和就绪探针相似，它们都可以:

- 在容器内部执行一个命令
- 向一个 URL 发送 HTTP GET 请求

## 启动后（Post-start）钩子
&emsp;&emsp;启动后钩子是在容器的主线程启动之后立即执行的，可以用它在应用启动时做一些额外的工作。当然，如果你是容器中运行的应用的开发者，可以在应用的代码中加入这些操作。但是如果你是运行一个其他人开发的应用，大部份情况下并不想（或者无法）修改它的源代码。启动后钩子可以让你在不改动应用的情况下，运行一些额外的命令，这些命令可能包括向外部监听器发送应用已启动的信号，或者是初始化应用以使得应用能够顺利运行。

&emsp;&emsp;钩子在执行完毕之前，容器会一直停留在 Waiting 状态，其原因是 ContainerCreating。因此 Pod 的状态会是 Pending 而不是 Running。如果钩子运行失败或者返回了非零的状态码，主容器会被杀死。

```yaml
apiVersion: v1
kind: Pod
metadta:
  name: pod-with-poststart-hook
spec:
  containers:
  - image: luksa/kubia
    name: kubia
    lifecycle:
      postStart:
        exec:
          command:
          - sh
          - -c
          - "echo 'hook will fail with exit code 15'; sleep 5; exit 16"
```

## 停止前（Pre-stop）钩子
&emsp;&emsp;停止前钩子是在容器被终止之前立即执行的。当一个容器需要终止运行的时候，Kubelet 在配转走了停止前钩子的时候就会执行这个停止前钩子，并且仅在执行完钩子程序之后才会向容器进行发送 SIGTERM 信号。停止前钩子在容器收到 SIGTERM 信号后没有优雅地关闭的时候，可以利用它来解发容器以优雅地方式关闭。

```yaml
spec:
  containers:
  - image: luksa/kubia
    name: kubia
    lifecycle:
      preStop:
        httpGet:
          port: 8080
          path: shutdown
```