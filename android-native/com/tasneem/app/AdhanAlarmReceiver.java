package com.tasneem.app;
import android.content.*;
public class AdhanAlarmReceiver extends BroadcastReceiver{
 public void onReceive(Context c,Intent i){ Intent s=new Intent(c,AdhanService.class).setAction(AdhanService.ACTION_PLAY).putExtra("name",i.getStringExtra("name")); if(android.os.Build.VERSION.SDK_INT>=26)c.startForegroundService(s);else c.startService(s); }
}
