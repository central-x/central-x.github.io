# Nginx 的安装和使用
## 概述
&emsp;&emsp;记不住，写篇笔记。

## 安装步骤
### CentOS7

```bash
# 添加 Nginx 源
$ rpm -Uvh http://nginx.org/packages/centos/7/noarch/RPMS/nginx-release-centos-7-0.el7.ngx.noarch.rpm

# 安装 Nginx
$ yum install -y nginx

# 添加系统服务，用于开机自启动
$ systemctl start nginx && systemctl enable nginx

# 获取 Nginx 配置文件位置
$ nginx -t
```

### Mac

```bash
# 安装 brew，已安装的跳过
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Nginx
$ brew install nginx

# 添加 Nginx 为服务，用于开机自启动
$ brew services start nginx

# 获取 Nginx 配置文件位置
$ nginx -t
```

## 常用文件路径
### 总配置文件（nginx.conf）
&emsp;&emsp;这个文件主要用于总体配置 nginx 的规则。为了保证该文件的简洁性，不要将普通路由等信息写在这里。
- Linux: `/etc/nginx/nginx.conf`
- Mac: `/usr/local/etc/nginx/nginx.conf`

&emsp;&emsp;根据实践，推荐的 Nginx 总配置文件下：

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

# Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

# 请求转发 (7 层代理)
http {
    # 注意，需要在每个 server 节点，或者 location 节点里面添加 $handler 变量，用于标记当前请求由哪个节点处理
    log_format    main    '[$time_local] Handler=[$handler] $remote_addr -> "$request_method $scheme://$host$request_uri $status" '
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

    # 包含 conf.d 下所有以 .conf 结尾的配置
    include               /etc/nginx/conf.d/*.conf;
}

# 流转发 (3 层代理)
stream {
    # 注意，需要在每个 server 节点，或者 location 节点里面添加 $handler 变量，用于标记当前请求由哪个节点处理
    log_format   main   '[$time_local] Handler=[$handler] $remote_addr -> "$protocol://$server_port $status" '
                        'Body-Length=[$bytes_sent] Response-Length=[$bytes_received] SessionTime=[$session_time]';

    access_log          /var/log/nginx/stream-access.log   main   buffer=32k;
    error_log           /var/log/nginx/stream-error.log    notice;

    # 包含 conf.d 下所有以 .stream 结尾的配置
    include             /etc/nginx/conf.d/*.stream;
}
```

- 配置目录: 这个文件夹主要用于存放普通转发规则。其中以 `.conf` 结尾的是普通转发，以 `.stream` 结尾的配置文件是流转发（端口转发）
   - Linux: `/etc/nginx/conf.d`
   - Mac: `/usr/local/etc/nginx/conf.d`
- 日志目录: 这个文件夹主要用于存放访问日志（`access.log`）和错误日志（`error.log`）
   - Linux: `/var/log/nginx`
   - Mac: `/usr/local/var/log/nginx`

## 请求代理
### 反向代理

```nginx
server {
    set                $handler            "local.cluster.k8s";

    # 监听端口
    listen             80;
    # 监听域名
    server_name        local.cluster.k8s;

    # 转发代理信息
    proxy_set_header   X-Real-IP           $remote_addr;
    proxy_set_header   HOST                $http_host;
    proxy_set_header   X-Forwarded-Host    $http_host;
    proxy_set_header   X-Forwarded-For     $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto   $scheme;
    proxy_set_header   X-Forwarded-Port    $server_port;

    # 路径匹配到以 / 开头的全部转发到 http://10.10.2.2:8081 服务器上
    location / {
        proxy_pass         http://10.10.2.2:8081; 
        proxy_redirect     default;
    }

    # 路径匹配到以 /app 开头的全部转发到 http://192.168.0.237:8082 服务器上
    location /app {
        proxy_pass         http://192.168.0.237:8082; 
        proxy_redirect     default;
    }
} 
```

&emsp;&emsp;反向代理时，被代理的服务无法得知真实客户端相关信息，也无法得知客户端访问服务器时的协议、域名、端口信息等。而且在真实的运维过程中，可能存在多层反向代理的情况。为了保证被代理的服务可以正确地获取这些信息，需要在 Nginx 转发时添加一些请求头信息。

- X-Real-IP：客户端真实 IP
- X-Forwarded-Host：客户端访问服务器时的域名信息
- X-Forwarded-For：代理路径，第一个 IP 是客户端的 IP，后面是每一层代理的 IP
- X-Forwarded-Port：客户端访问服务器时的端口
- X-Forwarded-Proto：客户端访问服务器时的协议
- X-Forwarded-Scheme：客户端访问服务器时的协议（兼容性冗余）
- X-Scheme：客户端访问服务器时的协议（兼容性冗余）

&emsp;&emsp;如果只存在单层反向代理，那么需要添加以下请求头配置

```nginx
proxy_set_header   X-Real-IP           $remote_addr;
proxy_set_header   HOST                $http_host;
proxy_set_header   X-Forwarded-Host    $http_host;
proxy_set_header   X-Forwarded-For     $proxy_add_x_forwarded_for;
proxy_set_header   X-Forwarded-Proto   $scheme;
proxy_set_header   X-Forwarded-Port    $server_port;
```

&emsp;&emsp;如果存在多层反向代理，那么首层反向代理与上面一致，第二层及以后的反向代理应加入以下头部配置

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for
```

### 静态文件托管

```nginx
server {
    # 监听端口
    listen 80;
    # 设置默认编码
    charset utf-8;

    # 托管 /usr/share/nginx/www 目录下的静态文件
    location / {
        root /usr/share/nginx/www;
        index index.htm index.html;
    }
}
```

### 隐藏版本号

```nginx
http {
    # 其它配置
    ...

    # 隐藏版本号
    server_tokens off;
}
```

### 配置 SSL 证书

```nginx
server {
    # 将 HTTP 请求重定向到 HTTPS 请求
    listen 80;
    server_name local.cluster.k8s;
    rewrite ^(.*)$ https://$host$1 permanent;
}

server {
    # HTTPS 默认使用 443 端口
    listen 443 ssl;
    # ssl 域名地址
    server_name local.cluster.k8s;
    # 证书配置，将这个改成你申请的证书的文件地址
    ssl_certificate /etc/nginx/ssl/cluster.k8s.pem;
    # 证书配置，将这个改成你申请的证书的文件地址
    ssl_certificate_key /etc/nginx/ssl/cluster.k8s.key;

    # 其余配置与反向代理、静态资源托管一致
    location / {
        root /usr/share/nginx/www;
        index index.htm index.html;
    }
}
```

### 负载均衡
&emsp;&emsp;在 http 节点下添加 upstream 节点。

```nginx
http {
    # 其它配置
    ...

    # 声明负载均衡节点
    upstream lbnode {
        # 负载策略
        ip_hash;
        server 10.10.2.2L8080 weight=1; # weight 为权重值
        server 10.10.2.3:8080 weight=2;
    }
}
```

&emsp;&emsp;修改 server 节点下的 proxy_pass 属性，由原来指定 IP 变成使用 upstream 名称。

```nginx
server {
    # 监听端口
    listen 80;

    location / {
        # 将流量转发到 upstream 节点
        proxy_pass http://lbnode;
        proxy_redirect default;
    }
}
```

### 直接返回字符串

```nginx
server {
    listen 80;

    location / {
        default_type application/json;
        return 200 '{"status": 200}';
    }
}
```

## 流代理

- **/etc/nginx/nginx.conf**

```nginx
# 注意，这个 stream 节点在 http 节点下面，与 http 节点平级，不要写入 http 节点内
stream {

    log_format basic '$remote_addr [$time_local] '
                     '$protocol $status $bytes_sent $bytes_received '
                     '$session_time';
    access_log /var/log/nginx/stream-access.log basic buffer=32k;

    error_log  /var/log/nginx/stream-error.log notice;

    # 包含 conf.d 下所有以 .stream 结尾的配置
    include /etc/nginx/conf.d/*.stream;
}
```

- **/etc/nginx/conf.d/test.stream**

```nginx
server {
    listen 443;
    ssl_preread on; # 如果代理的是 https 端口，需要加入本行配置

    proxy_pass 127.0.0.1:8433;
    proxy_connect_timeout 300s;
    proxy_timeout 300s;
}
```