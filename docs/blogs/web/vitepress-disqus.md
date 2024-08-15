# VitePress 集成 Disqus
## 概述
&emsp;&emsp;VitePress 本身只提供了博客系统，没有提供评论相关的功能。如果想在博客系统中添加评论功能，增加与访客的互动性，可以选择集成 Disqus 评论系统。

&emsp;&emsp;Disqus[[链接](https://disqus.com)]是一个第三方的评论留言系统，提供了 Facebook、Twitter、Google 等常用的统一登录留言功能，还提供了评分、树状留言等功能。本文档主要记录一下 VitePress 如何集成 Disqus 系统。

&emsp;&emsp;在开始下面的步骤前，需要为你的博客提前注册一个 Disqus 帐号，获取到系统的唯一标识（`Shortname`）。

&emsp;&emsp;本文档是在冰冻大西瓜的方案[[链接](https://bddxg.top/article/note/vitepress优化/给vitepress添加评论系统.html)]的基础上做了一些优化。

## 环境

- VitePress：1.3.1

## 步骤
### 创建 Disqus 组件
&emsp;&emsp;在 `.vitepress/theme` 目录下，创建 `components` 目录，并在该目录下创建 `Disqus.vue` 文件，文件内容如下：

```vue{9}
<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const ID = '_disqus_js'

onMounted(() => {
  const s = document.createElement('script')
  s.id = ID
  s.src = 'https://<shortname>.disqus.com/embed.js'
  s.setAttribute('data-timestamp', +new Date())
  document.body.appendChild(s)
})

onBeforeUnmount(() => {
  document.getElementById(ID)?.remove()
})
</script>

<template>
  <br/>
  <div id="disqus_thread" />
</template>
```

&emsp;&emsp;上面的 Vue 组件是根据 Disqus 给的集成脚本翻译过来的，原脚本如下：

```html{14}
<div id="disqus_thread"></div>
<script>
    /**
    *  RECOMMENDED CONFIGURATION VARIABLES: EDIT AND UNCOMMENT THE SECTION BELOW TO INSERT DYNAMIC VALUES FROM YOUR PLATFORM OR CMS.
    *  LEARN WHY DEFINING THESE VARIABLES IS IMPORTANT: https://disqus.com/admin/universalcode/#configuration-variables    */
    /*
    var disqus_config = function () {
    this.page.url = PAGE_URL;  // Replace PAGE_URL with your page's canonical URL variable
    this.page.identifier = PAGE_IDENTIFIER; // Replace PAGE_IDENTIFIER with your page's unique identifier variable
    };
    */
    (function() { // DON'T EDIT BELOW THIS LINE
    var d = document, s = d.createElement('script');
    s.src = 'https://<shortname>.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
    })();
</script>
<noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>
```

::: tip 提示
&emsp;&emsp;注意高亮部份，将 `<shortname>` 替换成注册 Disqus 系统时的唯一标识。
:::

### 修改主题配置
&emsp;&emsp;修改 `.vitepress/theme/index.ts` 文件，内容如下：

```typescript
// https://vitepress.dev/guide/custom-theme
import {h} from 'vue'
import type {Theme} from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Disqus from './components/Disqus.vue' // [!code focus]
import './style.css'

export default {
    extends: DefaultTheme,
    Layout: () => {
        return h(DefaultTheme.Layout, null, {
            // https://vitepress.dev/guide/extending-default-theme#layout-slots
            // 在文档后面插入 Disqus 评论系统 // [!code focus]
            'doc-after': () => h(Disqus) // [!code focus]
        })
    },
    enhanceApp({app, router, siteData}) {
        // ...
    }
} satisfies Theme

```

::: tip 提示
&emsp;&emsp;VitePress 支持在文档的不同位置插入内容，具点插入点（Slot）参考 VitePress 的文档[[链接](https://vitepress.dev/guide/extending-default-theme#layout-slots)]。
:::

### 查看效果
&emsp;&emsp;完成以上步骤后，重启博客系统就可以看到效果了。在 Disqus 后台系统还可以配置留言系统的样式及功能，具体功能可以详细探索 Disqus 的后台配置选项。