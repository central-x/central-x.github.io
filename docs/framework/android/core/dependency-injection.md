# Dependency Injection
## 概述
&emsp;&emsp;依赖注入是实现控制反转的一种实现方法，可以用于降低代码的耦合度。本类库现实了依赖注入的相关功能，通过容器（IoC Container）管理实例（Bean），并支持多种依赖注入方式。本类库参考了很多 Spring [[链接](http://spring.io)] 里的设计，本类库也会尽量提供与 Spring 相近的功能，减少学习成本。

## IoC Container 及 Bean
&emsp;&emsp;`Bean` 是指受 IoC 容器管理的实例，而 IoC 容器则主要用于管理这些 Bean 及其依赖。容器在创建 Bean 时，可以通过 Bean 的构造函数、属性、工厂方法参数等方式，将依赖传递给 Bean，从而完成整个控制反转的功能。

&emsp;&emsp;`BeanFactory` 接口是 IoC 容器的主要接口，该接口提供了一系列机制去管理 Bean。 `ApplicationContext` 接口是 BeanFactory 的子接口，并整合了面向切面编程（AOP）、事件（Event）、环境变量（Environment）等功能，是我们在开发过程中最常用的接口。

&emsp;&emsp;`ApplicationContext` 接口在开发的过程中，主要扮演的是 IoC 容器的角色。通过读取配置元数据（Configuration Metadata），完成了 Bean 的创建、配置、组装工作。配置元数据一般包含Java 注解或 Java 代码（XML 未实现），这些元数据可以让开发者自由定义这些对象之间的依赖关系，并完成应用的组装。

&emsp;&emsp;在 Android 系统中，一般通过以下代码启动和停止容器：

```kotlin
package central.demo

import android.app.Application
import central.android.AndroidApplication
import central.bean.factory.config.Configuration

/**
 * Demo Application
 */
class DemoApplication: Application() {
    override fun onCreate() {
        // 启动 AndroidApplication
        AndroidApplication.run(this, ApplicationConfiguration::class)
        super.onCreate()
    }

    override fun onTerminate() {
        // 停止 AndroidApplication
        AndroidApplication.stop()
        super.onTerminate()
    }
}
```


## Configuration Metadata
&emsp;&emsp;在上一章节所述，配置元数据（Configuration Metadata）主要用于让开发者告诉容器如何去实例化、配置、组装 Bean。那么，在本章节，将介绍如何通过注解的方式（Annotation-base configuration）实现配置元数据。

&emsp;&emsp;一般情况下，通过以下注解，基本可以完成配置元数据组装工作：

- `@Configuraiton`：标识指定类的配置类，容器将会解析该类里面所有带 `@Bean` 注解的方法；
- `@Bean`：用于标识配置类里面的方法。带有该注解的方法将作为 Bean 的工厂方法；
- `@Import`：用于引入更多的组件、配置类等；
- `@DependsOn`：用于声明 Bean 的依赖关系；
- `@LazyInit`：用于声明 Bean 是否延迟初始化；
- `@Scope`：用于声明 Bean 的作用域；
- `@Primary`：如果出现多个相同类型的 Bean，通过本注解标识哪个为主要的 Bean；
- `@Autowired`：用于指定依赖注入的入口，可以作用于构造函数、方法、属性等；
- `@Qualifier`：用于指定注入的 Bean 的名称，主要作用于参数、属性；
- `@Value`：用于指定注入的环境变量（[Environment](/framework/android/core/environment)]）的名称；

### @Configuration 和 @Bean
&emsp;&emsp;`@Configuration` 注解用于标识指定的类是配置类。容器如果发现 Bean 带有 `@Configuraiton` 注解时，就会解析该类的所有公开的方法（包括静态方法），将所有带 `@Bean` 注解的方法作为 Bean 工厂方法。如：

```kotlin
@Configuration
class ApplicationConfiguration {

    /**
     * 本方法会产生一个名为 accountMapper 的 Bean
     */
    @Bean
    fun accountMapper(): AccountMapper {
        return AccountMapper()
    }

    /**
     * 本方法会产生一个名为 accountService 的 Bean
     * 通过方法的参数，可以告诉容器在构建本实例时需要注入类型为 AccountMapper 的 Bean
     * 因此，容器会先构造 accountMapper 再构造 accountService
     */
    @Bean
    fun accountService(mapper: AccountMapper): AccountService {
        return AccountServiceImpl(mapper)
    }
}
```

### @Import
&emsp;&emsp;`@Import` 注解用于引入更多的组件，相当于传递解析路径。本注解需要在 `@Configuration` 注解的基础上使用。如：

```kotlin
/**
 *    在本案例中，容器在解析 ApplicationConfiguration 配置类时，发现该类
 * 同时带还有 @Import 注解，那么容器会继续解析 ClientConfiguration 类和
 * AccountService 类。
 *    如果在 ClientConfiguration 还发现 @Import 注解，则会继续往下解析，
 * 以此类推。
 *    而 AccountService 类将会被解析为 Bean。
 */
@Configuration
@Import(ClientConfiguration::class, AccountService::class)
class ApplicationConfiguration
```

&emsp;&emsp;容器在解析 @Configuration 时，同时还会去解析 `resources/META-INF/${ConfigurationClassName}.imports` 文件，其行为与 `@Import` 一致。`.imports` 文件的格式与 `.properties` 文件格式一致，内容如下:

```properties
imports=central.demo.service.AccountServiceImpl,\
  central.demo.service.DepartmentServiceImpl
```

### @DependsOn
&emsp;&emsp;`@DependsOn` 注解用于告诉容器 Bean 的初始化顺序。一般情况下，Bean 之间由于依赖的关系的存在，已经可以自动处理好初始化顺序了。但是在一些情况下，一些 Bean 需要在指定的 Bean 初始化完成之后才能继续初始化，但这些 Bean 之间没有依赖关系时，就可以通过 `@DependsOn` 注解去处理初始化顺序了。

```kotlin
@Configuration
class ApplicationConfiguration {

    /**
     * 要求 accountService 必须在 dataSource 初始化后再初始化
     */
    @DependsOn("dataSource")
    fun accountService(): AccountService {
        return AccountServiceImpl()
    }
}
```

### @LazyInit
&emsp;&emsp;`@LazyInit` 注解用于标识 Bean 为延迟初始化。该注解可以作用于类或者工厂方法上。带有 `@LazyInit` 注解的 Bean 会被延迟初始化，只有在使用时才会被初始化。如果没有该注解，则会在 `ApplicationContext` 初始化时一起被初始化。

```kotlin
@Configuration
class ApplicationConfiguration {

    /**
     * 标识 accountService 为延迟初始化
     * 程序只有在用到 accountService 对象时，容器才会执行该对象的初始化逻辑
     */
    @LazyInit
    fun accountService(): AccountService {
        return AccountServiceImpl()
    }
}
```

### @Scope
&emsp;&emsp;`@Scope` 注解用于标识 Bean 的作用域。如果 Bean 没有带有 `@Scope` 注解，则默认为单例。本类库默认支持以下三种作用域：

- singleton: 单例作用域，每次都返回相同的实例。
- prototype: 原型作用域，每次都返回新的实例（重新执行构造逻辑）。
- thread: 线程作用域，相同线程返回相同实例，不同线程返回不同实例。

```kotlin
@Configuration
class ApplicationConfiguration {

    /**
     * 标识该 Bean 为线程作用域，因此可以避免线程安全问题
     */
    @Bean
    @Scope(ScopeTarget.THREAD)
    fun dateFormatter(): SimpleDateFormat{
        return SimpleDateFormat("yyyy-MM-dd")
    }
}
```

&emsp;&emsp;除了以上三种作用域，开发者还可以自定义其它作用域（暂未实现）。

### @Primary
&emsp;&emsp;如果相同类型的 Bean 存在多种实现，则需要通过 `@Primary` 注解来标识哪个实现的优先级更高。开发者在获取 Bean 时，如果没有指定 Bean 名称，则返回带有 `@Primary` 注解的实例。

```kotlin
@Configuration
class ApplicationConfiguration {

    /**
     * 在没有指定名称的情况下，默认返回此 Bean
     */
    @Bean
    @Primary
    @Scope(ScopeTarget.THREAD)
    fun dateFormatter(): SimpleDateFormat{
        return SimpleDateFormat("yyyy-MM-dd")
    }

    /**
     * 开发者必须指定了 Bean 的名称，才能获取此 Bean
     */
    @Bean
    @Scope(ScopeTarget.THREAD)
    fun datetimeFormatter(): SimpleDateFormat{
        return SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
    }
}
```

## Dependencies
&emsp;&emsp;应用在开发的过程中，通常不是由单个对象组成的。即使最简单的应用，一般也是由多个对象共同协作完成功能，因此这中间就会产生依赖。本框架可以用于将这些对象进行解偶。

### Constructor-base Dependency Injection
&emsp;&emsp;基于构造函数的依赖注入，是指容器在创建该 Bean 时，将该 Bean 的依赖通过构造函数的参数传入，从而完成依赖注入。

```kotlin
/**
 * 通过构造函数的方式，将 accountMapper 注入
 */
class AccountServiceImpl(private val accountMapper: AccountMapper): AccountService

/**
 * 如果 AccountMapper 存在多个实例，开发者可以通过 @Qualifier 注解来指定注入的实例名称
 */
class AccountServiceImpl(@Qualifier("accountMapper") private val accountMapper: AccountMapper): AccountService
```

&emsp;&emsp;如果 Bean 存在多个构造函数，则容器在推断构造函数时，遵循以下规则：

- 是否带有 @Autowired 注解：带有 @Autowired 注解的构造函数优先级最高。
- 构造函数参数数量：构造函数的参数数量越高，则优先级越高；此优先级低于 @Autowired 的优先级。

```kotlin
class DataServiceImpl: DataService {
    private lateinit var accountService: AccountService
    private lateinit var departmentService: DepartmentService

    constructor(accountService: AccountService) {
        this.accountService = accountService
    }

    /**
     * 由于这个构造函数的参数更多，因此容器将通过此构造函数注入依赖
     * 如果 DepartmentService 存在多个 Bean，开发者也可以通过 @Qualifier 注解要求注入指定名称的依赖
     */
    constructor(accountService: AccountService, @Qualifier("departmentService") departmentService: DepartmentService) {
        this.accountService = accountService
        this.departmentService = departmentService
    }
}

class DataServiceImpl: DataService {
    private lateinit var accountService: AccountService
    private lateinit var departmentService: DepartmentService
    
    /**
     * 由于此构造函数带有 @Autowired 注解，即使该构造函数的参数数量少，容器也将通过此构造函数注入依赖
     */
    @Autowired
    constructor(accountService: AccountService) {
        this.accountService = accountService
    }

    constructor(accountService: AccountService, @Qualifier("departmentService") departmentService: DepartmentService) {
        this.accountService = accountService
        this.departmentService = departmentService
    }
}
```

### Setter-base Dependency Injection
&emsp;&emsp;基于 Setter 的依赖注入，是指容器在完成 Bean 的创建之后，通过调用 Setter 方法的方式将依赖注入，从而完成依赖注入。


```kotlin
class DataServiceImpl: DataService {
    @set:Autowired
    private lateinit var accountService: AccountService

    /**
     * 如果存在多个实例，开发者可以通过 @Qualifier 注解来指定注入的实例名称
     */
    @set:Autowired
    @set:Qualifier("departmentService")
    private lateinit var departmentService: DepartmentService
}

// 还支持通过以下方式注入
class DataServiceImpl: DataService {
    private lateinit var accountService: AccountService
    private lateinit var departmentService: DepartmentService

    @Autowired
    fun inject(accountService: AccountService, @Qualifier("departmentService") departmentService: DepartmentService) {
        this.accountService = accountService
        this.departmentService = departmentService
    }
}
```

### Property-base Dependency Injection
&emsp;&emsp;基于属性的依赖注入，是指容器在完成 Bean 的创建之后，通过反射的方式将依赖注入到带有 @Autowired 的属性，从而完成依赖注入。


```kotlin
class DataServiceImpl: DataService {
    @Autowired
    private lateinit var accountService: AccountService

    /**
     * 如果存在多个实例，开发者可以通过 @Qualifier 注解来指定注入的实例名称
     */
    @Autowired
    @Qualifier("departmentService")
    private lateinit var departmentService: DepartmentService
}
```

### Aware-base Dependency Injection
&emsp;&emsp;基于类 Aware 接口的依赖注入，是指 Bean 继承了以下接口后，容器在完成 Bean 的创建后，会将指定对象注入到 Bean 中。这种依赖注入的方式一般用于注入框架内置的一些对象。框架目前包含以下类 Aware 接口：

- `ApplicationContextAware`: 用于注入 ApplicationContext 对象
- `EnvironmentAware`: 用于注入 Environment 对象
- `ResourceLoaderAware`: 用于注入 ResourceLoader 对象
- `BeanFactoryAware`: 用于注入 BeanFacotry 对象
- `BeanNameAware`: 用于注入 Bean 名称

```kotlin
class DataServiceImpl: DataService, ApplicationContextAware {
    override lateinit var applicationContext: ApplicationContext
}
```

## Lifecycle
### InitializingBean
&emsp;&emsp;容器在完成 Bean 的创建，并在完成依赖注入之后，如果发现该 Bean 实现了 `InitializingBean` 接口，则会调用该接口的 `initialize` 方法，用于通知该 Bean 继续完成相关初始化逻辑。

```kotlin
class DataServiceImpl: DataService, InitializingBean {
    @Autowired
    private lateinit var accountService: AccountService

    @Autowired
    private lateinit var departmentService: DepartmentService

    override fun initialize() {
        // 在 Bean 初始化后执行其它初始化逻辑
    }
}
```

### DestroyableBean
&emsp;&emsp;容器在销毁 Bean 之前，如果发现该 Bean 实现了 `DestroyableBean` 接口，则会调用该接口的 `destroy` 方法，用于通知该 Bean 释放资源。

```kotlin
class DataServiceImpl: DataService, DestroyableBean {
    @Autowired
    private lateinit var accountService: AccountService

    @Autowired
    private lateinit var departmentService: DepartmentService

    override fun destroy() {
        // 在 Bean 销毁前执行释放资源的逻辑
    }
}
```

## Advanced
### BeanPostProcessor
&emsp;&emsp;如果一个 Bean 实现了 `BeanPostProcessor` 接口，那么该 Bean 将会被提前初始化，并可以加入到 Bean 的生命周期的处理过程。`BeanPostProcessor` 主要用于在 Bean 的初始化前、初始化后对 Bean 执行相关处理逻辑。实际上，容器的依赖注入功能也是通该接口实现的。该接口的实现如下:

```kotlin
interface BeanPostProcessor {
    /**
     * 在 Bean 初始化前（如调用 [InitializingBean.initialize] 方法前）调用本方法
     *
     * @param name Bean 名
     * @param bean Bean 实体
     */
    fun processBeforeInitialization(name: String, bean: Any): Any {
        return bean
    }

    /**
     * 在 Bean 初始化后调用本方法
     *
     * @param name Bean 名
     * @param bean Bean 实体
     */
    fun processAfterInitialization(name: String, bean: Any): Any {
        return bean
    }
}
```

### BeanFactoryPostProcessor
&emsp;&emsp;如果一个 Bean 实现了 `BeanFactoryPostProcessor` 接口，那么该 Bean 将会被提前初始化，并可以加入到 BeanFacotry 的生命周期的处理过程。`BeanFacotryPostProcessor` 主要用于在 BeanFactory 被初始化之后执行相关处理逻辑。容器就是通过实现了 `BeanFactoryPostProcessor` 接口来处理带有 @Configuration 注解的配置类，并完成相关 Bean 的扫描与注册功能。

```kotlin
interface BeanFactoryPostProcessor {

    /**
     * 后置处理 Bean 工厂
     */
    @Throws(BeanException::class)
    fun postProcessBeanFactory(beanFactory: ConfigurableBeanFactory)
}
```