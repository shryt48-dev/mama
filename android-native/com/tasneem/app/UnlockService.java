package com.tasneem.app;
import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.*;
import androidx.core.app.NotificationCompat;

/**
 * خدمة أمامية بتسمع USER_PRESENT / SCREEN_ON (مينفعش تتسجّل في الـManifest من أندرويد 8).
 * سامسونج وغيرها بيقتلوا الخدمة — فهنا: START_STICKY + إعادة تشغيل عند سحب التطبيق من الأخيرة / عند الإيقاف
 * + إعادة تشغيل عند الإقلاع وعند كل تنبيه آية (TasneemPlugin.syncUnlockService).
 */
public class UnlockService extends Service {
  static final int ID = 2500;
  private UnlockReceiver receiver;

  @Override public void onCreate() {
    super.onCreate();
    startAsForeground();
    registerUnlockReceiver();
  }

  private void startAsForeground() {
    try {
      if (Build.VERSION.SDK_INT >= 26) {
        NotificationChannel ch = new NotificationChannel("tasneem_service", "تشغيل التذكير", NotificationManager.IMPORTANCE_MIN);
        ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(ch);
      }
      Notification n = new NotificationCompat.Builder(this, "tasneem_service").setSmallIcon(R.drawable.ic_stat_mosque)
        .setContentTitle("جيهان").setContentText("تذكير الصلاة على النبي ﷺ عند فتح الهاتف").setOngoing(true)
        .setPriority(NotificationCompat.PRIORITY_MIN).build();
      try {
        if (Build.VERSION.SDK_INT >= 34) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(ID, n);
      } catch (Exception first) {
        startForeground(ID, n); // بدون تحديد النوع (بياخده من الـManifest)
      }
      TasneemPlugin.prefs(this).edit().putString("dbg_service", "fg-ok").putLong("dbg_service_ts", System.currentTimeMillis()).apply();
    } catch (Exception e) {
      TasneemPlugin.prefs(this).edit().putString("dbg_service", "fg-fail " + e).putLong("dbg_service_ts", System.currentTimeMillis()).apply();
    }
  }

  private void registerUnlockReceiver() {
    if (receiver != null) return;
    try {
      receiver = new UnlockReceiver();
      // بثّ نظام محمي (مفيش تطبيق يقدر يبعته) فـ EXPORTED آمن، وبيتجنّب مشاكل بعض الأجهزة مع NOT_EXPORTED
      androidx.core.content.ContextCompat.registerReceiver(this, receiver, unlockFilter(), androidx.core.content.ContextCompat.RECEIVER_EXPORTED);
    } catch (Exception e) {
      receiver = null;
      TasneemPlugin.prefs(this).edit().putString("dbg_service", "receiver-fail " + e).apply();
    }
  }

  static IntentFilter unlockFilter() {
    IntentFilter f = new IntentFilter(Intent.ACTION_USER_PRESENT);
    f.addAction(Intent.ACTION_SCREEN_ON);
    return f;
  }

  /** يجدول تشغيل الخدمة تاني بعد تأخير قصير (لو الميزة لسه مفعّلة). */
  static void scheduleRestart(Context c, long delayMs) {
    try {
      if (!TasneemPlugin.prefs(c).getBoolean("unlockEnabled", true)) return;
      Intent in = new Intent(c, UnlockService.class);
      int fl = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
      PendingIntent pi = Build.VERSION.SDK_INT >= 26
        ? PendingIntent.getForegroundService(c, 2501, in, fl) : PendingIntent.getService(c, 2501, in, fl);
      AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
      long at = System.currentTimeMillis() + delayMs;
      if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
      else am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    } catch (Exception ignored) {}
  }

  @Override public int onStartCommand(Intent i, int f, int id) {
    registerUnlockReceiver();
    return START_STICKY;
  }

  @Override public void onTaskRemoved(Intent rootIntent) {
    scheduleRestart(this, 1500);
    super.onTaskRemoved(rootIntent);
  }

  @Override public void onDestroy() {
    try { if (receiver != null) unregisterReceiver(receiver); } catch (Exception ignored) {}
    receiver = null;
    scheduleRestart(this, 3000); // لو اتقتلت من النظام؛ ولو المستخدم قفل الميزة مش هتتجدول
    super.onDestroy();
  }

  @Override public IBinder onBind(Intent i) { return null; }
}
