# 初始化工作节点
## 概述
&emsp;&emsp;本章节主要用于初始工作节点。工作节点是 Kubernetes 的实际工作服务器，因此这些服务器需要更多的资源（包括更好的 CPU、更高的内存、更快的磁盘等）。

## 操作步骤
### 初始化工作节点
&emsp;&emsp;在 node1.cluster.k8s 服务器和 node2.cluster.k8s 服务器上，执行以下命令：

```bash
# 将当前节点加入到 Kubernetes 集群
$ kubeadm join master.cluster.k8s:16443 --token abcdef.0123456789abcdef \
	--discovery-token-ca-cert-hash sha256:c74b6dcc0f3119703fcf08c444f13a01c77d8e649a398cb559bfb5cda257c583

# 如果输出以下内容，则表示已经初始化成功
This node has joined the cluster:
* Certificate signing request was sent to apiserver and a response was received.
* The Kubelet was informed of the new secure connection details.

Run 'kubectl get nodes' on the control-plane to see this node join the cluster.

# 在主节点再次获取节点信息
# 可以发现 node1 和 node2 已经加入到集群了
# 如查 node[x] 节点处于 NotReady 状态，有可能还处理初始化阶段，等一会再获取信息时，就发现该节点的状态已经更新为 Ready 状态了
$ kubectl get nodes
NAME                  STATUS   ROLES           AGE     VERSION
master1.cluster.k8s   Ready    control-plane   13m     v1.27.4
master2.cluster.k8s   Ready    control-plane   4m25s   v1.27.4
master3.cluster.k8s   Ready    control-plane   3m35s   v1.27.4
node1.cluster.k8s     Ready    <none>          24s     v1.27.4
node2.cluster.k8s     Ready    <none>          6s      v1.27.4
node3.cluster.k8s     Ready    <none>          8s      v1.27.4

# 在主节点获取 kube-system 的 pod 初始化情况
# 可以发现 Kubernetes 已经在 node1 和 node2 节点中初始化着 kube-proxy 和 kube-flannel
# 等待一段时间后，初始化完毕
$ kubectl get po -n kube-system
NAME                                          READY   STATUS    RESTARTS        AGE
coredns-5d78c9869d-56smn                      1/1     Running   0               13m
coredns-5d78c9869d-fmrv5                      1/1     Running   0               13m
etcd-master1.cluster.k8s                      1/1     Running   0               13m
etcd-master2.cluster.k8s                      1/1     Running   0               4m42s
etcd-master3.cluster.k8s                      1/1     Running   0               3m49s
kube-apiserver-master1.cluster.k8s            1/1     Running   0               13m
kube-apiserver-master2.cluster.k8s            1/1     Running   0               4m41s
kube-apiserver-master3.cluster.k8s            1/1     Running   1 (3m50s ago)   3m50s
kube-controller-manager-master1.cluster.k8s   1/1     Running   1 (4m31s ago)   13m
kube-controller-manager-master2.cluster.k8s   1/1     Running   0               4m41s
kube-controller-manager-master3.cluster.k8s   1/1     Running   0               2m32s
kube-flannel-ds-4xblf                         1/1     Running   0               3m52s
kube-flannel-ds-c77gm                         1/1     Running   0               25s
kube-flannel-ds-fhjtl                         1/1     Running   0               23s
kube-flannel-ds-hm46x                         1/1     Running   0               41s
kube-flannel-ds-ngrcr                         1/1     Running   0               4m42s
kube-flannel-ds-v4qwj                         1/1     Running   0               6m46s
kube-proxy-5pj6c                              1/1     Running   0               23s
kube-proxy-67v7k                              1/1     Running   0               4m42s
kube-proxy-d7ffg                              1/1     Running   0               25s
kube-proxy-hcm5r                              1/1     Running   4 (13m ago)     13m
kube-proxy-jjt2t                              1/1     Running   0               3m52s
kube-proxy-sgpmx                              1/1     Running   0               41s
kube-scheduler-master1.cluster.k8s            1/1     Running   1 (4m27s ago)   13m
kube-scheduler-master2.cluster.k8s            1/1     Running   0               4m26s
kube-scheduler-master3.cluster.k8s            1/1     Running   0               3m51s
```

### 命令过期处理
&emsp;&emsp;后续新的工作节点需要加入集群时，由于 token 失效了，因此上面的命令也就失效了。因此需要通过以下的命令生成新的 token 来让新工作节点加入集群。

```bash
# 生成新的 token 及加入集群的命令
# 新节点就可以使用上面的命令加入集群
$ kubeadm token create --print-join-command
kubeadm join master.cluster.k8s:16443 --token 5hmt4i.r5unj6xjtjp4xrpq --discovery-token-ca-cert-hash sha256:c74b6dcc0f3119703fcf08c444f13a01c77d8e649a398cb559bfb5cda257c583 
```