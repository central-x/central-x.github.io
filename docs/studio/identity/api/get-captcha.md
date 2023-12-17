# 获取验证码
## 概述
&emsp;&emsp;本接口主要用于获取验证码。如果在获取登录选项[[链接](./get-login-option)]接口获得验证码是被禁用（`captcha.enabled`）时，客户端应隐藏验证码。

## 接口描述
### 请求方法及地址

```
GET {schema}://{ip}:{port}/identity/api/captcha
```

### 响应示例
&emsp;&emsp;接口返回图片数据流，可以直接使用 img 标签显示

```html
<img src="/identity/api/captcha"/>
```