# 邮件广播器（SMTP）
## 概述
&emsp;&emsp;本广播器实现了通过 SMTP 协议发邮邮件。

## 自定义消息体格式

| 参数名      | 类型               | 可空 | 默认值 | 说明       |
|-------------|--------------------|------|--------|------------|
| subject     | String             | 否   | 无     | 主题       |
| content     | String             | 否   | 无     | 正文       |
| from        | String             | 是   | 无     | 发送人名称 |
| to          | List&lt;Object&gt; | 否   | 无     | 收件人     |
| to.name     | String             | 否   | 无     | 收件人名称 |
| to.address  | String             | 否   | 无     | 收件人地址 |
| cc          | List&lt;Object&gt; | 否   | 无     | 抄送人     |
| cc.name     | String             | 否   | 无     | 抄送人名称 |
| cc.address  | String             | 否   | 无     | 抄送人地址 |
| bcc         | List&lt;Object&gt; | 否   | 无     | 密送人     |
| bcc.name    | String             | 否   | 无     | 密送人名称 |
| bcc.address | String             | 否   | 无     | 密送人地址 |

```json
{
    "subject": "这是一封测试邮件",
    "content": "测试邮件的正文，请忽略",
    "to": [{
        "name": "张三",
        "address": "zhangs@central-x.com"
    },{
        "name": "李四",
        "address": "lis@central-x.com"
    }],
    "cc": [{
        "name": "王五",
        "address": "wangw@central-x.com"
    }],
    "bcc": [{
        "name": "赵六",
        "address": "zhaol@central-x.com"
    }]
}
```