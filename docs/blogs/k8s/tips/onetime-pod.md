# 创建运行一次的 Pod
## 概述
&emsp;&emsp;如果需要在集群中执行命令，又不想在已有的 Pod 之上运行，可以通过以下方式创建运行一次的 Pod。

```bash
$ kubectl run -it --rm --restart=Never loadgenerator --image=busybox -- sh -c "while true; do wget -o - -q http://kubia.default; done"
```

&emsp;&emsp;以上命令中，run -it 命令允许你将控制台附加到补观察的进程，不仅允许你直接观察进程的输出，而且在你按下 Ctrl + C 组合健走这时还会直接终止进程。--rm 选项使得 Pod 在退出之后自动被删除；--restart=Never 选项则使 kubectl run 命令直接创建一个非托管的 pod，而不是通过一个 Deployment 对象间接创建。