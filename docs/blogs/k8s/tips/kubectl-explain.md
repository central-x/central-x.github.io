# 使用 kubectl explain 来确认 API 对象字段
## 概述
&emsp;&emsp;在编写配置文件时，开发者不一定完全能记得住每个对象有哪些属性、可选项等。开发者可以通过访问 Kubernetes 的参考文档[[链接](https://kubernetes.io/docs/concepts/overview/kubernetes-api/)]查看每个 API 对象支持哪些属性，也可以使用 kubectl explain 命令。

## 使用
&emsp;&emsp;通过 `kubectl explain pods` 命令来解释 pod

```bash
$ kubectl explain pods
KIND:       Pod
VERSION:    v1

DESCRIPTION:
    Pod is a collection of containers that can run on a host. This resource is
    created by clients and scheduled onto hosts.
    
FIELDS:
  apiVersion    <string>
    APIVersion defines the versioned schema of this representation of an object.
    Servers should convert recognized schemas to the latest internal value, and
    may reject unrecognized values. More info:
    https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources

  kind  <string>
    Kind is a string value representing the REST resource this object
    represents. Servers may infer this from the endpoint the client submits
    requests to. Cannot be updated. In CamelCase. More info:
    https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds

  metadata      <ObjectMeta>
    Standard object's metadata. More info:
    https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata

  spec  <PodSpec>
    Specification of the desired behavior of the pod. More info:
    https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#spec-and-status

  status        <PodStatus>
    Most recently observed status of the pod. This data may not be up to date.
    Populated by the system. Read-only. More info:
    https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#spec-and-status
```

&emsp;&emsp;通过 `kubectl explain pods.spec` 命令则可以更深入地查看 spec 属性:

```bash
$ kubectl explain pods.spec
KIND:       Pod
VERSION:    v1

FIELD: spec <PodSpec>

DESCRIPTION:
    Specification of the desired behavior of the pod. More info:
    https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#spec-and-status
    PodSpec is a description of a pod.
    
FIELDS:
  activeDeadlineSeconds <integer>
    Optional duration in seconds the pod may be active on the node relative to
    StartTime before the system will actively try to mark it failed and kill
    associated containers. Value must be a positive integer.

  affinity      <Affinity>
    If specified, the pod's scheduling constraints

  automountServiceAccountToken  <boolean>
    AutomountServiceAccountToken indicates whether a service account token
    should be automatically mounted.

  containers    <[]Container> -required-
    List of containers belonging to the pod. Containers cannot currently be
    added or removed. There must be at least one container in a Pod. Cannot be
    updated.

  ...

  volumes       <[]Volume>
    List of volumes that can be mounted by containers belonging to the pod. More
    info: https://kubernetes.io/docs/concepts/storage/volumes
```