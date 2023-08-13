# 文件存储
## 概述
&emsp;&emsp;在 Linux 中，有多种方式可以用于文件存储。在不同的场景下，应选用不同的存储方式。这里记录一下一些常用的存储方式

&emsp;&emsp;以下命令在 CentOS 7 下运行、测试。

### 参考文档
- [知乎 - MBR 与 GPT](https://zhuanlan.zhihu.com/p/26098509?utm_medium=social)
- [知乎 - 详解 linux下磁盘分区](https://zhuanlan.zhihu.com/p/650238369?utm_id=0)
- [知乎 - Linux下几种常用文件系统Ext4、XFS、ZFS以及Btrfs的简介及优缺点对比](https://zhuanlan.zhihu.com/p/571235218)
- [CSDN - mdadm详细使用手册](https://blog.csdn.net/a7320760/article/details/10442715)
- [CSDN - RAID技术全解图解](https://blog.csdn.net/ensp1/article/details/81318135)

## 分区
### 概念
&emsp;&emsp;挂载一块新磁盘后，首先需要为磁盘建立分区。划分分区一方面可以有效地对数据进行保护与分类存储，另一方面可以有效地对数据进行保护。

> &emsp;&emsp;比如 Windows 一般会将 C 盘和 D 盘分开，后续如果系统坏了想要重装时，即使格式化 C 盘，也不会影响存放在 D 盘的数据。

### 磁盘分区表
&emsp;&emsp;目前，市面上主要流行 MBR 分区和 GPT 分区，目前比较新的系统基本都支持或仅支持 GPT 分区，因此新系统一般可以直接选择使用 GPT 分区即可。由于 MBR 分区的一些限制，目前 MBR 分区处于淘汰阶段。

&emsp;&emsp;更多关于 MBR 分区和 GPT 分区的区别，请查看相关文章[[链接](https://zhuanlan.zhihu.com/p/26098509?utm_medium=social)]。

#### MBR 分区表
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

#### GPT 分区表
&emsp;&emsp;GPT 分区比较简单，基乎没什么限制，只需要注意以下几点：

- 分区数量几乎没有限制，不过目前 Windows 仅支持最大 128 个分区；
- 分区可管理的硬盘容量小于 18EB（1EB = 1024PB = 1024<sup>2</sup>TB）；
- Windows XP 系统无法识别 GPT 磁盘，Windows 7 及以上的系统可以任意读写 GPT 磁盘；
- GPT 磁盘只能安装 Windows 8 及以上版本的操作系统；
- GPT 磁盘只有在支持 UEFI 引导的主板才能安装操作系统（必须是 64 位的系统），启动模式必须从 BIOS 调整为 UEFI。

### 常见存储方案

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

### 操作分区
&emsp;&emsp;在 Linux 中，操作分区主要用到的工具是 `fdisk`。

#### 查看分区
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

#### 操作分区
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

## 文件系统
&emsp;&emsp;在使用分区前，需要对分区进行格式化。Linux 在使用硬盘时，并不是直接读写物理硬盘设备，而是通过文件系统来管理和访问硬盘上的文件，因此格式化时，我们需要为磁盘指定文件系统。Linux 支持非常多种文件系统类型，如 Ext4、XFS、ZFS、Btrfs 等等[[链接](https://zhuanlan.zhihu.com/p/571235218)]。

```bash
$ mkfs -t xfs /dev/sdb1
meta-data=/dev/sdb1              isize=512    agcount=4, agsize=655295 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0, sparse=0
data     =                       bsize=4096   blocks=2621179, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal log           bsize=4096   blocks=2560, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0

# 通过 blkid 命令可以查看分区的文件系统
$ blkid
/dev/sda1: UUID="67e7a76e-783a-43e4-ba28-4e4e1d383a67" TYPE="xfs" 
/dev/sda2: UUID="2lDpqP-KJNY-F1aB-9AgY-P3Aw-lATj-lrfApe" TYPE="LVM2_member" 
/dev/sdb1: UUID="6737ea87-d2f9-4cfc-90c7-0994b7d5bfdf" TYPE="xfs" PARTUUID="2bbec4d2-b5e9-4175-b6d6-3eef6363aa1f" 
/dev/mapper/centos_lvm-root: UUID="f78a6136-0131-4aa6-a5a6-6dba17d4d447" TYPE="xfs" 
/dev/mapper/centos_lvm-swap: UUID="bfecaf19-c8e1-410f-8bba-e4d61fd03faa" TYPE="swap"
```

## 挂载磁盘
&emsp;&emsp;在 Linux 系统中，挂载磁盘需要一个挂载点（挂载目录），挂载后，向挂载目录写入数据就相当于向磁盘写入数据。

```bash
# 创建挂载目录
$ mkdir /data

# 挂载 /dev/sdb1 到 /data 目录
$ mount -t xfs /dev/sdb1 /data

# 通过 lsblk 命令可以查看磁盘挂载信息
$ lsblk
NAME                MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda                   8:0    0   20G  0 disk 
├─sda1                8:1    0    1G  0 part /boot
└─sda2                8:2    0   19G  0 part 
  ├─centos_lvm-root 253:0    0   17G  0 lvm  /
  └─centos_lvm-swap 253:1    0    2G  0 lvm  [SWAP]
sdb                   8:16   0   10G  0 disk 
└─sdb1                8:17   0   10G  0 part /data
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
/dev/sdb1                     10G   33M   10G    1% /data
```

&emsp;&emsp;通过 `mount` 命令只能临时挂载分区，如果想做到开机时自动挂载磁盘，可能将挂载信息写入挂载表。

```bash
# 修改挂载表 /etc/fstab 文件，在文件最后面添加以下内容
$ nano /etc/fstab

/dev/sdb1    /data    xfs    defaults    0 0
```

## RAID
### 概念
&emsp;&emsp;1988 年美国加州大学伯克利分校的 D.A. Patterson 教授等首次在论文 “A Case of Redundant Array of Inexpensive Disks” 中提出了 RAID 概念，即廉价冗余阵列（Redundant Array of Inexpensive Disks）。由于当时大容量磁盘比较昂贵，RAID 的基本思想是将多个容量较小、相对廉价的磁盘进行有机组合，从而以较低的成本获得与昂贵大容量磁盘相当的容量、性能、可靠性。随着磁盘成本和价格的不断降低，RAID 可以使用大部份的磁盘，“兼价”已经毫无意义。因此，RAID 咨询委员会（RAID Advisory Board，RAB）决定用“独立”替代“廉价”，于是 RAID 变成独立磁盘冗余队列（Redundant Array of Independent Disks）。

&emsp;&emsp;RAID 主要利用数据条带、镜像和数据校验技术来获取高性能、可靠性、容错能力和扩展性，根据运用或组合运用这三种技术的策略和架构，可以把 RAID 分为不同等级，以满足不同数据应用的需求。D.A. Patterson 等的论文中定义了 RAID1 ～ RAID5 原始 RAID 等级，1988 年以来又扩展了 RAID0 和 RAID6。近年来，存储厂商不断推出诸如 RAID7、RAID10/01、RAID50、RAID53、RAID100 等 RAID 等级，但这些并无统一标准。目前业界公认的标准是 RAID0 ～ RAID5，除了 RAID2 外的四个等级被定为工业标准，而在实际应用领域中使用最多的 RAID 等级是 RAID0、RAID1、RAID3、RAID5、RAID6 和 RAID10。

- RAID0：一种简单的、无数据校验的数据条带化技术。实际上 RAID0 不是一种真正的 RAID，因为它不提供任何形式的冗余策略。RAID0 将所在的磁盘条带化后组成大空量的存储空间，将数据分散存储在所有磁盘中，以独立访问方式实现多块磁盘的并读访问。由于可以并发执行 I/O 操作，总线带宽得到充分利用，再加上不需要进行数据校验，RAID0 的性能在所有 RAID 等级中是最高的。理论上讲，一个由 n 块磁盘组成的 RAID0，它的读写性能是单个磁盘的 n 倍，但是由于总线带宽等多种因素的限制，实际的性能提升低于理论值。RAID0 具有低成本、高读写性能、100%的高存储空间利用率等优点，但是它不提供数据冗余保护，一但数据损坏，将无法恢复。因此 RAID0 一般适用于对性能要求严格但对数据安全性和可靠性不高的应用，如视频、音频存储、临时数据缓存空间等。
- RAID1：镜像存储，它将数据完全一致地分别写到工作磁盘和镜像磁盘，它的磁盘空间利用率为 50%。RAID1 在数据写入时，响应时间会有所影响，但是读取数据的时候没有影响。RAID1 提供了最佳的数据保护，一但工作磁盘发生故障，系统自动从镜像磁盘读取数据，不会影响用户工作。RAID1 拥有完全容错的能力，但实现成本高。RAID1 应用于对顺序读写性能要求高以及对数据保护极为重视的应用。
- RAID3：使用专用校验盘的并行访问阵列，它采用一个专用的磁盘作为校验盘，其余磁盘作主国数据盘，数据按位可字节的方式交叉存储到各个数据盘中。RAID3 至少需要三块磁盘，不同磁盘上同一带区的数据作为 XOR 校验，校验值写入校验盘中。RAID3 完好时读性能与 RAID0 完全一致，并行从多个磁盘条带读取数据，性能非常高，同时还提供了数据容错能力。向 RAID3 写入数据时，必须计算与所有同条带的校验值，并将新校验值写入校验盘中。一次写操作包含了写数据块、读取同条带的数据块、计算校验值、写入校验值等多个操作，系统开销非常大，性能校低。如果 RAID3 中某一磁盘出现故障，不会影响数据读取，可以借助校验数据和其他完全数据来重建数据。假如所要读取的数据块正好位于失效磁盘，则系统需要读取所有同一条带的数据块，并根据校验值重建丢失的数据，系统性能将受到影响。当故障磁盘被更换后，系统按相同的方式重建故障盘中的数据至新磁盘。RAID3 只需要一个校验盘，阵列的存储空间利用率高，再加上并行访问的特征，能够为高带宽的大量读写提供高性能，适用大容量数据的顺序访问应用，如影像处理、流媒体服务等。
- RAID4：与 RAID3 的原理大致相同，区别在于条带化的方式不同。RAID4 按照块的方式来组织数据，写操作只涉及当前数据盘和样验盘两个盘，多个 I/O 请求可以同时得到处理，提高了系统性能。RAID4 按块存储可以保证单块的完整性，可以避免受到其他磁盘上同条带产生的不利影响。RAID4 在不同磁盘上同级数据块同样使用 XOR 校验，结果存储在校验盘中。写入数据时，RAID4 按这种方式把各磁盘上同级数据的校验值写入磁盘，读取时进行即时校验。因此，当某块磁盘的数据块损坏，RAID4 可以通过校验值以及其他磁盘上的同级数据块进行数据重建。RAID4 提供了非常好的读性能，但单一的校验盘往往成为系统性能瓶颈。对于写操作，RAID4 只能一个磁盘一个磁盘地写，并且还要写入校验数据，因此写性能比较差。而且随着成员磁盘数量的增加，校验盘的系统瓶颈将更加突出。正是如上这些限制和不足，RAID4 在实际应用中很少见，`主流存储产品也很少使用 RAID4 保护`。
- RAID5：与 RAID4 的原理相似，区别在于校验数据分布在阵列中的所有磁盘上，而没有采用专门的校验磁盘。对于数据和校验数据，它们的写操作可以同时发生在完全不同的磁盘上。因此，RAID5 不存在 RAID4 中的并发写操作时的校验盘性能瓶颈问题。另外，RAID5 还具备很好的扩展性，当阵列磁盘数量增加时，并行操作量的能力也随之增长，可比 RAID4 支持更多的磁盘，从而拥有更高的容量以及更好的性能。RAID5 在磁盘上同时存储数据和校验数据，数据块和对应的校验信息保存在不同的磁盘上，当一个数据盘损坏时，系统可以根据同一条带的其他数据块和对应的校验数据来重建损坏的数据。与其他 RAID 等级一样，重建数据时，RAID5 的性能会受到较大的影响。RAID5 兼顾存储性能、数据安全和存储成本等各方面因素，它可以理解为 RAID0 和 RAID1 的折中方案，`是目前综合性能最佳`的数据保护解决方案。RAID5 基本上可以满足大部份的存储应用需求，数据中心大多采用它作主国应用数据的保护方案。
- RAID6：前面所述的各个 RAID 等级都只能保护因单个磁盘失效而造成的数据丢失。如果两个磁盘同时发生故障，数据将无法恢复。RAID6 引入双重校验的概念，它可以保护阵列中同时出现两个磁盘失效时，阵列仍能够继续工作，不会发生数据丢失。RAID6 等级是在 RAID5 的基础上为了进一步增强数据保护而设计的一种 RAID 方式，它可以看作是一种扩展的 RAID5 等级。RAID6 不仅要支持数据的恢复，还要支持校验数据的恢复，因此实现代价很高，控制器的设计也比其他等级更复杂、更昂贵。RAID6 思想最常见的实现方式是采用两个独立的校验算法，假设称为 P 和 Q，校验数据可以分别存储在两个不同的校验盘上，或者分散存储在所有成员磁盘中。当两个磁盘同时失效时，即可通过求解两元一次方程来重建两个磁盘上的数据。RAID6 具有快速读取性能、更高的容错能力，但是成本要高于 RAID5 许多，写性能也较差，并且设计和实施非常复杂。因此 RAID6 很少得到实际应用。
- RAID01 和 RAID10：可以看作是 RAID1 和 RAID0 的组合。RAID01 是先做条带化再作镜像，本质是对物理磁盘实现镜像；而 RAID10 是先做镜像再作条带化，是对虚拟磁盘实现镜像。相同配置下，通常 RAID01 比 RAID10 具有更好的容错能力。RAID01 兼备了 RAID0 和 RAID1 的优点，它先用两块磁盘建立镜像，然后再在镜像内部做条带化。RAID01 的数据将同时写入到两个磁盘阵列中，如果其中一个阵列损坏，仍可继续工作，保证数据安全性的同时又提高了性能。

&emsp;&emsp;主流 RAID 等级技术对比：

| RAID 等级 | RAID0                         | RAID1                      | RAID3                      | RAID5                      | RAID6                      | RAID10                     |
|---------|-------------------------------|----------------------------|----------------------------|----------------------------|----------------------------|----------------------------|
| 别名      | 条带                            | 镜像                         | 专用奇偶校验条带                   | 分布奇偶校验条带                   | 双重奇偶校验条带                   | 镜像加条带                      |
| 容错性     | 无                             | <font color="red">有</font> | <font color="red">有</font> | <font color="red">有</font> | <font color="red">有</font> | <font color="red">有</font> |
| 冗余类型    | 无                             | <font color="red">有</font> | <font color="red">有</font> | <font color="red">有</font> | <font color="red">有</font> | <font color="red">有</font> |
| 热备份选择   | 无                             | <font color="red">有</font> | <font color="red">有</font> | <font color="red">有</font> | <font color="red">有</font> | <font color="red">有</font> |
| 读性能     | <font color="red">高</font>    | 低                          | <font color="red">高</font> | <font color="red">高</font> | <font color="red">高</font> | <font color="red">高</font> |
| 随机写性能   | <font color="red">高</font>    | 低                          | 低                          | 一般                         | 低                          | 一般                         |
| 连续写性能   | <font color="red">高</font>    | 低                          | 低                          | 低                          | 低                          | 一般                         |
| 需要磁盘数   | n ≥ 1                         | 2n(n ≥ 1)                  | n ≥ 3                      | n ≥ 3                      | n ≥ 4                      | 2n(n ≥ 2) ≥ 4              |
| 可用容量    | <font color="red">100%</font> | 50%                        | (n-1)/n%                   | (n-1)/n%                   | (n-2)/n%                   | 50%                        |
| 适用性     | 对性能要求高，对安全没要求                 | 对安全要求高，对成本不敏感              | 较少使用                       | 综合性能好，成本较低                 | 较少使用                       | 同时希望兼顾性能和安全的要求，对成本不敏感      |

### 实现方式
&emsp;&emsp;RAID 可以采用软件方式实现，也可以采用硬件方式实现，或者采用软硬结合的方式实现。

#### 硬 RAID
&emsp;&emsp;硬 RAID 拥有自己的 RAID 控制处理与 I/O 处理芯片，甚至还有阵列缓冲，对 CPU 的占用率和整性性能是三类实现中最优的，但是实现成本也最高。硬 RAID 通常通常都支持热交换技术，在系统运行下更换故障硬盘，服务器平台多采用 RAID 卡。

#### 软 RAID
&emsp;&emsp;软 RAID 没有专用的控制芯片和 I/O 芯片，完全由操作系统和 CPU 来实现所有 RAID 的功能。现代操作系统基本上都提供软 RAID 支持，通过在磁盘设备驱动程序上添加一个软件层，提供一个物理驱动器与逻辑驱动器之间的抽象层。目前，操作系统支持的最常见的 RAID 等级有 RAID0、RAID1、RAID10、RAID10 和 RAID5 等。

&emsp;&emsp;软 RAID 的配置管理和数据恢复都比较简单，但是 RAID 所有任务的处理完全由 CPU 来完成，如计算校验值，所以执行效率比较低下，这种方式需要消耗大量的运算资源，支持 RAID 模式较少，很难广泛应用。软 RAID 由操作系统来实现，因此系统所在分区不能作为 RAID 的逻辑成员磁盘，软 RAID 不能保护系统盘。

&emsp;&emsp;在 Linux 下，通常使用 `mdadm` 工具来创建、管理磁盘阵列。


## LVM
###

## 远程存储
### NFS
