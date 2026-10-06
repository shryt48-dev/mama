/* =========================================================
   مواقيت الصلاة - حساب فلكي محلي (بدون إنترنت)
   Based on the standard sun-position algorithm used by
   PrayTimes / ITL. Accurate to ~1 minute.
   ========================================================= */
(function (global) {
  'use strict';

  var DEG = Math.PI / 180;
  function dsin(d) { return Math.sin(d * DEG); }
  function dcos(d) { return Math.cos(d * DEG); }
  function dtan(d) { return Math.tan(d * DEG); }
  function darcsin(x) { return Math.asin(x) / DEG; }
  function darccos(x) { return Math.acos(x) / DEG; }
  function darctan2(y, x) { return Math.atan2(y, x) / DEG; }
  function darccot(x) { return Math.atan2(1, x) / DEG; }
  function fixAngle(a) { a = a - 360 * Math.floor(a / 360); return a < 0 ? a + 360 : a; }
  function fixHour(a) { a = a - 24 * Math.floor(a / 24); return a < 0 ? a + 24 : a; }

  // طرق الحساب المعتمدة
  var METHODS = {
    egypt:   { name: 'الهيئة المصرية العامة للمساحة', fajr: 19.5, isha: 17.5 },
    makkah:  { name: 'أم القرى - مكة المكرمة',        fajr: 18.5, isha: '90 min' },
    muslimWorld: { name: 'رابطة العالم الإسلامي',      fajr: 18,   isha: 17 },
    isna:    { name: 'ISNA - أمريكا الشمالية',        fajr: 15,   isha: 15 },
    karachi: { name: 'جامعة العلوم الإسلامية - كراتشي', fajr: 18,  isha: 18 },
    dubai:   { name: 'الإمارات',                       fajr: 18.2, isha: 18.2 },
    kuwait:  { name: 'الكويت',                         fajr: 18,   isha: 17.5 },
    qatar:   { name: 'قطر',                            fajr: 18,   isha: '90 min' },
    turkey:  { name: 'ديانت - تركيا',                  fajr: 18,   isha: 17 },
    tehran:  { name: 'جامعة طهران',                    fajr: 17.7, isha: 14 }
  };

  function julianDate(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  // موضع الشمس: يرجع الميل والتعديل الزمني
  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
    RA = fixHour(RA);
    var decl = darcsin(dsin(e) * dsin(L));
    var eqt = q / 15 - RA;
    return { declination: decl, equation: eqt };
  }

  function midDay(jd, t) {
    var eqt = sunPosition(jd + t).equation;
    return fixHour(12 - eqt);
  }

  // الوقت الذي تكون فيه الشمس على ارتفاع زاوي معيّن
  function sunAngleTime(jd, t, angle, lat, ccw) {
    var decl = sunPosition(jd + t).declination;
    var noon = midDay(jd, t);
    var inner = (-dsin(angle) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat));
    if (inner > 1 || inner < -1) return NaN; // خطوط العرض العالية
    var T = darccos(inner) / 15;
    return noon + (ccw ? -T : T);
  }

  function asrTime(jd, t, factor, lat) {
    var decl = sunPosition(jd + t).declination;
    var angle = -darccot(factor + dtan(Math.abs(lat - decl)));
    return sunAngleTime(jd, t, angle, lat, false);
  }

  /**
   * options: { lat, lng, timezone (hours), date (Date), method, asr: 'standard'|'hanafi',
   *            elevation (m), adjust: {fajr:0, dhuhr:0, ...} }
   */
  function calculate(opts) {
    var date = opts.date || new Date();
    var lat = opts.lat, lng = opts.lng;
    var tz = (opts.timezone === undefined || opts.timezone === null)
      ? -date.getTimezoneOffset() / 60 : opts.timezone;
    var m = METHODS[opts.method] || METHODS.egypt;
    var asrFactor = opts.asr === 'hanafi' ? 2 : 1;
    var elev = opts.elevation || 0;
    var horizon = 0.833 + 0.0347 * Math.sqrt(Math.max(elev, 0));

    var jd = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);

    // القيم بالساعات، وتُحوَّل لأجزاء من اليوم قبل كل تكرار
    var t = { imsak: 5, fajr: 5, sunrise: 6, dhuhr: 12,
              asr: 13, sunset: 18, maghrib: 18, isha: 18 };
    for (var i = 0; i < 3; i++) {
      var p = {};
      for (var k in t) p[k] = t[k] / 24;
      t.fajr    = sunAngleTime(jd, p.fajr, m.fajr, lat, true);
      t.sunrise = sunAngleTime(jd, p.sunrise, horizon, lat, true);
      t.dhuhr   = midDay(jd, p.dhuhr);
      t.asr     = asrTime(jd, p.asr, asrFactor, lat);
      t.sunset  = sunAngleTime(jd, p.sunset, horizon, lat, false);
      t.imsak   = sunAngleTime(jd, p.imsak, m.fajr + 1.5, lat, true);
      if (typeof m.isha === 'string') {
        t.isha = t.sunset + parseInt(m.isha, 10) / 60;
      } else {
        t.isha = sunAngleTime(jd, p.isha, m.isha, lat, false);
      }
    }
    t.maghrib = t.sunset;            // المغرب = الغروب (عدّله يدويًا من الإعدادات لو حابب)
    t.dhuhr = t.dhuhr + 1 / 60;      // دقيقة بعد الزوال

    var adj = opts.adjust || {};
    var out = {};
    ['imsak', 'fajr', 'sunrise', 'dhuhr', 'asr', 'sunset', 'maghrib', 'isha'].forEach(function (k) {
      var v = t[k];
      if (isNaN(v)) { out[k] = null; return; }
      v = fixHour(v + tz - lng / 15 + (adj[k] || 0) / 60);
      var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      d.setMinutes(Math.round(v * 60));
      out[k] = d;
    });
    out.method = m.name;
    return out;
  }

  /* اتجاه القبلة: الزاوية بالدرجات من الشمال (اتجاه عقارب الساعة) نحو الكعبة */
  var KAABA_LAT = 21.4225, KAABA_LNG = 39.8262;
  function qiblaBearing(lat, lng) {
    var phi1 = lat * Math.PI / 180, phi2 = KAABA_LAT * Math.PI / 180;
    var dLng = (KAABA_LNG - lng) * Math.PI / 180;
    var y = Math.sin(dLng) * Math.cos(phi2);
    var x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
    var brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }
  function qiblaDistanceKm(lat, lng) {
    var R = 6371, phi1 = lat * Math.PI / 180, phi2 = KAABA_LAT * Math.PI / 180;
    var dPhi = (KAABA_LAT - lat) * Math.PI / 180, dLng = (KAABA_LNG - lng) * Math.PI / 180;
    var a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  global.PrayerTimes = {
    calculate: calculate, METHODS: METHODS,
    qiblaBearing: qiblaBearing, qiblaDistanceKm: qiblaDistanceKm
  };
})(typeof window !== 'undefined' ? window : global);
