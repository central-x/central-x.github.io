# 安装 Ingress Controller
## 概述
&emsp;&emsp;Kubernetes 集群默认没有部署 Ingress Controller，因此 Ingress 资源将无法正常工作。此时需要我们根据自身情况选择相关 Ingress Controller 的实现部署到集群中。

&emsp;&emsp;Ingress Controller 有多种开源实现，包括 HAProxy、Treafik、Kubernetes 官方维护的 Nginx Controller、Nginx 官方维护的开源版和商业版的 Nginx Controller。一般情况下，我们选择使用 Kubernetes 官方维护的 Nginx Controller 即可。

&emsp;&emsp;更多关于 Ingress 的信息，可以查看 Kubernetes in Action 系列文章的网络服务 Ingress 章节[[链接](/blogs/k8s/action/service#ingress)]。

## 操作步骤
### 为节点打标签
&emsp;&emsp;Ingress Controller 的 Pod 会被调度到在带有 `cluster.k8s/ingress=enabled` 标签的节点上，因此我们需要提前在指定的节点上打上该标签。

```bash
# 为节点打上 cluster.k8s/ingress=enabled 标签，让 Kubernetes 将 Ingress Controller 调度到这个节点
$ kubectl label node node1.cluster.k8s cluster.k8s/ingress=enabled
node/node1.cluster.k8s labeled

# 如果要做高可用，最少要在 2 个节点打上 cluster.k8s/ingress=enabled 标签
$ kubectl label node node2.cluster.k8s cluster.k8s/ingress=enabled
node/node2.cluster.k8s labeled
```


::: info 提示
`cluster.k8s/ingress=enabled` 标签是运维规约[[链接](/blogs/k8s/setup/convention)]中的内容，更多信息可以查看该文档的内容。
:::

### 部署 Ingress-Nginx
&emsp;&emsp;我们通过 helm 部署 Ingress-Nginx 到 ingress-nginx 命名空间里。

```bash
# 安装 Ingress Nginx Controller
$ helm install ingress-nginx mirror/ingress-nginx -n ingress-nginx --create-namespace
NAME: ingress-nginx
LAST DEPLOYED: Tue Jun 13 03:24:24 2023
NAMESPACE: ingress-nginx
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
The ingress-nginx controller has been installed.
It may take a few minutes for the LoadBalancer IP to be available.
You can watch the status by running 'kubectl --namespace ingress-nginx get services -o wide -w ingress-nginx-controller'

An example Ingress that makes use of the controller:
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  metadata:
    name: example
    namespace: foo
  spec:
    ingressClassName: nginx
    rules:
      - host: www.example.com
        http:
          paths:
            - pathType: Prefix
              backend:
                service:
                  name: exampleService
                  port:
                    number: 80
              path: /
    # This section is only required if TLS is to be enabled for the Ingress
    tls:
      - hosts:
        - www.example.com
        secretName: example-tls

If TLS is enabled for the Ingress, a Secret containing the certificate and key must also be provided:

  apiVersion: v1
  kind: Secret
  metadata:
    name: example-tls
    namespace: foo
  data:
    tls.crt: <base64 encoded cert>
    tls.key: <base64 encoded key>
  type: kubernetes.io/tls
```

### 查看部署状态
&emsp;&emsp;完成以上步骤，Ingress Nginx Controller 就基本部署完了。我们可以通过以下命令去查看 Ingress Controller 的运行情况。

```bash
# 获取 Ingress Controller 的 Pod 工作状态
# 由于我们给两个节点打上了 cluster.k8s/ingress=enabled 标签，因此这两个节点都会被调度
$ kubectl get po -n ingress-nginx
NAME                             READY   STATUS    RESTARTS   AGE
ingress-nginx-controller-f6bbd   1/1     Running   0          29s
ingress-nginx-controller-h5ltl   1/1     Running   0          29s

# 获取 Ingress Controller 的 Pod 的详细状态
# 可以发现 Pod 是通过 DaemonSet 管理的，因此会被调度到所有带有 cluster.k8s/ingress=enabled 标签的节点
# 后续就可以通过这些节点的 IP 来访问 Ingress 了
$ kubectl describe po ingress-nginx-controller-f6bbd -n ingress-nginx
Name:             ingress-nginx-controller-f6bbd
Namespace:        ingress-nginx
Priority:         0
Service Account:  ingress-nginx
Node:             node1.cluster.k8s/10.10.20.21
Start Time:       Tue, 13 Jun 2023 03:24:28 +0800
Labels:           app.kubernetes.io/component=controller
                  app.kubernetes.io/instance=ingress-nginx
                  app.kubernetes.io/managed-by=Helm
                  app.kubernetes.io/name=ingress-nginx
                  app.kubernetes.io/part-of=ingress-nginx
                  app.kubernetes.io/version=1.8.0
                  controller-revision-hash=746876ff65
                  helm.sh/chart=ingress-nginx-4.7.0
                  pod-template-generation=1
Annotations:      <none>
Status:           Running
IP:               10.10.20.21
IPs:
  IP:           10.10.20.21
Controlled By:  DaemonSet/ingress-nginx-controller
```