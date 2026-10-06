package com.tasneem.app;
import android.app.*;import android.appwidget.*;import android.content.*;import android.widget.RemoteViews;
public class TasneemWidget extends AppWidgetProvider{
 public void onUpdate(Context c,AppWidgetManager m,int[] ids){refresh(c);}
 public static void refresh(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);int[] ids=m.getAppWidgetIds(new ComponentName(c,TasneemWidget.class));android.content.SharedPreferences p=c.getSharedPreferences(TasneemPlugin.PREFS,Context.MODE_PRIVATE);int s=p.getInt("widget_surah",0),a=p.getInt("widget_ayah",0);String text=p.getString("widget_text","");for(int id:ids){RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.tasneem_widget);v.setTextViewText(R.id.widget_title,"تسنيم");v.setTextViewText(R.id.widget_text,s>0&&a>0?"سورة "+s+" — آية "+a+"\n"+text:"آية اليوم — افتح المصحف للمتابعة");Intent in=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());if(in!=null)v.setOnClickPendingIntent(R.id.widget_root,PendingIntent.getActivity(c,9200,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));m.updateAppWidget(id,v);}}
}
