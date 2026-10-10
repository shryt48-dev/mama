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
  var pageMap = null;
  var PAGE_MAP_LOCAL = 'data/page-map.json';
  var PAGE_MAP_URL = 'https://raw.githubusercontent.com/Mushaf-Learning/quran-text/main/metadata/pages.json';

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

  function applyPageMap(map) {
    if (!cache || !map) return;
    var starts = map.slice().sort(function(a,b){return a.page-b.page;});
    var byKey = {};
    starts.forEach(function(x){byKey[x.sura+':'+x.aya]=x.page;});
    cache.ayahs.forEach(function(a){
      var p=0;
      // Walk backwards through page starts only when an exact start is not present.
      // Since the list is ordered, binary search is used for all 6,236 ayahs.
      var lo=0,hi=starts.length-1;
      while(lo<=hi){var mid=(lo+hi)>>1,b=starts[mid];if(b.sura<a.s || (b.sura===a.s && b.aya<=a.a)){p=b.page;lo=mid+1;}else hi=mid-1;}
      if(p) a.p=p;
    });
    index(cache.ayahs);
  }
  function loadPageMap() {
    if (pageMap) return Promise.resolve(pageMap);
    return idbGet('page-map').then(function(saved){
      if(saved && saved.length===604){pageMap=saved; if(cache) applyPageMap(pageMap); return pageMap;}
      function accept(m){
        if(!Array.isArray(m)||m.length!==604) throw new Error('invalid page map');
        pageMap=m; idbSet('page-map',m).catch(function(){}); if(cache) applyPageMap(m); return m;
      }
      // The build pipeline ships this file inside the APK, so a fresh install can
      // establish the exact 604-page mapping without needing the network.
      return fetch(PAGE_MAP_LOCAL).then(function(r){if(!r.ok)throw new Error('local page map '+r.status);return r.json();}).then(accept)
        .catch(function(){return fetch(PAGE_MAP_URL).then(function(r){if(!r.ok)throw new Error('page map '+r.status);return r.json();}).then(accept);})
        .catch(function(){return null;});
    }).catch(function(){return null;});
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
      if (v && v.length) {
        index(v);
        return loadPageMap().then(function(){ return cache; });
      }
      // أول تشغيل: النسخة المرفقة داخل التطبيق (بدون إنترنت) ثم نحفظها في IndexedDB.
      // لا نعتبر المصحف جاهزًا قبل تثبيت خريطة الصفحات الدقيقة.
      return fetch(SOURCES[0]).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(normalize).then(function (ayahs) {
        idbSet('ayahs', ayahs).catch(function () {});
        index(ayahs);
        return loadPageMap().then(function(){ return cache; });
      });
    }).catch(function () { return null; });
  }

  /* التنزيل من الإنترنت — مرة واحدة فقط */
  function download(onProgress) {
    onProgress = onProgress || function () {};
    onProgress(3, 'جارٍ تجهيز خريطة صفحات المصحف…');
    return loadPageMap().then(function (m) {
      if (!m || m.length !== 604) throw new Error('تعذّر تجهيز خريطة صفحات المصحف');
      onProgress(8, 'جارٍ تحميل نص المصحف…');
      return fetchFirst(0);
    }).then(function (ayahs) {
      onProgress(85, 'جارٍ الحفظ على الجهاز…');
      return idbSet('ayahs', ayahs).then(function () {
        index(ayahs);
        applyPageMap(pageMap);
        onProgress(100, 'تم');
        return cache;
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

  function stripLeadingBasmala(text) {
    if (!text) return text;
    return text.replace(/^\uFEFF?بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s+/, '').replace(/^\uFEFF?بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\u00a0+/, '');
  }

  /* توحيد شكل البيانات من أي مصدر */
  function normalize(json) {
    var out = [];
    if (Array.isArray(json)) {
      json.forEach(function (a) {
        var s = Number(a.surah || a.chapter || a.s), n = Number(a.ayah || a.verse || a.a);
        if (!s || !n || !a.text_uthmani && !a.text) return;
        var text = a.text_uthmani || a.text;
        if (s !== 1 && s !== 9) text = stripLeadingBasmala(text);
        out.push({ s:s, a:n, p:Number(a.page)||pageOf(s,n), j:Number(a.juz)||0, t:text, sj:!!a.sajda });
      });
    } else     if (json && json.data && json.data.surahs) {           // alquran.cloud
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
    estimatePages(out);
    return out;
  }

  /* تقدير أدق للصفحة: نوزّع آيات كل سورة على صفحاتها بحسب عدد الحروف (احتياطي لو خريطة الصفحات مش متاحة) */
  function estimatePages(out) {
    var meta = global.SURAH_META, bySurah = {};
    out.forEach(function (a) { (bySurah[a.s] || (bySurah[a.s] = [])).push(a); });
    Object.keys(bySurah).forEach(function (k) {
      var s = +k, list = bySurah[s], start = meta[s - 1][3];
      var end = s < 114 ? meta[s][3] : 604;
      if (end < start) end = start;
      var total = 0; list.forEach(function (a) { total += (a.t || '').length + 3; });
      var acc = 0, span = end - start + 1;
      list.forEach(function (a) {
        a.p = Math.min(604, start + Math.floor(acc / total * span));
        acc += (a.t || '').length + 3;
      });
    });
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

  /* رابط مصدر التلاوة؛ getPlayableAudioUrl يحمّلها للكاش تلقائيًا لتعمل أوفلاين لاحقًا. */
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

  /* ---------- كاش الصوت (تشغيل أوفلاين) ---------- */
  var AUDIO_CACHE = 'tasneem-audio-v1';
  var objUrls = [];
  function trackUrl(u) {
    objUrls.push(u);
    if (objUrls.length > 8) { try { URL.revokeObjectURL(objUrls.shift()); } catch (e) {} }
    return u;
  }
  function hasCaches() { return typeof caches !== 'undefined' && !!caches.open; }
  function isOfflineMode() {
    try { return !!(global.Store && global.Store.settings().offlineMode); } catch (e) { return false; }
  }
  function reciterFolder(key) { return (RECITERS[key] || RECITERS.yasser).folder; }

  /* رابط صالح للتشغيل: من الكاش المحلي لو موجود، وإلا من الشبكة (إلا في وضع الأوفلاين) */
  function getPlayableAudioUrl(surahNo, ayahNo, reciterKey) {
    var url = ayahAudioUrl(surahNo, ayahNo, reciterKey);
    function fromNet() {
      if (isOfflineMode()) return Promise.reject(new Error('offline_audio_not_cached'));
      return fetch(url, {mode:'cors'}).then(function(r){
        if(!r.ok) throw new Error('HTTP '+r.status);
        if(hasCaches()) return caches.open(AUDIO_CACHE).then(function(c){ return c.put(url,r.clone()).catch(function(){}).then(function(){ return r.blob(); }); });
        return r.blob();
      }).then(function(b){ return trackUrl(URL.createObjectURL(b)); });
    }
    if (!hasCaches()) return fromNet();
    return caches.open(AUDIO_CACHE).then(function (c) { return c.match(url); }).then(function (hit) {
      if (hit) return hit.blob().then(function (b) { return trackUrl(URL.createObjectURL(b)); });
      return fromNet();
    });
  }

  function prefetchAyahs(list, reciterKey) {
    if (!hasCaches() || isOfflineMode() || !list || !list.length) return Promise.resolve();
    return caches.open(AUDIO_CACHE).then(function(c){
      var jobs=list.map(function(it){var u=ayahAudioUrl(it.s,it.a,reciterKey);return c.match(u).then(function(hit){if(hit)return;return fetch(u,{mode:'cors'}).then(function(r){if(r.ok)return c.put(u,r);});}).catch(function(){});});
      return Promise.all(jobs);
    });
  }

  function audioCacheInfo(reciterKey) {
    if (!hasCaches()) return Promise.resolve({ count: 0 });
    var folder = '/' + reciterFolder(reciterKey) + '/';
    return caches.open(AUDIO_CACHE).then(function (c) { return c.keys(); }).then(function (ks) {
      return { count: ks.filter(function (r) { return r.url.indexOf(folder) > -1; }).length };
    }).catch(function () { return { count: 0 }; });
  }

  function ensurePersistentStorage() {
    try {
      if (navigator.storage && navigator.storage.persist) return navigator.storage.persist().catch(function(){return false;});
    } catch (e) {}
    return Promise.resolve(false);
  }

  /* تنزيل قائمة آيات إلى الكاش — 4 طلبات متوازية، يتخطى الموجود */
  function downloadAyahs(list, reciterKey, onProgress) {
    onProgress = onProgress || function () {};
    if (!hasCaches()) return Promise.reject(new Error('التخزين المحلي غير متاح'));
    var total = list.length, idx = 0, done = 0, failed = 0, fatal = null;
    return caches.open(AUDIO_CACHE).then(function (cache) {
      function worker() {
        if (fatal || idx >= total) return Promise.resolve();
        var it = list[idx++], url = ayahAudioUrl(it.s, it.a, reciterKey);
        return cache.match(url).then(function (hit) {
          if (hit) return;
          return fetch(url, { mode: 'cors' }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return cache.put(url, r);
          });
        }).catch(function (e) {
          if (e && e.name === 'QuotaExceededError') fatal = new Error('المساحة ممتلئة على الجهاز');
          else failed++;
        }).then(function () {
          done++;
          onProgress(Math.round(done / total * 100), 'تم ' + done + ' / ' + total);
          return worker();
        });
      }
      return Promise.all([worker(), worker(), worker(), worker()]);
    }).then(function () {
      if (fatal) throw fatal;
      if (total && failed === total) throw new Error('تعذّر التنزيل — تأكد من الإنترنت');
      return { failed: failed, total: total };
    });
  }
  function downloadReciter(reciterKey, onProgress) {
    if (!cache) return Promise.reject(new Error('نزّل المصحف أولًا'));
    return ensurePersistentStorage().then(function(){
      return downloadAyahs(cache.ayahs.map(function (a) { return { s: a.s, a: a.a }; }), reciterKey, onProgress);
    });
  }
  function downloadSurah(n, reciterKey, onProgress) {
    return downloadAyahs(surah(n).map(function (a) { return { s: a.s, a: a.a }; }), reciterKey, onProgress);
  }
  function clearAudio(reciterKey) {
    if (!hasCaches()) return Promise.resolve();
    var folder = '/' + reciterFolder(reciterKey) + '/';
    return caches.open(AUDIO_CACHE).then(function (c) {
      return c.keys().then(function (ks) {
        return Promise.all(ks.filter(function (r) { return r.url.indexOf(folder) > -1; })
          .map(function (r) { return c.delete(r); }));
      });
    });
  }

  function clear() {
    cache = null; pageMap = null;
    return idbSet('ayahs', null).then(function(){ return idbSet('page-map', null); });
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
    ayahAudioUrl: ayahAudioUrl, reciters: reciters, reciterName: reciterName,
    fetchTafsir: fetchTafsir, ayahAt: ayahAt,
    getPlayableAudioUrl: getPlayableAudioUrl, prefetchAyahs: prefetchAyahs, audioCacheInfo: audioCacheInfo, loadPageMap: loadPageMap,
    downloadAyahs: downloadAyahs, downloadReciter: downloadReciter, downloadSurah: downloadSurah,
    clearAudio: clearAudio,
    get TOTAL_AYAHS() { return cache ? cache.ayahs.length : 6236; },
    ready: function () { return !!cache; }
  };
})(window);
