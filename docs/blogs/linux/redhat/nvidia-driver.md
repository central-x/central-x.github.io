# Nvidia 驱动
## 概述
&emsp;&emsp;本文档主要记录一下在 CentOS 7 下安装 Nvidia 驱动。

## 环境

- 操作系统：CentOS 7.4（无界面，最小安装）
- ESXi： 8.0 Update 2
- 显卡：NVIDIA GeForce RTX 4090
- 驱动版本：550.120[[下载地址](https://www.nvidia.com/en-us/drivers/details/232672/)]

::: danger 提示
&emsp;&emsp;在 ESXi 的虚拟机里安装 Nvidia 驱动，需确保`已关闭`虚拟机配置`引导选项`里的 `启用 UEFI 安全引导`，否则可能会出现正常安装驱动后，但无法找到显卡的问题。详细操作请参考 GPU 直通文档[[链接](/blogs/vmware/esxi/gpu-pass-through)]。
:::

## 操作
### 更新依赖
&emsp;&emsp;打开终端（Terminal），更新系统依赖。

```bash
$ yum update -y
```

### 更新系统配置
&emsp;&emsp;禁用 `Nouveau` 驱动。Nouveau 驱动是 CentOS 默认的开源显卡驱动程序，需要禁用它以避免与 NVIDIA 官方驱动冲突。

```bash
# 编译 grub 文件
$ vi /etc/default/grub

# 找到 GRUB_CMDLINE_LINUX 这一行，并在其后添加 rd.driver.blacklist=nouveau
GRUB_CMDLINE_LINUX="crashkernel=auto rd.lvm.lv=centos/root rd.lvm.lv=centos/swap rhgb quiet rd.driver.blacklist=nouveau"

# 更新 grub 配置
$ grub2-mkconfig -o /boot/grub2/grub.cfg

# 重启系统
$ reboot
```

&emsp;&emsp;安装依赖项

```bash
$ yum install kernel-devel kernel-headers gcc make
```

### 安装驱动
&emsp;&emsp;下载完驱动后，将驱动文件上传到服务器。添加可执行权限并运行：

```bash
$ chmod +x NVIDIA-Linux-x86_64-550.120.run

# 以无交互的方式安装驱动
# 注意，必须添加 -m=kernel-open 参数，用于指定 NVIDIA 安装程序以开放式内核模式运行。
# 在这种模式下，安装程序将尝试编译和安装适用于当前 Linux 内核版本的内核模块。这通常用于在系统中使用自定义或非常规的内核版本。
# 如果不添加此参数，安装完后使用 nvidia-smi 验证时会提示 No devices were found 错误
$ ./NVIDIA-Linux-x86_64-550.120.run -silent --no-x-check --no-nouveau-check --install-libglvnd -m=kernel-open

# 安装完毕后验证驱动
$ nvidia-smi
Thu Oct 16 22:47:02 2024       
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.120                Driver Version: 550.120        CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  NVIDIA GeForce RTX 4090        Off |   00000000:13:00.0 Off |                  Off |
| 30%   49C    P0             60W /  450W |       1MiB /  24564MiB |      3%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+
                                                                                         
+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|  No running processes found                                                             |
+-----------------------------------------------------------------------------------------+
```