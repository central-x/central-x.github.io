# 监控集群
## 概述
&emsp;&emsp;在 Kubernetes 中，可以使用 Metrics Server 来完成系统资源的采集工作，通过 Metrics 采集节点和 Pod 的内存、磁盘、CPU 和网络的使用率。通过这些指标，可以结合 Horizontal Pod Autoscaler(HPA) 来完成自动伸缩[[链接](/blogs/k8s/action/automatic-scaling)]。

## 操作步骤
### 部署 metrics-server

```bash
# 将 crt 证书复制到所有的节点上
$ scp /etc/kubernetes/pki/front-proxy-ca.crt root@master2.cluster.k8s:/etc/kubernetes/pki/front-proxy-ca.crt
$ scp /etc/kubernetes/pki/front-proxy-ca.crt root@node1.cluster.k8s:/etc/kubernetes/pki/front-proxy-ca.crt

# 在主节点（master1.cluster.k8s）上，通过 helm 安装 metrics-server
$ helm install kube-metrics-server mirror/kube-metrics-server -n kube-system
NAME: kube-metrics-server
LAST DEPLOYED: Thu Jul 27 04:47:23 2023
NAMESPACE: kube-system
STATUS: deployed
REVISION: 1
TEST SUITE: None

# 获取 helm 部署信息
$ helm list -n kube-system
NAME               	NAMESPACE  	REVISION	UPDATED                                	STATUS  	CHART                    	APP VERSION
kube-flannel       	kube-system	1       	2023-07-27 04:20:53.353204291 +0800 CST	deployed	kube-flannel-v0.22.0     	v0.22.0    
kube-metrics-server	kube-system	1       	2023-07-27 04:47:23.939085564 +0800 CST	deployed	kube-metrics-server-0.6.3	0.6.3      
nfs-permanent      	kube-system	1       	2023-07-27 04:39:13.846105718 +0800 CST	deployed	nfs-permanent-4.0.18     	4.0.2      
nfs-temporary      	kube-system	1       	2023-07-27 04:39:36.230024145 +0800 CST	deployed	nfs-temporary-4.0.18     	4.0.2      

# 查看 metrics-server Pod 的状态
$ kubectl get po -n kube-system -l k8s-app=metrics-server
NAME                             READY   STATUS    RESTARTS   AGE
metrics-server-fb5d74cd4-gxpfl   1/1     Running   0          31s
```

### 获取节点和 Pod 的资源使用率
&emsp;&emsp;等待 metrics-server 的 Pod 的状态转变为 Running 后，等待几分钟，就可以查看节点和 Pod 的资源使用率了。

```bash
# 获取节点的资源使用率
$ kubectl top node
NAME                  CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%   
master1.cluster.k8s   296m         7%     953Mi           24%       
master2.cluster.k8s   343m         8%     777Mi           20%       
master3.cluster.k8s   258m         6%     759Mi           19%       
node1.cluster.k8s     64m          1%     482Mi           12%       
node2.cluster.k8s     77m          1%     434Mi           11%       
node3.cluster.k8s     60m          1%     301Mi           7%        

# 获取所有 Pod 的资源使用率
$ kubectl top po -A
NAMESPACE       NAME                                          CPU(cores)   MEMORY(bytes)   
ingress-nginx   ingress-nginx-controller-5bvq5                2m           91Mi            
ingress-nginx   ingress-nginx-controller-jw59l                2m           92Mi            
kube-system     coredns-5d78c9869d-56smn                      3m           20Mi            
kube-system     coredns-5d78c9869d-fmrv5                      3m           18Mi            
kube-system     etcd-master1.cluster.k8s                      121m         79Mi            
kube-system     etcd-master2.cluster.k8s                      114m         72Mi            
kube-system     etcd-master3.cluster.k8s                      102m         73Mi            
kube-system     kube-apiserver-master1.cluster.k8s            95m          306Mi           
kube-system     kube-apiserver-master2.cluster.k8s            111m         260Mi           
kube-system     kube-apiserver-master3.cluster.k8s            85m          286Mi           
kube-system     kube-controller-manager-master1.cluster.k8s   6m           27Mi            
kube-system     kube-controller-manager-master2.cluster.k8s   52m          59Mi            
kube-system     kube-controller-manager-master3.cluster.k8s   5m           25Mi            
kube-system     kube-flannel-ds-4xblf                         14m          24Mi            
kube-system     kube-flannel-ds-c77gm                         13m          20Mi            
kube-system     kube-flannel-ds-fhjtl                         11m          17Mi            
kube-system     kube-flannel-ds-hm46x                         13m          22Mi            
kube-system     kube-flannel-ds-ngrcr                         13m          25Mi            
kube-system     kube-flannel-ds-v4qwj                         13m          21Mi            
kube-system     kube-proxy-5pj6c                              9m           23Mi            
kube-system     kube-proxy-67v7k                              1m           24Mi            
kube-system     kube-proxy-d7ffg                              1m           24Mi            
kube-system     kube-proxy-hcm5r                              1m           23Mi            
kube-system     kube-proxy-jjt2t                              1m           23Mi            
kube-system     kube-proxy-sgpmx                              9m           23Mi            
kube-system     kube-scheduler-master1.cluster.k8s            7m           23Mi            
kube-system     kube-scheduler-master2.cluster.k8s            8m           26Mi            
kube-system     kube-scheduler-master3.cluster.k8s            6m           21Mi            
kube-system     metrics-server-fb5d74cd4-gxpfl                9m           25Mi            
kube-system     nfs-permanent-6885f4b8f9-zf5rq                4m           9Mi             
kube-system     nfs-temporary-76c5c9bf57-h5pn4                4m           13Mi            
```