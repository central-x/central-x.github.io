# 流量入口（ingress）与出口（egress）
## 概述
&emsp;&emsp;在上一章节中，我们在 Kubernetes 集群部署了 Ingress Controller。Ingress Controller 的 Pod
会调度到带有 `cluster.k8s/ingress=enabled` 标签的节点上。一般情况下，你可以直接将这些节点的 IP
提供给用户去访问，但是这将会带来单点故障问题（如果这个节点挂了，那么用户产生的流量将无法到达集群）。
为了保证入口节点的高可用，我们需要在 Ingress Controller 之前部署一个负载均衡器，也就是
ingress.cluster.k8s，由这个负载均衡器将用户产生的流量负载到集群的 Ingress Controller 中。

&emsp;&emsp;另外，在生产环境中，我们的应用系统经常也需要与其它业务系统进行通信。为了保证通信安全，网络安全管理员一般情况下只会为指定的服务器节点开通网络连通策略。
根据 Kubernetes 的调度逻辑，会将 Workload Pod 随机调度到合适这个 Pod 运行的节点上，这些节点不一定会开通对外访问的网络策略。因此我们需要在
Kubernetes 集群里固定流量的出口，并开通这个流量出口节点的对外网络策略，从而打通外部系统。这个出口我们一般称之为 egress。

## 流量入口（ingress）
&emsp;&emsp;在 Kubernetes in Setup 的总体概述文档中[[链接](/blogs/k8s/setup/)]，我们定义了 ingress.cluster.k8s
节点作为集群的流量入口，再由这个节点的负载均衡器将用户的流量负载到 Ingress Controller 的 Pod 所在的节点中。工作原理图如下：

![](./assets/ingress.svg)

&emsp;&emsp;在前面的文档里面，我们提到说负载均衡器有多种实现方式。可以选用物理负载均衡器或软件负载均衡器将流量负载到
Ingress
Controller
上。由于不同的物理负载均衡器有不同的配置方式，本文档以软件负载均衡器（Nginx）为例进行说明。

### 总配置
&emsp;&emsp;修改 `/etc/nginx/nginx.conf` 配置文件，定义 Nginx 的总体配置信息。

```nginx
user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log notice;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    log_format            main  '[$time_local] $remote_addr -> $http_host "$request $status" '
                                'Body-Length=[$body_bytes_sent] Referer=[$http_referer] '
                                'User-Agent=[$http_user_agent] X-Forwarded-For=[$http_x_forwarded_for]';

    access_log            /var/log/nginx/access.log  main;

    sendfile              on;
    tcp_nopush            on;
    tcp_nodelay           on;
    keepalive_timeout     65;
    types_hash_max_size   4096;

    include               /etc/nginx/mime.types;
    default_type          application/octet-stream;
    server_tokens	      off;

    include               /etc/nginx/conf.d/*.conf;
}
```

### 定义 Ingress 入口负载
&emsp;&emsp;添加 `/etc/nginx/conf.d/ingress.cluster.k8s.conf` 配置文件，该配置文件定义了一个负载均衡入口，将流量负载到
Ingress Controller
的 Pod 所在的节点中。文件内容如下:

```nginx
# 定义 ingress 入口，将流量负载到 Ingress Controller
upstream ingress {
    server 10.10.20.21;   # node1.cluster.k8s
    server 10.10.20.22;   # node2.cluster.k8s
}
```

::: tip 提示
&emsp;&emsp;在上一篇文档中，我们为 node1.cluster.k8s 和 node2.cluster.k8s 两个节点添加了 cluster.k8s/ingress=enabled
标签，因此我们需要将流量转发到这两个节点上的 Ingress Controller 上。
:::

### 定义集群管理入口
&emsp;&emsp;在下一篇文档里，我们会介绍如何部署 Kubernetes Dashboard。通过 Kubernetes Dashboard 这个可视化工具，我们可以很直观地去查看和管理
Kubernetes 集群。为了能够访问这个工具，我们需要定义 Kubernetes Dashboard 的访问入口。

&emsp;&emsp;除了 Kubernetes Dashboard，我们可能还存在其它集群管理工具。这些通用的、与环境/命名空间（namespace）无关的集群管理工具，我们可以将其集中起来管理。这些管理工具的入口，定义在
`/etc/nginx/conf.d/cluster.k8s.conf` 配置文件里。

```nginx
# 集群管理管理
# Kubernetes 控制台
server {
    listen                443 ssl; # Kubernetes Dashboard 要求必须使用 https 访问
    server_name           dashboard.cluster.k8s;
    ssl_certificate       /etc/nginx/conf.d/ssl/cluster.k8s.pem;
    ssl_certificate_key   /etc/nginx/conf.d/ssl/cluster.k8s.key;
    access_log            /var/log/nginx/dashboard_access.log  main;

    location / {
        proxy_pass             http://ingress; # 将流量导入 ignress 入口
        proxy_redirect         default;
        client_max_body_size   1024m;

        # 传递代理信息
        proxy_set_header   Host                dashboard.cluster.k8s;
        proxy_set_header   X-Real-IP           $remote_addr;                 # 用户真实 IP
        proxy_set_header   X-Forwarded-Host    $http_host;                   # 用户访问服务器的真实域名
        proxy_set_header   X-Forwarded-Port    $server_port;                 # 用户访问服务器的真实端口
        proxy_set_header   X-Forwarded-Proto   $scheme;                      # 用户访问服务器的真实协议
        proxy_set_header   X-Forwarded-For     $proxy_add_x_forwarded_for;   # 反向代理路径

        # WebSocket 支持
        proxy_http_version      1.1;
        proxy_set_header        Upgrade      $http_upgrade;
        proxy_set_header        Connection   'upgrade';
        proxy_connect_timeout   60s;
        proxy_read_timeout      60s;
        proxy_send_timeout      60s;
    }
}

# Nexus 私有仓库
server {
    listen 80;
    server_name mirror.cluster.k8s;
    access_log  /var/log/nginx/nexus_access.log  main;

    location / {
        proxy_pass             http://10.10.20.0; # 将流量转发到 svc.cluster.k8s 节点上
        proxy_redirect         default;
        client_max_body_size   1024m;

        # 传递代理信息
        proxy_set_header   Host                mirror.cluster.k8s;
        proxy_set_header   X-Real-IP           $remote_addr;                 # 用户真实 IP
        proxy_set_header   X-Forwarded-Host    $http_host;                   # 用户访问服务器的真实域名
        proxy_set_header   X-Forwarded-Port    $server_port;                 # 用户访问服务器的真实端口
        proxy_set_header   X-Forwarded-Proto   $scheme;                      # 用户访问服务器的真实协议
        proxy_set_header   X-Forwarded-For     $proxy_add_x_forwarded_for;   # 反向代理路径

        # WebSocket 支持
        proxy_http_version      1.1;
        proxy_set_header        Upgrade      $http_upgrade;
        proxy_set_header        Connection   'upgrade';
        proxy_connect_timeout   60s;
        proxy_read_timeout      60s;
        proxy_send_timeout      60s;
    }
}
```

::: tip 提示
&emsp;&emsp;Kubernetes Dashboard 节点上使用到了 ssl 证书，这个证书是自签名证书，是不受信任的证书。用户在访问这个地址时，浏览器会报证书警告。
如果想消除这个警告，可以将 `Minstone Root CA.crt` 证书导入到客户电脑的信任证书列表中。
:::

### 定义环境/命名空间入口
&emsp;&emsp;在 Kubernetes 中，可以通过命名空间将 Pod 隔离成一个一个环境，如生产环境（prod）、预发布环境（pre）、测试环境（test）、
开发环境（dev）等，因此我们需要定义这些环境的流量入口。为了方便后续的运维，我们通过以下方式命名各个环境的入口配置文件：

- prod.cluster.k8s.conf: 定义生产环境的流量匹配规则
- pre.cluster.k8s.conf: 定义预发布环境的流量匹配规则
- test.cluster.k8s.conf: 定义测试环境的流量匹配规则
- dev.cluster.k8s.conf: 定义开发环境的流量匹配规则

&emsp;&emsp;以下以生产环境（prod）为案例。新增 `/etc/nginx/conf.d/prod.cluster.k8s.conf` 配置文件，文件内容如下:

```nginx
# 生产环境
server {
    listen        80;            # 用户真实访问的端口
    server_name   example.com;   # 用户真实访问的域名 
    access_log    /var/log/nginx/a_prod_access.log   main;

    location / {
        proxy_pass http://ingress; # 将流量导入到 Kubernetes 集群
        proxy_redirect default;
        client_max_body_size 1024m;

        # 注意，Ingress 一般情况下都是通过域名来区分流量的
        # 因此这里需要修改为 Ingress 监听的域名
        proxy_set_header   Host                prod.cluster.k8s;

        # 传递代理信息
        proxy_set_header   X-Real-IP           $remote_addr;                 # 用户真实 IP
        proxy_set_header   X-Forwarded-Host    $http_host;                   # 用户访问服务器的真实域名
        proxy_set_header   X-Forwarded-Port    $server_port;                 # 用户访问服务器的真实端口
        proxy_set_header   X-Forwarded-Proto   $scheme;                      # 用户访问服务器的真实协议
        proxy_set_header   X-Forwarded-For     $proxy_add_x_forwarded_for;   # 反向代理路径

        # WebSocket 支持
        proxy_http_version      1.1;
        proxy_set_header        Upgrade      $http_upgrade;
        proxy_set_header        Connection   'upgrade';
        proxy_connect_timeout   60s;
        proxy_read_timeout      60s;
        proxy_send_timeout      60s;
    }
}
```

:::tip 提示
&emsp;&emsp;在搭建本集群的过程中，我们用到了很多域名，如 svc.cluster.k8s、mirror.cluster.k8s 等。这些域名其实都是虚假的域名，都是通过
svc.cluster.k8s 这个节点提供的 DNS 服务提供的解析服务。通过这些有意义的域名，我们可以很方便地记住和访问指定的服务器，而无需去背那些冰冷而无规律的
IP 地址。如果同时运维多个项目现场，通过这些域名映射关系，可以有效提升我们的运维效率。

&emsp;&emsp;但是，这些域名仅限于在服务器层面上面使用，用户在访问我们系统时，是无法通过类似 prod.cluster.k8s
这样的域名来访问我们的业务系统的（除非用户的电脑也将 DNS 服务器指向 svc.cluster.k8s 节点，或手动修改用户电脑的 hosts
文件）。因此，像生产环境这些流量入口，就存在着域名转换的过程，将客户实际访问的域名（也可能是 IP 地址），转换为我们内部域名。这个过程，我们一般通过修改请求的
Host 请求头来完成。
:::

## 流量出口（egress）
&emsp;&emsp;在概述章节中提到，网络安全管理员一般情况下只会为指定的服务器节点开通网络策略。因此，我们应该将这些节点作为集群流量的出口。通过为这些节点添加
`cluster.k8s/egress=enabled` 标签，让 Kubernetes 将流量出口 Pod 调度到这些节点上。工作原理图如下：

![](./assets/egress.svg)

### 选择出口节点
&emsp;&emsp;在上面的文档中提及，我们需要为这些已开通网络策略的节点打上标签，让 Kubernetes 将流量出口 Pod 调度到这些节点上。具体的过程如下：

```bash
# 为节点打上 cluster.k8s/egress=enabled 标签，让 Kubernetes 将代理服务调度到这个节点
$ kubectl label node node1.cluster.k8s cluster.k8s/egress=enabled
node/node1.cluster.k8s labeled

# 如果要做高可用，最少要在 2 个节点打上 cluster.k8s/egress=enabled 标签
$ kubectl label node node2.cluster.k8s cluster.k8s/egress=enabled
node/node2.cluster.k8s labeled
```

:::tip 提示
&emsp;&emsp;`cluster.k8s/egress=enabled` 标签是运维规约[[链接](/blogs/k8s/setup/convention)]中的内容，更多信息可以查看该文档的内容。

&emsp;&emsp;我们通过上面的命令，为 node1.cluster.k8s 节点和 node2.cluster.k8 节点添加了 cluster.k8s/egress=enabled
标签，因此代理服务会被调度到这两个节点上。运维人员在申请开通网络策略时，需要同时为这两个节点开通网络策略。
:::

### 部署代理服务
&emsp;&emsp;接下来，我们需要部署代理服务。代理服务可以选择以下两种方式：

1. API 网关：如果你的业务系统是采用了微服务架构，那么一般情况下会有 API 网关。如果 API 网关能满足业务需求，那么在部署 API
   网关时，通过节点选择器将 API 网关调度到带有 `cluster.k8s/engress=enabled` 标签的节点上即可。
2. Nginx 代理：如果你的业务系统是传统单体应用，或没有 API 网关产品（或 API 网关不能满足业务需求），那么也可以通过 Nginx
   来做代理服务。相当于 Nginx 为外部服务做反向代理。

&emsp;&emsp;这里介绍一种简单的 Nginx 代理服务的方案。通过 Helm 去定义一个 egress
服务，这个服务可以根据运维人员定义的代理规则生动生成代理服务（查看源码[[链接](https://github.com/central-x/charts/tree/master/egress)]
）。运维人员下载该 chart 之后，需要修改 values.yaml 文件，添加第三方服务的代理规则，如下：

```yaml
# 修改代理规则
routers:
  - name: dashboard               # 服务名
    scheme: https                 # 以指定协议访问服务
    host: dashboard.cluster.k8s   # 以指定的 Host 名访问服务
    targets: # 服务地址列表
      - 10.10.20.21:443
      - 10.10.20.21:443
    options: # 代理选项
      connectTimeout: 60          # 连接超时时间，默认 10s
      sendTimeout: 60             # 发送数据超时时间，默认 10s
      readTimeout: 60             # 读取数据超时时间，默认 10s
      clientMaxBodySize: 1024m    # 最大请求体大小，默认 16m
  - name: nexus
    scheme: http
    host: mirror.cluster.k8s
    targets:
      - 10.10.20.0
```

::: tip 提示
&emsp;&emsp;上面的示例中，将会生成两个服务（Service），分别是 dashboard 和
nexus。后续应用程序只需要通过访问 `http://dashboard` 和 `http://nexus` 就可以访问外部第三方服务了。
:::