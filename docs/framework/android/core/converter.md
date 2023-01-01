# Converter
## 概述
&emsp;&emsp;在使用系统的过程中，我们经常面临着类型转换的问题。比如在 properties 文件中保存的变量是字符串类型，但是注入时需要注入 Long 类型等等。为了方便地解决这些问题，本类库在 `central.convert` 包下定义了一套完整的类型转换系统。该系统使用 SPI 机制去实现类型转换器的注册逻辑，并支持在运行时执行类型转换逻辑。开发者还可以通过容器注入的方式去添加一些自定义的类型转换器。

## Converter
&emsp;&emsp;`Converter` 接口是类型转换的上层接口，本类库提供了该接口的标准实现类 `GenericConverter`。开发者通过该接口可以方便地完成类型转换工作。`Converter` 的接口定义如下：

```kotlin
interface Converter {
    /**
     * 是否支持将源类型转换为指定类型
     *
     * @param source 源类型
     * @param target 目标类型
     */
    fun support(source: Class<*>, target: Class<*>): Boolean

    /**
     * 将源对象转换为指定类型
     */
    @Throws(ConvertException::class)
    fun <T> convert(source: Any?, target: Class<T>): T?
}
```

&emsp;&emsp;开发者在使用时，可以参考以下代码片段：

```kotlin
class TestComponent {

    @Autowired
    private lateinit var converter: Converter

    fun test() {
        val source = "1234"

        // 判断是否支持类型转换
        if (converter.support(source::class.java, Int::class.java)) {
            // 执行转换逻辑
            val target: Int = converter.convert(source, Int::class.java)
        }
    }
}

```

## Custom TypeConverter
### TypeConverter Interface
&emsp;&emsp;`TypeConverter` 是实现类型转换逻辑的基本单元。开发者在自定义类型转换器时，需要实现该接口。接口定义如下：

```kotlin
interface TypeConverter<T> {
    /**
     * 判断当前转换器是否支持转换源类型
     *
     * @param source 源类型
     */
    fun support(source: Class<*>): Boolean

    /**
     * 执行转换逻辑
     */
    @Throws(ConvertException::class)
    fun convert(source: Any): T?
}
```

&emsp;&emsp;开发者可以参考 `central.convert.support.impl` 包下面实现的类型转换器去实现自定义类型转换器，如：

```kotlin
class IntegerConverter : Converter<Int> {
    /**
     * 判断当前转换器是否支持转换源类型
     *
     * @param source 源类型
     */
    override fun support(source: Class<*>): Boolean = when {
        source == Int::class.javaObjectType -> true
        Number::class.java.isAssignableFrom(source) -> true
        source == String::class.java -> true
        else -> false
    }

    /**
     * 执行转换逻辑
     */
    override fun convert(source: Any): Int? = when (source) {
        is Int -> source
        is Number -> source.toInt()
        is String -> source.toInt()
        else -> throw ConvertException(source, Int::class.javaObjectType)
    }
}
```

### SPI Register
&emsp;&emsp;`GenericConverter` 实现了通过 SPI 机制去加载自定义类型转换器的逻辑。开发者只需要在 `resource` 目录下新建 `META-INF/central.convert.ConversionService.imports` 文件，文件内容如下：

```properties
imports=your.converter.full.path.CustomConverter
```

&emsp;&emsp;`GenericConverter` 在创建时，会自动寻找该文件并加载指定的类型转换器。

### Container Register
&emsp;&emsp;在 IoC 容器中，同时也内置了 Converter 的实现。如果开发者使用了 IoC 容器，那么开发者只需要将类型转换器注册到容器中即可。如：

```kotlin
@Configuration
@Import(CustomConverter::class)
class ApplicationConfiguration {
    
}
```