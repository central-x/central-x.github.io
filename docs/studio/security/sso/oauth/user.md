# 获取访问用户信息
## 概述
&emsp;&emsp;应用系统在完成获取访问凭证[[链接](/studio/security/sso/oauth/access-token)]的过程之后，需要通过本接口获取用户信息。

## 接口描述
### 请求方法及地址

```
GET {schema}://{ip}:{port}/security/sso/oauth2/user
```

### 请求头

| 参数名        | 类型   | 可空 | 默认值 | 说明                              |
|---------------|--------|------|--------|-----------------------------------|
| Authorization | String | 否   | 无     | 上一步获取的访问凭证（Access Token） |

### 响应示例

```json
{
    "name": "张三",
    "id": "8cneYRM97jU0pqVpJWY",
    "avatar": "",
    "username": "zhangs"
}
```

### 响应说明

| 字段名   | 类型   | 说明     |
|----------|--------|----------|
| name     | String | 帐户名称 |
| username | String | 帐户名   |
| id       | String | 帐户主键 |
| avatar   | String | 帐户头像 |
