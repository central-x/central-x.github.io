# 取消分片上传
## 概述
&emsp;&emsp;如果在上传的过程中，用户需要中断上传，可以通过此接口取消分片上传任务。


## 接口描述
### 请求方法及地址

```
// code 为存储桶(bucket)标识
DELETE {schema}://{ip}:{port}/storage/api/buckets/{code}/objects/multiparts
```

### 权限

- `central:object:create` 或 `central:object:all`

### 请求参数（Query）

| 参数名 | 类型   | 可空 | 默认值 | 说明                                                   |
|--------|--------|------|--------|--------------------------------------------------------|
| token  | String | 否   | 无     | 访问凭证，见接口总体说明[[链接](/studio/storage/api/)]。 |
| id     | String | 否   | 无     | 分片上传任务主键。                                      |

### 响应示例
&emsp;&emsp;响应直接返回已删除的分片上传任务数量。

```json
1
```