# Android 桌宠壳

`MainActivity` 用 WebView 加载共享的 Web 核心（`?platform=android`），App 内是一张手机桌面：桌宠在屏幕上活动，窗口变成底部弹出的面板。

在开始菜单里点「放到手机桌面」：

1. 如果还没有「显示在其他应用上层」权限，会跳到系统设置页，授权后再点一次；
2. `PetOverlayService` 以前台服务启动，在其他应用上层开一个小的透明 WebView 窗口（`?platform=android&overlay=1`）；
3. 页面在整块屏幕的坐标里模拟桌宠，每一帧通过 `LumaAndroid.moveTo()` 让小窗口跟着桌宠走；
4. 在悬浮桌宠上双击或长按回到 App，点通知也能回去。

悬浮窗和 App 共享同一份本地存储，所以角色和亲密度是同步的。

构建前在仓库根目录执行 `npm run android:sync`，它会构建 Web 核心并复制到 `app/src/main/assets/public/`，然后用 Android Studio 打开 `platform/android`。需要 Android 8.0+。
