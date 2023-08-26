# 挂载
## 概述
&emsp;&emsp;在 Linux 系统中，我们如果需要向磁盘写入数据时，需要提前挂载磁盘。挂载磁盘的过程，就是将一个目录和磁盘（或分区）建立印射关系的过程，挂载后，这个目录相当于这个磁盘的访问入口，向挂载目录写入数据就相当于向磁盘写入数据。

&emsp;&emsp;挂载时，如果挂载点的目录有文件，那么文件会被隐藏。因此挂载目录时，最好新建一个空文件夹来作为挂载点目录。
## 挂载点目录
&emsp;&emsp;Linux 系统的根目录中，存在着 `media` 和 `mnt` 目录，这两个目录被叫做挂载点目录。我们可以在这个目录下创建一个空目录作为磁盘的挂载点。除此之外，也可以在其它合适的地方建立一个空目录作为挂载点。

## 挂载
### 临时挂载
&emsp;&emsp;通过 `mount` 命令可以临时挂载磁盘到指定目录。

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

&emsp;&emsp;通过 `umount` 命令可以解除挂载关系。

```bash
# 解除挂载目录
$ unmount /data

# 解除磁盘的所有挂载
$ unmount /dev/sdb1
```

### 永久挂载（自动挂载）
&emsp;&emsp;通过 `mount` 命令只能临时挂载分区，重启动挂载关系就会失效。如果想做到开机时自动挂载磁盘，可能将挂载信息写入挂载表。

```bash
# 修改挂载表 /etc/fstab 文件，在文件最后面添加以下内容
$ nano /etc/fstab

/dev/sdb1    /data    xfs    defaults    0 0
```

&emsp;&emsp;挂载表在修改完后不会立即生效，可以通过 `mount -a` 命令来让内核读取该文件。系统在启动时也会读取该文件，因此重启时做到自动挂载磁盘。
