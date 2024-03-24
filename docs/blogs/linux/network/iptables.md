# iptables
## 概述
&emsp;&emsp;iptables 是 Linux 的防火墙工具，主要用于基于规则进行网络流量控制。由于 iptables 使用起来相对复杂，因此在 CentOS、Ubuntu 这些发行版本中，一般情况下默认使用更高层的封装，如 firewalld[[链接](/blogs/linux/network/firewalld)]、ufw。

&emsp;&emsp;在 Linux 下，但是 Docker、Kubernetes 这些容器工具一般与 iptables 整合来进行包转发，可能会与 firewalld、ufw 冲突（可以通过一些选项进行兼容性调整），因此在使用 Docker、Kubernetes 时，一般会将 firewalld、ufw 卸载之后直接使用 iptables 以保证容器环境的稳定运行。

&emsp;&emsp;本文档主要记录 iptables 的一些学习思路。

## 概念
### 防火墙
&emsp;&emsp;防火墙（Firewall）是一种网络安全系统，一般用于在内、外网之间或在计算机内部构建一道相对隔绝的保护屏障，以保护用户资料与信息安全性的一种技术。

![](./assets/iptables-firewall.svg)

&emsp;&emsp;如上图，从逻辑上讲，防火墙大体可以分为网络防火墙和主机防火墙：

- 网络防火墙：往往该主机位于网络（局域网）入口或边缘，以网关的形式对网络入口进行防护，保护网络内部所有主机。
- 主机防火墙：针对于单个主机（当前主机）内部的服务进行防护；

&emsp;&emsp;从物理上讲，防火墙可以分为硬件防火墙和软件防火墙：

- 硬件防火墙：在硬件级别实现部份防火墙功能以提升包处理速度，在软件级别实现防火墙配置。这类防火墙一般性能高，成本高；
- 软件防火墙：在通用硬件平台上，使用软件实现防火墙的所有功能。这类防火墙一般性能较低，成本也低。

&emsp;&emsp;一般情况下，一台网络防火墙可以同时保护多个主机，因此会使用硬件防火墙以保证这些主机的网络访问性能，像深信服防火墙等，部份路由器也会提供一些防火墙功能；主机防火墙一般只需要保护内部服务、端口的安全，使用软件防火墙基本能满足我们的性能要求，如此次我们学习的 iptables 就是软件防火墙。

&emsp;&emsp;iptables 实际上不是真正的防火墙，而是防火墙规则的维护工具，真正使用规则干活的是内核的 netfilter。iptables 构建规则指导 netfilter 完成封包过滤、封包重定向和网络地址转换（Network Address Translate，NAT）等功能。

&emsp;&emsp;iptables 有三个核心概念，分别是`规则（rule）`、`链（chain）`、`表（table）`。为了更好地管理 iptables，我们需要先学习这三个核心概念。

### 规则（rule）
&emsp;&emsp;iptables 通过定义规则来处理包，一般定义为`如果数据包符合这样的条件，就这样处理`。像`来自 10.10.3.0/24 的包，就将其拒绝（reject）`，这就是一条规则。

&emsp;&emsp;规则存储在内核空间的信息包过滤表中，这些规则通过指定包的源地址（source）、目标地址、传输协议（如 TCP、UDP、ICMP）和服务类型（如 HTTP、FTP、SMTP）来确认是否匹配条件。当数据包与规则匹配时，netfilter 就根据规则所定义的方法来处理这些数据包，如放行（accept）、拒绝（reject）、丢弃（drop）等。

&emsp;&emsp;规则是 iptables 里面的最小单元。

### 链（chain）
&emsp;&emsp;为了方便管理与理解，iptables 将同一类型的规则放在链上，根据规则的优先级依次执行。iptables 为我们预定义了 5 条链，每条链的工作职责如下：

- `PREROUTING`: 包到达网口时，对其进行匹配并处理
- `INPUT`: 包到达本地主机目标端口时，对其进行匹配并处理
- `OUTPUT`: 本地主机端口/服务处理好的包返回时，对其进行匹配并处理
- `FORWARD`: 包路由转发时，对其进行匹配并处理
- `POSTROUTING`: 包离开网口时，对其进行匹配并处理

&emsp;&emsp;当包经过防火墙的时候，根据包的类型（发给当前主机/其它主机）让不同的链去处理这些包。

![](./assets/iptables-chain.svg)

::: tip 提示
&emsp;&emsp;一般情况下，网络防火墙与主机防火墙分别主要使用以下链：

- 网络防火墙：这种防火墙主要用于包转发，因此需要用到 `PREROUTING`、`FORWARD`、`POSTROUTING` 这三条链；
- 主机防火墙：这种防火墙主要将包发送给端口服务，因此需要用到 `PREROUTING`、`INPUT`、`OUTPUT`、`POSTROUTING` 这四条链，其中：
   - 包从网卡到端口使用到 `PREROUTING` 和 `INPUT` 这两条链；
   - 服务完成包的处理之后，包从端口返回网卡使用到了 `OUTPUT` 和 `POSTROUTING` 这两条链。
  :::

### 表（table）
&emsp;&emsp;iptables 将相同类型的规则放同一条链上，但是链上的规则有些能力是很相似的，比如 A 类规则都是用于对 IP 或端口进行过滤，B 类规则都是修改报文，因此 iptables 引入了表的概念，用于分类存放不能功能的规则。iptables 内置了 4 张表，分别如下：

- RAW: 这里面的链、规则，主要能基于数据包的状态进行规则的设定。
- MANGLE: 这里面的链、规则，主要决定数据包的内容；
- NAT: 这里面的链、规则，主要可以修改源和目标的 ip 地址，从而进行包路由；
- FILTER: 这里面的链、规则，主要决定一个数据包是否可以到达目标进程的端口；

&emsp;基于以上表的能力职责，由于某些链天生不具备某些能力，故而链与表之间的关系如下：

![](./assets/iptables-table.svg)

::: tip 提示
&emsp;&emsp;在 CentOS 7 中，INPUT 链有 NAT 表，但是 CentOS 6 没有。
:::

&emsp;&emsp;一个链下的 4 个表，其执行顺序为 `RAW` > `MMANGLE` > `NAT` > `FILTER`，然后再根据规则的优先级从上至下执行。

## 规则管理
### 环境准备
&emsp;&emsp;为了实验 iptables，现需要准备 2 台服务器环境：

- 10.10.4.1: 运行 iptables 的服务器，模拟主机防火墙和网络防火墙
- 10.10.4.2: 运行 nginx 服务，模拟网络防火墙背后的主机，测试 iptables 作为网络防火墙的效果
- 10.10.5.2: 访问 10.10.4.1，模拟客户端访问防火墙，测试 iptables 规则

### 创建规则
&emsp;&emsp;在上面关于规则的概念中，我们知道规则是根据匹配条件来执行对应包的处理动作。这里涉及到两块内容，一块是匹配条件，一块是处理动作。

&emsp;&emsp;在 iptables 里，匹配条件分为基础匹配条件和扩展匹配条件。基础匹配条件是 iptables 内置的，而扩展匹配条件需要配合插件完成。通过以下实验测试添加规则：

```bash
# 在添加规则前，我们先确保 10.10.5.2 可以访问 10.10.4.1
# 在 10.10.5.2 服务器上使用 ping 访问 10.10.4.1
$ ping 10.10.4.1 -c 4
PING 10.10.4.1 (10.10.4.1) 56(84) bytes of data.
64 bytes from 10.10.4.1: icmp_seq=1 ttl=64 time=0.493 ms
64 bytes from 10.10.4.1: icmp_seq=2 ttl=64 time=0.127 ms
64 bytes from 10.10.4.1: icmp_seq=3 ttl=64 time=0.482 ms
64 bytes from 10.10.4.1: icmp_seq=4 ttl=64 time=0.457 ms
```

```bash
# 现在在 10.10.4.1 服务器上添加一条规则
# 在 filter 表的 INPUT 链添加一条规则，将来自 10.10.5.2 的包都拒绝
# -t: 目标表
# -I: 表示新增规则，后面的参数是待新增的链
# -s: 匹配规则，源地址
# -j: 动作
$ iptables -t filter -I INPUT -s 10.10.5.2 -j REJECT

# 再次查看 filter 表的规则，可以发现在 INPUT 链中，已添加了一条规则，后面的描述为 reject-with icmp-port-unreachable
$ iptables -t filter -L
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         
REJECT     all  --  10.10.5.2            anywhere             reject-with icmp-port-unreachable

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination         

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination         
```

```bash
# 在 10.10.5.2 服务器上再次使用 ping 访问 10.10.4.1
# 发现服务器返回 Destination Port Unreachable 错误，配置的描述一致，因此可以确认规则已生效
$ ping 10.10.4.1 -c 4
PING 10.10.4.1 (10.10.4.1) 56(84) bytes of data.
From 10.10.4.1 icmp_seq=1 Destination Port Unreachable
From 10.10.4.1 icmp_seq=2 Destination Port Unreachable
From 10.10.4.1 icmp_seq=3 Destination Port Unreachable
From 10.10.4.1 icmp_seq=4 Destination Port Unreachable

--- 10.10.4.1 ping statistics ---
4 packets transmitted, 0 received, +4 errors, 100% packet loss, time 3000ms
```

### 查询规则
&emsp;&emsp;在上一章节提到，我们可以使用 `iptables -t filter -L` 命令列出 filter 表中所有的规则，接下来我们看看该命令的详细情况：
```bash
# 查询规则
# -t: 可选项。查询指定表，可选 raw、mangle、nat、filter，不指定时默认查询 filter 表
# -v: 可选项。查询详细信息
# -n: 可选项。查询原始信息
# -L: 必选项。查询规则。查询指定链，不指定链名时，返回该表下所有链的信息
$ iptables [-t <table>] -[vn]L [chain]

# 忽略了 -t 参数，则默认查询 filter 表
$ iptables -L
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         
REJECT     all  --  10.10.5.2            anywhere             reject-with icmp-port-unreachable

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination         

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination         

# 也可以指定只查询 INPUT 链的规则
$ iptables -L INPUT
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         
REJECT     all  --  10.10.5.2            anywhere             reject-with icmp-port-unreachable

# 添加 -v 选项，可以查看到更多、更详细的信息
$ iptables -vL INPUT
Chain INPUT (policy ACCEPT 277 packets, 25052 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    4   336 REJECT     all  --  any    any     10.10.5.2            anywhere             reject-with icmp-port-unreachable

# 在上述命中，iptables 对一些结果进行名称解析。如果规则比较多，则效率会比较低，因此可以添加 -n 选项查看原始值
$ iptables -nvL INPUT
Chain INPUT (policy ACCEPT 377 packets, 34100 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    4   336 REJECT     all  --  *      *       10.10.5.2            0.0.0.0/0            reject-with icmp-port-unreachable
[root@centos7 ~]# 
```

&emsp;&emsp;使用 `-v` 选项查看信息时，各字段含义如下：

- **pkts**: 该规则匹配到的报文的个数。刚才我们使用 `ping <ip> -c 4` 命令，因此这里匹配到了 4 个包；
- **bytes**: 该规则匹配到的报文包的大小总和；
- **target**: 规则对应的 target，一般表示规则匹配成功后需要采取的动作。除此之后，target 也可能为 `子链`，表示规则匹配成功后由指定子链的规则进行处理；
- **prot**: 表示规则对应的协议；
- **opt**: 表示规则对应的选项；
- **in**: 表示数据包由哪个接口/网卡流入；
- **out**: 表示数据包由哪个接口/网卡流出；
- **source**: 表示规则对应的源地址，可以是一个 IP，也可以是一个网段；
- **destination**: 表示规则对应的目标地址，可以是一个 IP，也可以是一个网段。

&emsp;&emsp;同时，在上面的结果面，可以看到 INPUT 链后面的行号中包含 `policy ACCEPT xxx packets, xxx bytes` 这三部份：

- **policy**: 表示链的默认策略，意思是如果包没有匹配上规则时默认执行的动作。在上面的案例中，INPUT 链默认策略是 `ACCEPT`，意思是默认发行。这种情况代表的 INPUT 链执行的是`黑名单`机制，默认所有包都能通过，只有指定的包不能通过；
- **packets**: 表示当前链默认策略匹配到的包的数量；
- **bytes**: 表示当前链默认策略匹配到的所有包的大小总和。
