package com.lumapet

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.NotificationCompat

// Floating pet over other apps: a small transparent WebView window running the
// same web app in overlay mode. The page simulates the pet across the whole
// screen and calls moveTo() so the window follows the pet around.
class PetOverlayService : Service() {
    private var windowManager: WindowManager? = null
    private var webView: WebView? = null
    private var params: WindowManager.LayoutParams? = null
    private val main = Handler(Looper.getMainLooper())

    override fun onCreate() {
        super.onCreate()
        try {
            createChannel()
            if (!startForegroundSafely() || !Settings.canDrawOverlays(this)) {
                stopSelf()
                return
            }
            attachOverlay()
        } catch (_: SecurityException) {
            // A denied special-use/notification permission must not crash the app.
            stopSelf()
        } catch (_: RuntimeException) {
            stopSelf()
        }
    }

    private fun startForegroundSafely(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(1024, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            } else {
                startForeground(1024, notification())
            }
            true
        } catch (_: SecurityException) {
            false
        } catch (_: RuntimeException) {
            false
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun attachOverlay() {
        val manager = getSystemService(WINDOW_SERVICE) as WindowManager
        windowManager = manager
        val density = resources.displayMetrics.density
        val view = WebView(this).apply {
            setLayerType(View.LAYER_TYPE_SOFTWARE, null)
            setBackgroundColor(Color.TRANSPARENT)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = object : WebViewClient() {
                // A dead renderer must not crash the app; drop the floating pet instead.
                override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                    try {
                        windowManager?.removeView(view)
                    } catch (_: RuntimeException) {
                        // Already detached.
                    }
                    view.destroy()
                    if (webView === view) webView = null
                    stopSelf()
                    return true
                }
            }
            addJavascriptInterface(OverlayBridge(), "LumaAndroid")
            loadUrl("file:///android_asset/public/index.html?platform=android&overlay=1")
        }
        val layout = WindowManager.LayoutParams(
            (240 * density).toInt(),
            (260 * density).toInt(),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = resources.displayMetrics.widthPixels - (260 * density).toInt()
            y = (120 * density).toInt()
        }
        params = layout
        try {
            manager.addView(view, layout)
            webView = view
        } catch (_: RuntimeException) {
            view.destroy()
            stopSelf()
        }
    }

    inner class OverlayBridge {
        @JavascriptInterface
        fun screenInfo(): String {
            val metrics = resources.displayMetrics
            return "{\"w\":${metrics.widthPixels / metrics.density},\"h\":${metrics.heightPixels / metrics.density}}"
        }

        @JavascriptInterface
        fun moveTo(x: Int, y: Int) {
            val density = resources.displayMetrics.density
            main.post {
                val view = webView ?: return@post
                val layout = params ?: return@post
                layout.x = (x * density).toInt()
                layout.y = (y * density).toInt()
                try {
                    windowManager?.updateViewLayout(view, layout)
                } catch (_: RuntimeException) {
                    // The window may be detaching during shutdown.
                }
            }
        }

        @JavascriptInterface
        fun openApp() {
            main.post {
                try {
                    startActivity(Intent(this@PetOverlayService, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT))
                } catch (_: RuntimeException) {
                    // Background activity starts can be blocked; the notification still works.
                }
            }
        }

        @JavascriptInterface
        fun startOverlay(): String = "ok"

        @JavascriptInterface
        fun stopOverlay() {
            main.post { stopSelf() }
        }
    }

    private fun createChannel() {
        getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel("lumapet_overlay", "LumaPet 悬浮桌宠", NotificationManager.IMPORTANCE_LOW))
    }

    private fun notification(): Notification {
        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, "lumapet_overlay")
            .setSmallIcon(android.R.drawable.sym_def_app_icon)
            .setContentTitle("LumaPet 正在手机桌面上散步")
            .setContentText("点按回到 LumaPet；双击桌宠也能打开")
            .setContentIntent(open)
            .setOngoing(true)
            .build()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        try {
            webView?.let { windowManager?.removeView(it) }
        } catch (_: RuntimeException) {
            // The system may already have removed the overlay during shutdown.
        }
        webView?.destroy()
        webView = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
