# 获取登录选项
## 概述
&emsp;&emsp;本接口主要用于在登录前获取登录选项。通过登录选项，可以得知此次登录相关选项，开发者可以通过这些选项控制用户界面的显示内容。

## 接口描述
### 请求方法及地址

```
GET {schema}://{ip}:{port}/security/api/options
```

### 响应示例

```json
{
    "password": {
        "uppercase": 0,
        "number": 0,
        "symbol": 0,
        "min": 6,
        "lowercase": 0,
        "max": 16,
        "symbols": "@[\\]^_`!\"#$%&'()*+,-./:;{<|=}>~?"
    },
    "endpoint": {
        "pad": "Jrsy8odZ0orSXkKXR2U",
        "pc": "GGp5Zc4NwUkdPvgka6M",
        "web": "lLS4p6skBbBVZX30zR5",
        "phone": "Dul8CRGeVLcmi0yM8f7"
    },
    "captcha": {
        "enabled": false,
        "timeout": 180000
    }
}
```

### 响应说明

| 字段名             | 类型    | 说明                                      |
|--------------------|---------|-------------------------------------------|
| password           | Object  | 用户修改密码时，对密码强度的要求           |
| password.min       | Number  | 密码最小长度                              |
| password.max       | Number  | 密码最大长度                              |
| password.uppercase | Number  | 密码中必须包含大写字母的数量              |
| password.lowercase | Number  | 密码中必须包含小写字母的数量              |
| password.number    | Number  | 密码中必须包含小写字母的数量              |
| password.symbol    | Number  | 密码中必须包含的特殊字符数量              |
| password.symbols   | Number  | 特殊字符的取值范围                        |
| endpoint           | Object  | 终端的密钥信息                            |
| endpoint.web       | String  | 网页端终端密钥                            |
| endpoint.pc        | String  | PC 客户端终端密钥                         |
| endpoint.phone     | String  | 手机客户端终端密钥                        |
| endpoint.pad       | String  | 平板端终端密钥                            |
| captcha            | Object  | 验证码配置                                |
| captcha.enabled    | Boolean | 用户是否需要输入验证码                    |
| captcha.timeout    | Number  | 验证码的超时时间。超时后需要重新获取验证码 |
