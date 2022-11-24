# 接口总体说明
## 概述
&emsp;&emsp;Central Multicast 实现了一套标准的 API，用于统一管理应用系统的消息方播方式，隐藏背后的发送消息的细节。

## 访问凭证
&emsp;&emsp;为了保证广播中心的安全，在调用广播中心的接口时，需要提供访问凭证。访问凭证使用 JWT 生成。生成逻辑如下：

```java
// 应用系统的访问密钥
var applicationSecret = "xxxx";

var token = JWT.create()
    // 限制访问凭证的有效期为 5 分钟
    .withExpiresAt(new Date(System.currentTimeMillis() + 5 * 60 * 1000))
    // 使用应用密钥对 JWT 进行签名
    .sign(Algorithm.HMAC256(applicationSecret));
```