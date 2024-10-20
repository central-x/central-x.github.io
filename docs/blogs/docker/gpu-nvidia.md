# Nvidia GPU 支持
## 概述
&emsp;&emsp;本文档用于记录如何在 Docker 镜像中使用宿主机的 Nvidia GPU。

## 环境
- 操作系统：CentOS 7
- Docker：24.0.5
- Docker Compose：v2.20.2
- 显卡：NVIDIA GeForce RTX 4090
- 驱动版本：550.120

## 步骤
### 验证环境
&emsp;&emsp;确保宿主机已安装 Nvidia 驱动：

```bash
$ nvidia-smi
Mon Oct 20 21:30:48 2024       
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.120                Driver Version: 550.120        CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Nam e                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  NVIDIA GeForce RTX 4090        Off |   00000000:13:00.0 Off |                  Off |
| 35%   34C    P8             11W /  450W |       4MiB /  24564MiB |      0%      Default |
|                                         |                       |                  N/A |
+-----------------------------------------+------------------------+----------------------+
                                                                                         
+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|  No running processes found                                                             |
+-----------------------------------------------------------------------------------------+
```

::: tip 提示
&emsp;&emsp;如果系统未安装驱动，可以参考以下文档：

- CentOS[[链接](/blogs/linux/centos/nvidia-driver)]
- Ubuntu[[链接](/blogs/linux/ubuntu/nvidia-driver)]
:::

### 安装 nvidia-container-toolkit
&emsp;&emsp;安装 nvidia-container-toolkit，并配置 Docker 环境：

```bash
# 下载 nvidia-container-toolkit 仓库
$ curl -o /etc/yum.repos.d/nvidia-container-toolkit.repo https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo

# 安装 nvidia-container-toolkit
$ yum install nvidia-container-toolkit

# 配置 Docker Runtime
$  nvidia-ctk runtime configure --runtime=docker

# 重新启动 Docker 服务
$ systemctl restart docker
```

### 分配 GPU
#### Command
&emsp;&emsp;如果使用命令创建容器时，可以通过 `--gpus=all` 命令为容器分配所有 GPU：

```bash{4}
$ docker run -d
    -v ./ollama:/root/.ollama
    -p 11434:11434
    --gpus=all
    --name ollama
    ollama/ollama:0.3.13
```

#### Compose
&emsp;&emsp;在 Docker Compose 文件中添加以下配置：

```yml{12-25}
version: "3"

services:
  ollama:
    image: ollama/ollama:0.3.13
    container_name: ollama
    volumes:
      - ./ollama:/root/.ollama
    restart: always
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
          - driver: nvidia
            capabilities: [gpu]
            # 多卡环境下可以设置容器可以使用多少张 GPU
            # 可以设置为 all 表示可以使用所有 GPU；或具体的数字表示可以使用几张 GPU
            # 如果没有设置此值，则默认可以使用所有 GPU
            # count: all
            # count: 2
            # 多卡环境下可以分配指定 GPU 给容器，如果不指定则分配所有 GPU
            # 通过 nvidia-smi 命令可以看到每张卡的 Device ID
            # device_ids: ['0']
    networks:
      - default

networks:
  default:
    driver: bridge
```

#### 验证
&emsp;&emsp;验证容器是否可以正常获取到 GPU 信息

```bash
$ docker exec -it ollama nvidia-smi
Mon Oct 20 21:57:21 2024       
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.120                Driver Version: 550.120        CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  NVIDIA GeForce RTX 4090        Off |   00000000:13:00.0 Off |                  Off |
| 35%   33C    P8             12W /  450W |       4MiB /  24564MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+
                                                                                         
+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|  No running processes found                                                             |
+-----------------------------------------------------------------------------------------+
```