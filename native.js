/* תזכורות - חיבור לאפליקציית האנדרואיד (Capacitor).
   באפליקציה המותקנת מהקובץ, כל התזכורות מתוזמנות כשעון מעורר בטלפון עצמו, בלי שרת ובלי Chrome.
   בדפדפן רגיל הקובץ הזה לא עושה כלום. */
(function (g) {
  'use strict';
  var C = g.Capacitor;
  var NATIVE = !!(C && C.isNativePlatform && C.isNativePlatform());
  if (!NATIVE) { g.TZNative = null; return; }

  var LN = C.registerPlugin('LocalNotifications');
  var MAX = 300; // אנדרואיד מגביל את מספר השעונים המעוררים לאפליקציה
  var SOUNDS = ['chime', 'marimba', 'dingdong', 'harp', 'birds', 'drops', 'beep', 'alarm', 'gong', 'temple', 'flute', 'piano', 'pulse', 'rise', 'kalimba', 'retro', 'none'];
  var setupP = null, pending = [], handler = null, last = { at: 0, count: 0, error: null, exact: null };

  function chan(sound) { return 'tz2_' + (SOUNDS.indexOf(sound) >= 0 ? sound : 'chime'); }

  function setup() {
    if (setupP) return setupP;
    setupP = (async function () {
      var names = (g.Sounds && g.Sounds.list) || [];
      for (var i = 0; i < SOUNDS.length; i++) {
        var id = SOUNDS[i], nm = (names.find(function (s) { return s.id === id; }) || {}).name || id;
        try {
          await LN.createChannel({ id: chan(id), name: 'תזכורות · ' + nm, description: 'תזכורות עם הצליל ' + nm, importance: 5, visibility: 1, sound: 'snd_' + id + '.wav', vibration: true, lights: true, lightColor: '#4f46e5' });
        } catch (e) {}
      }
      try {
        await LN.registerActionTypes({ types: [
          { id: 'rem', actions: [{ id: 'done', title: '✓ בוצע' }, { id: 'snooze', title: '💤 עוד 10 דק׳' }] },
          { id: 'info', actions: [] }
        ] });
      } catch (e) {}
      LN.addListener('localNotificationActionPerformed', function (ev) {
        var n = ev && ev.notification || {}, x = n.extra || {};
        var a = { action: ev.actionId === 'done' || ev.actionId === 'snooze' ? ev.actionId : 'tap', data: x };
        if (handler) handler(a); else pending.push(a);
      });
    })();
    return setupP;
  }

  async function perm() {
    try { var p = await LN.checkPermissions(); return p.display; } catch (e) { return 'denied'; }
  }
  async function request() {
    await setup();
    var p = await LN.requestPermissions();
    return p.display;
  }
  async function exact() {
    try { var s = await LN.checkExactNotificationSetting(); return s.exact_alarm; } catch (e) { return 'granted'; }
  }

  function idFor(i) { return 1000 + i; }

  // מתזמן מחדש את כל ההתראות לפי רשימת התזכורות
  async function schedule() {
    await setup();
    if ((await perm()) !== 'granted') return { skipped: true };
    var Store = g.Store, list = await Store.all();
    var settings = (await Store.meta('settings')) || {};
    var jobs = g.Sched.buildJobs(list, Date.now(), { sound: settings.sound }).slice(0, MAX);
    var byId = {}; list.forEach(function (r) { byId[r.id] = r; });
    try {
      var pend = await LN.getPending();
      var old = (pend.notifications || []).filter(function (n) { return !(n.extra && n.extra.kind === 'test'); }).map(function (n) { return { id: n.id }; });
      if (old.length) await LN.cancel({ notifications: old });
    } catch (e) {}
    var items = jobs.map(function (j, i) {
      var r = byId[j.rid], snd = (r && r.sound) || j.sound || settings.sound || 'chime';
      return {
        id: idFor(i), title: j.title || 'תזכורת', body: j.body || '', largeBody: j.body || '',
        schedule: { at: new Date(Math.max(j.t, Date.now() + 1500)), allowWhileIdle: true },
        channelId: chan(snd), smallIcon: 'ic_stat_bell', iconColor: '#4f46e5',
        actionTypeId: j.kind === 'lead' ? 'info' : 'rem', autoCancel: true,
        extra: { rid: j.rid, occ: j.occ, t: j.t, kind: j.kind }
      };
    });
    try {
      for (var k = 0; k < items.length; k += 50) {
        var res = await LN.schedule({ notifications: items.slice(k, k + 50) });
        if (res && res.warning) last.error = 'שעון מדויק לא מאושר';
      }
      last = { at: Date.now(), count: items.length, error: last.error && items.length ? last.error : null, exact: await exact() };
      var dev = (await Store.meta('device')) || {};
      dev.lastSync = last.at; dev.lastJobs = items.length; dev.syncError = null;
      await Store.setMeta('device', dev);
      return { ok: true, jobs: items.length, native: true };
    } catch (e) {
      last.error = String(e && e.message || e);
      return { error: last.error };
    }
  }

  async function test(delaySec) {
    await setup();
    var t = Date.now() + Math.max(1.5, delaySec || 0) * 1000;
    var settings = (await g.Store.meta('settings')) || {};
    await LN.schedule({ notifications: [{
      id: 900000 + Math.floor(Math.random() * 90000), title: 'בדיקת התראה ✓', body: 'אם ההודעה הזו קפצה, התזכורות יקפצו גם כשהאפליקציה סגורה.',
      schedule: { at: new Date(t), allowWhileIdle: true }, channelId: chan(settings.sound || 'chime'), smallIcon: 'ic_stat_bell', iconColor: '#4f46e5',
      actionTypeId: 'info', extra: { rid: 'test', t: t, kind: 'test' }
    }] });
    return t;
  }

  async function clearFor(rid) {
    try {
      var d = await LN.getDeliveredNotifications();
      var ns = (d.notifications || []).filter(function (n) { return n.extra && n.extra.rid === rid; });
      if (ns.length) await LN.removeDeliveredNotifications({ notifications: ns });
    } catch (e) {}
  }

  async function diag() {
    var inf = {}; try { inf = await DEV.info(); } catch (e) {}
    var out = ['אפליקציית אנדרואיד' + (inf.version ? ' ' + inf.version : ''), 'התראות: ' + (await perm()), 'שעון מדויק: ' + (await exact())];
    try { var p = await LN.getPending(); out.push('מתוזמנות בטלפון: ' + (p.notifications || []).length); } catch (e) {}
    if (last.at) out.push('תזמון אחרון: ' + new Date(last.at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }));
    if (last.error) out.push('שגיאה: ' + last.error);
    return out.join(' · ');
  }

  // הכתבה בקול: בתוך אפליקציית האנדרואיד משתמשים בזיהוי הדיבור של הטלפון
  var SR = C.registerPlugin('SpeechRecognition');
  async function dictate(cb, btn, toast) {
    try {
      var av = await SR.available();
      if (!av.available) { toast('זיהוי דיבור לא זמין בטלפון. אפשר להשתמש בכפתור המיקרופון במקלדת.'); return; }
      var p = await SR.requestPermissions();
      if (p.speechRecognition !== 'granted') { toast('צריך לאשר גישה למיקרופון'); return; }
      if (btn) btn.classList.add('rec');
      var r = await SR.start({ language: 'he-IL', maxResults: 1, partialResults: false, popup: true, prompt: 'דברו עכשיו' });
      var t = r && r.matches && r.matches[0];
      if (t) cb(t); else toast('לא נקלט, נסו שוב');
    } catch (e) { toast('לא נקלט, נסו שוב'); }
    finally { if (btn) btn.classList.remove('rec'); }
  }

  var DEV = C.registerPlugin('TzDevice');
  async function openAutostart() { try { await DEV.openAutostart(); } catch (e) {} }
  async function device() { try { return await DEV.info(); } catch (e) { return {}; } }
  async function requestBattery() { try { await DEV.requestBattery(); } catch (e) {} }

  async function openExact() { try { await LN.changeExactNotificationSetting(); } catch (e) {} }

  // מחליפים את הסנכרון עם השרת בתזמון מקומי
  g.Store.sync = function () { return schedule(); };

  g.TZNative = {
    perm: perm, request: request, schedule: schedule, test: test, diag: diag, exact: exact, openExact: openExact, openAutostart: openAutostart, device: device, requestBattery: requestBattery, clearFor: clearFor, dictate: dictate,
    onAction: function (fn) { handler = fn; var q = pending; pending = []; q.forEach(fn); }
  };
  setup();
})(window);
