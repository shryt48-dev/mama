/* تسنيم — Service Worker */
var CACHE = 'tasneem-v3-20261005';
var ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './js/quran-meta.js', './js/adhkar-data.js', './js/prayer-times.js',
  './js/store.js', './js/quran.js', './js/recitation-ai.js', './js/tasneem-plus.js', './js/cloud-sync.js', './js/app.js',
  './data/quran.json', './vendor/ort.min.js',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) {
    return Promise.all(ASSETS.map(function(u) { return c.add(u).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ return k===CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e) {
  var req=e.request; if(req.method!=='GET') return;
  var url=new URL(req.url), same=url.origin===self.location.origin;
  var isFont=url.hostname.indexOf('fonts.g')>-1;
  if(!same && !isFont) return;
  e.respondWith(caches.match(req).then(function(hit){
    if(hit) return hit;
    return fetch(req).then(function(res){
      if(res && res.status===200 && (same || isFont)){
        var copy=res.clone(); caches.open(CACHE).then(function(c){c.put(req,copy);});
      }
      return res;
    }).catch(function(){ return caches.match('./index.html'); });
  }));
});
