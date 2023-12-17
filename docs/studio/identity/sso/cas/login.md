# 认证入口
## 概述
&emsp;&emsp;本接口是 CAS 认证服务的入口。第三方应用系统在需要登录时，需要引导用户重定向到本地址。

&emsp;&emsp;认证中心在接收到 CAS 认证请求时，会重定向到登录界面（未登录时），并导引用户完成会话认证。认证成功后，认证中心会生成一个一次性票据（Ticket）并重定向到 service 指定的地址。应用系统在接收到回调时，需要通过服务认证接口[[链接](./service-validate)]验证票据，获取用户信息。

&emsp;&emsp;如果回调时，应用系统发现认证中心没有携带票据（Ticket），则表示用户拒绝完成认证过程。

## 接口描述
### 请求方法及地址

```
GET {schema}://{ip}:{port}/identity/sso/cas/login
```

### 请求参数（Query）

| 参数名     | 类型      | 可空 | 默认值   | 说明                                                                                                                                                                                                                                  |
|---------|---------|----|-------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| service | String  | 否  | 无     | &emsp;&emsp;服务地址。URL 格式，认证中心在完成登录之后，会重定向回该地址。该服务地址必须已经在租户中心中注册。                                                                                                                                                                     |
| renew   | Boolean | 是  | false | &emsp;&emsp;如果此参数为 true，那么无论用户是否已登录，都会要求用户重新登录。<br/> &emsp;&emsp;如果此参数为 false，则当用户已登录时，认证中心会携带有效的 ticket 定向 service 指定的地址，不需要用户再次登录。                                                                                                |
| gateway | Boolean | 是  | false | &emsp;&emsp;如果此参数为 true，那么认证中心会判断当前是否已经存在会话，或者是否支持以非交互式（non-interactive）方式建立会话，如果满足以上条件，认证中心会携带有效的 ticket 定向 service 指定的地址。<br/> &emsp;&emsp;如果此参数为 false，那么认证中心发现当前没有会话，也不支持通过非交互式的方式建立会话，那么认证中心会直接重定向到 service 指定的地址（未携带 ticket）。 |

### 请求示例

```
GET {schema}://{ip}:{port}/identity/sso/cas/login?service=https%3A%2F%2Fyour.service%2Fsso%2Fcallback
```

&emsp;&emsp;注意，这里接口需要客户端重定向到该地址，而不是通过 ajax 访问接口。

&emsp;&emsp;在完成认证后，认证中心会生成一个一次性票据（Ticket）并重定向到 service 指定的地址。

```
GET https://your.service/sso/callback?ticket=ST-1001-G88tFFYi7HivejHif97wg1WB
```