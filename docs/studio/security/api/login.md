# 登录
## 概述
&emsp;&emsp;本接口用于使用帐号密码创建会话。登录成功后，认证中心会添加一个名为 `Authorization` 的 Cookie。

## 接口描述
### 请求方法及地址

```
POST {schema}://{ip}:{port}/security/api/options
```

### 请求体（application/json）

| 参数名   | 类型   | 可空 | 默认值 | 说明                                                                                                              |
|----------|--------|------|--------|-------------------------------------------------------------------------------------------------------------------|
| account  | String | 否   | 无     | 帐户名。可以使用用户名（`username`）、邮箱（`email`）或手机号(`mobile`)作为登录帐户名。                                  |
| password | String | 否   | 无     | 密码。需要使用 sha256 摘要原始密码之后再提交                                                                       |
| captcha  | String | 是   | 无     | 验证码。当登录选项[[链接](/studio/security/api/get-login-option)]接口返回验证码不是被禁用时，由用户需要输入验证码。  |
| secret   | String | 否   | 无     | 终端密钥。通过登录选项[[链接](/studio/security/api/get-login-option)]接口获得。客户端应根据当前客户端类型选择其一个。 |

### 请求示例

```json
{
    "account": "syssa",
    "password": "f3edd676f6efcc525a3e6e220d8f241c3ea01ae0a6b39ff6dcca1b394deae45d",
    "captcha": "A1AN",
    "secret": "lLS4p6skBbBVZX30zR5"
}
```

### 响应示例

```json
true
```

### 响应说明
&emsp;&emsp;登录接口在完成调用之后，可能会出现以下状态码：

- 200：登录成功。
- 400：登录失败（由于安全原因，一般不给出具体失败原因）。
- 423：帐户名、密码正确，但是帐户被锁，需要修改密码后才能登录。