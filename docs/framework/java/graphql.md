# Central Starter GraphQL
&emsp;&emsp;Central Starter GraphQL 是基于 graphql-java [[链接](https://www.graphql-java.com)]封装的类库，用于将数据封装成 GraphQL 接口。另外，可以参考 graphql 中文文档[[链接](https://graphql.cn)]来入门学习。

&emsp;&emsp;在微服务体系中，往往会在一个微服务中提供数据，另一些微服务通过接口来消费这些数据。在声明接口的时候，往往是固定的查询条件、固定的返回结果。如果数据提供方需要变更查询条件，或者变更返回结果，那么就会有可能导致这个接口产生兼容性问题。在实际生产过程中，数据提供方和数据消费方有可能是不同的团队，因此最后数据提供方为了兼容性，一般情况下是不敢动现有的接口的，只能另行新增接口去满足新的需求，最后导致接口越来越多、越来越冗余、越来越难维护。

&emsp;&emsp;因此，微服务团队可以考虑通过 GraphQL 来维护数据提供方的 API，数据消费方可以根据自己的需求，自己定义查询条件和返回的数据结构。后续数据提供方的 API 就算升级了，对数据消费方的影响也相对比较小，或者可以平滑升级。

&emsp;&emsp;另外，我看到有一些文章提到，把 GraphQL 的接口暴露给前端，由前端自己决定如何去查询数据，如何去组织数据。我个人认为这个不是特别恰当，因为一个完善的产品，对前端获取数据是有严格范围控制的，不仅仅需要控制接口范围，有时还需要控制字段的范围；同时，根据一些安全要求，还需要对用户获取的数据进行记录。如果将 GraphQL 接口直接暴露给前端去使用，我不否认可以完成以上的功能，但是有可能会导致权限判断逻辑变得非常复杂，得不偿失。

## Maven 座标
```xml
<dependency>
    <groupId>com.central-x</groupId>
    <artifactId>central-starter-graphql</artifactId>
    <version>${centralx.version}</version>
 </dependency>
```

## 使用类库
### 目录结构
&emsp;&emsp;在 src/main 目录下，创建以下目录和文件。也可以直接参考该类库的单元测试[[链接](https://github.com/central-x/central-framework/tree/master/central-starters/central-starter-graphql/src/test)]。

```
src/main
├── java
│   └── your.package
│       ├── YourApplication.java
│       └── graphql
│           ├── dto
│           │   ├── DTO.java
│           │   ├── PersonDTO.java
│           │   └── PetDTO.java
│           ├── mutation
│           │   ├── PersonMutation.java
│           │   └── PetMutation.java
│           ├── query
│           │   ├── PersonQuery.java
│           │   └── PetQuery.java
│           ├── Configurer.java
│           ├── Mutation.java
│           └── Query.java
│
└── resources
    └── central
        └── graphql
            ├── query.graphql
            ├── mutation.graphql
            ├── person
            │   ├── personMutation.graphql
            │   └── personQuery.graphql
            └── pet
                ├── petMutation.graphql
                └── perQuery.graphql
```
### 创建 graphql 声明文件
&emsp;&emsp;在 resources/central/graphql 目录下，创建相关 graphql 声明文件。这些声明文件，相当于数据提供方和数据消费方的一个契约。

- query.graphql [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/resources/central/graphql/query.graphql)]

```graphql
extend type Query {
    "宠物查询"
    pets: PetQuery
    "人查询"
    persons: PersonQuery
}
```

- mutation.graphql [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/resources/central/graphql/mutation.graphql)]

```graphql
extend type Mutation {
    "宠物修改"
    pets: PetMutation
    "人修改"
    persons: PersonMutation
}
```

- person/personQuery.graphql [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/resources/central/graphql/person/personQuery.graphql)]

```graphql
"""
人
"""
type Person implements Entity & Modifiable {
    "主键"
    id:                     ID!
    "姓名"
    name:                   String!

    "创建人主键"
    creatorId:              String!
    "创建时间"
    createDate:             Timestamp!
    "修改人主键"
    modifierId:             String!
    "修改时间"
    modifyDate:             Timestamp!

    "宠物"
    pets(
        "数据量（不传的话，就返回所有数据）"
        limit: Long,
        "偏移量（跳过前 N 条数据）"
        offset: Long,
        "筛选条件"
        conditions: [ConditionInput] = [],
        "排序条件"
        orders: [OrderInput] = []
    ): [Pet]!
}

"""
人查询
"""
type PersonQuery {
    """
    查询数据
    """
    findById(
        "主键"
        id: String
    ): Person

    # 其它查询接口声明
}
```

- person/personMutation.graphql [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/resources/central/graphql/person/personMutation.graphql)]

```graphql
"""
人
"""
input PersonInput {
    "主键"
    id:                     ID
    "姓名"
    name:                   String
}

"""
人修改
"""
type PersonMutation {

    """
    保存数据
    """
    insert(
        "数据输入"
        input: PersonInput,
        "操作人"
        operator: String
    ): Person

    # 其它修改接口声明
}
```

### 启用 GraphQL 功能
&emsp;&emsp;在应用启动入口（SpringApplication），或者应用配置文件（ApplicationConfiguration）文件上，添加 `@EnableGraphQL` 注解，启用 GraphQL 功能。

```java
@EnableGraphQL
@SpringBootApplication
public class YourApplication {
    public static void main(String[] args) {
        SpringApplication.run(YourApplication.class, args);
    }
}
```

### 添加 DTO 声明
&emsp;&emsp;在 dto 包里，添加 DTO 声明。在 DTO 中，需要添加 `@GraphQLType` 注解，用于绑定 graphql 声明文件中对应的数据类型。

&emsp;&emsp;在 DTO 中，有两类数据声明，一类是普通的字段，另一类是关联查询。在本案例中，普通字段通过继承 PersionEntity 的方式从父类中获得，而关联查询则在本声明添加。

&emsp;&emsp;关联查询需要在关联查询接口上添加 `@GraphQLGetter` 注解，参数支持通过以下方式绑定参数:

- @Autowired: 注入 Spring Bean
- @RequestParam: 注入查询参数。查询参数名和类型需要和 graphql 声明文件中相同
- @RequestHeader: 注入本次请求的请求头
- @RequestAttribute: 注入本次请求的 Attribute 属性
- GraphQLRequest、DataFetchingEnvironment、BatchLoaderEnvironment、DataLoader 等 GraphQL 对象
- ServletRequest、HttpServletRequest、ServletResponse、HttpServletResponse、HttpMethod、Locale、TimeZone、ZoneId 等 Servlet 对象

- PetsonDTO.java [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/java/central/starter/graphql/graphql/dto/PersonDTO.java)]

```java
@Data
@GraphQLType("Person")
@EqualsAndHashCode(callSuper = true)
public class PersonDTO extends PersonEntity implements DTO {
    @Serial
    private static final long serialVersionUID = 5206987080662110335L;

    @GraphQLGetter
    public List<PetDTO> getPets(@Autowired PetQuery query /* 通过 @Autowired 注入 Spring Bean */) {
        return query.findBy(null, null, Conditions.of(PetEntity.class).eq(PetEntity::getMasterId, this.getId()), null);
    }
}
```

- PetDTO.java [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/java/central/starter/graphql/graphql/dto/PetDTO.java)]

```java
@Data
@GraphQLType("Pet")
@EqualsAndHashCode(callSuper = true)
public class PetDTO extends PetEntity implements DTO {
    @Serial
    private static final long serialVersionUID = 1026917164765039319L;

    @GraphQLGetter
    public CompletableFuture<PersonDTO> getMaster(DataLoader<String, PersonDTO> loader /* 注入 GraphQL 原生对象 */) {
        // 通过 DataLoader 解决 N + 1 问题
        // https://www.graphql-java.com/documentation/batching#async-calls-on-your-batch-loader-function-only
        return loader.load(this.getMasterId());
    }
}
```

::: details N + 1 查询问题
&emsp;&emsp;在上面的 PetDTO 声明中，每个 Pet 会对应着一个主人（Person）。如果现在要查询 10 个 Pet 以及它们的主人，那么就需要发起 1 次查询 Pet 的请求，获取到 10 个 Pet 的信息，然后再依次获取每个 Pet 的主人数据，因此最后一共需要查询 11 次，也就是 N + 1 次查询问题。

&emsp;&emsp;N + 1 查询问题会随着「1」的查询数据增大而越来越凸显，而且对数据源的压力也会大大增加。因此，这里需要通过 DataLoader 减少 N + 1 的影响。

&emsp;&emsp;DataLoader 的工作原理是在一次查询中，开发者将需要加载的数据主键传递给 DataLoader，并返回一个异步查询结果。DataLoader 会在恰当的时候将所有的查询汇总到一次查询里完成，然后再次结果通过异步返回给调用方。因此最后 N + 1 查询问题就可以被优化为 1 + 1 问题（理想情况下）。
:::

- PersonQuery.java [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/java/central/starter/graphql/graphql/query/PersonQuery.java)]

### 添加 Query 实现
&emsp;&emsp;在 query 包里，添加 Query 的类声明。Query 主要对应着 grphql 声明文件里的 query，用于向数据提供方提供查询入口。

&emsp;&emsp;一般情况下，Query 需要提供两类实现，一个是 BatchLoader 实现，另一类是 Fetcher 实现。BatchLoader 实现主要用于解决 N + 1 问题，用于提供对应的 DataLoader；Fetcher 主要用于实现 graphql 声明文件里的接口。

```java
@Component
@GraphQLSchema(path = "person", types = PersonDTO.class)
public class PersonQuery {

    /**
     * 批量数据加载器
     * DataLoader 最终将会调用本方法来获取数据
     * 需要添加 @GraphQLBatchLoader 标注该接口为 DataLoader 接口
     *
     * @param ids 主键
     */
    @GraphQLBatchLoader
    public @Nonnull Map<String, PersonDTO> batchLoader(@RequestParam List<String> ids) {
        // 根据主键查询数据
        ...
    }

    /**
     * 实现 GraphQL 声明文件中的接口
     * 需要添加 @GraphQLFetcher 注解
     */
    @GraphQLFetcher
    public @Nullable PersonDTO findById(@RequestParam String id /* 注入 GraphQL 查询参数 */) {
        // 根据主键醒询数据
        ...
    }

    // 其它 GraphQL Query 接口实现
    ...
}
```

&emsp;&emsp;添加 Query 类，用于汇总所有查询接口。

- Query.java [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/java/central/starter/graphql/graphql/Query.java)]

```java
@Component
@GraphQLSchema(types = {PersonQuery.class, PetQuery.class})
public class Query {

    /**
     * Person Query
     */
    @GraphQLGetter
    public PersonQuery getPersons(@Autowired PersonQuery query) {
        return query;
    }

    /**
     * Pet Query
     */
    @GraphQLGetter
    public PetQuery getPets(@Autowired PetQuery query) {
        return query;
    }
}
```


### 添加 Mutation 实现
&emsp;&emsp;在 mutation 包里，添加 Mutation 的类声明。Mutation 主要对应着 grphql 声明文件里的 mutation，用于向数据提供方提供数据修改入口。

- PersonMutation.java [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/java/central/starter/graphql/graphql/mutation/PersonMutation.java)]

```java
    /**
     * 实现 GraphQL 声明文件中的接口
     * 需要添加 @GraphQLFetcher 注解
     */
    @GraphQLFetcher
    public @Nonnull PersonDTO insert(@RequestParam @Validated({Insert.class, Default.class}) PersonInput input, /* 注入 GraphQL 查询参数，支持参数校验 */
                                     @RequestParam String operator) {
        // 保存数据
        ...
    }

    // 其它 GraphQL Mutation 接口实现
    ...
```

&emsp;&emsp;添加 Mutation 类，用于汇总所有修改接口。

- Mutation.java [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/java/central/starter/graphql/graphql/Mutation.java)]
  
```java
@Component
@GraphQLSchema(types = {PersonMutation.class, PetMutation.class})
public class Mutation {

    /**
     * Person Mutation
     */
    @GraphQLGetter
    public PersonMutation getPersons(@Autowired PersonMutation mutation) {
        return mutation;
    }

    /**
     * Pet Mutation
     */
    @GraphQLGetter
    public PetMutation getPets(@Autowired PetMutation mutation) {
        return mutation;
    }
}
```

### 添加 GraphQLConfigurer 实现
&emsp;&emsp;GraphQLConfigurer 用于配置 GraphQL 的相关参数，包括声明 Query 入口和 Mutation 出口。同时，开发者也可以通过这个类去配置 GraphQL 的参数注入器，去实现自定义参数的注入。

- Configurer.java [[完整声明](https://github.com/central-x/central-framework/blob/master/central-starters/central-starter-graphql/src/test/java/central/starter/graphql/graphql/Configurer.java)]

```java
@Component
public class Configurer implements GraphQLConfigurer {
    @Setter(onMethod_ = @Autowired)
    private Query query;

    @Setter(onMethod_ = @Autowired)
    private Mutation mutation;

    @Override
    public Object getQuery() {
        return this.query;
    }

    @Override
    public Object getMutation() {
        return this.mutation;
    }
}
```

## 测试
