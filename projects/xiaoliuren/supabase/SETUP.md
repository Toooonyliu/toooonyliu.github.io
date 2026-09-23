# 速问：账号同步部署

## 当前状态

当前使用 Google 登录，参见 `GOOGLE-SETUP.md`。以下邮箱验证码配置仅作为可选方案保留，并非当前网站登录入口。现有 GitHub Pages 可继续托管，无需将网站搬迁。

## 1. 建立项目

在 https://supabase.com/dashboard 用自己的账号登录，创建 `Ask` 项目。数据库密码由网站所有者保存，不放入 GitHub 或浏览器代码。

从项目的 Connect / API Keys 复制 Project URL 和 `sb_publishable_...` 公钥，写入 `dist/account-config.js`。**不要使用 secret / service_role 密钥。**

## 2. 创建数据库

在 SQL Editor 运行 `schema.sql`。它建立历史表、索引、按用户隔离的四条 RLS 权限，并限制普通用户只能修改复盘字段。

运行 `verify-access.sql` 验证匿名用户和不同账号之间的数据隔离。该检查在事务内创建临时测试用户和记录，最后回滚，不保留测试数据、不发送邮件。预期最后结果为 `RLS checks passed`。

## 3. 邮箱验证码

Authentication → Providers / Sign In → Email：启用 Email 登录与新用户注册，保持邮箱验证开启。

Authentication → Email Templates → Magic Link：用 `email-code.html` 替换邮件正文。它包含 `{{ .Token }}`，用户在网站中输入验证码，无需依赖邮件链接或 hash 路由。

Site URL：`https://toooonyliu.github.io/projects/xiaoliuren/`。

Authentication → SMTP Settings：配置邮件提供商的 SMTP。Supabase 自带邮件仅发给项目团队地址，并有很低的发送限制，不能作为面向公开访客的生产邮件。SMTP 密码只保存在 Supabase 控制台，绝不写入网站或 GitHub。按需要设置发送频率限制和邮件验证码有效期。

## 4. 上线前验证

- 使用两个独立邮箱分别登录，确认账号 A 的记录不会显示在账号 B 中。
- 在另一台设备登录相同账号，确认问题、时间、结果、原解析、复盘和删除同步。
- 未登录时仍可测算并保存在本机；登录不会自动上传这些记录。
- 主动导入本机记录，同一记录重复导入不会创建副本，也不会覆盖已有的账号复盘。
- 断网保存应显示未同步提示，恢复网络后从记录页重试。未同步改动仅暂留当前页面内存，关闭页面或退出前会提示。
- 退出后页面清除账号数据，回到原有本机历史。登录会话保存在当前浏览器，公用设备应退出。

只有上述配置和验证完成后启用 `account-config.js` 并部署。Project URL / publishable key 不授予管理权限；安全边界是 Supabase JWT 验证和数据库 RLS，而非网页筛选。

## 数据与隐私

游客历史仍用原有本机存储键。账号历史不写入游客存储；问询、原卦、解析和复盘通过 HTTPS 存入配置的 Supabase 项目。新记录与复盘可删除。数据库管理员仍有管理访问权，不能宣称端到端加密。

多个设备同时修改同一复盘时，最后成功的保存生效。记录页“刷新记录”获取其他设备的新内容。失败的上传不会静默当作成功。

## 官方文档

- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys
