package com.lumapet

import android.os.Bundle
import android.graphics.Color
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            webView = WebView(this).apply {
                // A few vendor WebViews crash while compositing a continuously
                // animated canvas with hardware acceleration. Software compositing
                // keeps the first Android release stable; desktop/Web use GPU.
                setLayerType(View.LAYER_TYPE_SOFTWARE, null)
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.cacheMode = WebSettings.LOAD_DEFAULT
                webViewClient = WebViewClient()
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
}
