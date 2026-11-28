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
const SERVER_VERSION = '2026-11-28a'; // מאפשר לבדוק שהשרת באמת עודכן

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
    // סנכרון בין מכשירים: קבוצה = כמה מכשירים של אותו אדם, מחוברים בקוד
    this.sql.exec(`CREATE TABLE IF NOT EXISTS groups (gid TEXT PRIMARY KEY, key TEXT, created INTEGER, seen INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS codes (code TEXT PRIMARY KEY, gid TEXT, exp INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS items (gid TEXT, id TEXT, data TEXT, updated INTEGER, deleted INTEGER, seq INTEGER, PRIMARY KEY (gid, id))`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS items_s ON items(gid, seq)`);
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

  // ---------- סנכרון תזכורות בין מכשירים ----------
  groupAuth(gid, key) {
    if (!ID_RE.test(gid || '') || !ID_RE.test(key || '')) return false;
    const r = this.sql.exec('SELECT key FROM groups WHERE gid = ?', gid).toArray();
    if (!r.length || r[0].key !== key) return false;
    this.sql.exec('UPDATE groups SET seen = ? WHERE gid = ?', Date.now(), gid);
    return true;
  }
  newCode(gid) {
    const now = Date.now();
    this.sql.exec('DELETE FROM codes WHERE exp < ?', now);
    for (let i = 0; i < 20; i++) {
      const a = new Uint32Array(1); crypto.getRandomValues(a);
      const code = String(a[0] % 1000000).padStart(6, '0');
      if (this.sql.exec('SELECT 1 FROM codes WHERE code = ?', code).toArray().length) continue;
      this.sql.exec('INSERT INTO codes (code, gid, exp) VALUES (?, ?, ?)', code, gid, now + 15 * 60000);
      return code;
    }
    throw new Error('no code');
  }
  group(op, b) {
    const now = Date.now();
    if (op === 'create') {
      if (!ID_RE.test(b.gid || '') || !ID_RE.test(b.key || '')) return json({ error: 'bad' }, 400);
      const ex = this.sql.exec('SELECT key FROM groups WHERE gid = ?', b.gid).toArray();
      if (ex.length && ex[0].key !== b.key) return json({ error: 'forbidden' }, 403);
      if (!ex.length) this.sql.exec('INSERT INTO groups (gid, key, created, seen) VALUES (?, ?, ?, ?)', b.gid, b.key, now, now);
      return json({ ok: true, code: this.newCode(b.gid) });
    }
    if (op === 'join') {
      const code = String(b.code || '').replace(/\D/g, '');
      // הגנה מניחוש: לכל היותר 30 ניסיונות כושלים בדקה לכל השרת
      const fails = JSON.parse(this.kvGet('joinFails') || '[]').filter((t) => t > now - 60000);
      if (fails.length >= 30) return json({ error: 'busy' }, 429);
      const r = this.sql.exec('SELECT gid FROM codes WHERE code = ? AND exp > ?', code, now).toArray();
      if (!r.length) { fails.push(now); this.kvSet('joinFails', JSON.stringify(fails)); return json({ error: 'code' }, 404); }
      this.sql.exec('DELETE FROM codes WHERE code = ?', code);
      const g = this.sql.exec('SELECT gid, key FROM groups WHERE gid = ?', r[0].gid).one();
      return json({ ok: true, gid: g.gid, key: g.key });
    }
    if (!this.groupAuth(b.gid, b.key)) return json({ error: 'forbidden' }, 403);
    if (op === 'code') return json({ ok: true, code: this.newCode(b.gid) });
    if (op === 'push') {
      let n = 0, seq = Number(this.kvGet('seq') || 0);
      for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 500)) {
        if (!it || typeof it.id !== 'string' || it.id.length > 80) continue;
        const up = Math.min(Number(it.updated) || 0, now + 60000);
        const cur = this.sql.exec('SELECT updated FROM items WHERE gid = ? AND id = ?', b.gid, it.id).toArray();
        if (cur.length && cur[0].updated >= up) continue;
        const data = it.deleted ? null : JSON.stringify(it.data || null);
        if (data && data.length > 350000) continue;
        this.sql.exec('INSERT OR REPLACE INTO items (gid, id, data, updated, deleted, seq) VALUES (?, ?, ?, ?, ?, ?)', b.gid, it.id, data, up, it.deleted ? 1 : 0, ++seq);
        n++;
      }
      this.kvSet('seq', String(seq));
      return json({ ok: true, saved: n, seq });
    }
    if (op === 'pull') {
      const since = Number(b.since) || 0;
      const rows = this.sql.exec('SELECT id, data, updated, deleted, seq FROM items WHERE gid = ? AND seq > ? ORDER BY seq LIMIT 300', b.gid, since).toArray();
      return json({ ok: true, items: rows.map((r) => ({ id: r.id, data: r.data ? JSON.parse(r.data) : null, updated: r.updated, deleted: !!r.deleted })), more: rows.length === 300, seq: rows.length ? rows[rows.length - 1].seq : since });
    }
    if (op === 'devices') {
      return json({ ok: true, count: this.sql.exec('SELECT COUNT(*) AS c FROM items WHERE gid = ?', b.gid).one().c });
    }
    return json({ error: 'not_found' }, 404);
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
        return json({ ok: true, version: SERVER_VERSION, devices: d, jobs: j, alarm: await this.state.storage.getAlarm() });
      }
      if (req.method !== 'POST') return json({ error: 'method' }, 405);
      if (path === '_tick') { const n = await this.run(); return json({ sent: n }); }

      const text = await req.text();
      if (text.length > 400000) return json({ error: 'too_big' }, 413);
      const body = JSON.parse(text || '{}');

      if (path.startsWith('group/')) return this.group(path.slice(6), body);

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
        // בדיקות שתוזמנו ("בדיקה בעוד 30 שניות") נשארות גם כשהאפליקציה מסתנכרנת בינתיים
        this.sql.exec(`DELETE FROM jobs WHERE device = ? AND t > ? AND payload NOT LIKE '%"kind":"test"%'`, body.id, now - 5000);
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

      if (path === 'status') {
        const a = this.auth(body.id, body.secret, false);
        if (a !== 'ok') return json({ ok: false, error: a });
        const d = this.sql.exec('SELECT sub, seen FROM devices WHERE id = ?', body.id).one();
        const jobs = this.sql.exec('SELECT COUNT(*) AS c, MIN(t) AS t FROM jobs WHERE device = ?', body.id).one();
        let host = null; try { host = d.sub ? new URL(JSON.parse(d.sub).endpoint).host : null; } catch (e) {}
        const last = this.kvGet('st:' + body.id);
        return json({ ok: true, now: Date.now(), hasSub: !!d.sub, host, seen: d.seen, jobs: jobs.c, next: jobs.t, last: last ? JSON.parse(last) : null });
      }

      if (path === 'forget') {
        const a = this.auth(body.id, body.secret, false);
        if (a !== 'ok') return json({ error: a }, 403);
        this.sql.exec('DELETE FROM jobs WHERE device = ?', body.id);
        this.sql.exec('DELETE FROM devices WHERE id = ?', body.id);
        this.sql.exec('DELETE FROM kv WHERE k = ?', 'st:' + body.id);
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
            const sub = JSON.parse(j.sub);
            const r = await sendPush(sub, JSON.parse(j.payload), vapid, subject);
            const st = r.status;
            this.lastStatus = st;
            this.kvSet('st:' + j.device, JSON.stringify({ at: Date.now(), status: st, text: r.text, host: new URL(sub.endpoint).host }));
            if (st === 404 || st === 410) dead.add(j.device);
            else if (st < 300) sent++;
          } catch (e) {
            this.lastStatus = String(e && e.message || e);
            this.kvSet('st:' + j.device, JSON.stringify({ at: Date.now(), status: 0, text: this.lastStatus }));
          }
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
