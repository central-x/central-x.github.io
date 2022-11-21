# Central Starter Graphql Stub
&emsp;&emsp;Central Starter GraphQL Stub 主要用于方便调用 GraphQL 接口，通过动态代理，将调用 GraphQL 的过程简化成类似本地调用一样。

&emsp;&emsp;在 Central Starter GraphQL 类库[[链接](/framework/java/graphql)]中声明了接口，那么就可以用本类库来生成数据代理。

## Maven 座标
```xml
<dependency>
    <groupId>com.central-x</groupId>
    <artifactId>central-starter-graphql</artifactId>
    <version>${centralx.version}</version>
 </dependency>
```

## 使用类库
### 声明 GraphQL 的查询接口
&emsp;&emsp;在项目里面，新增 Java 接口，用于生成动态代理。

- GroupRepository.java [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql-stub/src/test/java/central/starter/graphql/stub/test/stub/GroupRepository.java)]
  
```java
@Repository // 固定注解
@GraphQLStub(client = "httpClient") // 用于指定当前动态代理使用的 HttpClient 的 bean 名称
@BodyPath("groups") // 用于指定查询结果的解析路径
public interface GroupRepository extends Provider<Group, GroupInput> {
}
```

### 声明 GraphQL 的查询文档
&emsp;&emsp;GroupReopsitory 只是声明了接口，但是具体需要调用什么 GraphQL 接口，要返回什么数据结构，则需要对应的查询声明文档来提供。

&emsp;&emsp;在 resources/graphql/stub 目录下，新建 groupRepository.md 文件，文件内容如下:

- groupRepository.md  [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql-stub/src/test/resources/central/graphql/stub/groupRepository.md)]

```
findBy
===

query GroupQuery($limit: Long, $offset: Long, $conditions: [ConditionInput], $orders: [OrderInput]) {
    groups {
        findBy(limit: $limit, offset: $offset, conditions: $conditions, orders: $orders){
            id
            name
            projects {
                id
                groupId
                name
            }
        }
    }
}
```

### 使用 GraphQLStub
&emsp;&emsp;在应用启动入口（SpringApplication），或者应用配置文件（ApplicationConfiguration）文件上，添加 `@EnableGraphQLStub` 注解，启用 GraphQL 功能。

```java
@EnableGraphQLStub
@SpringBootApplication
public class YourApplication {
    public static void main(String[] args) {
        SpringApplication.run(YourApplication.class, args);
    }
}
```

&emsp;&emsp;在应用配置文件上，添加 GraphQL 调用的网络客户端。

```java
@Configuration
public class ApplicationConfiguration {

    /**
     * 这里使用了 Central Standard Library 提供的 Http 动态代理的功能
     * 开发者也可以把这段代码替换成使用 Feign 来调用
     */
    @Bean
    @Primary
    public ProviderClient httpClient() {
        return HttpProxyFactory.builder(OkHttpExecutor.Default())
                .contact(new SpringContract())
                // 提供 graphql 服务的地址
                .baseUrl("http://127.0.0.1:8080")
                .target(ProviderClient.class);
    }
}
```

&emsp;&emsp;当程序启动时，框架会自动扫描 YourApplication 所在的包，以及这个包的子包的所有 Provider。然后就可以通过注入的方式来调用了。

```java
    @Autowired
    private GroupRepository repository;

    public void test() {
        // 执行 GroupReopsitory 的 findBy 方法
        // 相当于向 GraphQL 服务器发起了一次请求，请求内容是 groupRepository.md 指定的 grahql 脚本
        var result = this.repository.findBy(null, null, Conditions.of(Group.class).eq(Group::getName, "spring"), null));

        // 其它逻辑
        ...
    }
```