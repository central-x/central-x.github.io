# SSH Keys
## 概述
&emsp;&emsp;在使用 Git 的过程中、运维 Linux 的过程中，会经常使用到 SSH Keys，用于做安全传输和安全认证。SSH Keys 分为公钥和私钥：

- 公钥：用于分发，可以将公钥分布到 Git、待远程的 Linux 服务器上等。公钥不会造成安全问题。
- 私钥：需自行保护好，如果丢失将造成重大安全问题。如果私钥丢失，你需要重置所有该私钥可以访问的服务。

## 密钥对管理
### 生成密钥对
&emsp;&emsp;SSH Keys 存在着多种类型:

| 加密算法        | 默认公钥名称            | 默认私销名称        | 补充说明                                                                      |
|-------------|-------------------|---------------|---------------------------------------------------------------------------|
| ED25519（推荐） | id_ed25519.pub    | id_ed25519    | 推荐密钥对类型，在安全性和性能上都比 RSA 更好。在 OpenSSH 6.5（2014年发布）之后受支持。                    |
| ED25519_SK  | id_ed25519_sk.pub | id_ed25519_sk | 需要 OpenSSH 8.2 及以上版本支持                                                    |
| ECDSA_SK    | id_ecdsa_sk.pub   | id_ecdsa_sk   | 需要 OpenSSH 8.2 及以上版本支持                                                    |
| RSA         | id_rsa.pub        | id_rsa        | 最常用的密钥对类型，但更推荐使用 ED25519 类型。如果要用 RSA，建议 Key 的大小最少为 2048 位，以提升 RSA 密钥对的安全性 |
| DSA         | id_dsa.pub        | id_dsa        |                                                                           |
| ECDSA       | id_ecdsa.pub      | id_ecdsa      |                                                                           |


```bash
# 生成 ED25519 类型的密钥对
# <comment> 修改为这个密钥的描述，可以设置为你的邮箱地址等
$ ssh-keygen -t ed25519 -C "<comment>"

# 生成 2048 位 RSA 类型的密钥对
# $ ssh-key -t rsa -b 2048 -C "<comment>"

# 输入密钥存放位置，默认保存到 ~/.ssh 目录下
# ssh 协议默认读取该目录下的 ssh keys
# 直接回车表示接受保存到默认目录
Generating public/private ed25519 key pair.
Enter file in which to save the key (/root/.ssh/id_ed25519): 

# 输入密钥对的密码
# 如果设置了密码，那么每次使用私钥时，都需要输入私钥的密码，这样即使私钥丢失了，也还有一定的安全性
Enter passphrase (empty for no passphrase): 
Enter same passphrase again: 

# 生成成功
The key fingerprint is:
SHA256:qgO3DwJIMs8VitSmA0MdbuhVG1hJL/7MuCZG6bMs5Uo cluster.k8s
The key's randomart image is:
+--[ED25519 256]--+
|.oo.*=.          |
|+.o*.o+          |
|=+++.o .         |
|=*o.. .          |
|o.+ ..  S        |
| ..+. =.         |
| E*o.o.+         |
|...Bo+.          |
| .+o*+.          |
+----[SHA256]-----+
```

### 修改密钥对密码
&emsp;&emsp;通过以下命令，可以修改密钥对的密码:

```bash
# 修改 id_ed25519 密钥对的密码
$ ssh-keygen -p -f ~/.ssh/id_ed25519

# 输入原密码
Enter old passphrase: 

# 输入新密码
Key has comment 'cluster.k8s'
Enter new passphrase (empty for no passphrase): 

# 再次输入新密码
Enter same passphrase again: 

# 修改成功
Your identification has been saved with the new passphrase.
```

## 免密登录 Linux
&emsp;&emsp;远程运维 Linux 时，经常需要输入服务器的密码，而且服务器的密码一般都比较长、复杂，登录起来比较麻烦。可以通过以下命令，使用 SSH Keys 来做登录认证，从而达到免密而又安全地登录 Linux 服务器。

```bash
# 将公钥添加到 Linux 服务器的信任列表中
# 命令格式为 ssh-copy-id -i ~/.ssh/id_ed25519.pub <user>@<server>
# <user> 为 Linux 服务器的用户名，如 root
# <server> 为 Linux 的访问地址，如 192.168.0.100
$ ssh-copy-id -i ~/.ssh/id_ed25519.pub root@master.cluster.k8s
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/root/.ssh/id_ed25519.pub"
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys

# 输入登录服务器的密码
root@master.cluster.k8s's password: 

# 密钥对已成功添加到服务器中
Number of key(s) added: 1

Now try logging into the machine, with:   "ssh 'root@master.cluster.k8s'"
and check to make sure that only the key(s) you wanted were added.
```

&emsp;&emsp;测试是否可以免密登录服务器：

```bash
# 测试是否可以免密登录服务器
$ ssh root@master.cluster.k8s

# 输入密钥对密码
# 如果你的密钥对没有密钥，将跳过此步骤
Enter passphrase for key '/root/.ssh/id_ed25519': 

# 成功登录到服务器
Last login: Tue Aug  1 22:35:15 2023 from svc.cluster.k8s
```