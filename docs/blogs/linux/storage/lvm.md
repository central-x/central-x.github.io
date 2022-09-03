# LVM
## 概述
&emsp;&emsp;传统磁盘管理过程中，绝大多数都是先对一个硬盘进行分区，然后再将该分区进行文件系统格式化，最后挂载上去即可。这种传统磁盘管理的方式经常会带了很多问题，比如说使用中的一个分区，其空间大小已经不再够用时，安全的方式是新增一块新的磁盘，然后在新的磁盘上创建分区、格式化后，然后将当前分区的所有东西都拷贝到新的分区里面。在生产环境下的服务器来说，这是一种不可接受的操作。如果服务器上运行着一个重要的服务，比如 NFS 或 FTP，其要求 7 * 24 小时运行正常的，如果该分区保存的内容非常多，数据转移的时间可能会耗费很久。为了解决这个问题，LVM 技术应运而生。

&emsp;&emsp;LVM（Logical Volume Manager）是逻辑卷管理的简称，它是 Linux 环境下对磁盘分区进行管理的一种机制。LVM 的工作原理是将底层的物理硬盘抽象地封装起来，然后以逻辑卷的方式呈现给上层应用，因此上层应用不再关心底层物理磁盘的管理工作（比如增加或减少一个物理磁盘时，上层的服务是感觉不到的）。LVM 最大的特点就是可以对磁盘进行动态管理，因为逻辑卷的大小是可以动态调整的，而且不会丢失现有的数据，大大提高了磁盘管理的灵活性。

&emsp;&emsp;LVM 技术主要存在以下几个概念：

- 物理卷（Physical Volume，PV）：物理磁盘或分区格式化为 PV。在格式化的过程中，LVM 是将底层的硬盘划分为了一个一个的 PE。
- 物理拓展（Physical Extend，PE）：LVM 管理的最基本存储单位，每个 PE 默认的存储空间大小是 4MB（可以调整，但是每个 VG 所有的 PE 的大小必须相同）。
- 卷组（Volume Group，VG）：LVM 存储空间池，可以将一个或多个 PV 加到 VG 中。由于 PE 是存在 PV 里的，因此 VG 里面就存放了许多来自不同 PV 中的 PE。创建卷组时，通常会为该卷组取一个名字。
- 逻辑卷（Logical Volume，LV）：在 VG 中取一定数量的 PE 出来（可能来自不同的 PV），形成 LV 供上层应用使用。上层应用在使用 LV 时，就和普通的分区差不多，对 PV 进行格式化之后，就可以挂载使用了。LV 的扩容和缩容实际上就是增加或减少组成该 LV 的 PE 的数量，其过程不会丢失原始数据。

![](./assets/lvm.svg)

## 管理
### 物理卷（PV）管理
&emsp;&emsp;使用 `pvcreate` 命令，可以将磁盘或分区格式化为 PV。

```bash
# 查看当前磁盘信息（已忽略其余无关磁盘信息）
# 当前系统有两块 10G 大小的磁盘
$ fdisk -l

磁盘 /dev/sdb：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节

磁盘 /dev/sdc：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节

# 分别对两个磁盘进行分区（使用 GPT，过程忽略）
$ fdisk /dev/sdb
$ fdisk /dev/sdc

# 再次查看当前磁盘信息
磁盘 /dev/sdb：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：gpt
Disk identifier: FD430474-2266-4FFC-9833-ECD6DD0758C8


#         Start          End    Size  Type            Name
 1         2048     20971486     10G  Linux filesyste 
WARNING: fdisk GPT support is currently new, and therefore in an experimental phase. Use at your own discretion.

磁盘 /dev/sdc：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：gpt
Disk identifier: 01E7DC3A-08FD-4F67-A2A9-5A1E1CE15559


#         Start          End    Size  Type            Name
 1         2048     20971486     10G  Linux filesyste 


# 创建 pv
$ pvcreate /dev/sdb1 /dev/sdc1
  Physical volume "/dev/sdb1" successfully created.
  Physical volume "/dev/sdc1" successfully created.

# 查看当前 pv 信息（已忽略其余无关信息）
$ pvs
  PV         VG         Fmt  Attr PSize   PFree  
  /dev/sdb1             lvm2 ---  <10.00g <10.00g
  /dev/sdc1             lvm2 ---  <10.00g <10.00g

# 查看当前 pv 信息（已忽略其余无关信息）
# /dev/sdb1 和 /dev/sdc1 的 VG Name、Allocatable、PE Size、Total PE、Free PE 等信息会在创建完 VG 后更新
$ pvdisplay
  "/dev/sdc1" is a new physical volume of "<10.00 GiB"
  --- NEW Physical volume ---
  PV Name               /dev/sdc1
  VG Name               
  PV Size               <10.00 GiB
  Allocatable           NO
  PE Size               0   
  Total PE              0
  Free PE               0
  Allocated PE          0
  PV UUID               n3RQic-VFWi-dIzq-yBMf-DHU0-F4rh-IW4gN6
   
  "/dev/sdb1" is a new physical volume of "<10.00 GiB"
  --- NEW Physical volume ---
  PV Name               /dev/sdb1
  VG Name               
  PV Size               <10.00 GiB
  Allocatable           NO
  PE Size               0   
  Total PE              0
  Free PE               0
  Allocated PE          0
  PV UUID               uSZlBZ-Fhut-g4Sl-8eaa-Vu5h-sJWI-3q74vd
```

### 卷组（VG）管理
&emsp;&emsp;使用 `vgcreate` 命令来创建 VG。

```bash
# 创建 VG，并将 /dev/sdb1、/dev/sdc1 加入该 VG
$ vgcreate data_lvm /dev/sdb1 /dev/sdc1
  Volume group "data_lvm" successfully created

# 查看当前 vg 信息（已忽略其余无关信息）
$ vgs
  VG         #PV #LV #SN Attr   VSize   VFree 
  data_lvm     2   0   0 wz--n-  19.99g 19.99g

# 查看当前 vg 信息（已忽略其余无关信息）
$ vgdisplay
  --- Volume group ---
  VG Name               data_lvm
  System ID             
  Format                lvm2
  Metadata Areas        2
  Metadata Sequence No  1
  VG Access             read/write
  VG Status             resizable
  MAX LV                0
  Cur LV                0
  Open LV               0
  Max PV                0
  Cur PV                2
  Act PV                2
  VG Size               19.99 GiB
  PE Size               4.00 MiB
  Total PE              5118
  Alloc PE / Size       0 / 0   
  Free  PE / Size       5118 / 19.99 GiB
  VG UUID               c93cv3-hPNh-pf3U-wVb8-fb1x-Jbgn-0zjRmR
  
```

&emsp;&emsp;后续发现 VG 空间已用完，可以继续创建 PV，并通过 `vgextend` 命令扩容 VG。扩容 VG 时，应遵循以下步骤：

1. 新增磁盘；
2. 为磁盘分区: 通过 `fdisk` 命令；
3. 创建 PV: 通过 `pvcreate` 命令；
4. 将新 PV 加入到 VG: 通过 `vgextend` 命令。

```bash
# 将 /dev/sdd1 加入 VG
$ vgextend data_lvm /dev/sdd1
  Volume group "data_lvm" successfully extended

# 查看当前 vg 信息（已忽略其余无关信息）
# 原来 data_lvm 是 20G 空间的，现在变成 30G 空间了
$ vgs
  VG         #PV #LV #SN Attr   VSize   VFree  
  data_lvm     3   0   0 wz--n- <29.99g <29.99g

# 查看当前 vg 信息（已忽略其余无关信息）
$ vgdisplay
  --- Volume group ---
  VG Name               data_lvm
  System ID             
  Format                lvm2
  Metadata Areas        3
  Metadata Sequence No  2
  VG Access             read/write
  VG Status             resizable
  MAX LV                0
  Cur LV                0
  Open LV               0
  Max PV                0
  Cur PV                3
  Act PV                3
  VG Size               <29.99 GiB
  PE Size               4.00 MiB
  Total PE              7677
  Alloc PE / Size       0 / 0   
  Free  PE / Size       7677 / <29.99 GiB
  VG UUID               c93cv3-hPNh-pf3U-wVb8-fb1x-Jbgn-0zjRmR
```

### 逻辑卷（LV）管理
&emsp;&emsp;使用 `lvcreate` 命令可以创建 LV。

```bash
# 从 data_lvm 中划分 2G 空间创建 PV
#$ lvcreate -n data -L 2G data_lvm

# 将 data_lvm 的所有空闲空间创建为 PV
$ lvcreate -n data -l 100%free data_lvm
  Logical volume "data" created.

# 查看当前 vg 信息（已忽略其余无关信息）
$ lvs
  LV   VG         Attr       LSize   Pool Origin Data%  Meta%  Move Log Cpy%Sync Convert
  data data_lvm   -wi-a----- <29.99g                                                    

# 查看当前 vg 信息（已忽略其余无关信息）
$ lvdisplay
  --- Logical volume ---
  LV Path                /dev/data_lvm/data
  LV Name                data
  VG Name                data_lvm
  LV UUID                Seg4ce-aKPE-Ommi-jWTI-5fYz-Zh17-mUCMpf
  LV Write Access        read/write
  LV Creation host, time lvm, 2023-10-07 02:20:45 +0800
  LV Status              available
  # open                 0
  LV Size                <29.99 GiB
  Current LE             7677
  Segments               3
  Allocation             inherit
  Read ahead sectors     auto
  - currently set to     8192
  Block device           253:2
```

&emsp;&emsp;创建完 LV 后，就可以将其格式化成我们需要的文件系统，并将其挂载起来了。使用 PV 与普通的分区没有什么特别大差别。

```bash
# 查看当前磁盘信息（已忽略其余无关信息）
$ fdisk -l
磁盘 /dev/sdb：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：gpt
Disk identifier: FD430474-2266-4FFC-9833-ECD6DD0758C8


#         Start          End    Size  Type            Name
 1         2048     20971486     10G  Linux filesyste 
WARNING: fdisk GPT support is currently new, and therefore in an experimental phase. Use at your own discretion.

磁盘 /dev/sdc：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：gpt
Disk identifier: 01E7DC3A-08FD-4F67-A2A9-5A1E1CE15559


#         Start          End    Size  Type            Name
 1         2048     20971486     10G  Linux filesyste 
WARNING: fdisk GPT support is currently new, and therefore in an experimental phase. Use at your own discretion.

磁盘 /dev/sdd：10.7 GB, 10737418240 字节，20971520 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节
磁盘标签类型：gpt
Disk identifier: 3761C091-DDC5-4D0E-B4B6-406966949B6C


#         Start          End    Size  Type            Name
 1         2048     20971486     10G  Linux filesyste 

磁盘 /dev/mapper/data_lvm-data：32.2 GB, 32199671808 字节，62889984 个扇区
Units = 扇区 of 1 * 512 = 512 bytes
扇区大小(逻辑/物理)：512 字节 / 512 字节
I/O 大小(最小/最佳)：512 字节 / 512 字节

# 格式化 /dev/mapper/data_lvm-data
$ mkfs.xfs /dev/mapper/data_lvm-data
meta-data=/dev/mapper/data_lvm-data isize=512    agcount=4, agsize=1965312 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0, sparse=0
data     =                       bsize=4096   blocks=7861248, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal log           bsize=4096   blocks=3838, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0

# 挂载磁盘
$ mount /dev/mapper/data_lvm-data /data
```

&emsp;&emsp;挂载磁盘后，就可以像普通磁盘一样使用了。查看一下系统的挂载信息。

```bash
$ lsblk
NAME                MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda                   8:0    0   20G  0 disk 
├─sda1                8:1    0    1G  0 part /boot
└─sda2                8:2    0   19G  0 part 
  ├─centos_lvm-root 253:0    0   17G  0 lvm  /
  └─centos_lvm-swap 253:1    0    2G  0 lvm  [SWAP]
sdb                   8:16   0   10G  0 disk 
└─sdb1                8:17   0   10G  0 part 
  └─data_lvm-data   253:2    0   30G  0 lvm  /data
sdc                   8:32   0   10G  0 disk 
└─sdc1                8:33   0   10G  0 part 
  └─data_lvm-data   253:2    0   30G  0 lvm  /data
sdd                   8:48   0   10G  0 disk 
└─sdd1                8:49   0   10G  0 part 
  └─data_lvm-data   253:2    0   30G  0 lvm  /data
sr0                  11:0    1 1024M  0 rom  

$ blkid
/dev/sda1: UUID="67e7a76e-783a-43e4-ba28-4e4e1d383a67" TYPE="xfs" 
/dev/sda2: UUID="2lDpqP-KJNY-F1aB-9AgY-P3Aw-lATj-lrfApe" TYPE="LVM2_member" 
/dev/sdb1: UUID="uSZlBZ-Fhut-g4Sl-8eaa-Vu5h-sJWI-3q74vd" TYPE="LVM2_member" PARTUUID="d6aa7e82-c29b-4dff-8384-1ab1ceb847d5" 
/dev/sdc1: UUID="n3RQic-VFWi-dIzq-yBMf-DHU0-F4rh-IW4gN6" TYPE="LVM2_member" PARTUUID="041de5e9-0566-453d-9b22-f2bda864314a" 
/dev/sdd1: UUID="en3UOD-Ekwc-DBYD-sKMi-oSgP-fgCy-hZo1Zg" TYPE="LVM2_member" PARTUUID="ba71dbcf-c6ed-47a5-b40f-62ba7f6d6005" 
/dev/mapper/centos_lvm-root: UUID="f78a6136-0131-4aa6-a5a6-6dba17d4d447" TYPE="xfs" 
/dev/mapper/centos_lvm-swap: UUID="bfecaf19-c8e1-410f-8bba-e4d61fd03faa" TYPE="swap" 
/dev/mapper/data_lvm-data: UUID="6bafe067-16aa-4b92-82c2-41e8134965e2" TYPE="xfs" 
```

&emsp;&emsp;后续发现 LV 空间快用满时，可以先扩容 VG，然后再通过 `lvextend` 命令扩容 LV。扩容 LV 时，应遵循以下步骤：

1. 新增磁盘；
2. 为磁盘分区: 通过 `fdisk` 命令；
3. 创建 PV: 通过 `pvcreate` 命令；
4. 将新 PV 加入到 VG: 通过 `vgextend` 命令；
5. 扩容 LV: 通过 `lvextend` 命令；
6. 更新文件系统信息: 通过 `resize2fs`（ext4）或 `xfs_growfs`（xfs）命令。

```bash
# 扩容前先查看当前的容量信息
$ df -h
文件系统                     容量  已用  可用 已用% 挂载点
devtmpfs                     1.9G     0  1.9G    0% /dev
tmpfs                        1.9G     0  1.9G    0% /dev/shm
tmpfs                        1.9G  8.9M  1.9G    1% /run
tmpfs                        1.9G     0  1.9G    0% /sys/fs/cgroup
/dev/mapper/centos_lvm-root   17G  1.6G   16G    9% /
/dev/sda1                   1014M  195M  820M   20% /boot
tmpfs                        379M     0  379M    0% /run/user/0
/dev/mapper/data_lvm-data     30G   33M   30G    1% /data

# 将 data_lvm 下所有有空闲空间扩展到 LV
# -l +200 表示扩展指定 LE 个数
# -L +15G 表示扩展指定空间，单位有 bBsSkKmMgGtTpPeE
# -l +100%free 表示将 vg 所有可用空间都扩展
$ lvextend -l +100%free /dev/mapper/data_lvm-data
  Size of logical volume data_lvm/data changed from <30.38 GiB (7777 extents) to 39.98 GiB (10236 extents).
  Logical volume data_lvm/data successfully resized.

# 注意，lvextend 扩展 LV 的容量之后，此时的文件系统并未感知到，所以还需要使用 xfs_growfs、resize2fs 等命令来更新文件系统
# xfs_growfs 命令用于扩展 xfs 文件系统
# resize2fs 命令用于扩展 ext4 文件系统
# resize2fs /dev/mapper/data_lvm-data
$ xfs_growfs /dev/mapper/data_lvm-data
meta-data=/dev/mapper/data_lvm-data isize=512    agcount=5, agsize=1965312 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0 spinodes=0
data     =                       bsize=4096   blocks=7963648, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal               bsize=4096   blocks=3838, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
data blocks changed from 7963648 to 10481664

# 扩容之后再查看容量，可以发现 /data 目录已经由原来的 30G 扩容为 40G 了
$ df -h
文件系统                     容量  已用  可用 已用% 挂载点
devtmpfs                     1.9G     0  1.9G    0% /dev
tmpfs                        1.9G     0  1.9G    0% /dev/shm
tmpfs                        1.9G  8.9M  1.9G    1% /run
tmpfs                        1.9G     0  1.9G    0% /sys/fs/cgroup
/dev/mapper/centos_lvm-root   17G  1.6G   16G    9% /
/dev/sda1                   1014M  195M  820M   20% /boot
tmpfs                        379M     0  379M    0% /run/user/0
/dev/mapper/data_lvm-data     40G   33M   40G    1% /data
```

&emsp;&emsp;不是特别重要的原因，不要缩容 LV，缩容 LV 容易出问题。如果要缩容 LV 的话，应该遵循以下步骤：

1. 卸载正在使用的逻辑卷：通过 `unmount` 命令；
2. 检查逻辑卷的错误信息：通过 `e2fsck` 命令；
3. 更新逻辑卷的文件系统的容量信息：通过 `resize2fs` 命令；
4. 执行 LV 缩容：通过 `lvresize` 命令；
5. 执行 VG 缩容：通过 `vgreduce` 命令；
6. 移除 PV：通过 `pvremove` 命令;
7. 扩容 LV: 通过 `lvextend` 命令；
8. 更新文件系统信息: 通过 `resize2fs`（ext4）或 `xfs_growfs`（xfs）命令。

> 注意，以上操作是针对文件系统为 ext4 逻辑卷的操作。xfs 文件系统不支持缩容。

```bash
# 卸载挂载信息
$ umount /dev/mapper/data_lvm-data

# 检查逻辑卷的错误信息
$ e2fsck -f /dev/mapper/data_lvm-data

# 更新逻辑卷的文件系统的容量信息
# 缩减文件系统的容量信息，注意应多缩减一些，以免 PV 没办法移除
$ resize2fs /dev/mapper/data_lvm-data 25G

# 执行 LV 缩容
# 缩减 LV 的容量，这里是直接设置 LV 的目标容量大小。注意这个目标容量大小应该比文件系统的容量信息要稍大一些。
$ lvresize -L 28G /dev/mapper/data_lvm-data

# 执行 VG 缩容
$ vgreduce data_lvm /dev/sde1

# 删除 PV，然后就可以卸载拔出磁盘了
$ pvremove /dev/sde1

# 将 data_lvm 里面空闲的空间扩容到 LV
$ lvextend -l +100%free /dev/mapper/data_lvm-data

# 更新文件系统
$ resize2fs /dev/mapper/data_lvm-data

# 重新挂载分区
$ mount /dev/mapper/data_lvm-data /data
```

### 清除 LVM 信息
&emsp;&emsp;如果不想使用 LVM，需要删除已创建的逻辑卷，应根据以下步骤依次删除：

1. 卸载正在使用的逻辑卷：通过 `umount` 命令；
2. 删除逻辑卷：通过 `lvremove` 命令；
3. 删除卷组：通过 `vgremove` 命令；
4. 删除物理卷：通过 `pvremove` 命令。

```bash
# 卸载挂载信息
$ umount /dev/mapper/data_lvm-data

# 删除逻辑卷
$ lvremove /dev/data_lvm/data
Do you really want to remove active logical volume data_lvm/data? [y/n]: y
  Logical volume "data" successfully removed

# 删除卷组
$ vgremove data_lvm
  Volume group "data_lvm" successfully removed

# 删除物理卷
$ pvremove /dev/sde1 /dev/sdd1 /dev/sdc1 /dev/sdb1
  Labels on physical volume "/dev/sde1" successfully wiped.
  Labels on physical volume "/dev/sdd1" successfully wiped.
  Labels on physical volume "/dev/sdc1" successfully wiped.
  Labels on physical volume "/dev/sdb1" successfully wiped.
```