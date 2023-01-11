# 接口规范
## 概述
&emsp;&emsp;本文档用于规范 Central Studio 一系列应用系统在开发接口时遵循的规范，包括状态码、分页、数据校验等规则。

## 规范
### 接口方法
&emsp;&emsp;接口一般使用 RESTful 风格进行编写。应用系统一般需支持以下方法:
    
| Verb <img width=310/> | 描述 <img width=310/> |
|:----------------------|-----------------------|
| GET                   | 获取资源              |
| POST                  | 创建资源              |
| PUT                   | 更新/替换资源         |
| DELETE                | 删除资源              |
| PATCH                 | 补充资源部份信息      |

### 接口地址
&emsp;&emsp;所有接口必须以 `${CONTEXT_PATH}/api` 开头，接口地址应尽量以资源复数 + 动词（可选）组成。常见有效接口地址命名如下:

```
# 获取用户列表
GET http://127.0.0.1:3100/dashboard/api/users

# 获取用户详情
GET http://127.0.0.1:3100/dashboard/api/users/details?id=xxx

# 分页获取用户
GET http://127.0.0.1:3100/dashboard/api/users/page

# 创建用户
POST http://127.0.0.1:3100/dashboard/api/users

# 更新用户
PUT http://127.0.0.1:3100/dashboard/api/users

# 删除用户
DELETE http://127.0.0.1:3100/dashboard/api/users?id=xxx

# 禁用用户
PUT http://127.0.0.1:3100/dashboard/api/users/disable

# 启用用户
PUT http://127.0.0.1:3100/dashboard/api/users/enable
```

### 状态码
&emsp;&emsp;接口应通过 HTTP 状态码表示接口是否处理成功。接口一般需要支持以下状态码:

| 状态码（Status） <img width=200/> | 描述 <img width=420/>                  |
|:--------------------------------|----------------------------------------|
| 200 OK                          | 请求执行成功，并正常返回结果            |
| 400 Bad Request                 | 参数缺失或参数校验失败                 |
| 401 Unauthorized                | 缺失鉴权信息（如未登录）                 |
| 403 Forbidden                   | 操作不允许（如用户没有权限操作指定信息） |
| 404 Not Found                   | 资源无法访问/不存在                    |
| 500 Server Error                | 服务器端发生异常                       |

### 接口响应示例
&emsp;&emsp;成功响应内容示例:

```json
响应头:
HTTP/1.1 200 OK
Content-Type: application/json

响应体:
{
    "username": "alan",
    "name": "Alan Yeh"
}
```

&emsp;&emsp;失败响应内容示例:

```json
响应头:
HTTP/1.1 400 OK
Content-Type: application/json

响应体:
{
    "message": "姓名[name]必须不为空"
}
```

### 分页
&emsp;&emsp;接口如果需要返回分页结果信息时，应包含 `pager` 字段及 `data` 字段信息。其中 `pager` 字段信息用于存放分页信息，`data` 字段用于存放列表数据。`pager` 字段信息如下:

| 字段名 <img width=310/> | 描述 <img width=310/> |
|:------------------------|-----------------------|
| pageIndex               | 分页下标              |
| pageSize                | 分页大小              |
| pageCount               | 分页总数量            |
| itemCount               | 资源总数量            |

&emsp;&emsp;分页内容示例:

```json
GET http://127.0.0.1:3100/dashboard/api/users/page

响应头:
HTTP/1.1 200 OK
Content-Type: application/json

响应体:
{
    "pager": {
        "pageIndex": 2,
        "pageSize": 20,
        "pageCount": 13,
        "itemCount": 256
    },
    "data": {
        {
            "username": "alan",
            "name": "Alan Yeh"
        }
    }
}
```

### 数据校验和错误提示
&emsp;&emsp;接口在使用过程中，如果需要返回错误信息，则必须要提供详细的错误报告，方便接口使用人员进行排查与修复。

&emsp;&emsp;错语示例:

```json
# 创建新用户时没有提供必要字段 name
POST http://127.0.0.1:3100/dashboard/api/users

{ "name": "Alan Yeh" }

响应头:
HTTP/1.1 400 BAD REQUEST
Content-Type: application/json

响应体:
{
    "message": "用户名[username]必须不为空"
}
```