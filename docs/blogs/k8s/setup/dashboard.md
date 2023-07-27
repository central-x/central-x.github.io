# 安装 Dashboard
## 概述
&emsp;&emsp;Kubernetes 官方提供了简单的图形式展示应用，可以用于展示集群中的各类资源，同时也可以通过 Dashboard 实时查看 Pod
的日志和在容器中执行一些命令等。

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
eyJhbGciOiJSUzI1NiIsImtpZCI6Ii02b3dfODdLMHZqcEhwYV9FeTluS2Fzb0hpVkU0ZGNfR2JMZ0RaNnZ0N00ifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxNjkwNDEwMjIyLCJpYXQiOjE2OTA0MDY2MjIsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsInNlcnZpY2VhY2NvdW50Ijp7Im5hbWUiOiJkYXNoYm9hcmQtYWRtaW4iLCJ1aWQiOiJmMGRlNDFkMi00Njc3LTRkYmEtYjdlNy1iNjEyNjU5OWQ2YjQifX0sIm5iZiI6MTY5MDQwNjYyMiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50Omt1YmUtc3lzdGVtOmRhc2hib2FyZC1hZG1pbiJ9.gx8HAFk_FEdQ97ogICplGJMmOFhWfPKRodPl8UHfXg9S0uvhPvxVrLn0SX0-DpaIBUMwBDJts7TIS8TvyB2kQzOfw4On9_dFrAlED4HCWGa8J7dpWCmOLQD8pqG5KGWuseU44Ukq3QAyVdO_nS_6FaIWSAOyN5boIY8CHlkbeUUes8lnONWwBCenA3bomlS7PQD7VRDdDBAlPUVlyAXp6RwtUkwRDzZFRikusRsva7R4WluMgncSaKTlZ5hb5hgmq_8gQiKHA4PZ-C547Z31FA5Gtr59kUkrJPXG1HcQqchPnvg-vRPvQTCvBxCrkpv0onJ94DLohF7bKZTwYQNnpg
```

> &emsp;&emsp;因为安全原因，从 1.24 开始，Kubernetes 不再为每个 ServiceAccount 自动创建对应的
> Secret[[链接](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.24.md#urgent-upgrade-notes)]
> 。你可以选择以下方式去解决这个问题:
>
> - TokenRequest API（建议）:
> - Token Volume Projection（建议）:
> - Service Account Token Secrets（不建议）: 你可以手

### 访问 dashboard
&emsp;&emsp;在集群的流量入口与出口章节中[[链接](/blogs/k8s/setup/network)]，我们提前定义了 Dashboard
的流量入口，因此我们只需要直接访问该负载均衡器即可。

![](./assets/dashboard.png)

&emsp;&emsp;登录方式选择用 `Token`，将上一步生成的临时 token 填入输入框，点击登录即可进入 Dashboard 管理界面。

![](./assets/dashboard-logined.png)

&emsp;&emsp;在标题栏可以选择切换命令空间（Namespace），然后就可以查看 Pod 等相关资源的运行状态了。

![](./assets/dashboard-pod.png)