# Bash 自动补全
## 概述
&emsp;&emsp;kubectl 作为 Kubernetes 的命令行工具（CLI），是 Kubernetes 日常运维的过程中必须掌握的工具。kubectl 工具提供了大量的子命令
用于管理 Kubernetes。虽然 kubectl 针对每个子命令解释得很详细，但是还是需要用户手动敲出来，效率比较低。特别是遇到一些需要操作资源的时候，则只
能通过复制的方式才能快速输入 Pod 的名称。

&emsp;&emsp;为了提升工作效率，可以通过 Bash 自动补全工具来优化这个过程。

## 安装
&emsp;&emsp;在 Kubernetes 的控制节点中，通过以下命令安装自动补充工具。

```bash
# 安装 bash-completion 工具
$ yum install bash-completion
正在解决依赖关系
--> 正在检查事务
---> 软件包 bash-completion.noarch.1.2.1-8.el7 将被 安装
--> 解决依赖关系完成

依赖关系解决

============================================================================================================================================
 Package                                架构                          版本                                源                           大小
============================================================================================================================================
正在安装:
 bash-completion                        noarch                        1:2.1-8.el7                         base                         87 k

事务概要
============================================================================================================================================
安装  1 软件包

总下载量：87 k
安装大小：263 k
Is this ok [y/d/N]: y
Downloading packages:
bash-completion-2.1-8.el7.noarch.rpm                                                                                 |  87 kB  00:00:00     
Running transaction check
Running transaction test
Transaction test succeeded
Running transaction
  正在安装    : 1:bash-completion-2.1-8.el7.noarch                                                                                      1/1 
  验证中      : 1:bash-completion-2.1-8.el7.noarch                                                                                      1/1 

已安装:
  bash-completion.noarch 1:2.1-8.el7                                                                                                        

完毕！
```

&emsp;&emsp;加载自动补全脚本。

```bash
# 添加 bash-completion 自带的补全信息
$ source /usr/share/bash-completion/bash_completion

# 添加 kubectl 提供的自动补全脚本
$ source <(kubectl completion bash)

# 保存到 ~/.bashrc 文件，开机自动加载
$ echo "source <(kubectl completion bash)" >> ~/.bashrc
```

## 使用
&emsp;&emsp;完成自动补全工具的安装之后，后续就可以使用 `tab` 键完成自动补全了。

```bash
$ kubectl create 
clusterrolebinding   (Create a cluster role binding for a particular cluster role)
clusterrole          (Create a cluster role)
configmap            (Create a config map from a local file, directory or literal value)
cronjob              (Create a cron job with the specified name)
deployment           (Create a deployment with the specified name)
ingress              (Create an ingress with the specified name)
job                  (Create a job with the specified name)
namespace            (用指定的名称创建一个命名空间)
poddisruptionbudget  (Create a pod disruption budget with the specified name)
priorityclass        (Create a priority class with the specified name)
quota                (Create a quota with the specified name)
rolebinding          (Create a role binding for a particular role or cluster role)
role                 (Create a role with single rule)
secret               (使用指定的子命令创建一个 Secret)
serviceaccount       (创建一个指定名称的服务账户)
service              (Create a service using a specified subcommand)
token                (Request a service account token)
```
