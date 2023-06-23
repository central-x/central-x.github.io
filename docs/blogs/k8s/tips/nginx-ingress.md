# Nginx 反向代理 Ingress
## 概述
&emsp;&emsp;Ingress 作为 Kubernetes 集群的流量入口，通常有两种暴露的方法:

- 直接暴露给用户访问：Ingress Controller 直接作为用户流量入口，再将流量分发给内部服务。这种方法存在以下问题：
   - Ingress 不支持通过 IP 加端口的方式访问，因此需提前申请域名并设置好 DNS 解析；
   - 域名设置、路由设置散落到很多个 Ingress 资源里（当然也可以合成一个），如果要修改域名，可能会改漏或改错；
   - 一般只能实现一些简单的路由功能，如通过 host 或 path 将流量路由到指定的服务；
   - 涉及到一些高级用法时，Ingress 资源会与具体的 Ingress Controller 严重耦合，为了实现功能使用了大量自定义的 Annotations。
- 代理后给用户访问：在 Ingress Controller 前面还有层类似 Nginx 这样的反向代理服务，经代理后转发给 Ingress。这种方式存在以下好处：
   - 学习成本低，可以复用之前学习到的 Nginx 的知识；
   - 可以支持通过不同的域名、不同的路径、不同的端口将流量转发到指定的 Ingress 资源；
   - 可以轻松在 Nginx 里面实现高级功能，Ingress 只保留最简单的路由方法，不需具体的 Ingress Controller 实现耦合；

> 以上提到提到的内容，都是基于官方维护的 Ingress Nginx Controller 来描述的。

## 问题描述
&emsp;&emsp;使用 Nginx 作为反向代理的时候，会发现如果外部代理域名与 Kubernetes 路由域名不一致时，会导致一系列问题，如重定向不正确等等。

&emsp;&emsp;在 Kubernetes 里面，我声明了一个 Ingress 资源，用于将域名为 `prod.cluster.k8s` 的请求路由到网关进行处理，资源如下:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: central-studio
  namespace: prod
spec:
  ingressClassName: nginx
  rules:
    - host: prod.cluster.k8s
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: central-gateway
                port:
                  name: http
```

&emsp;&emsp;在 Nginx 中，我声明了一个 server 节点，用于将域名 `test.central-x.com` 下的所有请求转发到 Kubernetes 集群的生产环境里（也就是 prod.cluster.k8s），声明如下:

```nginx
server {
    listen                443 ssl;
    server_name           test.central-x.com;
    ssl_certificate       /etc/nginx/conf.d/ssl/central-x.com.pem;
    ssl_certificate_key   /etc/nginx/conf.d/ssl/central-x.com.key;

    # 将所有请求转发至网关
    location / {
        # 将流量转发到 Ingress Controller 所在的 Kubernetes 节点
        proxy_pass             http://10.10.20.21:80;
        proxy_redirect         default;
        client_max_body_size   1000m;

        # 将请求的相关信息封状成头部传递给被代理的服务，避免获取到错误的信息
        # 以 prod.cluster.k8s 的域名发送流量给 Ingress Controller
        proxy_set_header   Host                prod.cluster.k8s;
        # 传递用户访问时的真实请求信息
        proxy_set_header   X-Forwarded-Host    $http_host;
        proxy_set_header   X-Forwarded-For     $remote_addr;
        proxy_set_header   X-Forwarded-Proto   $scheme;
        proxy_set_header   X-Forwarded-Port    $server_port;

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

&emsp;&emsp;完成以上配置后进行测试：

- 访问地址：

`GET https://test.central-x.com/dashboard/`

- 期望（重定向到统一认证）：

`https://test.central-x.com/security?redirect_uri=https%3A%2F%2Ftest.central-x.com%2Fdashboard%2F`

- 结果：
`http://prod.cluster.k8s/security?redirect_uri=https%3A%2F%2Ftest.central-x.com%2Fdashboard%2F`

&emsp;&emsp;可以发现无论是域名还是协议（甚至端口），应用都识别错误了。

## 解决方法（省流）
&emsp;&emsp;部署 Ingress Nginx 时，修改 values 文件，将 `controller.config` 选项，添加 `use-forwarded-headers: true` 配置。

```yaml
controller:
  config:
    use-forwarded-headers: true
```

## 排查过程与解决方法
&emsp;&emsp;首先，以上配置在非 Kubernetes 集群中是可以正常工作的，但是部署到 Kubernetes 集群中之后，就无法正常工作了。在网关中的日志中，输出 `X-Forwarded-*` 相关的请求头：

```
Host=[prod.cluster.k8s] X-Forwarded-Host=[prod.cluster.k8s] X-Forwarded-Proto=[http] X-Forwarded-For=[10.10.1.2]
```

&emsp;&emsp;通过以上日志，可以发现网关在接收到请求时，`X-Forwarded-*` 相关的请求头已经被篡改。已知在 Nginx 和网关的通信之间，只隔了个 Ingress Controller，而这个 Ingress Controller 内部是通过 Nginx 实现的，因此可以进入容器看看 Ingress Nginx Controller 根据 Ingress 自动生成的配置是怎么样的。

```bash
# 进入 ingress nginx controller 容器
$ kubectl exec -it ingress-nginx-controller-h5ltl -n ingress-nginx -- bash

# 测试 Nginx，可以找到配置文件地址
$ nginx -t
2023/07/06 16:53:04 [warn] 312#312: the "http2_max_field_size" directive is obsolete, use the "large_client_header_buffers" directive instead in /etc/nginx/nginx.conf:145
nginx: [warn] the "http2_max_field_size" directive is obsolete, use the "large_client_header_buffers" directive instead in /etc/nginx/nginx.conf:145
2023/07/06 16:53:04 [warn] 312#312: the "http2_max_header_size" directive is obsolete, use the "large_client_header_buffers" directive instead in /etc/nginx/nginx.conf:146
nginx: [warn] the "http2_max_header_size" directive is obsolete, use the "large_client_header_buffers" directive instead in /etc/nginx/nginx.conf:146
2023/07/06 16:53:04 [warn] 312#312: the "http2_max_requests" directive is obsolete, use the "keepalive_requests" directive instead in /etc/nginx/nginx.conf:147
nginx: [warn] the "http2_max_requests" directive is obsolete, use the "keepalive_requests" directive instead in /etc/nginx/nginx.conf:147
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful

# 查看配置文件
$ vi /etc/nginx/nginx.conf
```

&emsp;&emsp;找到配置文件，发现果然是 Ingress Nginx Controller 生成的 Nginx 配置文件将外部流量的请求头给覆盖了。Ingress Nginx Controller 会覆盖以下 `X-Forwarded-*` 请求头:

- X-Real-IP
- X-Forwarded-For
- X-Forwarded-Host
- X-Forwarded-Port
- X-Forwarded-Proto
- X-Frowarded-Scheme
- X-Scheme

```nginx
## start server prod.cluster.k8s                                                                                                                 
server {                                                                                                                                         
    server_name prod.cluster.k8s ;                                                                                                           
                                                                                                                                             
    listen 80  ;                                                                                                                             
    listen [::]:80  ;                                                                                                                        
    listen 443  ssl http2 ;                                                                                                                  
    listen [::]:443  ssl http2 ;                                                                                                             
                                                                                                                                             
    set $proxy_upstream_name "-";                                                                                                            
                                                                                                                                             
    ssl_certificate_by_lua_block {                                                                                                           
            certificate.call()                                                                                                               
    }                                                                                                                                        
                                                                                                                                             
    location / {              
        # 其它配置
        ...                                                                                                   
                                                                 
        set $proxy_host          $proxy_upstream_name;                                                                                   
        set $pass_access_scheme  $scheme;                                                                                                

        set $pass_server_port    $server_port;                                                                                           

        set $best_http_host      $http_host;                                                                                             
        set $pass_port           $pass_server_port;                                                                                      

        set $proxy_alternative_upstream_name "";                                                                                         

        client_max_body_size                    1m;                                                                                      
 
        proxy_set_header Host                   $best_http_host;

        # Pass the extracted client certificate to the backend                

        # Allow websocket connections
        proxy_set_header                        Upgrade           $http_upgrade;

        proxy_set_header                        Connection        $connection_upgrade;
                                                                                                                                         
        proxy_set_header X-Request-ID           $req_id;
        proxy_set_header X-Real-IP              $remote_addr;

        proxy_set_header X-Forwarded-For        $remote_addr;

        proxy_set_header X-Forwarded-Host       $best_http_host;
        proxy_set_header X-Forwarded-Port       $pass_port;
        proxy_set_header X-Forwarded-Proto      $pass_access_scheme;
        proxy_set_header X-Forwarded-Scheme     $pass_access_scheme;

        proxy_set_header X-Scheme               $pass_access_scheme;

        # Pass the original X-Forwarded-For
        proxy_set_header X-Original-Forwarded-For $http_x_forwarded_for;

        # 其它配置
        ...
    }
}
## end server prod.cluster.k8s
```

&emsp;&emsp;排查到是 Ingress Nginx Controller 自动生成的 Nginx 的配置将我们的请求头覆盖之后，那么就要想办法去解决这个问题了。由于上述文件是 Ingress Nginx Controller 根据 Kuberneters 集群里所有 Ingress 的配置自动生成出来的，因此我们不能直接修改上面的配置。查看 Ingress Nginx Controller 的官网[[链接](https://kubernetes.github.io/ingress-nginx)]，在 ConfigMap 一这篇文档里[[链接](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/#use-forwarded-headers)]找到了 `use-forwarded-headers` 选项，该选项描述如下：

```
If true, NGINX passes the incoming X-Forwarded-* headers to upstreams. 
Use this option when NGINX is behind another L7 proxy / load balancer 
that is setting these headers.

If false, NGINX ignores incoming X-Forwarded-* headers, filling them with 
the request information it sees. Use this option if NGINX is exposed 
directly to the internet, or it's behind a L3/packet-based load balancer 
that doesn't alter the source IP in the packets.
```

&emsp;&emsp;上面描述，如果 Ingress Nginx Controller 在另一个 L7 层代理/负载均衡器后面，需要将 `use-forwarded-headers` 设置为 true，那么 Ingress Nginx Controller 将会转发 `X-Forwarded-*` 相关的请求头；如果 Ingress Nginx Controller 直接暴露到互联网或在一个 L3 层负载均衡器后面，则需要将 `use-forwarded-headers` 设置为 fase，Ingress Nginx Controller 将会忽略传递进来的 `X-Forwarded-*` 请求头。

&emsp;&emsp;因此，最后我们只需要在部署 ingress-nginx 时，修改 values.yaml 文件，为 controller.config 添加新选项 `use-forwarded-headers` 。

```yaml
controller:
  config:
    use-forwarded-headers: true
```

```bash
# 更新生产环境的服务
$ helm install central-studio central-studio.tgz
```

&emsp;&emsp;再次测试，发现网关已经可以正常获取 scheme、host、port 的值，保证后续的工作。。