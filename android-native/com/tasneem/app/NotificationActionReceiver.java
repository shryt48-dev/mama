package com.tasneem.app;
import android.app.*;import android.content.*;
public class NotificationActionReceiver extends BroadcastReceiver{
 public void onReceive(Context c,Intent i){String a=i.getAction();NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
  if("com.tasneem.READ_AYAH".equals(a)){nm.cancel(TasneemPlugin.AYAH_ID);return;}
  if("com.tasneem.MARK_SALAWAT".equals(a)){nm.cancel(2400);return;}
  if("com.tasneem.STOP_ADHAN".equals(a)){
   // لا نعيد تشغيل Foreground Service من الخلفية لمجرد إيقافه؛ إيقاف الخدمة مباشرة أكثر أمانًا على Android الحديث.
   try{c.stopService(new Intent(c,AdhanService.class));}catch(Exception ignored){}
   nm.cancel(AdhanService.ID);
  }
 }
}
