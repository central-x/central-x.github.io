# 获取访问凭证
## 概述
&emsp;&emsp;应用系统在完成获取授权码[[链接](./authorize)]的过程之后，需要通过本接口将授权码（Authorization Code）兑换成访问凭证（Access Token）。

## 接口描述
### 请求方法及地址

```
POST {schema}://{ip}:{port}/identity/sso/oauth2/access_token
```

### 请求体（application/json）

| 参数名           | 类型     | 可空 | 默认值                | 说明                                   |
|---------------|--------|----|--------------------|--------------------------------------|
| grant_type    | String | 是  | authorization_code | 授权类型。此值需固定为 authorization_code       |
| client_id     | String | 否  | 无                  | 应用标识                                 |
| client_secret | String | 否  | 无                  | 应用密钥                                 |
| code          | String | 否  | 无                  | 上一步获取的授权码（Authorization Code）        |
| redirect_uri  | String | 否  | 无                  | 重定向地址。此值需要与上一步传递的 redirect_uri 完全相同。 |

### 请求示例

```json
{
    "grant_type": "authorization_code",
    "client_id": "YOUR_APPLICATION_CODE",
    "client_secret": "YOUR_APPLICATION_SECRET",
    "code": "OC-1001-GNen5J2oMC1mJncDvO2tvwYV",
    "redirect_uri": "https://your.service/sso/callback"
}
```

### 响应示例

```json
{
    "username": "zhangs",
    "token_type": "bearer",
    "expires_in": 1800,
    "access_token": "eyJ0eXAiOiJhY2Nlc3NfdG9rZW4iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzeXNzYSIsImF1ZCI6ImNlbnRyYWwtc2VjdXJpdHkiLCJzY29wZSI6WyJ1c2VyOmJhc2ljIl0sImlzcyI6ImNvbS5jZW50cmFsLXguc2VjdXJpdHkiLCJleHAiOjE2NjkxOTk3OTcsImp0aSI6IkdPUXo0UEFNcDZDQXV6R2E5blNSbE5OYyJ9.jH0wknZ6805v67SOXgWGQyzDysSETuVRwNarRgcxu1dVIElQQGZ0OR7FfvE_U8mWwUmQhOgzk8AA0gNnUkf_OWQUce5Ja8reB4_6Sf824RAxEeT30H_8WhgLZ8egzbUdhrEeoBXT4J3l3jKGTvE-kEkyg5vnf0TdROwKYiOJVsfA5o18xgEgJAzMePPj1mlRSjrbTGGao7zFpt7kTghkL9wf2NOdqLv9iGESoMRLGXdQFiGEQm0IXiIQFlG5ktzrJGbFPlwAaJbYpbdbMvuBwgZvNkm6z_qYL3oJ98JwZmFtGVFx0cNqUDBASoEPaRwMFZ9dP0c-TKFGnY5L3TYlMQ",
    "scope": "user:basic",
    "account_id": "8cneYRM97jU0pqVpJWY"
}
```

### 响应说明

| 字段名          | 类型     | 说明                |
|--------------|--------|-------------------|
| username     | String | 当前会话用户名           |
| account_id   | String | 当前会话用户主键          |
| token_type   | String | 凭证类型，这里固定是 bearer |
| access_token | String | 访问凭证              |
| scope        | String | 当前凭证授权范围          |
