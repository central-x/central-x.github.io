# 搭建 Python 环境
## 概述
&emsp;&emsp;由于要搭建 ChatGLM，因此要搭建 Python 环境。在搭建 Python 的过程中，发现了一些坑。这里记录一下搭建 Python3 的过程。

&emsp;&emsp;CentOS7 自带 python2.7，这里以共存的方式搭建 Python3。经测试，CentOS 7 安装 3.9.x 版本问题不大，安装 3.10.x 版本时，使用 pip3 安装依赖会出现 SSL 问题。

## 安装步骤

```bash
# 安装 Python 环境（）
$ yum install -y python3-devel python3-pip

$ python3 --version
Python 3.7.9

$ pip3 --version
pip 20.2.2 from /usr/lib/python3.7/site-packages/pip (python 3.7)

# 安装编译工具、内核源
$ yum install -y gcc make kernel-devel-$(uname -r)

# 安装 Nvdia 驱动和 CUDA
$ sh cuda_12.2.1_535.86.10_linux.run
===========
= Summary =
===========

Driver:   Installed
Toolkit:  Installed in /usr/local/cuda-12.2/

Please make sure that
 -   PATH includes /usr/local/cuda-12.2/bin
 -   LD_LIBRARY_PATH includes /usr/local/cuda-12.2/lib64, or, add /usr/local/cuda-12.2/lib64 to /etc/ld.so.conf and run ldconfig as root

To uninstall the CUDA Toolkit, run cuda-uninstaller in /usr/local/cuda-12.2/bin
To uninstall the NVIDIA Driver, run nvidia-uninstall
Logfile is /var/log/cuda-installer.log

$ nano ~/.bash_profile

PATH=$PATH:/usr/local/cuda-11.8/bin
LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/cuda-11.8/lib64


# 查看 cuda 版本
$ nvcc -V
nvcc: NVIDIA (R) Cuda compiler driver
Copyright (c) 2005-2023 NVIDIA Corporation
Built on Tue_Jul_11_02:20:44_PDT_2023
Cuda compilation tools, release 12.2, V12.2.128
Build cuda_12.2.r12.2/compiler.33053471_0

# 硬件列表
$ lspci -k | grep -iEA3 'VGA|3D'
00:0f.0 VGA compatible controller: VMware SVGA II Adapter
	Subsystem: VMware SVGA II Adapter
	Kernel driver in use: vmwgfx
	Kernel modules: vmwgfx
00:10.0 SCSI storage controller: Broadcom / LSI 53c1030 PCI-X Fusion-MPT Dual Ultra320 SCSI (rev 01)
--
03:00.0 VGA compatible controller: NVIDIA Corporation Device 2684 (rev a1)
	DeviceName: pciPassthru0
	Subsystem: NVIDIA Corporation Device 167c
	Kernel driver in use: nvidia

# 查看显卡信息
$ nvidia-smi

# 修改环境变量
$ nano ~/.bash_profile

# nvdia
PATH=$PATH:/usr/local/cuda-12.1/bin
LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/cuda-12.1/lib64

# 安装编译、运行 Python3 的依赖
$ yum install -y wget make gcc gcc-c++ zlib* openssl* libffi-devel

# 创建 Python 的编译目录
$ mkdir /usr/local/python3 && cd /usr/local/python3

# 下载 Python 源代码进行编译安装
$ wget https://www.python.org/ftp/python/3.9.17/Python-3.9.17.tgz

# 解压
$ tar -xvf Python-3.9.17.tgz

# 编译
$ cd Python-3.9.17 && ./configure --prefix=/usr/local/python3 && make && make install

# 编译成功后，链接 python3 的可执行文件
# 后续可以使用 python3、pip3 来执行 python 3 的环境 
# 使用 python 和 pip 来执行 python 2 的程序
$ ln -s /usr/local/python3/bin/python3 /usr/bin/python3
$ ln -s /usr/local/python3/bin/pip3 /usr/bin/pip3
```