# Ingress 代理 https
## 概述
&emsp;&emsp;Ingress 作为 Kubernetes 集群的流量入口，需要将接收到的请求转发给内部的 Pod，在私有集群中，我们一般使用 Kubernetes 官方维护的 Nginx Ingress Controller。

&emsp;&emsp;正常情况下，Ingress 在代理内部 Pod 的流量时，都是走 http 协议，但是有一些 Pod 在监听端口时，已经实现了 https 协议，并要客户端发送过来的请求必须是 https 协议时，Ingress 的代理功能就会出现问题导致流量转发失败。

## 解决方案
&emsp;&emsp;如果我们使用 Nginx 在转发 https 请求时，一般通过以下方式去代理:

```nginx
server {
    # 监听端口
    listen 443 ssl;

    server_name local.central-x.com;
    ssl_certificate /usr/local/etc/nginx/ssl/central-x.com.pem;
    ssl_certificate_key /usr/local/etc/nginx/ssl/central-x.com.key;

    location / {
        // 将流量以 https 协议转发到目标服务
        proxy_pass https://127.0.0.1:6848;
        proxy_redirect default;
        client_max_body_size 1000m;

        # 设置当前端口对应的租户编码
        proxy_set_header X-MCube-Tenant test;

        # 将请求的相关信息封状成头部传递给网关
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Host $http_host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

&emsp;&emsp;使用 Ingress 配置转发时，Ingress Controller 生成的配置都是以 http 的方式转发的，我们需要在 annotations 中添加注解，告诉 Ingress Controller 在生成配置时以 https 的方式转发。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kube-dashboard
  annotations:
    # 告诉 Ingress Controller 以 https 协议转发流量
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
spec:
  ingressClassName: ingress
  rules:
    - host: dashboard.central-x.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kubernetes-dashboard
                port:
                  name: https
```