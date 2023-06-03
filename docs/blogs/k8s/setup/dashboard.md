# 安装 Dashboard
## 概述
&emsp;&emsp;Kubernetes 官方提供了简单的图形式展示应用，可以用于展示集群中的各类资源，同时也可以通过 Dashboard 实时查看 Pod 的日志和在容器中执行一些命令等。

## 操作步骤
### 部署 dashboard

```bash
# 使用 helm 安装 kube-dashboard
$ helm install kube-dashboard mirror/kube-dashboard  -n kube-system
NAME: kube-dashboard
LAST DEPLOYED: Tue Jun 13 03:05:13 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None

# 查看 helm 列表
$ helm list
NAME                    NAMESPACE       REVISION        UPDATED                                 STATUS          CHART                           APP VERSION
kube-dashboard          default         1               2023-06-13 03:05:13.751627052 +0800 CST deployed        kube-dashboard-2.7.0            2.7.0      
kube-flannel            default         1               2023-06-13 02:55:47.80226894 +0800 CST  deployed        kube-flannel-0.22.0             0.22.0     
kube-metrics-server     default         1               2023-06-13 03:03:08.929181082 +0800 CST deployed        kube-metrics-server-0.6.3       0.6.3

# 查看 Pod 的的状态
$ kubectl get po -n kube-system
NAME                                         READY   STATUS    RESTARTS   AGE
kubernetes-dashboard-6bccb5f4cc-rm469        1/1     Running   0          20s
kubernetes-metrics-scraper-dcffb9579-dm7jx   1/1     Running   0          20s
```

### 创建访问凭证

```bash
# 创建一个临时的登录 token（1 小时有效）
$ kubectl create token -n kube-system dashboard-admin
eyJhbGciOiJSUzI1NiIsImtpZCI6ImRJc2ZQY2F1cGRTcVlSZGFsdmgtY2xsYlhQZHRSTHlsVGZYM3BWc21nMVUifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxNjg2NjAwMzcxLCJpYXQiOjE2ODY1OTY3NzEsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJrdWJlcm5ldGVzLWRhc2hib2FyZCIsInNlcnZpY2VhY2NvdW50Ijp7Im5hbWUiOiJkYXNoYm9hcmQtYWRtaW4iLCJ1aWQiOiIwN2E2OTcwYi0xYWExLTRiOTEtYmVlMi00ZTA3ODFiNGFiNWQifX0sIm5iZiI6MTY4NjU5Njc3MSwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50Omt1YmVybmV0ZXMtZGFzaGJvYXJkOmRhc2hib2FyZC1hZG1pbiJ9.P8NLU0xkALch8qY5pwoPVTEkKz5N4Vw9kvh1chU5AmsVFa1bUONSXRqkHZZXPSqDVFiVYxUTdZe1RJW3Vdv8-AsRnLFrMdNwxvE6H88UpMmtywtCga5QuR2N-bXCqTqyGdZqnehJSfWGQsdxvZ-_vrUvUyLIN_2PRo94FatIQ_XS5ooZ5pV4O97uHmiP95yndfsv5sgtRR3ww_A-wSabhl-Iop-b-Ax5Ql-4sKG2v_xGjgZzpBleFiun-ZHpDHez22oH2Z2CRTzPCfhmMr8Onbb_kyMnSzV-LN2QfVcYWKA5_oRZjnkUfa5H9j55WlkeX5NHHABkMbOEN08o2MClhw
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