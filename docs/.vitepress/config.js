import {defineConfig} from "vitepress";
import {withMermaid} from "vitepress-plugin-mermaid";

export default withMermaid(
    defineConfig({
        title: "CentralX",
        description: "Fullstack DevSuit",
        head: [
            ["link", {rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png"}],
            ["link", {rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png"}],
            ["link", {rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png"}],
            ["link", {rel: "manifest", href: "/site.webmanifest"}],
            ["link", {rel: "mask-icon", href: "/safari-pinned-tab.svg", color: "#666666"}],
            ["meta", {name: "apple-mobile-web-app-title", content: "CentralX"}],
            ["meta", {name: "application-name", content: "CentralX"}],
            ["meta", {rel: "msapplication-TileColor", content: "#2b5797"}]
        ],
        lastUpdated: true,
        cleanUrls: 'with-subfolders',
        themeConfig: {
            logo: "/logo.svg",
            title: "CentralX",
            outline: "deep",
            socialLinks: [
                {icon: "github", link: "https://github.com/central-x"}
            ],
            editLink: {
                pattern: "https://github.com/central-x/central-x.github.io/tree/main/docs/:path",
                text: "Edit this page on GitHub"
            },
            nav: [
                {
                    text: "Central Framework",
                    items: [
                        {text: "Java", link: "/framework/java/", activeMatch: '/framework/java/'},
                        {text: "JavaScript", link: "/framework/javascript/", activeMatch: '/framework/javascript/'},
                        {text: "Android", link: "/framework/android/", activeMatch: '/framework/android/'},
                        {text: "iOS", link: "/framework/ios/", activeMatch: '/framework/ios/'}
                    ]
                },
                {
                    text: "Central Studio",
                    items: [
                        {text: "Central Studio", link: "/studio/"},
                        {text: "Central Dashboard", link: "/studio/dashboard/"},
                        {text: "Central Gateway", link: "/studio/gateway/"},
                        {text: "Central Security", link: "/studio/security/"},
                        {text: "Central Storage", link: "/studio/storage/"},
                        {text: "Central Multicast", link: "/studio/multicast/"},
                        {text: "Central Logging", link: "/studio/logging/"},
                        {text: "Central Provider", link: "/studio/provider/"},
                    ]
                },
                {text: "Blogs", link: "/blogs/"}
            ],
            sidebar: {
                "/framework/": [
                    // { text: "Framework Java", link: "/framework/java/guide" },
                    {
                        text: "Java Framework",
                        items: [
                            {text: "Summary", link: "/framework/java/"},
                            {
                                text: "central-stdlib",
                                items: [
                                    {text: "Summary", link: "/framework/java/stdlib/"},
                                    {text: "Http", link: "/framework/java/stdlib/http"},
                                    {text: "ORM", link: "/framework/java/stdlib/orm"},
                                ]
                            },
                            {text: "central-starter-cache", link: "/framework/java/cache"},
                            {text: "central-starter-graphql", link: "/framework/java/graphql"},
                            {text: "central-starter-graphql-stub", link: "/framework/java/graphql-stub"},
                            {text: "central-starter-logging", link: "/framework/java/logging"},
                            {text: "central-starter-security", link: "/framework/java/security"},
                        ]
                    },
                    {
                        text: "JavaScript Framework",
                        items: [
                            {text: "Summary", link: "/framework/javascript/"}
                        ]
                    },
                    {
                        text: "Android Framework",
                        items: [
                            {text: "Summary", link: "/framework/android/"}
                        ]
                    },
                    {
                        text: "iOS Framework",
                        items: [
                            {text: "Summary", link: "/framework/ios/"}
                        ]
                    },
                ],
                "/studio/": [
                    {
                        text: "Central Studio",
                        items: [
                            {text: "Summary", link: "/studio/"},
                            // {text: "Service Specification", link: "/studio/service-specification"},
                            // {text: "Tenant Specification", link: "/studio/tenant-specification"},
                            // {text: "Deployment", link: "/studio/deployment"},
                            {text: "Changelog", link: "/studio/changelog"},
                        ]
                    },
                    {
                        text: "Central Dashboard",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "Summary", link: "/studio/dashboard/"},
                            // {
                            //     text: "Guide",
                            //     items: [
                            //         {
                            //             text: "Saas",
                            //             items: [
                            //                 {text: "Application", link: "/studio/dashboard/guide/saas/application"},
                            //                 {text: "Tenant", link: "/studio/dashboard/guide/saas/tenant"}
                            //             ]
                            //         }, {
                            //             text: "System",
                            //             items: [
                            //                 {text: "Dictionary", link: "/studio/dashboard/guide/system/dictionary"},
                            //                 {text: "Database", link: "/studio/dashboard/guide/system/database"}
                            //             ]
                            //         }, {
                            //             text: "Authority",
                            //             items: [
                            //                 {text: "Menu", link: "/studio/dashboard/guide/authority/menu"},
                            //                 {text: "Role", link: "/studio/dashboard/guide/authority/role"}
                            //             ]
                            //         },
                            //     ]
                            // },
                            // {
                            //     text: "Deployment",
                            //     items: [
                            //         {text: "Summary", link: "/studio/dashboard/deployment/"},
                            //         {text: "Environment", link: "/studio/dashboard/deployment/environment"},
                            //         {text: "Steps", link: "/studio/dashboard/deployment/steps"},
                            //         {text: "FAQ", link: "/studio/dashboard/deployment/faq"}
                            //     ]
                            // },
                        ]
                    },
                    {
                        text: "Central Gateway",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "Summary", link: "/studio/gateway/"},
                            {text: "Integration", link: "/studio/gateway/integration"},
                            // {
                            //     text: "Deployment",
                            //     items: [
                            //         {text: "Summary", link: "/studio/gateway/deployment/"},
                            //         {text: "Environment", link: "/studio/gateway/deployment/environment"},
                            //         {text: "Steps", link: "/studio/gateway/deployment/steps"},
                            //         {text: "FAQ", link: "/studio/gateway/deployment/faq"}
                            //     ]
                            // },
                        ]
                    },
                    {
                        text: "Central Security",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "Summary", link: "/studio/security/"},
                            {
                                text: "REST API", 
                                items: [
                                    {text: "获取登录选项", link: "/studio/security/api/get-login-option"},
                                    {text: "获取验证码", link: "/studio/security/api/get-captcha"},
                                    {text: "登录", link: "/studio/security/api/login"},
                                    {text: "退出登录", link: "/studio/security/api/logout"},
                                ]
                            }, 
                            {
                                text: "SSO",
                                items: [
                                    {text: "Summary", link: "/studio/security/sso/"},
                                    {
                                        text: "CAS", 
                                        items: [
                                            {text: "Summary", link: "/studio/security/sso/cas/"},
                                            {text: "登录入口", link: "/studio/security/sso/cas/login"},
                                            {text: "服务认证", link: "/studio/security/sso/cas/service-validate"},
                                            {text: "退出登录入口", link: "/studio/security/sso/cas/logout"}
                                        ]
                                    },
                                    {
                                        text: "OAuth2.0", 
                                        items: [
                                            {text: "Summary", link: "/studio/security/sso/oauth/"},
                                            {text: "获取授权码", link: "/studio/security/sso/oauth/authorize"},
                                            {text: "获取访问凭证", link: "/studio/security/sso/oauth/access-token"},
                                            {text: "获取当前用户信息", link: "/studio/security/sso/oauth/user"}
                                        ]
                                    }
                                ]
                            }
                            // {text: "Integration", link: "/studio/security/integration"},
                            // {
                            //     text: "Deployment",
                            //     items: [
                            //         {text: "Summary", link: "/studio/security/deployment/"},
                            //         {text: "Environment", link: "/studio/security/deployment/environment"},
                            //         {text: "Steps", link: "/studio/security/deployment/steps"},
                            //         {text: "FAQ", link: "/studio/security/deployment/faq"}
                            //     ]
                            // },
                        ]
                    },
                    {
                        text: "Central Storage",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "Summary", link: "/studio/storage/"},
                            {
                                text: "REST API",
                                items: [
                                    {text: "接口总体说明", link: "/studio/storage/api/"},
                                    {text: "上传文件", link: "/studio/storage/api/upload"},
                                    {text: "秒传", link: "/studio/storage/api/rapid"},
                                    {text: "二次确认", link: "/studio/storage/api/confirm"},
                                    {text: "删除对象", link: "/studio/storage/api/delete"},
                                    {text: "获取对象信息", link: "/studio/storage/api/details"},
                                    {text: "批量获取对象信息", link: "/studio/storage/api/list"},
                                    {text: "下载文件", link: "/studio/storage/api/download"},
                                    {
                                        text: "分片上传文件",
                                        items: [
                                            {text: "创建分片任务", link: "/studio/storage/api/multipart/create"},
                                            {text: "上传分片", link: "/studio/storage/api/multipart/upload"},
                                            {text: "完成分片上传", link: "/studio/storage/api/multipart/complete"},
                                            {text: "取消分片上传", link: "/studio/storage/api/multipart/cancel"}
                                        ]
                                    }
                                ]
                            },
                            // {text: "Integration", link: "/studio/storage/integration"},
                            // {
                            //     text: "Deployment",
                            //     items: [
                            //         {text: "Summary", link: "/studio/storage/deployment/"},
                            //         {text: "Environment", link: "/studio/storage/deployment/environment"},
                            //         {text: "Steps", link: "/studio/storage/deployment/steps"},
                            //         {text: "FAQ", link: "/studio/storage/deployment/faq"}
                            //     ]
                            // },
                        ]
                    },
                    {
                        text: "Central Logging",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "Summary", link: "/studio/logging/"},
                            // {text: "Integration", link: "/studio/logging/integration"},
                            // {
                            //     text: "Deployment",
                            //     items: [
                            //         {text: "Summary", link: "/studio/logging/deployment/"},
                            //         {text: "Environment", link: "/studio/logging/deployment/environment"},
                            //         {text: "Steps", link: "/studio/logging/deployment/steps"},
                            //         {text: "FAQ", link: "/studio/logging/deployment/faq"}
                            //     ]
                            // },
                        ]
                    },
                    {
                        text: "Central Multicast",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "Summary", link: "/studio/multicast/"},
                            {
                                text: "REST API",
                                items: [
                                    {text: "接口总体说明", link: "/studio/multicast/api/"},
                                    {text: "广播消息", link: "/studio/multicast/api/publish"}
                                ]
                            },
                            {
                                text: "广播器",
                                items: [
                                    {text: "邮件广播", link: "/studio/multicast/broadcaster/email-smtp"}
                                ]
                            },
                            // {text: "Integration", link: "/studio/multicast/integration"},
                            // {
                            //     text: "Deployment",
                            //     items: [
                            //         {text: "Summary", link: "/studio/multicast/deployment/"},
                            //         {text: "Environment", link: "/studio/multicast/deployment/environment"},
                            //         {text: "Steps", link: "/studio/multicast/deployment/steps"},
                            //         {text: "FAQ", link: "/studio/multicast/deployment/faq"}
                            //     ]
                            // },
                        ]
                    },
                    {
                        text: "Central Provider",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "Summary", link: "/studio/provider/"},
                            {
                                text: "GraphQL", 
                                items: [
                                    {text: "Summary", link: "/studio/provider/api/"}
                                ]
                            },
                            // {text: "Integration", link: "/studio/provider/integration"},
                            // {
                            //     text: "GraphQL",
                            //     collapsible: true,
                            //     collapsed: true,
                            //     items: [
                            //         {text: "Summary", link: "/studio/provider/graphql/"},
                            //         {text: "First Request", link: "/studio/provider/graphql/first-request"}
                            //     ]
                            // },
                            // {
                            //     text: "Api",
                            //     items: [
                            //         {text: "Summary", link: "/studio/provider/api/"},
                            //         {
                            //             text: "Saas",
                            //             items: [
                            //                 {text: "Application", link: "/studio/provider/api/saas/application"},
                            //                 {text: "Tenant", link: "/studio/provider/api/saas/tenant"}
                            //             ]
                            //         },
                            //         {
                            //             text: "System",
                            //             items: [
                            //                 {text: "Dictionary", link: "/studio/provider/api/system/dictionary"},
                            //                 {text: "Database", link: "/studio/provider/api/system/database"}
                            //             ]
                            //         }
                            //     ]
                            // },
                            // {
                            //     text: "Deployment",
                            //     items: [
                            //         {text: "Summary", link: "/studio/provider/deployment/"},
                            //         {text: "Environment", link: "/studio/provider/deployment/environment"},
                            //         {text: "Steps", link: "/studio/provider/deployment/steps"},
                            //         {text: "FAQ", link: "/studio/provider/deployment/faq"}
                            //     ]
                            // },
                        ]
                    }
                ],
                "/blogs/": [
                    {
                        text: "Blogs",
                        items: [
                            {text: "Summary", link: "/blogs/"}
                        ]
                    },
                    {
                        text: "Kubernetes",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "搭建 Kubernetes 环境", link: "/blogs/k8s/setup"},
                            {text: "搭建 Kubernetes 环境（离线）", link: "/blogs/k8s/setup-offline"},
                            {text: "本地控制远端 Kubernetes 集群", link: "/blogs/k8s/remote-control"},
                        ]
                    },
                    {
                        text: "Docker",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "搭建 Docker 环境", link: "/blogs/docker/setup"},
                            {text: "构建多指令集镜像", link: "/blogs/docker/multi-arch"},
                            {text: "搭建 DNS 服务", link: "/blogs/docker/dns"},
                            {text: "搭建 Clash 代理", link: "/blogs/docker/clash"},
                            {text: "搭建 Nexus3", link: "/blogs/docker/nexus3"},
                        ]
                    },
                    {
                        text: "Linux",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "下载 yum 的离线安装包", link: "/blogs/linux/download-yum"},
                            {text: "Linux 常用命令", link: "/blogs/linux/command"},
                            {text: "创建自签名 SSL 证书", link: "/blogs/linux/ssl"},
                            {text: "Nginx 的安装和使用", link: "/blogs/linux/nginx"},
                        ]
                    },
                    {
                        text: "ESXi",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "创建 EXSi 系统模板", link: "/blogs/exsi/template"},
                            {text: "使用命令升级 ESXi", link: "/blogs/exsi/upgrade"},
                        ]
                    },
                    {
                        text: "Web",
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {text: "快速生成 favicon", link: "/blogs/web/favicon"},
                        ]
                    }
                ]
            },
            footer: {
                message: "Released under the MIT license.",
                copyright: 'Copyright © 2021-present Alan Yeh'
            }
        },
        markdown: {
            config: md => {
                md.linkify.set( {
                    fuzzyLink: false,
                    fuzzyIP: false,
                    fuzzyEmail: false
                })
            }
        }
    })
)