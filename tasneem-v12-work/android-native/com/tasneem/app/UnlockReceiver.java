package com.tasneem.app;
import android.app.*;import android.content.*;import androidx.core.app.NotificationCompat;
public class UnlockReceiver extends BroadcastReceiver{
 public void onReceive(Context c,Intent i){
  if(!Intent.ACTION_USER_PRESENT.equals(i.getAction()))return;
  android.content.SharedPreferences p=TasneemPlugin.prefs(c);
  if(!p.getBoolean("unlockEnabled",true))return;
  long now=System.currentTimeMillis(), last=p.getLong("last_unlock",0); int cd=p.getInt("cooldownMin",0);
  if(cd>0 && now-last<cd*60000L)return;
  p.edit().putLong("last_unlock",now).putInt("pending_salawat",p.getInt("pending_salawat",0)+1).apply();
  TasneemPlugin.ensureChannels(c);
  NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
  Intent done=new Intent(c,NotificationActionReceiver.class).setAction("com.tasneem.MARK_SALAWAT");
  PendingIntent dp=PendingIntent.getBroadcast(c,2400,done,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  String channel=p.getBoolean("soundEnabled",true)?TasneemPlugin.SALAWAT_CHANNEL:TasneemPlugin.SALAWAT_SILENT_CHANNEL;
  Notification n=new NotificationCompat.Builder(c,channel).setSmallIcon(com.tasneem.app.R.drawable.ic_stat_mosque)
    .setContentTitle("الصلاة على النبي ﷺ").setContentText("اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ")
    .setAutoCancel(true).addAction(new NotificationCompat.Action(0,"✓ تمّت",dp)).build();
  nm.notify(2400,n);
 }
}
