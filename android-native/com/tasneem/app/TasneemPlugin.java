package com.tasneem.app;

import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.*;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.*;
import java.io.*;
import java.util.*;
import java.net.*;

@CapacitorPlugin(name = "Tasneem")
public class TasneemPlugin extends Plugin {
  static final String PREF = "tasneem_native";
  static final int AYAH_ID = 2200;
  static final String AYAH_CHANNEL = "tasneem_ayah";
  static final String SALAWAT_CHANNEL = "tasneem_salawat_v3"; // v3: قناة بصوت salawat.mp3 يشغّله النظام نفسه
  static final String SALAWAT_SILENT_CHANNEL = "tasneem_salawat_v3_silent"; // لما «صوت مع تنبيه فتح الهاتف» مقفول
  static final String ADHAN_CHANNEL = "tasneem_adhan";
  static final String ADHAN_URL = "https://upload.wikimedia.org/wikipedia/commons/e/e7/Adhan.ogg";

  static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREF, Context.MODE_PRIVATE); }

  @PluginMethod public void start(PluginCall call) {
    ensureChannels();
    downloadAdhanIfNeeded(getContext());
    scheduleAyahOfDay(this.getContext());
    syncUnlockService(this.getContext());
    call.resolve();
  }


  // الأذان مضمّن داخل APK. لا نعتمد على الإنترنت لتشغيله.
  static void downloadAdhanIfNeeded(final Context c) {
    // متروك كدالة توافقية مع الإصدارات السابقة؛ لا يوجد تنزيل شبكي.
  }

  @PluginMethod public void setConfig(PluginCall call) {
    JSObject o = call.getData();
    SharedPreferences.Editor e = prefs(getContext()).edit();
    if (o.has("unlockEnabled")) e.putBoolean("unlockEnabled", o.optBoolean("unlockEnabled"));
    if (o.has("soundEnabled")) e.putBoolean("soundEnabled", o.optBoolean("soundEnabled"));
    if (o.has("periodicEnabled")) e.putBoolean("periodicEnabled", o.optBoolean("periodicEnabled"));
    if (o.has("periodicMin")) e.putInt("periodicMin", o.optInt("periodicMin"));
    if (o.has("adhanEnabled")) e.putBoolean("adhanEnabled", o.optBoolean("adhanEnabled"));
    if (o.has("cooldownMin")) e.putInt("cooldownMin", o.optInt("cooldownMin"));
    e.apply();
    syncUnlockService(getContext());
    call.resolve();
  }

  static void syncUnlockService(Context c) {
    try {
      Intent in = new Intent(c, UnlockService.class);
      if (prefs(c).getBoolean("unlockEnabled", true)) {
        if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(in); else c.startService(in);
      } else c.stopService(in);
    } catch (Exception ignored) {}
  }

  @PluginMethod public void refreshWidget(PluginCall call) { scheduleAyahOfDay(getContext()); call.resolve(); }

  @PluginMethod public void scheduleAdhan(PluginCall call) {
    cancelAdhanAlarms(getContext());
    JSONArray times = call.getData().optJSONArray("times"); if (times == null) times = new JSONArray();
    SharedPreferences.Editor e = prefs(getContext()).edit().putString("adhan_times", times.toString());
    e.apply();
    AlarmManager am = (AlarmManager)getContext().getSystemService(Context.ALARM_SERVICE);
    for (int i=0;i<times.length();i++) {
      try {
        JSONObject t = times.getJSONObject(i);
        long at=t.getLong("at"); String name=t.optString("name","الصلاة");
        if (at <= System.currentTimeMillis()) continue;
        Intent in=new Intent(getContext(), AdhanAlarmReceiver.class).setAction("com.tasneem.ADHAN");
        in.putExtra("name",name); in.putExtra("request",3000+i);
        PendingIntent pi=PendingIntent.getBroadcast(getContext(),3000+i,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        if (Build.VERSION.SDK_INT>=31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
        else am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
      } catch(Exception ignored) {}
    }
    call.resolve();
  }

  @PluginMethod public void startPlayback(PluginCall call) {
    try { Intent i=new Intent(getContext(), PlaybackService.class); if(Build.VERSION.SDK_INT>=26) getContext().startForegroundService(i); else getContext().startService(i); call.resolve(); }
    catch(Exception e){ call.resolve(); }
  }
  @PluginMethod public void stopPlayback(PluginCall call) {
    try { getContext().stopService(new Intent(getContext(), PlaybackService.class)); } catch(Exception ignored){}
    call.resolve();
  }

  @PluginMethod public void stopAdhan(PluginCall call) {
    try { getContext().stopService(new Intent(getContext(), AdhanService.class)); } catch(Exception ignored) {}
    ((NotificationManager)getContext().getSystemService(Context.NOTIFICATION_SERVICE)).cancel(AdhanService.ID);
    call.resolve();
  }

  @PluginMethod public void pullCounts(PluginCall call) {
    SharedPreferences p=prefs(getContext());
    JSObject r=new JSObject();
    r.put("salawat",p.getInt("pending_salawat",0)); r.put("gateRead",p.getInt("pending_gate",0)); r.put("gateChars",p.getInt("pending_chars",0));
    p.edit().putInt("pending_salawat",0).putInt("pending_gate",0).putInt("pending_chars",0).apply();
    call.resolve(r);
  }

  @PluginMethod public void requestPinWidget(PluginCall call) { JSObject r=new JSObject(); r.put("supported",false); call.resolve(r); }
  @PluginMethod public void shareApk(PluginCall call) {
    try { Intent i=new Intent(Intent.ACTION_SEND); i.setType("text/plain"); i.putExtra(Intent.EXTRA_TEXT,"تطبيق جيهان — المصحف والأذكار"); getContext().startActivity(Intent.createChooser(i,"مشاركة جيهان")); call.resolve(); }
    catch(Exception e){ call.reject("share_failed",e); }
  }

  static void ensureChannels(Context c) {
    if (Build.VERSION.SDK_INT<26) return;
    NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
    NotificationChannel ay=new NotificationChannel(AYAH_CHANNEL,"آية اليوم",NotificationManager.IMPORTANCE_DEFAULT);
    NotificationChannel sal=new NotificationChannel(SALAWAT_CHANNEL,"الصلاة على النبي",NotificationManager.IMPORTANCE_DEFAULT);
    sal.setDescription("تنبيه الصلاة على النبي ﷺ عند فتح الهاتف (بصوت)"); sal.enableVibration(false);
    int salRes=c.getResources().getIdentifier("salawat","raw",c.getPackageName());
    if(salRes!=0){
      android.media.AudioAttributes aa=new android.media.AudioAttributes.Builder()
        .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
      sal.setSound(android.net.Uri.parse("android.resource://"+c.getPackageName()+"/"+salRes),aa);
    }
    NotificationChannel salSilent=new NotificationChannel(SALAWAT_SILENT_CHANNEL,"الصلاة على النبي (صامت)",NotificationManager.IMPORTANCE_LOW);
    salSilent.setDescription("تنبيه الصلاة على النبي ﷺ بدون صوت"); salSilent.setSound(null,null); salSilent.enableVibration(false);
    NotificationChannel ad=new NotificationChannel(ADHAN_CHANNEL,"الأذان",NotificationManager.IMPORTANCE_HIGH);
    ad.setDescription("تنبيه الأذان مع صوت الأذان وزر الإيقاف"); ad.enableVibration(true); ad.setSound(null,null);
    // القنوات القديمة كانت بصوت النظام الافتراضي (وأندرويد مابيغيّرش صوت قناة موجودة) — نمسحها مرة واحدة
    SharedPreferences pr=prefs(c);
    if(!pr.getBoolean("salawat_channels_v3",false)){
      try{ nm.deleteNotificationChannel("tasneem_salawat"); nm.deleteNotificationChannel("tasneem_salawat_silent"); nm.deleteNotificationChannel("tasneem_salawat_v2"); }catch(Exception ignored){}
      pr.edit().putBoolean("salawat_channels_v3",true).apply();
    }
    nm.createNotificationChannel(ay); nm.createNotificationChannel(sal); nm.createNotificationChannel(salSilent); nm.createNotificationChannel(ad);
  }
  void ensureChannels(){ensureChannels(getContext());}

  static void scheduleAyahOfDay(Context c) {
    ensureChannels(c);
    Calendar cal=Calendar.getInstance(); cal.set(Calendar.HOUR_OF_DAY,8); cal.set(Calendar.MINUTE,0); cal.set(Calendar.SECOND,0); cal.set(Calendar.MILLISECOND,0);
    if(cal.getTimeInMillis()<=System.currentTimeMillis()) cal.add(Calendar.DAY_OF_YEAR,1);
    Intent in=new Intent(c,AyahAlarmReceiver.class).setAction("com.tasneem.AYAH");
    PendingIntent pi=PendingIntent.getBroadcast(c,AYAH_ID,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    AlarmManager am=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
    am.cancel(pi);
    // آية جديدة كل 4 ساعات تقريبًا (بدل مرة في اليوم) — أول موعد على أقرب مضاعف من الساعة 8 صباحًا
    long every = 4L*60*60*1000, first = cal.getTimeInMillis();
    while (first - every > System.currentTimeMillis()) first -= every;
    if(Build.VERSION.SDK_INT>=31 && !am.canScheduleExactAlarms()) am.setInexactRepeating(AlarmManager.RTC_WAKEUP,first,every,pi);
    else am.setRepeating(AlarmManager.RTC_WAKEUP,first,every,pi);
  }

  static void cancelAdhanAlarms(Context c){
    AlarmManager am=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
    String raw=prefs(c).getString("adhan_times","[]");
    try { JSONArray a=new JSONArray(raw); for(int i=0;i<a.length();i++){ Intent in=new Intent(c,AdhanAlarmReceiver.class).setAction("com.tasneem.ADHAN"); PendingIntent pi=PendingIntent.getBroadcast(c,3000+i,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE); am.cancel(pi); } } catch(Exception ignored){}
  }

  static JSONObject nextAyah(Context c){
    try {
      String raw=readAsset(c,"public/data/quran.json");
      JSONArray a=new JSONArray(raw);
      int idx=prefs(c).getInt("ayah_index",0)%a.length();
      JSONObject q=a.getJSONObject(idx);
      prefs(c).edit().putInt("ayah_index",(idx+1)%a.length()).apply();
      return q;
    } catch(Exception e){ return null; }
  }
  static String readAsset(Context c,String name)throws Exception{ InputStream in=c.getAssets().open(name); ByteArrayOutputStream out=new ByteArrayOutputStream(); byte[] b=new byte[8192]; int n; while((n=in.read(b))!=-1)out.write(b,0,n); in.close(); return out.toString("UTF-8"); }
  static void showAyah(Context c){
    ensureChannels(c); JSONObject q=nextAyah(c); if(q==null)return;
    String text=q.optString("text_uthmani",q.optString("text_clean","")); String surah=q.optString("surah_name","سورة"); int ayah=q.optInt("ayah",0);
    Intent read=new Intent(c,NotificationActionReceiver.class).setAction("com.tasneem.READ_AYAH").putExtra("id",AYAH_ID);
    PendingIntent rp=PendingIntent.getBroadcast(c,AYAH_ID,read,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    NotificationCompat.Builder b=new NotificationCompat.Builder(c,AYAH_CHANNEL).setSmallIcon(R.drawable.ic_stat_mosque).setContentTitle("آية اليوم").setContentText(surah+" — آية "+ayah).setStyle(new NotificationCompat.BigTextStyle().bigText(text)).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_DEFAULT).addAction(new NotificationCompat.Action(0,"✓ قرأت الآية",rp));
    ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(AYAH_ID,b.build());
  }
}
