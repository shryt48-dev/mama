/* =========================================================
   التخزين والإحصائيات — كل شيء محفوظ محليًا على الجهاز
   ========================================================= */
(function (global) {
  'use strict';

  var KEY = 'tasneem.v1';
  var state = null;

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  function defaults() {
    return {
      settings: {
        method: 'egyptian', asr: 'standard', lat: null, lng: null, city: '',
        adhanEnabled: true, adhanSound: 'makkah', silentMode: false,
        unlockDhikrEnabled: true, unlockCooldownMin: 0, unlockSalawatSound: true, lockAyahEnabled: true,
        periodicDhikr: true, periodicEveryMin: 60,
        wirdPagesPerDay: 20, quranFontSize: 26, readerFullscreen: true, theme: 'auto', hijriOffset: 0,
        reciter: 'yasser', offlineMode: false, ayahGateEnabled: true, ayahGateCooldownMin: 5, wirdReminder: true, widgetPinAsked: false,
        adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }
      },
      gate: { index: 0, shownIndex: 0, lastShown: 0, readTotal: 0 },
      counters: {
        // key -> { total, history: { 'YYYY-MM-DD': n } }
        salawat: { total: 0, history: {} },
        tasbih:  { total: 0, history: {} },
        istighfar: { total: 0, history: {} },
        quranChars: { total: 0, history: {} }
      },
      adhkarDone: {},        // { 'morning': { total, history:{date:n} } }
      adhkarProgress: {},    // { 'morning': { date, index, done[], count[] } }
      lastPage: 0,
      prayers: {},           // { 'YYYY-MM-DD': { fajr:true, ... } }
      prayerTotal: 0,
      khatma: {
        startedAt: null, pagesPerDay: 20, currentPage: 1,
        completed: 0, log: {}, lastReadPage: 1
      },
      bookmarks: [],
      favorites: [],         // [{ s, a, label, at }]
      notes: {},             // { 's:a': 'نص الملاحظة' }
      surahPositions: {},    // { سورة: آخر صفحة }
      audioPro: { speed: 1, repeats: 1, gap: 0 },
      challenge: null,       // { goal, start, pages: [..] }
      teacher: { doneDate: '' },
      tasbihPhrase: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
      installedAt: today()
    };
  }

  function deepMerge(base, extra) {
    for (var k in extra) {
      if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base[k]) {
        deepMerge(base[k], extra[k]);
      } else if (extra[k] !== undefined) {
        base[k] = extra[k];
      }
    }
    return base;
  }

  function load() {
    if (state) return state;
    state = defaults();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) deepMerge(state, JSON.parse(raw));
    } catch (e) { /* أول تشغيل */ }
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    if (global.TasneemBridge && global.TasneemBridge.onStateSaved) global.TasneemBridge.onStateSaved(state);
  }

  /* ---------- عدّادات عامة ---------- */
  function bump(name, by) {
    load();
    by = by || 1;
    var c = state.counters[name] || (state.counters[name] = { total: 0, history: {} });
    var t = today();
    c.total += by;
    c.history[t] = (c.history[t] || 0) + by;
    save();
    return c;
  }

  function counterStats(name) {
    load();
    var c = state.counters[name] || { total: 0, history: {} };
    return summarize(c);
  }

  function summarize(c) {
    var t = today(), now = new Date();
    var weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    var monthKey = t.slice(0, 7);
    var week = 0, month = 0;
    for (var d in c.history) {
      if (d.slice(0, 7) === monthKey) month += c.history[d];
      var dd = new Date(d + 'T00:00:00');
      if (dd >= weekStart) week += c.history[d];
    }
    return { today: c.history[t] || 0, week: week, month: month, total: c.total, history: c.history };
  }

  /* ---------- الأذكار ---------- */
  /* مكان الوقوف في كل قسم أذكار — بيتحفظ لو خرجت في النص وترجع تكمّل منه.
     أقسام الصباح/المساء/النوم/الاستيقاظ/بعد الصلاة/المسجد بتبدأ من جديد كل يوم، والباقي بيفضل محفوظ. */
  var DAILY_CATS = ['morning', 'evening', 'sleep', 'wake', 'after-prayer', 'mosque'];
  function adhkarProgress(catId, len) {
    load();
    var p = state.adhkarProgress && state.adhkarProgress[catId];
    if (!p) return null;
    if (DAILY_CATS.indexOf(catId) > -1 && p.date !== today()) return null;
    if (!p.done || !p.count || p.done.length !== len || p.count.length !== len) return null;
    if (p.index < 0 || p.index >= len) return null;
    return p;
  }
  function setAdhkarProgress(catId, p) {
    load();
    if (!state.adhkarProgress) state.adhkarProgress = {};
    state.adhkarProgress[catId] = { date: today(), index: p.index, done: p.done.slice(), count: p.count.slice() };
    save();
  }
  function clearAdhkarProgress(catId) {
    load();
    if (state.adhkarProgress && state.adhkarProgress[catId]) { delete state.adhkarProgress[catId]; save(); }
  }

  /* آخر صفحة مصحف وقفت عندها (أي قراءة، مش بس ورد اليوم) */
  function setLastPage(p) { load(); state.lastPage = p; state.lastPageAt = today(); save(); }
  function lastPage() { load(); return state.lastPage || 0; }

  function markAdhkarDone(catId) {
    load();
    if (state.adhkarProgress && state.adhkarProgress[catId]) delete state.adhkarProgress[catId];
    var a = state.adhkarDone[catId] || (state.adhkarDone[catId] = { total: 0, history: {} });
    var t = today();
    a.total += 1;
    a.history[t] = (a.history[t] || 0) + 1;
    save();
    return a;
  }
  function adhkarStats(catId) {
    load();
    return summarize(state.adhkarDone[catId] || { total: 0, history: {} });
  }

  /* ---------- الصلوات ---------- */
  function togglePrayer(name) {
    load();
    var t = today();
    var day = state.prayers[t] || (state.prayers[t] = {});
    if (day[name]) { day[name] = false; state.prayerTotal = Math.max(0, state.prayerTotal - 1); }
    else { day[name] = true; state.prayerTotal += 1; }
    save();
    return day[name];
  }
  function prayerStats() {
    load();
    var t = today();
    var day = state.prayers[t] || {};
    var doneToday = Object.keys(day).filter(function (k) { return day[k]; }).length;
    var streak = 0;
    var d = new Date();
    for (;;) {
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var p = state.prayers[key] || {};
      var n = Object.keys(p).filter(function (k) { return p[k]; }).length;
      if (n >= 5) { streak++; d.setDate(d.getDate() - 1); }
      else if (key === t) { d.setDate(d.getDate() - 1); }
      else break;
      if (streak > 3650) break;
    }
    return { today: doneToday, total: state.prayerTotal, streak: streak, day: day };
  }

  /* ---------- الختمة ---------- */
  function khatma() { load(); return state.khatma; }

  function startKhatma(pagesPerDay, startPage) {
    load();
    var sp = Math.max(1, Math.min(604, startPage || 1));
    state.khatma = {
      startedAt: today(),
      pagesPerDay: pagesPerDay || state.settings.wirdPagesPerDay || 20,
      currentPage: sp,
      completed: state.khatma.completed || 0,
      log: {},
      lastReadPage: sp,
      ayahIdx: 0
    };
    save();
    return state.khatma;
  }

  /* يحفظ مكان آخر آية كنت واقف عندها في شاشة ورد اليوم، عشان ترجعله لما تفتح التطبيق تاني */
  function setWirdAyahIdx(i) {
    load();
    state.khatma.ayahIdx = i;
    save();
  }
  function wirdAyahIdx() { load(); return state.khatma.ayahIdx || 0; }

  /* آخر صفحة فعليًا وصلها المستخدم وهو بيقرأ ورد اليوم بالمصحف (يختلف عن currentPage نفسه) */
  function setWirdLastReadPage(p) {
    load();
    state.khatma.lastReadPage = p;
    save();
  }

  /* عدد الأحرف المقروءة (زي إحصائية "نختم") */
  function addCharsForPages(fromPage, toPage) {
    if (!global.Quran || !global.Quran.ready()) return;
    var ayahs = global.Quran.ayahRange(fromPage, toPage);
    var n = 0;
    ayahs.forEach(function (a) { n += (a.t || '').replace(/\s+/g, '').length; });
    if (n > 0) bump('quranChars', n);
  }

  function completeWird() {
    load();
    var k = state.khatma;
    if (!k.startedAt) startKhatma(state.settings.wirdPagesPerDay);
    k = state.khatma;
    var next = k.currentPage + k.pagesPerDay;
    addCharsForPages(k.currentPage, Math.min(604, next - 1));
    k.log[today()] = (k.log[today()] || 0) + k.pagesPerDay;
    if (next > 604) {
      k.completed += 1;
      k.currentPage = 1;
      k.startedAt = today();
      save();
      return { finished: true, completed: k.completed };
    }
    k.currentPage = next;
    k.lastReadPage = next;
    k.ayahIdx = 0;
    save();
    return { finished: false, page: k.currentPage };
  }

  /* ---------------- آية الفتح التلقائي (تظهر — تُقرأ — تُعلَّم بصح — تختفي) ---------------- */
  function gateState() { load(); return state.gate; }

  function shouldShowGate() {
    load();
    var st = state.settings;
    if (!st.ayahGateEnabled) return false;
    var now = Date.now();
    var cd = (st.ayahGateCooldownMin || 5) * 60000;
    return (now - (state.gate.lastShown || 0)) >= cd;
  }

  /* كل ظهور = آية جديدة: نحفظ الآية المعروضة الآن (shownIndex) ونجهّز اللي بعدها (index) */
  function markGateShown() {
    load();
    state.gate.shownIndex = state.gate.index;
    state.gate.index += 1;
    state.gate.lastShown = Date.now();
    save();
  }

  /** يُعلَّم بصحّ: يحفظ عدد الحروف كإنجاز قراءة ويزيد العدّاد (الانتقال للآية التالية بيحصل عند الظهور) */
  function markGateRead(charLen) {
    load();
    state.gate.readTotal += 1;
    if (charLen > 0) bump('quranChars', charLen);
    save();
    return state.gate.index;
  }

  function khatmaStats() {
    load();
    var k = state.khatma;
    var totalDays = Math.ceil(604 / (k.pagesPerDay || 20));
    var doneDays = Math.floor((k.currentPage - 1) / (k.pagesPerDay || 20));
    var expectedDay = 0;
    if (k.startedAt) {
      var start = new Date(k.startedAt + 'T00:00:00');
      expectedDay = Math.floor((new Date(today() + 'T00:00:00') - start) / 86400000);
    }
    return {
      completed: k.completed,
      page: k.currentPage,
      pagesPerDay: k.pagesPerDay,
      progress: Math.min(100, Math.round(((k.currentPage - 1) / 604) * 100)),
      doneWirds: doneDays,
      remainingWirds: Math.max(0, totalDays - doneDays),
      behindBy: Math.max(0, expectedDay - doneDays)
    };
  }

  /* ---------- إعدادات ---------- */
  function settings() { load(); return state.settings; }
  function setSetting(path, value) {
    load();
    var parts = path.split('.'), o = state.settings;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
    save();
  }

  function bookmarks() { load(); return state.bookmarks; }
  function toggleBookmark(page, label) {
    load();
    var i = state.bookmarks.findIndex(function (b) { return b.page === page; });
    if (i >= 0) state.bookmarks.splice(i, 1);
    else state.bookmarks.push({ page: page, label: label, at: Date.now() });
    save();
    return i < 0;
  }

  /* ---------- المفضلة والملاحظات ومواضع السور ---------- */
  function favorites() { load(); return state.favorites; }
  function isFavorite(s, a) {
    return favorites().some(function (f) { return f.s === s && f.a === a; });
  }
  function toggleFavorite(s, a, label) {
    load();
    var i = state.favorites.findIndex(function (f) { return f.s === s && f.a === a; });
    if (i >= 0) state.favorites.splice(i, 1);
    else state.favorites.push({ s: s, a: a, label: label || (s + ':' + a), at: Date.now() });
    save();
    return i < 0;
  }
  function note(s, a) { load(); return state.notes[s + ':' + a] || ''; }
  function setNote(s, a, text) {
    load();
    text = String(text || '').trim();
    if (text) state.notes[s + ':' + a] = text; else delete state.notes[s + ':' + a];
    save();
  }
  function setSurahPosition(s, page) {
    load();
    if (state.surahPositions[s] === page) return;
    state.surahPositions[s] = page;
    save();
  }
  /* حقل عام على أعلى مستوى من الحالة (للإعدادات الإضافية) */
  function setField(key, value) { load(); state[key] = value; save(); }

  function exportAll() { load(); return JSON.stringify(state); }
  function importAll(json) {
    try { state = deepMerge(defaults(), JSON.parse(json)); save(); return true; }
    catch (e) { return false; }
  }
  function resetAll() { state = defaults(); save(); }

  function quranCharStats() { return counterStats('quranChars'); }

  global.Store = {
    load: load, save: save, today: today,
    bump: bump, counterStats: counterStats, quranCharStats: quranCharStats,
    markAdhkarDone: markAdhkarDone, adhkarStats: adhkarStats,
    adhkarProgress: adhkarProgress, setAdhkarProgress: setAdhkarProgress, clearAdhkarProgress: clearAdhkarProgress,
    setLastPage: setLastPage, lastPage: lastPage,
    togglePrayer: togglePrayer, prayerStats: prayerStats,
    khatma: khatma, startKhatma: startKhatma, completeWird: completeWird, khatmaStats: khatmaStats,
    gateState: gateState, shouldShowGate: shouldShowGate, markGateShown: markGateShown, markGateRead: markGateRead,
    setWirdAyahIdx: setWirdAyahIdx, wirdAyahIdx: wirdAyahIdx, setWirdLastReadPage: setWirdLastReadPage,
    settings: settings, setSetting: setSetting,
    bookmarks: bookmarks, toggleBookmark: toggleBookmark,
    favorites: favorites, isFavorite: isFavorite, toggleFavorite: toggleFavorite,
    note: note, setNote: setNote, setSurahPosition: setSurahPosition, setField: setField,
    exportAll: exportAll, importAll: importAll, resetAll: resetAll,
    raw: function () { return load(); }
  };
})(window);
