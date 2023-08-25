# 分区
## 概述
&emsp;&emsp;挂载一块新磁盘后，首先需要为磁盘建立分区。划分分区一方面可以有效地对数据进行保护与分类存储，另一方面可以有效地对数据进行保护。

> &emsp;&emsp;比如 Windows 一般会将 C 盘和 D 盘分开，后续如果系统坏了想要重装时，即使格式化 C 盘，也不会影响存放在 D 盘的数据。

## 磁盘分区表
&emsp;&emsp;目前，市面上主要流行 MBR 分区和 GPT 分区，目前比较新的系统基本都支持或仅支持 GPT 分区，因此新系统一般可以直接选择使用 GPT 分区即可。由于 MBR 分区的一些限制，目前 MBR 分区处于淘汰阶段。

&emsp;&emsp;更多关于 MBR 分区和 GPT 分区的区别，请查看相关文章[[链接](https://zhuanlan.zhihu.com/p/26098509?utm_medium=social)]。

### MBR 分区表
&emsp;&emsp;MBR 分区分为以下几种类型：

- **主分区（primary）**
    1. 系统中必须要存在的分区，操作系统选择主分区安装
    2. 主分区一般最多 4 个，最少 1 个
- **扩展分区（extend）**
    1. 占用主分区编号，主分区 + 扩展分区之和最多 4 个
    2. 有独立的分区表，不能独立存在，也就是不能独立存放数据
    3. 必须要在扩展分区上建立逻辑分区才能存放数据
- **逻辑分区（logic）**
    1. 存放于扩展分区之上
    2. 存放任意普通数据

&emsp;&emsp;磁盘分区时，注意以下要点：

1. 主分区要求大于等于 1 个，主分区和扩展分区之和最多 4 个；
2. 可以没有扩展分区；
3. 每个分区最大支持 2T；
4. 一个磁盘如果分区分完了，但是还是有剩余的空间，那么这些空间就会被浪费掉。

### GPT 分区表
&emsp;&emsp;GPT 分区比较简单，基乎没什么限制，只需要注意以下几点：

- 分区数量几乎没有限制，不过目前 Windows 仅支持最大 128 个分区；
- 分区可管理的硬盘容量小于 18EB（1EB = 1024PB = 1024<sup>2</sup>TB）；
- Windows XP 系统无法识别 GPT 磁盘，Windows 7 及以上的系统可以任意读写 GPT 磁盘；
- GPT 磁盘只能安装 Windows 8 及以上版本的操作系统；
- GPT 磁盘只有在支持 UEFI 引导的主板才能安装操作系统（必须是 64 位的系统），启动模式必须从 BIOS 调整为 UEFI。

### 常见分区方案

**方案1：针对网站集群架构中的某个节点服务器分区：**

单磁盘（100G）存储：

- /boot: 启动分区，设置为 512 ~ 1024MB
- swap: 交换分区，物理内存的 1.5 倍，当内存大于 8G 时，分配 8 ~ 16GB 即可（使用 kubernetes 或 docker 部署应用时，一般禁用交换分区）
- /: 根目录，剩余空间大小（/usr、/home、/var 等目录）

**方案2：针对数据库及存储的服务器分区，该服务器包含大量重要数据信息：**

双磁盘存储：

- 主磁盘（100G）：
    - /boot: 启动分区，设置为 512 ~ 1024MB
    - swap: 交换分区，物理内存的 1.5 倍，当内存大于 8G 时，分配 8 ~ 16GB 即可（使用 kubernetes 或 docker 部署应用时，一般禁用交换分区）
    - /: 根目录，剩余空间大小（/usr、/home、/var 等目录）
- 数据磁盘（根据需求）
    - /data: 数据目录，剩余磁盘的空间大小（或独立磁盘），存放数据库及存储文件等重要数据

## 操作分区

### 查看分区
&emsp;&emsp;通过 `fdisk -l` 命令可以查看当前操作系统所有磁盘，以及每个磁盘的分区情况：

```bash
$ fdisk -l

磁盘 /dev/sda：21.5 GB, 21474836480 字节，41943040 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：dos
磁盘标识符：0x0009e05d

   设备 Boot      Start         End      Blocks   Id  System
/dev/sda1   *        2048     2099199     1048576   83  Linux
/dev/sda2         2099200    41943039    19921920   8e  Linux LVM

磁盘 /dev/sdb：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节


磁盘 /dev/mapper/centos_lvm-root：18.2 GB, 18249416704 字节，35643392 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节


磁盘 /dev/mapper/centos_lvm-swap：2147 MB, 2147483648 字节，4194304 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
```

&emsp;&emsp;上面的命令列出了 `/dev/sda` 和 `/dev/sdb` 两个物理磁盘的信息：

- `/dev/sda` 磁盘目前有两个分区（`/dev/sda1` 和 `/dev/sda2`），通过 `磁盘标签类型`，可能得知该磁盘使用 MBR 来管理分区;
- `/dev/sdb` 磁盘目前没有分区信息。

### 操作分区
&emsp;&emsp;通过 `fdisk /dev/${device}` 命令，可以修改磁盘的分区信息：

```bash
$ fdisk /dev/sdb
欢迎使用 fdisk (util-linux 2.23.2)。

更改将停留在内存中，直到您决定将更改写入磁盘。
使用写入命令前请三思。

Device does not contain a recognized partition table
使用磁盘标识符 0x7de7a45a 创建新的 DOS 磁盘标签。

命令(输入 m 获取帮助)：m
命令操作
   a   toggle a bootable flag
   b   edit bsd disklabel
   c   toggle the dos compatibility flag
   d   delete a partition
   g   create a new empty GPT partition table
   G   create an IRIX (SGI) partition table
   l   list known partition types
   m   print this menu
   n   add a new partition
   o   create a new empty DOS partition table
   p   print the partition table
   q   quit without saving changes
   s   create a new empty Sun disklabel
   t   change a partition's system id
   u   change display/entry units
   v   verify the partition table
   w   write table to disk and exit
   x   extra functionality (experts only)
```

&emsp;&emsp;输入 `m` 指令后，列出 `fdisk` 支持的命令清单，常用命令如下:

- `g`: 在磁盘中创建一个空的 GPT 分区表，供后续新增分区信息；
- `o`: 在磁盘中创建一个空的 MBR 分区表，供后续新增分区信息；
- `n`: 在当前磁盘的分区表中添加一个新的分区；
- `d`: 删除当前磁盘分区表中指定的分区；
- `p`: 打印当前分区表信息（如果编辑过分区表，则当前分区表是未生效的分区表）；
- `q`: 退出 `fdisk` 命令，撤消当前所有操作；
- `w`: 退出 `fdisk` 命令，并所有操作写入磁盘。

```bash
$ fdisk /dev/sdb
欢迎使用 fdisk (util-linux 2.23.2)。

更改将停留在内存中，直到您决定将更改写入磁盘。
使用写入命令前请三思。

Device does not contain a recognized partition table
使用磁盘标识符 0x7de7a45a 创建新的 DOS 磁盘标签。

# 查看当前磁盘的分区表信息
# 由于当前磁盘是个新磁盘，所以 fdisk 工具自动为其创建了 MBR 分区表
命令(输入 m 获取帮助)：p

磁盘 /dev/sdb：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：dos
磁盘标识符：0x7de7a45a

   设备 Boot      Start         End      Blocks   Id  System

# 创建空的 GPT 分区表，覆盖 fdisk 自动创建的 MBR 分区表
命令(输入 m 获取帮助)：g
Building a new GPT disklabel (GUID: 2450A29C-C7B6-4178-A665-924D9E9A8347)

# 查看当前磁盘分区表信息
# 当前磁盘的分区表已经被修改为 GPT 分区表，当前分区表没有分区信息
命令(输入 m 获取帮助)：p

磁盘 /dev/sdb：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：gpt
Disk identifier: 2450A29C-C7B6-4178-A665-924D9E9A8347

# 添加一个新的分区，直接将当前磁盘所有容量划分到第 1 分区中
命令(输入 m 获取帮助)：n
分区号 (1-128，默认 1)：# 接受默认值，直接回车
第一个扇区 (2048-20971486，默认 2048)：# 接受默认值，直接回车
Last sector, +sectors or +size{K,M,G,T,P} (2048-20971486，默认 20971486)：# 接受默认值，直接回车
已创建分区 1

# 查看当前磁盘分区表信息
# 当前磁盘存在着一个 10G 大小的分区信息
命令(输入 m 获取帮助)：p

磁盘 /dev/sdb：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：gpt
Disk identifier: 2450A29C-C7B6-4178-A665-924D9E9A8347


#         Start          End    Size  Type            Name
 1         2048     20971486     10G  Linux filesyste 

# 将当前修改的内容写入磁盘并退出 fdisk 命令
命令(输入 m 获取帮助)：w
The partition table has been altered!

Calling ioctl() to re-read partition table.
正在同步磁盘。
```