package com.lumapet

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            webView = WebView(this).apply {
                // A few vendor WebViews crash while compositing a continuously
                // animated canvas with hardware acceleration. Software compositing
                // keeps Android stable; desktop/Web use the GPU.
                setLayerType(View.LAYER_TYPE_SOFTWARE, null)
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.cacheMode = WebSettings.LOAD_DEFAULT
                webViewClient = WebViewClient()
                addJavascriptInterface(AppBridge(), "LumaAndroid")
                loadUrl("file:///android_asset/public/index.html?platform=android")
            }
            setContentView(webView)
        } catch (_: Throwable) {
            // If the system WebView provider is unavailable, keep a native screen
            // open instead of letting the launcher report an instant crash.
            setContentView(TextView(this).apply {
                text = "LumaPet 暂时无法启动系统 WebView\n请更新或启用 Android System WebView 后重试。"
                setTextColor(Color.WHITE)
                setBackgroundColor(Color.rgb(13, 12, 22))
                textSize = 16f
                setPadding(48, 48, 48, 48)
            })
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) webView.destroy()
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
