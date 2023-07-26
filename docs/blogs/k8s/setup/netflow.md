# 集群流量入口与出口
## 概述


## Nginx 配置

```nginx
user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log notice;
pid        /var/run/nginx.pid;


events {
    worker_connections  1024;
}


http {
    log_format  main  '[$time_local] $remote_addr -> $http_host "$request $status" '
                      'Body-Length=[$body_bytes_sent] Referer=[$http_referer] '
                      'User-Agent=[$http_user_agent] X-Forwarded-For=[$http_x_forwarded_for]';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    server_tokens	off;

    include /etc/nginx/conf.d/*.conf;
}
```

```nginx
upstream ingress {
    server 10.10.20.21;   # node1.cluster.k8s
    server 10.10.20.22;   # node2.cluster.k8s
}
```

```nginx
# 集群管理
# Kubernetes 控制台
server {
    listen                443 ssl;
    server_name           dashboard.cluster.k8s;
    ssl_certificate       /etc/nginx/conf.d/ssl/cluster.k8s.pem;
    ssl_certificate_key   /etc/nginx/conf.d/ssl/cluster.k8s.key;
    access_log            /var/log/nginx/dashboard_access.log  main;

    location / {
        proxy_pass             http://ingress;
        proxy_redirect         default;
        client_max_body_size   1000m;

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
        proxy_pass             http://192.168.101.34;
        proxy_redirect         default;
        client_max_body_size   1000m;

        # 传递代理信息
        proxy_set_header   Host                mirror.cluster.k8s;
        proxy_set_header   X-Real-IP           $remote_addr;                 # 用户真实 IP
        proxy_set_header   X-Forwarded-Host    $http_host;                   # 用户访问服务器的真实域名
        proxy_set_header   X-Forwarded-Port    $server_port;                 # 用户访问服务器的真实端口
        proxy_set_header   X-Forwarded-Proto   $scheme;                      # 用户访问服务器的真实协议
        proxy_set_header   X-Forwarded-For     $proxy_add_x_forwarded_for;   # 反向代理路径

        # WebSocket 支持
        proxy_http_version	1.1;
        proxy_set_header        Upgrade      $http_upgrade;
        proxy_set_header        Connection   'upgrade';
        proxy_connect_timeout   60s;
        proxy_read_timeout	60s;
        proxy_send_timeout	60s;
    }
}
```

```nginx
# 生产环境

# 魔方平台
server {
    listen        80;
    server_name   prod.cluster.k8s;
    access_log    /var/log/nginx/mcube_prod_access.log  main;

    # 访问根路径时，重定向为主租户
    location =/ {
        rewrite [/] $scheme://$http_host/mcube;
    }

    # 将所有请求转发至网关
    location / {
        # 正则匹配路径的第一部份作为租户标识
        if ($uri ~ ^/(((?!/).)*).*) {
            set $tenant $1;
        }

	proxy_pass http://ingress;
        proxy_redirect default;
        client_max_body_size 1000m;

        # 设置租户信息
        proxy_set_header   X-MCube-Tenant	$tenant;
        proxy_set_header   X-MCube-TenantPath   /$tenant;

        # 将请求的相关信息封状成头部传递给网关
        proxy_set_header   Host                prod.cluster.k8s;
        proxy_set_header   X-Real-IP           $remote_addr;                 # 用户真实 IP
        proxy_set_header   X-Forwarded-Host    $http_host;                   # 用户访问服务器的真实域名
        proxy_set_header   X-Forwarded-Port    $server_port;                 # 用户访问服务器的真实端口
        proxy_set_header   X-Forwarded-Proto   $scheme;                      # 用户访问服务器的真实协议
        proxy_set_header   X-Forwarded-For     $proxy_add_x_forwarded_for;   # 反向代理路径

        # WebSocket 支持
        proxy_http_version	1.1;
        proxy_set_header        Upgrade      $http_upgrade;
        proxy_set_header        Connection   'upgrade';
        proxy_connect_timeout   60s;
        proxy_read_timeout	60s;
        proxy_send_timeout	60s;
    }
}
```