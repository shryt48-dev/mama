/* جيهان — عامل الخدمة: يخلّي التطبيق يفتح ويشتغل بدون إنترنت
   - الكود (HTML/JS/CSS): الشبكة أولًا ثم الكاش، فالتحديثات توصل فورًا
   - الصور والنموذج والخطوط: الكاش أولًا
   - كاش الصوت (tasneem-audio-*) محفوظ ولا يُحذف عند التحديث */
var CACHE = 'tasneem-v7';
var ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './data/quran.json',
  './js/quran-meta.js', './js/adhkar-data.js', './js/prayer-times.js',
  './js/store.js', './js/quran.js', './js/recitation-ai.js', './js/tasneem-plus.js',
  './js/firebase-config.js', './js/cloud-sync.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () {});   // لا نفشل لو ملف ناقص
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k === CACHE || k.indexOf('tasneem-audio') === 0) return null;   // نحتفظ بالصوت المنزّل
        return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isCode(url, req) {
  return req.mode === 'navigate' || /\.(?:js|css|html|webmanifest)$/.test(url.pathname) || url.pathname.slice(-1) === '/';
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // المصادر الخارجية الخاصة بالتفسير/القرآن لا تُفرض على التطبيق؛ البيانات المحلية تُخزّن وتعمل أوفلاين.
  if (url.hostname.indexOf('alquran') > -1 && url.origin !== self.location.origin) return;

  var sameOrigin = url.origin === self.location.origin;
  var isFont = url.hostname.indexOf('fonts.g') > -1;
  if (!sameOrigin && !isFont) return;
  if (req.headers.get('range')) return;   // طلبات الصوت/الفيديو الجزئية تعدّي للشبكة

  if (sameOrigin && isCode(url, req)) {
    // الشبكة أولًا ثم الكاش
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); });
      })
    );
    return;
  }

  // الكاش أولًا (صور المصحف، النموذج، wasm، الخطوط)
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
