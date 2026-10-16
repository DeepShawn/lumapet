# LumaPet

LumaPet 是一个面向 Web、Windows 和 Android 的 AI 桌宠第一版。它把 Cloud GPT 与 DeepSeek 放在同一套对话核心里，并提供两种角色形态（Q 版 / 成年版）、可自定义场景、强调色、大小、对白气泡，以及参考图上传。

## 当前版本

- **Web/PWA**：响应式工作台，支持浏览器直接运行和安装为 PWA。
- **Windows**：Electron 浮窗壳，默认置顶，关闭窗口后收进托盘。
- **Android**：原生 WebView + 悬浮服务骨架，获得悬浮窗权限后，应用退到后台仍保留桌宠入口。
- **模型**：Cloud GPT 与 DeepSeek，均支持 OpenAI 兼容的 `chat/completions` 接口。
- **API 代理**：内置无依赖 Node 服务，可把 API Key 放在服务器环境变量里，设备只收到模型回复。
- **Live2D 插槽**：可在参考图面板导入本地 `.model3.json` / `.model.json` 清单，记录动作、表情和许可证元数据；不会自动上传或内置来源不明的模型。
- **LiveCanvas 动画层**：内置呼吸、眨眼、视线跟随、口型、粒子和点击反应；后续可将同一状态协议替换成真正的 Live2D runtime。
- **本机任务代理**：可选的本地浏览器/系统动作桥接，支持打开、读取、点击、填写、截图和剪贴板，写操作先审批。
- **OpenClaw 预留**：读取剪贴板摘要、25 分钟专注计时、桌宠唤醒；窗口捕捉、系统级工具菜单留给后续版本。

## 本地运行

```bash
npm install
npm run dev
```

打开终端输出的地址即可预览。`?platform=web`、`?platform=windows`、`?platform=android` 可以切换三种布局。

构建静态产物：

```bash
npm run build
npm run preview
```

如果需要为多台设备提供统一的 API 代理：

```bash
LUMAPET_CLOUDGPT_API_KEY=你的密钥 \\
LUMAPET_DEEPSEEK_API_KEY=你的密钥 \\
npm start
```

服务端会在 `http://127.0.0.1:8787` 提供静态站点、`/api/health` 和 `/api/chat`。在右上角模型设置中选择“LumaPet 服务端代理”即可；代理模式不会把服务器密钥下发到浏览器。部署到其他主机时必须同时设置 `HOST=0.0.0.0`、`LUMAPET_ALLOWED_ORIGIN` 和 `LUMAPET_PROXY_TOKEN`，再把同一个令牌填入应用的“代理访问令牌”字段；服务端拒绝没有令牌的远程绑定，避免意外变成开放代理。

变量模板见 [.env.example](.env.example)。

## 配置模型

点击右上角设置，选择 Cloud GPT 或 DeepSeek，填写模型名、兼容接口地址和 API Key。设备直连模式会把 Key 写入当前设备的 `localStorage`，前端直接请求你填写的接口；没有 Key 时会自动使用本地演示回复。需要集中管理密钥时切换到服务端代理模式，并在 Node 服务环境变量中配置 Key。

默认值：

| 提供方 | 模型 | 接口 |
| --- | --- | --- |
| Cloud GPT | `gpt-4o-mini` | `https://api.openai.com/v1/chat/completions` |
| DeepSeek | `deepseek-chat` | `https://api.deepseek.com/chat/completions` |

生产环境建议为 API 请求增加自己的服务端代理、限流和密钥轮换，不要把长期密钥放在共享设备的浏览器里。

## Windows 浮窗

```bash
npm run build
npm install --save-dev electron electron-builder
npm run desktop
```

需要开发热更新时：

```bash
npm run dev
LUMAPET_DEV_URL=http://localhost:5173 npm run desktop
```

推送 `v0.1.0` 这类 tag 后，GitHub Actions 会在 Windows runner 生成 NSIS 安装包和 portable EXE；流程文件见 `.github/workflows/windows-package.yml`。

## Android 悬浮桌宠

先运行 `npm run build`，将 `dist/` 复制到 `platform/android/app/src/main/assets/public/`，再用 Android Studio 打开 `platform/android`。首次启动会申请悬浮窗权限并启动前台服务；服务保持运行时，返回桌面或关闭 Activity 仍会显示悬浮入口。原生壳说明和后续扩展点见 [platform/android/README.md](platform/android/README.md)。

推送版本 tag 后，`.github/workflows/android-package.yml` 会构建 debug APK 并上传到 Actions artifact；推送 `main` 后，`.github/workflows/pages.yml` 会发布 Web 版到 GitHub Pages。

Pages 预期地址为 `https://deepshawn.github.io/lumapet/`。第一次需要在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**；当前 PAT 没有修改 Pages 设置的权限，所以这一步需仓库所有者点一次。

## 配置迁移

设置弹窗支持导出和导入外观、角色和接口地址。导出文件会主动排除 API Key；导入时会保留当前设备已经保存的 Key。

## 目录

```text
src/                         Web/PWA 核心
public/references/            用户提供的参考图
platform/windows/             Electron 浮窗壳
platform/android/             Android WebView 与悬浮服务骨架
docs/research.md              开源桌宠与 Live2D 调研摘要
docs/live2d-model-package.md  本地模型包约定
docs/neko-research.md         N.E.K.O./NekoAI 研究摘要
agent/                         本机任务代理（可选）
```

本机任务代理：

```bash
npm install
npx playwright install chromium
npm run agent
```

然后在桌宠右侧打开“本机任务代理”。代理默认只监听 `127.0.0.1:8788`，浏览器写操作会进入确认队列；远程监听必须设置 `LUMAPET_AGENT_TOKEN`。

## 素材与安全

参考图只用于本地 UI 展示，上传的自定义图片也只保存在当前设备。请在拥有授权的前提下使用角色素材。GitHub PAT、API Key 和其他凭据不属于仓库内容；如果凭据曾经粘贴到聊天或日志中，应在 GitHub 设置里立即撤销并重新生成。
