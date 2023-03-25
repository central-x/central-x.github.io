# ConfigMap 和 Secret
## 概述
&emsp;&emsp;几乎所有应用都需要配置信息，并且这些配置数据不庆该被嵌入应用本身。一般情况下，传递配转走选项给容器化应用程序的方法是借助环境变量或配置文件。在 Kubernetes 中，用于存储配置数据的资源称为 ConfigMap。如果需要给容器传递一些敏感数据，则可以使用 Secret。

&emsp;&emsp;Kubernetes 通过仅仅将 Secret 分发到需要访问 Secret 的 Pod 所在的机器节点来保障其安全性。另外，Secret 只会存储在节点的内存中，永不写入物理存储，这样从节点上删除 Secret 时就不需要擦除磁盘了。

&emsp;&emsp;无论是否使用 ConfigMap、Secret 存储配置数据，以下方法均可被用作配置你的应用程序：

- 向容器传递命令行参数
- 为每个容器设置自定义环境变量
- 通过特殊类型的卷将配置文件挂载到容器中

## 配置容器
### 通过命令行参数向容器传递配置
&emsp;&emsp;在 Pod 声明时，可以通过以下方式覆盖容器的启动方法，从而达到通过命令行参数向容器传递配置。

```yaml
kind: Pod
spec:
  containers:
  - image: some/image
    command: ["/bin/command"]
    args: ["arg1", "arg2", "arg3" ]
```

### 通过环境变量向容器传递配置
&emsp;&emsp;在 Pod 声明中，通过以下方式为容器手动添加环境变量。Pod 通过读取环境变量即可完成外部控制容器的目标。

```yaml
kink: Pod
spec:
  containers:
  - image: luksa/fortune:env
    env:
    - name: INTERVAL
      value: "30"
    name: html-generator
...
```

&emsp;&emsp;在环境变量中还可以引用其他环境变量

```yaml
env:
- name: FIRST_VAR
  value: "foo"
- name: SECOND_VAR
  value: "$(FIRST_VAR)bar"
```

## ConfigMap
### 创建 ConfigMap
&emsp;&emsp;从简单的字面量条目创建 ConfigMap。

```yaml
# 通过指令创建 ConfigMap
# ConfigMap 中的键名必须是一个合法的 DNS 子域，仅包含数字、字母、破折号、下画划以及圆点
$ kubectl create configmap fortune-config --from-literal=sleep-interval=25 --from-literal=foo=bar --from-literal=bar=baz

# 查看 ConfigMap 定义
$ kubectl get configmap fortune-config -o yaml
```

&emsp;&emsp;从配置文件创建 ConfigMap。

```yaml
# 通过文件创建配置
$ kubectl create configmap my-config --from-file=customkey=config-file.conf

# 还可以直接引入某一文件夹中的所有文件
$ kubectl create configmap my-config --fromfile=/path/to/dir
```

### 给容器传递 ConfigMap 条目作为环境变量
&emsp;&emsp;在 Pod 的声明中，通过 `valueFrom` 引用 ConfigMap 里面的值。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fortune-env-from-configmap
spec:
  containers:
  - image: luksa/fortune:env
    env:
    - name: INTERVAL
      valueFrom:
        configMapKeyRef:
          name: fortune-config
          key: sleep-interval
...
```

&emsp;&emsp;可以通过 `evnFrom` 一次性传递 ConfigMap 的所有条目作为环境变量。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fortune-env-from-configmap
spec:
  containers:
  - image: some-image
    envFrom:
    - prefix: CONFIG_         # 所有引入的环境变量均包含前缀 CONFIG_
      configMapRef:           # 引用名为 my-config-map 的 ConfigMap
        name: my-config-map
```

### 传递 ConfigMap 的条目作为命令行参数

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fortune-args-from-configmap
spec:
  containers:
  - image: luksa/fortune:args
    env:
    - name: INTERVAL
      valueFrom:
        configMapKeyRef:
          name: fortune-config
          key: sleep-interval
    args: ["$(INTERVAL)"]
```

### 使用 ConfigMap 卷将条目暴露为文件
&emsp;&emsp;环境变量或者命令行参数值作为配置值通常用于变量值较短的场景。由于 ConfigMap 中可以包含完整的配置文件内容，当你想要将其暴露给容器时，可以借助前面章节提到过的一种称为 configMap 卷的特殊卷格式。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fortune-configmap-volume
spec:
  containers:
  - image: nginx:alpine
    name: web-server
    volumeMounts:
    - name: config
      mountPath: /etc/nginx/conf.d   # 挂载 configMap 卷至这个位置
      readOnly: true
  volumes:
  - name: config
    configMap:
      name: fortune-config           # 卷定义引用 fortune-config ConfigMap
      defaultMode: "6600"            # 设置所有文件的权限为 -rw-rw--
```

```bash
# 查看 /etc/nginx/conf.d 下的内容，可以看到 ConfigMap 下两个条目都被暴露成文件
$ kubectl exec fortune-configmap-volume -c web-service ls /etc/nginx/conf.d
my-nginx-config.conf
sleep-interval
```

```yaml
volumes:
- name: config
  configMap:
    name: fortune-config
    items:
    - key: my-nginx-config.conf       # 该键对应的条目被包含
      path: gzip.conf                 # 条目的值被存储在该文件中
```

```yaml
spec:
  containers:
  - image: some/image
    volumeMounts:
    - name: myvolume
      mountPath: /etc/someconfig.conf   # 挂载至某一文件，而不是文件夹
      subPath: myconfig.conf            # 仅挂载指定的条目 myconfig.conf，并非完整的卷
```

## Secret
### 创建 Secret
&emsp;&emsp;

```yaml
apiVersion: v1
kind: Secret
stringData:
  foo: plain text
data:
  https.cert: xxxxx
  https.key: yyyyy
```

### 挂载 Secret
&emsp;&emsp;

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fortune-https
sepc:
  containers:
  - image: luksa/fortune:env
    name: html-generator
    env:
    - name: INTERVAl
      valueFrom:
        configMapKeyRef:
          name: fortune-config
          key: sleep-interval
    - name: FOO_SECRET                  # 通过 Secret 条目设置环境
      valueFrom:
        secretKeyRef:
          name: fortune-https           # Secret 的键
          key: foo                      # Secret 的名称
    volumnMounts:
    - name: html
      mountPath: /var/htdocs
  - image: nginx:alpine
    name: web-server
    volumeMounts:
    - name: html
      mountPath: /usr/share/nginx/html
      readOnly: true
    - name: config
      mountPath: /etc/nginx/conf.d
      readOnly: true
    - name: certs                      # 配置 Nginx 从 /etc/nginx/certs 中读取证书和密钥文件，需将 secret 卷挂载于此
      mountPath: /etc/nginx/certs
      readOnly: true
    ports:
    - containerPort: 80
    - containerPort: 443
  volumes:
  - name: html
    emptyDir: {}
  - name: config
    configMap:
      name: fortune-config
      items:
      - key: my-nginx-config.conf
        path: https.conf
  - name: certs                       # 引用 fortune-https Secret 来定义 secret 卷
    secret:
      secretName: fortune-https
```