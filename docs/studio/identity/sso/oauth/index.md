# OAuth 2.0
## 概述
&emsp;&emsp;OAuth 2.0 认证协议[[链接](https://oauth.net/2/)]是一种应用广泛的认证协议，它具有实现简单、认证安全等特性，成为 RFC 6749 标准内容。

&emsp;&emsp;Central Security 实现了 OAuth 2.0 认证协议里的授权码（Authorization Code）认证模式。

&emsp;&emsp;OAuth 2.0 认证协议里，主会话状态与应用会话状态是完全无关的。即，当应用通过本协议完成会话交换之后，那么主会话与应用会话是独立管理的，主会话是否过期与应用会话完全无关；应用会话退出或过期也与主会话完全无关。