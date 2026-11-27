/* תזכורות - Service Worker: עבודה בלי רשת, הצגת התראות כשהאפליקציה סגורה, ופעולות מתוך ההתראה. */
var VERSION = 'tz-v2.0.4';
importScripts('config.js', 'schedule.js', 'store.js');

var SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'schedule.js', 'store.js', 'sounds.js', 'holidays.js', 'config.js', 'manifest.json', 'logo.png', 'icon-192.png', 'badge.png', 'voice-note.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// קודם רשת (כדי לקבל עדכונים), ואם אין רשת - מהמטמון
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.pathname.indexOf('/api/') === 0 || url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || caches.match('index.html'); });
  }));
});

function show(data) {
  var title = data.title || 'תזכורת';
  var opts = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'badge.png',
    dir: 'rtl', lang: 'he',
    tag: 'r-' + (data.rid || 'x'),
    renotify: true,
    requireInteraction: data.kind !== 'lead',
    vibrate: [300, 120, 300, 120, 600],
    timestamp: data.t || Date.now(),
    data: data,
    actions: data.rid && data.rid !== 'test' ? [
      { action: 'done', title: '✓ בוצע' },
      { action: 'snooze', title: '💤 עוד 10 דק\'' }
    ] : []
  };
  return self.registration.showNotification(title, opts);
}

async function tellClients(msg) {
  var list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  list.forEach(function (c) { c.postMessage(msg); });
  return list;
}

self.addEventListener('push', function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (x) { data = { title: 'תזכורת', body: e.data && e.data.text() }; }
  e.waitUntil((async function () {
    // אם התזכורת סומנה בינתיים כבוצעה במכשיר הזה, לא מציגים
    if (data.rid && data.rid !== 'test') {
      try {
        var r = await Store.get(data.rid);
        if (r && (r.done || r.paused) && data.kind !== 'test') { await Store.sync(); return show({ title: data.title, body: data.body, rid: data.rid, kind: 'lead' }); }
      } catch (x) {}
    }
    await show(data);
    await tellClients({ type: 'push', data: data });
    // מרעננים את רשימת המועדים בשרת, כדי שתזכורות חוזרות ימשיכו לצאת לנצח
    try { await Store.sync(); } catch (x) {}
  })());
});

self.addEventListener('notificationclick', function (e) {
  var n = e.notification, data = n.data || {};
  n.close();
  e.waitUntil((async function () {
    if ((e.action === 'done' || e.action === 'snooze') && data.rid) {
      var r = await Store.get(data.rid);
      if (r) {
        var settings = (await Store.meta('settings')) || {};
        if (e.action === 'done') Sched.markDone(r, Date.now());
        else Sched.snooze(r, Date.now(), settings.snoozeMin || 10);
        await Store.put(r);
        await Store.sync();
        await tellClients({ type: 'changed' });
      }
      return;
    }
    var list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    var target = self.registration.scope + '?open=' + encodeURIComponent(data.rid || '') + '&occ=' + (data.occ || '');
    for (var i = 0; i < list.length; i++) {
      if ('focus' in list[i]) { list[i].postMessage({ type: 'open', data: data }); return list[i].focus(); }
    }
    return clients.openWindow(target);
  })());
});

self.addEventListener('pushsubscriptionchange', function (e) {
  e.waitUntil((async function () {
    try {
      var k = await fetch(Store.api('key')).then(function (r) { return r.json(); });
      var key = Uint8Array.from(atob(k.key.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - k.key.length % 4) % 4)), function (c) { return c.charCodeAt(0); });
      await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await Store.sync({ sub: true });
    } catch (x) {}
  })());
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
