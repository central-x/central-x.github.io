# 获取授权码
## 概述
&emsp;&emsp;本接口是 OAuth 2.0 认证服务的入口。第三方应用系统在需要登录时，需要引导用户重定向到本地址。

&emsp;&emsp;认证中心在接收到 OAuth 2.0 认证请求时，会重定向到登录界面（未登录时），并导引用户完成会话认证。认证成功后，认证中心会生成一个一次性授权码（Authorization Code）并重定向到指定的地址。应用系统在接收到回调时，需要通过获取访问凭证接口[[链接](./access-token)]获取访问凭证（Access Token），最后通过获取当前用户接口[[链接](./user)]获取用户信息。

&emsp;&emsp;如果回调时，应用系统发现认证中心没有携带授权码（Authorization Code），则表示用户拒绝完成认证过程。

## 接口描述
### 请求方法及地址

```
GET {schema}://{ip}:{port}/identity/sso/oauth2/authorize
```

### 请求参数（Query）

| 参数名           | 类型     | 可空 | 默认值        | 说明                                                                                |
|---------------|--------|----|------------|-----------------------------------------------------------------------------------|
| response_type | String | 是  | code       | 授权类型。固定值，必须为 code。                                                                |
| client_id     | String | 否  | 无          | 应用标识。                                                                             |
| redirect_uri  | String | 否  | 无          | 重定向地址。认证中心会在用户完成认证之后，携带着授权码（Authorization Code）和状态值（state）重定向回此地址。                |
| state         | String | 否  | 无          | 状态值。一般是客户端生成的随机字符串，主要用于防止 CSRF 攻击。认证中心会在用户完成认证之后原样带回。                             |
| scope         | String | 是  | user:basic | 申请权限范围。默认可以获取用户的基本信息（user:basic），还可以申请获取用户联系方式（user:contract）。申请多个权限时，使用 `,` 号分隔。 |

### 请求示例

```
GET {schema}://{ip}:{port}/identity/sso/oauth/authorize?response_type=code&client_id=YOUR_APPLICATION_CODE&redirect_uri=https%3A%2F%2Fyour.service%2Fsso%2Fcallback&state=GhepG8z9HVLDlWFMdgcCQxSu
```

&emsp;&emsp;注意，这里接口需要客户端重定向到该地址，而不是通过 ajax 访问接口。

&emsp;&emsp;在完成认证后，认证中心会生成一个一次授权码（Authorization Code）并重定向到 redirect_uri 指定的地址。

```
GET https://your.service/sso/callback?code=OC-1001-GObPkeNhQyIMmfnqa3VVBd7o&state=GhepG8z9HVLDlWFMdgcCQxSu
```