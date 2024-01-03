# Central Starter Probe
## 概述
&emsp;&emsp;Central Starter Probe 主要用于为应用提供探测入口，主要用于监控应用当前是否稳定可用。

## 集成
### Maven 座标

```xml
<dependency>
    <groupId>com.central-x</groupId>
    <artifactId>central-starter-probe</artifactId>
    <version>${centralx.version}</version>
 </dependency>
```

### 启用探针服务
&emsp;&emsp;在应用启动类，或应用配置类中，添加 `@EnableProbe` 注解，启用探针服务。

```java
import central.starter.probe.EnableProbe;
import org.springframework.context.annotation.Configuration;

/**
 * 应用配置
 *
 * @author Alan Yeh
 * @since 2023/12/29
 */
@EnableProbe
@Configuration
public class ApplicationConfiguration {
}
```

## 使用类库
### 全局配置
&emsp;&emsp;探针的配置信息存放在 `central.probe` 节点下。如果需要修改探针的配置，可以在 `application.yml` 配置文件中添加以下配置:

```yaml
central:
  probe:
    # 动态禁用探针服务
    enabled: true
    # 探针超时时间
    timeout: 5000
```

- `enabled`: 如果想在运行阶段停止探针服务，则可以通过该属性禁用探针服务；
- `timeout`: 探针超时时间。探测时，所有的探测点（Endpoint）都是并发执行的，如果在超时时间结束前还未探测完毕，则直接中断探测，返回 `Timeout`。

### 探测点（Endpoint）
&emsp;&emsp;Central Starter Probe 通过控测点（Endpoint）执行探测任务。目前已提供以下几种探测点类型：

- 数据源探测点（DataSourceEndpoint）: 使用 JDBC 连接到指定数据库，执行测试 Sql。如果无法连接到数据库，或测试 Sql 执行失败/未返回数据，则探测失败；
- Redis 探测点（RedisEndpoint）: 使用 Lettuce 连接到指定数据库，执行 PING。如果无法连接到数据库，或未能返回 PONG 响应，则探测失败；
- 主机名探测（HostEndpoint）: 测试主机名/域名是否能解析。如果主机名/域名无法解析成 IP，则探测失败；
- Http 探测（HttpEndpoint）: 测试指定的接口地址是否能返回正确的信息。如果服务不能返回指定的状态码或指定的内容，则探测失败。

#### DataSourceEndpoint
&emsp;&emsp;DataSourceEndpoint 探测点主要用于探测应用是否能正常连接到数据库。为应用添加数据源探测点时，只需要在配置文件中添加以下配置信息:

```yaml
central:
  probe:
    points:
      - name: mySqlEndpoint
        type: datasource
        params:
          driver: com.mysql.cj.jdbc.Driver
          url: jdbc:mysql://mysql:3306/centralx?useUnicode=true&characterEncoding=utf8&useSSL=false
          username: root
          password: root
          query: select 1
```

- `name`: 探测点标识，探针服务会将该探测点注册为 Spring Bean，因此注意该 name 不要和别的探测点或内部的 Bean 重名
- `type`: 探测点类型
- `params`: 探测点初始化参数
- `params.driver`(required): jdbc 驱动
- `params.url`(required): 数据库连接
- `params.username`(required): 数据库用户名
- `params.password`(required): 数据库密码
- `params.query`(optional): 检测 Sql。该 Sql 必须能返回至少一行数据，则否探测失败。如果本字段为空，则数据源探测点自动根据数据库类型选择合适的检测 Sql。

&emsp;&emsp;DataSourceEndpoint 目前已支持 MySql、PostgreSql、Oracle、人大金仓（Kingbase）、神舟（Oscar）、H2、海量数据（Vastbase）、达梦（Dameng）、翰高（HighGo）。

#### RedisEndpoint
&emsp;&emsp;RedisEndpoint 探测点主要用于探测应用是否能正常连接到 Redis 数据库。为应用添加 Redis 探测点时，只需要在配置文件中添加以下配置信息:

```yaml
central:
  probe:
    points:
      - name: redisEndpoint
        type: redis
        params:
          host: 127.0.0.1
          port: 6379
          username: root
          password: root
```

- `name`: 探测点标识，探针服务会将该探测点注册为 Spring Bean，因此注意该 name 不要和别的探测点或内部的 Bean 重名
- `type`: 探测点类型
- `params`: 探测点初始化参数
- `params.host`(required): Redis 主机地址
- `params.port`(required): Redis 服务端口
- `params.username`(optional): 用户名。如果用户名不为空时，则密码必须不为空，否则用户名将不起效
- `params.password`(optional): 密码。密码不为空时，用户名可以为空

#### HostEndpoint
&emsp;&emsp;HostEndpoint 探测点主要用于探测主机名/域名是否可以正常解析。注意，主机名探测点只检测主机名是否可以解析，不检测主机是否可达（Reachable）。为应用添加主机名探测点时，只需要在配置文件中添加以下配置信息:

```yaml
central:
  probe:
    points:
      - name: providerHostEndpoint
        type: host
        params:
          host: central-provider
```

- `name`: 探测点标识，探针服务会将该探测点注册为 Spring Bean，因此注意该 name 不要和别的探测点或内部的 Bean 重名
- `type`: 探测点类型
- `params`: 探测点初始化参数
- `params.host`(required): 主机名/域名

#### HttpEndpoint
&emsp;&emsp;HttpEndpoint 探测点主要用于通过调用接口的方式探测应用依赖的其它服务是否可用。为应用添加 Http 探测点时，只需要在配置文件中添加以下配置信息:

```yaml
central:
  probe:
    points:
      - name: githubGraphqlEndpoing
        type: http
        params:
          method: post
          url: https://api.github.com/graphql
          headers:
            - name: X-Forwarded-Tenant
              value: test
          expects:
            status: [200, 401]
            content: |
              {"message": "API rate limit exceeded for 50.7.158.106. (But here's the good news: Authenticated requests get a higher rate limit. Check out the documentation for more details.)",
              "documentation_url": "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"}
```

- `name`: 探测点标识，探针服务会将该探测点注册为 Spring Bean，因此注意该 name 不要和别的探测点或内部的 Bean 重名
- `type`: 探测点类型
- `params`: 探测点初始化参数
- `params.method`(optional): 请求方法。如果不设置该参数时，默认为 `GET`
- `params.url`(required): 请求地址
- `params.headers`(optional): 请求头
- `params.headers.name`(required): 请求头名
- `params.headers.value`(required): 请求头值
- `params.expects`(optional): 响应期望
- `params.expects.status`(optional): 期望响应状态码。如果是字符串时，可以使用 `OK` 代表 200 ~ 299 的状态码。如果是数组的话，则可以列出可接受的状态码值。
- `params.expects.content`(optional): 期望响应体。如果是 Json（对象或数组），且请求响应的 ContentType 是 `application/json` 时，将自动匹配内容是否相等，忽略内容的顺序。其它情况直接判断两者是否相等。

::: tip 提示
&emsp;&emsp;匹配内容是否相等，表示在以下情况时，两者是相等的：

- `{"name": "alan", "age": 18}` 与 `{"age": 18, "name": "alan"}` 两者是相同的
- `["alan", "alex", "alvin"]` 与 `["alvin", "alex", "alan"]` 两者是相同的
:::

### 鉴权
&emsp;&emsp;由于探针可能会泄露应用内部运行状态，因此建议为探针开启鉴权功能。开启鉴权功能后，调用方必须在请求头（Request Header）`Authorization` 上提供相关鉴权凭证才可以正常调用探针服务。鉴权失败时，探针将直接返回 `403 Forbidden` 状态码。

&emsp;&emsp;Central Starter Probe 内置了两种鉴权机制:

- JwtAuthorizer: 使用 JWT（Json Web Token）提供鉴权信息。该鉴权方式安全性较高，但对调用方有一定要求，需要调用方可以根据密钥动态生成 JWT；
- FixedAuthorizer: 使用固定的鉴权字符串。该鉴权方式安全性相对较低，只要提供了指定字符串即可满足鉴权要求。

#### JwtAuthorizer
&emsp;&emsp;JwtAuthorizer 采用动态 JWT 来对调用方进行鉴权。开启 JwtAuthorizer 鉴权只需要在配置文件中添加以下配置信息:

```yaml
central:
  probe:
    authorizer:
      type: jwt
      params:
        algorithm: HMAC256
        secret: cZlUdvgXkIEViQagLnPkgvxRXenisjZP
        claims:
          iss: com.central-x
```

- `type`: 鉴权类型
- `params`: 鉴权初始化参数
- `params.algorithm`(required): 签名算法。支持 `HMAC256`、`HMAC384`、`HMAC512`、`ECDSA256`、`ECDSA384`、`ECDSA512`、`RSA256`、`RSA384`、`RSA512`。一般情况下，建议选用 `HMAC256` 或 `ECDSA256`。
- `params.secret`(required): 签名密钥。不同签名算法对签名密钥有不同要求，`ECDSA`、`RSA` 的公钥要求使用 Base64 字符串提供。
- `params.claims`(optional): 声明（Claim）。要求 JWT 必须提供指定值的声明。使用键值对的方式表示。如果值为 `null`、`""`，则表示只需要出现该声明，但不校验该声明的值。

#### FixedAuthorizer
&emsp;&emsp;FixedAuthorizer 采用静态密钥的方式对调用方进行鉴权。开启 FixedAuthorizer 鉴权只需要在配置文件中添加以下配置信息:

```yaml
central:
  probe:
    authorizer:
      type: fixed
      params:
        secret: yVynEftqCbCbIeVMXqVsGsNGztnbvOwcZZYmsQFXckaNnkVwTKbXiqHdRhEdmWWO
```

- `type`: 鉴权类型
- `params`: 鉴权初始化参数
- `params.secret`(required): 鉴权密钥

::: tip 提示
&emsp;&emsp;由于 FixedAuthorizer 是采用静态密钥的方式鉴权，因此建议鉴权密钥的长度不要设置得过短（如设置 64 位随机字符串），提高破解难度。
:::

## 技巧
&emsp;&emsp;在配置数据源探测点（DataSourceEndpoint）或 Redis 探测点（RedisEndpoint）时，需要提供连接信息，这些信息一般与对应的数据源配置或 Redis 配置是相同的，这样就导致我们需要配置两次。如果后续需要修改配置时，容易出现修改漏的问题。因此可以通过 Spring 的占位符来解决这个问题，如:

```yaml
# Spring 数据源配置
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://mysql:3306/centralx?useUnicode=true&characterEncoding=utf8&useSSL=false
    username: root
    password: <password>

# 探测配置
central:
  probe:
    points:
      - name: dataSourceEndpoint
        type: datasource
        params:
          # 通过 Spring 占位符的方式引用数据源配置
          driver: ${spring.datasource.driver-class-name}
          url: ${spring.datasource.url}
          username: ${spring.datasource.username}
          password: ${spring.datasource.password}
```