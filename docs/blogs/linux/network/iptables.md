# iptables
## 概述
&emsp;&emsp;iptables 是 Linux 的防火墙工具，主要用于基于规则进行网络流量控制。由于 iptables 使用起来相对复杂，因此在 CentOS、Ubuntu 这些发行版本中，一般情况下默认使用更高层的封装，如 firewalld[[链接](/blogs/linux/network/firewalld)]、ufw。

&emsp;&emsp;在 Linux 下，但是 Docker、Kubernetes 这些容器工具一般与 iptables 整合来进行包转发，可能会与 firewalld、ufw 冲突（可以通过一些选项进行兼容性调整），因此在使用 Docker、Kubernetes 时，一般会将 firewalld、ufw 卸载之后直接使用 iptables 以保证容器环境的稳定运行。

&emsp;&emsp;本文档主要记录 iptables 的一些学习思路。

## 概念
### 防火墙
&emsp;&emsp;防火墙（Firewall）是一种网络安全系统，一般用于在计算机的内、外网之间构建一道相对隔绝的保护屏障，以保护用户资料与信息安全性的一种技术。

&emsp;&emsp;从逻辑上讲，防火墙大体可以分为主机防火墙和网络防火墙：

- 主机防火墙：针对于单个主机（当前主机）内部的服务进行防护；
- 网络防火墙：往往该主机位于网络（局域网）入口或边缘，以网关的形式对网络入口进行防护，保护网络内部所有主机。

&emsp;&emsp;从物理上讲，防火墙可以分为硬件防火墙和软件防火墙：

- 硬件防火墙：在硬件级别实现部份防火墙功能以提升包处理速度，在软件级别实现防火墙配置。这类防火墙一般性能高，成本高；
- 软件防火墙：在通用硬件平台上，使用软件实现防火墙的所有功能。这类防火墙一般性能较低，成本也低。

&emsp;&emsp;iptables 实际上不是真正防火墙，真正使用规则干活的是内核的 netfilter，而 iptables 用于构建规则指导 netfilter 完成封包过滤、封包重定向和网络地址转换（Network Address Translate，NAT）等功能。

&emsp;&emsp;iptables 有三个核心概念，分别是`规则（rule）`、`链（chain）`、`表（table）`。为了更好地管理 iptables，我们需要先学习这三个核心概念。