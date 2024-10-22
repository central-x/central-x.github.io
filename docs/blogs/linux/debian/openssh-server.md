# OpenSSH Server
## 概述
&emsp;&emsp;安装 Ubuntu Desktop 时，默认没有安装 SSH 服务，因此需要自行安装。本文档记录一下安装 OpenSSH 相关服务的过程。

## 环境

- 操作系统：Ubuntu Desktop 22.04

## 步骤
### 安装服务

```bash
# 更新 apt
$ sudo apt update

# 安装 openssh-server 服务
$ sudo apt install openssh-server

# 启用 sshd 服务
$ sudo systemctl enable sshd
```

### 允许使用 root 登录
&emsp;&emsp;SSH 服务默认不允许 root 用户直接登录，可以通过以下方式修改：

```bash
# 修改配置文件
# 搜索 Authentications: ，将 PermitRootLogin 选项设置为 yes
$ sudo vi /etc/ssh/sshd_config

# 重启 sshd 服务
$ sudo systemctl restart sshd
```