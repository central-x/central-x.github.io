# Linux 权限
## 概述
&emsp;&emsp;Linux 通过用户、用户组、文件属性来控制用户权限。

## 基础概念
### 用户
&emsp;&emsp;Linux 下有三类用户：

- 超级用户（root）：拥有一切权限，<font color=red>可以做任何事情，不受限制</font>，相当于管理员。
- 普通用户：人类用户使用的帐户，只<font color=red>可以做有限权限</font>的事情。超出权限时需要使用 `sudo` 来提升权限，相当于使用 root 用户来执行。
- 系统用户：系统用户通常是为了运行系统服务、守护进程或其他后台任务而创建的用户。系统用户与普通用户的权限控制方式没有区别。

&emsp;&emsp;系统用户与普通用户的主要区别如下：

- UID 范围：系统用户的 UID 通常位于 0~999；普通用户的 UID 通常在 1000 及以上，但这不是强制要求；
- 家目录：系统用户一般没有家目录；普通用户通常有一个与用户名相对应的家目录，位于 `/home` 下；
- 登录 shell：系统用户的登录 shell 通常设置为 `/sbin/nologin` 或 `/usr/sbin/nologin`，意味着它们不能通过 shell 登录系统；普通用户一般使用 `bash`、`zsh` 等可以登录的 shell；

```bash
# 添加用户
# -r：创建系统用户，系统用户不能登录
# -m：创建用户时，同时创建用户主目录
# -g：指定用户所属用户组
# -u：指定用户 UID
# -p：用户密码
$ adduser -m -g normal -u 1000 <username>

# 设置用户密码
# 如果 <username> 参数缺失，则设置 root 用户密码
$ passwd <username>

# 切换用户
# 如果 <username> 参数缺失，则切换为 root
$ su <username>

# 获取当前用户
$ whoami

# 删除普通用户（必须以 root 执行）
$ userdel -r <username>
```

::: tip 提示
&emsp;&emsp;在部份 Linux 发行版中，如果创建用户（`adduser`）时不指定用户组（`-g`），系统会自动创建与用户同名的用户组，因此在创建用户前，建议先手动创建用户组。
:::

&emsp;&emsp;所有的用户信息都保存在 `/etc/passwd` 文件里，通过以下命令可以获取用户清单：

```bash
# 获取所有用户的信息，使用 : 号隔开后，每一段的含义如下：
# 1. 用户名（Username）
# 2. 用户口令（Password）。现代 Unix/Linux 系统中，将密码保存到 /etc/shadow 文件中
# 3. 用户标识号（User ID，UID）
# 4. 用户组标识号（Group ID，GID）
# 5. 注释性描述（GECOS field）
# 6. 用户主目录（Home Director）
# 7. 登录 Shell（Shell）
$ cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
...

# 只获取用户名列表
$ cut -d: -f1 /etc/passwd
root
bin
daemon
...
```

### 用户组
&emsp;&emsp;用户组（Group）在 Linux 系统中用于表示一组用户的集合。每个用户都可以属于一个或多个用户组，每个用户组可以包含多个用户。

&emsp;&emsp;用户组具有以下功能：

- 权限管理：通过用户组，管理员可以更方便地管理一组用户的权限。例如，可以为某个用户组设置指定的文件或目录访问权限，而无需单独为每个用户设置权限；
- 资源共享：在某些情况下，多个用户可能需要共享对某些资源的访问权限。通过将这些用户添加到同一个用户组，可以方便地实现资源共享。
- 简化管理：当需要修改一组用户的权限时，只需要修改用户组的权限即可，而无需逐个修改用户的权限，这大大简化了权限管理过程。

&emsp;&emsp;用户组与用户一样，也区分系统组和普通用户组。系统组主要用于系统服务或守护进程的用户，而不是用于普通的用户帐户。系统组的 GID 通常位于 0 ~ 500；需要注意，虽然 `-r` 参数可以用于创建系统组，但是<font color=red>没有任何强制性的限制</font>来确保系统组只用于系统服务，这只是一个约定，用于区分系统组和普通用户组。

```bash
# 添加用户组
# -r：创建系统组
# -g：指定用户组 GID
$ groupadd -g 1000 <groupname>

# 删除用户组
$ groupdel <groupname>

# 修改用户组
# -g：修改 GID
# -n：修改用户组名称
$ groupmod -n <new-groupname> <groupname>

# 设置用户组密码
# 后续使用该密码管理用户组
# 现代 Unix/Linux 系统中很少使用此功能，通常使用 sudo 命令完成
$ gpasswd <groupname> 

# 操作用户组成员
# 用法：groupmems -g <groupname> [动作]
# 常用动作：
# -l：列出组中所有成员
# -a <username>：添加用户到组
# -d <username>：删除用户
$ groupmems -g <groupname> -a <username>
```

&emsp;&emsp;所有的用户组信息都保存在 `/etc/group` 文件里，通过以下命令可以获取用户组清单：

```bash
# 获取所有用户组的信息，使用 : 号隔开后，每一段的含义如下：
# 1. 用户组名称（Group Name）
# 2. 用户组密码（Password）。现代 Unix/Linux 系统中很少使用，通常使用 sudo 命令完成
# 3. 用户组标识号（Group ID，GID）
# 4. 用户列表（User List）。每个用户之间使用逗号分隔
$ cat /etc/group
root:x:0:
bin:x:1:
daemon:x:2:
sys:x:3:
...

# 只获取用户名列表
$ cut -d: -f1 /etc/group
root
bin
daemon
...
```

### 文件属性
&emsp;&emsp;通过 `ls -all` 或 `ll` 命令可以查看文件属性。

```bash
$ ll
总用量 4
drwxr-xr-x. 2 alan normal  6 2月  24 21:00 directory
-rw-rw-r--. 1 alan normal 15 2月  24 21:00 file.txt
```

&emsp;&emsp;上述命令执行结果详细解读：

![](./assets/permission.svg)

- 文件类型标识：Linux 此标识区分文件类型，而不是以后缀名
  - `d`：目录文件
  - `-`：普通文件
  - `l`：软链接
  - `b`：块设备文件
  - `p`：管道文件
  - `c`：字符设备文件
  - `s`：套接字文件
- 权限标识：`r`（可读）、`w`（可写）、`x`（可执行）

| 权限标识 | 二进制 | 8进制 | 文件权限说明  | 目录权限说明        |
|------|-----|-----|---------|---------------|
| r--  | 100 | 4   | 可读取文件内容 | 可以浏览目录(`ls`)  |
| -w-  | 010 | 2   | 可修改文件内容 | 可以在目录内创建、删除文件 |
| --x  | 001 | 1   | 可执行文件   | 可以进入目录(`cd`)  |

- 硬链接数
- 文件所属用户
- 文件所属组
- 文件大小：字节，可以在命令后面添加 `-h` 参数输出更符合人类阅读习惯的文本
- 文件最新修改日期
- 文件名

## 权限控制
&emsp;&emsp;在上面的基础概念中，我们已经了解了用户、用户组和文件属性，接下来我们看看如何控制权限。

### 访问权限
&emsp;&emsp;Linux 通过文件属性来控制文件的访问权限。在文件属性中，我们已知访问权限由 3 组、每组 3 位标识符组成，这些标识符用于控制文件访问者的权限。

- 文件所属用户：前 3 位标识符用于控制<font color=red>文件所属用户</font>的访问权限；
- 文件所属组：中间 3 位标识符用于控制<font color=red>文件所属组下所有用户</font>的访问权限；
- 其他用户：后 3 位标识符用于控制除了以上情况，<font color=red>其他用户</font>的访问权限。

::: warning 警告
&emsp;&emsp;root 用户可以忽略以上所有限制，拥有最高权限，因此应有限范围内使用 root 帐号。
:::

### 修改文件所属用户/组
&emsp;&emsp;使用 `chown` 命令来修改文件所属用户/组。

```bash
# 修改文件所属用户/组
# -R：递归修改
$ chown [-R] <username>:<groupname> <filename>

# 查看当前文件属性
$ ll
总用量 4
drwxr-xr-x. 2 alan normal  6 2月  24 21:00 directory
-rw-rw-r--. 1 alan normal 15 2月  24 21:00 file.txt

# 将 file.txt 的所属用户改为 yan
# 需要提升权限（sudo）或切换为 root 用户执行 chown
$ sudo chown yan:normal file.txt

# 再次查看文件属性
# 可以发现文件所属用户已经由 alan 修改为 yan
$ ll
总用量 4
drwxr-xr-x. 2 alan normal  6 2月  24 21:00 directory
-rw-rw-r--. 1 yan  normal 15 2月  24 21:00 file.txt
```

### 修改文件所属组
&emsp;&emsp;使用 `chgrp` 命令来修改文件所属组。

```bash
# 修改文件所属组
# -R：递归修改
$ chgrp [-R] <groupname> <filename>

# 查看当前文件属性
$ ll
总用量 0
drwxr-xr-x. 2 alan normal 6 2月  24 21:00 directory
-rw-r-----. 1 alan normal 0 2月  24 21:00 file.txt

# 将 file.txt 的所属组改为 admin
# 需要提升权限（sudo）或切换为 root 用户执行 chown
$ sudo chgrp admin file.txt

# 再次查看文件属性
# 可以发现文件所属组已经由 normal 修改为 admin
$ ll
总用量 0
drwxr-xr-x. 2 alan normal 6 2月  24 21:00 directory
-rw-r-----. 1 alan admin  0 2月  24 21:00 file.txt
```

### 修改文件访问权限
&emsp;&emsp;使用 `chmod` 命令来修改文件权限。`chmod` 修改文件权主要使用以下两种方法：

用法一，在当前的权限的基础上修改（增/删/覆盖）局部权限：

- `+`/`-`/`=`权限字符
  - +：为指定用户/用户组增加权限字符代表的权限
  - -：为指定用户/用户组取消权限字符代表的权限
  - =：为指定用户/用户组赋予权限字符代表的权限
- 授权范围：
  - u：文件所属用户
  - g：文件所属组
  - o：其它用户
  - a：以上所有

```bash
# 修改文件权限
# -R：递归修改
$ chmod [-R] [u/g/o/a][+/-/=][r/w/x] <filename>

# 查看当前文件属性
$ ll
总用量 0
drwxr-xr-x. 2 alan normal 6 2月  24 21:00 directory
-rw-r--r--. 1 alan normal 0 2月  24 21:00 file.txt

# 为文件所属组添加写权限
$ chmod g+w file.txt

# 再次查看文件属性
# 可以看到第二组权限（文件所属组权限）已被加上了 w 权限
$ ll
总用量 0
drwxr-xr-x. 2 alan normal 6 2月  24 21:00 directory
-rw-rw-r--. 1 alan normal 0 2月  24 21:00 file.txt

# 回收文件所属组的写权限，同时回收其他用户的查看权限
$ chmod g-w,o-r file.txt

# 再次查看文件属性
# 可以看到第二组权限（文件所属组权限）的 w 权限已被回收，其它用户的 r 权限已被回收
$ ll
总用量 0
drwxr-xr-x. 2 alan normal 6 2月  24 21:00 directory
-rw-r-----. 1 alan normal 0 2月  24 21:00 file.txt
```

用法二，使用 3 位八进制数据进行重新授权：

&emsp;&emsp;在上面的章节中，我们已知可以使用八进制 4 表示可读（`r`）权限，使用 2 表示可写（`w`）权限，使用 1 表示可执行（`x`）权限。基于以上，我们可以仅使用一个数字表示所有权限组合，如：

- 7：用于表示可读、可写、可执行（`rwx`）权限
- 6：用于表示可读、可写（`rw-`）权限
- 5：用于表示可读、可执行（`r-x`）权限
- 4：用于表示可读（`r--`）权限
- 3：用于表示可写、可执行（`-wx`）权限
- 2：用于表示可写（`-w-`）权限
- 1：用于表示可执行（`--x`）权限
- 0：表于表示没有任何权限（`---`）

&emsp;&emsp;由于可以通过一个数字表示权限组合，因此我们可以使用 3 位数字来同时修改三个权限组的权限标识。如 `764` 表示文件所属用户有可读、可写、可执行权限，文件所属组有可读、可写权限，其它用户有可读权限。

::: warning 警告
&emsp;&emsp;如果使用 4 位数字来表示权限，第一位必须为 0，如 `0764`。如果第一位不为 0，将可能引起授权异常（主要是第一位数字含义不好记忆）。
:::


```bash
# 修改文件权限
# -R：递归修改
$ chmod [-R] [num] <filename>

# 查看当前文件属性
$ ll
总用量 0
drwxr-xr-x. 2 alan normal 6 2月  24 21:00 directory
-rw-r--r--. 1 alan normal 0 2月  24 21:00 file.txt

# 为所有用户授予可读、可写权限
$ chmod 666 file.txt

# 再次查看文件属性
# 可以看到所有权限组都具有可读、可写权限
$ ll
总用量 0
drwxr-xr-x. 2 alan normal 6 2月  24 21:00 directory
-rw-rw-rw-. 1 alan normal 0 2月  24 21:00 file.txt
```

### 文件权限掩码
&emsp;&emsp;Linux 在创建文件时，默认权限是 `666`；在创建目录时，默认权限是 `777`。但实际用户在创建的文件和目录时，看到的权限往往不是上面这个值。这是因为不同的 Linux 发行版会根据自己的需求去控制不同用户创建文件/目录时的默认权限。这个修改默认权限的过程，就是通过文件权限掩码（`umask`）来完成的。

&emsp;&emsp;用户在创建文件/目录时，其默认权限通过 `mask & ~umask` 计算而来。以 CentOS 7 的 umask 为 `0022` 为例，当用户创建文件/目录时，其权限的默认值的计算过程如下：

![](./assets/umaks.svg)

```bash
# 查看当前系统的文件权限掩码
$ umask
0022

# 创建文件和目录，用于验证
$ touch file.txt
$ mkidr directory

# 查看权限
$ ll
总用量 0
drwxr-xr-x. 2 root root 6 2月  24 21:00 directory
-rw-r--r--. 1 root root 0 2月  24 21:00 file.txt
```

&emsp;&emsp;`umask` 的值是可以修改的（一般不建议修改），比如我们可以将权限修改为 `003`，然后再来验证一下：

```bash
# 修改当前系统的文件权限掩码
$ umask 003

# 查看是否修改成功
$ umask
0003

# 创建文件和目录，用于验证
$ touch file.txt
$ mkidr directory

# 查看权限，使用新的文件权限掩码可得默认的权限如下：
# 目录：774
# 文件：664
$ ll
总用量 0
drwxrwxr--. 2 root root 6 2月  24 21:00 directory
-rw-rw-r--. 1 root root 0 2月  24 21:00 file.txt
```

## 高级权限
### 粘滞位
&emsp;&emsp;在 Linux 权限中，粘滞位（sticky bit）是一个特殊的权限位，<font color=red>主要用于目录</font>，而非普通文件。当目录被设置了粘滞位后，它将具有以下特性：

- 这个目录的所属用户和所属组一般设置为 `root:root`；
- 这个目录一般被授予 `o+rwx` 权限（在这个权限的基础上添加粘滞位属性），也就是任意用户都可以访问这个目录，也可以在这个目录下创建文件/子目录；
- 这些文件和子目录只能由文件/目录的所有者或 root 用户删除或重命名。

&emsp;&emsp;以上特性提供了一种机制用于创建用户数据共享目录，同时可以保护系统中的共享目录（如 `/tmp`）中的文件不被其他用户误删或恶意操作。

```bash
# 为目录添加相关权限，同时设置粘滞位
$ chmod o+rwx <directory>
$ chmod +t <directory>
```

&emsp;&emsp;我们接下来通过以下两个实验来测试粘滞位效果：

```bash
#######################################################
# 不带粘滞位共享目录

# 使用 root 用户创建共享共享目录，给所有用户添加权限
$ mkdir /share
$ chmod a+rwx /share

# 查看 /share 目录属性
$ ls -all /share
总用量 0
drwsrwxrwx.  2 root root   6 2月  27 21:00 .
dr-xr-xr-x. 20 root root 266 2月  27 21:00 ..

# 使用 yan 用户创建文件
$ su yan
$ echo hello > yan.txt

# 使用 alan 用户删除文件，删除成功
$ su alan
$ rm -f yan.txt

#######################################################
# 带粘滞位共享目录

# 使用 root 用户创建共享目录，给所有用户添加权限，并为这个共享目录设置粘滞位
$ mkdir /share
$ chmod a+rwx /share
$ chmod +t /share

# 查看 /share 目录属性，可以发现共享目录最后一位权限标识为 t
$ ls -all /share
总用量 0
drwsrwxrwt.  2 root root   6 2月  27 21:00 .
dr-xr-xr-x. 20 root root 266 2月  27 21:00 ..

# 使用 yan 用户创建文件
$ su yan
$ echo hello > yan.txt

# 使用 alan 用户删除文件，提示无法删除
$ su alan
$ rm -f yan.txt
rm: 无法删除"yan.txt": 不允许的操作
```

&emsp;&emsp;以上实验结果表明，不带有沾滞位的共享目录下的文件可以被任意用户删除，而带有沾滞位的共享目录下的文件只能由文件所属用户删除，因此沾滞位权限可以有效保护共享目录文件的安全性。

::: tip 提示
&emsp;&emsp;如果目录没有可执行权限（`x`），那么粘滞位标识符为大写的 `T`；如果目录有可执行权限，那么粘滞位标识符为小写的 `t`。如果目录最后一位是大写的 `T`，那么所有其他用户都无法在这个目录下写入、读取、删除所有子文件，因此也就不具备共享的功能了。

&emsp;&emsp;注意，粘滞位不影响文件的读取、写入或执行权限，它仅影响这个目录下的所有文件/子目录的删除和重命名操作（不包括子目录）。
:::