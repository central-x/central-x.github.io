# Central Studio
## 概述
&emsp;&emsp;Central Studio 是一个强大的通用模块化平台。他提供了多种业务无关的通用微服务基础组件，让开发者可以更专注于业务本身。

&emsp;&emsp;Central Studio 目前提供了以下基础组件，在将来会继续完善，提供更多通用功能。

- [Central Gateway](/studio/gateway/): 网关中心是 Central Studio 体系下的微服务入口，提供了多种断言和过滤器，可以为微服务提供多种安全保障。网关中心提供了易单易用的可视化界面，简化网关开发与运维难度。
- [Central Security](/studio/security/): 认证中心是 Central Studio 体系下的认证入口，提供了统一会话管理功能。认证中心除了提供常规的帐号密码登录之外，还接入了多种第三方认证协议。
- [Central Storage](/studio/storage/): 存储中心是 Central Studio 体系下的文件存储中心，提供了标准的对象存存接口。存储中心除了提供本地磁盘存储的功能之外，还可以接入多种第三方文件存储，通过可视化界面的配置，开发者可以轻易将文件保存到不同的存储系统中。
- [Central Multicast](/studio/multicast/): 广播中心主要提供了各类第三方广播推送功能，包括邮件推送、百度云推送等等。
- [Central Logging](/studio/logging/): 日志中心主要为微服务提供了统一的日志汇集功能，通过日志采集器、日志过滤器、日志存储器将各个微服务系统汇集上来的日志进行分类管理和保存。
- [Central Dashboard](/studio/dashboard/): 管理中心主要用于提供 Studio 套件的管理功能，它集合了所有 Studio 的管理界面，可以方便地对所有 Studio 套信进行管理。
- [Central Provider](/studio/provider/): 数据服务中心是 Central Studio 体系下的数据中心，主要为 Studio 套件中的其它微服务提供数据存储功能。他实现了一套准备的 GraphQL 服务接口，可供所有接入的微服务使用其数据。