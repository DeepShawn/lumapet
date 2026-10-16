# Windows 浮窗壳

第一版使用 Electron 加载共享的 Web 核心，默认窗口置顶，关闭窗口会收进托盘而不是终止桌宠。开发时先在仓库根目录执行：

```bash
npm install
npm run build
npm install --save-dev electron electron-builder
npm run desktop
```

如果想边改边看，在一个终端运行 `npm run dev`，再用 `LUMAPET_DEV_URL=http://localhost:5173 npm run desktop` 启动浮窗壳。打包前可以把 `tray-template.png` 换成正式托盘图标。
