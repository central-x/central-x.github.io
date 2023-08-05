# OpenVPN
## 概述
&emsp;&emsp;OpenVPN 经常用于将两个局域网打通，方便远程工作。在使用的过程中，可能需要控制特定网段的流量是否经过 VPN，以保证网络通信正常。

## 指定网段走 VPN
&emsp;&emsp;全部流量走本地，部份流量走 VPN。这种需求可以通过修改 .open 文件，加入以下内容：

```
# 不添加路由，所有流量走本地
route-nopull
# IP 为 192.168.x.x 的走 VPN 通道
route 192.168.0.0 255.255.0.0 vpn_gateway
# 可以添加多行配置
route 10.10.0.0 255.255.0.0 vpn_gateway
```

## 指定网段走本地
&emsp;&emsp;全部流量走 VPN，部份流量走本地。这种需求可以通过修改 .open 文件，加入以下内容：

```
# IP 为 192.168.x.x 的走本地通道，net_gateway 与 vpn_gateway 的作用相反
route 192.168.0.0 255.255.0.0 net_gateway
# 可以添加多行配置
route 10.10.0.0 255.255.0.0 net_gateway
```

