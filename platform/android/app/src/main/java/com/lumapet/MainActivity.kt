package com.lumapet

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            webViewClient = WebViewClient()
            loadUrl("file:///android_asset/public/index.html?platform=android")
        }
        setContentView(webView)
        ensureOverlayPermission()
    }

    private fun ensureOverlayPermission() {
        if (!Settings.canDrawOverlays(this)) {
            try {
                startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            } catch (_: RuntimeException) {
                // Some vendor ROMs do not expose the per-app overlay settings page.
                // The chat UI remains usable without the optional floating pet.
                Toast.makeText(this, "系统未提供悬浮窗设置，LumaPet 将以普通页面运行", Toast.LENGTH_LONG).show()
            }
            return
        }
        startOverlayServiceSafely()
    }

    override fun onResume() {
        super.onResume()
        // Returning from the system overlay-permission screen does not recreate the
        // activity. Start the service here so the first grant takes effect immediately.
        if (Settings.canDrawOverlays(this)) {
            startOverlayServiceSafely()
        }
    }

    private fun startOverlayServiceSafely() {
        try {
            ContextCompat.startForegroundService(this, Intent(this, PetOverlayService::class.java))
        } catch (_: SecurityException) {
            Toast.makeText(this, "悬浮桌宠权限不可用，已保留普通页面模式", Toast.LENGTH_SHORT).show()
        } catch (_: RuntimeException) {
            // Foreground-service restrictions vary across Android versions and OEM ROMs.
            // Do not let the optional overlay terminate the main activity.
        }
    }

    override fun onDestroy() {
        // The service intentionally stays alive so the pet remains visible after the app is closed.
        super.onDestroy()
    }
}
