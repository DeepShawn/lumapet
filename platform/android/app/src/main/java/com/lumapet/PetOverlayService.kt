package com.lumapet

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.TextView
import androidx.core.app.NotificationCompat

class PetOverlayService : Service() {
    private var windowManager: WindowManager? = null
    private var overlay: TextView? = null

    override fun onCreate() {
        super.onCreate()
        try {
            createChannel()
            if (!startForegroundSafely()) {
                stopSelf()
                return
            }
            if (Settings.canDrawOverlays(this)) attachOverlay()
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
                startForeground(
                    1024,
                    notification(),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                )
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

    private fun attachOverlay() {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        overlay = TextView(this).apply {
            text = "✦"
            textSize = 28f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.TRANSPARENT)
            gravity = Gravity.CENTER
            setOnClickListener { startActivity(Intent(this@PetOverlayService, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
        }
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE
        val params = WindowManager.LayoutParams(72, 72, type, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT).apply {
            gravity = Gravity.TOP or Gravity.END
            y = 180
        }
        try {
            windowManager?.addView(overlay, params)
        } catch (_: SecurityException) {
            overlay = null
            stopSelf()
        } catch (_: RuntimeException) {
            overlay = null
            stopSelf()
        }
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel("lumapet_overlay", "LumaPet 悬浮桌宠", NotificationManager.IMPORTANCE_LOW))
        }
    }

    private fun notification(): Notification = NotificationCompat.Builder(this, "lumapet_overlay")
        .setSmallIcon(android.R.drawable.sym_def_app_icon)
        .setContentTitle("LumaPet 正在桌面陪伴")
        .setContentText("点击悬浮图标返回 AI 桌宠")
        .setOngoing(true)
        .build()

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        try {
            overlay?.let { windowManager?.removeView(it) }
        } catch (_: RuntimeException) {
            // The system may already have removed the overlay during shutdown.
        }
        overlay = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
