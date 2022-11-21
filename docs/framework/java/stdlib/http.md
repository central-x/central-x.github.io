# Http 框架
## 概述
&emsp;&emsp;在使用 Spring 开发后端项目的过程中，可能会用到两类技术，同步与异步，对应着 Servlet 与 WebFlux。这是两种截然不同的开发方式，这就导致在项目开发过程中，如果涉及到网络访问的话，就得针对不同的技术体系使用不同的网络访问框加。目前比较流行的是：

- 同步调用：Feign、RestTemplate
- 异步调用：WebClient

&emsp;&emsp;由于不同的网络框架在使用上存在不同的 API、调用逻辑等，为了统一调用方式（洁癖），因此在第三方网络框架的基础上，封装了这个 Http 框架。

&emsp;&emsp;这个 Http 框架的网络访问层通过 HttpExecutor 接口[[链接](https://github.com/central-x/central-framework/blob/master/central-stdlib/src/main/java/central/net/http/HttpExecutor.java)]进行抽象，通过实现不同的 HttpExecutor 完成对第三方网络框架的封装。目前提供了以下第三方网络框架的封装:

- HttpClient(Java 11 内置)：支持同步调用
- OKHttp：支持同步调用
- WebClient：支持响应式调用

&emsp;&emsp;本框架支持通过 Contract 接口[[链接](https://github.com/central-x/central-framework/blob/master/central-stdlib/src/main/java/central/net/http/proxy/Contract.java)]实现了通过注解和动态代理实现了类似远程服务调用的功能。目前 Contract 接口实现了以下封装:

- SpringContract：复用 Spring Web 提供的注解，实现远程调用

> 这个功能参考了 Feign 的实现思路

## 同步调用
&emsp;&emsp;同步网络调用的主要特点，是在发起网络请求之后，需要阻塞当前线程，等待网络交互完毕之后再执行接下来的逻辑。这种调用方式常用于 Servlet 技术体系。

### 基础用法
&emsp;&emsp;基础用法可以通过 HttpClient、HttpRequest、HttpResposne 直接构造准确的 Http 网络请求对象。

```java
    private HttpClient client;

    public void test() throws Throwable {
        // 使用 OkHttp 作为通信框架
        this.client = new HttpClient(OkHttpExecutor.Default());
        // 添加切面处理器
        this.client.addProcessor(new LoggerProcessor());

        // 创建 Request，由于 Request 可能会有 Body，因此建议使用 try 方法来自动关闭请求体
        try (var request = HttpRequest.get(HttpUrl.create("/api/accounts").setQuery("id", "accountId"))) {
            // 添加请求头
            request.addHeaders(headers -> {
                        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
                    })
                    // 添加 Cookie
                    .setCookie("Authorization", "xxx");

            // 执行请求，使用 try 语法确保 response 在使用之后被关闭
            try (var response = this.client.execute(request)) {
                // 获取响应状态码
                var status = response.getStatus();
                // 获取响应头
                var headers = response.getHeaders();
                // 获取响应体
                var body = response.getBody();
                // 将响应体解析成字符串
                var stringBody = body.extract(StringExtractor.of(StandardCharsets.UTF_8));
                // 将响应体（JSON 格式）解析成对象
                var accountBody = body.extract(JsonExtractor.of(TypeReference.of(Account.class)));
                // 将响应体解析成文件(保存到 tmp 目录，并自动从响应头里解析文件名)
                var fileBody = body.extract(FileExtractor.of(new File("./tmp")));
            }
        }
    }
```

### 服务代理用法
&emsp;&emsp;在日常工作中，基础用法显得比较繁琐，因此更多情况下，我们都是使用服务代理的方式进行网络请求。

&emsp;&emsp;使用服务代理的方式调用网络时，需要先声明接口，下面的代码演示了如何使用 Spring Web 提供的注解声明代理接口。

```java
// 全局添加请求路径
@RequestMapping("/api")
public interface ServerApi {

    /**
     * 使用 GET 方法请求 /api/accounts
     *
     * @param id 添加名为 id 的 URL 参数
     * @return 将结果解析为 Account 对象
     */
    @GetMapping("/accounts")
    Account findById(@RequestParam String id);

    /**
     * 使用 POST 方法请求 /api/accounts
     * 要求使用 application/json 格式提交请求体
     *
     * @param params 由于 consumes 指定使用 application/json，因此参数会被序列化为 JSON 并提交到服务器
     */
    @PostMapping(value = "/accounts", consumes = MediaType.APPLICATION_JSON_VALUE)
    Account create(@RequestBody AccountParams params);

    /**
     * 使用 DELETE 方法请求 /api/accounts
     *
     * @param ids 添加名为 ids 的 URL 参数
     * @return 将结果解析为 long 类型
     */
    @DeleteMapping("/accounts")
    long deleteById(@RequestParam List<String> ids);

    /**
     * 使用 POST 方法请求 /api/accounts/avatars
     * 要求使用 multipart/form-data 格式提交请求体
     *
     * @param avatar 名为 avatar 的文件参
     * @param id     名为 id 的参数
     * @return 将结果解析为 Upload 对象
     */
    @PostMapping(value = "/accounts/avatars", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    Upload upload(@RequestPart File avatar, @RequestPart String id);

    /**
     * 使用 GET 方法请求 /api/accounts/avatars
     *
     * @param id 添加名为 id 的 URL 参数
     * @return 将结果解析为文件
     */
    @GetMapping("/accounts/avatars")
    File download(@RequestParam String id);

    /**
     * 使用 GET 方法请求 /api/accounts
     *
     * @param id 添加名为 id 的 URL 参数
     * @return 直接返回 HttpResponse 对象，自行解析响应体（注意要关闭响应）
     */
    @GetMapping("/accounts")
    HttpResponse execute(@RequestParam String id);

    /**
     * 执行指定的请求
     *
     * @param request 自定义请求
     * @return 将结果解析为 Account 对象
     */
    Account execute(HttpRequest request);
}
```

```java
    private ServerApi api;

    public void test() {
        this.api = HttpProxyFactory.builder(JavaExecutor.Default())
                // 指定服务器地址
                .baseUrl("http://127.0.0.1:8080")
                // 指定缓存目录
                .tmp(new File("./.tmp"))
                // 指定使用 Spring 注解
                .contact(new SpringContract())
                // 添加切面处理器
                .processor(new AddHeaderProcessor("X-Forwarded-Proto", "https"))
                .processor(new AddHeaderProcessor("X-Forwarded-Port", "443"))
                // 生成服务代理
                .target(ServerApi.class);
        
        // 通过代理方法调用网络
        var account = this.api.findById("accountId");
    }
```

## 异步调用
&emsp;&emsp;待补充