# 接口总体说明
## 概述
&emsp;&emsp;Central Storage 实现了一套标准的 API，用于统一管理应用系统的文件接入方式，隐藏背后的文件存储细节。

## 权限控制
&emsp;&emsp;由于 Central Storage 相对于应用系统来说，是一个独立的存在，因此应用系统的权限体系与 Central Storage 的权限体系是互相独立的。但是正常情况下，Central Storage 应该专注于文件存储，文件的访问权限应该由应用系统来决定。因此，Central Storage 提供了一套通过 JWT 来控制文件的访问权限，将文件的访问控制权交给应用系统。

&emsp;&emsp;Central Storage 提供了以下权限模型:


| 权类名称 | 标识                  | 支持的限制                                                         | 必须包含的限制                                                                                      |
|----------|-----------------------|--------------------------------------------------------------------|:----------------------------------------------------------------------------------------------------|
| 读取     | central:object:view   | 1.只允许访问指定对象<br/>2.限制凭证有效时间<br/>3.限制凭证使用次数 | 1. 如果没有限制访问对象，则必须限制凭证的有效时间<br/>2. 如果有限制访问对象范围，则允许凭证为永久权限 |
| 创建     | central:object:create | 1.限制凭证有效时间<br/>2.限制凭证使用次数                          | 必须限制凭证有效时间                                                                                |
| 更新     | central:object:update | 1.只允许更新指定对象<br/>2.限制凭证有效时间<br/>3.限制凭证使用次数 | 必须限制凭证有效时间                                                                                |
| 删除     | central:object:delete | 1.只允许删除指定对象<br/>2.限制凭证有效时间<br/>3.限制凭证使用次数 | 必须限制凭证有效时间                                                                                |
| 全部权限 | central:object:all    | 1.只允许访问指定对象<br/>2.限制凭证有效时间<br/>3.限制凭证使用次数 | 必须限制凭证有效时间                                                                                |

::: details 补充说明
1. 表格上面的有效时间是指 30 分钟及以内。
2. 除了读取权限（central:object:view），具有其余任意权限的凭证必须限制凭证有效时间。
3. 限制凭证有效期的同时，开发者可以进一步限制在有效期内的下载次数。
4. 如果要限制凭证下载次数，则必须限制凭证有效时间。
:::

&emsp;&emsp;访问凭证生成逻辑:

```java
// 应用系统的访问密钥
var applicationSecret = "xxxx";

// 使用 JWT 工具生成访问凭证
var token = JWT.create()
    // 限制访问凭证的有效期为 5 分钟
    .withExpiresAt(new Date(System.currentTimeMillis() + 5 * 60 * 1000))
    // 如果不添加 times，则代表在有效期内，访问凭证可以重复使用
    // 如果添加了 times，则代表在有效期内，只能使用指定次数，超过指定次数之后，凭证失效
    .withCliam("times", 1)
    // 如果不添加 audience，则代表允许访问所有对象
    //.withAudience("objectId1", "objectId2")
    // 限制访问凭证的权限
    .withClaim("permissions", "central:object:create, central:object:update")
    // 使用应用系统的访问密钥对访问凭证进行签名
    .sign(Algorithm.HMAC256(applicationSecret));
```

> 以上代码使用了 `com.auth0.java-jwt` 类库

## 对象上传流程图
### 小文件上传流程
&emsp;&emsp;小于 `10M` 的文件，可以采用以下流程将文件上传到存储中心。

![](../assets/flow_01.svg)

### 大文件上传流程
&emsp;&emsp;大于等于 `10M` 的文件，需要使用分片上传的方式上传。分片上传的方式

![](../assets/flow_02.svg)