# 服务认证
## 概述
&emsp;&emsp;本接口用于验证在登录入口[[链接](./login)]获取到的一次性票据（Ticket）。验证成功后，可以获得该会话对应的用户信息。

## 接口描述
### 请求方法及地址

```
POST {schema}://{ip}:{port}/identity/sso/cas/serviceValidate

或

POST {schema}://{ip}:{port}/identity/sso/cas/p3/serviceValidate
```

### 请求体（application/json）

| 参数名     | 类型     | 可空 | 默认值  | 说明                                      |
|---------|--------|----|------|-----------------------------------------|
| service | String | 否  | 无    | &emsp;&emsp;服务地址。与上一步接口的地址相同。           |
| ticket  | String | 否  | 无    | &emsp;&emsp;上一步获取的一次性票据。                |
| format  | String | 是  | json | &emsp;&emsp;返回的响应体格式。支持 `json` 和 `xml`。 |

### 请求示例

```json
{
    "service": "https://your.service/sso/callback",
    "ticket": "ST-1001-G88tFFYi7HivejHif97wg1WB",
    "format": "json"
}
```

### 响应示例

```json
{
    "user": "zhangs",
    "attributes": {
        "name": "张三",
        "id": "8cneYRM97jU0pqVpJWY",
        "avatar": "",
        "username": "zhangs"
    }
}
```

### 响应说明

| 字段名                 | 类型     | 说明      |
|---------------------|--------|---------|
| user                | String | 当前会话用户名 |
| attributes          | Object | 帐户属性    |
| attributes.id       | String | 当前帐户主键  |
| attributes.username | String | 当前帐户主键  |
| attributes.name     | String | 当前帐户名称  |
| attributes.avatar   | String | 当前帐户头像  |
