# 监控集群
## 概述
&emsp;&emsp;在 Kubernetes 中，可以使用 Metrics-server 来完成系统资源的采集工作，通过 Metrics 采集节点和 Pod 的内存、磁盘、CPU 和网络的使用率。通过这些指标，可以结合 Horizontal Pod Autoscaler(HPA) 来完成自动伸缩[[链接](/blogs/k8s/action/automatic-scaling)]。

## 操作步骤
### 部署 metrics-server

```bash
# 将主节点的 front-proxy-ca.crt 证书转为 pem 格式证书
$ openssl x509 -in /etc/kubernetes/pki/front-proxy-ca.crt -out /etc/kubernetes/pki/front-proxy-ca.pem -outform PEM

# 将 pem 证书复制到所有的工作节点上
$ scp /etc/kubernetes/pki/front-proxy-ca.pem root@node1.cluster.k8s:/etc/kubernetes/pki/front-proxy-ca.pem

# 在主节点（master1.cluster.k8s）上，通过 helm 安装 metrics-server
$ helm install kube-metrics-server mirror/kube-metrics-server -n kube-system
NAME: kube-metrics-server
LAST DEPLOYED: Tue Jun 13 03:03:08 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None

# 获取 helm 部署信息
$ helm list -n kube-system
NAME               	NAMESPACE  	REVISION	UPDATED                                	STATUS  	CHART                    	APP VERSION
kube-flannel       	kube-system	1       	2023-06-20 10:27:39.915067228 +0800 CST	deployed	flannel-v0.22.0          	v0.22.0    
kube-metrics-server	kube-system	1       	2023-06-20 10:39:57.223343718 +0800 CST	deployed	kube-metrics-server-0.6.3	0.6.3      

# 查看 metrics-server Pod 的状态
$ kubectl get po -n kube-system -l k8s-app=metrics-server
NAME                              READY   STATUS    RESTARTS   AGE
metrics-server-7c7bfcf876-27t69   1/1     Running   0          70s
```

### 获取节点和 Pod 的资源使用率
&emsp;&emsp;等待 metrics-server 的 Pod 的状态转变为 Running 后，等待几分钟，就可以查看节点和 Pod 的资源使用率了。

```bash
# 获取节点的资源使用率
$ kubectl top node
NAME                  CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%   
master1.cluster.k8s   210m         5%     944Mi           24%       
master2.cluster.k8s   218m         5%     725Mi           18%       
master3.cluster.k8s   166m         4%     718Mi           18%       
node1.cluster.k8s     75m          0%     327Mi           4%        
node2.cluster.k8s     52m          0%     284Mi           3%

# 获取所有 Pod 的资源使用率
$ kubectl top po -A
NAMESPACE      NAME                                          CPU(cores)   MEMORY(bytes)   
kube-flannel   kube-flannel-ds-bqqfx                         10m          19Mi            
kube-flannel   kube-flannel-ds-gpp2z                         10m          25Mi            
kube-flannel   kube-flannel-ds-h68n9                         10m          19Mi            
kube-flannel   kube-flannel-ds-lllg2                         11m          25Mi            
kube-flannel   kube-flannel-ds-r2j59                         11m          20Mi            
kube-system    coredns-5d78c9869d-lmqtg                      2m           18Mi            
kube-system    coredns-5d78c9869d-sm29p                      2m           18Mi            
kube-system    etcd-master1.cluster.k8s                      81m          68Mi            
kube-system    etcd-master2.cluster.k8s                      66m          60Mi            
kube-system    etcd-master3.cluster.k8s                      68m          58Mi            
kube-system    kube-apiserver-master1.cluster.k8s            70m          283Mi           
kube-system    kube-apiserver-master2.cluster.k8s            67m          243Mi           
kube-system    kube-apiserver-master3.cluster.k8s            56m          205Mi           
kube-system    kube-controller-manager-master1.cluster.k8s   3m           25Mi            
kube-system    kube-controller-manager-master2.cluster.k8s   29m          53Mi            
kube-system    kube-controller-manager-master3.cluster.k8s   4m           25Mi            
kube-system    kube-proxy-9x5r4                              8m           28Mi            
kube-system    kube-proxy-nrxp4                              10m          22Mi            
kube-system    kube-proxy-tkrg7                              12m          27Mi            
kube-system    kube-proxy-wgd5z                              7m           22Mi            
kube-system    kube-proxy-xxdhb                              10m          23Mi            
kube-system    kube-scheduler-master1.cluster.k8s            7m           23Mi            
kube-system    kube-scheduler-master2.cluster.k8s            5m           23Mi            
kube-system    kube-scheduler-master3.cluster.k8s            5m           21Mi            
kube-system    metrics-server-7c7bfcf876-27t69               10m          29Mi
```