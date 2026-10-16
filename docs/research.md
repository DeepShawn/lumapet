# 开源桌宠与 Live2D 调研摘要

本轮只把调研结论写入主项目，仓库快照保留在本地 `research/`（已被 `.gitignore` 忽略），不会把第三方模型或运行时打进 LumaPet。

## 可借鉴的项目

- [OpenPets](https://github.com/OpenPetsHQ/openpets)：MIT，Electron/React，插件 SDK 有权限、配额、存储和 OpenClaw/MCP 状态联动。
- [Clawd on Desk](https://github.com/rullerzhou-afk/clawd-on-desk)：AGPL-3.0，状态 HUD、DND、主题 schema 和多会话状态值得参考；美术需单独核验。
- [BongoCat](https://github.com/ayangweb/BongoCat)：Apache-2.0，原生透明 overlay、输入跟随、托盘与全局快捷键。
- [Live2DPet](https://github.com/x380kkm/Live2DPet)：MIT，Live2D/图片模型扫描、动作与表情映射、视觉记忆与 VOICEVOX。
- [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)：MIT，作为可选的 Pixi Live2D 加载器；Cubism Core 仍受 Live2D 自有许可约束。

## 鲸鱼娘、Claude 娘、GPT 娘

- [dsh-whale-girl-live2d](https://github.com/Andersen216/dsh-whale-girl-live2d) 和 [dsh-whale-musume](https://github.com/Sutera-Diffusus/dsh-whale-musume) 与鲸鱼娘最接近。它们的代码是 MIT，但模型/美术是 **CC BY-NC-SA 4.0**，需要署名、非商业和相同方式共享，不能直接放进 LumaPet 的发行包。
- 搜索到的 Claude/GPT 相关项目主要是加载器或网页注入器，没有发现许可证明确、允许再分发的 Claude 娘 / GPT 娘 Live2D 模型。
- LumaPet 因此只提供本地模型包导入和许可证元数据，不抓取或内置来源不明的模型。用户导入自己的 `.model3.json` / `.model.json` 后，再由对应平台运行时加载。

完整报告和原始仓库快照仅留在本地调研目录中。
