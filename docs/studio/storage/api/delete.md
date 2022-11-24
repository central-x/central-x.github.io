# 删除对象
## 概述
&emsp;&emsp;本接口用于删除指定附件对象。

## 接口描述
### 请求方法及地址

```
// code 为存储桶(bucket)标识
DELETE {schema}://{ip}:{port}/storage/api/buckets/{code}/objects
```

### 权限

- `central:object:delete` 或 `central:object:all`

### 请求参数（Query）

| 参数名 | 类型               | 可空 | 默认值 | 说明                                                   |
|--------|--------------------|------|--------|--------------------------------------------------------|
| token  | String             | 否   | 无     | 访问凭证，见接口总体说明[[链接](/studio/storage/api/)]。 |
| ids    | List&lt;String&gt; | 否   | 无     | 待删除对象主键。如果存在多个主键，使用 `,` 连接。         |

### 响应示例
&emsp;&emsp;响应直接返回已删除的对象数量。

```json
2
```