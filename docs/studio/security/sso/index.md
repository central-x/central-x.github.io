# 单点登录（SSO）
## 概述
&emsp;&emsp;单点登录（SingleSignOn，SSO），意思是用户在身份认证服务器上登录一次之后，即可获取访问单点登录系统中其他关联系统和应用软件的权限。

&emsp;&emsp;Central Security 实现了多种单点登录协议，可供第三方接入。

&emsp;&emsp;需要注意的是，如果应用软件是基于 Central Studio 体系研发的，则直接通过网关提供的会话信息即可完成统一认证，不需要另外再接入这个单点登录功能。这个单点登录功能是用于提供给第三方非基于 Central Studio 体系研发的应用系统。