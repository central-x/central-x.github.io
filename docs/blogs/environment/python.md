# Python
## 概述
&emsp;&emsp;Python 是深度学习的首选开发语言，很多第三方提供了集成大量科学技术类库的 Python 标准安装包。由于 Python 是一个脚本语言，如果不使用包管理器的话，那么安装第三方库会比较麻烦。

&emsp;&emsp;Anaconda 是一个免费开源的 Python 分发，它包含了 Python 标准库和一些第三方库。它支持 Linux、Mac OS 和 Windows 平台。使用 Anaconda 可以方便地创建安装和管理 Python 环境。

&emsp;&emsp;本文档主要记录如何使用 Anaconda 搭建与管理 Python 环境。

## 步骤
### 安装 Anaconda
&emsp;&emsp;访问 Anaconda 的官网[[链接](https://www.anaconda.com/download#downloads)]，下载对应的操作系统版本的安装包。

```bash
# 下载安装文件
$ wget https://repo.anaconda.com/archive/Anaconda3-2023.09-0-Linux-x86_64.sh

# 安装 Anaconda3
# 安装时需要同意协议，协议非常长，且无法跳过
# 安装路径默认放在 /home/<username>/anaconda3 目录下
# 注意，不要使用 sudo 来安装 Anaconda3
$ sh ./Anaconda3-2023.09-0-Linux-x86_64.sh

# 提示以下内容时，输入 yes，表示 shell 在启动时自动激活 conda
...
installation finished.
Do you wish to update your shell profile to automatically initialize conda?
This will activate conda on startup and change the command prompt when activated.
If you'd prefer that conda's base environment not be activated on startup,
   run the following command when conda is activated:

conda config --set auto_activate_base false

You can undo this by running `conda init --reverse $SHELL`? [yes|no]
[no] >>> yes
no change     /home/ubuntu/anaconda3/condabin/conda
no change     /home/ubuntu/anaconda3/bin/conda
no change     /home/ubuntu/anaconda3/bin/conda-env
no change     /home/ubuntu/anaconda3/bin/activate
no change     /home/ubuntu/anaconda3/bin/deactivate
no change     /home/ubuntu/anaconda3/etc/profile.d/conda.sh
no change     /home/ubuntu/anaconda3/etc/fish/conf.d/conda.fish
no change     /home/ubuntu/anaconda3/shell/condabin/Conda.psm1
no change     /home/ubuntu/anaconda3/shell/condabin/conda-hook.ps1
no change     /home/ubuntu/anaconda3/lib/python3.11/site-packages/xontrib/conda.xsh
no change     /home/ubuntu/anaconda3/etc/profile.d/conda.csh
modified      /home/ubuntu/.bashrc

==> For changes to take effect, close and re-open your current shell. <==

Thank you for installing Anaconda3!
```

&emsp;&emsp;完成 Anaconda3 的安装之后，需要另起一个 Terminal 窗口。启动后可以发现命令最前面显示了当前环境名称：

```bash
# 验证环境
(base) $ conda --version
conda 23.7.4
```

### 创建环境
&emsp;&emsp;Anaconda 支持创建独立的、隔离的环境，通过切换环境可以管理不同版本的 Python 和各种包，这样就可以在不同的项目间切换而不需要担心版本冲突或依赖问题。通过以下命令创建 Conda 环境：

```bash
# 创建环境
(base) $ conda create --name=<env_name> python=<python_version>

# 以下命令就可以完成 Python 3.9 环境的搭建
# 以下提示只摘取了部份内容
(base) $ conda create --name=glm python=3.9
...
The following packages will be downloaded:

    package                    |            build
    ---------------------------|-----------------
    ca-certificates-2023.12.12 |       h06a4308_0         126 KB
    openssl-3.0.13             |       h7f8727e_0         5.2 MB
    pip-23.3.1                 |   py39h06a4308_0         2.6 MB
    python-3.9.18              |       h955ad1f_0        25.1 MB
    setuptools-68.2.2          |   py39h06a4308_0         948 KB
    tzdata-2023d               |       h04d1e81_0         117 KB
    wheel-0.41.2               |   py39h06a4308_0         108 KB
    xz-5.4.5                   |       h5eee18b_0         646 KB
    ------------------------------------------------------------
                                           Total:        34.8 MB

The following NEW packages will be INSTALLED:

  _libgcc_mutex      pkgs/main/linux-64::_libgcc_mutex-0.1-main 
  _openmp_mutex      pkgs/main/linux-64::_openmp_mutex-5.1-1_gnu 
  ca-certificates    pkgs/main/linux-64::ca-certificates-2023.12.12-h06a4308_0 
  ld_impl_linux-64   pkgs/main/linux-64::ld_impl_linux-64-2.38-h1181459_1 
  libffi             pkgs/main/linux-64::libffi-3.4.4-h6a678d5_0 
  libgcc-ng          pkgs/main/linux-64::libgcc-ng-11.2.0-h1234567_1 
  libgomp            pkgs/main/linux-64::libgomp-11.2.0-h1234567_1 
  libstdcxx-ng       pkgs/main/linux-64::libstdcxx-ng-11.2.0-h1234567_1 
  ncurses            pkgs/main/linux-64::ncurses-6.4-h6a678d5_0 
  openssl            pkgs/main/linux-64::openssl-3.0.13-h7f8727e_0 
  pip                pkgs/main/linux-64::pip-23.3.1-py39h06a4308_0 
  python             pkgs/main/linux-64::python-3.9.18-h955ad1f_0 
  readline           pkgs/main/linux-64::readline-8.2-h5eee18b_0 
  setuptools         pkgs/main/linux-64::setuptools-68.2.2-py39h06a4308_0 
  sqlite             pkgs/main/linux-64::sqlite-3.41.2-h5eee18b_0 
  tk                 pkgs/main/linux-64::tk-8.6.12-h1ccaba5_0 
  tzdata             pkgs/main/noarch::tzdata-2023d-h04d1e81_0 
  wheel              pkgs/main/linux-64::wheel-0.41.2-py39h06a4308_0 
  xz                 pkgs/main/linux-64::xz-5.4.5-h5eee18b_0 
  zlib               pkgs/main/linux-64::zlib-1.2.13-h5eee18b_0 


Proceed ([y]/n)? y
```

### 查看所有环境
&emsp;&emsp;通过以下命令，可以查看当前已创建的所有环境清单：

```bash
(base) $ conda env list
# conda environments:
#
base                  *  /home/ubuntu/anaconda3
glm                      /home/ubuntu/anaconda3/envs/glm
```

### 切换环境
&emsp;&emsp;每次启动终端时，Anaconda 会自动切换到 `base` 环境，通过以下命令可以切换到不同的环境。 

```bash
# 切换到指定的环境
(base) $ conda activate <env_name>

# 查看切换前 Python 版本信息
(base) $ python --version
Python 3.11.5

# 切换到上一步创建的 glm 环境
(base) $ conda activate glm

# 命令前面的环境名称已切换为 glm，查看切换后 Python 版本信息
(glm) $ python --version
Python 3.9.18
```

### 安装包
&emsp;&emsp;在当前环境下，可以使用 conda 或 pip 安装所需的 Python 包，这个包只影响当前环境：

```bash
$ conda install <package>
$ pip install <package>
```

### 删除环境
&emsp;&emsp;如果一个环境不再需要，可以使用以下命令删除：

```bash
$ conda remove --name <env_name> --all

# 删除 glm 环境
$ conda remove --name glm --all
```