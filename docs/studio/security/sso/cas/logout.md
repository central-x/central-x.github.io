# 退出登录入口
## 概述
&emsp;&emsp;CAS 协议对单点退出作出了规定，认证中心会记录当前会话与应用会话的绑定关系，当存在应用需要单点退出时，只需要重定向到本接口即可。

&emsp;&emsp;认证中心会在接收到退出登录接口的请求时，会根据当前会话找到之前绑定的应用会话，然后逐一向这些应用发起退出登录的请求。应用在接收到退出登录的请求时，需要主动清除本应用的会话。

## 接口描述
### 请求方法及地址

```
GET {schema}://{ip}:{port}/security/sso/cas/logout
```

### 请求参数（Query）

| 参数名  | 类型   | 可空 | 默认值 | 说明                                                                                                          |
|---------|--------|------|--------|---------------------------------------------------------------------------------------------------------------|
| service | String | 否   | 无     | &emsp;&emsp;服务地址。URL 格式，认证中心在完成退出登录之后，会重定向回该地址。该服务地址必须已经在租户中心中注册。 |

### 请求示例

```
GET {schema}://{ip}:{port}/security/sso/cas/logout?service=https%3A%2F%2Fyour.service%2Fsso%2Fcallback
```

&emsp;&emsp;注意，这里是指客户端需要重定向到该地址，而不是通过 ajax 访问接口。

&emsp;&emsp;认证中心在接收到退出登录的请求时，会逐一向应用发起退出登录的请求，该请求的格式如下：

```
POST {schema}://{ip}:{port}/{context-path}
Content-Type: application/x-www-form-urlencoded

logoutRequest=<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="GhepG8z9HVLDlWFMdgcCQxSu" Version="2.0" IssueInstant="2022-11-23T15:53:06.501267+08:00"><saml:NameID xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">@NOT_USED@</saml:NameID><samlp:SessionIndex>ST-1001-G88tFFYi7HivejHif97wg1WB</samlp:SessionIndex></samlp:LogoutRequest>
```

&emsp;&emsp;应用系统在接收到请求之后，需要根据请求里面的 `SessionIndex` 找到指定的会话并注销，完成单点登录的逻辑。