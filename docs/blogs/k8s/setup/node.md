# 初始化工作节点
## 概述
&emsp;&emsp;本章节主要用于初始工作节点。工作节点是 Kubernetes 的实际工作服务器，因此这些服务器需要更多的资源（包括更好的 CPU、更高的内存、更快的磁盘等）。

## 操作步骤
### 初始化工作节点
&emsp;&emsp;在 node1.cluster.k8s 服务器和 node2.cluster.k8s 服务器上，执行以下命令：

```bash
# 将当前节点加入到 Kubernetes 集群
$ kubeadm join master.cluster.k8s:16443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:ee3da16b9d7e53d54209c5910a5629d88b52d77b51fc77ba29206dec74431972

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
master1.cluster.k8s   Ready    control-plane   6m55s   v1.27.2
master2.cluster.k8s   Ready    control-plane   4m5s    v1.27.2
master3.cluster.k8s   Ready    control-plane   2m59s   v1.27.2
node1.cluster.k8s     Ready    <none>          22s     v1.27.2
node2.cluster.k8s     Ready    <none>          11s     v1.27.2

# 在主节点获取 kube-system 的 pod 初始化情况
# 可以发现 Kubernetes 已经在 node1 和 node2 节点中初始化着 kube-proxy 和 kube-flannel
# 等待一段时间后，初始化完毕
$ kubectl get po -n kube-system
NAME                                          READY   STATUS    RESTARTS        AGE
coredns-5d78c9869d-lmqtg                      1/1     Running   0               6m49s
coredns-5d78c9869d-sm29p                      1/1     Running   0               6m49s
etcd-master1.cluster.k8s                      1/1     Running   0               7m4s
etcd-master2.cluster.k8s                      1/1     Running   0               4m15s
etcd-master3.cluster.k8s                      1/1     Running   0               3m10s
kube-apiserver-master1.cluster.k8s            1/1     Running   0               7m2s
kube-apiserver-master2.cluster.k8s            1/1     Running   0               4m15s
kube-apiserver-master3.cluster.k8s            1/1     Running   0               3m10s
kube-controller-manager-master1.cluster.k8s   1/1     Running   1 (4m5s ago)    7m4s
kube-controller-manager-master2.cluster.k8s   1/1     Running   0               4m15s
kube-controller-manager-master3.cluster.k8s   1/1     Running   0               3m10s
kube-proxy-9x5r4                              1/1     Running   0               23s
kube-proxy-nrxp4                              1/1     Running   0               3m11s
kube-proxy-tkrg7                              1/1     Running   0               33s
kube-proxy-wgd5z                              1/1     Running   0               4m16s
kube-proxy-xxdhb                              1/1     Running   3 (6m33s ago)   6m49s
kube-scheduler-master1.cluster.k8s            1/1     Running   1 (4m1s ago)    7m3s
kube-scheduler-master2.cluster.k8s            1/1     Running   0               4m14s
kube-scheduler-master3.cluster.k8s            1/1     Running   0               3m10s
```

### 命令过期处理
&emsp;&emsp;后续新的工作节点需要加入集群时，由于 token 失效了，因此上面的命令也就失效了。因此需要通过以下的命令生成新的 token 来让新工作节点加入集群。

```bash
# 生成新的 token 及加入集群的命令
# 新节点就可以使用上面的命令加入集群
$ kubeadm token create --print-join-command
kubeadm join master.cluster.k8s:16443 --token 8nlczr.ni69skrz2r5ijx16 --discovery-token-ca-cert-hash sha256:ee3da16b9d7e53d54209c5910a5629d88b52d77b51fc77ba29206dec74431972
```