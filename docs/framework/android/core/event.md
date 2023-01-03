# Event
## 概述
&emsp;&emsp;在开发的过程中，我们经常需要通过观察者模式去解决一些问题。本类库实现了一套简单提事件广播与监听的机制。

## ApplicationEvent Interface
&emsp;&emsp;`ApplicationEvent` 是事件的接口，开发者在定义事件时需要继承于该接口。`ApplicationEvent` 的定义如下：

```kotlin
interface ApplicationEvent {
    /**
     * 事件源
     */
    val source: Any
}
```

## ApplicationListener Interface
&emsp;&emsp;`ApplicationListener` 是事件的监听器接口，开发者在定义事件临听器时需要实现该接口。`ApplicationListener` 的定义如下：

```kotlin
interface ApplicationListener<E : ApplicationEvent> {
    /**
     * 处理应用事件
     */
    fun onApplicationEvent(event: E)
}
```

## ApplicationPublisher Interface
&emsp;&emsp;`ApplicationPublisher` 是事件广播器的接口，开发者通常通过该接口来广播事件。`ApplicationContext` 实现了该接口，因此开发者也可以通过 `ApplicationContext` 来广播事件。在广播事件的过程中，`ApplicationPublisher` 会去查找实现了 `ApplicationListener` 接口的监听器，如果该监听器监听的类型与事件类型符合，则通知该监听器，完成事件广播。在程序启动的过程中，ApplicationContext 就会广播 `ContextRefreshedEvent` 事件通知开发者容器已完成刷新动作。