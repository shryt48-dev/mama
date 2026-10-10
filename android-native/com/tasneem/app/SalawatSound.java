package com.tasneem.app;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.speech.tts.TextToSpeech;
import java.util.Locale;

/**
 * صوت الصلاة على النبي ﷺ عند فتح الهاتف — بنفس منطق النسخة القديمة اللي كانت شغّالة:
 *  1) ملف res/raw/salawat.mp3 عبر MediaPlayer على صوت الوسائط (بيشتغل حتى لو صوت الإشعارات واطي)
 *  2) لو فشل لأي سبب: نطق عربي «اللهم صل وسلم على نبينا محمد» عبر TextToSpeech
 */
final class SalawatSound {
  private static final String TEXT = "اللهم صل وسلم على نبينا محمد";
  private static MediaPlayer player;
  private static TextToSpeech tts;
  private static boolean ttsReady;

  private SalawatSound() {}

  static synchronized void play(Context c) {
    Context app = c.getApplicationContext();
    stop();
    if (!playMp3(app)) speak(app);
  }

  private static boolean playMp3(final Context app) {
    try {
      int res = app.getResources().getIdentifier("salawat", "raw", app.getPackageName());
      if (res == 0) return false; // الملف مش متضمّن في الـAPK
      AssetFileDescriptor afd = app.getResources().openRawResourceFd(res);
      if (afd == null) return false;
      MediaPlayer mp = new MediaPlayer();
      mp.setAudioAttributes(new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
      mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
      afd.close();
      mp.setVolume(1f, 1f);
      mp.setOnPreparedListener(x -> { try { x.start(); } catch (Exception e) { release(x); speak(app); } });
      mp.setOnCompletionListener(x -> release(x));
      mp.setOnErrorListener((x, what, extra) -> { release(x); speak(app); return true; });
      player = mp;
      mp.prepareAsync();
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  private static synchronized void speak(final Context app) {
    try {
      if (tts != null) {
        if (ttsReady) tts.speak(TEXT, TextToSpeech.QUEUE_FLUSH, null, "salawat");
        return;
      }
      tts = new TextToSpeech(app, status -> {
        if (status != TextToSpeech.SUCCESS) return;
        try {
          tts.setLanguage(new Locale("ar"));
          tts.setSpeechRate(0.92f);
          ttsReady = true;
          tts.speak(TEXT, TextToSpeech.QUEUE_FLUSH, null, "salawat");
        } catch (Exception ignored) {}
      });
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
