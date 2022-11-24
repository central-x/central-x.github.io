# 获取对象信息
## 概述
&emsp;&emsp;本接口用于获取对象信息。

## 接口描述
### 请求方法及地址

```
// code 为存储桶(bucket)标识
GET {schema}://{ip}:{port}/storage/api/buckets/{code}/objects/details
```

### 权限

- `central:object:view` 或 `central:object:all`

### 请求参数（Query）

| 参数名 | 类型   | 可空 | 默认值 | 说明                                                   |
|--------|--------|------|--------|--------------------------------------------------------|
| token  | String | 否   | 无     | 访问凭证，见接口总体说明[[链接](/studio/storage/api/)]。 |
| id     | String | 否   | 无     | 待查询对象主键。                                        |

### 响应示例

```json
{
    "id": "Qf5nV0UCH2DEBY1ENhh",
    "bucketId": "hy3tODglubTMlR9OcyO",
    "name": "test.txt",
    "extension": "txt",
    "size": 1046,
    "digest": "01b01aa5b8baefcd741e5b5b54aa9737fb580c708d76db9a4427bcf84118ab99",
    "confirmed": true,
    "creatorId": "8cneYRM97jU0pqVpJWY",
    "createDate": 1669272408080,
    "modifierId": "8cneYRM97jU0pqVpJWY",
    "modifyDate": 1669272408080
}
```

### 响应说明

| 字段名     | 类型    | 说明               |
|------------|---------|--------------------|
| id         | String  | 主键               |
| bucketId   | String  | 存储桶（Bucket）主键 |
| name       | String  | 文件名             |
| extension  | String  | 扩展名             |
| size       | Number  | 文件大小           |
| digest     | String  | 摘要（SHA256）       |
| confirmed  | Boolean | 是否已确认         |
| creatorId  | String  | 创建人主键         |
| createDate | Number  | 创建时间           |
| modifierId | String  | 修改人主键         |
| modifyDate | Number  | 修改时间           |
