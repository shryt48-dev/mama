/* =========================================================
   تسنيم — منطق التطبيق
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- أدوات ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var toastT;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function sheet(html) {
    $('#sheet-in').innerHTML = html;
    $('#sheet').classList.add('open');
  }
  function closeSheet() { $('#sheet').classList.remove('open'); }

  /* إعدادات التحكم بالصوت (سرعة / تكرار / فاصل) — من شاشة PLUS */
  function audioPro() {
    var p = (Store.raw().audioPro) || {};
    return { speed: +p.speed || 1, repeats: Math.max(1, +p.repeats || 1), gap: Math.max(0, +p.gap || 0) };
  }
  function audioFail(e) {
    toast(e && e.message === 'offline'
      ? 'وضع الأوفلاين مفعّل — نزّل صوت القارئ أولًا من ✨ PLUS'
      : 'تعذّر تشغيل الصوت — تأكد من الإنترنت');
  }
  function applyAyahFont() {
    document.documentElement.style.setProperty('--ayah-fs', (Store.settings().quranFontSize || 24) + 'px');
  }
  /* وقت تذكير الورد (من PLUS) — الافتراضي 9:00 */
  function wirdHM() {
    var m = /^(\d{1,2}):(\d{2})$/.exec(Store.settings().smartReminder || '');
    return m ? [Math.min(23, +m[1]), Math.min(59, +m[2])] : [9, 0];
  }

  var khatmaSetupMode = 'days';
  function openKhatmaSetup(keepMode) {
    if (!keepMode) khatmaSetupMode = 'days';
    var k = Store.khatma();
    var days = Math.ceil(604 / (k.pagesPerDay || 20));
    var juzPerDay = Math.round((k.pagesPerDay || 20) / (604 / 30) * 2) / 2;   // أقرب نصف جزء
    var startOptions = '<option value="start">بداية المصحف</option>' +
      Array.from({ length: 30 }, function (_, i) {
        return '<option value="' + (i + 1) + '">الجزء ' + (i + 1) + '</option>';
      }).join('');
    var juzOptions = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7.5, 10, 15, 20, 30];

    sheet(
      '<h3 style="margin:0 0 6px">ختمة جديدة</h3>' +
      '<div class="muted" style="margin-bottom:16px">حدّد إما مدة الختمة أو مقدار الورد اليومي بالأجزاء</div>' +
      '<div class="chips" style="margin-bottom:14px">' +
        '<button class="chip' + (khatmaSetupMode === 'days' ? ' on' : '') + '" data-action="khatma-mode" data-m="days">حسب المدة</button>' +
        '<button class="chip' + (khatmaSetupMode === 'juz' ? ' on' : '') + '" data-action="khatma-mode" data-m="juz">حسب الورد اليومي</button>' +
      '</div>' +
      (khatmaSetupMode === 'days'
        ? '<div class="item" style="padding:12px 4px"><span class="lb">مدة الختمة</span>' +
          '<input id="khatma-days" type="number" min="1" max="365" value="' + days + '" style="width:90px;text-align:center;background:rgba(11,33,27,.05);border:1px solid rgba(11,33,27,.12);border-radius:10px;padding:8px">' +
          '<span class="muted">يوم</span></div>'
        : '<div class="item" style="padding:12px 4px"><span class="lb">كمية الورد</span>' +
          '<select id="khatma-perday">' + juzOptions.map(function (n) {
            return '<option value="' + n + '"' + (juzPerDay === n ? ' selected' : '') + '>' +
              (n < 1 ? 'نصف جزء' : n + ' ' + (n === 1 ? 'جزء' : 'أجزاء')) + '</option>';
          }).join('') + '</select></div>') +
      '<div class="item" style="padding:12px 4px"><span class="lb">البدء من</span>' +
        '<select id="khatma-start">' + startOptions + '</select></div>' +
      '<button class="btn btn-gold" style="width:100%;margin-top:16px" data-action="confirm-khatma">الاستمرار</button>'
    );
  }

  function vibrate(ms) { if (navigator.vibrate) try { navigator.vibrate(ms || 12); } catch (e) {} }

  var CAP = window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins : null;

  /* ---------------- التاريخ الهجري ---------------- */
  var HIJRI_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
    'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  var AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس',
    'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  function gregToJD(y, m, d) {
    if (m < 3) { y -= 1; m += 12; }
    var a = Math.floor(y / 100), b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524;
  }
  function toHijri(date, offset) {
    if (offset === undefined) offset = (Store.settings().hijriOffset || 0);
    // الأدق: تقويم أم القرى عبر Intl (مدعوم في أندرويد الحديث)
    try {
      var dd = new Date(date.getTime());
      dd.setDate(dd.getDate() + offset);
      var f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',
        { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
      var parts = {}, utc = new Date(Date.UTC(dd.getFullYear(), dd.getMonth(), dd.getDate(), 12));
      f.formatToParts(utc).forEach(function (x) { parts[x.type] = x.value; });
      if (parts.day && parts.month && parts.year) {
        var mn = parseInt(parts.month, 10);
        return { y: +parts.year, m: mn, d: +parts.day,
                 text: parseInt(parts.day, 10) + ' ' + HIJRI_MONTHS[mn - 1] + ' ' + parseInt(parts.year, 10) + 'هـ' };
      }
    } catch (e) { /* نكمّل بالحساب الجدولي */ }
    var jd = gregToJD(date.getFullYear(), date.getMonth() + 1, date.getDate()) + (offset || 0);
    var l = jd - 1948440 + 10632;
    var n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    var j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) +
            (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
    l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) -
            (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    var mm = Math.floor((24 * l) / 709);
    var dd = l - Math.floor((709 * mm) / 24);
    var yy = 30 * n + j - 30;
    return { y: yy, m: mm, d: dd, text: dd + ' ' + HIJRI_MONTHS[mm - 1] + ' ' + yy + 'هـ' };
  }
  function gregText(d) {
    return AR_DAYS[d.getDay()] + '، ' + d.getDate() + ' ' + AR_MONTHS[d.getMonth()];
  }

  /* ---------------- مدن جاهزة (للعمل بدون تحديد موقع) ---------------- */
  var CITIES = [
    ['القاهرة', 30.0444, 31.2357, 'egypt'], ['الجيزة', 30.0131, 31.2089, 'egypt'],
    ['الإسكندرية', 31.2001, 29.9187, 'egypt'], ['المنصورة', 31.0409, 31.3785, 'egypt'],
    ['طنطا', 30.7865, 31.0004, 'egypt'], ['أسيوط', 27.1783, 31.1859, 'egypt'],
    ['سوهاج', 26.5591, 31.6957, 'egypt'], ['أسوان', 24.0889, 32.8998, 'egypt'],
    ['بورسعيد', 31.2653, 32.3019, 'egypt'], ['الزقازيق', 30.5877, 31.5020, 'egypt'],
    ['مكة المكرمة', 21.4225, 39.8262, 'makkah'], ['المدينة المنورة', 24.4686, 39.6142, 'makkah'],
    ['الرياض', 24.7136, 46.6753, 'makkah'], ['جدة', 21.4858, 39.1925, 'makkah'],
    ['دبي', 25.2048, 55.2708, 'dubai'], ['الدوحة', 25.2854, 51.5310, 'qatar'],
    ['الكويت', 29.3759, 47.9774, 'kuwait'], ['المنامة', 26.2285, 50.5860, 'kuwait'],
    ['عمّان', 31.9454, 35.9284, 'muslimWorld'], ['بيروت', 33.8938, 35.5018, 'muslimWorld'],
    ['دمشق', 33.5138, 36.2765, 'muslimWorld'], ['بغداد', 33.3152, 44.3661, 'karachi'],
    ['الخرطوم', 15.5007, 32.5599, 'egypt'], ['تونس', 36.8065, 10.1815, 'muslimWorld'],
    ['الجزائر', 36.7538, 3.0588, 'muslimWorld'], ['الرباط', 34.0209, -6.8416, 'muslimWorld'],
    ['طرابلس', 32.8872, 13.1913, 'muslimWorld'], ['إسطنبول', 41.0082, 28.9784, 'turkey'],
    ['لندن', 51.5074, -0.1278, 'isna'], ['باريس', 48.8566, 2.3522, 'muslimWorld'],
    ['برلين', 52.5200, 13.4050, 'muslimWorld'], ['نيويورك', 40.7128, -74.0060, 'isna']
  ];

  /* ---------------- الحالة ---------------- */
  var S = Store.load();
  var todayTimes = null, tickTimer = null, activeTab = 'wird';
  var PRAYERS = [
    { k: 'fajr', n: 'الفجر' }, { k: 'sunrise', n: 'الشروق', noAdhan: true },
    { k: 'dhuhr', n: 'الظهر' }, { k: 'asr', n: 'العصر' },
    { k: 'maghrib', n: 'المغرب' }, { k: 'isha', n: 'العشاء' }
  ];

  function fmt(d) {
    if (!d) return '--:--';
    var h = d.getHours(), m = d.getMinutes();
    var ap = h < 12 ? 'ص' : 'م';
    var hh = h % 12; if (hh === 0) hh = 12;
    return pad(hh) + ':' + pad(m) + ' ' + ap;
  }

  function computeTimes(date) {
    var st = Store.settings();
    if (st.lat === null) return null;
    return PrayerTimes.calculate({
      lat: st.lat, lng: st.lng, date: date || new Date(),
      method: st.method, asr: st.asr, adjust: st.adjust
    });
  }

  function nextPrayer() {
    if (!todayTimes) return null;
    var now = new Date();
    for (var i = 0; i < PRAYERS.length; i++) {
      var p = PRAYERS[i], t = todayTimes[p.k];
      if (t && t > now) return { key: p.k, name: p.n, at: t };
    }
    var tm = computeTimes(new Date(Date.now() + 86400000));
    return tm ? { key: 'fajr', name: 'الفجر', at: tm.fajr } : null;
  }

  function currentPrayer() {
    if (!todayTimes) return null;
    var now = new Date(), cur = null;
    PRAYERS.forEach(function (p) { if (todayTimes[p.k] && todayTimes[p.k] <= now) cur = p.k; });
    return cur;
  }

  /* =========================================================
     شاشة: ورد اليوم
     ========================================================= */
  /* حالة الاستماع والتفسير (مؤشر الآية نفسه محفوظ في Store عشان يفضل موجود بعد إغلاق التطبيق) */
  var wirdTafsirOpen = false;
  var ayahAudioEl = null;
  var ayahAudioPlaying = null; // 'wird-<s>-<a>' لتمييز الزر الشغّال

  function wirdPageAyahs(page) {
    return Quran.ready() ? Quran.page(page) : [];
  }

  function renderWird() {
    var k = Store.khatma(), ks = Store.khatmaStats();
    var st = Store.settings();
    var from = k.currentPage, to = Math.min(604, k.currentPage + k.pagesPerDay - 1);
    var now = new Date();

    var pageAyahs = wirdPageAyahs(from);
    var wirdAyahIdx = Store.wirdAyahIdx();
    if (wirdAyahIdx >= pageAyahs.length) wirdAyahIdx = 0;
    var cur = pageAyahs[wirdAyahIdx] || null;

    var bars = '';
    for (var j = 1; j <= 30; j++) {
      var startPage = JUZ_PAGES[j - 1], endPage = j < 30 ? JUZ_PAGES[j] - 1 : 604;
      var cls = from > endPage ? 'done' : (from > startPage ? 'partial' : '');
      bars += '<i class="' + cls + '"></i>';
    }

    var cs = Store.quranCharStats();
    var reciterKey = st.reciter || 'yasser';
    var reciters = Quran.reciters ? Quran.reciters() : {};

    $('#s-wird').innerHTML =
      '<div class="topbar"><div><h1>ورد اليوم</h1>' +
        '<div class="sub">' + gregText(now) + ' • ' + toHijri(now).text + '</div></div>' +
        '<div class="acts"><button class="iconbtn" data-action="open-settings">⚙</button></div></div>' +
      '<div class="wrap">' +
        '<div class="dua-note dua-top">اللهم ارزق جيهان و والديها الفردوس الأعلى</div>' +
        (cur ? renderAyahCard(cur, reciterKey, reciters) :
          '<div class="empty">📥 المصحف لسه مش متحمّل على الجهاز.<br>' +
          '<button class="btn btn-primary" style="margin-top:14px" data-action="download-quran">نزّل المصحف الآن</button></div>') +
        '<div class="btnrow" style="margin-top:14px">' +
          '<button class="btn btn-primary" data-action="read-wird">اقرأ الورد كاملاً</button>' +
          '<button class="btn btn-gold" data-action="finish-wird">أتممت القراءة</button>' +
        '</div>' +
        (ks.behindBy > 0 ? '<div class="late">⚠ أنت متأخر عن ختمتك بـ ' + ks.behindBy + ' ' +
          (ks.behindBy === 1 ? 'ورد' : 'أوراد') + '</div>' : '') +
        '<div class="foredge">' +
          '<div class="foredge-head"><span class="lbl">الختمة الحالية</span>' +
            '<span class="val">' + ks.progress + '٪ • بقي ' + ks.remainingWirds + ' ورد</span></div>' +
          '<div class="foredge-bars">' + bars + '</div>' +
          '<div class="foredge-cap"><span>الجزء ٣٠</span><span>ختمات مكتملة: ' + ks.completed + '</span><span>الجزء ١</span></div>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-top:18px">عدد الأحرف التي قرأتها</div>' +
        '<div class="stats">' +
          statCard('اليوم', cs.today.toLocaleString('ar-EG')) +
          statCard('هذا الأسبوع', cs.week.toLocaleString('ar-EG')) +
          statCard('هذا الشهر', cs.month.toLocaleString('ar-EG')) +
          statCard('منذ استخدام البرنامج', cs.total.toLocaleString('ar-EG')) +
        '</div>' +
      '</div>' + duaStrip();

    if (cur && wirdTafsirOpen) loadTafsirInto('#ayah-tafsir-box', cur.s, cur.a);
  }

  function renderAyahCard(a, reciterKey, reciters) {
    var playKey = 'wird-' + a.s + '-' + a.a;
    var isPlaying = ayahAudioPlaying === playKey;
    var chips = Object.keys(reciters).map(function (k) {
      return '<button class="reciter-chip' + (k === reciterKey ? ' on' : '') +
        '" data-action="set-reciter" data-r="' + k + '">' + esc(reciters[k].name) + '</button>';
    }).join('');

    return '<div class="ayah-card">' +
      '<div class="ayah-top"><span class="badge">الجزء ' + (a.j || Quran.juzOfPage(a.p)) + '</span>' +
        '<span>سورة ' + esc(Quran.surahName(a.s)) + ' — آية ' + a.a + '</span></div>' +
      '<div class="ayah-txt">' + esc(stripBasmala(a.t)) + '</div>' +
      '<div class="ayah-loc">صفحة ' + a.p + ' من 604</div>' +
      '<div class="ayah-acts">' +
        '<button class="playbtn' + (isPlaying ? ' playing' : '') + '" data-action="play-ayah" data-s="' + a.s + '" data-a="' + a.a + '">' +
          (isPlaying ? '⏸' : '▶') + '</button>' +
        '<div class="ayah-nav">' +
          '<button data-action="ayah-prev">الآية السابقة</button>' +
          '<button data-action="ayah-next">الآية التالية</button>' +
        '</div>' +
        '<button class="iconbtn" data-action="toggle-tafsir" style="background:rgba(11,33,27,.06)">📖</button>' +
      '</div>' +
      '<div class="reciter-row">' + chips + '</div>' +
      (wirdTafsirOpen ?
        '<div class="ayah-tafsir" id="ayah-tafsir-box"><span class="lbl">التفسير الميسّر</span>جارٍ التحميل…</div>'
        : '') +
    '</div>';
  }

  function loadTafsirInto(sel, s, a) {
    if (!Quran.fetchTafsir) return;
    Quran.fetchTafsir(s, a).then(function (text) {
      var box = $(sel);
      if (!box) return; // المستخدم غيّر الشاشة
      box.innerHTML = '<span class="lbl">التفسير الميسّر</span>' +
        (text ? esc(text) : 'تعذّر إحضار التفسير الآن — تأكد من الإنترنت.');
    });
  }

  function stopAyahAudio() {
    if (ayahAudioEl) { try { ayahAudioEl.pause(); } catch (e) {} }
    ayahAudioPlaying = null;
  }

  function playAyahAudio(s, a) {
    var key = 'wird-' + s + '-' + a;
    if (ayahAudioPlaying === key) { stopAyahAudio(); renderWird(); return; }
    stopAyahAudio();
    var st = Store.settings();
    if (!ayahAudioEl) ayahAudioEl = new Audio();
    var el = ayahAudioEl;
    Quran.getPlayableAudioUrl(s, a, st.reciter || 'yasser').then(function (url) {
      el.src = url;
      var sp = audioPro().speed;
      el.defaultPlaybackRate = sp; el.playbackRate = sp;
      el.onended = function () { ayahAudioPlaying = null; renderWird(); };
      el.onerror = function () { ayahAudioPlaying = null; toast('تعذّر تشغيل الصوت — تأكد من الإنترنت'); renderWird(); };
      return el.play();
    }).then(function () {
      ayahAudioPlaying = key; renderWird();
    }).catch(audioFail);
  }

  var IN_APP_DUA = 'اللَّهُمَّ ارْزُقْ مَحْمُود شَرِيف وَوَالِدَيْهِ حُسْنَ الْخَاتِمَةِ';
  var EXIT_DUA = 'اللَّهُمَّ ارْزُقْ مَحْمُود شَرِيف وَوَالِدَيْهِ حُسْنَ الْخَاتِمَةِ';
  function duaStrip() {
    return '<div class="dua-strip">🤲 ' + IN_APP_DUA + '</div>';
  }

  function statCard(k, v) {
    return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
  }

  /* ---------------- الحساب السحابي (مزامنة البيانات بالإيميل) ---------------- */
  function accountBlock() {
    var cs = window.CloudSync;
    if (!cs || !cs.enabled()) {
      return '<button class="item" data-action="open-account"><span class="ic">☁</span>' +
        '<span class="lb">تسجيل الدخول بالإيميل</span><span class="rt">غير مفعّلة بعد</span></button>';
    }
    var user = cs.currentUser();
    if (!user) {
      return '<button class="item" data-action="open-account"><span class="ic">☁</span>' +
        '<span class="lb">تسجيل الدخول / إنشاء حساب</span></button>' +
        '<div class="item" style="opacity:.65"><span class="ic">ℹ</span><span class="lb" style="font-size:12.5px">' +
        'سجّل بإيميلك عشان تحفظ ورد وختمة وإحصائياتك، ولو مسحت التطبيق ورجّعته هيرجعلك كل حاجة</span></div>';
    }
    var st = cs.status();
    var stLabel = { syncing: 'بيتزامن الآن…', synced: 'متزامن ✓', error: 'حصل خطأ في المزامنة' }[st] || 'متصل';
    return '<div class="item"><span class="ic">📧</span><span class="lb">' + esc(user.email) + '</span>' +
        '<span class="rt" id="acc-status">' + stLabel + '</span></div>' +
      '<button class="item" data-action="sync-now"><span class="ic">🔄</span><span class="lb">مزامنة الآن</span></button>' +
      '<button class="item" data-action="do-signout"><span class="ic">🚪</span><span class="lb">تسجيل الخروج</span></button>';
  }

  function openAccountSheet() {
    sheet(
      '<h3 style="margin:0 0 4px">تسجيل الدخول</h3>' +
      '<p style="font-size:12.5px;color:#6B7F76;margin:0 0 14px">سجّل بإيميلك عشان بياناتك (ورد، ختمة، أذكار، إحصائيات) تتحفظ وترجعلك لو غيّرت الجهاز.</p>' +
      '<input id="acc-email" type="email" placeholder="الإيميل" style="width:100%;margin-bottom:10px" autocapitalize="off">' +
      '<input id="acc-pass" type="password" placeholder="كلمة السر (6 حروف على الأقل)" style="width:100%">' +
      '<div id="acc-msg" style="font-size:12.5px;color:#A8462F;margin-top:8px;min-height:16px"></div>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:10px" data-action="do-signin">دخول</button>' +
      '<button class="btn btn-ghost" style="width:100%;margin-top:8px" data-action="do-signup">إنشاء حساب جديد</button>' +
      '<button class="btn btn-ghost" style="width:100%;margin-top:8px;font-size:12.5px" data-action="do-forgot">نسيت كلمة السر</button>'
    );
  }

  function accCreds() {
    var e = $('#acc-email'), p = $('#acc-pass');
    return { email: e ? e.value.trim() : '', pass: p ? p.value : '' };
  }
  function accMsg(text, ok) {
    var m = $('#acc-msg');
    if (m) { m.textContent = text; m.style.color = ok ? '#2E7D46' : '#A8462F'; }
  }
  function safeAccountBlock() {
    try { return accountBlock(); }
    catch (e) {
      console.warn('accountBlock failed', e);
      return '<button class="item" data-action="open-account"><span class="ic">☁</span>' +
        '<span class="lb">تسجيل الدخول بالإيميل</span><span class="rt">غير مفعّلة بعد</span></button>';
    }
  }

  /* ---------------- آية تظهر عند فتح التطبيق — تُقرأ، تُعلَّم بصح، تختفي ---------------- */
  function gateAyahAt(i) {
    if (!Quran.ready() || !Quran.ayahAt) return null;
    return Quran.ayahAt(i % Quran.TOTAL_AYAHS);
  }

  /* الآية المعروضة حاليًا (بعد ما بتظهر بيكون index اتقدّم للي بعدها) */
  function gateCurrentIndex(g) { return g.shownIndex != null ? g.shownIndex : g.index; }

  function showAyahGate() {
    if (!Quran.ready()) return;               // المصحف لسه بيتحمّل — منعرضش حاجة فاضية
    if (!Store.shouldShowGate()) return;
    var g = Store.gateState();
    var a = gateAyahAt(g.index);
    if (!a) return;
    Store.markGateShown();
    gateTafsirOpen = false;
    renderAyahGate(a);
    $('#ayah-gate').classList.add('open');
  }

  function renderAyahGate(a) {
    $('#ayah-gate').innerHTML =
      '<div class="gate-eyebrow">آيتك الآن</div>' +
      '<div class="gate-card">' +
        '<div class="gate-top"><span class="gate-badge">الجزء ' + a.j + '</span>' +
          '<span>سورة ' + esc(Quran.surahName(a.s)) + ' — آية ' + a.a + '</span></div>' +
        '<div class="gate-text">' + esc(stripBasmala(a.t)) + '</div>' +
        '<div class="gate-loc">صفحة ' + a.p + ' من 604</div>' +
        '<div class="gate-row">' +
          '<button class="gate-play" data-action="gate-play">▶</button>' +
          '<button class="gate-tafsir-btn" data-action="gate-toggle-tafsir">📖 التفسير</button>' +
        '</div>' +
        (gateTafsirOpen ?
          '<div class="ayah-tafsir" id="gate-tafsir-box"><span class="lbl">التفسير الميسّر</span>جارٍ التحميل…</div>'
          : '') +
      '</div>' +
      '<div class="gate-actions">' +
        '<button class="gate-check" data-action="gate-done">✓ قرأتها</button>' +
        '<button class="gate-skip" data-action="gate-close">لاحقًا</button>' +
      '</div>' +
      '<div class="gate-progress">قرأت ' + Store.gateState().readTotal.toLocaleString('ar-EG') + ' آية بهذه الطريقة</div>';

    if (gateTafsirOpen) loadTafsirInto('#gate-tafsir-box', a.s, a.a);
  }

  function closeAyahGate() {
    $('#ayah-gate').classList.remove('open');
    $('#ayah-gate').innerHTML = '';
    stopGateAudio();
  }

  function markGateDone() {
    var g = Store.gateState();
    var a = gateAyahAt(gateCurrentIndex(g));
    var len = a ? a.t.replace(/\s+/g, '').length : 0;
    Store.markGateRead(len);
    closeAyahGate();
    if (activeTab === 'wird') renderWird();
    if (activeTab === 'stats' || activeTab === 'more') renderMore();
  }

  var gateAudioEl = null;
  var gateTafsirOpen = false;
  function stopGateAudio() { if (gateAudioEl) { try { gateAudioEl.pause(); } catch (e) {} } }
  function playGateAudio() {
    var g = Store.gateState();
    var a = gateAyahAt(gateCurrentIndex(g));
    if (!a) return;
    stopGateAudio();
    var st = Store.settings();
    if (!gateAudioEl) gateAudioEl = new Audio();
    gateAudioEl.src = Quran.ayahAudioUrl(a.s, a.a, st.reciter || 'yasser');
    gateAudioEl.play().catch(function () { toast('تعذّر تشغيل الصوت — تأكد من الإنترنت'); });
  }

  /* =========================================================
     شاشة: الأذكار
     ========================================================= */
  function renderAdhkar() {
    var cards = ADHKAR_CATEGORIES.map(function (c, i) {
      var s = Store.adhkarStats(c.id);
      var wide = (i < 2) ? ' wide' : '';
      return '<button class="cat tone-' + c.tone + wide + '" data-action="open-cat" data-cat="' + c.id + '">' +
        '<span class="n">اليوم ' + s.today + ' • الكل ' + s.total + '</span>' +
        '<span class="t">' + c.title + '</span><span class="s">' + c.subtitle + '</span></button>';
    }).join('');

    $('#s-adhkar').innerHTML =
      '<div class="topbar"><div><h1>الأذكار</h1><div class="sub">اضغط على الذكر لتنقيص العدّاد</div></div>' +
      '<div class="acts"><button class="iconbtn" data-action="open-stats">📊</button></div></div>' +
      '<div class="wrap"><div class="cats">' + cards +
      '<button class="cat tone-green wide" data-action="open-salawat">' +
        '<span class="n">اليوم ' + Store.counterStats('salawat').today + '</span>' +
        '<span class="t">الصلاة على النبي ﷺ</span><span class="s">عدّاد بصيغ متعددة</span></button>' +
      '<button class="cat tone-olive wide" data-action="open-tasbih">' +
        '<span class="n">اليوم ' + Store.counterStats('tasbih').today + '</span>' +
        '<span class="t">المسبحة الإلكترونية</span><span class="s">سبّح واحفظ العدد</span></button>' +
      '</div></div>' + duaStrip();
  }

  /* قارئ ذكر واحد في كل مرة — بطراز أخضر (زي حصن المسلم) */
  var catState = null;
  function openCategory(id) {
    var cat = ADHKAR_CATEGORIES.filter(function (c) { return c.id === id; })[0];
    if (!cat) return;
    catState = {
      cat: cat, index: 0,
      done: cat.items.map(function () { return false; }), // الذكر ذو المرة الواحدة لا يُحتسب إلا بعد ضغط المستخدم على «قراءة»
      count: cat.items.map(function () { return 0; })
    };
    drawCategory();
    activeTab = 'adhkar-detail';
    showScreen('s-adhkar');
  }

  function targetLabel(n) {
    if (n === 1) return 'مرة واحدة';
    if (n === 2) return 'مرتان';
    if (n === 3) return 'ثلاث مرات';
    if (n === 4) return 'أربع مرات';
    if (n === 7) return 'سبع مرات';
    if (n === 10) return 'عشر مرات';
    if (n === 33) return 'ثلاث وثلاثون مرة';
    if (n === 40) return 'أربعون مرة';
    if (n === 100) return 'مائة مرة';
    return n + ' مرة';
  }

  function drawCategory() {
    var cat = catState.cat, i = catState.index;
    var total = cat.items.length;
    var it = cat.items[i];
    var target = it.count || 1;
    var count = catState.count[i];
    var singleShot = target <= 1;
    var finished = singleShot ? catState.done[i] : count >= target;

    $('#s-adhkar').innerHTML =
      '<div class="dbar"><button class="ic" data-action="back-adhkar">▶</button>' +
        '<div class="ttl">' + esc(cat.title) + '</div>' +
        '<button class="ic" data-action="reset-dhikr">↻</button></div>' +
      '<div class="dprog"><span class="n">' + total + '/' + (i + 1) + '</span>' +
        '<div class="bar"><i style="width:' + Math.round(((i + (finished ? 1 : 0)) / total) * 100) + '%"></i></div></div>' +
      '<div class="dbody">' +
        '<div class="dtext">' + esc(it.text) + '</div>' +
        (it.virtue ? '<div class="dvirtue">' + esc(it.virtue) + (it.source ? ' (' + esc(it.source) + ')' : '') + '</div>' : '') +
      '</div>' +
      '<div class="dfoot">' +
        '<button class="dshare" data-action="share-dhikr">⤴</button>' +
        (singleShot ? '' :
          '<button class="dcircle" data-action="tap-dhikr">' + count + '</button>' +
          '<div class="dtarget">' + targetLabel(target) + '</div>') +
        (singleShot ? '<div style="flex:1"></div>' : '') +
      '</div>' +
      '<button class="dgo" data-action="dhikr-go">' + (finished ? 'التالي' : 'قراءة') + '</button>';
    bindSwipe();
  }

  /* سحب اليد يمينًا/يسارًا للتنقل بين الأذكار بدون لمس الأزرار */
  var swipeBound = false, swipeX = 0, swipeY = 0;
  function bindSwipe() {
    if (swipeBound) return;
    swipeBound = true;
    var body = $('#s-adhkar');
    body.addEventListener('touchstart', function (e) {
      if (!catState) return;
      swipeX = e.touches[0].clientX; swipeY = e.touches[0].clientY;
    }, { passive: true });
    body.addEventListener('touchend', function (e) {
      if (!catState) return;
      var dx = e.changedTouches[0].clientX - swipeX;
      var dy = e.changedTouches[0].clientY - swipeY;
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;   // سحب أفقي واضح فقط
      if (e.target.closest('.dcircle,.dgo,.ic,.dshare')) return;           // ميعملش تعارض مع لمس الأزرار
      if (dx > 0) swipeAdvance(1); else swipeAdvance(-1);                   // سحب لليمين = التالي
    }, { passive: true });
  }
  function swipeAdvance(dir) {
    if (!catState) return;
    var cat = catState.cat;
    if (dir > 0) {
      if (catState.index + 1 < cat.items.length) { catState.index++; drawCategory(); }
      else { Store.markAdhkarDone(cat.id); showDoneCategory(); }
    } else if (catState.index > 0) { catState.index--; drawCategory(); }
    vibrate(6);
  }

  function tapDhikr() {
    var cat = catState.cat, i = catState.index;
    var it = cat.items[i], target = it.count || 1;
    if (target <= 1) return;
    if (catState.count[i] < target) {
      catState.count[i]++;
      vibrate(10);
      bumpFromText(it.text);
      if (catState.count[i] >= target) vibrate([16, 30, 16]);
    }
    drawCategory();
  }

  function bumpFromText(txt) {
    if (txt.indexOf('صَلِّ') > -1 || txt.indexOf('صلَّى') > -1) Store.bump('salawat', 1);
    else if (txt.indexOf('سُبْحَانَ') > -1) Store.bump('tasbih', 1);
    else if (txt.indexOf('أَسْتَغْفِرُ') > -1) Store.bump('istighfar', 1);
  }

  function dhikrGo() {
    var cat = catState.cat, i = catState.index;
    var it = cat.items[i], target = it.count || 1;
    var singleShot = target <= 1;
    var finished = singleShot ? catState.done[i] : catState.count[i] >= target;

    if (!finished) {
      // مرة واحدة: اضغط "قراءة" فتُحتسب وتظهر "التالي"
      if (singleShot) { catState.done[i] = true; bumpFromText(it.text); vibrate(10); drawCategory(); return; }
      tapDhikr();
      return;
    }
    // انتقل للذكر التالي أو أنهِ القسم
    if (i + 1 < cat.items.length) {
      catState.index++;
      drawCategory();
    } else {
      Store.markAdhkarDone(cat.id);
      showDoneCategory();
    }
  }

  function showDoneCategory() {
    var cat = catState.cat;
    var s = Store.adhkarStats(cat.id);
    $('#s-adhkar').innerHTML =
      '<div class="dbar"><button class="ic" data-action="back-adhkar">▶</button>' +
        '<div class="ttl">' + esc(cat.title) + '</div><div style="width:34px"></div></div>' +
      '<div class="done-panel">' +
        '<div class="em">✨</div><h2>تقبّل الله منك</h2>' +
        '<div style="color:var(--muted);font-size:13.5px">أتممت ' + esc(cat.title) + ' — المرة رقم ' + s.total + '</div>' +
        '<button class="btn btn-gold" style="width:100%;margin-top:22px" data-action="reopen-cat">إعادة القراءة</button>' +
        '<button class="btn btn-ghost" style="width:100%;margin-top:10px" data-action="back-adhkar">رجوع للأذكار</button>' +
      '</div>';
  }

  /* =========================================================
     شاشة: الصلاة
     ========================================================= */
  function renderPrayer() {
    var st = Store.settings();
    if (st.lat === null) {
      $('#s-prayer').innerHTML =
        '<div class="topbar"><h1>مواقيت الصلاة</h1></div>' +
        '<div class="empty">📍 حدّد موقعك الأول عشان نحسب المواقيت بدقة.<br>' +
        '<button class="btn btn-primary" style="margin-top:16px" data-action="locate">تحديد موقعي تلقائيًا</button>' +
        '<button class="btn btn-ghost" style="margin-top:10px" data-action="pick-city">اختر مدينتك من القائمة</button></div>';
      return;
    }
    todayTimes = computeTimes();
    var np = nextPrayer(), cur = currentPrayer();
    var now = new Date();

    var rows = PRAYERS.map(function (p) {
      var done = Store.prayerStats().day[p.k];
      return '<div class="prow' + (cur === p.k ? ' now' : '') + '">' +
        (p.noAdhan ? '<span class="check" style="opacity:.25">·</span>' :
          '<button class="check' + (done ? ' on' : '') + '" data-action="toggle-prayer" data-p="' + p.k + '">✓</button>') +
        '<span class="pn">' + p.n + '</span>' +
        '<span class="pt">' + fmt(todayTimes[p.k]) + '</span></div>';
    }).join('');

    $('#s-prayer').innerHTML =
      '<div class="topbar"><div><h1>مواقيت الصلاة</h1><div class="sub">' + esc(st.city || 'موقعك الحالي') + '</div></div>' +
      '<div class="acts"><button class="iconbtn" data-action="prayer-settings">⚙</button></div></div>' +
      '<div class="next-prayer"><div class="lbl">باقي على أذان ' + (np ? np.name : '—') + '</div>' +
        '<div class="cd" id="countdown">--:--:--</div>' +
        '<div class="nm">' + (np ? fmt(np.at) : '') + '</div></div>' +
      '<div class="hijri">' + gregText(now) + ' — ' + toHijri(now).text + '</div>' +
      '<div class="ptimes">' + rows + '</div>' +
      '<div class="wrap" style="padding-top:0">' +
        renderQibla(st) +
        '<div class="section-title">التنبيهات</div>' +
        '<div class="list">' +
          switchItem('🔔', 'أذان عند دخول الوقت', 'adhanEnabled', st.adhanEnabled) +
          switchItem('🤍', 'الصلاة على النبي عند فتح الهاتف', 'unlockDhikrEnabled', st.unlockDhikrEnabled) +
          switchItem('✳', 'إشعار ذكر كل فترة', 'periodicDhikr', st.periodicDhikr) +
        '</div>' +
        '<div class="section-title">طريقة الحساب</div>' +
        '<div class="list"><div class="item"><span class="ic">🧭</span><span class="lb">الطريقة</span>' +
          '<select data-action="set-method">' + Object.keys(PrayerTimes.METHODS).map(function (m) {
            return '<option value="' + m + '"' + (st.method === m ? ' selected' : '') + '>' +
              PrayerTimes.METHODS[m].name + '</option>'; }).join('') + '</select></div>' +
        '<div class="item"><span class="ic">🕐</span><span class="lb">مذهب العصر</span>' +
          '<select data-action="set-asr">' +
          '<option value="standard"' + (st.asr === 'standard' ? ' selected' : '') + '>الجمهور</option>' +
          '<option value="hanafi"' + (st.asr === 'hanafi' ? ' selected' : '') + '>الحنفي</option></select></div>' +
        '<div class="item"><span class="ic">📍</span><span class="lb">تغيير الموقع</span>' +
          '<button class="rt" data-action="pick-city">تغيير</button></div></div>' +
      '</div>';
    startCountdown();
    setupQiblaCompass(st);
  }

  /* ---------------- القبلة ---------------- */
  function renderQibla(st) {
    if (st.lat === null) return '';
    var bearing = PrayerTimes.qiblaBearing(st.lat, st.lng);
    var dist = PrayerTimes.qiblaDistanceKm(st.lat, st.lng);
    return '<div class="qibla-card">' +
      '<div class="section-title" style="margin:0 0 4px;text-align:center">اتجاه القبلة</div>' +
      '<div class="qibla-flat-tip" id="qibla-flat-tip">' +
        '<div class="qibla-flat-phone"><span class="qibla-flat-arrow">↓</span></div>' +
        '<div class="qibla-flat-txt">ثبّت الفون على سطح مستوٍ (أو في إيدك بشكل أفقي)، والشاشة لفوق، عشان البوصلة تدّي قراءة صح</div>' +
      '</div>' +
      '<div class="qibla-wrap">' +
        '<div class="qibla-dial" id="qibla-dial">' +
          '<div class="qibla-needle" id="qibla-needle" style="transform:rotate(' + bearing + 'deg)">' +
            '<span class="qibla-kaaba">🕋</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="qibla-deg">' + Math.round(bearing) + '° من الشمال</div>' +
      '<div class="qibla-dist">تبعد عنك الكعبة تقريبًا ' + dist.toLocaleString('ar-EG') + ' كم</div>' +
      '<div class="qibla-dist" id="qibla-hint" style="margin-top:8px">وجّه أعلى الفون ناحية الشمال ليتطابق السهم مع اتجاه القبلة</div>' +
    '</div>';
  }

  var qiblaHeadingHandler = null;
  var qiblaWatchdog = null;
  function setupQiblaCompass(st) {
    if (qiblaHeadingHandler) {
      window.removeEventListener('deviceorientationabsolute', qiblaHeadingHandler);
      window.removeEventListener('deviceorientation', qiblaHeadingHandler);
      qiblaHeadingHandler = null;
    }
    clearTimeout(qiblaWatchdog);
    if (st.lat === null) return;
    var hintEl = $('#qibla-hint');
    if (typeof DeviceOrientationEvent === 'undefined') {
      if (hintEl) hintEl.textContent = 'جهازك مش بيدعم بوصلة تلقائية — استخدم الرقم والاتجاه المكتوب فوق مع بوصلة عادية';
      return;
    }
    var bearing = PrayerTimes.qiblaBearing(st.lat, st.lng);
    var gotAbsolute = false, gotAny = false;

    qiblaHeadingHandler = function (e) {
      var heading = null, approx = false;
      if (e.webkitCompassHeading !== undefined) {
        heading = e.webkitCompassHeading;
      } else if (e.absolute === true && e.alpha !== null) {
        heading = 360 - e.alpha;
        gotAbsolute = true;
      } else if (!gotAbsolute && e.alpha !== null) {
        // كثير من هواتف الأندرويد ما بترسلش deviceorientationabsolute خالص —
        // فبنستخدم القراءة العادية بدل ما السهم يفضل واقف من غير حركة
        heading = 360 - e.alpha;
        approx = true;
      }
      if (heading === null) return;
      gotAny = true;
      var diff = ((bearing - heading + 540) % 360) - 180;   // من -180 لـ 180
      var aligned = Math.abs(diff) <= 6;
      var needle = $('#qibla-needle');
      if (needle) needle.style.transform = 'rotate(' + ((bearing - heading + 360) % 360) + 'deg)';
      var dial = $('#qibla-dial');
      if (dial) {
        if (aligned && !dial.classList.contains('aligned')) {
          dial.classList.add('aligned');
          if (CAP && CAP.Haptics) CAP.Haptics.vibrate({ duration: 60 }).catch(function () {});
        } else if (!aligned) {
          dial.classList.remove('aligned');
        }
      }
      var hint = $('#qibla-hint');
      if (hint) hint.textContent = aligned
        ? '🟢 كده ظبطت الاتجاه — إنت متجه للقبلة الآن'
        : approx
          ? 'البوصلة شغالة (تقريبية) — حرّك الفون على شكل ٨ لو حسيت إنها مش دقيقة'
          : 'اتجاه بوصلة الهاتف مفعّل — دُر بجسمك حتى يشير السهم لأعلى';
    };
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS-style permission (نادر على أندرويد لكن للاحتياط)
      DeviceOrientationEvent.requestPermission().then(function (r) {
        if (r === 'granted') window.addEventListener('deviceorientation', qiblaHeadingHandler);
      }).catch(function () {});
    } else {
      window.addEventListener('deviceorientationabsolute', qiblaHeadingHandler);
      window.addEventListener('deviceorientation', qiblaHeadingHandler);
      // لو بعد 3 ثواني مفيش أي استجابة من الحساس خالص، نوضّح المشكلة بدل السكوت
      qiblaWatchdog = setTimeout(function () {
        if (!gotAny) {
          var hint2 = $('#qibla-hint');
          if (hint2) hint2.textContent = 'مفيش استجابة من حساس البوصلة في جهازك — جرّب تفتح تطبيق البوصلة العادي في الفون للتأكد إنه شغال';
        }
      }, 3000);
    }
  }

  function switchItem(ic, label, key, on) {
    return '<div class="item"><span class="ic">' + ic + '</span><span class="lb">' + label + '</span>' +
      '<button class="switch' + (on ? ' on' : '') + '" data-action="toggle-setting" data-key="' + key + '"><i></i></button></div>';
  }

  function startCountdown() {
    clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      var el = $('#countdown');
      if (!el) { clearInterval(tickTimer); return; }
      var np = nextPrayer();
      if (!np) return;
      var diff = Math.max(0, np.at - new Date());
      var h = Math.floor(diff / 3600000), m = Math.floor(diff % 3600000 / 60000), s = Math.floor(diff % 60000 / 1000);
      el.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
      if (diff < 1000) { setTimeout(renderPrayer, 1500); }
    }, 1000);
  }

  /* =========================================================
     شاشة: الفهرس
     ========================================================= */
  var indexTab = 'surah';
  function renderIndex() {
    var body;
    if (indexTab === 'surah') {
      body = SURAH_META.map(function (m) {
        return '<button class="srow" data-action="open-page" data-page="' + Quran.surahStartPage(m[0]) + '">' +
          '<span class="snum">' + m[0] + '</span>' +
          '<span class="sname">سورة ' + m[1] + '</span>' +
          '<span class="smeta">صفحة ' + Quran.surahStartPage(m[0]) + '<br>' + m[4] + ' • ' + m[2] + ' آية</span></button>';
      }).join('');
    } else {
      body = JUZ_PAGES.map(function (p, i) {
        var a = Quran.ready() ? Quran.firstAyahOfPage(p) : null;
        return '<button class="srow" data-action="open-page" data-page="' + p + '">' +
          '<span class="snum">' + (i + 1) + '</span>' +
          '<span class="sname">الجزء ' + (i + 1) + '</span>' +
          '<span class="smeta">صفحة ' + p + (a ? '<br>' + Quran.surahName(a.s) + ' ' + a.a : '') + '</span></button>';
      }).join('');
    }
    $('#s-index').innerHTML =
      '<div class="topbar"><h1>الفهرس</h1>' +
      '<div class="acts"><button class="iconbtn" data-action="goto-page">🔎</button></div></div>' +
      '<div class="tabs">' +
        '<button data-action="index-tab" data-t="surah" class="' + (indexTab === 'surah' ? 'on' : '') + '">السور</button>' +
        '<button data-action="index-tab" data-t="juz" class="' + (indexTab === 'juz' ? 'on' : '') + '">الأجزاء</button>' +
      '</div>' + body;
  }

  /* =========================================================
     شاشة: المزيد
     ========================================================= */
  function renderMore() {
    var st = Store.settings();
    var ks = Store.khatmaStats();
    var sal = Store.counterStats('salawat'), tas = Store.counterStats('tasbih'), ist = Store.counterStats('istighfar');
    var pr = Store.prayerStats();

    $('#s-more').innerHTML =
      '<div class="topbar"><h1>المزيد</h1></div>' +
      '<div class="wrap">' +
        '<div class="section-title">إحصائياتي</div>' +
        '<div class="stats">' +
          statCard('ختمات القرآن', ks.completed) +
          statCard('الصلاة على النبي ﷺ', sal.total) +
          statCard('التسبيح', tas.total) +
          statCard('الاستغفار', ist.total) +
          statCard('الصلوات المسجّلة', pr.total) +
          statCard('صفحة الختمة الحالية', ks.page) +
        '</div>' +
        '<div class="section-title">الختمة</div>' +
        '<div class="list">' +
          '<div class="item"><span class="ic">📖</span><span class="lb">صفحات الورد اليومي</span>' +
            '<select data-action="set-wird">' + [1, 2, 4, 5, 10, 15, 20, 21, 30, 40, 60].map(function (n) {
              return '<option value="' + n + '"' + (Store.khatma().pagesPerDay === n ? ' selected' : '') + '>' + n + ' صفحة</option>';
            }).join('') + '</select></div>' +
          '<button class="item" data-action="new-khatma"><span class="ic">＋</span><span class="lb">بدء ختمة جديدة</span></button>' +
          '<button class="item" data-action="open-bookmarks"><span class="ic">🔖</span><span class="lb">العلامات المرجعية</span>' +
            '<span class="rt">' + Store.bookmarks().length + '</span></button>' +
        '</div>' +
        '<div class="section-title">سنن قرآنية</div>' +
        '<div class="list">' +
          '<button class="item" data-action="open-page" data-page="' + Quran.surahStartPage(18) + '"><span class="ic">📗</span><span class="lb">سورة الكهف</span></button>' +
          '<button class="item" data-action="open-page" data-page="' + Quran.surahStartPage(67) + '"><span class="ic">📘</span><span class="lb">سورة الملك</span></button>' +
          '<button class="item" data-action="open-page" data-page="' + Quran.surahStartPage(36) + '"><span class="ic">📙</span><span class="lb">سورة يس</span></button>' +
          '<button class="item" data-action="open-page" data-page="' + Quran.surahStartPage(2) + '"><span class="ic">📕</span><span class="lb">سورة البقرة</span></button>' +
        '</div>' +
        '<div class="section-title">التنبيهات</div>' +
        '<div class="list">' +
          switchItem('📖', 'آية تظهر عند فتح التطبيق', 'ayahGateEnabled', st.ayahGateEnabled) +
          switchItem('📗', 'تذكير بقراءة ورد اليوم', 'wirdReminder', st.wirdReminder) +
          '<button class="item" data-action="pin-widget"><span class="ic">🏠</span>' +
            '<span class="lb">إضافة آية على الشاشة الرئيسية</span></button>' +
          switchItem('🔔', 'أذان عند دخول الوقت', 'adhanEnabled', st.adhanEnabled) +
          switchItem('🤍', 'صلاة على النبي عند فتح الهاتف', 'unlockDhikrEnabled', st.unlockDhikrEnabled) +
          switchItem('🌙', 'آية فوق أي تطبيق عند فتح قفل الهاتف', 'lockAyahEnabled', st.lockAyahEnabled) +
          switchItem('🔊', 'صوت مع تنبيه فتح الهاتف', 'unlockSalawatSound', st.unlockSalawatSound) +
          switchItem('✳', 'إشعار ذكر كل فترة', 'periodicDhikr', st.periodicDhikr) +
          '<div class="item"><span class="ic">⏱</span><span class="lb">كل كام دقيقة</span>' +
            '<select data-action="set-periodic">' + [15, 30, 60, 120, 180, 360].map(function (n) {
              return '<option value="' + n + '"' + (st.periodicEveryMin === n ? ' selected' : '') + '>' + n + ' دقيقة</option>';
            }).join('') + '</select></div>' +
          '<div class="item"><span class="ic">🕒</span><span class="lb">أقل فاصل لتنبيه فتح الهاتف</span>' +
            '<select data-action="set-cooldown">' + [0, 5, 15, 30, 60, 120].map(function (n) {
              return '<option value="' + n + '"' + (st.unlockCooldownMin === n ? ' selected' : '') + '>' +
                (n === 0 ? 'كل مرة' : n + ' دقيقة') + '</option>';
            }).join('') + '</select></div>' +
        '</div>' +
        '<div class="section-title">التاريخ الهجري</div>' +
        '<div class="list"><div class="item"><span class="ic">🌙</span><span class="lb">تعديل التاريخ الهجري</span>' +
          '<select data-action="set-hijri">' + [-2, -1, 0, 1, 2].map(function (n) {
            return '<option value="' + n + '"' + ((st.hijriOffset || 0) === n ? ' selected' : '') + '>' +
              (n > 0 ? '+' + n : n) + ' يوم</option>'; }).join('') + '</select></div>' +
          '<div class="item"><span class="ic">📅</span><span class="lb">اليوم</span>' +
            '<span class="rt">' + toHijri(new Date()).text + '</span></div></div>' +
        '<div class="section-title">القارئ</div>' +
        '<div class="list"><div class="item"><span class="ic">🎙</span><span class="lb">صوت التلاوة</span>' +
          '<select data-action="set-reciter-select">' + Object.keys(Quran.reciters()).map(function (k) {
            return '<option value="' + k + '"' + ((st.reciter || 'yasser') === k ? ' selected' : '') + '>' +
              esc(Quran.reciterName(k)) + '</option>'; }).join('') + '</select></div>' +
          '<button class="item" data-action="download-reciter"><span class="ic">🎧</span><span class="lb">تحميل تلاوة القارئ كاملًا للعمل بدون إنترنت</span><span class="rt">تنزيل</span></button></div>' +
        '<div class="section-title">المصحف</div>' +
        '<div class="list">' +
          '<button class="item" data-action="download-quran"><span class="ic">📥</span>' +
            '<span class="lb">' + (Quran.ready() ? 'إعادة تنزيل المصحف' : 'تنزيل المصحف للاستخدام بدون إنترنت') + '</span>' +
            '<span class="rt">' + (Quran.ready() ? 'محمّل ✓' : 'مطلوب') + '</span></button>' +
          '<div class="item"><span class="ic">🔤</span><span class="lb">حجم خط الآيات (ورد اليوم وآيات الصفحة)</span>' +
            '<select data-action="set-font">' + [20, 22, 24, 26, 28, 32, 36, 40].map(function (n) {
              return '<option value="' + n + '"' + (st.quranFontSize === n ? ' selected' : '') + '>' + n + '</option>';
            }).join('') + '</select></div>' +
        '</div>' +
        '<div class="section-title">الحساب والمزامنة السحابية</div>' +
        '<div class="list">' + safeAccountBlock() + '</div>' +
        '<div class="section-title">البيانات</div>' +
        '<div class="list">' +
          '<button class="item" data-action="backup"><span class="ic">💾</span><span class="lb">نسخة احتياطية من إحصائياتي</span></button>' +
          '<button class="item" data-action="restore"><span class="ic">♻</span><span class="lb">استرجاع نسخة</span></button>' +
        '</div>' +
        '<div class="section-title">مشاركة</div>' +
        '<div class="list">' +
          '<button class="item" data-action="share-app"><span class="ic">📤</span><span class="lb">شارك تسنيم مع حد تحبه</span></button>' +
        '</div>' +
        '<div style="height:20px"></div>' +
      '</div>';
  }

  /* =========================================================
     المسبحة / الصلاة على النبي
     ========================================================= */
  var tapScreen = null;
  function openTap(kind) {
    tapScreen = kind;
    drawTap();
    showScreen('s-adhkar');
  }
  function drawTap() {
    var isSalawat = tapScreen === 'salawat';
    var name = isSalawat ? 'الصلاة على النبي ﷺ' : 'المسبحة';
    var s = Store.counterStats(isSalawat ? 'salawat' : 'tasbih');
    var phrase = isSalawat ? SALAWAT_FORMS[0] : Store.raw().tasbihPhrase;
    var opts = isSalawat ? SALAWAT_FORMS : ['سُبْحَانَ اللهِ وَبِحَمْدِهِ', 'سُبْحَانَ اللهِ الْعَظِيمِ',
      'الْحَمْدُ لِلَّهِ', 'اللهُ أَكْبَرُ', 'لَا إِلَٰهَ إِلَّا اللهُ', 'أَسْتَغْفِرُ اللهَ',
      'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ'];

    $('#s-adhkar').innerHTML =
      '<div class="topbar"><button class="iconbtn" data-action="back-adhkar">▶</button>' +
      '<div style="flex:1;text-align:center"><h1>' + name + '</h1>' +
      '<div class="sub">اليوم ' + s.today + ' • الإجمالي ' + s.total.toLocaleString('ar-EG') + '</div></div>' +
      '<button class="iconbtn" data-action="reset-tap">↻</button></div>' +
      '<div class="wrap">' +
        '<div class="tapcard">' +
          '<select data-action="set-phrase" class="phrase-select">' +
            opts.map(function (o) { return '<option' + (o === phrase ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' +
          '<div class="phrase" id="tap-phrase">' + esc(phrase) + '</div>' +
          '<button class="tap-circle" data-action="tap-count">' +
            '<span><span class="num" id="tap-num">' + s.today + '</span>' +
            '<div class="cap">اضغط للعدّ</div></span></button>' +
        '</div>' +
        '<div class="section-title">إحصائيات ' + name + '</div>' +
        '<div class="stats">' +
          statCard('اليوم', s.today) + statCard('هذا الأسبوع', s.week) +
          statCard('هذا الشهر', s.month) + statCard('منذ استخدام البرنامج', s.total.toLocaleString('ar-EG')) +
        '</div>' +
      '</div>';
  }

  /* =========================================================
     قارئ المصحف
     ========================================================= */
  var readerPage = 1;
  var readerWirdMode = false;
  var pageAudioEl = null;
  var pageAudioPlaying = false;
  var pageAudioQueue = [];
  var pageAudioIdx = 0;

  var pageRepeatLeft = 0, pageGapTimer = null, pageErrCount = 0;

  function stopPageAudio() {
    clearTimeout(pageGapTimer);
    if (pageAudioEl) { try { pageAudioEl.pause(); } catch (e) {} }
    pageAudioPlaying = false;
    try { if (nativeAvailable() && CAP.Tasneem.stopPlayback) CAP.Tasneem.stopPlayback().catch(function () {}); } catch (e) {}
    var btn = $('#page-play-btn');
    if (btn) btn.textContent = '▶';
    clearAyahHighlight();
    clearImageHighlight();
  }

  /* المصحف عبارة عن صور ثابتة؛ أثناء التلاوة نعرض الآية الحالية بوضوح أسفل الصفحة، ونحدّثها آيةً بآية مع انتقال الصفحة تلقائيًا. */
  function clearAyahHighlight() {
    var n = $('#r-now');
    if (n) { n.classList.remove('show'); n.innerHTML = ''; }
    var cur = document.querySelector('.pa-item.playing');
    if (cur) cur.classList.remove('playing');
  }

  function highlightAyah(a) {
    var n = $('#r-now');
    if (n) {
      n.innerHTML = '<small>سورة ' + esc(Quran.surahName(a.s)) + ' — آية ' + a.a + '</small>' + esc(stripBasmala(a.t));
      n.classList.add('show');
    }
    var prev = document.querySelector('.pa-item.playing');
    if (prev) prev.classList.remove('playing');
    var el = document.querySelector('.pa-item[data-s="' + a.s + '"][data-a="' + a.a + '"]');
    if (el) el.classList.add('playing');    drawImageHighlight(a);
  }

  /* تظليل أسطر الآية الحالية فوق صورة المصحف (تقريبي: بحسب نسبة الحروف داخل الصفحة، الأسطر الـ15) */
  function clearImageHighlight() {
    var o = document.getElementById('ayah-hl'); if (o && o.parentNode) o.parentNode.removeChild(o);
  }
  function drawImageHighlight(a) {
    clearImageHighlight();
    if (readerPage <= 2) return;
    var img = $('#r-page .mushaf-image'); if (!img) return;
    if (!img.complete || !img.naturalWidth) { img.addEventListener('load', function () { if (pageAudioPlaying) drawImageHighlight(a); }, { once: true }); return; }
    var list = Quran.page(readerPage) || [], tot = 0, before = 0, len = 0, found = false;
    list.forEach(function (x) {
      var l = stripBasmala(x.t).length + 3;
      if (x.s === a.s && x.a === a.a) { before = tot; len = l; found = true; }
      tot += l;
    });
    if (!found || !tot) return;
    var l0 = Math.floor(before / tot * 15), l1 = Math.min(14, Math.max(l0, Math.ceil((before + len) / tot * 15) - 1));
    var W = img.clientWidth, H = img.clientHeight, ir = img.naturalWidth / img.naturalHeight;
    var dw = W, dh = W / ir; if (dh > H) { dh = H; dw = H * ir; }
    var ox = (W - dw) / 2, oy = (H - dh) / 2;
    var y0 = .098, y1 = .912, x0 = .09, x1 = .91, lh = (y1 - y0) / 15;
    var o = document.createElement('div'); o.id = 'ayah-hl';
    o.style.cssText = 'position:absolute;left:' + (img.offsetLeft + ox) + 'px;top:' + (img.offsetTop + oy) + 'px;width:' + dw + 'px;height:' + dh + 'px;pointer-events:none;z-index:3';
    for (var L = l0; L <= l1; L++) {
      var r = document.createElement('div');
      r.style.cssText = 'position:absolute;left:' + (x0 * 100) + '%;width:' + ((x1 - x0) * 100) + '%;top:' + ((y0 + L * lh) * 100) + '%;height:' + (lh * 100) + '%;background:rgba(255,193,7,.28);border-radius:6px';
      o.appendChild(r);
    }
    img.parentElement.style.position = 'relative';
    img.parentElement.appendChild(o);
    // نمرّر لو الصفحة مكبّرة عشان السطر يبان
    try { var rp = $('#r-page'); if (readerZoom > 1) rp.scrollTop = Math.max(0, (oy + (y0 + l0 * lh) * dh) - rp.clientHeight / 3); } catch (e) {}
  }

  function startPageAudioAt(idx) {
    pageAudioPlaying = true;
    pageErrCount = 0;
    try { if (nativeAvailable() && CAP.Tasneem.startPlayback) CAP.Tasneem.startPlayback().catch(function () {}); } catch (e) {}
    var btn = $('#page-play-btn');
    if (btn) btn.textContent = '⏸';
    playPageQueueAt(idx);
  }

  function togglePageAudio() {
    if (pageAudioPlaying) { stopPageAudio(); return; }
    if (!Quran.ready()) return;
    pageAudioQueue = Quran.page(readerPage) || [];
    if (!pageAudioQueue.length) return;
    startPageAudioAt(0);
  }

  function playPageQueueAt(i, isRepeat) {
    if (!pageAudioPlaying) return;
    if (i >= pageAudioQueue.length) { advancePageAudio(); return; }
    var ap = audioPro();
    if (!isRepeat) pageRepeatLeft = ap.repeats - 1;
    pageAudioIdx = i;
    var a = pageAudioQueue[i];
    var st = Store.settings();
    highlightAyah(a);
    // نزّل صوت الصفحة الحالية والصفحة التالية في الخلفية؛ بعد أول تشغيل تصبح التلاوة قابلة للعمل بدون نت.
    try {
      var ahead = pageAudioQueue.slice(i + 1).concat(Quran.page(readerPage + 1) || []);
      Quran.prefetchAyahs(ahead.slice(0, 14), st.reciter || 'yasser');
    } catch (e) {}
    if (!pageAudioEl) pageAudioEl = new Audio();
    var el = pageAudioEl;
    Quran.getPlayableAudioUrl(a.s, a.a, st.reciter || 'yasser').then(function (url) {
      if (!pageAudioPlaying || pageAudioIdx !== i) return;
      el.src = url;
      el.defaultPlaybackRate = ap.speed; el.playbackRate = ap.speed;
      el.onended = function () { pageErrCount = 0; onPageAyahEnded(i); };
      el.onerror = function () {
        if (!pageAudioPlaying) return;
        if (++pageErrCount >= 3) { stopPageAudio(); toast('تعذّر تشغيل الصوت — تأكد من الإنترنت'); return; }
        onPageAyahEnded(i);
      };
      return el.play();
    }).catch(function (e) { stopPageAudio(); audioFail(e); });
  }

  function onPageAyahEnded(i) {
    if (!pageAudioPlaying) return;
    var gap = audioPro().gap;
    function next() {
      if (!pageAudioPlaying) return;
      if (pageRepeatLeft > 0) { pageRepeatLeft--; playPageQueueAt(i, true); }
      else playPageQueueAt(i + 1);
    }
    if (gap > 0) pageGapTimer = setTimeout(next, gap * 1000); else next();
  }

  /* لما تخلص آيات الصفحة الحالية — ننتقل تلقائيًا للصفحة اللي بعدها ونكمّل
     القراءة، لحد ما يوقفها المستخدم أو نوصل آخر الورد (في وضع الورد) أو آخر المصحف. */
  function advancePageAudio() {
    if (!pageAudioPlaying) return;
    if (readerWirdMode) {
      var b = wirdBounds();
      if (readerPage >= b.end) { stopPageAudio(); toast('خلصت ورد اليوم — دوس "أتممت القراءة" لتسجيله'); return; }
    }
    if (readerPage >= 604) { stopPageAudio(); toast('ختمت قراءة المصحف كاملًا، تقبّل الله منك 🌙'); return; }
    readerPage++;
    drawReader();
    pageAudioQueue = Quran.page(readerPage) || [];
    try { Quran.prefetchAyahs(pageAudioQueue.concat(Quran.page(readerPage + 1) || []).slice(0, 20), Store.settings().reciter || 'yasser'); } catch (e) {}
    if (!pageAudioQueue.length) { stopPageAudio(); return; }
    playPageQueueAt(0);
  }

  /* ---------- نافذة آيات الصفحة: مفضلة + ملاحظة + تفسير + تشغيل لكل آية ---------- */
  function paItem(a) {
    var fav = Store.isFavorite(a.s, a.a), hasNote = !!Store.note(a.s, a.a);
    var d = ' data-s="' + a.s + '" data-a="' + a.a + '"';
    return '<div class="pa-item"' + d + '>' +
      '<div class="pa-ref">سورة ' + esc(Quran.surahName(a.s)) + ' — آية ' + a.a + '</div>' +
      '<div class="pa-txt">' + esc(a.t) + '</div>' +
      '<div class="pa-acts">' +
        '<button data-action="pa-play"' + d + '>▶ استماع</button>' +
        '<button class="' + (fav ? 'on' : '') + '" data-action="pa-fav"' + d + '>' + (fav ? '❤️' : '🤍') + '</button>' +
        '<button class="' + (hasNote ? 'on' : '') + '" data-action="pa-note"' + d + '>📝</button>' +
        '<button data-action="pa-tafsir"' + d + '>📖 تفسير</button>' +
      '</div>' +
      '<div class="pa-box" id="pa-box-' + a.s + '-' + a.a + '"></div>' +
    '</div>';
  }
  function openPageAyahs() {
    if (!Quran.ready()) { toast('نزّل المصحف الأول من المزيد'); return; }
    var ayahs = Quran.page(readerPage);
    if (!ayahs.length) { toast('لا توجد آيات لهذه الصفحة'); return; }
    sheet('<div class="pa-head"><h3>آيات صفحة ' + readerPage + '</h3>' +
      '<button class="iconbtn" style="color:var(--ink)" data-action="close-sheet">✕</button></div>' +
      ayahs.map(paItem).join(''));
  }
  function paBox(t) { return document.getElementById('pa-box-' + t.dataset.s + '-' + t.dataset.a); }
  function paNoteSheet(t) {
    var box = paBox(t); if (!box) return;
    if (box.querySelector('textarea')) { box.innerHTML = ''; return; }
    box.innerHTML = '<textarea placeholder="اكتب ملاحظتك على الآية">' + esc(Store.note(+t.dataset.s, +t.dataset.a)) + '</textarea>' +
      '<button class="save" data-action="pa-note-save" data-s="' + t.dataset.s + '" data-a="' + t.dataset.a + '">حفظ الملاحظة</button>';
  }
  function paTafsir(t) {
    var box = paBox(t); if (!box) return;
    if (box.dataset.kind === 'tafsir') { box.innerHTML = ''; box.dataset.kind = ''; return; }
    box.dataset.kind = 'tafsir';
    box.textContent = 'جارٍ التحميل…';
    Quran.fetchTafsir(+t.dataset.s, +t.dataset.a).then(function (text) {
      if (box.dataset.kind !== 'tafsir') return;
      box.innerHTML = text ? '<b>التفسير الميسّر:</b> ' + esc(text) : 'تعذّر إحضار التفسير الآن — تأكد من الإنترنت.';
    });
  }

  function openReader(p, wirdMode) {
    if (!Quran.ready()) { toast('نزّل المصحف الأول من المزيد'); return; }
    readerPage = Math.min(604, Math.max(1, p));
    readerWirdMode = !!wirdMode;
    readerZoom = Store.settings().readerZoom || 1;
    $('#reader').classList.add('open');
    document.body.classList.add('reader-open');
    $('#reader').classList.toggle('immersive', Store.settings().readerFullscreen !== false);
    if (!Store.settings().readerHint) { Store.setSetting('readerHint', true); toast('اضغط على الصفحة لإظهار الأزرار، واسحب لتغيير الصفحة'); }
    drawReader();
  }
  function closeReader() { $('#reader').classList.remove('open'); document.body.classList.remove('reader-open'); readerWirdMode = false; stopPageAudio(); }

  function deHarakat(t) {
    return t.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/\u0671/g, '\u0627');
  }
  function stripBasmala(text) {
    var toks = text.trim().split(/\s+/);
    if (toks.length < 5) return text;
    var bare = toks.slice(0, 4).map(deHarakat).join(' ');
    if (bare === '\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0631\u062d\u064a\u0645') {
      return toks.slice(4).join(' ');
    }
    return text;
  }

  /* صور المصحف: mushaf/pages/page-NNN.jpg — رقم الملف = رقم صفحة المصحف (1..604) */
  function mushafImageUrl(page) {
    return 'mushaf/pages/page-' + String(page).padStart(3, '0') + '.jpg';
  }

  function drawReader() {
    var ayahs = Quran.page(readerPage);
    var first = ayahs[0];
    var src = mushafImageUrl(readerPage);
    $('#r-page').innerHTML =
      '<div class="mushaf-image-wrap">' +
        '<img class="mushaf-image" src="' + src + '" alt="صفحة ' + readerPage + ' من المصحف" draggable="false">' +
      '</div>';
    var imgEl = $('#r-page .mushaf-image');
    if (imgEl) imgEl.onerror = function () {
      var w = this.parentElement;
      if (w) w.innerHTML = '<div class="empty">تعذّر تحميل صفحة المصحف. أعد تثبيت التطبيق أو جرّب مرة أخرى.</div>';
    };
    clearImageHighlight();
    applyReaderZoom(true);
    var chg = Store.raw().challenge;
    if (chg && chg.pages && chg.pages.indexOf(readerPage) < 0) { chg.pages.push(readerPage); Store.save(); }
    $('#r-title').textContent = first ? 'سورة ' + Quran.surahName(first.s) : 'المصحف الشريف';
    $('#r-sub').textContent = 'صفحة ' + readerPage + '، جزء ' + Quran.juzOfPage(readerPage);
    if (readerWirdMode) {
      var bw = wirdBounds();
      $('#r-num').textContent = 'ورد اليوم: صفحة ' + (readerPage - bw.start + 1) + ' من ' + (bw.end - bw.start + 1);
    } else {
      $('#r-num').textContent = 'صفحة ' + readerPage + ' من 604';
    }
    if (readerWirdMode) {
      var k = Store.khatma();
      var wEnd = Math.min(604, k.currentPage + k.pagesPerDay - 1);
      if (readerPage >= k.currentPage && readerPage <= wEnd) Store.setWirdLastReadPage(readerPage);
    }
    $('#r-page').scrollTop = 0;
    var bm = Store.bookmarks().some(function (b) { return b.page === readerPage; });
    var bmBtn = $('[data-action="reader-bookmark"]');
    if (bmBtn) bmBtn.style.opacity = bm ? 1 : .45;
  }

  /* يطبّق حجم الخط اللي اختاره المستخدم مباشرة على صفحة المصحف — الصفحة بتتمرّر
     عاديًا لو النص أطول من الشاشة، بدل ما نصغّر الخط قسريًا. */
  function applyReaderFont() {
    // المصحف صور جاهزة، لذلك لا نغيّر الخط.
  }


  var readerZoom = 1;
  function cycleReaderZoom() {
    var levels = [1, 1.15, 1.3, 1.5, 1.75];
    var i = levels.indexOf(readerZoom);
    readerZoom = levels[(i + 1) % levels.length];
    applyReaderZoom(true);
    toast('تكبير المصحف: ' + Math.round(readerZoom * 100) + '%');
  }

  /* الغلاف والصورة بيكبروا مع بعض (عرض وارتفاع)، والصفحة تتحرك بالسحب لما التكبير > 100% */
  function applyReaderZoom(recenter) {
    var zw = $('#r-page .mushaf-image-wrap');
    if (!zw) return;
    var z = (readerZoom * 100) + '%';
    zw.style.width = z; zw.style.height = z;
    if (recenter) {
      var rp = $('#r-page'), half = (rp.scrollWidth - rp.clientWidth) / 2;
      rp.scrollLeft = getComputedStyle(rp).direction === 'rtl' ? -half : half;
      rp.scrollTop = 0;
    }
  }
  /* السحب لتغيير الصفحة — على صورة المصحف فقط، ويتجاهل التكبير والقرص والسحب الرأسي */
  function bindReaderSwipe() {
    var rp = $('#r-page'), sx = 0, sy = 0, t0 = 0;
    rp.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = Date.now();
    }, { passive: true });
    rp.addEventListener('touchend', function (e) {
      if (readerZoom !== 1 || !e.changedTouches.length) return;
      if (window.visualViewport && window.visualViewport.scale > 1.02) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      // مصحف عربي: السحب لليمين = الصفحة التالية، ولليسار = السابقة
      if (Date.now() - t0 < 700 && Math.abs(dx) > 70 && Math.abs(dy) < 60) { if (dx > 0) nextPage(); else prevPage(); }
    }, { passive: true });
  }
  function toggleReaderBars() { $('#reader').classList.toggle('immersive'); }

  function wirdBounds() {
    var k = Store.khatma();
    return { start: k.currentPage, end: Math.min(604, k.currentPage + k.pagesPerDay - 1) };
  }
  function nextPage() {
    stopPageAudio();
    if (readerWirdMode) {
      var b = wirdBounds();
      if (readerPage >= b.end) { toast('خلصت ورد اليوم — دوس "أتممت القراءة" لتسجيله'); return; }
      readerPage++; drawReader(); return;
    }
    if (readerPage < 604) { readerPage++; drawReader(); }
  }
  function prevPage() {
    stopPageAudio();
    if (readerWirdMode) {
      var b2 = wirdBounds();
      if (readerPage <= b2.start) { toast('دي أول صفحة في ورد اليوم'); return; }
      readerPage--; drawReader(); return;
    }
    if (readerPage > 1) { readerPage--; drawReader(); }
  }

  /* =========================================================
     الموقع
     ========================================================= */
  function locate() {
    toast('جارٍ تحديد الموقع…');
    var done = function (lat, lng) {
      Store.setSetting('lat', lat); Store.setSetting('lng', lng);
      var near = CITIES.map(function (c) {
        return { c: c, d: Math.abs(c[1] - lat) + Math.abs(c[2] - lng) };
      }).sort(function (a, b) { return a.d - b.d; })[0];
      if (near && near.d < 3) { Store.setSetting('city', near.c[0]); Store.setSetting('method', near.c[3]); }
      else Store.setSetting('city', 'موقعي');
      renderPrayer(); scheduleAll(); toast('تم تحديد الموقع');
    };
    if (CAP && CAP.Geolocation) {
      CAP.Geolocation.getCurrentPosition().then(function (p) { done(p.coords.latitude, p.coords.longitude); })
        .catch(function () { pickCity(); });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (p) { done(p.coords.latitude, p.coords.longitude); },
        function () { pickCity(); }, { timeout: 8000 });
    } else pickCity();
  }

  function pickCity() {
    sheet('<h3 style="margin:0 0 14px">اختر مدينتك</h3><div class="list">' +
      CITIES.map(function (c, i) {
        return '<button class="item" data-action="set-city" data-i="' + i + '"><span class="lb">' + c[0] + '</span></button>';
      }).join('') + '</div>');
  }

  /* =========================================================
     الإشعارات: الأذان + الذكر الدوري
     ========================================================= */
  function ensurePermission() {
    if (CAP && CAP.LocalNotifications) {
      return CAP.LocalNotifications.requestPermissions().then(function (r) { return r.display === 'granted'; });
    }
    if (window.Notification) {
      if (Notification.permission === 'granted') return Promise.resolve(true);
      return Notification.requestPermission().then(function (p) { return p === 'granted'; });
    }
    return Promise.resolve(false);
  }

  function scheduleAll() {
    var st = Store.settings();
    syncNative();
    scheduleAdhanNative();
    if (!CAP || !CAP.LocalNotifications) return;   // على الويب بنستخدم مؤقتات داخلية
    ensurePermission().then(function (ok) {
      if (!ok) return;
      CAP.LocalNotifications.cancel({ notifications: idsRange(1000, 1320) }).catch(function () {});
      var list = [], id = 1000;
      /* الأذان على أندرويد يُدار بالكامل من Tasneem native حتى يكون زر الإيقاف
         مرتبطًا بخدمة الصوت نفسها. على الويب فقط نستخدم LocalNotifications. */
      if (!nativeAvailable() && st.adhanEnabled && st.lat !== null) {
        for (var d = 0; d < 7; d++) {
          var date = new Date(); date.setDate(date.getDate() + d);
          var t = computeTimes(date);
          if (!t) continue;
          PRAYERS.forEach(function (p) {
            if (p.noAdhan || !t[p.k] || t[p.k] <= new Date()) return;
            list.push({ id: id++, title: 'حان الآن موعد أذان ' + p.n,
              body: 'الله أكبر الله أكبر — ' + p.n + ' • ' + fmt(t[p.k]),
              schedule: { at: t[p.k], allowWhileIdle: true }, sound: 'adhan.mp3',
              smallIcon: 'ic_stat_mosque', channelId: 'adhan', actionTypeId: 'ADHAN_ACTIONS',
              autoCancel: true, extra: { kind: 'adhan' } });
          });
        }
      }
      if (st.periodicDhikr) {
        list.push({
          id: 1200, title: 'ذكر',
          body: QUICK_DHIKR[Math.floor(Math.random() * QUICK_DHIKR.length)],
          schedule: { every: minutesToEvery(st.periodicEveryMin), count: 999, allowWhileIdle: true },
          channelId: 'dhikr', actionTypeId: 'DHIKR_ACTIONS', extra: { kind: 'periodic' }
        });
      }
      if (st.lat !== null) {
        var t0 = computeTimes(new Date());
        if (t0 && t0.fajr) {
          list.push({
            id: 1300, title: 'أذكار الصباح',
            body: 'ابدأ يومك بذكر الله — اضغط تمّت القراءة بعد ما تخلّص',
            schedule: { on: { hour: t0.fajr.getHours(), minute: (t0.fajr.getMinutes() + 25) % 60 }, allowWhileIdle: true },
            channelId: 'dhikr', actionTypeId: 'DHIKR_ACTIONS', extra: { kind: 'morning' }
          });
        }
        if (t0 && t0.asr) {
          list.push({
            id: 1301, title: 'أذكار المساء',
            body: 'حصّن نفسك بأذكار المساء — اضغط تمّت القراءة بعد ما تخلّص',
            schedule: { on: { hour: t0.asr.getHours(), minute: (t0.asr.getMinutes() + 20) % 60 }, allowWhileIdle: true },
            channelId: 'dhikr', actionTypeId: 'DHIKR_ACTIONS', extra: { kind: 'evening' }
          });
        }
        if (t0 && t0.isha) {
          list.push({
            id: 1302, title: 'سورة الملك',
            body: 'قبل النوم — اقرأ سورة الملك، فإنها تشفع لصاحبها',
            schedule: { on: { hour: t0.isha.getHours(), minute: (t0.isha.getMinutes() + 20) % 60 }, allowWhileIdle: true },
            channelId: 'dhikr', extra: { kind: 'surah', surah: 67 }
          });
        }
      }
      if (st.wirdReminder) {
        list.push({
          id: 1303, title: 'ورد اليوم',
          body: 'ورد اليوم من القرآن لسه ما اتقراش — اضغط تمّت القراءة لما تخلّص',
          schedule: { on: { hour: wirdHM()[0], minute: wirdHM()[1] }, allowWhileIdle: true },
          channelId: 'dhikr', actionTypeId: 'DHIKR_ACTIONS', extra: { kind: 'wird' }
        });
      }
      list.push({
        id: 1304, title: 'سورة الكهف',
        body: 'يوم الجمعة — لا تنسَ قراءة سورة الكهف',
        schedule: { on: { weekday: 6, hour: 8, minute: 0 }, allowWhileIdle: true },
        channelId: 'dhikr', extra: { kind: 'surah', surah: 18 }
      });
      var ks = Store.khatmaStats();
      if (st.wirdReminder && ks.behindBy > 0) {
        list.push({
          id: 1305, title: 'تأخرت عن ختمتك',
          body: 'أنت متأخر بـ ' + ks.behindBy + ' ' + (ks.behindBy === 1 ? 'ورد' : 'أوراد') + ' — عوّض بأسرع وقت',
          schedule: { at: new Date(Date.now() + 5 * 60000), allowWhileIdle: true },
          channelId: 'dhikr', extra: { kind: 'behind' }
        });
      }
      if (list.length) CAP.LocalNotifications.schedule({ notifications: list }).catch(function (e) { console.warn(e); });
    });
  }

  /* المستخدم دوس "تمّت القراءة ✓" من الإشعار نفسه — بدون ما يفتح التطبيق */
  /* إيقاف الأذان: حذف الإشعار بيوقف صوته، وكمان بنوقف أي صوت شغّال داخل التطبيق */
  function stopAdhanNow(notifId) {
    try {
      if (CAP && CAP.LocalNotifications) {
        var ids = notifId != null ? [{ id: notifId }] : [];
        if (ids.length) {
          CAP.LocalNotifications.cancel({ notifications: ids }).catch(function () {});
          if (CAP.LocalNotifications.removeDeliveredNotifications) {
            CAP.LocalNotifications.removeDeliveredNotifications({ notifications: ids }).catch(function () {});
          }
        } else if (CAP.LocalNotifications.removeAllDeliveredNotifications) {
          CAP.LocalNotifications.removeAllDeliveredNotifications().catch(function () {});
        }
      }
    } catch (e) {}
    if (nativeAvailable() && CAP.Tasneem.stopAdhan) CAP.Tasneem.stopAdhan().catch(function () {});
  }

  function onNotificationAction(ev) {
    if (ev.actionId === 'stopAdhan') { stopAdhanNow(ev.notification && ev.notification.id); toast('تم إيقاف الأذان'); return; }
    if (ev.actionId !== 'markRead') return;
    var kind = ev.notification && ev.notification.extra && ev.notification.extra.kind;
    if (kind === 'morning' || kind === 'evening') {
      Store.markAdhkarDone(kind);
      toast('تقبّل الله — تم تسجيل ' + (kind === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'));
    } else if (kind === 'periodic') {
      Store.bump('tasbih', 1);
      toast('تقبّل الله ✓');
    } else if (kind === 'salawat') {
      Store.bump('salawat', 1);
      toast('اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ');
    } else if (kind === 'wird') {
      var r = Store.completeWird();
      toast(r.finished ? 'تقبّل الله — ختمت القرآن! ختمة رقم ' + r.completed : 'تقبّل الله — تم تسجيل ورد اليوم');
    }
    if (activeTab === 'wird') renderWird();
    if (activeTab === 'more') renderMore();
  }
  function minutesToEvery(m) {
    if (m >= 60 && m % 60 === 0) return 'hour';
    return 'minute';
  }
  function idsRange(a, b) { var r = []; for (var i = a; i <= b; i++) r.push({ id: i }); return r; }

  /* ---------------- الجسر مع خدمات أندرويد ---------------- */
  function nativeAvailable() { return !!(CAP && CAP.Tasneem); }

  function syncNative() {
    if (!nativeAvailable()) return;
    var st = Store.settings();
    CAP.Tasneem.setConfig({
      unlockEnabled: st.unlockDhikrEnabled,
      soundEnabled: st.unlockSalawatSound,
      periodicEnabled: st.periodicDhikr,
      periodicMin: st.periodicEveryMin,
      adhanEnabled: st.adhanEnabled,
      cooldownMin: st.unlockCooldownMin,
      reciter: st.reciter || 'yasser'
    }).catch(function () {});
  }

  /* يحدّث ودجت "آية اليوم" فورًا (مثلاً بعد أول تحميل للمصحف) */
  function refreshWidgetNative() {
    if (!nativeAvailable() || !CAP.Tasneem.refreshWidget) return;
    CAP.Tasneem.refreshWidget().catch(function () {});
  }

  function scheduleAdhanNative() {
    if (!nativeAvailable()) return;
    var st = Store.settings();
    if (!st.adhanEnabled || st.lat === null) { CAP.Tasneem.scheduleAdhan({ times: [] }).catch(function(){}); return; }
    var list = [];
    for (var d = 0; d < 7 && list.length < 35; d++) {
      var date = new Date(); date.setDate(date.getDate() + d);
      var t = computeTimes(date);
      if (!t) continue;
      PRAYERS.forEach(function (p) {
        if (p.noAdhan || !t[p.k] || t[p.k] <= new Date()) return;
        list.push({ name: p.n, at: t[p.k].getTime() });
      });
    }
    CAP.Tasneem.scheduleAdhan({ times: list }).catch(function () {});
  }

  /* يسحب عدد مرات الصلاة على النبي اللي اتسجّلت في الخلفية ويضيفها للإحصائيات */
  function pullNativeCounts() {
    if (!nativeAvailable()) return;
    CAP.Tasneem.pullCounts().then(function (r) {
      if (r && r.salawat > 0) {
        Store.bump('salawat', r.salawat);
        if (activeTab === 'wird') renderWird();
      }
      if (r && r.gateRead > 0) {
        for (var i = 0; i < r.gateRead; i++) Store.markGateRead(0);
        if (r.gateChars > 0) Store.bump('quranChars', r.gateChars);
        if (activeTab === 'wird') renderWird();
      }
    }).catch(function () {});
  }

  /* الصلاة على النبي عند العودة للتطبيق (بديل الويب لفتح الهاتف) */
  var lastUnlock = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    pullNativeCounts();
    showAyahGate();
    var st = Store.settings();
    if (nativeAvailable()) return;   // على أندرويد الخدمة الأصلية هي اللي بتتولى دي
    if (!st.unlockDhikrEnabled) return;
    var now = Date.now();
    if (now - lastUnlock < st.unlockCooldownMin * 60000) return;
    lastUnlock = now;
    Store.bump('salawat', 1);
    if (st.unlockSalawatSound) playSalawat();
    toast('اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ');
    if (activeTab === 'wird') renderWird();
  });

  var salawatAudio = null;
  function playSalawat() {
    try {
      if (!salawatAudio) { salawatAudio = new Audio('assets/audio/salawat.mp3'); salawatAudio.preload = 'auto'; }
      salawatAudio.currentTime = 0;
      salawatAudio.play().catch(function () {});
    } catch (e) {}
  }

  /* =========================================================
     التنقّل والأحداث
     ========================================================= */
  function showScreen(id) {
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === id); });
    window.scrollTo(0, 0);
  }

  function go(tab) {
    activeTab = tab;
    catState = null; tapScreen = null;
    $$('.tabbar button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    if (tab === 'wird') { renderWird(); showScreen('s-wird'); }
    if (tab === 'adhkar') { renderAdhkar(); showScreen('s-adhkar'); }
    if (tab === 'prayer') { renderPrayer(); showScreen('s-prayer'); }
    if (tab === 'index') { renderIndex(); showScreen('s-index'); }
    if (tab === 'more') { renderMore(); showScreen('s-more'); }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#r-page') && !e.target.closest('[data-action]')) { toggleReaderBars(); return; }
    var tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { go(tabBtn.dataset.tab); return; }

    var t = e.target.closest('[data-action]');
    if (!t) { if (e.target.id === 'sheet') closeSheet(); return; }
    var a = t.dataset.action;

    switch (a) {
      case 'read-wird': {
        var kw = Store.khatma();
        var wEnd2 = Math.min(604, kw.currentPage + kw.pagesPerDay - 1);
        var resume = (kw.lastReadPage >= kw.currentPage && kw.lastReadPage <= wEnd2) ? kw.lastReadPage : kw.currentPage;
        openReader(resume, true);
        break;
      }
      case 'finish-wird': {
        var r = Store.completeWird();
        toast(r.finished ? '🎉 تمّت الختمة! تقبّل الله. ختماتك: ' + r.completed : 'تم تسجيل الورد — بارك الله فيك');
        renderWird(); break;
      }
      case 'download-quran': doDownload(); break;
      case 'download-reciter': doDownloadReciter(); break;
      case 'open-cat': openCategory(t.dataset.cat); break;
      case 'back-adhkar': stopAyahAudio(); go('adhkar'); break;
      case 'tap-dhikr': tapDhikr(); break;
      case 'dhikr-go': dhikrGo(); break;
      case 'reset-dhikr':
        catState.count[catState.index] = 0;
        catState.done[catState.index] = (catState.cat.items[catState.index].count || 1) <= 1 ? false : catState.done[catState.index];
        drawCategory(); break;
      case 'reopen-cat': openCategory(catState.cat.id); break;
      case 'share-dhikr': {
        var it2 = catState.cat.items[catState.index];
        var text = it2.text + (it2.source ? '\n(' + it2.source + ')' : '') + '\n\n— من تطبيق تسنيم';
        if (navigator.share) navigator.share({ text: text }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('تم نسخ الذكر'); }).catch(function () {});
        break;
      }
      case 'play-ayah': playAyahAudio(+t.dataset.s, +t.dataset.a); break;
      case 'ayah-next': {
        var pa = wirdPageAyahs(Store.khatma().currentPage);
        if (pa.length) {
          Store.setWirdAyahIdx((Store.wirdAyahIdx() + 1) % pa.length);
          wirdTafsirOpen = false; stopAyahAudio(); renderWird();
        }
        break;
      }
      case 'ayah-prev': {
        var pa2 = wirdPageAyahs(Store.khatma().currentPage);
        if (pa2.length) {
          Store.setWirdAyahIdx((Store.wirdAyahIdx() - 1 + pa2.length) % pa2.length);
          wirdTafsirOpen = false; stopAyahAudio(); renderWird();
        }
        break;
      }
      case 'toggle-tafsir': wirdTafsirOpen = !wirdTafsirOpen; renderWird(); break;
      case 'set-reciter': Store.setSetting('reciter', t.dataset.r); stopAyahAudio(); syncNative(); refreshWidgetNative(); renderWird(); break;
      case 'open-salawat': openTap('salawat'); break;
      case 'pin-widget': {
        if (!nativeAvailable() || !CAP.Tasneem.requestPinWidget) { toast('الميزة دي متاحة بس في نسخة الأندرويد'); break; }
        CAP.Tasneem.requestPinWidget().then(function (r) {
          if (r && r.supported === false) toast('الودجت غير متاح في هذه النسخة');
        }).catch(function () {});
        break;
      }
      case 'share-app': {
        if (nativeAvailable() && CAP.Tasneem.shareApk) {
          CAP.Tasneem.shareApk().catch(function () { toast('تعذّرت المشاركة'); });
          break;
        }
        var msg = 'تسنيم — تطبيق المصحف والأذكار ومواقيت الصلاة، مجاني وبيشتغل بدون إنترنت. جرّبه 🌙';
        if (navigator.share) navigator.share({ title: 'تسنيم', text: msg }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(msg).then(function () { toast('تم نسخ رسالة المشاركة'); });
        break;
      }
      case 'gate-play': playGateAudio(); break;
      case 'gate-toggle-tafsir': gateTafsirOpen = !gateTafsirOpen; {
        var g = Store.gateState(); var a = gateAyahAt(gateCurrentIndex(g));
        if (a) renderAyahGate(a);
        break;
      }
      case 'gate-done': markGateDone(); break;
      case 'gate-close': closeAyahGate(); break;
      case 'open-tasbih': openTap('tasbih'); break;
      case 'tap-count': {
        var key = tapScreen === 'salawat' ? 'salawat' : 'tasbih';
        Store.bump(key, 1); vibrate(8);
        var s = Store.counterStats(key);
        $('#tap-num').textContent = s.today;
        if (s.today % 33 === 0) vibrate([20, 40, 20]);
        break;
      }
      case 'reset-tap': drawTap(); break;
      case 'toggle-prayer': Store.togglePrayer(t.dataset.p); renderPrayer(); break;
      case 'locate': locate(); break;
      case 'pick-city': pickCity(); break;
      case 'set-city': {
        var c = CITIES[+t.dataset.i];
        Store.setSetting('lat', c[1]); Store.setSetting('lng', c[2]);
        Store.setSetting('city', c[0]); Store.setSetting('method', c[3]);
        closeSheet(); renderPrayer(); scheduleAll(); break;
      }
      case 'toggle-setting': {
        var k = t.dataset.key;
        var val = !Store.settings()[k];
        Store.setSetting(k, val);
        t.classList.toggle('on', val);
        scheduleAll();
        if (k === 'adhanEnabled' && val) ensurePermission();
        break;
      }
      case 'index-tab': indexTab = t.dataset.t; renderIndex(); break;
      case 'open-page': openReader(+t.dataset.page); break;
      case 'goto-page': gotoPageSheet(); break;
      case 'do-goto': {
        var v = +$('#gp').value;
        if (v > 0 && v < 605) { closeSheet(); openReader(v); } else toast('اكتب رقم من 1 لـ 604');
        break;
      }
      case 'reader-close': closeReader(); if (activeTab === 'wird') renderWird(); break;
      case 'reader-font': cycleReaderZoom(); break;
      case 'page-ayahs': openPageAyahs(); break;
      case 'close-sheet': closeSheet(); break;
      case 'pa-play': {
        var pq = Quran.page(readerPage) || [], pi = 0;
        for (var qi = 0; qi < pq.length; qi++) if (pq[qi].s === +t.dataset.s && pq[qi].a === +t.dataset.a) { pi = qi; break; }
        stopPageAudio();
        pageAudioQueue = pq;
        startPageAudioAt(pi);
        break;
      }
      case 'pa-fav': {
        var fs_ = +t.dataset.s, fa_ = +t.dataset.a;
        var on_ = Store.toggleFavorite(fs_, fa_, 'سورة ' + Quran.surahName(fs_) + ' — آية ' + fa_);
        t.textContent = on_ ? '❤️' : '🤍'; t.classList.toggle('on', on_);
        toast(on_ ? 'أُضيفت للمفضلة' : 'حُذفت من المفضلة');
        break;
      }
      case 'pa-note': paNoteSheet(t); break;
      case 'pa-note-save': {
        var nbox = paBox(t), ta = nbox && nbox.querySelector('textarea');
        if (!ta) break;
        Store.setNote(+t.dataset.s, +t.dataset.a, ta.value);
        nbox.innerHTML = '';
        var nb = document.querySelector('[data-action="pa-note"][data-s="' + t.dataset.s + '"][data-a="' + t.dataset.a + '"]');
        if (nb) nb.classList.toggle('on', !!ta.value.trim());
        toast('تم حفظ الملاحظة');
        break;
      }
      case 'pa-tafsir': paTafsir(t); break;
      case 'toggle-page-audio': togglePageAudio(); break;
      case 'page-next': nextPage(); break;
      case 'page-prev': prevPage(); break;
      case 'reader-bookmark': {
        var added = Store.toggleBookmark(readerPage, 'صفحة ' + readerPage);
        toast(added ? 'تمت إضافة العلامة' : 'تم حذف العلامة');
        drawReader(); break;
      }
      case 'new-khatma': openKhatmaSetup(); break;
      case 'khatma-mode': {
        khatmaSetupMode = t.dataset.m;
        openKhatmaSetup(true);
        break;
      }
      case 'confirm-khatma': {
        var startSel = $('#khatma-start').value;
        var startPage = startSel === 'start' ? 1 : JUZ_PAGES[+startSel - 1];
        var totalPages = 604 - startPage + 1;
        var perDay;
        if (khatmaSetupMode === 'days') {
          var daysEl = $('#khatma-days');
          var days = Math.max(1, +(daysEl ? daysEl.value : 30) || 30);
          perDay = Math.max(1, Math.ceil(totalPages / days));
        } else {
          var perdayEl = $('#khatma-perday');
          var juzVal = +(perdayEl ? perdayEl.value : 1) || 1;
          perDay = Math.max(1, Math.round(juzVal * (604 / 30)));
        }
        Store.setSetting('wirdPagesPerDay', perDay);
        Store.startKhatma(perDay, startPage);
        closeSheet();
        toast('بدأت ختمة جديدة — تقبّل الله منك');
        go('wird');
        break;
      }
      case 'open-bookmarks': {
        var bs = Store.bookmarks();
        sheet('<h3 style="margin:0 0 14px">العلامات المرجعية</h3>' + (bs.length ?
          '<div class="list">' + bs.map(function (b) {
            return '<button class="item" data-action="open-page" data-page="' + b.page + '">' +
              '<span class="ic">🔖</span><span class="lb">' + b.label + '</span></button>'; }).join('') + '</div>'
          : '<div class="empty">لا توجد علامات بعد</div>'));
        break;
      }
      case 'open-settings': go('more'); break;
      case 'prayer-settings': go('more'); break;
      case 'open-stats': go('more'); break;
      case 'open-account': openAccountSheet(); break;
      case 'do-signin': {
        var ci = accCreds();
        if (!ci.email || !ci.pass) { accMsg('اكتب الإيميل وكلمة السر'); break; }
        accMsg('جارٍ الدخول…', true);
        CloudSync.signIn(ci.email, ci.pass).then(function () {
          toast('تم تسجيل الدخول'); closeSheet(); renderMore();
        }).catch(function (err) { accMsg(err.message || 'حصل خطأ'); });
        break;
      }
      case 'do-signup': {
        var cu = accCreds();
        if (!cu.email || !cu.pass) { accMsg('اكتب الإيميل وكلمة السر'); break; }
        if (cu.pass.length < 6) { accMsg('كلمة السر لازم تكون 6 حروف على الأقل'); break; }
        accMsg('جارٍ إنشاء الحساب…', true);
        CloudSync.signUp(cu.email, cu.pass).then(function () {
          toast('تم إنشاء الحساب وحفظ بياناتك'); closeSheet(); renderMore();
        }).catch(function (err) { accMsg(err.message || 'حصل خطأ'); });
        break;
      }
      case 'do-forgot': {
        var cf = accCreds();
        if (!cf.email) { accMsg('اكتب الإيميل الأول'); break; }
        CloudSync.resetPassword(cf.email).then(function () {
          accMsg('اتبعتلك رسالة على إيميلك لتغيير كلمة السر', true);
        }).catch(function (err) { accMsg(err.message || 'حصل خطأ'); });
        break;
      }
      case 'do-signout':
        CloudSync.signOut().then(function () { toast('تم تسجيل الخروج'); renderMore(); });
        break;
      case 'sync-now':
        toast('بيتزامن…');
        CloudSync.pushNow().then(function () { toast('تم التزامن ✓'); renderMore(); });
        break;
      case 'backup': {
        var data = Store.exportAll();
        sheet('<h3>نسخة احتياطية</h3><p style="font-size:13px;color:#6B7F76">انسخ النص ده واحتفظ بيه:</p>' +
          '<textarea style="width:100%;height:150px;font-size:11px" readonly>' + esc(data) + '</textarea>');
        break;
      }
      case 'restore':
        sheet('<h3>استرجاع نسخة</h3><textarea id="restore-box" style="width:100%;height:150px;font-size:11px"></textarea>' +
          '<button class="btn btn-primary" style="width:100%;margin-top:12px" data-action="do-restore">استرجاع</button>');
        break;
      case 'do-restore':
        if (Store.importAll($('#restore-box').value)) { toast('تم الاسترجاع'); closeSheet(); go('wird'); }
        else toast('النص غير صالح');
        break;
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    switch (t.dataset.action) {
      case 'set-method': Store.setSetting('method', t.value); renderPrayer(); scheduleAll(); break;
      case 'set-asr': Store.setSetting('asr', t.value); renderPrayer(); scheduleAll(); break;
      case 'set-wird': {
        var k = Store.khatma(); k.pagesPerDay = +t.value;
        Store.setSetting('wirdPagesPerDay', +t.value); Store.save(); renderMore(); break;
      }
      case 'set-font': Store.setSetting('quranFontSize', +t.value); applyAyahFont(); toast('تم تغيير حجم الخط'); break;
      case 'set-periodic': Store.setSetting('periodicEveryMin', +t.value); scheduleAll(); break;
      case 'set-cooldown': Store.setSetting('unlockCooldownMin', +t.value); break;
      case 'set-hijri': Store.setSetting('hijriOffset', +t.value); renderMore(); break;
      case 'set-reciter-select': Store.setSetting('reciter', t.value); stopAyahAudio(); syncNative(); refreshWidgetNative(); toast('تم اختيار ' + Quran.reciterName(t.value)); break;
      case 'set-phrase': {
        if (tapScreen === 'tasbih') { Store.raw().tasbihPhrase = t.value; Store.save(); }
        $('#tap-phrase').textContent = t.value; break;
      }
    }
  });

  function gotoPageSheet() {
    sheet('<h3 style="margin:0 0 12px">اذهب إلى صفحة</h3>' +
      '<input type="number" id="gp" min="1" max="604" placeholder="1 - 604" style="width:100%;max-width:100%">' +
      '<button class="btn btn-primary" style="width:100%;margin-top:12px" data-action="do-goto">اذهب</button>');
  }

  function doDownloadReciter() {
    if (!Quran.ready()) { toast('نزّل المصحف أولًا'); return; }
    var key = Store.settings().reciter || 'yasser';
    var name = Quran.reciterName(key);
    sheet('<h3 style="margin:0 0 8px">تنزيل تلاوة ' + esc(name) + '</h3>' +
      '<p style="font-size:13.5px;line-height:1.9;color:#6B7F76">هيتم تنزيل آيات القارئ على الجهاز مرة واحدة، وبعد اكتمال التنزيل تقدر تسمع المصحف بدون إنترنت. حجم التلاوة كبير، فلا تقفل التطبيق أثناء التنزيل.</p>' +
      '<div class="bar"><i id="rec-dl-bar"></i></div><div id="rec-dl-msg" style="font-size:13px">جارٍ البدء…</div>');
    Quran.downloadReciter(key, function (p, msg) {
      var b=$('#rec-dl-bar'), m=$('#rec-dl-msg');
      if(b) b.style.width=p+'%'; if(m) m.textContent=msg;
    }).then(function(r){
      toast('تم تنزيل تلاوة ' + name + ' ✓');
      closeSheet();
    }).catch(function(err){
      var m=$('#rec-dl-msg');
      if(m) m.innerHTML='<span style="color:#A8462F">تعذّر إكمال تنزيل التلاوة.<br>'+esc(err && err.message ? err.message : 'خطأ غير معروف')+'</span>';
    });
  }

  function doDownload() {
    sheet('<h3 style="margin:0 0 8px">تنزيل المصحف</h3>' +
      '<p style="font-size:13.5px;line-height:1.9;color:#6B7F76">هيتحمّل مرة واحدة بس (حوالي ٢ ميجا)، وبعدها التطبيق هيشتغل من غير إنترنت خالص.</p>' +
      '<div class="bar"><i id="dl-bar"></i></div><div id="dl-msg" style="font-size:13px">جارٍ البدء…</div>');
    Quran.download(function (p, msg) {
      var b = $('#dl-bar'), m = $('#dl-msg');
      if (b) b.style.width = p + '%';
      if (m) m.textContent = msg;
    }).then(function () {
      toast('تم تنزيل المصحف ✓');
      closeSheet(); go(activeTab === 'more' ? 'more' : 'wird');
    }).catch(function (err) {
      var m = $('#dl-msg');
      if (m) m.innerHTML = '<span style="color:#A8462F">فشل التنزيل — تأكد من الإنترنت وجرّب تاني.<br>' + esc(err.message) + '</span>';
    });
  }

  /* =========================================================
     الإقلاع
     ========================================================= */
  var backPressedOnce = false, backTimer = null;
  function handleBackButton() {
    // أولوية إغلاق أي نافذة/شاشة مفتوحة فوق الشاشة الرئيسية
    if ($('#reader').classList.contains('open')) { closeReader(); return; }
    if ($('#ayah-gate').classList.contains('open')) { closeAyahGate(); return; }
    if ($('#sheet').classList.contains('open')) { closeSheet(); return; }
    if (catState) { catState = null; go('adhkar'); return; }
    if (tapScreen) { tapScreen = null; go('adhkar'); return; }
    if (activeTab !== 'wird') { go('wird'); return; }

    // من الشاشة الرئيسية: أول ضغطة تعرض الدعاء، والضغطة التانية خلال ٣ ثواني تخرج فعليًا
    if (backPressedOnce) {
      CAP.App.exitApp();
      return;
    }
    backPressedOnce = true;
    $('#exit-dua').innerHTML =
      '<div class="t">🤲 ' + EXIT_DUA + '</div>' +
      '<div class="h">اضغط رجوع مرة أخرى للخروج</div>';
    $('#exit-dua').classList.add('open');
    clearTimeout(backTimer);
    backTimer = setTimeout(function () {
      backPressedOnce = false;
      $('#exit-dua').classList.remove('open');
    }, 3000);
  }

  /* نقاط دخول يستخدمها ✨ PLUS */
  window.TasneemApp = {
    openPage: function (p) { openReader(+p); },
    openWird: function () { var kw = Store.khatma(); openReader(kw.currentPage, true); },
    rescheduleReminders: function () { scheduleAll(); }
  };

  /* تنزيل تلاوة القارئ تلقائيًا أول مرة (يُكمل من حيث وقف) عشان التلاوة تشتغل بدون نت */
  function autoDownloadReciter() {
    var st = Store.settings();
    if (st.offlineMode || window.__autoDl || !Quran.ready()) return;
    var key = st.reciter || 'yasser';
    Quran.audioCacheInfo(key).then(function (info) {
      if (info.count >= Quran.TOTAL_AYAHS - 20) return;
      window.__autoDl = true;
      var bar = document.createElement('div');
      bar.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#0B211B;color:#fff;border-radius:12px;padding:8px 12px;font-size:12.5px;text-align:center;opacity:.92;pointer-events:none';
      bar.textContent = 'جارٍ تنزيل التلاوة للأوفلاين…';
      document.body.appendChild(bar);
      Quran.downloadReciter(key, function (p) { bar.textContent = 'تنزيل التلاوة للأوفلاين ' + p + '%'; })
        .then(function () { toast('اكتمل تنزيل التلاوة — تشتغل بدون إنترنت ✓'); })
        .catch(function () { window.__autoDl = false; })
        .then(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); });
    }).catch(function () {});
  }
  window.addEventListener('online', function () { setTimeout(autoDownloadReciter, 1500); });

  function boot() {
    applyAyahFont();
    bindReaderSwipe();
    Quran.load().then(function () {
      go('wird');
      showAyahGate();
      setTimeout(autoDownloadReciter, 4000);
      if (Store.settings().lat !== null) { todayTimes = computeTimes(); scheduleAll(); }
      if (nativeAvailable()) {
        CAP.Tasneem.start().then(syncNative).catch(function () {});
        pullNativeCounts();
        if (!Store.settings().widgetPinAsked) {
          Store.setSetting('widgetPinAsked', true);
          CAP.Tasneem.requestPinWidget && CAP.Tasneem.requestPinWidget().catch(function () {});
        }
      }
      if (CAP && CAP.LocalNotifications) {
        CAP.LocalNotifications.createChannel &&
        CAP.LocalNotifications.createChannel({ id: 'adhan', name: 'الأذان', importance: 5,
          sound: 'adhan.mp3', visibility: 1, vibration: true }).catch(function () {});
        CAP.LocalNotifications.createChannel &&
        CAP.LocalNotifications.createChannel({ id: 'dhikr', name: 'الأذكار', importance: 3,
          visibility: 1 }).catch(function () {});
        CAP.LocalNotifications.registerActionTypes &&
        CAP.LocalNotifications.registerActionTypes({
          types: [
            { id: 'DHIKR_ACTIONS', actions: [{ id: 'markRead', title: 'تمّت القراءة ✓' }] },
            { id: 'ADHAN_ACTIONS', actions: [{ id: 'stopAdhan', title: '⏹ إيقاف الأذان', destructive: true }] }
          ]
        }).catch(function () {});
        CAP.LocalNotifications.addListener && CAP.LocalNotifications.addListener(
          'localNotificationActionPerformed', onNotificationAction);
      }
      if (CAP && CAP.App) {
        CAP.App.addListener('backButton', handleBackButton);
      }
      // تحديث المواقيت عند تغيّر اليوم
      setInterval(function () {
        var d = Store.today();
        if (window.__lastDay && window.__lastDay !== d) { todayTimes = computeTimes(); scheduleAll(); go(activeTab); }
        window.__lastDay = d;
      }, 60000);
      window.__lastDay = Store.today();
    });
  }

  var booted = false;
  function bootOnce() { if (booted) return; booted = true; boot(); }
  document.addEventListener('DOMContentLoaded', bootOnce);
  if (document.readyState !== 'loading') bootOnce();
})();
