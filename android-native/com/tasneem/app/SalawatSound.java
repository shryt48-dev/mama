package com.tasneem.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;

/**
 * يشغّل صوت الصلاة على النبي ﷺ (res/raw/salawat.mp3) مباشرة من التطبيق.
 * الاعتماد على صوت قناة الإشعار كان بيفشل: القناة اتعملت مرة بدون صوت مخصّص،
 * وأندرويد مابيسمحش بتغيير صوت قناة موجودة. التشغيل المباشر شغّال دايمًا ويحترم
 * وضع الصامت وعدم الإزعاج لأنه بيستخدم USAGE_NOTIFICATION.
 */
final class SalawatSound {
  private static MediaPlayer player;

  private SalawatSound() {}

  static synchronized void play(Context c) {
    try {
      stop();
      Context app = c.getApplicationContext();
      int res = app.getResources().getIdentifier("salawat", "raw", app.getPackageName());
      if (res == 0) return; // الملف مش متضمّن في الـAPK
      AudioAttributes attrs = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
      AudioManager am = (AudioManager) app.getSystemService(Context.AUDIO_SERVICE);
      MediaPlayer mp = MediaPlayer.create(app, res, attrs, am.generateAudioSessionId());
      if (mp == null) return;
      player = mp;
      mp.setOnCompletionListener(x -> release(x));
      mp.setOnErrorListener((x, what, extra) -> { release(x); return true; });
      mp.start();
    } catch (Exception ignored) {}
  }

  static synchronized void stop() {
    if (player != null) release(player);
  }

  private static synchronized void release(MediaPlayer mp) {
    try { mp.stop(); } catch (Exception ignored) {}
    try { mp.release(); } catch (Exception ignored) {}
    if (player == mp) player = null;
  }
}
