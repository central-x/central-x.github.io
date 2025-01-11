# 安装群晖
## 概述
&emsp;&emsp;本文档主要记录如何在 ESXi 中安装群晖。

## 环境

- ESXi: 8.0 Update 3
- 群晖版本: DSM 7.2.2-72806 Update 2

## 操作
### 创建虚拟机
&emsp;&emsp;创建虚拟机时，`Guest OS version` 选择 `Other 4.x Linux (64-bit)`。

![](./assets/install-synology_00.png)

&emsp;&emsp;在系统配置中，按以下要求设置虚拟机：

- CPU 设置为 `4`
- 内存设置为 `4G`（或更多）
- 删除所有硬盘
- 删除 `SCSI Controller 0`
- USB Controller 1 可以选择为 `USB 3.1`
- 删除 `CD/DVD Drive 1`。

![](./assets/install-synology_01.png)

&emsp;&emsp;完成以上步骤后，切换到 `VM Options` 选项卡，在 `Boot Options` 中，将 `Firmware` 中设置为 `BIOS`，最后保存虚拟机。

![](./assets/install-synology_02.png)

&emsp;&emsp;最后确认一下虚拟机的配置

![](./assets/install-synology_03.png)

### 下载并转换引导
&emsp;&emsp;在 GitHub 中下载最新版本的群晖引导[[链接](https://github.com/RROrg/rr/releases/)]，下载 `rr-<version>.img.zip` 文件并解压。

&emsp;&emsp;下载 V2V Converter [[链接](https://www.starwindsoftware.com/starwind-v2v-converter)]，安装后打开。

![](./assets/install-synology_04.png)

&emsp;&emsp;选择刚才下载的 `rr-<version>.img/rr.img` 文件

![](./assets/install-synology_05.png)

&emsp;&emsp;选择转换后的镜像存储位置为 `Remote VMware ESXi Server or vCenter`，并保存到刚才我们创建的那个虚拟机中。注意，VMDK image format 选择 `ESXi pre-allocated image`。

![](./assets/install-synology_06.png)

![](./assets/install-synology_07.png)

![](./assets/install-synology_08.png)

![](./assets/install-synology_09.png)

![](./assets/install-synology_10.png)

![](./assets/install-synology_11.png)

### 更新虚拟机配置
&emsp;&emsp;打开虚拟机的配置界面，新增已有硬盘（Existing hard disk），将 `rr.vmkd` 挂载到虚拟机中，注意 `SATA Controller 0` 选择为 `SATA (0:0)`

![](./assets/install-synology_12.png)

&emsp;&emsp;保存虚拟机后，再次打开虚拟机配置界面，新增新标准硬盘（New standard hard disk），名字为 `system.vmdk`，将大小设置为 `128G`，注意 `SATA Controller 0` 选择为 `SATA (0:1)`。

![](./assets/install-synology_12.png)

### 编译引导
&emsp;&emsp;完成以上配置以后，启动虚拟机。

![](./assets/install-synology_12.png)

&emsp;&emsp;虚拟机启动完毕后，可以在控制界面看到引导的访问地址为 `10.10.10.55:7681`。使用浏览器打开该地址。

![](./assets/install-synology_15.png)

&emsp;&emsp;选择设置型号为 `RS1221+`（也可以选择 SA6400 等型号）

![](./assets/install-synology_16.png)

&emsp;&emsp;Product Version 选择 `7.2`，接着选 `7.2.2-72806-0`

![](./assets/install-synology_17.png)

![](./assets/install-synology_18.png)

&emsp;&emsp;最后选择 `Build the loader`。

![](./assets/install-synology_19.png)

![](./assets/install-synology_20.png)

&emsp;&emsp;等待引导编译完成后，启动引导。

![](./assets/install-synology_21.png)

### 安装系统
&emsp;&emsp;在群晖官网下载系统[[链接](https://www.synology.cn/zh-cn/support/download)]。在下载页面中，选择产品类型为 `NAS`，型号为刚才编译引导时选择的 `RS1221+`，下载该型号的 DSM 系统，得到 `DSM_RS1221+_72806.pat` 文件。

![](./assets/install-synology_22.png)

&emsp;&emsp;访问 `10.10.10.55:5000`。

![](./assets/install-synology_23.png)

&emsp;&emsp;选择刚才下载的 DSM 系统文件 `DSM_RS1221+_72806.pat`，选择下一步。

![](./assets/install-synology_24.png)

&emsp;&emsp;等待系统固件安装完成后，会自动重启

![](./assets/install-synology_25.png)

![](./assets/install-synology_26.png)

&emsp;&emsp;创建系统管理员。

![](./assets/install-synology_27.png)

&emsp;&emsp;选择手动更新系统（相当于关闭自动更新）

![](./assets/install-synology_28.png)

&emsp;&emsp;由于我们没有正版的群晖帐号，这一步选跳过。

![](./assets/install-synology_29.png)

&emsp;&emsp;不上报设备分析信息给群晖。

![](./assets/install-synology_30.png)

&emsp;&emsp;完成系统安装。

![](./assets/install-synology_31.png)

&emsp;&emsp;Enjoy!