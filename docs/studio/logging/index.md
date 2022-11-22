# Central Logging
## 概述
&emsp;&emsp;Central Logging 是 Central Studio 套件中的日志中心，主要用于集中收集和处理所有系统产生的各类日志数据。

&emsp;&emsp;Central Logging 通过采集器（Collector）可以通过多种渠道将日志集回来，然后通过过滤器，将不同的日志进行过滤和筛选，最终将日志保存到指定的容器中。

```mermaid
flowchart TD

SVC1[Service 1]
SVC2[Service 2]
SVC3[Service 3]
SVC4[Service 4]
SVC5[Service 5]
CA[Http Collector]
CB[MQ Collector]
F{{Filter}}
ST1[(File Storage)]
ST2[(ES Storage)]

SVC1 --> |HTTP| CA
SVC2 --> |HTTP| CA

SVC3 --> |MQ| CB
SVC4 --> |MQ| CB
SVC5 --> |MQ| CB

CA --> |汇集| F
CB --> |汇集| F

F --> |过滤条件| ST1
F --> |过滤条件| ST2
```