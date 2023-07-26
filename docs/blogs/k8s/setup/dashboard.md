# 安装 Dashboard
## 概述
&emsp;&emsp;Kubernetes 官方提供了简单的图形式展示应用，可以用于展示集群中的各类资源，同时也可以通过 Dashboard 实时查看 Pod 的日志和在容器中执行一些命令等。

## 操作步骤
### 部署 dashboard

```bash
# 使用 helm 安装 kube-dashboard
$ helm install kube-dashboard mirror/kube-dashboard -n kube-system
NAME: kube-dashboard
LAST DEPLOYED: Thu Jul 27 04:49:18 2023
NAMESPACE: kube-system
STATUS: deployed
REVISION: 1
TEST SUITE: None

# 查看 helm 列表
$ helm list -n kube-system
NAME               	NAMESPACE  	REVISION	UPDATED                                	STATUS  	CHART                    	APP VERSION
kube-dashboard     	kube-system	1       	2023-07-27 04:49:18.64526989 +0800 CST 	deployed	kube-dashboard-2.7.0     	2.7.0      
kube-flannel       	kube-system	1       	2023-07-27 04:20:53.353204291 +0800 CST	deployed	kube-flannel-v0.22.0     	v0.22.0    
kube-metrics-server	kube-system	1       	2023-07-27 04:47:23.939085564 +0800 CST	deployed	kube-metrics-server-0.6.3	0.6.3      
nfs-permanent      	kube-system	1       	2023-07-27 04:39:13.846105718 +0800 CST	deployed	nfs-permanent-4.0.18     	4.0.2      
nfs-temporary      	kube-system	1       	2023-07-27 04:39:36.230024145 +0800 CST	deployed	nfs-temporary-4.0.18     	4.0.2      

# 查看 Pod 的的状态
$ kubectl get po -n kube-system
NAME                                          READY   STATUS    RESTARTS      AGE
kubernetes-dashboard-fc86bcc89-xxgsd          1/1     Running   0             2m48s
kubernetes-metrics-scraper-dcffb9579-6zf8z    1/1     Running   0             2m48s
```

### 创建访问凭证

```bash
# 创建一个临时的登录 token（1 小时有效）
$ kubectl create token -n kube-system dashboard-admin
eyJhbGciOiJSUzI1NiIsImtpZCI6Ii02b3dfODdLMHZqcEhwYV9FeTluS2Fzb0hpVkU0ZGNfR2JMZ0RaNnZ0N00ifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxNjkwNDA4MzgxLCJpYXQiOjE2OTA0MDQ3ODEsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsInNlcnZpY2VhY2NvdW50Ijp7Im5hbWUiOiJkYXNoYm9hcmQtYWRtaW4iLCJ1aWQiOiJmMGRlNDFkMi00Njc3LTRkYmEtYjdlNy1iNjEyNjU5OWQ2YjQifX0sIm5iZiI6MTY5MDQwNDc4MSwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50Omt1YmUtc3lzdGVtOmRhc2hib2FyZC1hZG1pbiJ9.hFmhFCN_auac3DN1uk1XDiyKSwEnU-rOGlyfvaPzq5ytgP75DC2sQlsFCbutibnMlvVNAyje5uPc4EJ3eJlJjFdMCH9HeOEC7buHcq_hjCjdCVSI0kXzsg77TDUfDfGECIYpWfjWM9bKZ9HShfSLvayzaK8jHSJgqdogsHpI5QogADnsYpSZ63c3i1Tptb4XcngW-Z_kqGZCRMky4VwGgXNJNCly3IoNSrWXTPYeNlPL1j9KACMPr_8avu3re7mKPXsd8q18LL_cqr8lfJhN3B-HKzJIUhURNoEel00K_AK-QBBIhked18PpAz3e-cO4gPAl54QczPqyM1An5mr44w
```

> &emsp;&emsp;因为安全原因，从 1.24 开始，Kubernetes 不再为每个 ServiceAccount 自动创建对应的 Secret[[链接](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.24.md#urgent-upgrade-notes)]。你可以选择以下方式去解决这个问题:
>
> - TokenRequest API（建议）:
> - Token Volume Projection（建议）:
> - Service Account Token Secrets（不建议）: 你可以手

### 访问 dashboard
&emsp;&emsp;在部署 dashboard 时，创建了一个 NodePort 类型的服务（Service）。NodePort 类型的服务会在所有的工作节点上启用一个端口，该端口将会把请求转发到 Pod 里，因此我们可以通过该端口去访问 Dashboard。

```bash
# 查看 dashboard 的服务信息
# 可以看到服务 kubernetes-dashboard 创建了一个端口是 32693
$ kubectl get svc -n kube-system
NAME                        TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)         AGE
dashboard-metrics-scraper   ClusterIP   10.96.217.31   <none>        8000/TCP        10m
kubernetes-dashboard        NodePort    10.96.25.148   <none>        443:32693/TCP   10m
```

&emsp;&emsp;任意选择一台工作节点（node[x].cluster.k8s），在浏览器中输入该节点的 IP + 服务的端口访问 Dashboard。

![](./assets/dashboard.png)

&emsp;&emsp;登录方式选择用 `Token`，将上一步生成的临时 token 填入输入框，点击登录即可进入 Dashboard 管理界面。

![](./assets/dashboard-logined.png)

&emsp;&emsp;在标题栏可以选择切换命令空间（Namespace），然后就可以查看 Pod 等相关资源的运行状态了。

![](./assets/dashboard-pod.png)