# 使用 Let's Encrypt 获取证书
## 概述
&emsp;&emsp;之前一直是使用阿里云的免费版 SSL 证书，但是现在阿里云免费版 SSL 证书的有效期从一年缩减到了三个月，因此改用 Let's Encrypt 提供的证书服务。本文档主要记录如何通过 Docker 申请和续期证书。

## 操作步骤
### 申请证书
&emsp;&emsp;Let's Encrypt 提供了一个 Docker 镜像[[链接](https://hub.docker.com/r/certbot/certbot)]用于申请和续期证书，因此我们可以使用该镜像来简化操作。

&emsp;&emsp;在服务器创建 docker-compose 目录，并在目录下创建 `docker-compose.yml` 文件，文件内容如下:

```yaml
version: "3"

services:
  certbot:
    image: certbot/certbot:latest
    container_name: certbot
    volumes:
      - ./certbot/etc/:/etc/letsencrypt
      - ./certbot/lib:/var/lib/letsencrypt
      - ./certbot/log:/var/log/letsencrypt
      - ./certbot/www:/var/www
    networks:
      - default

networks:
  default:
    name: svc
    driver: bridge
```

&emsp;&emsp;在 docker-compose 目录下，执行以下命令申请证书:

```bash
# 申请证书
# 在接下来的提示里，完成以下步骤:
# 1. 填写你的联系邮箱
# 2. 同意条款
# 3. 同意将你的联系邮箱分享给 Electronic Frontier Foundation
# 4. 在域名服务商那边添加一条 TXT 记录，主机名为 _acme-challenge，值为下面的随机字符串。待新 TXT 记录生效后，回车继续命令，完成证书生成工作
$ docker-compose run certbot certonly \
 --preferred-challenges dns \
 --manual -d *.central-x.com


Saving debug log to /var/log/letsencrypt/letsencrypt.log
Enter email address (used for urgent renewal and security notices)
 (Enter 'c' to cancel): your@email.com

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Please read the Terms of Service at
https://letsencrypt.org/documents/LE-SA-v1.4-April-3-2024.pdf. You must agree in
order to register with the ACME server. Do you agree?
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
(Y)es/(N)o: yes

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Would you be willing, once your first certificate is successfully issued, to
share your email address with the Electronic Frontier Foundation, a founding
partner of the Let's Encrypt project and the non-profit organization that
develops Certbot? We'd like to send you email about our work encrypting the web,
EFF news, campaigns, and ways to support digital freedom.
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
(Y)es/(N)o: yes
Account registered.
Requesting a certificate for *.central-x.com

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Please deploy a DNS TXT record under the name:

_acme-challenge.central-x.com.

with the following value:

XFw8UCnO1MUmk9l0wFzGj-POU7TPOqto-Hx6wfTBccs

Before continuing, verify the TXT record has been deployed. Depending on the DNS
provider, this may take some time, from a few seconds to multiple minutes. You can
check if it has finished deploying with aid of online tools, such as the Google
Admin Toolbox: https://toolbox.googleapps.com/apps/dig/#TXT/_acme-challenge.central-x.com.
Look for one or more bolded line(s) below the line ';ANSWER'. It should show the
value(s) you've just added.

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Press Enter to Continue

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/central-x.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/central-x.com/privkey.pem
This certificate expires on 2024-06-10.
These files will be updated when the certificate renews.

NEXT STEPS:
- This certificate will not be renewed automatically. Autorenewal of --manual certificates requires the use of an authentication hook script (--manual-auth-hook) but one was not provided. To renew this certificate, repeat this same certbot command before the certificate's expiry date.
We were unable to subscribe you the EFF mailing list because your e-mail address appears to be invalid. You can try again later by visiting https://act.eff.org.

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
If you like Certbot, please consider supporting our work by:
 * Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
 * Donating to EFF:                    https://eff.org/donate-le
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

::: tip 提示
&emsp;&emsp;以上命令在国内运行可能会报请求无法建立的错误（Failed to establish a new connection），因此建议在外网服务器上运行该命令。

&emsp;&emsp;可以通过 Play with Docker 项目[[链接](https://labs.play-with-docker.com)]提供的环境去生成证书，再拉回本地使用。
:::

### 更新证书
&emsp;&emsp;使用以下命令更新证书。

```yaml
# 更新证书（使用之前的参数）
$ docker-compose run certbot renew
```

&emsp;&emsp;如果需要定时更新，可以通过在 crontab 里面添加以下定时任务（<font color=red>未验证是否可行</font>）：

```bash
# 每三十天更新一次证书
0 0 */30 * * cd /root/docker-compose && docker-compose run certbot renew --quiet --renew-hook "docker exec nginx nginx -s reload" > /dev/null  2>&1
```