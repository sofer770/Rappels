// שרת התזכורות: מגיש את האפליקציה, שומר מתי לשלוח כל התראה, ושולח Web Push בזמן.
// כל המידע נשמר ב-Durable Object אחד (SQLite). שעון מעורר (alarm) מעיר אותו בדיוק בזמן ההתראה הבאה,
// ו-cron כל דקה הוא גיבוי.
import { generateVapid, sendPush } from './push.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
      const hub = env.HUB.get(env.HUB.idFromName('main'));
      return hub.fetch(req);
    }
    const res = await env.ASSETS.fetch(req);
    if (url.pathname === '/sw.js' || url.pathname.endsWith('.html') || url.pathname === '/') {
      const r = new Response(res.body, res);
      r.headers.set('Cache-Control', 'no-cache');
      return r;
    }
    return res;
  },
  async scheduled(_ev, env, ctx) {
    const hub = env.HUB.get(env.HUB.idFromName('main'));
    ctx.waitUntil(hub.fetch('https://hub/api/_tick', { method: 'POST' }));
  }
};

const ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
const MAX_JOBS = 400;

export class Hub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, secret TEXT, sub TEXT, created INTEGER, seen INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS jobs (device TEXT, t INTEGER, payload TEXT)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS jobs_t ON jobs(t)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS jobs_d ON jobs(device)`);
  }

  kvGet(k) {
    const rows = this.sql.exec('SELECT v FROM kv WHERE k = ?', k).toArray();
    return rows.length ? rows[0].v : null;
  }
  kvSet(k, v) { this.sql.exec('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)', k, v); }

  async vapid() {
    if (this._vapid) return this._vapid;
    let v = this.kvGet('vapid');
    if (!v) { v = JSON.stringify(await generateVapid()); this.kvSet('vapid', v); }
    this._vapid = JSON.parse(v);
    return this._vapid;
  }
  subject() { return 'https://' + (this.kvGet('host') || 'tz.el-habriut.co.il'); }

  auth(id, secret, create) {
    if (!ID_RE.test(id || '') || !ID_RE.test(secret || '')) return 'bad';
    const rows = this.sql.exec('SELECT secret FROM devices WHERE id = ?', id).toArray();
    if (!rows.length) {
      if (!create) return 'missing';
      this.sql.exec('INSERT INTO devices (id, secret, sub, created, seen) VALUES (?, ?, NULL, ?, ?)', id, secret, Date.now(), Date.now());
      return 'ok';
    }
    return rows[0].secret === secret ? 'ok' : 'forbidden';
  }

  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\//, '');
    try {
      if (path === 'key') {
        if (url.hostname !== 'hub') this.kvSet('host', url.hostname);
        return json({ key: (await this.vapid()).publicKey });
      }
      if (path === 'health') {
        const d = this.sql.exec('SELECT COUNT(*) AS c FROM devices').one().c;
        const j = this.sql.exec('SELECT COUNT(*) AS c FROM jobs').one().c;
        return json({ ok: true, devices: d, jobs: j, alarm: await this.state.storage.getAlarm() });
      }
      if (req.method !== 'POST') return json({ error: 'method' }, 405);
      if (path === '_tick') { const n = await this.run(); return json({ sent: n }); }

      const text = await req.text();
      if (text.length > 400000) return json({ error: 'too_big' }, 413);
      const body = JSON.parse(text || '{}');

      if (path === 'sync') {
        const a = this.auth(body.id, body.secret, true);
        if (a !== 'ok') return json({ error: a }, a === 'forbidden' ? 403 : 400);
        if (body.sub) {
          const s = body.sub;
          if (!s.endpoint || !/^https:\/\//.test(s.endpoint) || !s.keys || !s.keys.p256dh || !s.keys.auth) return json({ error: 'bad_sub' }, 400);
          this.sql.exec('UPDATE devices SET sub = ? WHERE id = ?', JSON.stringify({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }), body.id);
        }
        this.sql.exec('UPDATE devices SET seen = ? WHERE id = ?', Date.now(), body.id);
        const now = Date.now();
        const jobs = Array.isArray(body.jobs) ? body.jobs.slice(0, MAX_JOBS) : [];
        this.sql.exec('DELETE FROM jobs WHERE device = ? AND t > ?', body.id, now - 5000);
        let n = 0;
        for (const j of jobs) {
          const t = Number(j.t);
          if (!Number.isFinite(t) || t < now - 60000 || t > now + 800 * 86400000) continue;
          const p = {
            t, rid: String(j.rid || '').slice(0, 64), occ: Number(j.occ) || t, kind: String(j.kind || 'main').slice(0, 10),
            title: String(j.title || 'תזכורת').slice(0, 200), body: String(j.body || '').slice(0, 400), sound: String(j.sound || '').slice(0, 20)
          };
          this.sql.exec('INSERT INTO jobs (device, t, payload) VALUES (?, ?, ?)', body.id, Math.max(t, now), JSON.stringify(p));
          n++;
        }
        await this.reschedule();
        return json({ ok: true, jobs: n, push: !!this.sql.exec('SELECT sub FROM devices WHERE id = ?', body.id).one().sub });
      }

      if (path === 'test') {
        const a = this.auth(body.id, body.secret, false);
        if (a !== 'ok') return json({ error: a }, 403);
        const delay = Math.min(300, Math.max(0, Number(body.delay) || 0));
        const t = Date.now() + delay * 1000;
        const p = { t, rid: 'test', occ: t, kind: 'test', title: 'בדיקת התראה ✓', body: 'אם ההודעה הזו קפצה, התזכורות יגיעו גם כשהאפליקציה סגורה.', sound: '' };
        this.sql.exec('INSERT INTO jobs (device, t, payload) VALUES (?, ?, ?)', body.id, t, JSON.stringify(p));
        if (delay === 0) { await this.run(); return json({ ok: true, sent: true, status: this.lastStatus || null }); }
        await this.reschedule();
        return json({ ok: true, at: t });
      }

      if (path === 'forget') {
        const a = this.auth(body.id, body.secret, false);
        if (a !== 'ok') return json({ error: a }, 403);
        this.sql.exec('DELETE FROM jobs WHERE device = ?', body.id);
        this.sql.exec('DELETE FROM devices WHERE id = ?', body.id);
        return json({ ok: true });
      }
      return json({ error: 'not_found' }, 404);
    } catch (e) {
      return json({ error: 'server', detail: String(e && e.message || e) }, 500);
    }
  }

  async reschedule() {
    const row = this.sql.exec('SELECT MIN(t) AS t FROM jobs').one();
    if (!row || row.t == null) return;
    const want = Math.max(row.t, Date.now() + 200);
    const cur = await this.state.storage.getAlarm();
    if (cur == null || cur > want || cur < Date.now() - 60000) await this.state.storage.setAlarm(want);
  }

  async alarm() {
    await this.run();
  }

  async run() {
    const now = Date.now();
    const due = this.sql.exec(
      `SELECT jobs.rowid AS rid, jobs.device AS device, jobs.t AS t, jobs.payload AS payload, devices.sub AS sub
       FROM jobs JOIN devices ON devices.id = jobs.device WHERE jobs.t <= ? ORDER BY jobs.t LIMIT 300`, now + 1000).toArray();
    // משימות של מכשירים שנמחקו
    this.sql.exec('DELETE FROM jobs WHERE t <= ? AND device NOT IN (SELECT id FROM devices)', now + 1000);
    let sent = 0;
    if (due.length) {
      const vapid = await this.vapid();
      const subject = this.subject();
      const dead = new Set();
      for (let i = 0; i < due.length; i += 20) {
        await Promise.all(due.slice(i, i + 20).map(async (j) => {
          this.sql.exec('DELETE FROM jobs WHERE rowid = ?', j.rid);
          if (!j.sub || now - j.t > 12 * 3600000) return;
          try {
            const st = await sendPush(JSON.parse(j.sub), JSON.parse(j.payload), vapid, subject);
            this.lastStatus = st;
            if (st === 404 || st === 410) dead.add(j.device);
            else if (st < 300) sent++;
          } catch (e) { this.lastStatus = String(e && e.message || e); }
        }));
      }
      for (const d of dead) this.sql.exec('UPDATE devices SET sub = NULL WHERE id = ?', d);
    }
    // ניקוי מכשירים שלא נראו שנה
    this.sql.exec('DELETE FROM devices WHERE seen < ?', now - 365 * 86400000);
    const next = this.sql.exec('SELECT MIN(t) AS t FROM jobs').one();
    if (next && next.t != null) await this.state.storage.setAlarm(Math.max(next.t, Date.now() + 200));
    return sent;
  }
}
