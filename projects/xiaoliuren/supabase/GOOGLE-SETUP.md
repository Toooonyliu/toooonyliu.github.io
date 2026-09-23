# Google 登录配置

网站端已支持 Google 登录和 PKCE 回调处理。`account-config.js` 当前选用 `provider: 'google'`，且 `enabled: true`。项目所有者已确认完成 Google provider 和网站返回地址配置，现准备发布；真实用户授权测试仍待部署后完成。邮箱验证码代码仍保留，未作为当前入口。

## Google Auth Platform

打开 https://console.cloud.google.com/auth/overview ，创建或选择 `Ask` 项目。

1. 配置 Branding：应用名称 `速问 Ask`，支持邮箱和联系邮箱填你自己的邮箱。
2. Audience 选择 External。测试期间将自己的 Google 邮箱加入 Test users；准备公开登录时检查 Audience 的发布状态和 Google 要求。
3. Data Access 仅使用 `openid`、email 和 profile 基本身份权限，不增加 Gmail、Drive 等权限。
4. Clients → Create client → Web application：
   - 名称：`Ask Web`
   - Authorized JavaScript origins：`https://toooonyliu.github.io`
   - Authorized redirect URIs：`https://zzjutzwkuyfyvzuzlrsg.supabase.co/auth/v1/callback`
5. 将生成的 Client ID 和 Client secret 填到 Supabase，而非网站代码。

## Supabase

Authentication → Sign In / Providers → Google：开启，填写上述 Client ID、Client secret 并保存。

Authentication → URL Configuration：
- Site URL：`https://toooonyliu.github.io/projects/xiaoliuren/`
- Redirect URLs 添加同一个完整地址（保留结尾 `/`）。
- 若需在现有私有 Sites 镜像登录，也添加 `https://palm-of-time-tony.shl065.chatgpt.site/`。浏览器登录会回到原网站，不能把 PKCE 流程从一个域名转移到另一个域名。

不需要 SMTP 或应用专用密码。Client secret 只保存在 Supabase 后台。

## 验证与上线

先检查 Supabase `/auth/v1/settings` 的 Google provider 已启用，再启用前端配置并部署。然后在网站实际完成 Google 授权、回到记录页、保存/刷新/退出/换账号测试。没有完成实际授权测试前，不能声称 Google 登录已经验证成功。

官方说明：https://supabase.com/docs/guides/auth/social-login/auth-google
