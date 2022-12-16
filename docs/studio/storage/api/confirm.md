# 二次确认
## 概述
&emsp;&emsp;本接口用于二次确认对象。

&emsp;&emsp;在实际运行过程中，应用系统有可能先上传相关的附件，最后再提交表单到应用系统。在完成整个事务期间，用户有可能随时取消。由于存储中心与应用系统是独立存在的，因此存储中心无法得知这些已取消的业务的相关附件是否有效，最后导致这些无效的附件占用越来越多的空间。

&emsp;&emsp;为了解决这个问题，应用系统的前端在上传附件时，应将附件的二次确认状态（`confirmed`）设为 `false`，等待整个事务完成后，再通过本接口更新附件对象的确认状态。存储中心会在一段时间后自动清理那些未二次确认的附件，这样就解决了无效附件的问题。

## 接口描述
### 请求方法及地址

```
// code 为存储桶(bucket)标识
POST {schema}://{ip}:{port}/storage/api/buckets/{code}/objects/confirm
```

### 权限

- `central:object:update` 或 `central:object:all`

### 请求参数（application/json）

| 参数名 | 类型               | 可空 | 默认值 | 说明                                                   |
|--------|--------------------|------|--------|--------------------------------------------------------|
| token  | String             | 否   | 无     | 访问凭证，见接口总体说明[[链接](/studio/storage/api/)]。 |
| ids    | List&lt;String&gt; | 否   | 无     | 待确认对象主键。                                        |

### 响应示例
&emsp;&emsp;响应直接返回已确认的对象数量。
```json
1
```