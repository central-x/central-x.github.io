# Central Starter Logging
&emsp;&emsp;本框架需要配合 Central Logging [[链接](/studio/logging/)]一起使用，用于收集各个微服务产生的日志，并上报到日志中心。

## Maven 座标
```xml
<dependency>
    <groupId>com.central-x</groupId>
    <artifactId>central-starter-logging</artifactId>
    <version>${centralx.version}</version>
 </dependency>
```

## 使用类库
&emsp;&emsp;项目引用了类库之后，需要在应用的配置文件 application.yml 中添加以下配置即可。

```yaml
server:
  port: 8080

spring:
  application:
    name: central-dashboard
    version: ${YOUR_APPLICATION_VERSION}

logging:
  config: classpath:logback-http.xml

central:
  logging:
    http:
      server: http://127.0.0.1:3400/logging
      path: central
      code: ${YOUR_APPLICATION_CODE}
      secret: ${YOUR_APPLICATION_SECRET}

```