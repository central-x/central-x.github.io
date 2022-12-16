# JUnit 自定义 Application
## 概述
&emsp;&emsp;在编写 Android 单元测试时，有时需要自定 Application，用于做相关测试。为了达到这个效果，可以参考以下步骤。

## 步骤
### 添加自定义 Application
&emsp;&emsp;在 androidTest 目录下，声明自定义 JUnitApplication 类。

```kotlin
import android.app.Application
import android.content.Context
import androidx.multidex.MultiDex

/**
 * 测试应用
 *
 * @author Alan Yeh
 * @since 2023/02/14
 */
class JUnitApplication : Application() {
    override fun attachBaseContext(base: Context?) {
        super.attachBaseContext(base)
        // dex 分包
        MultiDex.install(base)
    }
}
```

### 声明 JUnitRunner
&emsp;&emsp;新建 JUnitRunner 类，通过该类可以让测试环境在启动时使用开发者指定的 Application 类。

```kotlin
import android.app.Application
import android.content.Context
import androidx.test.runner.AndroidJUnitRunner

/**
 * 自定义 JUnitRunner
 *
 * @author Alan Yeh
 * @since 2022/10/16
 */
class JUnitRunner: AndroidJUnitRunner() {

    /**
     * 使用自定用的 Application
     */
    override fun newApplication(cl: ClassLoader?, className: String?, context: Context?): Application {
        return super.newApplication(cl, JUnitApplication::class.java.name, context)
    }
}
```

### 修改 build.gradle 文件
&emsp;&emsp;修改 testInstrumentationRunner 的值，指定通过上面的 JUnitRunner 来启动测试环境。

```groovy
android {
    ...

    defaultConfig {
        ...

        // 指定通过自定义 JUnitRunner 来启动测试环境
        testInstrumentationRunner "central.test.JUnitRunner"
    }
    ...

    testOptions {
        unitTests {
            isIncludeAndroidResources true
        }
    }
}
```

### 运行测试用例
&emsp;&emsp;完成以上步骤之后，就可以开始执行测试用例了。在 JUnitApplication 的 attachBaseContext 方法中添加断点，可以发现开发环境已经通过 JUnitApplication 来启动环境了。

&emsp;&emsp;在测试用列中，也可以通过 `ApplicationProvider.getApplicationContext<Application>()` 来获取 application 实例。

```kotlin
@SmallTest
@RunWith(AndroidJUnit4::class)
class TestInstantiation {

    @Test
    fun case1() {
        // 获取应用对象
        val application = ApplicationProvider.getApplicationContext<Application>()
    }

}
```