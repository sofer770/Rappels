/* תזכורות - סנכרון בין מכשירים (מחשב, טלפון).
   מכשירים מתחברים בקוד של 6 ספרות. כל שינוי נשלח לשרת ומגיע לשאר המכשירים תוך כמה שניות.
   מי שלא מחבר מכשירים - הכל נשאר רק אצלו, כמו קודם. */
(function (g) {
  'use strict';
  var Store = g.Store;
  if (!Store) return;
  var running = null, again = false, timer = null, last = { at: 0, error: null };

  function post(op, body) {
    return fetch(Store.api('group/' + op), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || ('http ' + r.status)); e.code = j.error; throw e; } return j; }); });
  }
  function group() { return Store.meta('group'); }
  function setGroup(gr) { return Store.setMeta('group', gr); }

  // שולח שינויים מקומיים ומקבל שינויים מהמכשירים האחרים
  async function run() {
    if (running) { again = true; return running; }
    running = (async function () {
      var gr = await group();
      if (!gr || !gr.gid) return { off: true };
      try {
        var t0 = Date.now(), since = gr.pushedAt || 0;
        var list = await Store.all(), tombs = (await Store.meta('tombs')) || [];
        var items = list.filter(function (r) { return (r.updated || 1) > since; }).map(function (r) { return { id: r.id, data: r, updated: r.updated || 1 }; })
          .concat(tombs.filter(function (x) { return x.updated > since; }).map(function (x) { return { id: x.id, deleted: true, updated: x.updated }; }));
        // שולחים במנות קטנות (תמונות יכולות להיות גדולות)
        var batch = [], size = 0;
        for (var i = 0; i <= items.length; i++) {
          var it = items[i], len = it ? JSON.stringify(it).length : 0;
          if (batch.length && (!it || size + len > 300000 || batch.length >= 200)) { await post('push', { gid: gr.gid, key: gr.key, items: batch }); batch = []; size = 0; }
          if (it) { batch.push(it); size += len; }
        }
        gr.pushedAt = t0;
        var changed = false, more = true;
        while (more) {
          var res = await post('pull', { gid: gr.gid, key: gr.key, since: gr.seq || 0 });
          for (var k = 0; k < res.items.length; k++) {
            var x = res.items[k], local = await Store.get(x.id);
            if (x.deleted) { if (local && (local.updated || 0) <= x.updated) { await Store.delRaw(x.id); changed = true; } }
            else if (x.data && (!local || (local.updated || 0) < x.updated)) { x.data.updated = x.updated; await Store.putRaw(x.data); changed = true; }
          }
          gr.seq = res.seq; more = res.more;
        }
        gr.lastSync = Date.now();
        await setGroup(gr);
        last = { at: gr.lastSync, error: null };
        if (changed) g.dispatchEvent(new CustomEvent('tz:remote-changed'));
        return { ok: true, changed: changed };
      } catch (e) {
        last.error = e.code || e.message;
        if (e.code === 'forbidden') { await setGroup(null); g.dispatchEvent(new CustomEvent('tz:sync-off')); }
        return { error: last.error };
      }
    })();
    var out = await running; running = null;
    if (again) { again = false; return run(); }
    return out;
  }
  function soon() { clearTimeout(timer); timer = setTimeout(run, 1500); }

  // כל שינוי מקומי יוצא לשאר המכשירים
  ['put', 'putMany', 'del'].forEach(function (m) {
    var orig = Store[m];
    Store[m] = function () { return orig.apply(Store, arguments).then(function (x) { soon(); return x; }); };
  });

  async function create() {
    var gr = await group();
    if (!gr || !gr.gid) gr = { gid: Store.rid(22), key: Store.rid(32), seq: 0, pushedAt: 0 };
    var r = await post('create', { gid: gr.gid, key: gr.key });
    await setGroup(gr);
    run();
    return r.code;
  }
  async function join(code) {
    var r = await post('join', { code: String(code || '').replace(/\D/g, '') });
    // אחרי חיבור: מקבלים את כל התזכורות מהקבוצה, ושולחים אליה את כל מה שיש במכשיר הזה
    await setGroup({ gid: r.gid, key: r.key, seq: 0, pushedAt: 0 });
    return run();
  }
  async function leave() { await setGroup(null); }
  async function state() { var gr = await group(); return { on: !!(gr && gr.gid), lastSync: gr && gr.lastSync, error: last.error }; }

  setInterval(function () { if (document.visibilityState === 'visible') run(); }, 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') run(); });
  setTimeout(run, 1200);

  g.TZSync = { run: run, create: create, join: join, leave: leave, state: state };
})(window);
