# PyTorch
## 概述
&emsp;&emsp;PyTorch 是一个 Python 开源机器学习库，它可以提供强大的 GPU 加速张量运算和动态计算图，方便用户进行快速实验和开发。

&emsp;&emsp;自 PyTorch 发布以来，一直都是深度学习和人工智能领域中最为受欢迎的机器学习库之一。

&emsp;&emsp;本文档主要记录如何安装 PyTorch 环境。

## 环境

- Ubuntu: 20.04.3
- conda: 23.7.4
- Python: 3.9.18
- cuda: 12.3.2

::: tip 提示
&emsp;&emsp;TyTorch 需要依赖 Python 环境，为了方便在不同环境下切换库，建议使用 Anaconda 搭建 Python 环境，详情请查看另一篇文档[[链接](/blogs/environment/python)]。
:::

## 步骤
### 安装
&emsp;&emsp;访问 PyTorch 官网[[链接](https://pytorch.org/get-started/locally/)]，根据系统的情况选择对应的版本安装。

```bash
$ conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia
```

::: tip 提示
1. 本文档在编写时，PyTorch 的版本号为 2.2.0。
2. 注意提前使用 conda 切换到指定的 Python 环境，否则 PyTorch 将会被安装到 base 环境里。
:::

### 验证
&emsp;&emsp;在命令窗中，输入 `python`，并在 Python 环境中输入以下命令，验证是否安装成功：

```bash
# 进入 Python 环境
$ python
Python 3.9.18 (main, Sep 11 2023, 13:41:44)
[GCC 11.2.0] :: Anaconda, Inc. on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> import torch
>>> result = torch.tensor(1) + torch.tensor(2.0)
>>> result
tensor(3.)
>>>
```