# 搭建 Kubernetes 1.27.4 集群
## 概述
&emsp;&emsp;记录 Kubernetes 1.27.4 在离线状态下的搭建高可用集群过程。

## 普通集群
### 服务器需求
&emsp;&emsp;搭建普通 Kubernetes 集群，最少需要用到 4 台具有 2 核 CPU 和 4GB 内存以上的服务器，操作系统为 CentOS7。各服务器与 IP 的规划如下：

| 主机名              | IP 地址        | 说明                                         |
|---------------------|----------------|----------------------------------------------|
| svc.cluster.k8s     | 10.10.20.0     | 服务节点，用于部署 DNS 服务、Nginx、Nexus3 服务 |
| storage.cluster.k8s | 10.10.20.1     | 存储节点，用于提供存储卷给 Pod 使用（非必要）   |
| master.cluster.k8s  | 10.10.20.10    | 主节点                                       |
| node[x].cluster.k8s | 10.10.20.21~22 | 工作节点（最少 2 台）                          |

### 网络拓扑
![](./assets/topo.svg)

&emsp;&emsp;不考虑单点故障的情况下，在完成 Kubernetes 集群的搭建之后，一般会选取其中一台服务器作为 Ingress Controller 的运行节点，这个节点的 IP 会提供给用户作为访问集群应用的入口。

## 高可用集群
### 服务器需求
&emsp;&emsp;搭建高可用 Kubernetes 集群，最少需要用到 7 台具有 2 核 CPU 和 4 GB 内存以上的服务器，操作系统为 CentOS 7。各服务器与 IP 的规划如下：

| 主机名                   | IP 地址        | 说明                                                                                                       |
|--------------------------|----------------|------------------------------------------------------------------------------------------------------------|
| svc.cluster.k8s          | 10.10.20.0     | 服务节点，用于部署 DNS 服务、Nginx、Nexus3 服务                                                               |
| storage.cluster.k8s      | 10.10.20.1     | 存储节点，用于提供存储卷给 Pod 使用（非必要）                                                                 |
| loadbalancer.cluster.k8s | 10.10.20.2     | 用户访问集群应用的负载入口（硬件负载均衡器或软件负载均衡器等，非必要）                                        |
| master.cluster.k8s       | 10.10.20.10    | 主节点负载入口（硬件负载均衡器或软件负载均衡器等。使用软件负载均衡器时可以复用 svc.cluster.k8s 节点的 Nginx） |
| master[x].cluster.k8s    | 10.10.20.11~1x | 主节点（搭建高可用集群最少需要 3 台）                                                                        |
| node[x].cluster.k8s      | 10.10.20.21~x  | 工作节点（最少 2 台）                                                                                        |

> &emsp;&emsp;loadbalancer.cluster.k8s 节点和 master.cluster.k8s 节点，有条件可以选用硬件负载均衡器，如 NetScaler、F5 等；也可以选用软件负载均衡器，如 Nginx、HAProxy、Keepalived 等。

### 网络拓扑
![](./assets/topo-high-availability.svg)

&emsp;&emsp;在完成 Kubernetes 集群的搭建之后，需要挑选其中的几台作为 Ingress Controller 的运行节点。loadbalancer.cluster.k8s 会将流量负载到这些节点，从而完成用户入口的高可用。