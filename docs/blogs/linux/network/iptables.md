# iptables
## 概述
&emsp;&emsp;iptables 是 Linux 的防火墙工具，主要用于基于规则进行网络流量控制。由于 iptables 使用起来相对复杂，因此在 CentOS、Ubuntu 这些发行版本中，一般情况下默认使用更高层的封装，如 firewalld[[链接](/blogs/linux/network/firewalld)]、ufw。

&emsp;&emsp;由于 Docker、Kubernetes 这些容器工具一般与 iptables 整合来进行包转发，可能会与 firewalld、ufw 冲突（虽然可以通过一些选项进行兼容性调整，但是增大后续排查问题难度），因此在使用 Docker、Kubernetes 时，一般会将 firewalld、ufw 卸载之后直接使用 iptables 以保证容器环境的稳定运行。

&emsp;&emsp;本文档主要记录 iptables 的一些学习思路。

## 概念
&emsp;&emsp;在学习 iptables 具体的指令前，先了解一下相关概念，这样后续在使用指令时，能更清楚如何编写正确的指令。

### 防火墙
&emsp;&emsp;防火墙（Firewall）是一种网络安全系统，一般用于在内、外网之间或在计算机内部构建一道相对隔绝的保护屏障，以保护用户资料与信息安全性的一种技术。

![](./assets/iptables-firewall.svg)

&emsp;&emsp;如上图，从逻辑上讲，防火墙大体可以分为网络防火墙和主机防火墙：

- 网络防火墙：往往该主机位于网络（局域网）入口或边缘，以网关的形式对网络入口进行防护，保护网络内部所有主机。
- 主机防火墙：针对于单个主机（当前主机）内部的服务进行防护；

&emsp;&emsp;从物理上讲，防火墙可以分为硬件防火墙和软件防火墙：

- 硬件防火墙：在硬件级别实现部份防火墙功能以提升包处理速度，在软件级别实现防火墙配置以提升灵活度。这类防火墙一般性能高，成本高；
- 软件防火墙：在通用硬件平台上，使用软件实现防火墙的所有功能。这类防火墙一般性能较低，成本也低。

&emsp;&emsp;一般情况下，一台网络防火墙可以同时保护多个主机，因此会使用硬件防火墙以保证这些主机的网络访问性能，像深信服防火墙等，部份路由器也会提供一些防火墙功能；主机防火墙一般只需要保护内部服务、端口的安全，使用软件防火墙基本能满足我们的性能要求，如此次我们学习的 iptables 就是软件防火墙。

&emsp;&emsp;iptables 实际上不是真正的防火墙，而是防火墙规则的维护工具，真正使用规则干活的是内核的 netfilter。iptables 构建规则指导 netfilter 完成封包过滤、封包重定向和网络地址转换（NAT，Network Address Translate）等功能。

&emsp;&emsp;iptables 有三个核心概念，分别是`规则（rule）`、`链（chain）`、`表（table）`。为了更好地管理 iptables，我们需要先学习这三个核心概念。

### 规则（rule）
&emsp;&emsp;iptables 通过定义规则来处理报文，一般定义为`如果数据报文符合这样的条件，就这样处理`。像`来自 10.10.0.0/24 的报文，就将其拒绝（reject）`，这就是一条规则。

&emsp;&emsp;规则存储在内核空间的信息包过滤表中，这些规则通过指定报文的源地址（source ip/port）、目标地址（destination ip/port）、传输协议（protocol）等来确认报文是否匹配条件。当报文与规则匹配时，netfilter 就根据规则所定义的方法来处理这些报文，如放行（accept）、拒绝（reject）、丢弃（drop）等。

&emsp;&emsp;规则是 iptables 里面的最小单元。

### 链（chain）
&emsp;&emsp;为了方便管理与理解，iptables 将同一类型的规则放在链上，根据规则的优先级依次执行。iptables 为我们预定义了 5 条链，每条链的工作职责如下：

- `PREROUTING`: 报文到达网口时，对其进行匹配并处理；
- `INPUT`: 报文到达本地主机目标端口时，对其进行匹配并处理；
- `OUTPUT`: 本地主机端口/服务处理好的报文返回时，对其进行匹配并处理；
- `FORWARD`: 报文路由转发时，对其进行匹配并处理；
- `POSTROUTING`: 报文离开网口时，对其进行匹配并处理。

&emsp;&emsp;当报文经过防火墙的时候，根据报文的类型（发给当前主机/其它主机）让不同的链去处理这些包。

![](./assets/iptables-chain.svg)

::: tip 提示
&emsp;&emsp;一般情况下，网络防火墙与主机防火墙分别主要使用以下链：

- 网络防火墙：这种防火墙主要用于包转发，因此需要用到 `PREROUTING`、`FORWARD`、`POSTROUTING` 这三条链；
- 主机防火墙：这种防火墙主要将包发送给端口服务，因此需要用到 `PREROUTING`、`INPUT`、`OUTPUT`、`POSTROUTING` 这四条链，其中：
   - 报文从网卡到服务端口使用到 `PREROUTING` 和 `INPUT` 这两条链；
   - 服务完成报文的处理之后，响应报文从服务端口返回网卡使用到了 `OUTPUT` 和 `POSTROUTING` 这两条链。
  :::

### 表（table）
&emsp;&emsp;iptables 将相同类型的规则放同一条链上，但是链上的规则有些能力是很相似的，比如 A 类规则都是用于对 IP 或端口进行过滤，B 类规则都是修改报文。因此 iptables 引入了表的概念，用于分类存放不能功能的规则。iptables 内置了 4 张表，分别如下：

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

&emsp;&emsp;iptables 在操作规则的时候，是<font color=red>以表作为入口</font>进行操作的。

## 规则管理
### 环境准备
&emsp;&emsp;为了完整实验 iptables 的功能，现需要准备 2 个网段（`172.16.0.0/24` 和 `10.10.0.0/24`）以及 3 台主机，分别是：

- 主机 A: 处于 `172.16.0.0/24` 网段，IP 为 `172.16.0.10`。这台主机用于访问主机 B，模拟客户端访问防火墙，测试 iptables 规则。
- 主机 B: 运行 iptables 的主机，主机需要有两张网卡，网卡 1 连接着 `172.16.0.0/24` 网段，IP 为 `172.16.0.2`；网卡 2 连接 `10.10.0.0/24` 网段，IP 为 `10.10.0.2`。这台主机用于模拟主机防火墙和网络防火墙；
- 主机 C: 运行 nginx 服务，处于 `10.10.0.0/24` 网段，IP 为 `10.10.0.10`。这台主机用于模拟网络防火墙背后的主机，测试 iptables 作为网络防火墙的效果；

&emsp;&emsp;以上环境的网络拓扑图如下所示：

![](./assets/iptables-firewall-topology.svg)

::: tip 提示
&emsp;&emsp;以上环境可以通过 VMWare Workstation 或 ESXi 创建虚拟机来模拟。
:::

### 创建规则
&emsp;&emsp;在上面关于规则的概念中，我们知道规则是根据匹配条件来执行对应包的处理动作。这里涉及到两块内容，一块是匹配条件，一块是处理动作。

&emsp;&emsp;在 iptables 里，匹配条件分为基础匹配条件和扩展匹配条件。基础匹配条件是 iptables 内置的，而扩展匹配条件需要配合插件完成。通过以下实验测试添加规则：

```bash
# 在添加规则前，我们先确保主机 A（172.16.0.10）可以访问主机 B（172.16.0.2）
# 在主机 A 上使用 ping 访问主机 B
$ ping 172.16.0.2 -c 4
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
64 bytes from 172.16.0.2: icmp_seq=1 ttl=64 time=0.502 ms
64 bytes from 172.16.0.2: icmp_seq=2 ttl=64 time=0.455 ms
64 bytes from 172.16.0.2: icmp_seq=3 ttl=64 time=0.506 ms
64 bytes from 172.16.0.2: icmp_seq=4 ttl=64 time=0.549 ms

--- 172.16.0.2 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3000ms
rtt min/avg/max/mdev = 0.455/0.503/0.549/0.033 ms
```

```bash
# 在主机 B（172.16.0.2)上添加一条规则
# 在 filter 表的 INPUT 链添加一条规则，将来自 172.16.0.10 的报文都拒绝
# -t: 目标表
# -I: 表示新增规则，后面的参数是待新增的链
# -s: 匹配规则，源地址
# -j: 动作
$ iptables -t filter -I INPUT -s 172.16.0.10 -j REJECT

# 再次查看 filter 表的规则
# 发现在 INPUT 链中已添加了一条规则，描述为 reject-with icmp-port-unreachable
$ iptables -t filter -L
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         
REJECT     all  --  172.16.0.10          anywhere             reject-with icmp-port-unreachable

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination         

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination         
```

```bash
# 在主机 A 上再次使用 ping 访问主机 B
# 发现服务器返回 Destination Port Unreachable 错误，配置的描述一致，因此可以确认规则已生效
$  ping 172.16.0.2 -c 4
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
From 172.16.0.2 icmp_seq=1 Destination Port Unreachable
From 172.16.0.2 icmp_seq=2 Destination Port Unreachable
From 172.16.0.2 icmp_seq=3 Destination Port Unreachable
From 172.16.0.2 icmp_seq=4 Destination Port Unreachable

--- 172.16.0.2 ping statistics ---
4 packets transmitted, 0 received, +4 errors, 100% packet loss, time 3001ms
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
REJECT     all  --  172.16.0.10          anywhere             reject-with icmp-port-unreachable

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination         

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination         

# 也可以指定只查询 INPUT 链的规则
$ iptables -L INPUT
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         
REJECT     all  --  172.16.0.10          anywhere             reject-with icmp-port-unreachable

# 添加 -v 选项，可以查看到更多、更详细的信息
$ iptables -vL INPUT
Chain INPUT (policy ACCEPT 123 packets, 10598 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    4   336 REJECT     all  --  any    any     172.16.0.10          anywhere             reject-with icmp-port-unreachable

# 在上述命中，iptables 对一些结果进行名称解析
# 如果规则比较多，则效率会比较低，因此可以添加 -n 选项查看原始值
# 如 in、out 列由原来的 any 变为 *，destination 列由原来的 anywhere 变为 0.0.0.0/0
$ iptables -nvL INPUT
Chain INPUT (policy ACCEPT 134 packets, 11304 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    4   336 REJECT     all  --  *      *       172.16.0.10          0.0.0.0/0            reject-with icmp-port-unreachable
```

&emsp;&emsp;使用 `-v` 选项查看信息时，各字段含义如下：

- **pkts**: 该规则匹配到的报文的数量。刚才我们使用 `ping <ip> -c 4` 命令，因此这里匹配到了 4 个包；
- **bytes**: 该规则匹配到的报文数据的大小总和；
- **target**: 规则对应的 target，一般表示规则匹配成功后需要采取的动作。除此之外，target 也可能为 `子链`，表示规则匹配成功后，报文由指定子链的规则进行处理；
- **prot**: 表示规则对应的协议；
- **opt**: 表示规则对应的选项；
- **in**: 表示报文由哪个接口/网卡流入；
- **out**: 表示报文由哪个接口/网卡流出；
- **source**: 表示报文来源地址，可以是一个 IP，也可以是一个网段；
- **destination**: 表示报文目标地址，可以是一个 IP，也可以是一个网段。

&emsp;&emsp;同时，在上面的结果面，可以看到 INPUT 链后面的行号中包含 `policy ACCEPT xxx packets, xxx bytes` 这三部份：

- **policy**: 表示链的默认策略，意思是如果报文没有匹配上规则时默认执行的动作。在上面的案例中，INPUT 链默认策略是 `ACCEPT`，意思是默认放行。这种情况代表的 INPUT 链执行的是`黑名单机制`，默认所有报文都能通过，只有指定的报文不能通过；
- **packets**: 表示当前链默认策略匹配到的报文的数量；
- **bytes**: 表示当前链默认策略匹配到的所有报文的数据大小总和。

## 高级用法
### 基础匹配条件
&emsp;&emsp;iptables 的匹配条件分为基础匹配条件和扩展匹配条件。基础匹配条件是 iptables 内置的，可以直接使用，而扩展匹配条件需要依赖一些扩展模块，一般需要通过 `-m` 选项指定扩展模块。

&emsp;&emsp;接下来先介绍基础匹配条件。

#### 源地址匹配
&emsp;&emsp;在上面的创建规则时，我们使用 `-s` 作为匹配条件，可以匹配包的源地址，通过以下方式，也可以有更多的用法：

```bash
# 匹配单个 IP
$ iptables -t filter -I INPUT -s 172.16.0.10 -j DROP

# 匹配多个 IP，使用 , 隔开
$ iptables -t filter -I INPUT -s 172.16.0.10,172.16.0.11 -j DROP

# 匹配一个网段
$ iptables -t filter -I INPUT -s 172.16.0.0/24 -j REJECT

# 可以对匹配条件取反
$ iptables -t filter -I INPUT ! -s 172.16.0.10 -j ACCEPT
```

::: warning 警告
&emsp;&emsp;在上面的示例中，使用 `! -s 172.16.0.10` 表示对 `-s 172.16.0.10` 这个条件取反，表示源地址 IP 只要不为 `172.16.0.10` 则执行放行（`ACCEPT`）动作。

&emsp;&emsp;可能很多人可能认为这条规则也可以理解为“只要源地址 IP 是 172.16.0.10 的报文，那么就不接受”，虽然含义上相不多，但是在执行上是完全不一样的。因为上面的条件只表达了除了 172.16.0.10 以外的 IP 报文的处理动作，但是却没指定 172.16.0.10 的报文处理动作。

&emsp;&emsp;因此，以上规则最终的执行结果是，如果来自 172.16.0.10 的报文没有被规则匹配上，则使用链的默认处理策略来执行，也就是使用 FILTER 表的 INPUT 链的默认策略（ACCEPT）来处理这些报文。
:::

#### 目标地址匹配
&emsp;&emsp;通过 `-d` 来创建目标匹配条件，与 `-s` 的用法基本一致。

```bash
# 匹配单个 IP
$ iptables -t filter -I INPUT -d 172.16.0.10 -j DROP

# 匹配多个 IP，使用 , 隔开
$ iptables -t filter -I INPUT -d 172.16.0.10,172.16.0.11 -j DROP

# 匹配一个网段
$ iptables -t filter -I INPUT -d 172.16.0.0/24 -j REJECT

# 可以对匹配条件取反
$ iptables -t filter -I INPUT ! -d 172.16.0.10 -j ACCEPT
```

::: tip 提示
&emsp;&emsp;目标地址匹配一般用在以下两个场景：

1. 当前主机有两个网卡，通过防火墙想对其中一个网卡添加规则；
2. 当前主机是网关，通过防火墙对内部主机添加规则。
:::

#### 协议类型匹配
&emsp;&emsp;通过 `-p` 选项来添加需要匹配的协议类型。`-p` 选项支持以下协议:

- tcp
- udp
- udplite
- icmp
- icmpv6
- esp
- ah
- sctp
- mh

```bash
# 拒绝来自 172.16.0.10 的 icmp 协议的包
# ping 命令使用 icmp 协议，也就是此时 172.16.0.10 将无法 ping 通本机
$ iptables -t filter -I INPUT -s 172.16.0.10 -p icmp -j REJECT
```

::: tip 提示
&emsp;&emsp;在添加规则时，指定多个匹配条件时，这些条件之间默认存在 `与` 关系。
:::

#### 网卡/接口匹配
&emsp;&emsp;通过 `-i` 或 `-o` 选项添加网卡/接口匹配规则。`-i` 表示包从哪个网卡流入本机，`-o` 表示从哪块网卡流出本机。当本机有多个网卡时，可以使用此选项添加网卡/接口匹配条件。

```bash
# 获取本机网卡信息
$ ifconfig
ens192: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 10.10.0.2  netmask 255.255.0.0  broadcast 10.10.255.255
        inet6 fe80::7dcd:991d:a8dc:1ac1  prefixlen 64  scopeid 0x20<link>
        ether 00:50:56:aa:d9:58  txqueuelen 1000  (Ethernet)
        RX packets 247128  bytes 16897673 (16.1 MiB)
        RX errors 0  dropped 18  overruns 0  frame 0
        TX packets 5459  bytes 725636 (708.6 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

ens256: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 172.16.0.2  netmask 255.255.255.0  broadcast 172.16.0.255
        inet6 fe80::8bb1:d6e3:eb6:eaf5  prefixlen 64  scopeid 0x20<link>
        ether 00:0c:29:07:56:fb  txqueuelen 1000  (Ethernet)
        RX packets 27184  bytes 3553978 (3.3 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 1767  bytes 230314 (224.9 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 42  bytes 3432 (3.3 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 42  bytes 3432 (3.3 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

# 添加入站规则
$ iptables -t filter -I INPUT -i ens192 -p icmp -j DROP

# 添加出站规则
$ iptables -t filter -I OUTPUT -o ens192 -j DROP
```

&emsp;&emsp;回顾概念章节里面的 iptables 报文流向图，可以发现有的报文是别的主机发到本机的，有的报文是本机发送给其它主机的。因此：
- `-i` 选项只能用于 `PREROUTING`、`INPUT`、`FORWARD` 这三条链
- `-o` 选项只能用于 `FORWARD`、`OUTPUT`、`POSTROUTING` 这三条链。

### 扩展匹配条件
&emsp;&emsp;上面的章节已经完成基础匹配条件的介绍，那么接下来我们介绍一下扩展匹配条件。

#### icmp
&emsp;&emsp;ICMP（Internet Control Message Protocol，互联网控制报文协议）主要用于探测网络上的主机是否可用、目标是否可达、网络是否通畅、路由是否可用等等，常用的 `traceroute`、`ping` 命令使用的就是 ICMP 协议。

&emsp;&emsp;使用 ping 命令访问某主机时，如果主机可达，对应主机会对该 ping 请求做出回应（此处不考虑禁 ping 等情况）。根据 RFC792 标准[[链接](https://www.rfc-editor.org/rfc/inline-errata/rfc792.html)]，ping 请求报文属于类型 `8/0` 的 ICMP 报文，而响应报文属于类型 `0/0` 的响应报文，具体如下：

![](./assets/iptables-icmp.jpg)

&emsp;&emsp;icmp 模块可以用于匹配指定 `type`、`code` 的报文，支持以下选项：

- `--icmp-type`：匹配指定类型的 ICMP 报文，格式为 `<type>/<code>` 或 `<name>`

```bash
# 禁止所有 icmp 类型的报文进入本机
# 以下命令虽然可以禁止别的主机向本机发送 ping 请求，但同时也会造成本主机无法 ping 别的主机（因为响应报文被 REJECT）
$ iptables -t filter -I INPUT -p icmp -j REJECT

# 由于响应报文的标识为 8/0（type 为 8，code 为 0），因此可以只拒绝请求报文
# 这样当前主机就可以正常使用 ping 命令了
$ iptables -t filter -I INPUT -p icmp --icmp-type 8/0 -j REJECT

# 也可以使用名称去匹配对应类型的报文
$ iptables -t filter -I INPUT -p icmp --icmp-type "echo-request" -j REJECT
```

#### tcp/udp
&emsp;&emsp;基础匹配条件里，没有提供`源端口`和`目标端口`这两个匹配条件。如果需要对端口进行匹配，则需要借助 tcp/udp 扩展模块。

&emsp;&emsp;tcp/udp 模块支持以下配匹配条件：

- `--sport`：添加源端口匹配条件，支持取反操作；
- `--dport`：添加目标端口匹配条件，支持取反操作；
- `--tcp-flags`：<font color=red>只能用于 tcp 协议</font>，根据 tcp 报文的`标识位`作为匹配条件；
- `--syn`：<font color=red>只能用于 tcp 协议</font>，用于匹配 tcp 新建连接的请求报文，相当于 `--tcp-flags SYN,RST,ACK,FIN SYN`。

```bash
# 拒绝来自 172.16.0.10 的 ssh 请求
# 使用 --dport 时，必须事先指定使用了哪种协议，即必须先使用 -p 选项
# 确认了协议之后，则需要使用 -m 选项指定扩展模块
$ iptables -t filter -I INPUT -s 172.16.0.10 -p tcp -m tcp --dport 22 -j REJECT

# 拒绝目标端口不是 22 的所有报文
$ iptables -t filter -I INPUT -s 172.16.0.10 -p tcp !--dport 22 -j REJECT

# 可以指定一个端口范围
# 拒绝目标端口范围为 [22, 25] 的所有报文，也就是拒绝目标端口为 22、23、24、25 的所有报文
# 如果端口范围写成 :22 代表匹配 [0, 22] 的端口
# 如果端口范围写成 80: 代理匹配 [80, 65535] 的端口
$ iptables -t filter -I INPUT -s 172.16.0.10 -p tcp --dport 22:25 -j REJECT
```

::: tip 提示
&emsp;&emsp;在上面的案例中，可以忽略 `-m` 选项。当使用了 `-p` 选项时，如果没有使用 `-m` 指定使用哪个扩展模块，iptables 会默认使用与协议名称相同的模块。
:::

&emsp;&emsp;`--tcp-flags` 主要用于匹配 TCP 报头里面的标志位，用于匹配特定的传输报文。

```bash
# 以下命令的意思是需要匹配 SYN,ACK,FIN,RST,URG,PSH 这 6 个标志位信息，其中 SYN 必须为 1，其余必须为 0
# 也就是 TCP 三次握手里面的第一次握手的情况
# 拒绝第一次握手即表示拒绝建立 TCP 连接
$ iptables -t filter -I INPUT -p tcp -m tcp --dport 22 --tcp-flags SYN,ACK,FIN,RST,URG,PSH SYN -j REJECT

# 以下命令的意思是需要匹配 SYN,ACK,FIN,RST,URG,PSH 这 6 个标志位信息，其中 SYN、ACK 必须为 1，其余必须为 0
# 也就是 TCP 三次握手里面的第二次握手的情况
$ iptables -t filter -I INPUT -p tcp -m tcp --dport 22 --tcp-flags SYN,ACK,FIN,RST,URG,PSH SYN,ACK -j REJECT

# 还可以简写为以下
$ iptables -t filter -I INPUT -p tcp -m tcp --dport 22 --tcp-flags ALL SYN -j REJECT

# tcp 模块还贴心地提供了第一次握手的简写
$ iptables -t filter -I INPUT -p tcp -m tcp --dport 22 --syn -j REJECT
```

#### state
&emsp;&emsp;在 icmp 章节中，如果我们直接禁用 icmp 类型的报文，则不仅其它主机无法 ping 本机，本机也无法 ping 其它主机。为了解决这个问题，我们需要区分 icmp 报文的类型，只拒绝 `8/0` 类型的报文，放行其它类型的 icmp 报文，才能让本机的 ping 命令正常工作。

&emsp;&emsp;同理，在 tcp/udp 协议中，当客户端通过 http 访问服务器的时候，客户端向服务器的 80 端口发起请求，服务端再通过 80 端口响应请求。因此我们应当在客户端的 iptables 规则里放行 80 端口，以便服务端的响应报文可以进入到客户端主机。 

```bash
# 放行从服务器 80 端口返回回来的响应报文
# 因此匹配规则为 --sport 80
$ iptables -I INPUT -t tcp --sport 80 -j ACCEPT
```

&emsp;&emsp;但如果这样设置放行规则的话，那么其它主机就可以通过 80 端口主动向客户端主机发送数据，造成客户端主机产生一定的风险。

&emsp;&emsp;为了解决这个问题，客户端可以选择针对已知安全的主机放行对应的端口，其他 IP 一律拒绝来保证客户端主机的安全。

```bash
# 只放行来自信任的服务器的报文
$ iptables -I INPUT -t tcp -s 10.10.0.10 --sport 80 -j ACCEPT
```

&emsp;&emsp;但是随着主机越来越多，这样的放行规则就越来越多，配置越来越复杂，从而产生维护困难等问题。如果通过 `--tcp-flags` 选项将外来的“第一次握手”的请求拒绝，那对方仍然可以通过 UDP、ICMP 协议等向客户端发送数据，仍然无法保证客户端主机的安全。

&emsp;&emsp;那有没有一种优雅的方法，让客户端主机只接收响应请求的报文，拒绝那些主动向客户端主机发送过来的报文呢？

&emsp;&emsp;iptables 的 state 模块就是用于解决这类问题的。state 模块可以让 iptables <font color=red>实现“连接追踪机制”</font>。在 TCP/IP 协议簇中，UDP 和 ICMP 是没有连接的，但对于 state 模块来说，tcp 报文、udp 报文、icmp 报文都是有连接状态的，只要两台主机在“你来我往”地通信，就算建立起连接。

&emsp;&emsp;对于 state 模块的连接而言，报文可以分为 5 种状态：

- `NEW`：连接中的第一个包，状态就是 NEW，可以理解为新连接的第一个包的状态为 NEW；
- `ESTABLISHED`：NEW 状态包后面的包的状态为 ESTABLISHED，表示连接已建立；
- `RELATED`：如果两个连接有关联关系，则其中一个连接会被标为 RELATED；
- `INVALID`：如果一个包没有办法被识别，或者这个包没有任何状态，那么这个包的状态就是 INVALID
- `UNTRACKED`：报文未被追踪，通常表示报文无法找到相关连的连接。

&emsp;&emsp;解决以上问题的关键在于如何区分报文是否为了回应之前发出去的报文。那么通过 state 模块，可以将 `ESTABLISHED`、`RELATED` 状态的报文放行即可，表示放行回应我们的的报文。

&emsp;&emsp;state 模块支持以下参数：

- `--state`：匹配指定状态的报文，多种状态使用 `,` 连接。

```bash
# 放行连接状态为 ESTABLISHED、RELATED 的报文
$ iptables -t filter -I INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
# 在 INPUT 链最后添加拒绝所有报文的规则
$ iptables -t filter -A INPUT -j REJECT

# 使用 ssh 访问其它主机，可以正常工作
$ ssh root@172.16.0.10
root@172.16.0.10's password: 
```

```bash
# 在其它主机上访问 172.16.0.2 时，无法正常连接
$ ssh root@172.16.0.2
ssh: connect to host 172.16.0.2 port 22: Connection refused

# 也无法 ping 通 172.16.0.2
$ ping 172.16.0.2 -c4
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
From 172.16.0.2 icmp_seq=1 Destination Port Unreachable
From 172.16.0.2 icmp_seq=2 Destination Port Unreachable
From 172.16.0.2 icmp_seq=3 Destination Port Unreachable
From 172.16.0.2 icmp_seq=4 Destination Port Unreachable

--- 172.16.0.2 ping statistics ---
4 packets transmitted, 0 received, +4 errors, 100% packet loss, time 3000ms
```

#### multiport
&emsp;&emsp;tcp/udp 扩展模块只能匹配连续的端口范围，如果需要指定多个离散的、不连续的端口，则需要借助 multiport 模块。

&emsp;&emsp;multiport 模块支持以下参数：

- `--sports`：源端口，多个端口使用 `,` 连接；
- `--dports`：目标端口，多个端口使用 `,` 连接。

```bash
# 拒绝目标端口为 22、80、443 端口的报文
$ iptables -t filter -I INPUT -p tcp -m multiport --dports 22,80,443 -j REJECT

# 在 multiport 模块，也可以指定端口范围
# 下面规则匹配 [0, 22]、[80, 88]、[1000, 65535]
$ iptables -t filter -I INPUT -p tcp -m multiport --dports :22,80:88,1000: -j REJECT
```

&emsp;&emsp;multiport 扩展模块只能用于 tcp 协议和 udp 协议，即需要配合 `-p tcp` 或 `-p udp` 使用。

#### iprange
&emsp;&emsp;在上面的章节中，使用 `-s` 或 `-d` 表示源地址与目标地址时，可以同时指定多个 IP，也可以指定一个网段，但是不能一次性指定一段连续的 IP 地址范围。如果我们需要指定一段连续的 IP 地址范围，那么需要借助 `iprange` 扩展模块。

&emsp;&emsp;通过 iprange 的 `--src-range` 选项指定源地址范围，使用 `--dst-range` 选项指定目标地址范围

```bash
# 丢弃源 IP 地址在 10.10.5.[2, 100] 范围的报文
$ iptables -t filter -I INPUT -m iprange --src-range 10.10.5.2-10.10.5.100 -j DROP

# 可以对 IP 范围进行取反
$ iptables -t filter -I INPUT -m iprange !--src-range 10.10.5.2-10.10.5.100 -j DROP
```

#### string
&emsp;&emsp;使用 string 扩展模块可以用于指定需要匹配的字符串，如报文中包含对应的字符串，则命中匹配条件。

&emsp;&emsp;使用 string 模块时，我们需要指定以下两个选项：

- `--algo`：必选项，指定匹配算法。可选算法有 `bm` 与 `kmp`；
- `--string`: 必须项，指定待匹配字符串。

```bash
# 拒绝报文中存在 test 的报文
$ iptables -t filter -I INPUT -m string --alog bm --string "test" -j REJECT
```

#### time
&emsp;&emsp;使用 time 扩展模块，可以根据时间段匹配报文。如果报文到达时间在指定时间范围，则命中匹配条件。

&emsp;&emsp;使用 time 模块时，支持以下选项：

- `--timestart`：可选项，指定起始时间，时间格式为 `HH:mm:ss`；
- `--timestop`：可选项，指定结束时间，时间格式为 `HH:mm:ss`；
- `--weekdays`：可选项，指定每个星期的哪些天。可以通过数字 1～7 表示，也可以通过 Mon, Tue, Wed, Thu, Fri, Sat, Sun 表示。<font color=red>支持取反操作</font>；
- `--monthdays`：可选项，指定每月的哪些天。<font color=red>支持取反操作</font>；
- `--datestart`：可选项，指定开始日期，时间格式为 `yyyy-MM-dd`；
- `--datestop`：可选项，指定结束日期，时间格式为 `yyyy-MM-dd`。

```bash
# 指定时间范围
$ iptables -t filter -I OUTPUT -p tcp --dport 80 -m time --timestart 09:00:00 --timestop 18:00:00 -j REJECT

# 周六、日不能访问 80 端口
$ iptables -t fitler -I OUTPUT -p tcp --dport 80 -m time --weekdays 6,7 -j REJECT

# 每月 22、23 号不能访问 80 端口
$ iptables -t filter -I OUTPUT -p tcp --dport 80 -m time --monthdays 22,23 -j REJECT

# 2024 年 1 月 22 日到 2025 年 1 月 22 日不能访问 80 端口
$ iptables -t filter -I OUTPUT -p tcp --dport 80 -m time --datestart 2024-01-22 --datestop 2025-01-22 -j REJECT
```

#### connlimit
&emsp;&emsp;使用 connlimit 扩展模块，可以限制每个 IP 地址同时连接到 server 端的连接数量。如果不指定 IP，则默认针对`每个客户端 IP`，即对单个 IP 的并发连接数限制。

&emsp;&emsp;使用 connlimit 模块时，支持以下选项：

- `--connlimit-above`：限制每个 IP 地址最多占用链接数。对其取反，则与 `--connlimit-opto` 含义相同；
- `--connlimit-opto`：每个 IP 的连接数不超过指定链接数，则允许链接。CentOS 7 以后才可以使用；
- `--connlimit-mask`：限制网段的连接数量。根据连接进来的 IP 计算网段。

```bash
# 每个 IP 地址只能占用两个 ssh 连接
$ iptables -t filter -I INPUT -p tcp --dport 22 -m connlimit --connlimit-above 2 -j REJECT

# 如果 IP 地址占用链接数不超过 2 个，则接受
# 注意，此规则不代表 IP 地址占用链接超过 2 个就拒绝
# 因为 connlimit 的目标是限制链接数量，因此取反操作相对比较少用
$ iptables -t filter -I INPUT -p tcp --dport 22 -m connlimit --connlimit-above 2 -j ACCEPT

# 根据连接进来的 IP 计算网段，相同网段的 IP 共用连接数
# 如 192.168.101.173 访问，则以下规则的意思是 192.168.101.0/24 这个网段下所有的 IP 共用 2 个链接数
# 如果其中一台主机占用了 2 个链接数，则其余所有的 IP 都无法连接
$ iptables -t filter -I INPUT -p tcp --dport 22 -m connlimit --connlimit-above 2 --connlimit-mask 24 -j REJECT
```

#### limit
&emsp;&emsp;使用 limit 扩展模块，可以限制单位时间内流入的包的数量，从而限制流量速率。limit 扩展模块使用 `令牌桶` 算法进行限流。

&emsp;&emsp;使用 limit 模块时，支持以下选项：

- `--limit`：速率限制。如 `10/minute`。可选单位有 `/second`、`/minute`、`/hour`、`/day`。
- `--limit-burst`：令牌桶容量，默认为 5。

```bash
# 每分钟释放 10 个令牌（也就是每 6 秒一个令牌）
$ iptables -t filter -I INPUT -p icmp -m limit --limit 10/minute -j ACCEPT

# 注意，limit 模块只是说以 10/minute 速率接收，不代表其余的会被拒绝
# 由于 INPUT 链的默认规则是 ACCEPT，因此未被这个规则匹配上的报文也会被 ACCEPT
# 为了让上面的限流生效，可以修改链的默认策略
$ iptables -t filter -A INPUT -p icmp -j REJECT
```

```bash
# 在其它主机使用 ping 命令测试令牌桶
$ ping 172.16.0.2
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
64 bytes from 172.16.0.2: icmp_seq=1 ttl=64 time=0.252 ms
64 bytes from 172.16.0.2: icmp_seq=2 ttl=64 time=0.577 ms
64 bytes from 172.16.0.2: icmp_seq=3 ttl=64 time=0.550 ms
64 bytes from 172.16.0.2: icmp_seq=4 ttl=64 time=0.491 ms
64 bytes from 172.16.0.2: icmp_seq=5 ttl=64 time=0.661 ms
From 172.16.0.2 icmp_seq=6 Destination Port Unreachable
64 bytes from 172.16.0.2: icmp_seq=7 ttl=64 time=0.254 ms
From 172.16.0.2 icmp_seq=8 Destination Port Unreachable
From 172.16.0.2 icmp_seq=9 Destination Port Unreachable
From 172.16.0.2 icmp_seq=10 Destination Port Unreachable
From 172.16.0.2 icmp_seq=11 Destination Port Unreachable
From 172.16.0.2 icmp_seq=12 Destination Port Unreachable
64 bytes from 172.16.0.2: icmp_seq=13 ttl=64 time=0.588 ms
From 172.16.0.2 icmp_seq=14 Destination Port Unreachable
From 172.16.0.2 icmp_seq=15 Destination Port Unreachable
```

::: tip 提示
&emsp;&emsp;注意，如果令牌桶的容量空了，那么 limit 会根据速度定速向令牌桶添加令牌。超过令牌桶容量的令牌将被丢弃。
:::

### 自定义链
&emsp;&emsp;在上面的章节中，我们一般都是在 iptables 的默认链中定义规则。但随着规则越来越多，默认链上的规则将会混杂着各种类型的规则，非常不利于日常运维。iptables 支持自定义链，通过将规则分类归集到不同的链上，从而简化日常运维管理工作。

```bash
# 清空规则
$ iptables -F

# 在 filter 表上创建一条名为 IN_HTTP 的链
# IN_HTTP 链用于集中保存与 HTTP 协议有关的规则
$ iptables -t filter -N IN_HTTP

# 查看 filter 表
$ iptables -nvL
Chain INPUT (policy ACCEPT 37 packets, 2440 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain OUTPUT (policy ACCEPT 18 packets, 2044 bytes)
 pkts bytes target     prot opt in     out     source     
Chain IN_HTTP (0 references)
 pkts bytes target     prot opt in     out     source               destination  
```

&emsp;&emsp;在上面案例中，可以看到已创建了 `IN_HTTP` 链，同时可以发现后面跟着 `(0 references)`。在 iptables 中，自定义链是不能直接使用的，必须被默认链引用才能够使用。

```bash
# 向 IN_HTTP 链添加规则
$ iptables -t filter -I IN_HTTP -s 172.16.0.10 -j REJECT

# 向 INPUT 添加规则，将访问本机 80 端口的 tcp 报文交给 IN_HTTP 处理
# 注意，之前的章节中，-j 参数用于直接指定 ACCEPT、REJECT、DROP 等动作，这里将自定义链作为动作
$ iptables -I INPUT -p tcp --dport 80 -j IN_HTTP

# 查看 filter 表
# 可以看到 IN_HTTP 链引用数量变为 1
$ iptables -nvL
Chain INPUT (policy ACCEPT 6 packets, 384 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 IN_HTTP    tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:80

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain OUTPUT (policy ACCEPT 3 packets, 320 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain IN_HTTP (1 references)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 REJECT     all  --  *      *       172.16.0.10          0.0.0.0/0            reject-with icmp-port-unreachable
```

::: tip 提示
&emsp;&emsp;可以在主机 A（172.16.0.10）上访问本主机 B，确认规则是否生效。
:::

&emsp;&emsp;自定义链的其它操作：

```bash
# 重命名自定义链
$ iptables -E IN_HTTP HTTP

# 删除自定义链
# 执行删除操作时，需要注意以下事项:
# 1. 删除自定义链的所有引用，引用为 0 时才能删除，否则会报 Too many links 错误
# 2. 先清空自定义链下的规则，否则会报 Directory not empty 错误
$ iptables -X HTTP
```

### 黑白名单机制
&emsp;&emsp;在规则管理的查询规则章节，我们提及到，链具有默认策略(`policy`)，比如 `FILTER` 表的 `INPUT` 链的默认策略为 `ACCEPT`，即如果报文没有匹配上所有规则时，则执行默认策略。由于默认策略为 ACCEPT，那么在设置规则的时候，链中的规则对应的动作应该为 DROP 或 REJECT，表示只有匹配到规则的报文才会被拒绝，没有被规则匹配到的报文都会被默认接受，因此这就是<font color=red>黑名单机制</font>。

&emsp;&emsp;同理，当链的默认策略为 `DROP` 或 `REJECT` 时，链中的规则对应的动作应该为 `ACCEPT`，表示只有匹配到规则的报文才会被接受，没有被规则匹配到的报文都会被默认丢弃/拒绝，这就是<font color=red>白名单机制</font>。

&emsp;&emsp;iptables 支持修改链的默认策略，如下：

```bash
# 为了防止服务器断开连接，提前在 INPUT 未尾添加一个接受所有报文的规则
$ iptables -A INPUT -j ACCEPT

# 设置 FILTER 表的 INPUT 链的默认策略为 DROP
$ iptables -P INPUT DROP

# 再次查询 INPUT 链
# 可以发现 policy 已变更主国 DROP 了
# 注意，此时千万不要执行 iptables -F 命令，因为清空规则后，如果报文没有被规则匹配上时，会被默认丢弃
$ iptables -nvL INPUT
Chain INPUT (policy DROP 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
   26  1752 ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0           
```

### 动作
&emsp;&emsp;在前面的文档里，有提及到 `ACCEPT`、`DROP`、`REJECT` 等动作，其中 `ACCEPT` 和 `DROP` 动作比较简单，这里对其它动作作一些补充。

#### REJECT
&emsp;&emsp;在使用 `REJECT` 时，可以通过 `--reject-with` 选项设置拒绝信息，可选项如下：

- `icmp-port-unreachable`(默认)
- `icmp-net-unreachable`
- `icmp-host-unreachable`
- `icmp-proto-unreachable`
- `icmp-net-prohibited`
- `icmp-host-pro-hibited`
- `icmp-admin-prohibited`

```bash
# 添加规则，拒绝所有 icmp 协议的报文，拒绝信息为 icmp-host-unreachable
$ iptables -I INPUT -p icmp -j REJECT --reject-with icmp-host-unreachable

# 在另一台电脑执行 ping 命令
# 可以发现之前错误信息已变更为 Destination Host Unreachable
$ ping 172.16.0.2 -c 4
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
From 172.16.0.2 icmp_seq=1 Destination Host Unreachable
From 172.16.0.2 icmp_seq=2 Destination Host Unreachable
From 172.16.0.2 icmp_seq=3 Destination Host Unreachable
From 172.16.0.2 icmp_seq=4 Destination Host Unreachable

--- 172.16.0.2 ping statistics ---
4 packets transmitted, 0 received, +4 errors, 100% packet loss, time 3000ms
```

#### LOG
&emsp;&emsp;使用 `LOG` 指令可以记录报文的相关信息到日志文件 `/var/log/messages` 文件中<sup><font color=red>[1]</font></sup>。`LOG` 动作支持以下选项：

- `--log-level`：指定记录日志的日志级别，可用级别有 `emerg`、`alert`、`crit`、`error`、`warning`、`notice`、`info`、`debug`；
- `--log-prefix`：在日志头部添加标签，用于区分日志是由哪些规则产生的。最长不能超过 29 个字符。

::: tip 提示
1. 可以通过修改 `/etc/rsyslog.conf` 或 `/etc/syslog.conf` 配置文件修改日志文件的位置，添加 `kern.warning /var/log/iptables.log` 选项，并通过 `service rsyslog restart` 命令重启服务即可。
:::

```bash
# 添加日志
$ iptables -I INPUT -p icmp -j LOG --log-prefix [ICMP]

# 访问后再查看日志
# 可以发现产生了带 [ICMP] 前缀的报文日志
$ tail -f /var/log/messages
May 12 22:19:05 centos7 kernel: [ICMP]IN=ens256 OUT= MAC=00:0c:29:07:56:fb:00:50:56:aa:87:42:08:00 SRC=172.16.0.10 DST=172.16.0.2 LEN=84 TOS=0x00 PREC=0x00 TTL=64 ID=56803 DF PROTO=ICMP TYPE=8 CODE=0 ID=5080 SEQ=1 
May 12 22:19:06 centos7 kernel: [ICMP]IN=ens256 OUT= MAC=00:0c:29:07:56:fb:00:50:56:aa:87:42:08:00 SRC=172.16.0.10 DST=172.16.0.2 LEN=84 TOS=0x00 PREC=0x00 TTL=64 ID=57301 DF PROTO=ICMP TYPE=8 CODE=0 ID=5080 SEQ=2 
May 12 22:19:07 centos7 kernel: [ICMP]IN=ens256 OUT= MAC=00:0c:29:07:56:fb:00:50:56:aa:87:42:08:00 SRC=172.16.0.10 DST=172.16.0.2 LEN=84 TOS=0x00 PREC=0x00 TTL=64 ID=57840 DF PROTO=ICMP TYPE=8 CODE=0 ID=5080 SEQ=3 
May 12 22:19:08 centos7 kernel: [ICMP]IN=ens256 OUT= MAC=00:0c:29:07:56:fb:00:50:56:aa:87:42:08:00 SRC=172.16.0.10 DST=172.16.0.2 LEN=84 TOS=0x00 PREC=0x00 TTL=64 ID=58047 DF PROTO=ICMP TYPE=8 CODE=0 ID=5080 SEQ=4
```

## 网络防火墙
### 概述
&emsp;&emsp;在概念章节中，我们提及到防火墙分为主机防火墙与网络防火墙。在上面的章节中，iptables 基本都是作为主机防火墙的角色工作的，那么接下来介绍 iptables 作为网络防火墙应该如何工作。

&emsp;&emsp;网络防火墙一般作为内部网络的入口或处于内部网络的边缘，作为内部网络与外部网络的沟通桥梁。网络防火墙在转发包时，可以通过 iptables 对包进行规则匹配，从而行使网络防火墙的职责。

![](./assets/iptables-firewall-gateway.svg)

::: tip 提示
&emsp;&emsp;在上面的图例中，因为所有外部流量都必须通过网络防火墙才能进入到局域网，因此局域网内的所有主机就是防火墙的保护范围。
:::

&emsp;&emsp;在概念章节中，我们也提及到，如果作为网络防火墙，则需要用到 `PREROUTING`、`FORWARD`、`POSTROUTING` 这三条链，因此当主机的角色为网络防火墙时，规则一般定义在 `FORWARD` 链中。

::: tip 提示
&emsp;&emsp;`INPUT` 链和 `OUTPUT` 链会同时影响主机防火墙和网络防火墙。
:::

&emsp;&emsp;在上面的环境准备章节中，我们已准备了两个网段（`172.16.0.0/24`、`10.10.0.0/24`）和三台主机，接下来我们继续使用这个环境模拟与测试网络防火墙。

&emsp;&emsp;在上面的规则的测试过程中，主机 B 虽然有两张网卡，但是上面的 iptables 的规则都是以主机防火墙的角色来工作的。如果要让主机 B 作为网络防火墙的角色，我们需要对原来的网络做以下改变：

- 主机 B 充当了 `10.10.0.0/24` 网段的网络防火墙的角色，因此需将主机 C 的网关设置为主机 B 的 IP `10.10.0.2`<sup><font color=red>[1]</font></sup>;
- Linux 主机默认没有启用报文转发功能，因此主机 B 需要启用报文转发功能<sup><font color=red>[2]</font></sup>；
- 主机 A 需要访问主机 C，因此我们通过 `route add -net 10.10.0.0/24 gw 172.16.0.2` 命令<sup><font color=red>[3]</font></sup>设置路由。

::: tip 提示
1. 在 CentOS 7，可以通过修改 `/etc/sysconfig/network-scripts/ifcfg-ens192` 的 `GATEWAY` 属性设置；
2. 使用命令 `cat /proc/sys/net/ipv4/ip_forward` 查看当前主机是否启用了报文转发功能，如果内容为 `0` 则表示当前主机不支持转发。通过命令 `echo 1 > /proc/sys/net/ipv4/ip_forward` 可以临时开启报文转发功能（重启后失效）。如果需要永久生效，则需要设置 `/etc/sysctl.conf`（CentOS 7 使用 `/usr/lib/sysctl.d/00-system.conf`）文件，添加/修改配置项 `net.ipv4.ip_forward = 1` 即可；
3. 在 CentOS 7，需要安装 `net-tools` 之后才能使用 route 命令。
:::

```bash
# 完成以上的配置之后，在主机 A ping 主机 C
# 可以发现现在虽然主机 A 是 172.16.0.0/24 网段，但是仍能访问 10.10.0.10 主机
$ ping 10.10.0.10 -c 4
PING 10.10.0.10 (10.10.0.10) 56(84) bytes of data.
64 bytes from 10.10.0.10: icmp_seq=1 ttl=63 time=0.988 ms
64 bytes from 10.10.0.10: icmp_seq=2 ttl=63 time=0.909 ms
64 bytes from 10.10.0.10: icmp_seq=3 ttl=63 time=0.451 ms
64 bytes from 10.10.0.10: icmp_seq=4 ttl=63 time=0.888 ms

--- 10.10.0.10 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3003ms
rtt min/avg/max/mdev = 0.451/0.809/0.988/0.210 ms
```

### 添加规则
&emsp;&emsp;现在在网关主机 B上添加规则：

```bash
###############################################
# 主机 B（172.16.0.2 / 10.10.0.2）
###############################################
# 在 FORWARD 链新增规则，拒绝所有报文
$ iptables -A FORWARD -j REJECT

###############################################
# 主机 A（172.16.0.10）
###############################################
# 测试是否还能访问主机 C（10.10.0.10）
# 可以发现现在已经无法 ping 通了
$ ping 10.10.0.10 -c 4
PING 10.10.0.10 (10.10.0.10) 56(84) bytes of data.
From 172.16.0.2 icmp_seq=1 Destination Port Unreachable
From 172.16.0.2 icmp_seq=2 Destination Port Unreachable
From 172.16.0.2 icmp_seq=3 Destination Port Unreachable
From 172.16.0.2 icmp_seq=4 Destination Port Unreachable

--- 10.10.0.10 ping statistics ---
4 packets transmitted, 0 received, +4 errors, 100% packet loss, time 3001ms

###############################################
# 主机 B（172.16.0.2 / 10.10.0.2）
###############################################
# 查看 iptables 规则详情，发现已匹配并处理了 4 个包
# 因此可以确认主机 A 的报文是可以通过主机 B 的转发到达主机 C 的
$ iptables -nvL
Chain INPUT (policy ACCEPT 13 packets, 832 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    4   336 REJECT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            reject-with icmp-port-unreachable

Chain OUTPUT (policy ACCEPT 9 packets, 992 bytes)
 pkts bytes target     prot opt in     out     source               destination         

# 添加一条规则，放行来自 172.16.0.0/24 ，访问目标端口为 80 的 tcp 协议报文
$ iptables -I FORWARD -s 172.16.0.0/24 -p tcp --dport 80 -j ACCEPT

###############################################
# 主机 A（172.16.0.10）
###############################################
# 主机 A 访问主机 C 提供的 http 服务
# 从结果可以得知，虽然在网关主机 B 放行了来自 172.16.0.0/24 的 tcp 协议报文，但是主机 A 还是无法访问主机 C 提供的 http 服务
# 这是因为主机 B 虽然放行了来自 172.16.0.0/24 的请求报文，但是却还是拦截了主机 C 的响应报文
# 因此请求已到达主机 C，但是获取不到响应
$ curl http://10.10.0.10

###############################################
# 主机 B（172.16.0.2 / 10.10.0.2）
###############################################
# 添加一条规则，放行响报文
# 注意，这里使用的是 -d 和 --sport 参数来匹配响应报文
$ iptables -I FORWARD -d 172.16.0.0/24 -p tcp --sport 80 -j ACCEPT

<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

&emsp;&emsp;由上面的案例中，我们可以得知，当 iptables 作为网络防火墙时，在配置规则时往往需要考虑双向性。对此，我们也可以对规则进行优化，放行所有`响应报文`，这样就不需要每次写两条规则了。

```bash
###############################################
# 主机 B（172.16.0.2 / 10.10.0.2）
###############################################
# 删除第 1 条规则，也就是我们放行响应的规则
$ iptables -D FORWARD 1

# 添加规则，入行所有响应报文
$ iptables -I FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT
```

&emsp;&emsp;通过以上防火墙主机 B 的规则，现在只能是 `172.16.0.0/24` 网段的主机访问位于网段 `10.10.0.0/24` 的主机 C 了，因此可以起到一定的保护作用了。

### 动作
&emsp;&emsp;在上面的章节中，我们介绍了 `ACCEPT`、`DROP`、`REJECT`、`LOG` 动作，这里再补充介绍一下 `SNAT`、`DNAT`、`MASQUERADE`、`REDIRECT` 这些动作。

&emsp;&emsp;在介绍这些动作前，先了解 `NAT` 的概念及作用。NAT 是网络地址转换（Network Address Translation）的缩写，主要用于修改报文的 IP 地址、端口等信息。NAT 功能通常会被集成到路由器、防火墙等设备中。NAT 修改报文报头过程如下图所示：

![](./assets/iptables-nat.svg)

&emsp;&emsp;接下来通过 `SNAT`、`DNAT` 章节具体介绍 NAT 的使用场景。

#### SNAT
&emsp;&emsp;接下来我们通过以下案例来理解 `SNAT` 动作。

&emsp;&emsp;我们已知两个主机之间在通信时，需要知道双方的 IP、端口才能通信。主机 A 在发送报文给主机 B 时，需要知道主机 B 的 IP 及端口，同时将自身的 IP、端口一同发送出去；主机 B 在接收到报文后，就可以通过请求报文上的来源 IP、端口将响应报文发送回给主机 A。

&emsp;&emsp;但是随着互联网、物联网等技术的发展，IPv4 下的 IP 地址容量越来越不能满足日益增长的设备数量，于是就爆发了“全球 IPv4 地址耗尽”的问题。而局域网与 `SNAT` 就可以很好的解决这个问题。

![](./assets/iptables-snat.svg)

&emsp;&emsp;如上图所示，这是一个经典的局域网拓扑图。在一个路由器下，接了非常多设备，这些设备在访问服务器的时候，一般经过以下步骤：

1. 主机（192.168.0.151）访问服务器（42.120.158.5）时，发送报文给路由器，报文头结构为 `[(192.168.0.151:15687),(42.120.158.5:80)]`；
2. 路由器收到报文后，将报文的源 IP、端口修改为路由器的 IP、端口，发送给服务器，此时报文头结构为 `[(14.145.170.79:25431),(42.120.158.5:80)]`。路由器在修改报文时，会同时将报文记录到 NAT 表中；
3. 服务器接收到报文后，根据源 IP、端口返回响应报文，响应报文结构为 `[(42.120.158.5:80),(14.145.170.79:25431)]`；
4. 路由器在收到响应报文后，根据 NAT 表找到原始的 IP、端口，并将报文目标 IP、端口修改原始的 IP、端口，发送给来源主机，此时响应报文结构为 `[(42.120.158.5:80),(192.168.0.151:15687)]`；
5. 主机接收到响应报文。

&emsp;&emsp;在上述的整个过程中，“IP 地址转换”一共发生了两次：

- 局域网的报文发送去时，报文的源 IP、端口会被修改，也就是源地址转换（SNAT，Source Network Address Translation）；
- 外部网络的报文响应时，报文的目标 IP、端口会被修改，也就是目标地址转换（DNAT，Destination Network Address Translation）。

&emsp;&emsp;虽然整个过程中同时用到了 `SNAT` 和 `DNAT`，但是因为前半段使用了 `SNAT`，因此整个过程我们称为 `SNAT`。

&emsp;&emsp;在以上案例中，所以局域网内所有的主机都通过路由器访问外部的服务器，而外部的服务器也只需要响应路由器就可以将响应报文返回给主机。因此，在这个过程中，局域网内的所有主机、设备都共用了路由器的外部 IP（14.145.170.79），这样就达到了 IP 复用的目标。我们都知道，局域网可以重复存在，比如你家是用 `192.168.0.0/24` 局域网，我家也可以用 `192.168.0.0/24` 局域网，我们两个互不干扰，那通过局域网容纳大量的设备，再通过 SNAT 让这些设备共享外部 IP，就能达到对 IPv4 进行扩容的目标。

::: tip 提示
&emsp;&emsp;回顾上面的过程，我们可以发现，服务器接收到的报文的源 IP、端口都已经被路由器修改了，因此服务器无法得知报文是由路由器下面的局域网中具体哪一台主机产生的。因此，SNAT 还可以让路由器隐藏局域网内主机的 IP，从而保护了内部主机的安全（无法从外部访问到内部）。
:::

&emsp;&emsp;通过以下命令来看 `SNAT` 怎么使用：

```bash
# 将来自 10.10.0.0/24 网段的
# -t nat 表示操作 NAT 表
# -A POSTROUTING 表示将规则添加到 POSTROUTING 链的未尾
# 
$ iptables -t nat -A POSTROUTING -s 10.10.0.0/24 -j SNAT --to-source 192.168.0.2
```

#### DNAT
&emsp;&emsp;接下来，我们通过以下案例来理解 `DNAT` 动作。

&emsp;&emsp;在一个局域网中，我们有两台主机作为服务器对外提供服务，其中 A 主机（192.168.0.30）的 445 端口可以提供文件共享服务，B 主机（192.168.0.35）的 80 端口可以提供网页服务，但是这两台服务器在局域网中使用的 IP ，只能被局域网内的主机访问，互联网无法访问到这两台主机。

&emsp;&emsp;此时，如果互联网想访问这两台服务器提供的服务，就需要路由器/网关对外暴露内部的主机的访问入口。此时，就需要用到 `DNAT`。

![](./assets/iptables-dnat.svg)

&emsp;&emsp;如上图所示，在一个局域网内，有很多台服务器主机对外提供服务。如果现在需要对外暴露这些服务，需要在网关/路由器指定端口，如访问网关的 10445 端口就是访问主机 A 的文件共享服务；访问网关的 10080 端口就是访问主机 B 的网页服务。外部主机在访问这些内部服务器的时候，一般经过以下步骤：

1. 主机（183.2.172.185）访问路由器的公网 IP（14.145.170.79），发送报文给路由器，报文头结构为 `[(14.145.170.79:10080):(183.2.172.185:12894)]`；
2. 路由器接收到报文件，查找端口印射记录，找到内部 IP，修改报文的目标 IP、端口，发送给内部服务器，报文件结构为 `[(192.168.0.35:80):(183.2.172.185:12894)]`；
3. 服务器接收到报文后，根据源 IP、端口返回响应报文，响应报文结构为 `[(183.2.172.185:12894),(192.168.0.35:80)]`;
4. 路由器在收到响应报文后，将报文的源 IP、端口修改为原始的 IP、端口，发送给来源主机，此时报文的结构为 `[(183.2.172.185:12894),(183.2.172.185:12894)]`;
5. 主机接收到响应报文。

&emsp;&emsp;在上述的整个过程中，“IP 地址转换”也一共发生了两次：

- 外部网络的报文发送时，报文的目标 IP、端口会被修改，也就是目标地址转换（DNAT，Destination Network Address Translation）；
- 局域网的报文响应时，报文年源 IP、端口会被修改，也就是源地址转换（SNAT，Source Network Address Translation）；

&emsp;&emsp;在整个过程中，因为前半段用了 `DNAT`，因此整个过程我们称为 `DNAT`。

&emsp;&emsp;通过上面的案例，我们知道如果想要对外暴露局域网内部服务，需要先建立路由器/网关的端口印射表，然后外部主机通过个些端口来访问内部服务，因此 DNAT 可以将内部服务暴露给外部访问。

::: tip 提示
&emsp;&emsp;回顾上面的过程，我们可以发现，虽然外部主机可以访问内部的服务器，但实际上外部主机并不知道这个内部主机的 IP 地址，只知道通过路由器指定的端口就能访问到内部的服务器。这样除了在路由器/网关上指定射口的映射关系，否则外部是无法访问到里面的主机的。这样就可以在一定程序上保护了内部的服务器主机。
:::

```bash
# 将来发送给 192.168.0.2:80 端口的报文的目标 IP、端口修改为 10.10.0.10:8080
$ iptables -t nat -I PREROUTING -d 192.168.0.2 -p tcp --dport 80 -j DNAT --to-destination 10.10.0.10:8080
```

#### MASQUERADE
&emsp;&emsp;在上面章节中，我们介绍了 SNAT，也就是源地址转换。使用 SNAT 的时候，必须有一个固定的外部 IP，否则每次 IP 地址发生变化后，我们都要重新配置 SNAT 垧侧，而 `MASQUERADE` 则可以解决这个问题。

&emsp;&emsp;MASQUERADE 的功能与 SNAT 基本一致，但是 MASQUERADE 会动态地将源地址转换为指定网卡上可用的 IP 地址。

```bash
# 将来自 10.10.0.0/24 网段的报文的源 IP、端口修改为 ens-if192 网卡的 IP 地址
$ iptables -t nat -I POSTROUTING -s 10.10.0.0/24 -o ens-if192 -j MASQUERADE
```

::: tip 提示
&emsp;&emsp;可以将 MASQUERADE 理解为动态的、自动化的 SNAT。如果没有动态 SNAT 的需求，则没有必要使用 MASQUERADE，因为 SNAT 更加高效。
:::

#### REDIRECT
&emsp;&emsp;REDIRECT 动作主要用于将指定端口的报文转发到另一个端口上。其使用方法如下：

```bash
# 将 80 端口的报文转发到 8080 端口
$ iptables -t nat -A PREROUTING -p tcp -dport 80 -j REDIRECT --to-ports 8080
```