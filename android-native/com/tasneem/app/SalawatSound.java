package com.tasneem.app;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import java.util.Locale;

/**
 * صوت الصلاة على النبي ﷺ عند فتح الهاتف.
 *  1) ملف res/raw/salawat.mp3 عبر MediaPlayer (صوت الوسائط؛ ولو صوت الوسائط صفر وصوت الإشعارات شغّال → على قناة الإشعارات)
 *  2) لو فشل لأي سبب: نطق عربي «اللهم صل وسلم على نبينا محمد» عبر TextToSpeech
 * وبيسجّل آخر نتيجة في SharedPreferences (dbg_sound) عشان زر «تجربة الصوت» يعرض التشخيص.
 */
final class SalawatSound {
  private static final String TEXT = "اللهم صل وسلم على نبينا محمد";
  private static MediaPlayer player;
  private static TextToSpeech tts;
  private static boolean ttsReady;
  private static AudioFocusRequest focusReq;
  private static AudioManager audio;

  private SalawatSound() {}

  static void log(Context c, String msg) {
    try {
      TasneemPlugin.prefs(c).edit()
        .putString("dbg_sound", msg).putLong("dbg_sound_ts", System.currentTimeMillis()).apply();
    } catch (Exception ignored) {}
  }

  static synchronized void play(Context c) {
    Context app = c.getApplicationContext();
    stop();
    if (!playMp3(app)) speak(app);
  }

  private static void requestFocus(AudioManager am, AudioAttributes attrs) {
    try {
      audio = am;
      if (Build.VERSION.SDK_INT >= 26) {
        focusReq = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
          .setAudioAttributes(attrs).setOnAudioFocusChangeListener(new AudioManager.OnAudioFocusChangeListener() {
            @Override public void onAudioFocusChange(int change) {}
          }).build();
        am.requestAudioFocus(focusReq);
      } else {
        am.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
      }
    } catch (Exception ignored) {}
  }

  private static void abandonFocus() {
    try {
      if (audio == null) return;
      if (Build.VERSION.SDK_INT >= 26) { if (focusReq != null) audio.abandonAudioFocusRequest(focusReq); }
      else audio.abandonAudioFocus(null);
    } catch (Exception ignored) {}
  }

  private static boolean playMp3(final Context app) {
    try {
      int res = app.getResources().getIdentifier("salawat", "raw", app.getPackageName());
      if (res == 0) { log(app, "mp3:missing-raw"); return false; } // الملف مش متضمّن في الـAPK
      AssetFileDescriptor afd = app.getResources().openRawResourceFd(res);
      if (afd == null) { log(app, "mp3:no-fd"); return false; }

      AudioManager am = (AudioManager) app.getSystemService(Context.AUDIO_SERVICE);
      int usage = AudioAttributes.USAGE_MEDIA, ctype = AudioAttributes.CONTENT_TYPE_MUSIC;
      int mediaVol = 1, notifVol = 1;
      if (am != null) {
        mediaVol = am.getStreamVolume(AudioManager.STREAM_MUSIC);
        notifVol = am.getStreamVolume(AudioManager.STREAM_NOTIFICATION);
        // صوت الوسائط صفر؟ لو صوت الإشعارات مسموع نشغّل عليه بدل ما الصوت يضيع
        if (mediaVol == 0 && notifVol > 0) {
          usage = AudioAttributes.USAGE_NOTIFICATION_EVENT;
          ctype = AudioAttributes.CONTENT_TYPE_SONIFICATION;
        }
      }
      AudioAttributes attrs = new AudioAttributes.Builder().setUsage(usage).setContentType(ctype).build();
      if (am != null) requestFocus(am, attrs);

      final String vols = "media=" + mediaVol + ",notif=" + notifVol + (usage == AudioAttributes.USAGE_MEDIA ? ",stream=media" : ",stream=notif");
      MediaPlayer mp = new MediaPlayer();
      mp.setAudioAttributes(attrs);
      try { mp.setWakeMode(app, PowerManager.PARTIAL_WAKE_LOCK); } catch (Exception ignored) {}
      mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
      afd.close();
      mp.setVolume(1f, 1f);
      mp.setOnPreparedListener(new MediaPlayer.OnPreparedListener() {
        @Override public void onPrepared(MediaPlayer x) {
          try { x.start(); log(app, "mp3:playing," + vols); }
          catch (Exception e) { release(x); log(app, "mp3:start-fail " + e); speak(app); }
        }
      });
      mp.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
        @Override public void onCompletion(MediaPlayer x) { release(x); }
      });
      mp.setOnErrorListener(new MediaPlayer.OnErrorListener() {
        @Override public boolean onError(MediaPlayer x, int what, int extra) {
          release(x); log(app, "mp3:error " + what + "/" + extra); speak(app); return true;
        }
      });
      player = mp;
      mp.prepareAsync();
      return true;
    } catch (Exception e) {
      log(app, "mp3:exception " + e);
      return false;
    }
  }

  private static synchronized void speak(final Context app) {
    try {
      if (tts != null) {
        if (ttsReady) { tts.speak(TEXT, TextToSpeech.QUEUE_FLUSH, null, "salawat"); log(app, "tts:speak"); }
        return;
      }
      tts = new TextToSpeech(app, new TextToSpeech.OnInitListener() {
        @Override public void onInit(int status) {
          if (status != TextToSpeech.SUCCESS) { log(app, "tts:init-fail"); return; }
          try {
            tts.setLanguage(new Locale("ar"));
            tts.setSpeechRate(0.92f);
            ttsReady = true;
            tts.speak(TEXT, TextToSpeech.QUEUE_FLUSH, null, "salawat");
            log(app, "tts:speak");
          } catch (Exception ignored) {}
        }
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
    abandonFocus();
  }
}
