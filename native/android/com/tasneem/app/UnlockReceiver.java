package com.tasneem.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

/** Receives screen-unlock events only while TasneemService is alive. */
public class UnlockReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent intent) {
        if (!Intent.ACTION_USER_PRESENT.equals(intent.getAction())) return;
        SharedPreferences p = c.getSharedPreferences(TasneemPlugin.PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        long last = p.getLong("last_unlock_at", 0L);
        int cooldown = p.getInt("cooldownMin", 0);
        if (cooldown > 0 && now - last < cooldown * 60000L) return;
        p.edit().putLong("last_unlock_at", now).apply();
        if (p.getBoolean("unlockEnabled", true)) TasneemPlugin.notifyUnlock(c);
        if (p.getBoolean("lockAyahEnabled", true)) TasneemLockNotification.refresh(c);
    }
}
