# Central Starter Cache
## 概述
&emsp;&emsp;Central Starter Cache 主要用于为项目提供缓存管理功能。在后端开发过程中，经常通过缓存来提升接口响应速度，减少数据库的压力。由于 Spring Cache 的缓存管理功能不支持级联删除功能，因此可能会出现缓存清除困难、缓存清除不干净等问题，很多应用程序不得不提供手动「清除缓存」的功能给用户，用户体验不佳。

::: details 级联删除定义
&emsp;&emsp;级联删除是指：定义 A 缓存依赖 B 缓存，定义 B 缓存依赖 C 缓存；当 C 缓存被删除时，缓存框架应根据依赖关系找到 B 和 A 缓存，然后依次删除。

&emsp;&emsp;缓存级联删除功能可以解决缓存管理复杂等问题。
:::

## Maven 座标
```xml
<dependency>
    <groupId>com.central-x</groupId>
    <artifactId>central-starter-cache</artifactId>
    <version>${centralx.version}</version>
 </dependency>
```

## 使用类库
### 启用缓存功能
&emsp;&emsp;开发者需要在程序启动类或配置类上添加 `@EnableCaching` 注解，用于启用本类库提供的缓存功能。

```java
@EnableCaching
@SpringBootApplication
public class YourApplication {
    public static void main(String[] args) {
        SpringApplication.run(YourApplication.class, args);
    }
}
```

### 注解管理缓存
&emsp;&emsp;在日常开发过程中，最经常使用缓存的方式，就是通过在方法上面添加相关的注解，以达到自动管理缓存的过程。

#### 执行顺序

![](./assets/cache.svg)

#### @Cachable
&emsp;&emsp;本注解主要用于在没有缓存时生成缓存，有缓存时直接返回结果。

```java
    /**
     * 本缓存会在调用方法前，检查是否存在指定键的缓存
     * 如果存在缓存，则直接返回缓存，本方法将不会被调用
     * 如果不存在缓存，则调用本方法，并将本方法返回的数据保存到缓存，供下次使用
     *
     * 通过 key 指定缓存的键名，使用模板语法计算键
     * 通过 expires 指定缓存失效时间
     */
    @Cacheable(key = "account:id:${args[0]}", expires = 30 * 60 * 1000L)
    public Account findById(String id) {
        // 根据主键查询帐户信息
        ...
    }


    /**
     * 通过 sign(args) 计算参数的签名，不同的参数签名不一样，因此对应的缓存也不一样。
     * 通过 dependencies 指定当前缓存的依赖。当依赖的缓存被清除时，当前缓存也会被一起清除。
     */
    @Cacheable(key = "account:findBy:${sign(args)}", dependencies = "account:id:any")
    public List<Account> findBy(Long first, Long offset, Conditions<Account> conditions, Orders<Account> orders) {
        // 通过条件查询帐户信息
        ...
    }
```

#### @CacheEvict
&emsp;&emsp;本注解用于清除指定的缓存。在清除缓存时，会同时清除依赖本缓存的其它缓存。

```java
    /**
     * 清除指定的缓存
     * 同时清除键为 account:id:any 的缓存，由于 account:findBy:* 依赖了这个缓存，因此也会被同时清除
     */
    @CacheEvict(key = "account:id:${args[0]}")
    @CacheEvict(key = "account:id:any")
    public boolean deleteById(String id) {
        // 根据主键删除数据
        ...
    }
```

### 手动管理缓存

```java
    @Autowired
    private CacheStorage storage;

    
    public List<Account> findBy(Long first, Long offset, Conditions<Account> conditions, Orders<Account> orders) {
        // 根据参数计算缓存键
        var key = ...;

        // 判断缓存是否存在
        if (this.storage.exists(key)) {
            // 如果缓存存在，则返回缓存
            return this.storage.get(key);
        }

        // 根据主键查询帐户信息
        var accounts = ...;

        // 保存结果到缓存系统，缓存有效期为 30 分钟，并依赖键为 account:id:any 的缓存
        this.storage.put(key, accounts, 30 * 60 * 1000L, "account:id:any");

        return accounts;
    }


    public boolean deleteById(String id) {
        // 根据主键删除数据
        var result = ...

        // 同时清除 account:id:${id} 和 account:id:any 这两个缓存
        // 在清除这两个缓存的时候，缓存系统会同时清除依赖本缓存的其它缓存
        this.storage.evict("account:id:" + id, "account:id:any");
        return result;
    }

```