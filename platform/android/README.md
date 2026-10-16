# Android 悬浮桌宠壳

Web 核心通过 `?platform=android` 进入 Android 版窄屏布局。`app/src/main/java/com/lumapet/` 中的 `MainActivity` 和 `PetOverlayService` 负责：

- 首次启动时申请 `SYSTEM_ALERT_WINDOW` 悬浮窗权限；
- 进入后台后保持一个轻量的 LumaPet 悬浮气泡；
- 通过前台服务保证系统不会立即回收桌宠。

构建前先在仓库根目录执行 `npm run android:sync`，它会构建 Web 核心并把 `dist/` 同步到 `app/src/main/assets/public/`，然后使用 Android Studio 打开 `platform/android`。设备需要 Android 8.0+。

这是首版的原生能力骨架，后续可以在 `PetOverlayService` 里加入拖拽、点击唤起、OpenClaw 工具菜单和 Live2D 渲染。
