# 广播消息
## 概述
&emsp;&emsp;本接口用于发布广播消息。

## 接口描述
### 请求方法及地址

```
// code 为广播器标识
PATCH {schema}://{ip}:{port}/multicast/api/broadcasters/{code}/messages
```

### 请求参数（application/json）

| 参数名   | 类型                    | 可空 | 默认值 | 说明                                                     |
|----------|-------------------------|------|--------|----------------------------------------------------------|
| token    | String                  | 否   | 无     | 访问凭证，见接口总体说明[[链接](/studio/multicast/api/)]。 |
| mode     | String                  | 否   | 无     | 广播模式（标准模式: `standard`，自定义模式: `custom`）      |
| messages | List&lt;MessageBody&gt; | 否   | 无     | 待广播消息体。根据广播模式，消息体格式可能不一样。           |

- 标准消息体

| 参数名    | 类型    | 可空 | 默认值 | 说明                                                                                  |
|-----------|---------|------|--------|---------------------------------------------------------------------------------------|
| subject     | String  | 否   | 无     |  消息标题。  |
| content     | String  | 否   | 无     |          |
| recipients  | List&lt;Object&gt;    | 否   | 无     | 消息接收人        |
| recipients.name | String  | 否   | 无     | 接收人名称             |
| recipients.address | String  | 否   | 无     | 接收人地址             |

- 自定义消息体

&emsp;&emsp;具体查看各个广播器的实现。

### 请求示例

```json
{
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2NjkyODQ5NzAsImp0aSI6Ik1BZEpjZW1PTTYzdGxyRW92a2VsNlJoSCJ9.vsl0uAJEJJuAsNY89nOsMqPoBr52wPtXG4J_-zo_Hrc",
    "mode": "standard",
    "messages": [{
        "subject": "Test Email",
        "content": "This is test email, pls ignore.",
        "recipients": [{
            "name": "Alan",
            "address": "alan@central-x.com"
        }]
    }]
}
```

### 响应示例

```json
[
    {
        "id": "MBMTlMsp28J5FrQPte918KL0",
        "broadcasterId": "qrCL6YDyaS0JrD8Urm8",
        "body": "{\"subject\":\"Test Email\",\"content\":\"This is test email, pls ignore.\",\"recipients\":[{\"name\":\"Alan\",\"address\":\"alan@central-x.com\"}]}",
        "mode": "standard",
        "status": "succeed",
        "creatorId": "syssa",
        "createDate": 1669283543581,
        "modifierId": "syssa",
        "modifyDate": 1669283543581
    }
]
```

### 响应说明

| 字段名        | 类型   | 说明                                                                                       |
|---------------|--------|--------------------------------------------------------------------------------------------|
| id            | String | 消息主键                                                                                   |
| broadcasterId | String | 广播器主键                                                                                 |
| body          | String | 消息体                                                                                     |
| mode          | String | 广播模式（标准模式: `standard`，自定义模式: `custom`）                                        |
| status        | String | 状态（暂存: `staged`，广播中: `runngin`，失败重试: `retrying`，成功: `succeed`，失败: `failed`） |
| creatorId     | String | 创建人主键                                                                                 |
| createDate    | Number | 创建时间                                                                                   |
| modifierId    | String | 修改人主键                                                                                 |
| modifyDate    | Number | 修改时间                                                                                   |