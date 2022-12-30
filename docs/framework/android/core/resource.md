# Resource
## 概述
&emsp;&emsp;Java 标准的 `java.net.URL` 类是标准的用于表示资源的类型，这个类型可以处理一些特定协议的资源。但是在日常开发中，我们经常需要定义一些私有的协议去处理一些资源，这在 `java.net.URL` 中是比较难处理的，因此提出了 Resource 的概念。

## 接口
### Resource Interface
&emsp;&emsp;`Resource` 接口用于表示一些更低层级的资源。下面是 Resource 接口的定义:

```kotlin
interface Resource {
    /**
     * 资源是否存在
     */
    fun exists(): Boolean

    /**
     * 用于指定资源是否可以返回 InputStream
     */
    fun readable(): Boolean

    /**
     * 获取 URI
     */
    fun getURI(): URI

    /**
     * 获取资源长度
     *
     * 如果无法获取资源长度，将返回 -1，表示资源长度未知
     */
    @Throws(IOException::class)
    fun getContentLength(): Long

    /**
     * 获取资源(文件)名
     */
    fun getName(): String?

    /**
     * 获取流
     * 如果文件不存在时，将返回空
     */
    @Throws(IOException::class)
    fun getInputStream(): InputStream?
}
```

### ResourceLoader Interface
&emsp;&emsp;`ResourceLoader` 接口用于获取资源。下面的 ResourceLoader 接口的定义:

```kotlin
interface ResourceLoader {
    /**
     * 返回是否支持指定的协议
     */
    fun support(protocol: String): Boolean

    /**
     * 返回是否支持指定的 URI
     */
    fun support(uri: URI): Boolean = this.support(uri.scheme)

    /**
     * 返回指位置的资源。该资源必须是可重复使用的，允许重复调用 [Resource.getInputStream]。
     * 本方法不合返回空的 Resource 对象，开发者可以通过 [Resource.isExists] 方法判断资源是否存在。
     * 如果同一路径下存在多个同名资源，则返回第一个资源。
     *
     * @param location 资源路径，需要协议名
     */
    fun getResource(location: URI): Resource

    /**
     * 返回指定路径的资源。该资源必须是可重复使用的，允许重复调用 [Resource.getInputStream]。
     * 本方法不会返回空的 Resource 对象，开发者可以通过 [Resource.isExists] 方法判断资源是否存在。
     *
     * @param location 资源路径，需要协议名
     */
    fun getResources(location: URI): List<Resource> {
        val resource = this.getResource(location)
        return if (resource.isExists()) {
            listOf(resource)
        } else {
            emptyList()
        }
    }

    /**
     * 返回指定位置的资源。该资源必须是可重复使用的，允许重复调用 [Resource.getInputStream]。
     * 本方法不会返回空的 Resource 对象，开发者可以通过 [Resource.isExists] 方法判断资源是否存在。
     * 如果同一路径下存在多个同名资源，则返回第一个资源。
     *
     * @param location 资源路径，不需协议名，只需要路径名即可
     */
    fun getResource(location: String): Resource

    /**
     * 返回指定路径的资源。该资源必须是可重复使用的，允许重复调用 [Resource.getInputStream]。
     * 本方法不会返回空的 Resource 对象，开发者可以通过 [Resource.isExists] 方法判断资源是否存在。
     *
     * @param location 资源路径，不需协议名，只需要路径名即可
     */
    fun getResources(location: String): List<Resource> {
        val resource = this.getResource(location)
        return if (resource.isExists()) {
            listOf(resource)
        } else {
            emptyList()
        }
    }
}
```

### Built-in ResourceLoader

- UrlResourceLoader: 用于加载 http、https 协议的资源，返回 UrlResource 表示网络资源
- ClassPathResourceLoader: 用于加载 classpath 协议的资源，返回 ClassPathResource 表示类路径资源
- FileSystemResourceLoader: 用于加载 file 协议的资源，返回 FileSystemResource 表示文件系统资源
- AssetResourceLoader: 用于加载 asset 协议的资源，返回 AssetResource 表示 Android 应用的 res 目录下的资源