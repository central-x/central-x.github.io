---
title: 搭建 Clash 代理
---

# {{ $frontmatter.title }}
## 概述
&emsp;&emsp;最近在学习 Kubernetes，由于 Kubernetes 很多镜像、包都比较难访问，因此需要为服务器搭建一个代理服务，方便用于拉取镜像和包。

&emsp;&emsp;由于 Docker 搭环境真的是太方便了，因此这边使用 Docker 来搭建 Clash 代理服务。Docker 搭建过程参考另一篇笔记[[链接](/blogs/docker/setup)]。

## 步骤
### 搭建过程
&emsp;&emsp;在服务器上创建以下目录结构：

```
svc
 ├── docker-compose.yml
 └── svc-clash
     └── config.yaml  # Clash 配置文件
```

&emsp;&emsp;其中 docker-compose.yml 的文件内容参考以下：

```yaml
version: "3"

services:
  # Clash
  svc-clash:
    image: dreamacro/clash:v1.10.6
    container_name: svc-clash
    volumes:
      - ./svc-clash/config.yaml:/root/.config/clash/config.yaml
    ports:
      - "7890:7890/tcp"
      - "7890:7890/udp"
      - "9090:9090"
    restart: always
    networks:
      - default
  # Clash Dashboard
  svc-clash-dashboard:
    image: centralx/clash-dashboard
    container_name: svc-clash-dashboard
    ports:
      - "80:80"
    restart: always
    networks:
      - default

# Networks
networks:
  default:
    driver: bridge
    name: svc
```

&emsp;&emsp;而 config.yaml 文件就是你的订阅信息，这个就懂的人都懂了，不懂的人就跳过吧。

&emsp;&emsp;完成以上操作后，在 svc 目录下使用 docker-compose 启动服务。docker-compose 会自动拉取镜像并完成配置。

```bash
$ docker-compose up -d
```

&emsp;&emsp;等待 docker-compose 执行完毕之后，Clash 的代理服务就已经搭建好了。你可以通过 http://your-server-ip 来访问 Clash 的可视化界面，并通过可视化界面来控制代理功能。注意，需要修改设置下面的外部控制设置，将其改为当前服务器的 ip、端口，才能正确地控制代理。

### 使用代理
&emsp;&emsp;修改其它服务器的 ~/.bash_profile 文件，添加以下内容。

```shell
function proxy_off(){
    unset http_proxy
    unset https_proxy
    unset all_proxy
    echo -e "已关闭代理"
}

function proxy_on() {
    export no_proxy="localhost,127.0.0.1,localaddress,.localdomain.com"
    # 将 10.10.10.10 改为你的代理节点
    export http_proxy="http://10.10.10.10:7890"
    export https_proxy="http://10.10.10.10:7890"
    export all_proxy="socks5://10.10.10.10:7890"
    echo -e "已开启代理"
}
```

```bash
# 令配置生效
$ source ~/.bash_profile

# 打开代理
$ proxy_on

# 关理代理
$ proxy_off
```

&emsp;&emsp;Enjoy yourself！