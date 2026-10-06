package com.tasneem.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

/** Small foreground service used only to keep USER_PRESENT dynamically registered. */
public class TasneemService extends Service {
    private UnlockReceiver receiver;
    private static final int ID = 702;

    @Override public void onCreate() {
        super.onCreate();
        TasneemPlugin.createChannelsFor(this);
        Notification n = new NotificationCompat.Builder(this, TasneemPlugin.CHANNEL_LOCK)
            .setSmallIcon(R.drawable.ic_stat_mosque)
            .setContentTitle("تسنيم")
            .setContentText("الخدمات الخلفية مفعّلة")
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(ID, n, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(ID, n);
        receiver = new UnlockReceiver();
        registerReceiver(receiver, new IntentFilter(Intent.ACTION_USER_PRESENT));
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }

    @Override public void onDestroy() {
        if (receiver != null) { try { unregisterReceiver(receiver); } catch (Exception ignored) {} }
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    /** Starts the service only if a feature needs it; stops it otherwise. */
    public static void sync(Context c) {
        android.content.SharedPreferences p = c.getSharedPreferences(TasneemPlugin.PREFS, Context.MODE_PRIVATE);
        boolean need = p.getBoolean("unlockEnabled", true) || p.getBoolean("lockAyahEnabled", true);
        if (need) start(c); else c.stopService(new Intent(c, TasneemService.class));
    }

    public static void start(Context c) {
        Intent i = new Intent(c, TasneemService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i);
        } catch (Exception ignored) {}
    }
}
