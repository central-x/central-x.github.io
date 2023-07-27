# 运维规约
## 概述
&emsp;&emsp;Kubernetes 在管理的过程中，经常通过各种方式管理集群。为了保证所有运维人员使用同一种思路管理集群，本章节总结了日常管理过程中常见的配置，即管理约定。

## 节点
&emsp;&emsp;通过对节点的命名，我们可以很直观地了解节点的主要作用。一般情况下，节点的命名遵循以下规则。

| 节点名称                   | 节点作用                                                                                   |
|------------------------|----------------------------------------------------------------------------------------|
| svc.cluster.k8s        | 服务节点，主要向集群提供 DNS 服务、Yum Repository、Docker Registry、Helm Repository 等服务。后续运维工作主要在此节点完成。 |
| master.cluster.k8s     | 主节点入口地址，是主节点集群的负载入口。该域名可能是虚拟 IP（VIP）、F5 或 Nginx 等，尽量保证该节点的高可用性和稳定性。                    |
| ingress.cluster.k8s    | 集群的流量负载入口，负责将客户端的流量负载到集群内部。该域名可能是虚拟 IP（VIP）、F5 或 Nginx 等，尽量保证该节点的高可用性和稳定性。             |
| master[x].cluster.k8s  | 主节点工作节点，一般是奇数个节点。普通应用不要调度到主节点上                                                         |
| node[x].cluster.k8s    | 工作节点，应用主要运行在这些节点上                                                                      |
| db[x].cluster.k8s      | 数据库节点（非必须），主要部署数据库、ES 等服务。一般直接物理机部署，如果用 Kubernetes 部署，数据卷可以挂 hostPath 以提高写入性能。         |
| storage[x].cluster.k8s | 存储集群（非必须），主要向集群提供文件存储，可以在这些节点上部署 NFS 或 Ceph 集群。                                        |

&emsp;&emsp;节点名可以通过以下命令修改。注意，修改完节点名之后，需要在 svc.cluster.k8s 的 DNS 解析记录中添加一条记录，这样以后就可以通过主机名访问节点了。

```bash
$ hostnamectl --static set-hoatname <name>.cluster.k8s
```

## 命名空间
&emsp;&emsp;命名空间主要用于隔离各种资源，方便将资源隔离管理。这里列出常用的命名空间。

- `kube-system`：Kubernetes 集群管理资源，如 etcd、kube-apiserver、kube-controller、kube-proxy、kube-scheduler
  等资源都在这个命名空间里。一般情况下，将保障集群运行的资源放在这个命名空间里。注意不要将普通的应用部署到该命名空间里。
- `prod`：生产环境命名空间。用于向用户提供服务。
- `pre`：预发布环境命名空间。用于提供给运维人员验证应用程序。
- `test`：测试环境命名空间。用于提供给测试人员执行测试用例等。
- `dev`：开发环境命名空间。用于提供给开发人员进行开发、联调、测试等。

&emsp;&emsp;在部署、更新资源前，如果不带 `-n <namespace>` 参数的话，默认是操作当前命名空间。因此我们在更新资源前，应检查当前命名空间是否正确后，再进行资源相关操作。

```bash
# 获取当前所处命名空间信息
$ kubectl config view | grep namespace
    namespace: prod

# 创建命名空间（预发布环境）
$ kubectl create namespace pre

# 切换命名空间（切换到预发布环境）
# 后续所有不带 -n <namespace> 的命令，都默认会在 pre 命名空间中执行
$ kubectl config set-context --current --namespace=pre
Context "kubernetes-admin@kubernetes" modified.
```

## 标签
### 节点（Node）标签
&emsp;&emsp;Kubernetes 在完成 Pod 时调度工作时，一般通过标签（Label）进行管理。通过标签，可以标记节点的一些特殊属性，Pod
就可以通过这些标签进行组合，从而找到最合适的节点部署 Pod。

::: tip 提示
&emsp;&emsp;除了使用标签，还会使用污点（Taint）、容忍度（Toleration）、亲缘性（Affinity）等来完成更高级的调度管理，具体可以查看
Kubernetes in Action 系列的调度管理[[链接](/blogs/k8s/action/advanced-scheduling)]。
:::

&emsp;&emsp;常用于节点标签如下:

- `cluster.k8s/ingress=enabled`：标识该节点为集群流量入口。
- `cluster.k8s/egress=enabled`：标识该节点为集群流量出口。
- 待补充

### 资源标签
&emsp;&emsp;资源标签有两种作用，一是标记该资源一些基本信息，二是用于做标签选择器。

&emsp;&emsp;一般情况下，资源基本信息（metadata）标签应选用以下标签:

- `app.kubernetes.io/product`: 用于标记应用所属产品名称
- `app.kubernetes.io/name`: 用于标记应用名称
- `app.kubernetes.io/version`: 用于标记应用版本
- `app.kubernetes.io/managed-by`: 用于标记应用受什么管理，此值一般固定为 Helm
- `helm.sh/chart`: Helm Chart 名称与版本号

&emsp;&emsp;选择器（selector）标签应选用以下标签:

- `app.kubernetes.io/product`: 用于标记应用所属产品名称
- `app.kubernetes.io/name`: 用于标记应用名称
- `app.kubernetes.io/instance`: 用于标记应用实例名

### 标签管理
&emsp;&emsp;通过以下命令可以管理节点标签。

```bash
# 为资源添加标签
$ kubectl label node node1.cluster.k8s cluster.k8s/ingress=enabled
node/node1.cluster.k8s labeled

# 修改资源标签
$ kubectl label node node1.cluster.k8s cluster.k8s/ingress=disabled --overwrite
node/node1.cluster.k8s labeled

# 为资源删除标签
$ kubectl label node node1.cluster.k8s cluster.k8s/ingress-
node/node1.cluster.k8s unlabeled
```