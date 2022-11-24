# 上传分片
## 概述
&emsp;&emsp;本接口用于上传分片数据。

&emsp;&emsp;在上传分片的时候，开发者可以通过并发上传这些数据块以提升上传速度。需要注意，一部份浏览器对网络请求的并发限制在 5 左右，因此建议并发上传文件的数量最好不要超过 3，否则可能影响浏览器的其它请求。

## 接口描述
### 请求方法及地址

```
// code 为存储桶(bucket)标识
PATCH {schema}://{ip}:{port}/storage/api/buckets/{code}/objects/multiparts
```

### 权限

- `central:object:create` 或 `central:object:all`

### 请求参数（application/json）

| 参数名     | 类型   | 可空 | 默认值 | 说明                                                   |
|------------|--------|------|--------|--------------------------------------------------------|
| token      | String | 否   | 无     | 访问凭证，见接口总体说明[[链接](/studio/storage/api/)]。 |
| id         | String | 否   | 无     | 分片上传任务主键。                                      |
| chunk      | File   | 否   | 无     | 待上传分片数据块。                                      |
| chunkIndex | Number | 否   | 无     | 待上传分片下标。                                        |

### 响应示例

```json
{
    "id": "Qf5nV0UCH2DEBY1ENhh",
    "digest": "01b01aa5b8baefcd741e5b5b54aa9737fb580c708d76db9a4427bcf84118ab99",
    "size": 108954352,
    "chunkSize": 5242880,
    "chunkCount": 21,
    "chunks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
}
```

### 响应说明

| 字段名     | 类型               | 说明                 |
|------------|--------------------|----------------------|
| id         | String             | 分片上传任务主键     |
| digest     | String             | 文件摘要（SHA256）     |
| size       | Number             | 文件大小             |
| chunkSize  | Number             | 分片大小             |
| chunkCount | Number             | 分片数量             |
| chunks     | List&lt;Number&gt; | 剩余待上传的分片下标 |