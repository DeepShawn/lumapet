# LumaPet 本机任务代理

这是一个只绑定本机的 N.E.K.O./OpenClaw 风格任务桥接层。它把浏览器、系统链接和剪贴板能力暴露成可审计的动作；写操作默认先进入待批准队列，只有调用 `/approve` 才会执行。

```bash
npm install
npx playwright install chromium
npm run agent
```

默认地址为 `http://127.0.0.1:8788`。浏览器动作使用独立的 `agent/.lumapet-agent/browser-profile`，不会复用你的日常浏览器 Cookie。支持：

- `browser.navigate` / `browser.read`
- `browser.click` / `browser.type`
- `browser.screenshot`
- `system.open_url`
- `system.open_app`（计算器、记事本、终端、文件管理器安全白名单）
- `system.active_window`
- `clipboard.read` / `clipboard.write`

远程绑定必须设置 `LUMAPET_AGENT_TOKEN`。不要把代理端口暴露到公网；模型不能调用任意 shell、任意 JavaScript 或 `file://` 地址。
