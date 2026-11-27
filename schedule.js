/* תזכורון - חישוב מועדים. משותף לאפליקציה ול-Service Worker. */
(function (g) {
  'use strict';
  var MIN = 60000, HOUR = 3600000, DAY = 86400000;
  var HORIZON = 40 * DAY;      // כמה קדימה שולחים מועדים לשרת
  var PER_REMINDER = 40;       // מקסימום מועדים לכל תזכורת
  var MAX_JOBS = 400;          // מקסימום משימות לשרת
  var NAG_MAX = 60;            // מקסימום חזרות נודניק

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseLocal(s) {
    if (!s) return null;
    var p = String(s).split('T'), d = p[0].split('-').map(Number), t = (p[1] || '09:00').split(':').map(Number);
    return new Date(d[0], d[1] - 1, d[2], t[0] || 0, t[1] || 0, 0, 0);
  }
  function fmtLocal(dt) {
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) + 'T' + pad(dt.getHours()) + ':' + pad(dt.getMinutes());
  }
  function dayKey(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }
  function addMonthsClamp(base, months) {
    var y = base.getFullYear(), m = base.getMonth() + months, day = base.getDate();
    var last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(day, last), base.getHours(), base.getMinutes(), 0, 0);
  }
  function startOfDay(dt) { return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); }

  // ---- לוח עברי ----
  var hebFmt = null;
  function hebParts(dt) {
    if (!hebFmt) hebFmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
    var o = {};
    hebFmt.formatToParts(dt).forEach(function (p) { o[p.type] = p.value; });
    return { day: +o.day, month: o.month, year: +String(o.year).replace(/\D/g, '') };
  }
  function normHebMonth(m, leapTarget) {
    if (m === 'Adar II') return 'Adar';
    if (m === 'Adar I' && !leapTarget) return 'Adar';
    return m;
  }
  function isHebLeap(y) { return ((7 * y + 1) % 19) < 7; }
  function hebMatch(base, cand) {
    var leap = isHebLeap(cand.year);
    var bm = base.month === 'Adar I' ? (leap ? 'Adar I' : 'Adar') : normHebMonth(base.month, true);
    return normHebMonth(cand.month, leap) === bm && cand.day === base.day;
  }
  // המועד העברי הבא (באותה שעה) החל מתאריך from
  function nextHebrew(base, fromDate) {
    var bp = hebParts(base);
    var d = startOfDay(fromDate);
    if (d < startOfDay(base)) d = startOfDay(base);
    var fallback = null, lastMonthDay = null;
    for (var i = 0; i < 420; i++) {
      var c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, base.getHours(), base.getMinutes());
      var cp = hebParts(c);
      if (hebMatch(bp, cp)) return c;
      // יום 30 שאינו קיים בחודש מסוים: נופלים ליום 29
      if (bp.day === 30 && cp.day === 29 && hebMatch({ day: 29, month: bp.month }, cp)) lastMonthDay = c;
      if (lastMonthDay && cp.day === 1 && !fallback) { fallback = lastMonthDay; return fallback; }
    }
    return null;
  }

  // ---- מחולל מועדים ----
  function repeatOf(r) {
    var rep = r.repeat || { kind: 'none' };
    if (r.type === 'birthday') rep = { kind: rep.kind === 'hebYearly' ? 'hebYearly' : 'yearly', every: 1 };
    return rep;
  }
  function untilMs(rep) {
    if (!rep.until) return Infinity;
    var d = parseLocal(rep.until + 'T23:59');
    return d ? d.getTime() + 59999 : Infinity;
  }

  // כל המועדים בטווח [from, to], עד max פריטים
  function occurrences(r, from, to, max) {
    var base = parseLocal(r.start);
    if (!base || isNaN(base)) return [];
    var rep = repeatOf(r), out = [], n = Math.max(1, parseInt(rep.every, 10) || 1);
    var end = Math.min(to, untilMs(rep)), b = base.getTime();
    max = max || 1000;
    function push(t) { if (t >= from && t <= end && t >= b) out.push(t); }
    var k, t, i, dt;
    switch (rep.kind) {
      case 'minutes':
      case 'hours': {
        var step = n * (rep.kind === 'minutes' ? MIN : HOUR);
        k = Math.max(0, Math.ceil((from - b) / step));
        for (i = 0; i < max; i++) { t = b + (k + i) * step; if (t > end) break; push(t); }
        break;
      }
      case 'daily': {
        k = Math.max(0, Math.floor((from - b) / (n * DAY)) - 1);
        for (i = 0; out.length < max && i < max + 3; i++) {
          dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (k + i) * n, base.getHours(), base.getMinutes());
          if (dt.getTime() > end) break; push(dt.getTime());
        }
        break;
      }
      case 'weekly': {
        var days = (rep.days && rep.days.length) ? rep.days : [base.getDay()];
        var bws = new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay());
        var startD = startOfDay(new Date(Math.max(from, b)));
        var limitDays = Math.min(4000, 7 * n * (max + 2) + 14);
        for (i = 0; out.length < max && i < limitDays; i++) {
          dt = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate() + i, base.getHours(), base.getMinutes());
          if (dt.getTime() > end) break;
          if (days.indexOf(dt.getDay()) < 0) continue;
          var ws = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - dt.getDay());
          var wi = Math.round((ws - bws) / (7 * DAY));
          if (wi % n === 0) push(dt.getTime());
        }
        break;
      }
      case 'monthly':
        if (rep.mdays && rep.mdays.length) {
          var sD = startOfDay(new Date(Math.max(from, b)));
          var lim = Math.min(4000, 31 * n * (max + 2) + 31);
          for (i = 0; out.length < max && i < lim; i++) {
            dt = new Date(sD.getFullYear(), sD.getMonth(), sD.getDate() + i, base.getHours(), base.getMinutes());
            if (dt.getTime() > end) break;
            var mi = (dt.getFullYear() - base.getFullYear()) * 12 + dt.getMonth() - base.getMonth();
            if (mi % n !== 0) continue;
            var lastD = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate(), dd = dt.getDate();
            var hit = rep.mdays.some(function (x) { x = +x; return x === dd || (x === -1 && dd === lastD) || (x > lastD && dd === lastD && x <= 31); });
            if (hit) push(dt.getTime());
          }
          break;
        }
        /* falls through */
      case 'yearly': {
        var mstep = rep.kind === 'monthly' ? n : 12 * n;
        var fd = new Date(Math.max(from, b));
        var monthsDiff = (fd.getFullYear() - base.getFullYear()) * 12 + fd.getMonth() - base.getMonth();
        k = Math.max(0, Math.floor(monthsDiff / mstep) - 1);
        for (i = 0; out.length < max && i < max + 3; i++) {
          dt = addMonthsClamp(base, (k + i) * mstep);
          if (dt.getTime() > end) break; push(dt.getTime());
        }
        break;
      }
      case 'hebYearly': {
        var cur = new Date(Math.max(from, b));
        for (i = 0; out.length < max && i < 60; i++) {
          dt = nextHebrew(base, cur);
          if (!dt || dt.getTime() > end) break;
          if (dt.getTime() < from) { cur = new Date(dt.getTime() + DAY); continue; }
          push(dt.getTime());
          cur = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 300);
        }
        break;
      }
      default:
        push(b);
    }
    return out.slice(0, max);
  }

  function isRecurring(r) { return r.type === 'birthday' || (r.repeat && r.repeat.kind && r.repeat.kind !== 'none'); }
  function nextAfter(r, t) { var o = occurrences(r, t + 1, Infinity, 1); return o.length ? o[0] : null; }
  function lastAtOrBefore(r, t, since) {
    var o = occurrences(r, Math.max(since, t - 400 * DAY), t, 2000);
    return o.length ? o[o.length - 1] : null;
  }

  // מועד שעבר ועדיין לא סומן "בוצע"
  // תזכורת לפי מיקום: אין לה שעה, היא קופצת כשמגיעים למקום או יוצאים ממנו
  function isLoc(r) { return !!(r && r.loc && typeof r.loc.lat === 'number'); }
  function pendingOcc(r, now) {
    if (r.done || r.paused || isLoc(r)) return null;
    var acked = r.ackedUntil || 0;
    if (!isRecurring(r)) {
      var b = parseLocal(r.start).getTime();
      return b <= now && b > acked ? b : null;
    }
    var last = lastAtOrBefore(r, now, acked + 1);
    return last && last > acked ? last : null;
  }

  // מצב לתצוגה: מתי התזכורת הבאה ומה מצבה
  function status(r, now) {
    if (r.done) return { state: 'done', at: r.doneAt || 0 };
    if (r.paused) return { state: 'paused', at: isLoc(r) ? null : nextAfter(r, now) };
    if (isLoc(r)) return { state: 'location', at: null };
    if (r.snoozeUntil && r.snoozeUntil > now) return { state: 'snoozed', at: r.snoozeUntil };
    var p = pendingOcc(r, now);
    if (r.snoozeUntil) return { state: 'overdue', at: Math.max(r.snoozeUntil, p || 0) };
    if (!isRecurring(r)) {
      if (p) return { state: 'overdue', at: p };
      var b = parseLocal(r.start).getTime();
      return b > now ? { state: 'upcoming', at: b } : { state: 'acked', at: b };
    }
    if (p && r.nag) return { state: 'overdue', at: p };
    var nx = nextAfter(r, now);
    return nx ? { state: 'upcoming', at: nx } : { state: 'ended', at: null };
  }

  function birthdayTitle(r, occ) {
    var name = r.title || '';
    var t = '🎂 יום הולדת ל' + name;
    if (r.birthYear && r.repeat && r.repeat.kind !== 'hebYearly') {
      var age = new Date(occ).getFullYear() - r.birthYear;
      if (age > 0 && age < 150) t += ' (' + age + ')';
    }
    return t;
  }
  function titleFor(r, occ) { return r.type === 'birthday' ? birthdayTitle(r, occ) : (r.title || 'תזכורת'); }
  function leadText(m) {
    if (m >= 1440 && m % 1440 === 0) return m === 1440 ? 'מחר' : 'בעוד ' + (m / 1440) + ' ימים';
    if (m >= 60 && m % 60 === 0) return m === 60 ? 'בעוד שעה' : 'בעוד ' + (m / 60) + ' שעות';
    return 'בעוד ' + m + ' דקות';
  }

  // רשימת המשימות שהשרת ישלח כהתראות
  function buildJobs(list, now, opts) {
    opts = opts || {};
    var jobs = [];
    (list || []).forEach(function (r) {
      if (!r || r.done || r.paused || r.deleted || isLoc(r)) return;
      var nag = Math.max(0, parseInt(r.nag, 10) || 0) * MIN;
      var lead = Math.max(0, parseInt(r.lead, 10) || 0) * MIN;
      var body = (r.notes || '').slice(0, 300);
      function add(t, kind, occ, title) {
        jobs.push({ t: t, rid: r.id, occ: occ, kind: kind, title: title.slice(0, 180), body: body, sound: r.sound || opts.sound || 'chime' });
      }
      var p = pendingOcc(r, now);
      var snoozeOn = r.snoozeUntil && r.snoozeUntil > now;
      if (snoozeOn) add(r.snoozeUntil, 'snooze', p || r.snoozeUntil, '💤 ' + titleFor(r, p || now));
      // נודניק על מועד שעבר
      var nagFrom = snoozeOn ? r.snoozeUntil : Math.max(r.snoozeUntil || 0, p || 0);
      if (nag && nagFrom) {
        var nextOcc = isRecurring(r) ? nextAfter(r, now) : null;
        for (var k = 1, c = 0; k <= NAG_MAX && c < 30; k++) {
          var tn = nagFrom + k * nag;
          if (tn <= now) continue;
          if (nextOcc && tn >= nextOcc) break;
          add(tn, 'nag', p || nagFrom, '⏰ ' + titleFor(r, p || nagFrom)); c++;
        }
      }
      // מועדים עתידיים
      var occs = occurrences(r, now + 1, now + HORIZON, PER_REMINDER);
      if (!occs.length) { var nx = nextAfter(r, now); if (nx) occs = [nx]; }
      occs.forEach(function (o, idx) {
        if (lead && o - lead > now) add(o - lead, 'lead', o, '🔔 ' + leadText(lead / MIN) + ': ' + titleFor(r, o));
        add(o, 'main', o, titleFor(r, o));
        if (nag && idx === 0) {
          var nx2 = occs[1] || nextAfter(r, o);
          for (var j = 1; j <= 10; j++) {
            var tj = o + j * nag;
            if (nx2 && tj >= nx2) break;
            add(tj, 'nag', o, '⏰ ' + titleFor(r, o));
          }
        }
      });
    });
    jobs.sort(function (a, b) { return a.t - b.t; });
    return jobs.slice(0, MAX_JOBS);
  }

  function markDone(r, now) {
    var rec = isRecurring(r);
    var p = pendingOcc(r, now);
    var occ = p || (rec ? nextAfter(r, now) : parseLocal(r.start).getTime());
    r.history = (r.history || []).concat([{ at: now, occ: occ }]).slice(-30);
    r.snoozeUntil = null;
    if (!rec) { r.done = true; r.doneAt = now; }
    else r.ackedUntil = Math.max(r.ackedUntil || 0, occ || now);
    r.updated = now;
    return r;
  }
  function snooze(r, now, minutes) {
    var p = pendingOcc(r, now);
    if (p) r.ackedUntil = Math.max(r.ackedUntil || 0, p);
    r.snoozeUntil = now + minutes * MIN;
    r.updated = now;
    return r;
  }

  // מועדים לתצוגת לוח שנה
  function inRange(list, from, to) {
    var res = [];
    (list || []).forEach(function (r) {
      if (!r || r.deleted) return;
      occurrences(r, from, to, 400).forEach(function (t) { res.push({ t: t, r: r }); });
    });
    res.sort(function (a, b) { return a.t - b.t; });
    return res;
  }

  g.Sched = {
    MIN: MIN, HOUR: HOUR, DAY: DAY,
    parseLocal: parseLocal, fmtLocal: fmtLocal, dayKey: dayKey, pad: pad,
    occurrences: occurrences, nextAfter: nextAfter, pendingOcc: pendingOcc, status: status,
    buildJobs: buildJobs, markDone: markDone, snooze: snooze, inRange: inRange,
    isRecurring: isRecurring, isLoc: isLoc, titleFor: titleFor, hebParts: hebParts, leadText: leadText
  };
})(typeof self !== 'undefined' ? self : globalThis);
