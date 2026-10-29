/* Xplr : mise en cache de l’application pour un usage hors ligne.
   Les fonds de carte et les services externes (sommets, communes, recherche) restent en ligne. */
var CACHE = "xplr-v11";
var H3 = "https://cdn.jsdelivr.net/npm/h3-js@4.1.0/dist/h3-js.umd.js";
var SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "favicon-32.png", H3];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () { /* ressource absente : ignorée */ }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET") return;
  var url = new URL(r.url);
  var local = url.origin === self.location.origin;
  var ok = local || url.href === H3 || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!ok) return;
  if (r.mode === "navigate") {   // page principale : toujours la version en ligne d’abord, le cache sert hors ligne
    e.respondWith(fetch(r).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); c.put("index.html", res.clone()); }); }
      return res;
    }).catch(function () { return caches.match(r).then(function (hit) { return hit || caches.match("index.html"); }); }));
    return;
  }
  e.respondWith(caches.match(r).then(function (hit) {
    var net = fetch(r).then(function (res) {
      if (res && (res.ok || res.type === "opaque")) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); }
      return res;
    }).catch(function () { return hit || (r.mode === "navigate" ? caches.match("index.html") : undefined); });
    return hit || net;
  }));
});
