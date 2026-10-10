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
  Intent open=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
  PendingIntent op=open==null?null:PendingIntent.getActivity(c,2401,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  boolean snd=p.getBoolean("soundEnabled",true);
  // الصوت بيتشغّل من قناة الإشعار نفسها (النظام هو اللي بيشغّله) — أضمن من MediaPlayer جوه الـReceiver
  NotificationCompat.Builder nb=new NotificationCompat.Builder(c,snd?TasneemPlugin.SALAWAT_CHANNEL:TasneemPlugin.SALAWAT_SILENT_CHANNEL)
    .setSmallIcon(com.tasneem.app.R.drawable.ic_stat_mosque)
    .setContentTitle("الصلاة على النبي ﷺ").setContentText("اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ")
    .setCategory(NotificationCompat.CATEGORY_REMINDER).setOnlyAlertOnce(false)
    .setAutoCancel(true).setContentIntent(op)
    .addAction(new NotificationCompat.Action(0,"✓ تمّت",dp));
  if(!snd) nb.setSilent(true);
  else if(android.os.Build.VERSION.SDK_INT<26){
    int r=c.getResources().getIdentifier("salawat","raw",c.getPackageName());
    if(r!=0) nb.setSound(android.net.Uri.parse("android.resource://"+c.getPackageName()+"/"+r));
  }
  nm.cancel(2400); // نمسح القديم عشان التنبيه الجديد يطلع بصوته
  nm.notify(2400,nb.build());
 }
}
