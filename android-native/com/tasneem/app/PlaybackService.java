package com.tasneem.app;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.*;
import androidx.core.app.NotificationCompat;

/** خدمة أمامية تُبقي تلاوة المصحف شغّالة لما الشاشة تتقفل أو التطبيق يتصغّر. */
public class PlaybackService extends Service {
  static final int ID = 2600;
  PowerManager.WakeLock wl;
  @Override public void onCreate() {
    super.onCreate();
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel ch = new NotificationChannel("tasneem_playback", "تلاوة المصحف", NotificationManager.IMPORTANCE_LOW);
      ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(ch);
    }
    Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent op = PendingIntent.getActivity(this, ID, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    Notification n = new NotificationCompat.Builder(this, "tasneem_playback").setSmallIcon(R.drawable.ic_stat_mosque)
      .setContentTitle("الرحمن").setContentText("تلاوة المصحف شغّالة — افتح التطبيق للإيقاف")
      .setOngoing(true).setContentIntent(op).setPriority(NotificationCompat.PRIORITY_LOW).build();
    if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
    else startForeground(ID, n);
    try {
      PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
      wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "tasneem:playback");
      wl.acquire(6 * 60 * 60 * 1000L);
    } catch (Exception ignored) {}
  }
  @Override public int onStartCommand(Intent i, int f, int id) { return START_NOT_STICKY; }
  @Override public void onDestroy() { try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception ignored) {} super.onDestroy(); }
  @Override public IBinder onBind(Intent i) { return null; }
}
