# N.E.K.O. / NekoAI 研究摘要

本轮查阅了 [nucket/NekoAI](https://github.com/nucket/NekoAI)（MIT，Tauri 2 + React + Rust）。它把桌宠做成一个持续运行的本地 companion，而不是只显示一张图，值得借鉴的点包括：

- 透明桌面窗口、托盘、右键菜单、尺寸和宠物选择；
- 8 方向跟随鼠标、漫游、回到宠物屋；
- `idle → walking → near_cursor → sleeping` 状态机；
- energy / happiness / curiosity 情绪值和动态 system prompt；
- 本地持久记忆（对话、用户事实）和主动提醒；
- AI provider 适配层与本地 Ollama 检测；
- `validate-pets`、Vitest、ESLint、Prettier、Dependabot 和 release workflow。

LumaPet 已吸收其中的状态分层、专注勿扰、本地优先和多端打包思路，并保留自己的 Cloud GPT / DeepSeek 接入、LiveCanvas 动画和受权限控制的本机任务代理。浏览器与电脑控制不会直接给模型任意 shell 权限，而是通过显式动作、审批队列和审计记录完成。
