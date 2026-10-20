# LumaPet

LumaPet 是一只会在桌面上到处跑的 AI 桌宠。它不是一个装在窗口里的聊天界面，而是真正“住”在桌面上：在任务栏上散步、爬墙、倒挂天花板、跳到打开的窗口顶上，被你拎起来甩出去还会晕头转向。双击它就能和 Claude、Cloud GPT 或 DeepSeek 聊天。

## 角色

| 角色 | 特点 |
| --- | --- |
| **Clawd** | Claude Code 的像素小螃蟹，会爬墙、会倒挂在天花板上爬，思考时头顶转 ✻ |
| **Claude 娘** | 橙发、花饰，抱着一本旧书 |
| **GPT 娘** | 白发龙角、会扑腾的翅膀和龙尾 |
| **DeepSeek 娘** | 深海蓝发、鳍耳和小鱼尾 |
| **自定义** | 上传一张透明 PNG，它就会在桌面上活过来 |

默认桌面上只有 Clawd，其他角色在「角色衣柜」里召唤。所有角色都由 Canvas 实时绘制，有 Q 版 / 成年两种形态（Clawd 为小只 / 大只），最多 4 只同时在桌面上，相遇时会互相打招呼。

## 玩法

- **拖拽与抛掷**：按住桌宠拎起来会像钟摆一样晃，甩出去会飞，撞墙会弹开或贴在墙上爬，摔得太狠会转圈圈晕倒。
- **摸头**：鼠标在桌宠头上来回划，它会害羞冒爱心，亲密度上升。
- **聊天**：双击桌宠弹出快速对话框，回复会在头顶的气泡里打字出来；完整记录在「聊天」窗口。按 `/`（Windows 上按 `Alt+L`）也能快速开口。
- **右键菜单**（手机上长按）：投喂、跳舞、爬墙、坐下、睡觉、换角色、换主题、送走。
- **投喂与玩球**：任务栏里点 🍙 会从天上掉零食，桌宠会跑过去吃；点 ⚽ 扔一个球，它们会追着踢，你也可以拖着球扔。
- **窗口即平台**：打开的窗口顶部可以站人，桌宠有时会跳上去，拖动窗口能载着它走；关掉窗口它会掉下来。
- **回收站**：把桌宠拖进回收站试试。
- **自己的生活**：闲着时会散步、发呆、坐下、跳舞、自言自语；夜深或很久没人理时会睡觉。
- **专注时钟**：专注期间桌宠安静坐着，头顶显示倒计时，结束时一起跳舞庆祝。

## 主题

八套主题，每套都有动态壁纸和配套的界面风格：🌌 极光、🌸 樱花、🌆 赛博霓虹、🐋 深海、🌲 萤火森林、❄️ 冬夜、🖌️ 水墨，以及完整复刻 Windows 98 风格窗口和任务栏的 💾 像素 98。也可以单独换强调色。

## 三个平台

- **Web / PWA**：整个浏览器页面变成一张桌面，有桌面图标、任务栏、开始菜单和可拖动的玻璃窗口。
- **Windows**：一个透明、置顶、覆盖整个工作区的窗口。只有桌宠和打开的面板会接收鼠标，其余地方的点击会直接穿透到你的桌面，所以桌宠真的站在任务栏上、在你的其他软件上面走来走去。托盘菜单可以聊天、投喂、换主题、召唤伙伴、设置开机自启。
- **Android**：App 内是一张手机桌面；在开始菜单点「放到手机桌面」，桌宠会以悬浮窗的形式跑到其他应用上面，在屏幕上走动，双击回到 App。需要授予「显示在其他应用上层」权限。

## 本地运行

```bash
npm install
npm run dev
```

打开终端输出的地址即可。`?platform=android` 可以预览手机布局。

构建静态产物：

```bash
npm run build
npm run preview
```

## 模型

在「设置」窗口选择 Claude、Cloud GPT 或 DeepSeek，填写 API Key 即可；不填 Key 时是演示模式，桌宠会用本地回复。

| 提供方 | 默认模型 | 地址 |
| --- | --- | --- |
| Claude | `claude-opus-5-5` | `https://api.anthropic.com`（官方 `@anthropic-ai/sdk`） |
| Cloud GPT | `gpt-4o-mini` | `https://api.openai.com/v1/chat/completions` |
| DeepSeek | `deepseek-chat` | `https://api.deepseek.com/chat/completions` |

设备直连模式把 Key 存在本机；需要集中管理密钥时，用内置的服务端代理：

```bash
LUMAPET_CLAUDE_API_KEY=你的密钥 \
LUMAPET_CLOUDGPT_API_KEY=你的密钥 \
LUMAPET_DEEPSEEK_API_KEY=你的密钥 \
npm start
```

服务端在 `http://127.0.0.1:8787` 提供静态站点、`/api/health` 和 `/api/chat`，在设置里把请求方式切到「服务端代理」即可。部署到其他主机时必须同时设置 `HOST=0.0.0.0`、`LUMAPET_ALLOWED_ORIGIN` 和 `LUMAPET_PROXY_TOKEN`，并把同一个令牌填进设置；服务端拒绝没有令牌的远程绑定。变量模板见 [.env.example](.env.example)。

## Windows 桌宠

```bash
npm run build
npm run desktop
```

边改边看：一个终端 `npm run dev`，另一个终端 `LUMAPET_DEV_URL=http://localhost:5173 npm run desktop`。推送 `v*` tag 后，GitHub Actions 会生成 NSIS 安装包和 portable EXE。

## Android 桌宠

`npm run android:sync` 会构建 Web 核心并复制到 `platform/android/app/src/main/assets/public/`，然后用 Android Studio 打开 `platform/android`。推送版本 tag 后，Actions 会构建 APK。说明见 [platform/android/README.md](platform/android/README.md)。

## 本机任务代理

`npm run agent` 启动一个只绑定本机的任务桥，桌宠可以在「工具箱」里帮你打开网页、读取页面、截图；写操作会先等你批准。说明见 [agent/README.md](agent/README.md)。

## 隐私

设备直连时 API Key 只保存在本机；导出的配置文件不含 Key 和令牌。聊天内容只发送给你选择的模型服务商。

角色中的 Claude 娘 / GPT 娘 / DeepSeek 娘为同人形象，Clawd 为 Anthropic 的 Claude Code 吉祥物同人像素画。
