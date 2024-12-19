# Sendmail
## 概述
&emsp;&emsp;在运维过程中，很多软件在出现问题时，可以通过邮件的形式向相关干系人发送通知。这里记录一下如何配置 Sendmail 通过腾讯企业邮发送邮件。

## 配置
### 安装

```bash
# 安装服务
$ yum install -y sendmail mailx

# 启动服务
$ systemctl start sendmail && systemctl enable sendmail
```

### 单帐户配置
&emsp;&emsp;编辑 `/etc/mail.rc` 文件，内容如下:

```bash
set smtp=smtp.exmail.qq.com:465
set smtp-auth=login
set smtp-auth-user=support@central-x.com
set smtp-auth-password=x.123456
set ssl-verify=ignore
set from=support@central-x.com
```

### 多帐户配置
&emsp;&emsp;编辑 `/etc/mail.rc` 文件，内容如下:

```bash
account 126 {
    set smtp=smtps://smtp.126.com:465
    set smtp-auth=login
    set smtp-auth-user=<account>@126.com
    set smtp-auth-password=<password>
    set ssl-verify=ignore
    set nss-config-dir=/etc/pki/nssdb
    set from=<acount>@126.com
}

account qq {
    set smtp=smtp.qq.com
    set smtp-auth=login
    set smtp-auth-user=<account>@qq.com
    set smtp-auth-password=<password>
    set ssl-verify=ignore
    set nss-config-dir=/etc/pki/nssdb
    set from=<acount>@qq.com
}
```

### 发送邮件

```bash
# 多帐户时，通过 -A 指定通过哪个帐户发送
$ echo 'from 126' | mail -A qq -s 'mail test' <account>@example.com

# 查看发送队列
$ mailq

# 查看 sendmail 日志
$ tail -f /var/log/maillog
```