# 文件存储
## 概述
&emsp;&emsp;在 Linux 中，有多种方式可以用于文件存储。在不同的场景下，应选用不同的存储方式。这里记录一下一些常用的存储方式

&emsp;&emsp;以下命令在 CentOS 7 下运行、测试。

## 分区
&emsp;&emsp;挂载一块新磁盘后，首先需要为磁盘建立分区。划分分区一方面可以有效地对数据进行保护与分类存储，另一方面可以有效地对数据进行保护。

### 分区类型
&emsp;&emsp;目前，市面上主要流行 MBR 分区格式和 GPT 分区格式，目前比较新的系统基本都支持（或仅支持）GPT 分区格式，因此新系统一般可以直接选择使用 GPT 分区格式即可。由于 MBR 的一些限制，目前 MBR 处于淘汰阶段。

&emsp;&emsp;更多关于 MBR 分区和 GPT 分区的区别，请查看相关文章[[链接](https://zhuanlan.zhihu.com/p/26098509?utm_medium=social)]。

### 分区类型
分区分为以下几种类型：

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

1. 主分区要求大于等于 1 个，小于等于 4 个；
2. 可以没有扩展分区；
3. 一个磁盘如果分区分完了，但是还是有剩余的空间，那么这些空间就会被浪费掉。

### 常见分区方案

**方案1：针对网站集群架构中的某个节点服务器分区：**

- /boot: 启动分区，设置为 512 ~ 1024MB
- swap: 交换分区，物理内存的 1.5 倍，当内存大于 8G 时，分配 8 ~ 16GB 即可（使用 kubernetes 或 docker 部署应用时，一般禁用交换分区）
- /: 根目录，剩余空间大小（/usr、/home、/var 等目录）

**方案2：针对数据库及存储的服务器分区，该服务器包含大量重要数据信息：**

- /boot: 启动分区，设置为 512 ~ 1024MB
- swap: 交换分区，物理内存的 1.5 倍，当内存大于 8G 时，分配 8 ~ 16GB 即可（使用 kubernetes 或 docker 部署应用时，一般禁用交换分区）
- /: 根目录，大小设置为 50 ~ 200GB，只存放系统相关的文件；
- /data: 数据目录，剩余磁盘的空间大小（或独立磁盘），存放数据库及存储文件等重要数据

&emsp;&emsp;在 Linux 中，操作分区主要用到的工具是 `fdisk`。

```bash
# 列出分区表
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

# 建立分区
$ fdisk /dev/sdb

# 然后依次输入
$ n（新建分区表）
$ p（主分区类型，后续三个直接回车，使用默认选项）
$ w（保存分区信息）

# 再次查看分区表，发现 /dev/sdb 下面多了一个 /dev/sdb1 分区
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
磁盘标签类型：dos
磁盘标识符：0xd223e041

   设备 Boot      Start         End      Blocks   Id  System
/dev/sdb1            2048    20971519    10484736   83  Linux

磁盘 /dev/mapper/centos_lvm-root：18.2 GB, 18249416704 字节，35643392 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节


磁盘 /dev/mapper/centos_lvm-swap：2147 MB, 2147483648 字节，4194304 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字
```

## 文件系统
&emsp;&emsp;在使用分区前，需要对分区进行格式化。Linux 在使用硬盘时，并不是直接读写物理硬盘设备，而是通过文件系统来管理和访问硬盘上的文件，因此格式化时，我们需要为磁盘指定文件系统。Linux 支持非常多种文件系统类型，如 Ext4、XFS、ZFS、Btrfs 等等[[链接](https://zhuanlan.zhihu.com/p/571235218)]。

```bash
$ mkfs -t xfs /dev/sdb1
meta-data=/dev/sdb1              isize=512    agcount=4, agsize=655296 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0, sparse=0
data     =                       bsize=4096   blocks=2621184, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal log           bsize=4096   blocks=2560, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0

# 通过 blkid 命令可以查看分区的文件系统
$ blkid
/dev/sda1: UUID="67e7a76e-783a-43e4-ba28-4e4e1d383a67" TYPE="xfs" 
/dev/sda2: UUID="2lDpqP-KJNY-F1aB-9AgY-P3Aw-lATj-lrfApe" TYPE="LVM2_member" 
/dev/sdb1: UUID="dd56b03b-ee44-41e9-a435-285492a87420" TYPE="xfs" 
/dev/mapper/centos_lvm-root: UUID="f78a6136-0131-4aa6-a5a6-6dba17d4d447" TYPE="xfs" 
/dev/mapper/centos_lvm-swap: UUID="bfecaf19-c8e1-410f-8bba-e4d61fd03faa" TYPE="swap" 
```

## 挂载磁盘
&emsp;&emsp;在 Linux 系统中，挂载磁盘需要一个挂载点（挂载目录），挂载后，向挂载目录写入数据就相当于向磁盘写入数据。

```bash
# 创建挂载目录
$ mkdir /opt/data

# 挂载 /dev/sdb1 到 /opt/data 目录
$ mount -t xfs /dev/sdb1 /opt/data

# 通过 lsblk 命令可以查看磁盘挂载信息
$ lsblk
NAME                MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda                   8:0    0   20G  0 disk 
├─sda1                8:1    0    1G  0 part /boot
└─sda2                8:2    0   19G  0 part 
  ├─centos_lvm-root 253:0    0   17G  0 lvm  /
  └─centos_lvm-swap 253:1    0    2G  0 lvm  [SWAP]
sdb                   8:16   0   10G  0 disk 
└─sdb1                8:17   0   10G  0 part /opt/data
sr0                  11:0    1 1024M  0 rom

# 查看磁盘使用情况
$ df -h
文件系统                     容量  已用  可用 已用% 挂载点
devtmpfs                     1.9G     0  1.9G    0% /dev
tmpfs                        1.9G     0  1.9G    0% /dev/shm
tmpfs                        1.9G  8.9M  1.9G    1% /run
tmpfs                        1.9G     0  1.9G    0% /sys/fs/cgroup
/dev/mapper/centos_lvm-root   17G  1.3G   16G    8% /
/dev/sda1                   1014M  151M  864M   15% /boot
tmpfs                        379M     0  379M    0% /run/user/0
/dev/sdb1                     10G   33M   10G    1% /opt/data
```

&emsp;&emsp;通过 `mount` 命令只能临时挂载分区，如果想做到开机时自动挂载磁盘，可能将挂载信息写入挂载表。

```bash
# 修改挂载表 /etc/fstab 文件，在文件最后面添加以下内容
$ nano /etc/fstab

/dev/sdb1    /opt/data    xfs    defaults    0 0
```

## RAID

## LVM
###

## 远程存储
### NFS
