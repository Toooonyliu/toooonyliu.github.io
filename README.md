# Mibly · REDcowork 交付包（纯前端）

从项目网站的原版 Mibly 独立复制：朋友餐食地图、动态、消息（私信可引用一顿饭）、记一餐、回忆、我的。新增 **找那一餐**：用模糊的记忆找回朋友分享过的一餐。

REDcowork 只能上线纯前端作品，所以核心 AI 是在浏览器里运行的中文语义模型（bge-small-zh-v1.5，int8 ONNX + onnxruntime-web），没有密钥和服务端。

## 上线用的文件

`site/` 是构建好的纯静态网站（index.html、assets/、models/），资源全部是相对路径，适配 `/s/<appId>/`。REDcowork 只需要把预览注册到这个目录并上线。

## 目录

- `src/`：React + TypeScript 源码。`src/recall/` 是找那一餐（界面、浏览器端模型、规则与校验）。
- `public/models/bge-small-zh-v1.5/`：模型与词表（构建时复制进 site/models）。
- `docs/`：产品说明正文、数据模型、AI 说明、视觉、视频脚本、验收记录。
- `prompts/`：给 REDcowork AI 的提示词。

## 运行

```sh
npm ci
npm test          # 28 项，含真实模型测试
npm run build     # 输出 site/
```
