/* =========================================================
   المصحف — يُنزَّل مرة واحدة ثم يعمل بدون إنترنت للأبد
   المصدر: api.alquran.cloud (نص عثماني + رقم الصفحة والجزء)
   ========================================================= */
(function (global) {
  'use strict';

  var DB_NAME = 'tasneem-quran', STORE = 'kv', VERSION = 1;
  var SOURCES = [
    'data/quran.json',                              // نسخة مرفقة داخل التطبيق (أوفلاين من أول تشغيل)
    'https://api.alquran.cloud/v1/quran/quran-uthmani',
    'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranuthmanihaf.json'
  ];
  var AUDIO_BASE = 'https://cdn.islamic.network/quran/audio/128/';

  /* قراء التلاوة — تُبَث من everyayah.com وقت التشغيل (بدون تحميل أو تخزين من التطبيق) */
  var RECITERS = {
    yasser:  { name: 'ياسر الدوسري',      folder: 'Yasser_Ad-Dussary_128kbps' },
    minshawi:{ name: 'محمد المنشاوي',      folder: 'Minshawy_Murattal_128kbps' },
    alafasy: { name: 'مشاري العفاسي',      folder: 'Alafasy_128kbps' },
    husary:  { name: 'محمود خليل الحصري',  folder: 'Husary_128kbps' }
  };
  var AYAH_AUDIO_BASE = 'https://everyayah.com/data/';
  var TAFSIR_EDITIONS = ['ar.muyassar', 'ar.jalalayn'];   // نحاول الميسّر أولاً ثم الجلالين
  var tafsirCache = {};

  var cache = null; // { ayahs: [...], pages: {n:[idx]}, surahs: {n:[idx]} }

  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB_NAME, VERSION);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet(key) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        t.onsuccess = function () { res(t.result); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  function idbSet(key, val) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key);
        t.onsuccess = function () { res(true); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }

  function index(ayahs) {
    var pages = {}, surahs = {};
    ayahs.forEach(function (a, i) {
      (pages[a.p] || (pages[a.p] = [])).push(i);
      (surahs[a.s] || (surahs[a.s] = [])).push(i);
    });
    cache = { ayahs: ayahs, pages: pages, surahs: surahs };
    return cache;
  }

  /* هل المصحف محمّل على الجهاز؟ */
  function isDownloaded() {
    if (cache) return Promise.resolve(true);
    return idbGet('ayahs').then(function (v) { return !!(v && v.length); }).catch(function () { return false; });
  }

  /* تحميل من التخزين المحلي */
  function load() {
    if (cache) return Promise.resolve(cache);
    return idbGet('ayahs').then(function (v) {
      if (v && v.length) return index(v);
      return null;
    }).catch(function () { return null; });
  }

  /* التنزيل من الإنترنت — مرة واحدة فقط */
  function download(onProgress) {
    onProgress = onProgress || function () {};
    onProgress(5, 'جارٍ الاتصال…');
    return fetchFirst(0).then(function (ayahs) {
      onProgress(85, 'جارٍ الحفظ على الجهاز…');
      return idbSet('ayahs', ayahs).then(function () {
        onProgress(100, 'تم');
        return index(ayahs);
      });
    });
  }

  function fetchFirst(i) {
    if (i >= SOURCES.length) return Promise.reject(new Error('تعذّر الاتصال بأي مصدر'));
    return fetch(SOURCES[i]).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(normalize).catch(function () { return fetchFirst(i + 1); });
  }

  /* توحيد شكل البيانات من أي مصدر */
  function normalize(json) {
    var out = [];
    if (json && json.data && json.data.surahs) {           // alquran.cloud
      json.data.surahs.forEach(function (s) {
        s.ayahs.forEach(function (a) {
          out.push({ s: s.number, a: a.numberInSurah, p: a.page, j: a.juz, t: a.text, sj: !!a.sajda });
        });
      });
    } else if (json && json.quran) {                        // fawazahmed0
      json.quran.forEach(function (a) {
        out.push({ s: a.chapter, a: a.verse, p: pageOf(a.chapter, a.verse), j: 0, t: a.text, sj: false });
      });
    }
    if (!out.length) throw new Error('شكل بيانات غير معروف');
    return out;
  }

  /* تقدير الصفحة من بيانات السور (يُستخدم فقط مع المصدر الاحتياطي) */
  function pageOf(surah, ayah) {
    var meta = global.SURAH_META;
    var start = meta[surah - 1][3], count = meta[surah - 1][2];
    var end = surah < 114 ? meta[surah][3] : 604;
    var span = Math.max(1, end - start + 1);
    return Math.min(604, start + Math.floor((ayah - 1) / count * span));
  }

  /* ---------- قراءة ---------- */
  function page(n) {
    if (!cache) return [];
    return (cache.pages[n] || []).map(function (i) { return cache.ayahs[i]; });
  }
  function surah(n) {
    if (!cache) return [];
    return (cache.surahs[n] || []).map(function (i) { return cache.ayahs[i]; });
  }
  function ayahRange(fromPage, toPage) {
    var out = [];
    for (var p = fromPage; p <= toPage; p++) out = out.concat(page(p));
    return out;
  }
  function firstAyahOfPage(n) {
    var l = page(n);
    return l.length ? l[0] : null;
  }
  function lastAyahOfPage(n) {
    var l = page(n);
    return l.length ? l[l.length - 1] : null;
  }
  function surahName(n) { return global.SURAH_META[n - 1][1]; }
  function surahStartPage(n) {
    if (cache && cache.surahs[n]) return cache.ayahs[cache.surahs[n][0]].p;
    return global.SURAH_META[n - 1][3];
  }
  function juzOfPage(n) {
    var a = firstAyahOfPage(n);
    if (a && a.j) return a.j;
    var jp = global.JUZ_PAGES, j = 1;
    for (var i = 0; i < jp.length; i++) if (n >= jp[i]) j = i + 1;
    return j;
  }
  function audioUrl(surahNo, ayahNo, reciter) {
    // رقم الآية المطلق مطلوب لهذا المصدر
    var abs = 0, meta = global.SURAH_META;
    for (var s = 1; s < surahNo; s++) abs += meta[s - 1][2];
    abs += ayahNo;
    return AUDIO_BASE + (reciter || 'ar.alafasy') + '/' + abs + '.mp3';
  }

  /* رابط تلاوة آية واحدة بصوت قارئ معيّن (يبث مباشرة، بدون تنزيل) */
  function ayahAudioUrl(surahNo, ayahNo, reciterKey) {
    var r = RECITERS[reciterKey] || RECITERS.yasser;
    var s = String(surahNo).padStart(3, '0');
    var a = String(ayahNo).padStart(3, '0');
    return AYAH_AUDIO_BASE + r.folder + '/' + s + a + '.mp3';
  }
  function reciters() { return RECITERS; }
  function reciterName(key) { return (RECITERS[key] || RECITERS.yasser).name; }

  /* تفسير آية — يُجلب مرة واحدة ثم يُخزَّن محليًا لباقي الاستخدام أوفلاين */
  function tafsirKey(surahNo, ayahNo) { return surahNo + ':' + ayahNo; }

  function fetchTafsir(surahNo, ayahNo) {
    var key = tafsirKey(surahNo, ayahNo);
    if (tafsirCache[key]) return Promise.resolve(tafsirCache[key]);
    return idbGet('tafsir:' + key).then(function (saved) {
      if (saved) { tafsirCache[key] = saved; return saved; }
      return tryTafsirEdition(0, surahNo, ayahNo).then(function (text) {
        tafsirCache[key] = text;
        idbSet('tafsir:' + key, text).catch(function () {});
        return text;
      });
    }).catch(function () { return null; });
  }

  function tryTafsirEdition(i, surahNo, ayahNo) {
    if (i >= TAFSIR_EDITIONS.length) return Promise.resolve(null);
    var url = 'https://api.alquran.cloud/v1/ayah/' + surahNo + ':' + ayahNo + '/' + TAFSIR_EDITIONS[i];
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('no tafsir');
      return r.json();
    }).then(function (j) {
      var t = j && j.data && j.data.text;
      if (!t) throw new Error('empty');
      return t;
    }).catch(function () { return tryTafsirEdition(i + 1, surahNo, ayahNo); });
  }

  function audioCacheName(reciterKey) { return 'tasneem-audio-v2-' + (reciterKey || 'yasser'); }
  function audioCacheInfo(reciterKey) {
    if (!('caches' in global)) return Promise.resolve({count:0});
    return caches.open(audioCacheName(reciterKey)).then(function(c){ return c.keys().then(function(k){ return {count:k.length}; }); });
  }
  function getPlayableAudioUrl(surahNo, ayahNo, reciterKey) {
    var url = ayahAudioUrl(surahNo, ayahNo, reciterKey);
    if (!('caches' in global)) return Promise.resolve(url);
    return caches.open(audioCacheName(reciterKey)).then(function(c){ return c.match(url).then(function(r){ if(r) return r.blob().then(function(b){ return URL.createObjectURL(b); }); if(global.Store && global.Store.settings && global.Store.settings().offlineMode) throw new Error('الصوت غير محفوظ محليًا — نزّله أولًا من إدارة الصوت'); return url; }); });
  }
  function downloadReciter(reciterKey, onProgress) {
    reciterKey = reciterKey || 'yasser'; onProgress = onProgress || function(){};
    if (!('caches' in global)) return Promise.reject(new Error('التخزين المحلي غير متاح على هذا الجهاز'));
    var rec = RECITERS[reciterKey]; if (!rec) return Promise.reject(new Error('القارئ غير معروف'));
    return caches.open(audioCacheName(reciterKey)).then(function(c){
      var total = global.SURAH_META.reduce(function(n,x){return n+x[2]},0), done=0, chain=Promise.resolve();
      for (var s=1;s<=114;s++) for (var a=1;a<=global.SURAH_META[s-1][2];a++) (function(su,ay){
        chain=chain.then(function(){ var url=ayahAudioUrl(su,ay,reciterKey); return c.match(url).then(function(hit){
          if(hit){ done++; onProgress(Math.round(done/total*100),'محفوظ '+done+' / '+total); return; }
          return fetch(url).then(function(r){ if(!r.ok) throw new Error('تعذر تنزيل الصوت: HTTP '+r.status); return c.put(url,r); }).then(function(){ done++; onProgress(Math.round(done/total*100),'تم تنزيل '+done+' / '+total); });
        }); });
      })(s,a);
      return chain.then(function(){return true;});
    });
  }
  function clearAudio(reciterKey) {
    if (!('caches' in global)) return Promise.resolve();
    return caches.delete(audioCacheName(reciterKey || 'yasser'));
  }

  function clear() {
    cache = null;
    return idbSet('ayahs', null);
  }

  function ayahAt(i) {
    if (!cache || !cache.ayahs.length) return null;
    var n = ((i % cache.ayahs.length) + cache.ayahs.length) % cache.ayahs.length;
    return cache.ayahs[n];
  }

  global.Quran = {
    isDownloaded: isDownloaded, load: load, download: download,
    page: page, surah: surah, ayahRange: ayahRange,
    firstAyahOfPage: firstAyahOfPage, lastAyahOfPage: lastAyahOfPage,
    surahName: surahName, surahStartPage: surahStartPage, juzOfPage: juzOfPage,
    audioUrl: audioUrl, clear: clear,
    ayahAudioUrl: ayahAudioUrl, getPlayableAudioUrl: getPlayableAudioUrl, audioCacheInfo: audioCacheInfo, downloadReciter: downloadReciter, clearAudio: clearAudio, reciters: reciters, reciterName: reciterName,
    fetchTafsir: fetchTafsir, ayahAt: ayahAt,
    get TOTAL_AYAHS() { return cache ? cache.ayahs.length : 6236; },
    ready: function () { return !!cache; }
  };
})(window);
