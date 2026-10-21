package com.lumapet

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView

// A plain Activity: AppCompatActivity requires a Theme.AppCompat theme and
// throws from setContentView() with the Material theme this app uses.
class MainActivity : Activity() {
    private var webView: WebView? = null
    private var rendererCrashes = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showApp(lite = false)
    }

    private fun showApp(lite: Boolean) {
        try {
            val view = createWebView(lite)
            webView = view
            setContentView(view)
        } catch (_: Throwable) {
            // If the system WebView provider is unavailable, keep a native screen
            // open instead of letting the launcher report an instant crash.
            showMessage("LumaPet 暂时无法启动系统 WebView\n请更新或启用 Android System WebView 后重试。")
        }
    }

    private fun showMessage(message: String) {
        setContentView(TextView(this).apply {
            text = message
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.rgb(13, 12, 22))
            textSize = 16f
            setPadding(48, 48, 48, 48)
        })
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView(lite: Boolean): WebView = WebView(this).apply {
        // A few vendor WebViews crash while compositing a continuously
        // animated canvas with hardware acceleration. Software compositing
        // keeps Android stable; desktop/Web use the GPU.
        setLayerType(View.LAYER_TYPE_SOFTWARE, null)
        setBackgroundColor(Color.rgb(13, 12, 22))
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        webViewClient = object : WebViewClient() {
            // Without this, a crashed or killed renderer takes the whole app down.
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                (view.parent as? ViewGroup)?.removeView(view)
                view.destroy()
                if (webView === view) webView = null
                rendererCrashes += 1
                if (rendererCrashes <= 2) showApp(lite = true)
                else showMessage("LumaPet 的页面渲染进程多次退出\n请更新 Android System WebView 后重试。")
                return true
            }
        }
        addJavascriptInterface(AppBridge(), "LumaAndroid")
        loadUrl("file:///android_asset/public/index.html?platform=android" + if (lite) "&lite=1" else "")
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }

    // Called from the web app's start menu ("放到手机桌面").
    inner class AppBridge {
        @JavascriptInterface
        fun startOverlay(): String {
            if (!Settings.canDrawOverlays(this@MainActivity)) {
                runOnUiThread {
                    try {
                        startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
                    } catch (_: RuntimeException) {
                        // Some launchers hide this screen; the user can grant it in Settings.
                    }
                }
                return "permission"
            }
            runOnUiThread {
                try {
                    val intent = Intent(this@MainActivity, PetOverlayService::class.java)
                    startForegroundService(intent)
                    moveTaskToBack(true)
                } catch (_: RuntimeException) {
                    // Starting the service is best effort; the in-app pet keeps working.
                }
            }
            return "ok"
        }

        @JavascriptInterface
        fun stopOverlay() {
            runOnUiThread { stopService(Intent(this@MainActivity, PetOverlayService::class.java)) }
        }

        @JavascriptInterface
        fun screenInfo(): String {
            val metrics = resources.displayMetrics
            return "{\"w\":${metrics.widthPixels / metrics.density},\"h\":${metrics.heightPixels / metrics.density}}"
        }

        @JavascriptInterface
        fun openApp() {}

        @JavascriptInterface
        fun moveTo(x: Int, y: Int) {}
    }
}
