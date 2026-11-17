# 山脊来信 · RIDGELINE

以秦岭鳌山与太白山的草甸、石海、山脊和风雪为灵感的横版探索游戏。真实地名配合虚构的平台地图、避风点与故事，不是实际登山路线或导航资料。

## 已实现

- 三个连续关卡：鳌山高山草甸、秦岭主梁石海、太白山风雪之上。
- 写实山景、缓慢视差平移、岩壁纹理、草甸与积雪、雾气、阵风和落石。
- 徒步人物的衣褶、背包、帽檐、登山杖与行走动画，以及带曲面布料的帐篷。
- 可变高度跳跃、离地跳跃容错、跳跃输入缓冲、快跑与体力恢复。
- 体温、避风点检查点、跌落重生、章节结算、关卡解锁。
- 九篇原创山野手记、浏览器本地存档、从已记录的避风点继续。
- 桌面键盘和手机触屏操作、暂停、帮助、可开关合成音效。

画面由 Canvas 与随项目打包的四张 WebP 素材组成，图片合计约 1.27 MiB，静态地形使用离屏缓存。山景与岩石纹理由 AI 生成，是概念素材，不是秦岭实地照片。声音使用 Web Audio 合成；运行时没有外部图床、字体、CDN、数据库或付费 API 依赖。存档只保存在当前浏览器；清除浏览器数据会清除存档。

## 本地运行

需要 Node.js 22 或更新版本。无需安装依赖即可预览：

```powershell
cd C:\work\dev\novel\aotai-ridge
node scripts/server.mjs
```

打开 <http://127.0.0.1:4173/>。不要直接双击 `index.html`，浏览器的 ES Module 需要通过 HTTP 加载。

如果这台电脑的 `node` 命令提示没有配置 NVM 版本，可以运行随项目提供的启动脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\Start-Game.ps1
```

## 部署到自己的 Cloudflare Workers

本项目使用 **Workers Static Assets**，配置位于 `wrangler.jsonc`。不需要构建步骤、D1、R2 或服务端逻辑。

### 从 GitHub 导入（推荐）

仓库：<https://github.com/innboom/aotai-ridge>

在 Cloudflare 控制台进入 **Workers & Pages → 创建应用 → 导入 Git 仓库**，连接 GitHub 并选择 `innboom/aotai-ridge`。

| 设置 | 值 |
| --- | --- |
| Worker / 项目名称 | `aotai-ridge` |
| 生产分支 | `main` |
| 根目录 | 仓库根目录，留空或 `/` |
| 构建命令 | 留空；若希望部署前跑检查，可以填 `pnpm run check` |
| 部署命令 | `pnpm run deploy`（也可使用默认的 `npx wrangler deploy`） |
| 静态资源目录 | 已在 `wrangler.jsonc` 配置为 `./public`，不需要另填构建输出目录 |

Worker 名称应与 `wrangler.jsonc` 的 `name` 一致。本仓库已固定 Node.js 和 pnpm 版本，Cloudflare 会自动安装依赖。选择 **Workers** 的 Git 导入流程后，点击部署即可；以后推送到 `main` 会触发自动更新。第一次连接需要你在 Cloudflare 页面完成 GitHub 仓库访问授权。

参考：[Workers Builds 配置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)、[构建环境与版本设置](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)。

### 从本地命令行部署

```powershell
cd C:\work\dev\novel\aotai-ridge
npm install
npx wrangler login
npm run deploy
```

也可用 pnpm：`pnpm install`、`pnpm exec wrangler login`、`pnpm run deploy`。已包含 pnpm 锁文件，并只允许官方 esbuild、workerd 的安装脚本。

部署成功后，Wrangler 会打印实际的 `workers.dev` 网址。项目默认名称是 `aotai-ridge`；如果账号里已经有同名 Worker，请先修改 `wrangler.jsonc` 中的 `name`，避免覆盖已有项目。多个 Cloudflare 账号时，按 Wrangler 提示选择目标账号，或在配置里填入目标 `account_id`。

如果使用控制台的静态资源直接上传方式，可将 `public` 中的文件整体上传，或先把这些文件打成 ZIP。ZIP 根目录应包含 `index.html`，无需再解一层目录。交付时生成的本地 `aotai-ridge-static.zip` 未提交到 Git；从 GitHub 导入不需要这个压缩包。若控制台没有直接上传入口，使用上述 Wrangler 命令。

游戏未自动发布，也没有创建任何云端资源。授权或账号由部署者自行提供。密码、API Token 和 OAuth 凭据不要放入源码或静态资源目录。

Cloudflare 的静态资源请求计费规则以 [官方文档](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) 为准；如以后增加 API、排行榜等 Worker 服务端功能，需要另行考虑相应请求与存储额度。

## 操作

| 操作 | 按键 |
| --- | --- |
| 左右移动 | A / D 或 ← / → |
| 跳跃（长按跳得更高） | 空格 / W / ↑ |
| 快跑 | Shift + 移动 |
| 在避风点休息、激活终点旗帜 | E |
| 暂停 / 继续 | Escape / P |
| 回到最近避风点 | R |

每关到达末尾的旗帜后按 E 完成关卡；手记为可选收集。手机使用画面下方方向和跳跃按钮。竖屏可玩，横屏能看见更远的地形。

## 验证

```powershell
npm run check
npx wrangler deploy --dry-run
```

自动检查包含角色落地、跳跃、避风点、重生、收集、终点交互、体温、体力和三个关卡中每一处平台间隙的可达性。浏览器已检查桌面与窄屏布局、移动跳跃、暂停和帮助/手记弹窗。

## 文件

- `public/index.html`：页面结构与游戏界面。
- `public/style.css`：桌面和手机布局。
- `public/engine.mjs`：关卡地图、故事、角色物理和游戏规则。
- `public/game.mjs`：游戏循环、天气、声音、输入、UI、存档。
- `public/scenery.mjs`：写实背景、缓存岩壁、人物与帐篷绘制。
- `public/assets/`：三个山景与岩壁纹理，全部随静态资源部署。
- `docs/art-direction.md`：素材说明、文件清单与完整生成提示词。
- `public/_headers`：Cloudflare 静态资源安全响应头。
- `wrangler.jsonc`：Workers 静态资源部署配置。
- `tests/engine.test.mjs`：核心玩法验证。
- `scripts/server.mjs`：不依赖第三方包的本地 HTTP 预览服务。

地貌背景参考：[太白山自然保护区公开介绍](https://nyncj.baoji.gov.cn/col4165/col4170/202510/t20251016_1219276.html)。手记为项目原创，场景使用本项目生成的概念素材及程序绘图；地形坐标、天气数值、营地与落石位置仅用于游戏。
