# 下载文件
## 概述
&emsp;&emsp;本接口用于下载文件对象。如果该对象所在的存储桶（Bucket）支持断点下载，则本接口也支持断点下载。

## 接口描述
### 请求方法及地址

```
// code 为存储桶(bucket)标识
GET {schema}://{ip}:{port}/storage/api/buckets/{code}/objects
```

### 权限

- `central:object:view` 或 `central:object:all`

### 请求参数（Query）

| 参数名      | 类型   | 可空 | 默认值 | 说明                                                                        |
|-------------|--------|------|--------|-----------------------------------------------------------------------------|
| token       | String | 否   | 无     | 访问凭证，见接口总体说明[[链接](/studio/storage/api/)]。                      |
| id          | String | 否   | 无     | 待下载对象主键。                                                             |
| filename    | String | 是   | 无     | 指定待下载的文件名。如果不指定，则直接使用对象原有的文件名。                   |
| contentType | String | 是   | 无     | 指定待下载的 Content-Type。如果不指定，则默认使用 `application/octet-stream`。 |

### 响应示例
&emsp;&emsp;本接口将返回数据流。