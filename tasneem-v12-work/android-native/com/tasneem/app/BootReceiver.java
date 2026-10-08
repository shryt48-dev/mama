package com.tasneem.app;
import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;
public class BootReceiver extends BroadcastReceiver {
  public void onReceive(Context c, Intent i) {
    String a = i.getAction();
    if (!Intent.ACTION_BOOT_COMPLETED.equals(a) && !"android.intent.action.MY_PACKAGE_REPLACED".equals(a)) return;
    TasneemPlugin.scheduleAyahOfDay(c);
    TasneemPlugin.syncUnlockService(c);
    // إعادة جدولة الأذان المخزّن (الأجهزة بتمسح المنبهات بعد إعادة التشغيل)
    try {
      JSONArray t = new JSONArray(TasneemPlugin.prefs(c).getString("adhan_times", "[]"));
      AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
      for (int k = 0; k < t.length(); k++) {
        JSONObject o = t.getJSONObject(k); long at = o.getLong("at");
        if (at <= System.currentTimeMillis()) continue;
        Intent in = new Intent(c, AdhanAlarmReceiver.class).setAction("com.tasneem.ADHAN").putExtra("name", o.optString("name", "الصلاة"));
        PendingIntent pi = PendingIntent.getBroadcast(c, 3000 + k, in, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        else am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
      }
    } catch (Exception ignored) {}
  }
}
