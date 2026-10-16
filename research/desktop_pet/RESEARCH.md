# 桌宠 / AI companion 开源仓库调研

调研日期：2026-10-16（工作区快照）

仓库均已下载到本目录，便于离线查阅。`code` 只表示代码许可；Live2D/角色/音频素材可能有单独条款，不能因为代码是 MIT 就直接重新分发素材。

## 与本项目最相关的仓库

| 项目 | URL / 本地目录 | 许可证 | 技术栈 | 可借鉴功能 |
|---|---|---|---|---|
| **Project AIRI** | [moeru-ai/airi](https://github.com/moeru-ai/airi) / `airi`（commit `bceda51`） | MIT（仓库代码）；各模型素材另看声明 | TypeScript、Vue 3、Vite、pnpm monorepo；Electron `stage-tamagotchi`；Capacitor Android/iOS `stage-pocket`；PWA/Web；Pixi Live2D、Three.js/VRM；WebGPU/WebAudio/WebSocket；本地服务使用 Rust/candle 能力 | 同一套领域层拆成 Web、桌面、移动三应用；Live2D/VRM 控制、眨眼/注视/待机动画；OpenAI、Claude、DeepSeek 等多 provider；TTS、语音识别、视觉输入；浏览器端 DuckDB/PGlite；Electron 透明桌宠；Capacitor 移动端；插件/服务端通道；本地模型与云 API 可切换 |
| **Open-LLM-VTuber** | [Open-LLM-VTuber/Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber) / `open-llm-vtuber`（`992309c`） | MIT；仓库内 Live2D sample models 受 Live2D 单独许可 | Python 3.10–3.12、FastAPI/Uvicorn、Pydantic、WebSocket；独立 React 前端子模块；Electron 桌面壳；OpenAI-compatible/Anthropic/DeepSeek 等 provider；ASR/TTS（Whisper、sherpa-onnx、VOICEVOX/Edge 等） | Web 与桌面宠物模式切换；透明、置顶、点击穿透、拖拽；摄像头/截屏视觉感知；点击触摸反馈；情绪到 Live2D 表情映射；聊天记录；自定义 Live2D、人格 prompt、声音；离线本地模型；可扩展 Agent 接口 |
| **OpenPets** | [OpenPetsHQ/openpets](https://github.com/OpenPetsHQ/openpets) / `openpets`（`4b1e071`） | MIT（`LICENSE`） | Electron 42、React 19、TypeScript 6、Vite、Tailwind；pnpm monorepo；主进程托盘/窗口/IPC；TypeScript Plugin SDK v3；MCP stdio server；Claude/OpenCode/Cursor/Devin/Pi/OpenClaw adapters；Windows/macOS/Linux | 桌宠 gallery 与 spritesheet；透明无边框置顶窗口；插件沙箱、manifest 权限与配额、定时器/通知/音频/面板；focus、提醒、饮水、小游戏、虚拟宠物；MCP 工具 `status/react/say`；敏感内容脱敏和显式同意；本地 socket/named pipe + 每次运行 token；官方插件可选、无 agent 也能运行 |
| **Clawd on Desk** | [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk) / `clawd-on-desk`（`b34a4de`） | AGPL-3.0-only（代码） | Electron、Node.js/CommonJS、electron-builder；Windows/macOS/Linux；agent hooks 与日志适配器；PWA 移动只读视图；主题/角色包 | 12+ agent 状态动画（思考、编辑、测试、成功、错误、多 subagent 等）；权限请求浮卡和快捷键；会话 HUD/仪表盘；Telegram/Feishu 审批与 Slack 通知；Clawd/Calico/Cloudling 主题及自定义主题；OpenClaw/Codex/Claude 等 hooks。AGPL 会影响衍生分发，借鉴设计前应独立实现 |
| **Live2DPet** | [x380kkm/Live2DPet](https://github.com/x380kkm/Live2DPet) / `Live2DPet`（`4f7a39f`） | MIT（代码）；示例角色素材另有作者版权 | Electron 42、electron-builder、原生 Node `koffi`、`active-win`；Pixi/Live2D renderer；VOICEVOX Core + ONNX Runtime | 定时截图 + 活动窗口识别；VLM 关键帧视觉记忆；可导入 `.model.json/.model3.json`，自动扫描参数/表情/动作；图片文件夹角色模式；角色人格卡与导入导出；点击/拖拽/触摸；情绪系统与音频状态机；API key AES-256-GCM 加密；本地日语 TTS。截图会发给 API，需做隐私开关 |
| **VPet-Simulator** | [LorisYounger/VPet](https://github.com/LorisYounger/VPet) / `vpet`（`06489f1`） | Apache-2.0（代码）；内置动画/图片有额外授权（README 要求署名，商业分发需遵守动画条款） | C#/.NET 10 WPF；`VPet-Simulator.Core` 可嵌入 WPF；Windows 桌面端；MOD/创意工坊 | 成熟的核心/显示/存档分层；投喂、拖拽、爬墙、多状态动画；MOD 可添加动画、物品、主题、文本和代码；可作为桌宠引擎嵌入宿主。仅 Windows、无现成 LLM，适合借鉴资源包/MOD 生命周期与状态存档 |

## 与“鲸鱼娘 / Claude 娘 / GPT 娘”直接相关

| 项目 | URL / 本地目录 | 许可证 | 观察结果与可借鉴点 |
|---|---|---|---|
| **dsh-whale-musume** | [Sutera-Diffusus/dsh-whale-musume](https://github.com/Sutera-Diffusus/dsh-whale-musume) / `dsh-whale-musume`（`a37f3a4`） | MIT（代码/插件） | DeepSeek Harness 的纯前端插件，桌面 Electron 壳和旧版 Web 双端；无依赖、状态放宿主 `localStorage`，默认无遥测/外部请求。读取结构化工具卡/会话/终端状态，不用随机轮播；工作时安静，待机才说话；右键菜单、召回按钮、投喂/戳/夸夸小游戏、成长等级/成就/成长日记、天气和可选 TTS。可借鉴“工作态不打扰”策略、隐私默认关闭、状态机与设置面板。 |
| **dsh-whale-girl-live2d** | [Andersen216/dsh-whale-girl-live2d](https://github.com/Andersen216/dsh-whale-girl-live2d) / `dsh-whale-girl-live2d`（`cfaa7cd`） | 代码 MIT；模型与角色美术 **CC BY-NC-SA 4.0**，并需按 `AUTHORS.md/NOTICE.md` 署名；Live2D Cubism Core 自有条款 | Pixi 6.5.10 + `pixi-live2d-display` + Cubism Core，纯前端 DSH 插件；真实 agent 状态（思考/工具/流式输出/错误/完成）驱动 44 个表情、8 个动作；点击发消息、逐字气泡；右键表情/换装/桌面场景/一次性动作，表情与动作分层避免覆盖；macOS/Windows 客户端壳和 Web 预览工具。可借鉴动作调度、热键/菜单映射和模型导入边界，但不能直接复用模型资产做商业产品。 |
| **DeepSeek Whale-chan** | [Neko3000/deepseek-whalechan](https://github.com/Neko3000/deepseek-whalechan) / `deepseek-whalechan`（`ced7e60`） | MIT 代码；角色图像/视觉资产 **CC BY-NC-SA 4.0** | 不是桌面壳，而是鲸鱼娘角色规范、五种年龄/体型设定、视觉资产库和 Agent skills（Codex/OpenAI/Nano Banana/Seedream 等图像 provider）。适合作为本项目“鲸鱼娘”角色设定、Q 版/成年版提示词与参考图工作流来源；资产需保留署名、非商业和相同方式共享条件。 |

## 对 lumapet 第一版的落地建议

1. **分层复用 AIRI 的产品结构**：保留当前 Web/PWA、Electron、Capacitor 三端入口，共享 provider、角色配置、对话状态；Live2D renderer 作为可选包，先用图片/精灵图回退，避免强制用户下载大模型。
2. **借鉴 OpenPets 的安全插件边界**：本地 IPC 只接受受 schema 校验的 `status/react/say`；每次运行生成 token；插件 manifest 声明权限；默认拒绝剪贴板、麦克风、截图与动态语音，敏感内容在气泡前脱敏。
3. **借鉴 Open-LLM-VTuber 的桌面模式**：Electron 窗口支持透明、始终置顶、点击穿透开关、拖动；状态和动作通过 WebSocket/IPC 统一；DeepSeek/Cloud GPT 使用 OpenAI-compatible adapter，API key 只进本地加密存储。
4. **借鉴 Live2DPet 的模型导入**：允许用户选择 Live2D 目录或图片文件夹，扫描模型文件、表情和动作；缺少 Live2D 时使用 Q 版/成年版图片状态机，保证 Web 和 Android 可用。
5. **借鉴鲸鱼娘插件的“工作态安静”**：把 `thinking/tool/stream/error/success/idle` 做成明确状态，工作时不弹闲聊；动作采用“一个表情层 + 一个动作层 + 到期回收”的调度器，避免动作叠加导致模型卡死。
6. **素材合规**：仅把上述仓库的代码实现思路带入 lumapet；不要直接打包 `dsh-whale-girl-live2d`、`deepseek-whalechan` 或 Open-LLM-VTuber 的模型/图片。鲸鱼娘、Claude 娘、GPT 娘的最终模型应使用用户自有、明确授权或新生成且可商业使用的素材，README 中分别记录作者、来源和许可。

## 下载状态

```text
airi/                    bceda51
open-llm-vtuber/         992309c
openpets/                4b1e071
clawd-on-desk/           b34a4de
Live2DPet/               4f7a39f
dsh-whale-musume/        a37f3a4
dsh-whale-girl-live2d/   cfaa7cd
deepseek-whalechan/      ced7e60
```

这些目录均保留各自 `.git`，可用 `git -C <目录> log` 和 `git -C <目录> remote -v` 追溯来源。
