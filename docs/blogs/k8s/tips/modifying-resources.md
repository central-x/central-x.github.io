# 修改资源的方式
&emsp;&emsp;Kubernetes 支持以下多种试去修改资源，每种方式的主要区别如下:

| 方法              | 作用                                                                                                                                                                             |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| kubectl edit      | 使用默认编辑器打开资源配置。修改保存并退出编辑器，资源对象会被更新。<br/>`kubectl edit deployment kubia`                                                                              |
| kubectl path      | 修改单个资源属性。<br>`kubectl patch deployment kubia -p '{"spec": {"template": {"spec"L {"containers": [{"name": "nodejs", "image": "luksa/kubia:v2"}]}}}}'`                       |
| kubectl apply     | 通过一个完整的 YAML 或 JSON 文件，应用其中新的值来修改对象。如果 YAML/JSON 中指定的对象不存在，则会被创建。该文件需要包含资源的完整定义。<br>`kubectl apply -f kubia-deployment-v2.yaml` |
| kubectl replace   | 将原有对象替换为 YAML/JSON 文件中定义的新对象。与 apply 命令相反，运行这个命令前要求对象必须存在，否则打印错误。<bt/>`kubectl replace -f kubia-deployment-v2.yaml`                     |
| kubectl set image | 修改 Pod、ReplicationController、ReplicaSet、Deployment、DemonSet、Job 内的镜像。<br/>`kubectl set image deployment kubia nodejs=luksa/kubia:v2`                                         |

