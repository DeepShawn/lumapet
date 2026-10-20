# Windows 桌宠壳

Electron 打开一个**透明、无边框、置顶**、大小等于主显示器工作区的窗口。桌宠在这个窗口里活动，地面就是任务栏的上沿。

页面在鼠标移动时判断光标下面是不是桌宠或打开的面板：是的话接收点击，不是的话调用 `setIgnoreMouseEvents(true, { forward: true })` 让点击穿透到桌面和其他软件。所以桌宠可以在所有窗口上面走动，又不会挡住你干活。

- 托盘菜单：聊天、快速说一句、投喂、扔球、跳舞、睡觉、专注勿扰、召唤伙伴、界面主题、衣柜、工具箱、设置、开机自启、退出
- 全局快捷键 `Alt+L`：快速和桌宠说话
- 只允许一个实例；再次启动会直接打开聊天
- 显示器分辨率或任务栏位置变化时自动重新铺满工作区

```bash
npm install
npm run build
npm run desktop
```

边改边看：一个终端 `npm run dev`，另一个终端 `LUMAPET_DEV_URL=http://localhost:5173 npm run desktop`。打包前可以把 `tray-template.png` 换成正式托盘图标。
