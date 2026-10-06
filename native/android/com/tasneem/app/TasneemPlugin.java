package com.tasneem.app;

import android.Manifest;
import android.app.*;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "Tasneem")
public class TasneemPlugin extends Plugin {
    public static final String PREFS="tasneem_native", CHANNEL_ADHAN="adhan", CHANNEL_LOCK="tasneem_lock", ACTION_ADHAN="com.tasneem.app.ACTION_ADHAN";
    public static final String EXTRA_NAME="name", EXTRA_AT="at";
    private android.content.SharedPreferences prefs(){ return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    @PluginMethod public void start(PluginCall call){
        createChannels();
        TasneemService.sync(getContext());
        if(Build.VERSION.SDK_INT>=33 && getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS},701);
        call.resolve();
    }
    @PluginMethod public void setConfig(PluginCall call){
        android.content.SharedPreferences.Editor e=prefs().edit();
        String[] bools={"unlockEnabled","soundEnabled","periodicEnabled","adhanEnabled","lockAyahEnabled"};
        for(String k:bools) if(call.hasOption(k)) e.putBoolean(k, call.getBoolean(k,false));
        if(call.hasOption("periodicMin")) e.putInt("periodicMin",call.getInt("periodicMin",60));
        if(call.hasOption("cooldownMin")) e.putInt("cooldownMin",call.getInt("cooldownMin",30));
        if(call.hasOption("reciter")) e.putString("reciter",call.getString("reciter","yasser"));
        e.apply(); TasneemService.sync(getContext()); call.resolve();
    }
    @PluginMethod public void scheduleAdhan(PluginCall call){
        AlarmManager alarm=(AlarmManager)getContext().getSystemService(Context.ALARM_SERVICE);
        cancelAllAdhan(alarm); JSONArray times=call.getArray("times");
        if(times==null){prefs().edit().putInt("adhan_count",0).apply();call.resolve();return;}
        prefs().edit().putInt("adhan_count",times.length()).apply();
        for(int i=0;i<times.length();i++) try{
            JSONObject o=times.optJSONObject(i); if(o==null)continue;
            long at=o.optLong("at",0); String name=o.optString("name","الصلاة");
            prefs().edit().putLong("adhan_at_"+i,at).putString("adhan_name_"+i,name).apply();
            if(at<=System.currentTimeMillis())continue;
            Intent in=new Intent(getContext(),AdhanReceiver.class).setAction(ACTION_ADHAN).putExtra(EXTRA_NAME,name).putExtra(EXTRA_AT,at).putExtra("slot",i);
            PendingIntent pi=PendingIntent.getBroadcast(getContext(),8000+i,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            if(Build.VERSION.SDK_INT>=31 && !alarm.canScheduleExactAlarms()) alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
            else if(Build.VERSION.SDK_INT>=23) alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi); else alarm.setExact(AlarmManager.RTC_WAKEUP,at,pi);
        }catch(Exception ignored){}
        prefs().edit().putBoolean("adhanScheduled",true).apply(); call.resolve();
    }
    static void cancelStored(Context c){
        AlarmManager alarm=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE); android.content.SharedPreferences p=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE); int count=p.getInt("adhan_count",0);
        for(int i=0;i<count;i++){Intent in=new Intent(c,AdhanReceiver.class).setAction(ACTION_ADHAN);PendingIntent pi=PendingIntent.getBroadcast(c,8000+i,in,PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);if(pi!=null){alarm.cancel(pi);pi.cancel();}}
    }
    private void cancelAllAdhan(AlarmManager alarm){ cancelStored(getContext()); }
    @PluginMethod public void refreshWidget(PluginCall call){
        android.content.SharedPreferences.Editor e=prefs().edit();
        if(call.hasOption("surah"))e.putInt("widget_surah",call.getInt("surah",0));
        if(call.hasOption("ayah"))e.putInt("widget_ayah",call.getInt("ayah",0));
        if(call.hasOption("text"))e.putString("widget_text",call.getString("text","")); e.apply();
        TasneemWidget.refresh(getContext()); if(prefs().getBoolean("lockAyahEnabled", true)) TasneemLockNotification.refresh(getContext()); call.resolve();
    }
    @PluginMethod public void requestPinWidget(PluginCall call){
        if(Build.VERSION.SDK_INT<26){call.resolve(new JSObject().put("supported",false));return;}
        AppWidgetManager m=AppWidgetManager.getInstance(getContext());
        if(!m.isRequestPinAppWidgetSupported()){call.resolve(new JSObject().put("supported",false));return;}
        m.requestPinAppWidget(new ComponentName(getContext(),TasneemWidget.class),null,null);call.resolve(new JSObject().put("supported",true));
    }
    @PluginMethod public void pullCounts(PluginCall call){
        android.content.SharedPreferences p=prefs(); JSObject o=new JSObject(); o.put("salawat",p.getInt("salawat_pending",0));o.put("gateRead",p.getInt("gate_read_pending",0));o.put("gateChars",p.getInt("gate_chars_pending",0));
        p.edit().putInt("salawat_pending",0).putInt("gate_read_pending",0).putInt("gate_chars_pending",0).apply();call.resolve(o);
    }
    @PluginMethod public void shareApk(PluginCall call){try{
        File source=new File(getContext().getApplicationInfo().sourceDir), share=new File(getContext().getCacheDir(),"Tasneem.apk");
        FileInputStream fi=new FileInputStream(source); FileOutputStream fo=new FileOutputStream(share); byte[] buf=new byte[8192]; int n; while((n=fi.read(buf))>0) fo.write(buf,0,n); fi.close(); fo.close();
        Uri uri=FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".tasneemfp",share);
        Intent send=new Intent(Intent.ACTION_SEND).setType("application/vnd.android.package-archive").putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().startActivity(Intent.createChooser(send,"مشاركة تطبيق تسنيم"));call.resolve();
    }catch(Exception e){call.reject("تعذّرت مشاركة التطبيق",e);}}
    static void notifyUnlock(Context c){
        createChannelsFor(c);
        NotificationCompat.Builder n=new NotificationCompat.Builder(c,CHANNEL_LOCK)
            .setSmallIcon(R.drawable.ic_stat_mosque)
            .setContentTitle("الصلاة على النبي ﷺ")
            .setContentText("اللهم صل وسلم على نبينا محمد")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .addAction(0,"صلّيت على النبي ﷺ",CountReceiver.pending(c,CountReceiver.ACTION_SALAWAT,9402));
        ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(9302,n.build());
    }

    static void createChannelsFor(Context c){
        if(Build.VERSION.SDK_INT<26)return; NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel ad=new NotificationChannel(CHANNEL_ADHAN,"الأذان",NotificationManager.IMPORTANCE_HIGH);ad.setSound(Uri.parse("android.resource://"+c.getPackageName()+"/raw/adhan"),new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());ad.enableVibration(true);nm.createNotificationChannel(ad);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL_LOCK,"تسنيم",NotificationManager.IMPORTANCE_LOW));
    }
    private void createChannels(){createChannelsFor(getContext());}
}
