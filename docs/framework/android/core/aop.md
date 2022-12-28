# AOP
## 概述
&emsp;&emsp;面向切面编程（Aspect Oriented Programming，AOP）提供了另一种编程思路，是编写应用程序的重要工具。利用 AOP 可以对业务逻辑的各个部分进行隔离，从而使得业务逻辑各部分之间的耦合度降低，提高程序的可重用性，同时提高了开发的效率。

## Pointcut
&emsp;&emsp;`Pointcut` 接口用于让开发者决定是否执行切面操作。

```kotlin
interface Pointcut {
    /**
     * 用于判断指定的方法是否为切面点
     *
     * @param method 待判断的方法信息
     * @param targetClass 方法所在类
     * @param arguments 方法参数
     *
     * @return 是否执行切面操作
     */
    fun matches(method: Method, targetClass: Class<*>, arguments: Array<Any?>): Boolean

    /**
     * 执行切面操作
     *
     * @param invocation 方法调用信息
     * @return 方法调用结果
     */
    @Throws(Throwable::class)
    fun invoke(invocation: MethodInvocation): Any?
}
```

## 示例

```kotlin
/**
 * 引入切面点
 */
@Configuration
@Import(PermissionPointcut::class)
class ApplicationConfiguration {
}


/**
 * 定义一个注解，用于标识哪些方法需要权限判断
 */
 @Target(AnnotationTarget.FUNCTION)
annotation class RequirePermission {
    vararg val permissions: String
}

/**
 * 定义切面点
 */
class PermissionPointcut: Pointcut {
    fun matches(method: Method, targetClass: Class<*>, arguments: Array<Any?>): Boolean {
        return method.isAnnotationPresent(RequirePermission::class)
    }

    fun invoke(invocation: MethodInvocation): Any? {
        // 处理权限相关事宜
        ...

        // 处理后继续调用
        return invocation.proceed()
    }
}


/**
 * 使用切面
 */
class FileService {
    @RequirePermission(Permissions.WRITE)
    fun writeFile(File file): Boolean {
        // 执行文件写操作
        ...

        return true
    }
}
```