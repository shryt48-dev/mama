package com.tasneem.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

/** Counts only real user actions tapped on notification buttons. */
public class CountReceiver extends BroadcastReceiver {
    public static final String ACTION_SALAWAT = "com.tasneem.app.ACTION_SALAWAT";
    public static final String ACTION_READ = "com.tasneem.app.ACTION_READ";

    @Override public void onReceive(Context c, Intent intent) {
        String a = intent.getAction();
        if (a == null) return;
        SharedPreferences p = c.getSharedPreferences(TasneemPlugin.PREFS, Context.MODE_PRIVATE);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (ACTION_SALAWAT.equals(a)) {
            p.edit().putInt("salawat_pending", p.getInt("salawat_pending", 0) + 1).apply();
            nm.cancel(9302);
        } else if (ACTION_READ.equals(a)) {
            String text = p.getString("widget_text", "");
            int chars = text == null ? 0 : text.replaceAll("\\s+", "").length();
            p.edit()
                .putInt("gate_read_pending", p.getInt("gate_read_pending", 0) + 1)
                .putInt("gate_chars_pending", p.getInt("gate_chars_pending", 0) + chars)
                .apply();
            nm.cancel(9301);
        }
    }

    static android.app.PendingIntent pending(Context c, String action, int req) {
        Intent i = new Intent(c, CountReceiver.class).setAction(action);
        return android.app.PendingIntent.getBroadcast(c, req, i,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
    }
}
