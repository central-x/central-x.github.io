# Environment
## 概述
&emsp;&emsp;环境（Environment）接口主要定义了两个概念：配置（Profile） 和 属性（Properties）。

- Profile：是指用于将容器里面的 Bean 通过分组的方式进行逻辑隔离的工具，这些 Bean 只有在该配置激活时才会生效。
- Properties：是指一系列属性信息。这些属性信息可以来源于 properties 文件、JVM 系统属性、操作系统变量等。

## Profiles
### Bean Definition Profiles
&emsp;&emsp;Bean 定义配置（Bean Definition Profiles）在容器中实现了一种机制，这种机制可以允许 Bean 定义注册到不同的环境配置（Environment Profile）中。“环境配置”可以用于解决类似以下问题：

- 测试环境所用的 HttpClient 与生产环境的 HttpClient 需要有不同的配置
- 只有在生产环境才启用一些监控的组件（monitoring infrastructure）
- 在指定的环境下需要定制特定的 Bean 实现

### Using @Profile
&emsp;&emsp;`@Profile` 注解用于让开发者将指定组件绑定到指定的环境配置，当该环境配置被激活时，该组件也会被激活。

```kotlin
@Configuration
@Profile("development")
class DevelopmentConfiguration {

    @Bean
    fun client(): HttpClient {
        ...
    }
}

@Configuration
@Profile("production")
class ProductionConfiguration {

    @Bean
    fun client(): HttpClient {
        ...
    }
}

@Configuration
@Profile("default")
class DefaultConfiguration {

    @Bean
    fun client(): HttpClient {
        ...
    }
}
```

:::tip 提示
&emsp;&emsp;注意，`@Profile("default")` 代表的是如果 development 和 production 都没有被激活时，则使用 default 的配置。
:::

&emsp;&emsp;`@Profile` 也可以作用于方法级别，这样可以缩小影响范围。


```kotlin
@Configuration
class ApplicationConfiguration {

    @Bean
    @Profile("development")
    fun developmentClient(): HttpClient {
        ...
    }

    @Bean
    @Profile("production")
    fun productionClient(): HttpClient {
        ...
    }

    @Bean
    @Profile("default")
    fun defaultClient(): HttpClient {
        ...
    }
}
```

### Activating a Profile
&emsp;&emsp;除了更新应用的配置信息，我们还需要指定哪个 Profile 被激活了。激活 Profile 可以通过以下方式完成：

```kotlin
AndroidApplication.run(this)
AndroidApplication.applicationContext.environment.setActiveProfiles("development")
AndroidApplication.applicationContext.refresh()
```

&emsp;&emsp;除此之外，还可以通过系统环境变量里的 `central.profiles.active` 属性去控制激活指定的 Profile。

```properties
central.profiles.active=development
```

## Properties
### PropertySource
&emsp;&emsp;环境（Environment）提供了一种关于属性（Properties）的搜索机制：PropertySource。 

```kotlin
AndroidApplication.run(this)
val containsMyProperty = AndroidApplication.applicationContext.environment.containsProperty("my-property")
System.out.println("Does my environment contain the 'my-property' property? " + containsMyProperty)
```

&emsp;&emsp;在上面的代码片段中，我们看到了环境（Environment）提供了一种高层级的方式去访问 `my-property` 属性的方式。环境（Environment）在返回 `my-property` 属性时，会从一系列 `PropertySource` 对象中搜索。`PropertySource` 是一种简单的键值对存储容器，而 `StandardEnvironment` 默认加载了三个 PropertySource 对象：

- JVM 属性（`System.getProperties()`），用于获取 JVM 里面的相关信息；
- 系统属性（`System.getenv()`），用于获取当前操作系统的相关信息；
- 应用属性（`classpath:/application.properties` 或 `classpath:/application.yml`），用于获取开发者定义的应用配置信息。

&emsp;&emsp;也就是说，如果你使用 `StandardEnvironment` 的话，当 JVM 属性、系统属性、应用属性里任一包含 `my-property` 时，`env.containsProperty("my-property")` 都会返回 true。

::: tip 提示
&emsp;&emsp;Environment 在搜索 PropertySource 时，会根据其优先级返回结果。一般情况下，系统属性的优先级最高，JVM 属性其次，应用属性优先级最低。因此 `my-property` 属性如果同时出现在系统属性和环境变量里，那么 `env.getProperty("my-property")` 会返回系统属性的值。
:::

&emsp;&emsp;环境（Environment）还提供了可配置化的机制，用于将开发者自定义的 PropertySource 加入到环境（Environment）的搜索域中。

```kotlin
AndroidApplication.run(this)
val sources = AndroidApplication.applicationContext.environment.getPropertySources()
sources.addFirst(MyPropertySource())
```

&emsp;&emsp;在上面的代码片段中，`MyPropertySource` 已经被加入到最高优先级的搜索链中。

### Using @PropertySource
&emsp;&emsp;`@PropertySource` 注解提供了一种声明式的机制，可以便利添加自定义的 PropertySource 到环境（Environment）中。

```kotlin
@Configuration
@PropertySource("classpath:/demo/application.properties")
class ApplicationConfiguration {

    @Autowired
    lateinit var environment: Environment

    @Bean
    fun testBean(): TestBean {
        val testBean = TestBean()
        testBean.name = environment.getProperty("testbean.name")
        return testBean
    }
}
```

### Using @Value
&emsp;&emsp;`@Value` 注解提供了一种声明式的机制，可以便利地注入环境（Evnironment）的属性。

```kotlin
@Configuration
class ApplicationConfiguration {

    /**
     * 通过方法注入 Environment 属性
     */
    @Bean
    fun testBean(@Value("testbean.name") name: String): TestBean {
        val testBean = TestBean()
        testBean.name = name
        return testBean
    }
}

class TestService {

    /**
     * 通过属性注入 Environment 属性
     */
    @Value("testservice.name")
    lateinit var name: String

    fun print() {
        System.out.println("Service name is " + this.name)
    }
}
```

::: tip 提示
&emsp;&emsp;`@Value` 注解的使用方式与 `@Autowired` 的使用方式基本一致。
:::