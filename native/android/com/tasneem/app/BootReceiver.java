package com.tasneem.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) return;
        TasneemService.sync(c);
        android.content.SharedPreferences p=c.getSharedPreferences(TasneemPlugin.PREFS,Context.MODE_PRIVATE);
        AlarmManager alarm=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        int count=p.getInt("adhan_count",0);
        for(int i=0;i<count;i++){
            long at=p.getLong("adhan_at_"+i,0); if(at<=System.currentTimeMillis()) continue;
            String name=p.getString("adhan_name_"+i,"الصلاة");
            Intent in=new Intent(c,AdhanReceiver.class).setAction(TasneemPlugin.ACTION_ADHAN).putExtra(TasneemPlugin.EXTRA_NAME,name).putExtra(TasneemPlugin.EXTRA_AT,at).putExtra("slot",i);
            PendingIntent pi=PendingIntent.getBroadcast(c,8000+i,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            if(Build.VERSION.SDK_INT>=31&&!alarm.canScheduleExactAlarms()) alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
            else if(Build.VERSION.SDK_INT>=23) alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
            else alarm.setExact(AlarmManager.RTC_WAKEUP,at,pi);
        }
    }
}
