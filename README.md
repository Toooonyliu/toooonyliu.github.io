# Mibly · REDcowork 交付包

从项目网站的原版 Mibly 独立复制，保留地图首页、五个入口和原有视觉，新增一个功能：**找那一餐**——用模糊的记忆找回朋友分享过的一餐。

核心 AI 是 REDcowork 平台大模型，在服务端通过 `guard_sdk/ai` 调用。浏览器里没有密钥和提示词。

## 交给 REDcowork

1. 上传 `mibly-redcowork-v2.zip`（或解压后的全部文件）。
2. 粘贴 `prompts/REDcowork-START.txt`。它会让平台 AI：切到 WEB_APP 模式、把 `server/llm.ts` 接到 `guard_sdk/ai`、跑通预览。
3. 预览里用 `docs/DATA-MODEL.txt` 第四节的查询检查真实模型，然后上线、先提交一次链接。
4. 粘贴 `prompts/REDcowork-VERIFY.txt` 做上线前验收。

## 目录

- `src/`：React + TypeScript 前端（原五入口、地图、动态、发布、回忆、收藏）。
- `src/recall/`：找那一餐的界面（RecallPanel）、请求服务端（adapter）、关键词规则与校验（engine）。
- `server/`：服务端源码（TypeScript）。`recall-service.ts` 鉴权、硬条件、调用模型、校验；`prompt.ts` 提示词；`llm.ts` 包装平台 SDK `guard_sdk/ai`；`app.ts` 路由；`platform-entry.ts` 生产入口。
- `app/server.js`：由 `npm run build` 打包出的生产服务端（CommonJS，平台执行 `node app/server.js`）。
- `static/`：前端构建产物（Vite，`base: "./"`，适配 `/f/<appId>/`、`/s/<appId>/` 子路径）。
- `install.sh` / `start.sh` / `health.sh`：按 REDcowork WEB_APP 模板编写。`guard_sdk/` 与 `ai.properties` 由平台的 guard 工具生成，不在仓库里。
- `public/assets/`：设计者的餐食照片、插画地图、手机外框素材。
- `docs/`：产品说明正文（9 页）、数据模型、AI 说明、视觉、视频脚本、验收记录。
- `prompts/`：给 REDcowork AI 的两段提示词。

## 运行

构建需要 Node.js 20.19+，运行只需 Node 18+ 和 express。

```sh
npm ci
npm test                    # 30 项测试（tsx，Node 18+）
npm run build               # 前端 → static/，服务端 → app/server.js（构建需要 Node 20.19+）
npm run start:stand-in      # 本地开发：用关键词规则扮演模型，界面标“开发替身”
npm start                   # 正式：node app/server.js，读取 ../guard_sdk/ai；没有时界面显示“AI 未连接”
```

## 当前边界

真实模型效果、REDcowork 上线、视频和 PDF 还没完成。服务端测试用的是脚本化的模型回复；真实模型必须在 REDcowork 预览里验证。详见 `docs/VERIFICATION.txt`。
