# CAS
## 概述
&emsp;&emsp;CAS（Central Authentication Service），即中央认证服务，是耶鲁大学发起的一个开源项目，指在为 Web 应用系统提供一种可靠的单点登录方法。

&emsp;&emsp;Central Security 实现了标准的 CAS 协议[[链接](https://apereo.github.io/cas/6.6.x/protocol/CAS-Protocol.html)]和标准[[链接](https://apereo.github.io/cas/6.6.x/protocol/CAS-Protocol-Specification.html)]，因此支持开发者通过标准的 CAS 的客户端接入。

&emsp;&emsp;第三方应用系统在接入认证中心前，需要提前在租户中心注册该应用系统。认证中心会在登录的过程中检测 service 的地址是否与应用匹配。如果不匹配的话，将会提示相关错误。

## 个人见解
&emsp;&emsp;CAS 协议虽然是老牌统一认证协议，但是个人认为这个协议是设计得比较不好。CAS 协议上存在比较大的问题:

- **会话不同步**

&emsp;&emsp;应用系统的会话与主会话（认证中心的会话）是不同步的。比如用户通过 CAS 登录了 A 系统，然后就一直在 A 系统操作业务。等一段时间后（超过主会话超时时间），此时用户再去访问 B 系统，那么此时由于主会话已经超时了，因此用户需要再次完成认证才能访问 B 系统。

&emsp;&emsp;如果此次用户又在一直操作 B 系统的业务，过一段时间之后再去操作 A 系统，那么有可能 A 系统的会话又超时了，这时候又需要用户重新完成认证。

- **不安全**

&emsp;&emsp;根据 CAS 的协议和标准，开发者只需要注册了 service 的地址，那么就可以接入到认证中心来。那么如果这个 service 地址被恶意使用的时候，就没办法阻止了。其他人完全可以通过 JavaScript 去模拟登录的全过程。另外，单点退出也是只需要知道 service 就可以了，恶意攻击者就可以随意将会话注销了。

- **接口设计不好**

&emsp;&emsp;比如单点退出接口[[链接](/studio/security/sso/cas/logout)]，竟然是让认证中心请求应用系统的任意接口。参数更是骚包，竟然是发起一个 Content-Type 为 application/x-www-form-urlencoded 的 POST 请求，请求参数名叫 `logoutRequest`，请求参数值竟然是一个 XML！简直雷到我了。

&emsp;&emsp;又比如服务认证接口[[链接](/studio/security/sso/cas/service-validate)]，是通过请求参数 `format` 来控制响应体的格式的。其实这个用 HTTP 协议里面的请求头 `Accept` 就可以解决了，完全没有必要再加个参数。

&emsp;&emsp;反正个人是比较不喜欢 CAS 协议的，只不过这个协议应用比较广泛，有很多开源的应用系统、类库都支持了这个协议，因此认证中心也实现了这个协议。