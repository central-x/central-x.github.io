# 秒传
## 概述
&emsp;&emsp;本接口用于秒传文件。所谓秒传，其原理是检测现有的文件是否已存在相同摘要（SHA256）的文件。如果摘要相同的话，则表示两份文件相同，直接复用在原来的文件即可。

## 接口描述
### 请求方法及地址

```
// code 为存储桶(bucket)标识
POST {schema}://{ip}:{port}/storage/api/buckets/{code}/objects/rapid
```

### 权限

- `central:object:create` 或 `central:object:all`

### 请求参数（application/json）

| 参数名    | 类型    | 可空 | 默认值 | 说明                                                                                                                       |
|-----------|---------|------|--------|----------------------------------------------------------------------------------------------------------------------------|
| token     | String  | 否   | 无     | 访问凭证，见接口总体说明[[链接](/studio/storage/api/)]。                                                                     |
| digest    | String  | 是   | 无     | 待上传文件摘要（SHA256）。                                                                                                    |
| filename  | String  | 是   | 无     | 文件名。如果本值为空，则直接取待上传的文件名。                                                                                |
| confirmed | Boolean | 是   | true   | 是否已确认。如果本值为 false，则需要开发者进行二次确认[[链接](/studio/storage/api/confirm)]，否则系统会在一段时间后清除该对象。 |

### 响应示例
&emsp;&emsp;如果响应状态码为 `200`，则表示秒传成功。如果响应状态码为 `400`，则表示秒传失败，需继续上传或分片上传。

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
