# tcpdump
## 概述
&emsp;&emsp;`tcpdump` 是一个网络协议分析工具，用于捕获和分析网络上的数据包。它可以帮助我们了解网络通信过程中的数据包，包括源地址、目标地址、协议类型、端口号、数据包内容等。 它支持多种协议，包括 TCP、UDP、ICMP、IPv6 等。`tcpdump` 常用于网络故障诊断、安全分析、协议学习等场景。

## 使用方法
### 基本命令格式

```bash
$ tcpdump [options] [filter_expression]
```

- **options**：用于控制 `tcpdump` 的行为，比如捕获的数据包的数量、是否将数据包保存到文件中等；
- **filter_expression**：用于指定捕获哪些类型的数据包，这个表达式基于 BPF（Berkeley Packet Filter）语法。

### 常用选项

- `-a`：将网络地址和广播地址转变成名字；
- `-d`：将匹配信息包的代码以人类能够理解的汇编格式给出；
- `-dd`：将匹配信息包的代码以c语言程序段的格式给出；
- `-ddd`：将匹配信息包的代码以十进制的形式给出；
- `-D`：显示所有可用网络接口的列表；
- `-e`：在输出行打印出数据链路层的头部信息；
- `-f`：将外部的Internet地址以数字的形式打印出来；
- `-l`：使标准输出变为缓冲行形式；
- `-L`：列出指定网络接口所支持的数据链路层的类型后退出；
- `-n`：不解析 IP 地址和端口号，只显示原始的 IP 头和 TCP 头；
- `-q`：简洁地打印输出。即打印很少的协议相关信息, 从而输出行都比较简短；
- `-t`：在每行的输出中不输出时间；
- `-tt`：在每行的输出中会输出时间戳；
- `-ttt`：输出每两行打印的时间间隔(以毫秒为单位)；
- `-tttt`：在每行打印的时间戳之前添加日期的打印（此种选项，输出的时间最直观）；
- `-v`：产生详细的输出. 比如包的TTL，id标识，数据包长度，以及IP包的一些选项。同时它还会打开一些附加的包完整性检测，比如对IP或ICMP包头部的校验和；
- `-vv`：产生比 -v 更详细的输出. 比如NFS回应包中的附加域将会被打印, SMB数据包也会被完全解码；
- `-vvv`：产生比 -vv 更详细的输出。比如 telent 时所使用的SB, SE 选项将会被打印, 如果 telnet 同时使用的是图形界面，其相应的图形选项将会以 16 进制的方式打印出来；
- `-c <count>`：指定要捕获的数据包数量后停止捕捉，默认为无限；
- `-F`：从指定的文件中读取表达式,忽略其它的表达式；
- `-i <interface>`：指定要捕获的网络接口，例如 `eth0` 或 `ens33`，如果不指定，`tcpdump` 会选择默认的网络接口；
- `-w <file>`：将捕获的数据包保存到文件中，而不是直接显示到屏幕上，例如 `tcpdump.pcap`；
- `-r <file>`：从文件中读取数据包进行显示（这个文件一般是通过 -w 选项产生）；
- `-T`：将监听到的包直接解释为指定的类型的报文，常见的类型有rpc （远程过程调用）和snmp（简单　网络管理协议)；
- `-s <length>`：tcpdump 默认只会截取前 `96` 字节的内容，要想截取所有的报文内容，可以使用 `-s number`， `number` 就是你要截取的报文字节数，如果是 0 的话，表示截取报文全部内容；
- `-S`：seq ack 使用绝对序列号，而不是相对序列号；
- `-Z`：后接用户名，在抓包时会受到权限的限制。如果以root用户启动tcpdump，tcpdump将会有超级用户权限；

### 案例

```bash
# 捕获指定接口(网卡)的数据包，可通过 tcpdump -D 获取所有系统的接口
$ tcpdump -i eth0
# 捕获指定个数的数据包（3个数据包）
tcpdump -i eth0 -c 3
# 用ASCII码格式输出捕获的数据包
tcpdump -A -i eth0
# 显示可用的系统接口
tcpdump -D
# 用十六进制和ASCII码格式显示捕获的数据包
tcpdump -XX -i eth0
# 把捕获的数据包写入到一个.pcap后缀的文件中
tcpdump -w tempDump.pcap -i eth0
# 读取捕获数据包文件的内容
tcpdump -r tempDump.pcap
# 单个 n 表示不解析域名，直接显示 IP
tcpdump -n -i eth0
# 捕获TCP类型的数据包
tcpdump -i eth0 tcp
# 捕获指定端口（这里是22）的数据包
tcpdump -i eth0 port 22
# 捕获请求源是 192.169.12.101 的数据包
tcpdump -i eth0 src 源ip地址
# 捕获指定目的IP的数据包
tcpdump -i eth0 dst 目标ip地址
# 抓取指定网卡，指定IP和端口的数据包 并写入到data.pcap文件中
tcpdump -i eth6 dst host 目标ip地址 and port 8800 -w data.pcap
# 后台抓取两主机之间的数据
tcpdump host 192.168.12.101 and 192.168.1.201 -w out &
# 单个 n 表示不解析域名，直接显示 IP；两个 n 表示不解析域名和端口。这样不仅方便查看 IP 和端口号，而且在抓取大量数据时非常高效，因为域名解析会降低抓取速度
tcpdump -nn
```

### 演示
#### 显示可用的系统接口

```bash
$ tcpdump -D
1.ens33 [Up, Running, Connected]
2.any (Pseudo-device that captures on all interfaces) [Up, Running]
3.lo [Up, Running, Loopback]
4.bluetooth-monitor (Bluetooth Linux Monitor) [Wireless]
5.usbmon2 (Raw USB traffic, bus number 2)
6.usbmon1 (Raw USB traffic, bus number 1)
7.usbmon0 (Raw USB traffic, all USB buses) [none]
8.nflog (Linux netfilter log (NFLOG) interface) [none]
9.nfqueue (Linux netfilter queue (NFQUEUE) interface) [none]
```

#### 捕捉指定数量的报文

```bash
$ tcpdump -nn -i ens33 -c 3
dropped privs to tcpdump
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on ens33, link-type EN10MB (Ethernet), snapshot length 262144 bytes
16:07:28.557026 IP 192.168.102.6.22 > 192.168.9.57.58340: Flags [P.], seq 1900779451:1900779511, ack 2855781986, win 501, options [nop,nop,TS val 715899871 ecr 2198654239], length 60
16:07:28.558154 IP 192.168.102.6.22 > 192.168.9.57.58340: Flags [P.], seq 60:248, ack 1, win 501, options [nop,nop,TS val 715899872 ecr 2198654257], length 188
16:07:28.558566 IP 192.168.9.57.58340 > 192.168.102.6.22: Flags [.], ack 248, win 2045, options [nop,nop,TS val 2198654257 ecr 715899872], length 0
3 packets captured
3 packets received by filter
0 packets dropped by kernel
```

#### 捕捉报文并存放到文件

```bash
$ tcpdump -nn -i ens33 -c 30 -w dump.pcap
dropped privs to tcpdump
tcpdump: listening on ens33, link-type EN10MB (Ethernet), snapshot length 262144 bytes
30 packets captured
30 packets received by filter
0 packets dropped by kernel
```

::: tips 提示
&emsp;&emsp;`.pcap` 可以使用 Wireshark 打开。
:::

#### 捕捉指定报文

```bash
# 捕捉指定协议的数据报文
$ tcpdump -nn -i ens33 -c 30 tcp
$ tcpdump -nn -i ens33 -c 30 icmp

# 捕捉 tcp 协议，8080 端口的数据报文
$ tcpdump -nn -i ens33 -c 30 tcp port 8080

# 捕捉来源主机为 192.168.2.10 的数据报文
$ tcpdump -nn -i ens33 -c 30 src host 192.168.2.10

# 捕捉目标主机为 192.168.2.10 的数据报文（常用于网关）
$ tcpdump -nn -i ens33 -c 30 dst host 192.168.2.10

# and 条件演示
$ tcpdump -nn -i ens33 -c 30 host 192.168.2.10 and port 8080

# or 条件演示
$ tcpdump -nn -i ens33 -c 30 host 192.168.2.10 or 192.168.2.11

# 捕捉网段
$ tcpdump -nn -i ens33 -c 30 net 192.168.2.1/24
```