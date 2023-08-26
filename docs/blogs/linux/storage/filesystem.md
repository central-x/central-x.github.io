# 文件系统
## 概述
&emsp;&emsp;在使用分区前，需要对分区进行格式化。格式化是指将分区格式化成不同的文件系统。Linux 在使用硬盘时，并不是直接读写物理硬盘设备，而是通过文件系统来管理和访问硬盘上的文件，因此格式化时，我们需要为磁盘指定文件系统。Linux 支持非常多种文件系统类型，如 Ext4、XFS、ZFS、Btrfs 等等[[链接](https://zhuanlan.zhihu.com/p/571235218)]。

## 格式化
&emsp;&emsp;在 Linux 中，一般通过 `mkfs` 命令来格式化分区。

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
