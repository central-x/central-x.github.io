# 分区
## 概述
&emsp;&emsp;挂载一块新磁盘后，首先需要为磁盘建立分区。划分分区一方面可以有效地对数据进行保护与分类存储，另一方面可以有效地对数据进行保护。

> &emsp;&emsp;比如 Windows 一般会将 C 盘和 D 盘分开，后续如果系统坏了想要重装时，即使格式化 C 盘，也不会影响存放在 D 盘的数据。

## 磁盘分区表
&emsp;&emsp;目前，市面上主要流行 MBR 分区和 GPT 分区，<font color=red>**目前比较新的系统基本都支持或仅支持 GPT 分区，因此新系统一般可以直接选择使用 GPT 分区即可**</font>。由于 MBR 分区的一些限制，目前 MBR 分区处于淘汰阶段。

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

1. 主分区要求大于等于 1 个，<font color=red>主分区和扩展分区之和最多 4 个</font>；
2. 可以没有扩展分区；
3. <font color=red>每个分区最大支持 2T</font>；
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

## fdisk
&emsp;&emsp;`fdisk` 命令是 Linux 下的一款老牌分区工具，它支持操作多种分区表。使用 `fdisk /dev/<device>` 命令，可以查看或修改磁盘的分区信息。

&emsp;&emsp;`fdisk` 在操作磁盘分区时，是在内存中模拟操作的，通过 `w` 指令可以将最终操作写入磁盘中。通过 `q` 指令可以放弃对磁盘的更改。

```bash
$ fdisk /dev/sdb
欢迎使用 fdisk (util-linux 2.23.2)。

更改将停留在内存中，直到您决定将更改写入磁盘。
使用写入命令前请三思。

Device does not contain a recognized partition table
使用磁盘标识符 0xef1d0bb0 创建新的 DOS 磁盘标签。

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


### 查看分区
&emsp;&emsp;通过 `fdisk -l` 命令可以查看当前操作系统所有磁盘，以及每个磁盘的分区情况：

```bash
$ fdisk -l

磁盘 /dev/sdb：107.4 GB, 107374182400 字节，209715200 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节


磁盘 /dev/sda：107.4 GB, 107374182400 字节，209715200 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：dos
磁盘标识符：0x000185a9

   设备 Boot      Start         End      Blocks   Id  System
/dev/sda1   *        2048     2099199     1048576   83  Linux
/dev/sda2         2099200   209715199   103808000   8e  Linux LVM

磁盘 /dev/mapper/centos-root：53.7 GB, 53687091200 字节，104857600 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节


磁盘 /dev/mapper/centos-swap：8455 MB, 8455716864 字节，16515072 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节


磁盘 /dev/mapper/centos-home：44.1 GB, 44149243904 字节，86228992 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
```

&emsp;&emsp;上面的命令列出了 `/dev/sda` 和 `/dev/sdb` 两个物理磁盘的信息：

- `/dev/sda` 磁盘目前有两个分区（`/dev/sda1` 和 `/dev/sda2`），通过磁盘标签类型（`dos`），可得知该磁盘使用 MBR 来管理分区;
- `/dev/sdb` 磁盘目前没有分区信息。
- `/dev/mapper` 是 lvm 逻辑卷[[链接](./lvm)]信息，可以先忽略。

### 新磁盘建立分区
&emsp;&emsp;一般情况下，新磁盘建立分区应遵循以下步骤：

- 创建分区表（GPT）
- 新增分区
- 保存分区信息
- 使用文件系统工具格式化（mkfs）分区
- 挂载分区（mount）

&emsp;&emsp;通过 `fdisk /dev/<device>` 命令，可以修改磁盘的分区信息。

```bash
$ fdisk /dev/sdb
欢迎使用 fdisk (util-linux 2.23.2)。

更改将停留在内存中，直到您决定将更改写入磁盘。
使用写入命令前请三思。

Device does not contain a recognized partition table
使用磁盘标识符 0x5bdcecc1 创建新的 DOS 磁盘标签。

# 建立 GPT 分区表
命令(输入 m 获取帮助)：g
Building a new GPT disklabel (GUID: E5651A0E-BD61-465B-9791-442D13498E2A)

# 新建分区
命令(输入 m 获取帮助)：n
分区号 (1-128，默认 1)：1
第一个扇区 (2048-209715166，默认 2048)：
Last sector, +sectors or +size{K,M,G,T,P} (2048-209715166，默认 209715166)：
已创建分区 1

# 查看分区信息
命令(输入 m 获取帮助)：p

磁盘 /dev/sdb：107.4 GB, 107374182400 字节，209715200 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：gpt
Disk identifier: E5651A0E-BD61-465B-9791-442D13498E2A


#         Start          End    Size  Type            Name
 1         2048    209715166    100G  Linux filesyste 

# 保存分区
命令(输入 m 获取帮助)：w
The partition table has been altered!

Calling ioctl() to re-read partition table.
正在同步磁盘。
```

&emsp;&emsp;使用 `fdisk -l` 再次查看磁盘信息，可以看到 `/dev/sdb` 下面已经有一个分区号为 `1` 的分区了。

```bash
# 无关信息已忽略
$ fdisk -l
WARNING: fdisk GPT support is currently new, and therefore in an experimental phase. Use at your own discretion.

磁盘 /dev/sdb：107.4 GB, 107374182400 字节，209715200 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：gpt
Disk identifier: E5651A0E-BD61-465B-9791-442D13498E2A


#         Start          End    Size  Type            Name
 1         2048    209715166    100G  Linux filesyste 
```

&emsp;&emsp;接下来使用文件系统进行格式化就可以挂载和使用了。

```bash
# 将 /dev/sdb1 分区格式化为 xfs 格式
$ mkfs -t xfs /dev/sdb1
meta-data=/dev/sdb1              isize=512    agcount=4, agsize=6553535 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0, sparse=0
data     =                       bsize=4096   blocks=26214139, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal log           bsize=4096   blocks=12799, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0

# 创建挂载点并挂载磁盘
$ mkdir /data
$ mount -t xfs /dev/sdb1 /data

# 查看挂载信息
$ df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 3.9G     0  3.9G    0% /dev
tmpfs                    3.9G     0  3.9G    0% /dev/shm
tmpfs                    3.9G  8.9M  3.9G    1% /run
tmpfs                    3.9G     0  3.9G    0% /sys/fs/cgroup
/dev/mapper/centos-root   50G  1.3G   49G    3% /
/dev/mapper/centos-home   42G   33M   42G    1% /home
/dev/sda1               1014M  151M  864M   15% /boot
tmpfs                    783M     0  783M    0% /run/user/0
/dev/sdb1                100G   33M  100G    1% /data
```

### 原分区扩容
&emsp;&emsp;正常情况下，在物理世界中，一般磁盘在出厂就已经设定了容量了，因此比较少情况会出现原分区扩容的需求。出现这种情况一般是通过虚拟机软件（VMWare 之类）调整磁盘容量。原分区扩容应遵循以下步骤：

- 关机，调整磁盘容量
- 卸载分区（umount）
- 删除分区
- 新增分区
- 保存分区信息（完成分区扩容）
- 挂载分区（mount）
- 使用文件系统工具（xfs_growfs、resize2fs 之类）完成文件系统扩容

> &emsp;&emsp;正常情况下不建议分区扩容，一是要停机扩容，二是扩容风险大。如果有扩容需求，建议在早期识别到该需求后，使用 lvm 技术[[链接](./lvm)]来管理磁盘。

&emsp;&emsp;为了模拟这种情况，我已经将 `/dev/sdb` 的磁盘大小从 100G 调整为 200G。查看磁盘和分区信息。

```bash
# 已忽略无关信息
# /dev/sdb 已经是 214.7GB 了，但是 /dev/sdb1 的分区还是 100G 大小
# 另外，观查到 /dev/sdb 的磁盘标签类型被变更为 doc，也就是 MBR 了，后面我们需要重新调整回 GPT
$ fdisk -l

磁盘 /dev/sdb：214.7 GB, 214748364800 字节，419430400 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：dos
磁盘标识符：0x00000000

   设备 Boot      Start         End      Blocks   Id  System
/dev/sdb1               1   209715199   104857599+  ee  GPT

# /data 当前也是 100G 大小
$ df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 3.9G     0  3.9G    0% /dev
tmpfs                    3.9G     0  3.9G    0% /dev/shm
tmpfs                    3.9G  8.9M  3.9G    1% /run
tmpfs                    3.9G     0  3.9G    0% /sys/fs/cgroup
/dev/mapper/centos-root   50G  1.3G   49G    3% /
/dev/sda1               1014M  151M  864M   15% /boot
/dev/mapper/centos-home   42G   33M   42G    1% /home
tmpfs                    783M     0  783M    0% /run/user/0
/dev/sdb1                100G   33M  100G    1% /data
```

&emsp;&emsp;通过 `fdisk /dev/<device>` 命令，可以修改磁盘的分区信息。

```bash
# 卸载磁盘
$ umount /data

# 使用 fdisk 操作磁盘
$ fdisk /dev/sdb
欢迎使用 fdisk (util-linux 2.23.2)。

更改将停留在内存中，直到您决定将更改写入磁盘。
使用写入命令前请三思。

# 打印分区信息
命令(输入 m 获取帮助)：p

磁盘 /dev/sdb：214.7 GB, 214748364800 字节，419430400 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：dos
磁盘标识符：0x00000000

   设备 Boot      Start         End      Blocks   Id  System
/dev/sdb1               1   209715199   104857599+  ee  GPT

# 删除 /dev/sdb1 分区
命令(输入 m 获取帮助)：d
已选择分区 1
分区 1 已删除

# 重新建立 GPT 分区表
命令(输入 m 获取帮助)：g
Building a new GPT disklabel (GUID: DC4BBEEF-B4EC-4298-811B-6D466F8D72C2)

# 新建分区
命令(输入 m 获取帮助)：n
分区号 (1-128，默认 1)：1
第一个扇区 (2048-419430366，默认 2048)：
Last sector, +sectors or +size{K,M,G,T,P} (2048-419430366，默认 419430366)：
已创建分区 1

# 保存分区
命令(输入 m 获取帮助)：w
The partition table has been altered!

Calling ioctl() to re-read partition table.
正在同步磁盘。
```

&emsp;&emsp;再次查看分区信息，可以看到 `/dev/sdb` 的磁盘标签类型已经变回 GPT 分区表类型，并且分区号为 1 的分区（也就是 /dev/sdb1）的大小已经变更为 200G。

```bash
$ fdisk -l

磁盘 /dev/sdb：214.7 GB, 214748364800 字节，419430400 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：gpt
Disk identifier: DC4BBEEF-B4EC-4298-811B-6D466F8D72C2


#         Start          End    Size  Type            Name
 1         2048    419430366    200G  Linux filesyste 
```

&emsp;&emsp;挂载磁盘，调整文件系统大小

```bash
# 按原格式挂载磁盘
$ mount -t xfs /dev/sdb1 /data

# 查看磁盘下面的数据，可以发现数据正常
$ ls /data
readme.txt

# 查看文件系统，发现 /dev/sdb1 的大小还是 100G，这是因为文件系统还没有更新
$ df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 3.9G     0  3.9G    0% /dev
tmpfs                    3.9G     0  3.9G    0% /dev/shm
tmpfs                    3.9G  8.9M  3.9G    1% /run
tmpfs                    3.9G     0  3.9G    0% /sys/fs/cgroup
/dev/mapper/centos-root   50G  1.3G   49G    3% /
/dev/sda1               1014M  151M  864M   15% /boot
/dev/mapper/centos-home   42G   33M   42G    1% /home
tmpfs                    783M     0  783M    0% /run/user/0
/dev/sdb1                100G   33M  100G    1% /data

# 更新文件系统信息
$ xfs_growfs /dev/sdb1
meta-data=/dev/sdb1              isize=512    agcount=4, agsize=6553535 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0 spinodes=0
data     =                       bsize=4096   blocks=26214139, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal               bsize=4096   blocks=12799, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
data blocks changed from 26214139 to 52428539

# 再次查看文件系统，发现 /dev/sdb1 的大小已经更新为 200G
$ df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 3.9G     0  3.9G    0% /dev
tmpfs                    3.9G     0  3.9G    0% /dev/shm
tmpfs                    3.9G  8.9M  3.9G    1% /run
tmpfs                    3.9G     0  3.9G    0% /sys/fs/cgroup
/dev/mapper/centos-root   50G  1.3G   49G    3% /
/dev/sda1               1014M  151M  864M   15% /boot
/dev/mapper/centos-home   42G   33M   42G    1% /home
tmpfs                    783M     0  783M    0% /run/user/0
/dev/sdb1                200G   33M  200G    1% /data
```

### 原分区缩容
&emsp;&emsp;<font color=red>禁止原分区缩容</font>，很多文件系统是不支持缩容的，原分区缩容代表资料有大概率会丢失。如果一定要原分区缩容，建议另找一个磁盘备份之后再缩容。缩容后再将备份文件复制回新分区。

## parted
&emsp;&emsp;由于旧版本的 `fdisk` 命令不支持 GPT 分区（新版本已支持），因此推出了 `parted` 命令。

&emsp;&emsp;与 `fdisk` 命令不同，`parted` 命令的所有操作都是实时的，也就是说你执行了一个分区的命令，那磁盘就已经被分区了。因此在操作 `parted` 工具时需要非常谨慎。

&emsp;&emsp;`fdisk` 创建的分区使用 `parted` 来管理，或 `parted` 创建的分区使用 `fdisk` 来管理都是允许的。

```bash
$ parted /dev/sdb
GNU Parted 3.1
使用 /dev/sdb
Welcome to GNU Parted! Type 'help' to view a list of commands.
(parted) help                                                             
  align-check TYPE N                        check partition N for TYPE(min|opt) alignment
  help [COMMAND]                           print general help, or help on COMMAND
  mklabel,mktable LABEL-TYPE               create a new disklabel (partition table)
  mkpart PART-TYPE [FS-TYPE] START END     make a partition
  name NUMBER NAME                         name partition NUMBER as NAME
  print [devices|free|list,all|NUMBER]     display the partition table, available devices, free space, all found partitions, or a particular
        partition
  quit                                     exit program
  rescue START END                         rescue a lost partition near START and END
  
  resizepart NUMBER END                    resize partition NUMBER
  rm NUMBER                                delete partition NUMBER
  select DEVICE                            choose the device to edit
  disk_set FLAG STATE                      change the FLAG on selected device
  disk_toggle [FLAG]                       toggle the state of FLAG on selected device
  set NUMBER FLAG STATE                    change the FLAG on partition NUMBER
  toggle [NUMBER [FLAG]]                   toggle the state of FLAG on partition NUMBER
  unit UNIT                                set the default unit to UNIT
  version                                  display the version number and copyright information of GNU Parted
```

&emsp;&emsp;输入 `help` 指令后，列出 `parted` 支持的命令清单，常用命令如下：

- `print`: 打印当前磁盘的分区信息；
- `mklabel`、`mktable`: 在磁盘中创建一个空的分区表，供后续新增分区信息；
- `mkpart`: 在当前磁盘的分区表中添加一个新的分区；
- `rm`: 删除分区；
- `quit`: 退出 `parted` 命令。

### 新磁盘建立分区
&emsp;&emsp;与 fdisk 新建分区的步骤是一致的，一般情况下，新磁盘建立分区应遵循以下步骤：

- 创建分区表（GPT）
- 新增分区
- 保存分区信息
- 使用文件系统工具格式化（mkfs）分区
- 挂载分区（mount）

&emsp;&emsp;通过 `parted /dev/<device>` 命令，可以修改磁盘的分区信息。

```bash
$ parted /dev/sdb
GNU Parted 3.1
使用 /dev/sdb
Welcome to GNU Parted! Type 'help' to view a list of commands.

# 查看分区信息
(parted) print                                                            
错误: /dev/sdb: unrecognised disk label
Model: VMware Virtual disk (scsi)                                         
Disk /dev/sdb: 107GB
Sector size (logical/physical): 512B/512B
Partition Table: unknown
Disk Flags: 

# 建立 GPT 分区表
(parted) mklabel gpt

# 新建分区
(parted) mkpart                                                           
分区名称？  []?                                                           
文件系统类型？  [ext2]? xfs                                               
起始点？ 0%                                                               
结束点？ 100%                                                             

# 再次查看分区信息
(parted) print                                                            
Model: VMware Virtual disk (scsi)
Disk /dev/sdb: 107GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start   End    Size   File system  Name  标志
 1      1049kB  107GB  107GB

# 退出 parted 命令
(parted) quit
```

&emsp;&emsp;接下来使用文件系统进行格式化就可以挂载和使用了。

```bash
# 将 /dev/sdb1 分区格式化为 xfs 格式
$ mkfs -t xfs /dev/sdb1
meta-data=/dev/sdb1              isize=512    agcount=4, agsize=6553472 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0, sparse=0
data     =                       bsize=4096   blocks=26213888, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal log           bsize=4096   blocks=12799, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0

# 创建挂载点并挂载磁盘
$ mkdir /data
$ mount -t xfs /dev/sdb1 /data

# 查看挂载信息
$ df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 3.9G     0  3.9G    0% /dev
tmpfs                    3.9G     0  3.9G    0% /dev/shm
tmpfs                    3.9G  8.9M  3.9G    1% /run
tmpfs                    3.9G     0  3.9G    0% /sys/fs/cgroup
/dev/mapper/centos-root   50G  1.3G   49G    3% /
/dev/sda1               1014M  151M  864M   15% /boot
/dev/mapper/centos-home   42G   33M   42G    1% /home
tmpfs                    783M     0  783M    0% /run/user/0
/dev/sdb1                100G   33M  100G    1% /data
```

### 原分区扩容
&emsp;&emsp;与 `fdisk` 的分区步骤相同，原分区扩容应遵循以下步骤：

- 关机，调整磁盘容量
- 卸载分区（umount）
- 删除分区
- 新增分区
- 保存分区信息（完成分区扩容）
- 挂载分区（mount）
- 使用文件系统工具（xfs_growfs、resize2fs 之类）完成文件系统扩容

&emsp;&emsp;为了模拟这种情况，我已经将 `/dev/sdb` 的磁盘大小从 100G 调整为 200G。查看磁盘和分区信息。

```bash
# /dev/sdb 已经是 215GB 了，但是 /dev/sdb1 的分区还是 100G 大小
$ parted /dev/sdb print
Model: VMware Virtual disk (scsi)
Disk /dev/sdb: 215GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start   End    Size   File system  Name  标志
 1      1049kB  107GB  107GB  xfs

# /data 当前也是 100G 大小
$ df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 3.9G     0  3.9G    0% /dev
tmpfs                    3.9G     0  3.9G    0% /dev/shm
tmpfs                    3.9G  8.9M  3.9G    1% /run
tmpfs                    3.9G     0  3.9G    0% /sys/fs/cgroup
/dev/mapper/centos-root   50G  1.3G   49G    3% /
/dev/sda1               1014M  151M  864M   15% /boot
/dev/mapper/centos-home   42G   33M   42G    1% /home
tmpfs                    783M     0  783M    0% /run/user/0
/dev/sdb1                100G   33M  100G    1% /data
```

&emsp;&emsp;通过 `parted /dev/<device>` 命令，可以修改磁盘的分区信息。

```bash
# 卸载磁盘
$ umount /data

# 使用 fdisk 操作磁盘
$ parted /dev/sdb
GNU Parted 3.1
使用 /dev/sdb
Welcome to GNU Parted! Type 'help' to view a list of commands.

# 查看分区
(parted) print                                                            
Model: VMware Virtual disk (scsi)
Disk /dev/sdb: 215GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start   End    Size   File system  Name  标志
 1      1049kB  107GB  107GB  xfs

# 删除分区
(parted) rm
分区编号？ 1

# 新建分区                                                              
(parted) mkpart
分区名称？  []?                                                           
文件系统类型？  [ext2]? xfs                                               
起始点？ 0%                                                               
结束点？ 100%

# 打印分区
# 可以看到序号 1 的分区大小已经调整为 215G                                                             
(parted) print
Model: VMware Virtual disk (scsi)
Disk /dev/sdb: 215GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start   End    Size   File system  Name  标志
 1      1049kB  215GB  215GB  xfs

# 退出 parted 命令
(parted) quit
```

&emsp;&emsp;挂载磁盘，调整文件系统大小

```bash
# 按原格式挂载磁盘
$ mount -t xfs /dev/sdb1 /data

# 查看磁盘下面的数据，可以发现数据正常
$ ls /data
readme.txt

# 查看文件系统，发现 /dev/sdb1 的大小还是 100G，这是因为文件系统还没有更新
$ df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 3.9G     0  3.9G    0% /dev
tmpfs                    3.9G     0  3.9G    0% /dev/shm
tmpfs                    3.9G  8.9M  3.9G    1% /run
tmpfs                    3.9G     0  3.9G    0% /sys/fs/cgroup
/dev/mapper/centos-root   50G  1.3G   49G    3% /
/dev/sda1               1014M  151M  864M   15% /boot
/dev/mapper/centos-home   42G   33M   42G    1% /home
tmpfs                    783M     0  783M    0% /run/user/0
/dev/sdb1                100G   33M  100G    1% /data

# 更新文件系统信息
$ xfs_growfs /dev/sdb1
meta-data=/dev/sdb1              isize=512    agcount=4, agsize=6553472 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0 spinodes=0
data     =                       bsize=4096   blocks=26213888, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal               bsize=4096   blocks=12799, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
data blocks changed from 26213888 to 52428288

# 再次查看文件系统，发现 /dev/sdb1 的大小已经更新为 200G
$ df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 3.9G     0  3.9G    0% /dev
tmpfs                    3.9G     0  3.9G    0% /dev/shm
tmpfs                    3.9G  8.9M  3.9G    1% /run
tmpfs                    3.9G     0  3.9G    0% /sys/fs/cgroup
/dev/mapper/centos-root   50G  1.3G   49G    3% /
/dev/sda1               1014M  151M  864M   15% /boot
/dev/mapper/centos-home   42G   33M   42G    1% /home
tmpfs                    783M     0  783M    0% /run/user/0
/dev/sdb1                200G   33M  200G    1% /data
```

### 原分区缩容
&emsp;&emsp;<font color=red>禁止原分区缩容</font>，原因与 `fdisk` 一致。