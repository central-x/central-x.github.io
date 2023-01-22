# Job
## 概述

## Job
&emsp;&emsp;定义一个执行一次的任务。

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-job
spec:
  completions: 5 # 这项任务必须确保一个 pod 成功完成
  parallelism: 2 # 最多 2 个 pod 可以并行运行
  activeDeadlineSeconds: 300 # 300 秒没执行完毕则系统堂试终止，并将 Job 标记为失败
  template:
    metadata:
      labels:
        app: batch-job
    spec:
      restartPolicy: OnFailure # 任务重启条件
      containers:
      - name: main
        image: luksa/batch-job
```

```bash
$ kubectl get job

```

## CornJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: batch-job
spec:
  schedule: "0,15,30,45 * * * *" # 每隔 15 分钟运行
  jobTemplate:
    metadata:
      labels:
        app: batch-job
    spec:
      restartPolicy: OnFailure # 任务重启条件
      containers:
      - name: main
        image: luksa/batch-job
```