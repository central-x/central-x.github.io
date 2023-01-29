# Kubernetes API 服务器的安全防护
## 概述
&emsp;&emsp;运行在 Pod 中的应用可以于 API 服务器交互来查看和控制部署在集群中的资源状态（如 kubernetes dashboard）。如果对 Pod 进行了过高的授权，那么 Pod 里面的恶意应用将可以轻易地控制集群（比如通过 path traversal 或者 directory traversal 攻击获取 token，并用这个 token 运行恶意的 pod），带来了数据、应用上的风险。

&emsp;&emsp;Kubernetes 支持通过 RBAC 的方式进行授权，用于在安全的方式下对应用进行恰当地授权。

- ServiceAccount: ServiceAccount 代表一种非人类操作的帐户，主要用于向应用 Pods、系统组件之类的进行授权。
- Role 和 RoleBinding: 普通权限控制，主要控制指定命名空间下的资源。
- ClusterRole 和 ClusterRoleBinding: 集群权限控制，主要控制集群资源（如 Namespace 等）


## ServiceAccount
&emsp;&emsp;每个 Pod 都与一个 ServiceAccount 相关联，它代表了运行在 Pod 中应用程序的身份证明。ServiceAccount 就像 Pod、Secret、ConfigMap 等一样都是资源，它们作用在单独的命名空间。每个 Pod 都与一个 ServiceAccount 相关联，但是多个 Pod 可以使用同一个 ServiceAccount。Pod 只能使用同一个命名空间中的 Service Account。

> Pod 与 Kubernetes API 服务器通信时，通过 /var/run/secrets/kubernetes.io/serviceaccount/token 文件内容来进行身份认证。这个文件通过加密卷挂载进每个容器的文件系统中。

```bash
# 获取默认的 ServiceAccount
$ kubectl get sa
NAME      SECRETS   AGE
default   0         8d

```

&emsp;&emsp;在 Pod 的 manifest 文件中，如果不显式地指定 ServiceAccount 的帐户名称，那么 Pod 会使用这个命名空间中的默认 ServiceAccount。通过以下 manifest 可以声明一个 ServiceAccount。

- **service-account.kubernetes-dashboard.yaml**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: foo
  namespace: kube-app
```

- **pod.yaml**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: curl-custom-sa
spec:
  serviceAccountName: foo             # 声明该 Pod 使用 foo ServiceAccount，而不是默认的 ServiceAccount
  containers:
  - name: main
    image: tutum/curl
    command: ["sleep", "99999999"]
  - name: ambassador
    image: luksa/kubectl-proxy:1.6.2
```


```bash
# 在容器里调用 kubernetes api 服务器，查看是否可以正常访问资源
$ kubectl exec -it curl-custom-sa -c main curl localhost:8001/api/v1/pods

{
    "kind": "PodList",
    "apiVersion: "v1",
    "metadata": {
        "selfLink": "/api/v1/pods",
        "resourceVersion": "433895"
    },
    "items": [
        ...
    ]
}
```

## RBAC
&emsp;&emsp;在 Kubernetes 1.8.0 版本之后，RBAC 插件在很多集群中默认开启，Kubernetes 的集群安全性显著提高。RBAC 会阻止未授权的用户查看和修改集群的状态。除非你授予默认的 ServiceAccount 额外地特权，否则默认的 ServiceAccount 不允许查看集群状态。

> 除了 RBAC 插件，Kubernetes 也包含其他的授权插件，比如基于属性的访问控制插件 ABAC、WebHook 插件和自定义插件实现。但是 RBAC 插件是准备的。

&emsp;&emsp;在 Kubernetes 中，Pod、Server、Secret 等都是以 REST 资源的方式表示，通过 HTTP 方法（GET、POST、PUT）上表示对这些资源的操作。RBAC 授权插件主要就是通过控制客户端是否允许在请求的资源上执行请求动词来控制权限。


| HTTP 方法 | 单一资源的动词       | 集合的动词        |
|-----------|---------------------|-------------------|
| GET、HEAD  | get（watch 用于监听） | list （以及 watch） |
| POST      | create              | n/a               |
| PUT       | update              | n/a               |
| PATCh     | patch               | n/a               |
| DELETE    | delete              | deletecollection  |

### Role 和 RoleBinding
&emsp;&emsp;Role 资源定义了哪些操作可以在哪些资源上执行。

- **service-reader.yaml**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: foo                         # 指定 Role 所在的命名空间
  name: service-reader
rules:
- apiGroups: [""]                        # Service 是核心 apiGourp 的资源，所以没有 apiGroup 名，就是 ""
  verbs: ["get", "list"]                 # 授权获取独立的 Service（通过名称）、列出所有允许的服务
  resources: ["services"]                # 授权的资源
```

&emsp;&emsp;使用图来表示上面的 manifest 的含义。

![](./assets/role.svg)

&emsp;&emsp;创建角色后，则需要创建一个 RoleBinding 资源，将 Role 和 ServiceAccount 绑定，完成授权过程。

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: test
  namespace: foo
  ...
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: service-reader                  # 引用了 service-reader 角色
subjects:
- kind: ServiceAccount
  name: default                         # 绑定到 foo 命名空间中的 default ServcieAccount 上
  namespace: foo
- kind: ServiceAccount
  name: default
  namespace: bar                        # 还可以给其它命名空间的 ServiceAccount 对象授权
```

### ClusterRole 和 ClusterRoleBinding
&emsp;&emsp;ClusterRole 和 ClusterRoleBinding 是集群级别的 RBAC 资源，它们不在命名空间里。一个常规角色只允许访问和角色在同一个命名空间中的资源。如果你希望允许跨不同命名空间访问资源，就必须在每个命名空间中创建一个 Role 和 RoleBinding。同时，还有一些特定资淅完全不在命名空间中（如 Node、PersistentVolume、Namespace 等），因此需要通过 ClusterRole 进行授权。

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pv-reader
rules:
- apiGroups: [""]
  resources: ["configmaps", "endpoints", "persistentvolumeclaims", "pods", "replicationcontrollers", "replicationcontrollers/scale", "serviceaccounts", "services"]
  verbes: ["get", "list"]
- nonResourceURLS: # 对非资源型的 URL 进行授权
  - /api
  - /api/*
  - /apis
  - /apis/*
  - /healthz
  - /swaggerapi
  - /swaggerapi/*
  - /version
  verbes: ["get"]
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: test
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: pv-reader
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:authenticated            # 对所有已登录的用户（系统内置分组）进行授权
- kind: ServiceAccount
  name: default
  namespace: bar                        # 对指定 ServiceAccount 授权
```

> 系统内置分组包含以下
>
> - `system:authenticated`: 所有已登录的用户
> - `system:unauthenticated`: 所有未登录的用户
> - `system:serviceaccounts`: 包含所有在系统中的 ServiceAccount
> - `system:serviceaccounts:<namespace>`: 包含所有在特定命名空间中的 ServiceAccount

## 总结


| 访问的资源                                                         | 使用的角色类型 | 使用的绑定类型     |
|--------------------------------------------------------------------|----------------|--------------------|
| 集群级别的资源（Nodes、PersistentVolumes、...）                        | ClusterRole    | ClusterRoleBinding |
| 非资源型 URL（/api、/healthz、...）                                    | ClusterRole    | ClusterRoleBinding |
| 在任何命名空间中的资源（和跨所有命名空间的资源）                     | ClusterRole    | ClusterRoleBinding |
| 在具体命名空间中的资源（在多个命名空间中重用这个相同的 ClusterRole） | ClusterRole    | RoleBinding        |
| 在具体命名空间中的资源（Role必须在每个命名空间中定义）               | Role           | RoleBinding        |

