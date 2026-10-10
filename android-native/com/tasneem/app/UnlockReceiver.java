package com.tasneem.app;
import android.app.*;import android.content.*;import androidx.core.app.NotificationCompat;
public class UnlockReceiver extends BroadcastReceiver{
 public void onReceive(Context c,Intent i){
  String act=i.getAction();
  boolean unlocked=Intent.ACTION_USER_PRESENT.equals(act);
  if(Intent.ACTION_SCREEN_ON.equals(act)){
    // لو الفون من غير قفل شاشة، أندرويد ساعات مابيبعتش USER_PRESENT — نعتبر تشغيل الشاشة فتح
    android.app.KeyguardManager km=(android.app.KeyguardManager)c.getSystemService(Context.KEYGUARD_SERVICE);
    if(km!=null && km.isKeyguardLocked()) return;
    unlocked=true;
  }
  if(!unlocked)return;
  android.content.SharedPreferences p=TasneemPlugin.prefs(c);
  if(System.currentTimeMillis()-p.getLong("last_fire",0)<15000) return; // منع التكرار لو جه الحدثين
  p.edit().putLong("last_fire",System.currentTimeMillis()).apply();
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
  // الإشعار صامت؛ الصوت بيتشغّل من SalawatSound (ملف salawat.mp3 على صوت الوسائط، وبديله نطق عربي TTS)
  Notification n=new NotificationCompat.Builder(c,TasneemPlugin.SALAWAT_CHANNEL).setSmallIcon(com.tasneem.app.R.drawable.ic_stat_mosque)
    .setContentTitle("الصلاة على النبي ﷺ").setContentText("اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ")
    .setAutoCancel(true).setSilent(true).setContentIntent(op)
    .addAction(new NotificationCompat.Action(0,"✓ تمّت",dp)).build();
  nm.notify(2400,n);
  if(snd) SalawatSound.play(c);
 }
}
