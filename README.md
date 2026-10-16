# LumaPet

LumaPet 是一个面向 Web、Windows 和 Android 的 AI 桌宠第一版。它把 Cloud GPT 与 DeepSeek 放在同一套对话核心里，并提供两种角色形态（Q 版 / 成年版）、可自定义场景、强调色、大小、对白气泡，以及参考图上传。

## 当前版本

- **Web/PWA**：响应式工作台，支持浏览器直接运行和安装为 PWA。
- **Windows**：Electron 浮窗壳，默认置顶，关闭窗口后收进托盘。
- **Android**：原生 WebView + 悬浮服务骨架，获得悬浮窗权限后，应用退到后台仍保留桌宠入口。
- **模型**：Cloud GPT 与 DeepSeek，均支持 OpenAI 兼容的 `chat/completions` 接口。
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

## 配置模型

点击右上角设置，选择 Cloud GPT 或 DeepSeek，填写模型名、兼容接口地址和 API Key。Key 只写入当前设备的 `localStorage`，前端直接请求你填写的接口；仓库没有服务端，也不会把 Key 写入源码或构建产物。没有 Key 时会自动使用本地演示回复。

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

## Android 悬浮桌宠

先运行 `npm run build`，将 `dist/` 复制到 `platform/android/app/src/main/assets/public/`，再用 Android Studio 打开 `platform/android`。首次启动会申请悬浮窗权限并启动前台服务；服务保持运行时，返回桌面或关闭 Activity 仍会显示悬浮入口。原生壳说明和后续扩展点见 [platform/android/README.md](platform/android/README.md)。

## 目录

```text
src/                         Web/PWA 核心
public/references/            用户提供的参考图
platform/windows/             Electron 浮窗壳
platform/android/             Android WebView 与悬浮服务骨架
```

## 素材与安全

参考图只用于本地 UI 展示，上传的自定义图片也只保存在当前设备。请在拥有授权的前提下使用角色素材。GitHub PAT、API Key 和其他凭据不属于仓库内容；如果凭据曾经粘贴到聊天或日志中，应在 GitHub 设置里立即撤销并重新生成。
