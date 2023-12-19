# Central Provider
&emsp;&emsp;Central Provider 是 Central Studio 的数据中心，用于保存 Central Studio 的所有数据，并对外提供相关数据接口。Central Provider 支持租户模式，并支持多种数据隔离方式：

1. 逻辑隔离：通过在表结构中添加 `TENANT_CODE` 字段，在访问数据时添加租户标识的过滤条件，达到数据隔离目的；
2. 模式隔离：通过数据库的不同模式（Schema）对租户数据进行隔离，多个租户共享数据实例，独享数据模式；
3. 物理隔离：将不同的租户保存到不同的数据库实例中，确保租户的数据是完全隔离的。

&emsp;&emsp;Central Provider 内部使用 GraphQL 对数据进行组织，对外暴露统一的 GraphQL 接口，各微服务需要通过 GraphQL 来消费数据。

![](./assets/topology.svg)