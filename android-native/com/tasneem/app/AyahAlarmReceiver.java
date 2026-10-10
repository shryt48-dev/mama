package com.tasneem.app;
import android.content.*;
public class AyahAlarmReceiver extends BroadcastReceiver{public void onReceive(Context c,Intent i){
  try{ TasneemPlugin.showAyah(c); }catch(Exception ignored){}
  TasneemPlugin.syncUnlockService(c); // حارس: لو سامسونج قتلت خدمة فتح الهاتف نرجّعها (كل ~٤ ساعات)
}}
