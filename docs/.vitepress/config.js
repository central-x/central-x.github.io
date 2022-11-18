export default {
    title: "CentralX",
    description: "Fullstack DevSuit",
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
            {text: "Get Started", link: "/quick-start"},
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
                        {text: "Service Specification", link: "/studio/service-specification"},
                        {text: "Tenant Specification", link: "/studio/tenant-specification"},
                        {text: "Deployment", link: "/studio/deployment"},
                        {text: "Changelog", link: "/studio/changelog"},
                    ]
                },
                {
                    text: "Central Dashboard",
                    collapsible: true,
                    collapsed: true,
                    items: [
                        {text: "Summary", link: "/studio/dashboard/"},
                        {
                            text: "Guide",
                            items: [
                                {
                                    text: "Saas",
                                    items: [
                                        {text: "Application", link: "/studio/dashboard/guide/saas/application"},
                                        {text: "Tenant", link: "/studio/dashboard/guide/saas/tenant"}
                                    ]
                                }, {
                                    text: "System",
                                    items: [
                                        {text: "Dictionary", link: "/studio/dashboard/guide/system/dictionary"},
                                        {text: "Database", link: "/studio/dashboard/guide/system/database"}
                                    ]
                                }, {
                                    text: "Authority",
                                    items: [
                                        {text: "Menu", link: "/studio/dashboard/guide/authority/menu"},
                                        {text: "Role", link: "/studio/dashboard/guide/authority/role"}
                                    ]
                                },
                            ]
                        },
                        {
                            text: "Deployment",
                            items: [
                                {text: "Summary", link: "/studio/dashboard/deployment/"},
                                {text: "Environment", link: "/studio/dashboard/deployment/environment"},
                                {text: "Steps", link: "/studio/dashboard/deployment/steps"},
                                {text: "FAQ", link: "/studio/dashboard/deployment/faq"}
                            ]
                        },
                    ]
                },
                {
                    text: "Central Gateway",
                    collapsible: true,
                    collapsed: true,
                    items: [
                        {text: "Summary", link: "/studio/gateway/"},
                        {text: "Integration", link: "/studio/gateway/integration"},
                        {
                            text: "Deployment",
                            items: [
                                {text: "Summary", link: "/studio/gateway/deployment/"},
                                {text: "Environment", link: "/studio/gateway/deployment/environment"},
                                {text: "Steps", link: "/studio/gateway/deployment/steps"},
                                {text: "FAQ", link: "/studio/gateway/deployment/faq"}
                            ]
                        },
                    ]
                },
                {
                    text: "Central Security",
                    collapsible: true,
                    collapsed: true,
                    items: [
                        {text: "Summary", link: "/studio/security/"},
                        {text: "Integration", link: "/studio/security/integration"},
                        {
                            text: "Deployment",
                            items: [
                                {text: "Summary", link: "/studio/security/deployment/"},
                                {text: "Environment", link: "/studio/security/deployment/environment"},
                                {text: "Steps", link: "/studio/security/deployment/steps"},
                                {text: "FAQ", link: "/studio/security/deployment/faq"}
                            ]
                        },
                    ]
                },
                {
                    text: "Central Storage",
                    collapsible: true,
                    collapsed: true,
                    items: [
                        {text: "Summary", link: "/studio/storage/"},
                        {text: "Integration", link: "/studio/storage/integration"},
                        {
                            text: "Deployment",
                            items: [
                                {text: "Summary", link: "/studio/storage/deployment/"},
                                {text: "Environment", link: "/studio/storage/deployment/environment"},
                                {text: "Steps", link: "/studio/storage/deployment/steps"},
                                {text: "FAQ", link: "/studio/storage/deployment/faq"}
                            ]
                        },
                    ]
                },
                {
                    text: "Central Logging",
                    collapsible: true,
                    collapsed: true,
                    items: [
                        {text: "Summary", link: "/studio/logging/"},
                        {text: "Integration", link: "/studio/logging/integration"},
                        {
                            text: "Deployment",
                            items: [
                                {text: "Summary", link: "/studio/logging/deployment/"},
                                {text: "Environment", link: "/studio/logging/deployment/environment"},
                                {text: "Steps", link: "/studio/logging/deployment/steps"},
                                {text: "FAQ", link: "/studio/logging/deployment/faq"}
                            ]
                        },
                    ]
                },
                {
                    text: "Central Multicast",
                    collapsible: true,
                    collapsed: true,
                    items: [
                        {text: "Summary", link: "/studio/multicast/"},
                        {text: "Integration", link: "/studio/multicast/integration"},
                        {
                            text: "Deployment",
                            items: [
                                {text: "Summary", link: "/studio/multicast/deployment/"},
                                {text: "Environment", link: "/studio/multicast/deployment/environment"},
                                {text: "Steps", link: "/studio/multicast/deployment/steps"},
                                {text: "FAQ", link: "/studio/multicast/deployment/faq"}
                            ]
                        },
                    ]
                },
                {
                    text: "Central Provider",
                    collapsible: true,
                    collapsed: true,
                    items: [
                        {text: "Summary", link: "/studio/provider/"},
                        {text: "Integration", link: "/studio/provider/integration"},
                        {
                            text: "GraphQL",
                            collapsible: true,
                            collapsed: true,
                            items: [
                                {text: "Summary", link: "/studio/provider/graphql/"},
                                {text: "First Request", link: "/studio/provider/graphql/first-request"}
                            ]
                        },
                        {
                            text: "Api",
                            items: [
                                {text: "Summary", link: "/studio/provider/api/"},
                                {
                                    text: "Saas",
                                    items: [
                                        {text: "Application", link: "/studio/provider/api/saas/application"},
                                        {text: "Tenant", link: "/studio/provider/api/saas/tenant"}
                                    ]
                                },
                                {
                                    text: "System",
                                    items: [
                                        {text: "Dictionary", link: "/studio/provider/api/system/dictionary"},
                                        {text: "Database", link: "/studio/provider/api/system/database"}
                                    ]
                                }
                            ]
                        },
                        {
                            text: "Deployment",
                            items: [
                                {text: "Summary", link: "/studio/provider/deployment/"},
                                {text: "Environment", link: "/studio/provider/deployment/environment"},
                                {text: "Steps", link: "/studio/provider/deployment/steps"},
                                {text: "FAQ", link: "/studio/provider/deployment/faq"}
                            ]
                        },
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
                }
            ]
        },
        footer: {
            message: "Released under the MIT license.",
            copyright: 'Copyright © 2021-present Alan Yeh'
        }
    },
    plugins: [
        'flowchart'
    ]
}