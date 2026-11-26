/* תזכורות - אחסון במכשיר (IndexedDB) וסנכרון מועדי ההתראות עם השרת. משותף לאפליקציה ול-Service Worker. */
(function (g) {
  'use strict';
  var DB_NAME = 'tz-reminders', VER = 1, dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      var r = indexedDB.open(DB_NAME, VER);
      r.onupgradeneeded = function () {
        var db = r.result;
        if (!db.objectStoreNames.contains('rem')) db.createObjectStore('rem', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(store, mode), s = t.objectStore(store), out;
        var rq = fn(s);
        if (rq) rq.onsuccess = function () { out = rq.result; };
        t.oncomplete = function () { res(out); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
      });
    });
  }
  var Store = {
    all: function () { return tx('rem', 'readonly', function (s) { return s.getAll(); }).then(function (l) { return l || []; }); },
    get: function (id) { return tx('rem', 'readonly', function (s) { return s.get(id); }); },
    put: function (r) { return tx('rem', 'readwrite', function (s) { return s.put(r); }); },
    putMany: function (list) { return tx('rem', 'readwrite', function (s) { list.forEach(function (r) { s.put(r); }); }); },
    del: function (id) { return tx('rem', 'readwrite', function (s) { return s.delete(id); }); },
    clear: function () { return tx('rem', 'readwrite', function (s) { return s.clear(); }); },
    meta: function (k) { return tx('meta', 'readonly', function (s) { return s.get(k); }); },
    setMeta: function (k, v) { return tx('meta', 'readwrite', function (s) { return s.put(v, k); }); }
  };

  function rid(n) {
    var a = new Uint8Array(n || 18); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (x) { return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[x & 63]; }).join('');
  }
  Store.rid = rid;

  // כתובת השרת. ריק = אותו אתר. אפשר לקבוע ב-config.js
  function api(path) { return (g.TZ_API || '') + '/api/' + path; }
  Store.api = api;

  Store.device = function () {
    return Store.meta('device').then(function (d) {
      if (d && d.id) return d;
      d = { id: rid(22), secret: rid(32), created: Date.now() };
      return Store.setMeta('device', d).then(function () { return d; });
    });
  };

  // שולח לשרת את רשימת ההתראות של המכשיר (רק אם ההתראות הופעלו)
  var syncing = null, again = false;
  Store.sync = function (opts) {
    opts = opts || {};
    if (syncing) { again = true; return syncing; }
    syncing = (async function () {
      try {
        var dev = await Store.meta('device');
        if (!dev || !dev.push) return { skipped: true };
        var list = await Store.all();
        var settings = (await Store.meta('settings')) || {};
        var jobs = g.Sched.buildJobs(list, Date.now(), { sound: settings.sound });
        var body = { id: dev.id, secret: dev.secret, jobs: jobs };
        if (opts.sub || !dev.subSent) {
          var reg = g.registration || (g.navigator && navigator.serviceWorker && await navigator.serviceWorker.ready);
          var sub = reg && reg.pushManager && await reg.pushManager.getSubscription();
          if (sub) body.sub = sub.toJSON();
        }
        var r = await fetch(api('sync'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        var j = await r.json().catch(function () { return {}; });
        if (r.ok) {
          dev.lastSync = Date.now(); dev.lastJobs = j.jobs; dev.serverPush = !!j.push;
          if (body.sub) dev.subSent = true;
          if (!j.push) dev.subSent = false;
          await Store.setMeta('device', dev);
        }
        return j;
      } catch (e) {
        return { error: String(e) };
      } finally {
        syncing = null;
        if (again) { again = false; setTimeout(function () { Store.sync(); }, 50); }
      }
    })();
    return syncing;
  };

  g.Store = Store;
})(typeof self !== 'undefined' ? self : globalThis);
