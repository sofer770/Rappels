// בדיקות למנוע המועדים (schedule.js)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
process.env.TZ = 'Asia/Jerusalem';
const g = globalThis; g.self = g;
new Function(readFileSync(new URL('../schedule.js', import.meta.url), 'utf8'))();
const S = g.Sched;
const T = (s) => S.parseLocal(s).getTime();
const F = (t) => S.fmtLocal(new Date(t));
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('✓', name); };

ok('one-time', () => {
  const r = { id: 'a', start: '2026-12-01T09:00', repeat: { kind: 'none' } };
  assert.deepEqual(S.occurrences(r, T('2026-11-01T00:00'), Infinity, 5).map(F), ['2026-12-01T09:00']);
  assert.equal(S.nextAfter(r, T('2026-12-02T00:00')), null);
});
ok('daily every 2 days', () => {
  const r = { start: '2026-11-01T08:30', repeat: { kind: 'daily', every: 2 } };
  assert.deepEqual(S.occurrences(r, T('2026-11-10T00:00'), Infinity, 3).map(F), ['2026-11-11T08:30', '2026-11-13T08:30', '2026-11-15T08:30']);
});
ok('daily across DST keeps wall clock time', () => {
  const r = { start: '2026-03-20T07:00', repeat: { kind: 'daily', every: 1 } };
  const o = S.occurrences(r, T('2026-03-25T00:00'), T('2026-03-31T00:00'), 10).map(F);
  assert.ok(o.every((x) => x.endsWith('T07:00')), o.join());
});
ok('weekly specific days, every 2 weeks', () => {
  const r = { start: '2026-11-01T10:00', repeat: { kind: 'weekly', every: 2, days: [1, 3] } }; // Sun base, Mon+Wed
  assert.deepEqual(S.occurrences(r, T('2026-11-01T00:00'), Infinity, 4).map(F), ['2026-11-02T10:00', '2026-11-04T10:00', '2026-11-16T10:00', '2026-11-18T10:00']);
});
ok('monthly clamps 31st', () => {
  const r = { start: '2026-01-31T09:00', repeat: { kind: 'monthly', every: 1 } };
  assert.deepEqual(S.occurrences(r, T('2026-01-01T00:00'), Infinity, 3).map(F), ['2026-01-31T09:00', '2026-02-28T09:00', '2026-03-31T09:00']);
});
ok('monthly on chosen days incl. last day', () => {
  const r = { start: '2026-02-01T09:00', repeat: { kind: 'monthly', every: 1, mdays: [15, -1] } };
  assert.deepEqual(S.occurrences(r, T('2026-02-01T00:00'), Infinity, 4).map(F), ['2026-02-15T09:00', '2026-02-28T09:00', '2026-03-15T09:00', '2026-03-31T09:00']);
});
ok('yearly birthday with age', () => {
  const r = { type: 'birthday', title: 'דנה', start: '1992-02-29T09:00', birthYear: 1992, repeat: { kind: 'yearly' } };
  const nx = S.nextAfter(r, T('2027-01-01T00:00'));
  assert.equal(F(nx), '2027-02-28T09:00');
  assert.equal(S.titleFor(r, nx), '🎂 יום הולדת לדנה (35)');
});
ok('hebrew yearly', () => {
  // 26.11.2026 = ט"ז כסלו תשפ"ז. בשנה הבאה ט"ז כסלו תשפ"ח
  const r = { type: 'birthday', title: 'x', start: '2026-11-26T09:00', repeat: { kind: 'hebYearly' } };
  const nx = S.nextAfter(r, T('2026-11-27T00:00'));
  const p = S.hebParts(new Date(nx));
  assert.equal(p.month, 'Kislev'); assert.equal(p.day, 16); assert.equal(p.year, 5788);
});
ok('every 3 hours until date', () => {
  const r = { start: '2026-11-26T08:00', repeat: { kind: 'hours', every: 3, until: '2026-11-26' } };
  assert.deepEqual(S.occurrences(r, T('2026-11-26T00:00'), Infinity, 50).map(F), ['2026-11-26T08:00', '2026-11-26T11:00', '2026-11-26T14:00', '2026-11-26T17:00', '2026-11-26T20:00', '2026-11-26T23:00']);
});
ok('nag repeats on overdue one-time until done', () => {
  const now = T('2026-11-26T10:07');
  const r = { id: 'n', title: 'כדור', start: '2026-11-26T10:00', repeat: { kind: 'none' }, nag: 5 };
  assert.equal(S.status(r, now).state, 'overdue');
  const jobs = S.buildJobs([r], now);
  assert.equal(F(jobs[0].t), '2026-11-26T10:10');
  assert.equal(jobs[0].kind, 'nag');
  S.markDone(r, now);
  assert.equal(S.buildJobs([r], now).length, 0);
  assert.equal(S.status(r, now).state, 'done');
});
ok('snooze then nag continues after snooze', () => {
  const now = T('2026-11-26T10:01');
  const r = { id: 's', title: 'x', start: '2026-11-26T10:00', repeat: { kind: 'none' }, nag: 10 };
  S.snooze(r, now, 15);
  const jobs = S.buildJobs([r], now);
  assert.equal(jobs[0].kind, 'snooze'); assert.equal(F(jobs[0].t), '2026-11-26T10:16');
  assert.equal(F(jobs[1].t), '2026-11-26T10:26');
  assert.equal(S.status(r, now).state, 'snoozed');
  assert.equal(S.status(r, T('2026-11-26T10:20')).state, 'overdue');
});
ok('recurring done advances; lead alert', () => {
  const now = T('2026-11-26T09:30');
  const r = { id: 'd', title: 'ויטמין', start: '2026-11-01T09:00', repeat: { kind: 'daily', every: 1 }, nag: 15, lead: 10, ackedUntil: T('2026-11-25T09:00') };
  assert.equal(S.status(r, now).state, 'overdue');
  S.markDone(r, now);
  const st = S.status(r, now);
  assert.equal(st.state, 'upcoming'); assert.equal(F(st.at), '2026-11-27T09:00');
  const jobs = S.buildJobs([r], now);
  assert.equal(jobs[0].kind, 'lead'); assert.equal(F(jobs[0].t), '2026-11-27T08:50');
  assert.equal(jobs[1].kind, 'main');
});
ok('far yearly still schedules next occurrence beyond horizon', () => {
  const now = T('2026-11-26T12:00');
  const r = { id: 'y', type: 'birthday', title: 'x', start: '2000-06-01T09:00', repeat: { kind: 'yearly' } };
  const jobs = S.buildJobs([r], now);
  assert.equal(jobs.length, 1); assert.equal(F(jobs[0].t), '2027-06-01T09:00');
});
ok('jobs capped and sorted', () => {
  const now = T('2026-11-26T12:00');
  const list = Array.from({ length: 30 }, (_, i) => ({ id: 'm' + i, title: 't', start: '2026-11-26T12:30', repeat: { kind: 'minutes', every: 30 } }));
  const jobs = S.buildJobs(list, now);
  assert.equal(jobs.length, 400);
  for (let i = 1; i < jobs.length; i++) assert.ok(jobs[i].t >= jobs[i - 1].t);
});
console.log(`\n${n} schedule tests passed`);
