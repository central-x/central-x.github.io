# firewalld
## 概述
&emsp;&emsp;由于 iptables 相对来说配置起来比较复杂，因此在 CentOS 7 后新推出并默认使用 firewalld 防火墙[[链接](https://firewalld.org)]，用于减化防火墙的配置工作。firewalld 和 iptables 一样，本身不具备防火墙功能，他们的作用都是用于维护规则，而真正使用规则干活的是内核的 netfilter。

&emsp;&emsp;本文档主要用于记录如何使用 firewalld 管理防火墙。

## 启动与关闭
### 安装与启动

```bash
$ yum update -y
$ yum install -y firewalld
$ systemctl start firewalld
$ systemctl enable firewalld
$ systemctl status firewalld
```

### 关闭与卸载

```bash
$ systemctl stop firewalld
$ systemctl disable firewalld
$ yum -y remove firewalld
```

## 修改规则
&emsp;&emsp;firewalld 使用 `firewall-cmd` 命令来修改防火墙规则。

### 基础命令

```bash
# 显示 firewalld 状态
$ firewall-cm --state

# 不中断服务重新加载
$ firewall-cmd --reload

# 中断所有连接重新加载
$ firewall-cmd --complete-reload

# 将当前防火墙的规则永久保存
$ firewall-cmd --runtime-to-permanent

# 检查配置正确性
$ firewall-cmd --check-config
```

### 区域操作
&emsp;&emsp;在 firewalld 中，区域（zones）是一个非常重要的概念。区域为网络提供了安全等级，不同的网络或接口可以分配到不同的区域，从而对它们应用不同的安全策略。区域定义了对进入的流量的处理方式，每个区域都定义了自己允许进入的流量和可提供的服务。

&emsp;&emsp;在 firewalld 中，预定义了多个区域，其作用分别如下：

- block: 限制区，任何接收的网络连接，都被 IPv4 的 icmp-host-prohibited 信息和 IPv6 的 icmp6-adm-prohibited 信息所拒绝
- drop: 丢弃区，任何接收的网络数据包都被丢弃，没有任何回复。仅能有发送出去的网络连接。
- public: 共公区（默认）。不可信任共公区域内其它计算机，只接收经过选取的连接。
- external: 外部区，特别为了路由器启用了伪装功能的外部网络。不可信任来自该网络的其它计算机，只接收经过选取的连接。
- dmz: 非军事区，通常在该网络下放置一些不含机密信息的公用服务器，，可以有限信任网络内其它的计算机。只接收经过选择的连接。
- work: 工作区，可以基本相信网络内的其它计算机不会危害你的计算机。只接收经过选择的连接。
- home: 家庭区，可以基本相信网络内的其它计算机不会危害你的计算机。只接收经过选择的连接。
- internal: 内部区，可以基本相信网络内的其它计算机不会危害你的计算机。只接收经过选择的连接。
- trusted: 信任区，可授受所有的网络连接。

&emsp;&emsp;一般情况下，网络接口被绑定到 public 区，public 区的作用与限制基本也能满足我们对网络的安全要求，因此我们一般操作 public 区即可。

```bash
# 获取所有区域
$ firewall-cmd --get-zones
block dmz drop external home internal public trusted work

# 查看指定区域信息
$ firewall-cmd --zone=<zone> --list-all
public (active)
  target: default
  icmp-block-inversion: no
  interfaces: ens192
  sources: 
  services: dhcpv6-client ssh
  ports: 
  protocols: 
  masquerade: no
  forward-ports: 
  source-ports: 
  icmp-blocks: 
  rich rules:

# 将网络接口(可以理解为网卡)分配到指定的区域
$ firewall-cmd --zone=<zone> --change-interface=<interface> --permanent

# 为区域添加服务（以服务的方式对外开放接口）
$ firewall-cmd --zone=<zone> --add-service=<service> --permanent

# 为区域开放端口
$ firewall-cmd --zone=<zone> --add-port=<port>/<protocol> --permanent

# 重新加载配置
$ firewall-cmd --reload
```

### 高级规则
&emsp;&emsp;firewalld 支持使用 rich rule 来创建更复杂的规则，例如创建一条规则来阻止来自特定机器的某种类型的流量。

&emsp;&emsp;rich rule 的规则非常复杂，本文档只是例举了一些最常用的选项，更详细规则需要查看 firewalld 文档[[链接](https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html)]。

```bash
# 在指定区域下创建高级规则
$ firewall-cmd --zone=<zone> --add-rich-rule="[RULE]"

# 只允许指定网段下的计算机访问指定端口
$ firewall-cmd --zone=public --add-rich-rule='rule family=ipv4 source address=192.168.0.1/24 port port=3000 protocol=tcp accept'

# 拒绝来自指定网段下过来的流量
$ firewall-cmd --zone=public --add-rich-rule='rule family=ipv4 source address=192.168.0.1/24 reject'

# 丢弃来自指定网段下过来的流量
$ firewall-cmd --zone=public --add-rich-rule='rule family=ipv4 source address=192.168.0.1/24 drop'
```

::: tip 提示
&emsp;&emsp;在上面的高级规则中，我们用到了 `accept`、`reject`、`drop` 三个动作，其中 `accept` 动作很好理解，即接收流量。而 `reject` 和 `drop` 两者具有以下不同效果：

- **reject**:
   - **效果**：当使用 reject 动作时，防火墙会返回一个明确的拒绝数据包给客户端，通常是 `TCP FIN` 或 `UDP-ICMP-PORT-UNREACHABLE` 等类型的错误信息包。
   - **用户体验**：客户端会立即断开连接，并认为访问的主机不存在。由于得到了明确的拒绝信息，客户端知道其请求被拒绝了。
   - **安全性与调试**：reject 提供了一种更符合规范地处理方式，特别是在可控的网络环境中，更易于诊断和调试网络或防火墙产生的问题。
- **drop**：
   - **效果**：当使用 drop 动作时，防火墙会直接丢弃数据包，并不返回任何响应给客户端。
   - **用户体验**：客户端不会得到任何响应，需要等待连接尝试超时后才会意识到其请求被丢弃。由于没有明确地反馈，客户端可能会不确定请求是否已经发送或是否被处理。
   - **安全性与调试**：drop 提供了更高的防火墙安全性，因为攻击者无法从防火墙获得任何有用的反馈。然而，由于 drop 的处理方式很不规范，可能会对你的网络造成一些不可预期或难以诊断的问题。

&emsp;&emsp;在选择使用 `reject` 还是 `drop` 时，需要根据具体使用场景和需求进行权衡。
:::

&emsp;&emsp;如果一个区域下有多个 rich rule 时，那么防火墙会根据规则的优先级执行这些规则。与我们想像中根据规则定义的顺序执行所不同，firewalld 使用以下优先级规则：

- 日志规则：无论日志规则被定义在哪里，优先执行日志规则；
- drop/reject 规则：永远优先 accept 规则；
- accept 规则：优先级最低。

&emsp;&emsp;为了解决这个问题，我们可以通过为 rich rule 添加优先级顺序。

```bash
# priority 越小优先级越高
# priority 的取值范围为 -32768 ~ 32767 
$ firewall-cmd --zone=public --add-rich-rule='rule priority=-100 family=ipv4 source address=192.168.0.1/24 port port=3000 protocol=tcp accept'
```