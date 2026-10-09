package com.tasneem.app;
import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.*;
import androidx.core.app.NotificationCompat;
public class UnlockService extends Service {
  static final int ID = 2500;
  UnlockReceiver receiver;
  @Override public void onCreate() {
    super.onCreate();
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel ch = new NotificationChannel("tasneem_service", "تشغيل التذكير", NotificationManager.IMPORTANCE_MIN);
      ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(ch);
    }
    Notification n = new NotificationCompat.Builder(this, "tasneem_service").setSmallIcon(R.drawable.ic_stat_mosque)
      .setContentTitle("تسنيم").setContentText("تذكير الصلاة على النبي ﷺ عند فتح الهاتف").setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_MIN).build();
    if (Build.VERSION.SDK_INT >= 34) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
    else startForeground(ID, n);
    receiver = new UnlockReceiver();
    androidx.core.content.ContextCompat.registerReceiver(this, receiver, new IntentFilter(Intent.ACTION_USER_PRESENT), androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED);
  }
  @Override public int onStartCommand(Intent i, int f, int id) { return START_STICKY; }
  @Override public void onDestroy() { try { if (receiver != null) unregisterReceiver(receiver); } catch (Exception ignored) {} super.onDestroy(); }
  @Override public IBinder onBind(Intent i) { return null; }
}
