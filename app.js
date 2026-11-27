/* תזכורות - האפליקציה */
(function () {
  'use strict';
  var S = window.Sched, DB = window.Store, SND = window.Sounds, H = window.Heb;
  var NAT = window.TZNative || null; // באפליקציית האנדרואיד: התראות מקומיות בטלפון
  var MIN = 60000, DAY = 86400000;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }

  // ---------- אייקונים ----------
  var P = {
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    cake: '<path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7"/><path d="M5 16c2 1.5 4 1.5 7 0s5-1.5 7 0"/><path d="M12 12V8M12 5.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5z"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    done: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    zz: '<path d="M4 4h6l-6 7h6M14 12h6l-6 8h6"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    install: '<path d="M12 3v12M7 10l5 5 5-5"/><rect x="4" y="17" width="16" height="4" rx="1"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
    nag: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M2 5l2-2M22 5l-2-2"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a2 2 0 0 1 2-2h11"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    google: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M12 13v5M9.5 15.5h5"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    sub: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  function ic(n) { return '<svg class="i" viewBox="0 0 24 24">' + (P[n] || '') + '</svg>'; }

  // ---------- נתונים ----------
  var CATS = [
    { id: 'personal', name: 'אישי', color: '#6366f1' }, { id: 'work', name: 'עבודה', color: '#0ea5e9' },
    { id: 'health', name: 'בריאות', color: '#10b981' }, { id: 'family', name: 'משפחה', color: '#f43f5e' },
    { id: 'shopping', name: 'קניות', color: '#f59e0b' }, { id: 'home', name: 'בית', color: '#8b5cf6' },
    { id: 'other', name: 'אחר', color: '#64748b' }
  ];
  var catById = {}; CATS.forEach(function (c) { catById[c.id] = c; });
  var DEFAULTS = { theme: 'auto', accent: 'indigo', size: 'normal', sound: 'chime', volume: 0.8, loop: true, snoozeMin: 10, nag: 0, lead: 0, defaultTime: '09:00', bdayTime: '09:00', bdayLead: 1440, showHeb: true, pinHash: null, lockAfter: 1 };
  var state = { list: [], settings: Object.assign({}, DEFAULTS), tab: 'home', cat: 'all', q: '', calMonth: null, calSel: null, editing: null };
  var DOW = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  var DOW_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  function save(r) {
    r.updated = Date.now();
    var i = state.list.findIndex(function (x) { return x.id === r.id; });
    if (i >= 0) state.list[i] = r; else state.list.push(r);
    return DB.put(r).then(changed);
  }
  function remove(r) {
    state.list = state.list.filter(function (x) { return x.id !== r.id; });
    emit('tz:delete', { reminder: r });
    return DB.del(r.id).then(changed);
  }
  function saveSettings() { return DB.setMeta('settings', state.settings); }
  var syncT = null;
  function changed() {
    rebuildJobs();
    render();
    clearTimeout(syncT); syncT = setTimeout(function () { DB.sync(); }, 600);
  }

  // ---------- תאריכים לתצוגה ----------
  function hm(t) { var d = new Date(t); return S.pad(d.getHours()) + ':' + S.pad(d.getMinutes()); }
  function dayDiff(t) { var a = new Date(); a.setHours(0, 0, 0, 0); var b = new Date(t); b.setHours(0, 0, 0, 0); return Math.round((b - a) / DAY); }
  function whenLabel(t) {
    if (!t) return '';
    var d = new Date(t), dd = dayDiff(t), s;
    if (dd === 0) s = 'היום'; else if (dd === 1) s = 'מחר'; else if (dd === -1) s = 'אתמול'; else if (dd === 2) s = 'מחרתיים';
    else if (dd > 2 && dd < 7) s = 'יום ' + DOW_FULL[d.getDay()];
    else s = DOW[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + (d.getFullYear() !== new Date().getFullYear() ? '.' + d.getFullYear() : '');
    return s + ' ' + hm(t);
  }
  function relLabel(t) {
    var diff = t - Date.now(), a = Math.abs(diff), s;
    if (a < MIN) s = 'פחות מדקה'; else if (a < 60 * MIN) s = Math.round(a / MIN) + ' דק׳';
    else if (a < DAY) { var h = Math.floor(a / 3600000), m = Math.round((a % 3600000) / MIN); s = h + ' שע׳' + (m ? ' ו-' + m + ' דק׳' : ''); }
    else s = Math.round(a / DAY) + ' ימים';
    return diff >= 0 ? 'בעוד ' + s : 'לפני ' + s;
  }
  function repeatLabel(r) {
    if (r.type === 'birthday') return r.repeat && r.repeat.kind === 'hebYearly' ? 'כל שנה (תאריך עברי)' : 'כל שנה';
    var rep = r.repeat || {}, n = +rep.every || 1;
    switch (rep.kind) {
      case 'minutes': return 'כל ' + n + ' דק׳';
      case 'hours': return n === 1 ? 'כל שעה' : 'כל ' + n + ' שעות';
      case 'daily': return n === 1 ? 'כל יום' : 'כל ' + n + ' ימים';
      case 'weekly': var ds = (rep.days && rep.days.length ? rep.days : [S.parseLocal(r.start).getDay()]).slice().sort().map(function (d) { return DOW[d]; }).join(' '); return (n === 1 ? 'כל שבוע' : 'כל ' + n + ' שבועות') + ' · ' + ds;
      case 'monthly': return (n === 1 ? 'כל חודש' : 'כל ' + n + ' חודשים') + (rep.mdays && rep.mdays.length ? ' · ' + rep.mdays.map(function (x) { return +x === -1 ? 'אחרון' : x; }).join(', ') : '');
      case 'yearly': return n === 1 ? 'כל שנה' : 'כל ' + n + ' שנים';
      case 'hebYearly': return 'כל שנה (תאריך עברי)';
    }
    return '';
  }
  function nagLabel(m) { return m ? (m < 60 ? 'נודניק כל ' + m + ' דק׳' : 'נודניק כל ' + (m / 60) + ' שע׳') : ''; }

  // ---------- תצוגה ----------
  var view, toastT;
  function toast(msg, action, fn) {
    var t = $('#toast');
    t.innerHTML = esc(msg) + (action ? '<button>' + esc(action) + '</button>' : '');
    if (action) t.querySelector('button').onclick = function () { t.classList.remove('show'); fn(); };
    t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, action ? 5000 : 2600);
  }

  function itemHTML(r, now) {
    var st = S.status(r, now), cat = catById[r.category] || catById.other;
    var meta = [];
    if (st.state === 'overdue') meta.push('<span class="late">' + ic('clock') + ' ' + esc(whenLabel(st.at)) + ' (באיחור)</span>');
    else if (st.state === 'snoozed') meta.push('<span class="snz">' + ic('zz') + ' נדחה ל-' + esc(whenLabel(st.at)) + '</span>');
    else if (st.state === 'done') meta.push('<span>' + ic('check') + ' בוצע ' + esc(whenLabel(st.at)) + '</span>');
    else if (st.state === 'paused') meta.push('<span>' + ic('pause') + ' מושהה</span>');
    else if (st.state === 'ended') meta.push('<span>הסתיים</span>');
    else if (st.at) meta.push('<span>' + ic('clock') + ' ' + esc(whenLabel(st.at)) + '</span>');
    if (r.type === 'birthday' && st.at && st.state !== 'done') {
      var age = r.birthYear ? new Date(st.at).getFullYear() - r.birthYear : null;
      meta.push('<span>' + ic('cake') + (age && r.repeat.kind !== 'hebYearly' ? ' יהיה בן/בת ' + age : ' יום הולדת') + ' · ' + esc(relLabel(st.at)) + '</span>');
    } else if (S.isRecurring(r)) meta.push('<span>' + ic('repeat') + ' ' + esc(repeatLabel(r)) + '</span>');
    if (r.nag && r.type !== 'birthday') meta.push('<span>' + ic('nag') + ' ' + esc(nagLabel(r.nag)) + '</span>');
    if (r.subtasks && r.subtasks.length) meta.push('<span>' + ic('sub') + ' ' + r.subtasks.filter(function (s) { return s.done; }).length + '/' + r.subtasks.length + '</span>');
    if (state.settings.showHeb && st.at && (r.type === 'birthday' || r.repeat && r.repeat.kind === 'hebYearly')) meta.push('<span>' + esc(H.date(new Date(st.at)).short) + '</span>');
    var cls = 'item' + (r.done ? ' done' : '') + (r.priority === 'high' ? ' hi' : '') + (r.paused ? ' paused' : '');
    return '<div class="' + cls + '" style="--cat:' + cat.color + '" data-id="' + esc(r.id) + '">' +
      '<button class="check" data-act="done" aria-label="סימון כבוצע">' + (r.done ? ic('check') : '') + '</button>' +
      '<div class="body" data-act="edit"><div class="title">' + (r.type === 'birthday' ? '🎂 ' : '') + esc(r.title || 'ללא כותרת') + '</div><div class="meta">' + meta.join('') + '</div></div>' +
      '<span class="tz-voice-badge" data-id="' + esc(r.id) + '"' + (r.voiceId ? ' data-voice-id="' + esc(r.voiceId) + '"' : '') + '></span>' +
      (r.image ? '<img class="thumb" src="' + r.image + '" alt="" data-act="edit">' : '') +
      (!r.done ? '<div class="acts"><button class="mini" data-act="snoozemenu" aria-label="דחייה">' + ic('zz') + '</button></div>' : '') +
      '</div>';
  }

  function sorted(filterFn) {
    var now = Date.now();
    return state.list.filter(function (r) { return !r.deleted && filterFn(r); }).map(function (r) { return { r: r, st: S.status(r, now) }; })
      .sort(function (a, b) { return (a.st.at || 9e15) - (b.st.at || 9e15); });
  }
  function matchQ(r) {
    if (state.cat !== 'all' && r.category !== state.cat) return false;
    if (!state.q) return true;
    var q = state.q.toLowerCase();
    return (r.title || '').toLowerCase().indexOf(q) >= 0 || (r.notes || '').toLowerCase().indexOf(q) >= 0;
  }
  function section(title, arr, cls) {
    if (!arr.length) return '';
    var now = Date.now();
    return '<div class="section-title ' + (cls || '') + '">' + esc(title) + ' <span class="count">' + arr.length + '</span></div>' + arr.map(function (x) { return itemHTML(x.r, now); }).join('');
  }

  function renderHome() {
    var now = Date.now(), all = sorted(function (r) { return !r.done; });
    var overdue = all.filter(function (x) { return x.st.state === 'overdue'; });
    var active = all.filter(function (x) { return x.st.state !== 'overdue' && x.st.at && x.st.state !== 'paused' && x.st.state !== 'ended'; });
    var today = active.filter(function (x) { return dayDiff(x.st.at) === 0; });
    var tomorrow = active.filter(function (x) { return dayDiff(x.st.at) === 1; });
    var week = active.filter(function (x) { var d = dayDiff(x.st.at); return d > 1 && d < 7; });
    var bdays = state.list.filter(function (r) { return r.type === 'birthday' && !r.deleted; }).map(function (r) { return S.nextAfter(r, now - 1); }).filter(function (t) { return t && t - now < 30 * DAY; });
    var next = active[0];
    var h = '<div class="widgets">';
    h += '<button class="widget hero" data-go="' + (next ? 'edit:' + next.r.id : 'new') + '">' + (next
      ? '<div class="l">' + ic('bell') + ' התזכורת הבאה · ' + esc(whenLabel(next.st.at)) + '</div><div class="t">' + esc(S.titleFor(next.r, next.st.at)) + '</div><div class="cd" data-countdown="' + next.st.at + '">' + esc(countdown(next.st.at)) + '</div>'
      : '<div class="t">אין תזכורות קרובות</div><div class="l">לחצו כאן כדי להוסיף תזכורת ראשונה</div>') + '</button>';
    h += '<button class="widget red" data-go="list"><div class="n">' + overdue.length + '</div><div class="l">באיחור</div></button>';
    h += '<button class="widget acc" data-go="list"><div class="n">' + today.length + '</div><div class="l">היום</div></button>';
    h += '<button class="widget amber" data-go="list"><div class="n">' + (tomorrow.length + week.length) + '</div><div class="l">השבוע</div></button>';
    h += '<button class="widget green" data-go="bday"><div class="n">' + bdays.length + '</div><div class="l">ימי הולדת ב-30 יום</div></button>';
    h += '</div>';
    h += '<form class="quick" id="quick"><input id="quick-in" placeholder="הוספה מהירה: למשל ״לקחת ויטמין מחר ב-8״" autocomplete="off" enterkeyhint="done"><button class="icon-btn" type="button" id="quick-mic" aria-label="הקלטה">' + ic('mic') + '</button><button class="icon-btn" type="submit" aria-label="הוספה" style="background:var(--accent);color:#fff">' + ic('plus') + '</button></form>';
    h += '<div class="hint">אפשר לכתוב או להגיד: ״בעוד 20 דקות״, ״מחר ב-9״, ״ביום שלישי בערב״, ״כל יום ב-8״</div>';
    h += section('באיחור', overdue, 'red') + section('היום', today) + section('מחר', tomorrow) + section('בהמשך השבוע', week);
    if (!overdue.length && !today.length && !tomorrow.length && !week.length) h += '<div class="empty"><div class="big">🌿</div>השבוע פנוי. לחצו על + כדי להוסיף תזכורת.</div>';
    return h;
  }
  function countdown(t) {
    var d = Math.max(0, t - Date.now()), days = Math.floor(d / DAY), h = Math.floor(d % DAY / 3600000), m = Math.floor(d % 3600000 / MIN), s = Math.floor(d % MIN / 1000);
    if (days > 0) return days + ' ימים ו-' + h + ' שעות';
    return S.pad(h) + ':' + S.pad(m) + ':' + S.pad(s);
  }
  function catChips() {
    var counts = {}; state.list.forEach(function (r) { if (!r.done && !r.deleted) counts[r.category] = (counts[r.category] || 0) + 1; });
    return '<div class="chips"><button class="chip' + (state.cat === 'all' ? ' on' : '') + '" data-cat="all">הכל</button>' + CATS.map(function (c) {
      return '<button class="chip' + (state.cat === c.id ? ' on' : '') + '" data-cat="' + c.id + '"><span class="dot" style="background:' + c.color + '"></span>' + c.name + (counts[c.id] ? ' (' + counts[c.id] + ')' : '') + '</button>';
    }).join('') + '</div>';
  }
  function renderList() {
    var all = sorted(function (r) { return !r.done && r.type !== 'birthday' && matchQ(r); });
    var h = '<input class="input search" id="search" type="search" placeholder="חיפוש בתזכורות..." value="' + esc(state.q) + '">' + catChips();
    var o = all.filter(function (x) { return x.st.state === 'overdue'; });
    var t = all.filter(function (x) { return x.st.state !== 'overdue' && x.st.at && dayDiff(x.st.at) === 0 && x.st.state !== 'paused'; });
    var u = all.filter(function (x) { return x.st.state !== 'overdue' && x.st.at && dayDiff(x.st.at) > 0 && x.st.state !== 'paused'; });
    var rec = all.filter(function (x) { return S.isRecurring(x.r) && x.st.state !== 'paused'; });
    var p = all.filter(function (x) { return x.st.state === 'paused' || x.st.state === 'ended' || !x.st.at; });
    h += section('באיחור', o, 'red') + section('היום', t) + section('בהמשך', u) + section('מושהות והסתיימו', p);
    if (!all.length) h += '<div class="empty"><div class="big">📝</div>' + (state.q ? 'לא נמצאו תזכורות' : 'אין תזכורות פעילות') + '</div>';
    else if (rec.length) h += '<div class="small" style="text-align:center;margin-top:10px">' + rec.length + ' תזכורות חוזרות פעילות</div>';
    return h;
  }
  function renderBdays() {
    var now = Date.now();
    var all = state.list.filter(function (r) { return r.type === 'birthday' && !r.deleted && matchQ(r); }).map(function (r) { return { r: r, st: { state: 'upcoming', at: S.nextAfter(r, now - DAY) } }; })
      .sort(function (a, b) { return (a.st.at || 9e15) - (b.st.at || 9e15); });
    var h = '<button class="btn primary block" data-go="newbday" style="margin-bottom:12px">' + ic('cake') + ' הוספת יום הולדת</button>';
    if (!all.length) return h + '<div class="empty"><div class="big">🎂</div>עוד לא נוספו ימי הולדת.<br>אפשר לבחור תאריך לועזי או עברי, והאפליקציה תזכיר כל שנה ותחשב את הגיל.</div>';
    return h + all.map(function (x) { return itemHTML(x.r, now); }).join('');
  }
  function renderDone() {
    var all = state.list.filter(function (r) { return r.done && !r.deleted; }).sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
    var hist = [];
    state.list.forEach(function (r) { if (!r.done && S.isRecurring(r)) (r.history || []).forEach(function (hh) { hist.push({ r: r, at: hh.at }); }); });
    hist.sort(function (a, b) { return b.at - a.at; });
    var h = '';
    if (all.length) h += '<div class="row" style="margin-bottom:8px"><div class="small">' + all.length + ' תזכורות שבוצעו</div><button class="btn danger none" data-go="cleardone">' + ic('trash') + ' ניקוי הכל</button></div>' + all.map(function (r) { return itemHTML(r, Date.now()); }).join('');
    if (hist.length) h += '<div class="section-title">היסטוריית תזכורות חוזרות</div><div class="card">' + hist.slice(0, 40).map(function (x) { return '<div class="switch"><span>' + ic('check') + ' ' + esc(x.r.title) + '</span><span class="small">' + esc(whenLabel(x.at)) + '</span></div>'; }).join('') + '</div>';
    if (!h) h = '<div class="empty"><div class="big">✅</div>כאן יופיעו תזכורות שסימנתם כבוצעו</div>';
    return h;
  }
  function renderCal() {
    var now = new Date(), m = state.calMonth || new Date(now.getFullYear(), now.getMonth(), 1);
    state.calMonth = m;
    var first = new Date(m.getFullYear(), m.getMonth(), 1), start = new Date(first); start.setDate(1 - first.getDay());
    var end = new Date(start); end.setDate(start.getDate() + 42);
    var occ = S.inRange(state.list.filter(function (r) { return !r.done; }), start.getTime(), end.getTime());
    state.list.forEach(function (r) { if (r.done && r.doneAt) { var t = S.parseLocal(r.start).getTime(); if (t >= start && t < end) occ.push({ t: t, r: r }); } });
    var byDay = {}; occ.forEach(function (o) { var k = S.dayKey(new Date(o.t)); (byDay[k] = byDay[k] || []).push(o); });
    var hFirst = H.date(first), hLast = H.date(new Date(m.getFullYear(), m.getMonth() + 1, 0));
    var hebTitle = hFirst.monthH + (hFirst.monthH !== hLast.monthH ? ' - ' + hLast.monthH : '') + ' ' + hLast.yearH;
    var h = '<div class="cal-head"><button class="icon-btn" data-cal="-1" aria-label="חודש קודם">' + ic('right') + '</button><div class="m"><b>' + MONTHS[m.getMonth()] + ' ' + m.getFullYear() + '</b><span>' + esc(hebTitle) + '</span></div><button class="icon-btn" data-cal="1" aria-label="חודש הבא">' + ic('left') + '</button></div>';
    h += '<div class="cal">' + DOW.map(function (d) { return '<div class="dow">' + d + '</div>'; }).join('');
    var sel = state.calSel || S.dayKey(now);
    for (var i = 0; i < 42; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), k = S.dayKey(d), hd = H.date(d), hol = H.holidays(d);
      var cls = 'd' + (d.getMonth() !== m.getMonth() ? ' out' : '') + (k === S.dayKey(now) ? ' today' : '') + (k === sel ? ' sel' : '') + (d.getDay() === 6 ? ' sat' : '');
      var dots = (byDay[k] || []).slice(0, 4).map(function (o) { return '<i style="background:' + (catById[o.r.category] || catById.other).color + '"></i>'; }).join('');
      h += '<button class="' + cls + '" data-day="' + k + '"><span class="g">' + d.getDate() + '</span>' + (state.settings.showHeb ? '<span class="h">' + hd.dayH + '</span>' : '') +
        (hol.length ? '<span class="hol ' + hol[0].kind + '">' + esc(hol[0].name) + '</span>' : '') + '<span class="dots">' + dots + '</span></button>';
      if (i === 34 && d.getMonth() !== m.getMonth() && new Date(start.getFullYear(), start.getMonth(), start.getDate() + 35).getMonth() !== m.getMonth()) break;
    }
    h += '</div>';
    var sd = S.parseLocal(sel + 'T00:00'), sh = H.date(sd), shol = H.holidays(sd);
    var list = (byDay[sel] || []);
    h += '<div class="day-panel"><div class="hd"><div><b>יום ' + DOW_FULL[sd.getDay()] + ', ' + sd.getDate() + ' ב' + MONTHS[sd.getMonth()] + '</b><small>' + esc(sh.full) + (shol.length ? ' · ' + esc(shol.map(function (x) { return x.name; }).join(', ')) : '') + '</small></div><button class="btn" data-go="newday:' + sel + '">' + ic('plus') + ' הוספה</button></div>';
    h += list.length ? list.map(function (o) {
      var r = o.r, cat = catById[r.category] || catById.other;
      return '<div class="item' + (r.done ? ' done' : '') + '" style="--cat:' + cat.color + '" data-id="' + esc(r.id) + '"><div class="check" style="border:0;color:var(--muted);width:auto;font-size:.85em">' + hm(o.t) + '</div><div class="body" data-act="edit"><div class="title">' + esc(S.titleFor(r, o.t)) + '</div>' + (S.isRecurring(r) ? '<div class="meta"><span>' + ic('repeat') + ' ' + esc(repeatLabel(r)) + '</span></div>' : '') + '</div></div>';
    }).join('') : '<div class="empty" style="padding:16px">אין תזכורות ביום הזה</div>';
    h += '</div>';
    return h;
  }

  function render() {
    view = view || $('#view');
    var fn = { home: renderHome, list: renderList, cal: renderCal, bday: renderBdays, done: renderDone }[state.tab] || renderHome;
    var focusSearch = document.activeElement && document.activeElement.id === 'search';
    var qi = $('#quick-in'), qv = qi ? qi.value : '', qf = qi && document.activeElement === qi;
    view.innerHTML = fn();
    var qn = $('#quick-in'); if (qn && qv) qn.value = qv; if (qn && qf) qn.focus();
    $$('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === state.tab); });
    var now = new Date(), hd = H.date(now);
    $('#today-label').textContent = 'יום ' + DOW_FULL[now.getDay()] + ', ' + now.getDate() + ' ב' + MONTHS[now.getMonth()] + (state.settings.showHeb ? ' · ' + hd.full : '');
    if (focusSearch) { var s = $('#search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    emit('tz:render', { tab: state.tab, el: view });
  }

  // ---------- אירועי תצוגה ----------
  function findR(id) { return state.list.find(function (r) { return r.id === id; }); }
  function onViewClick(e) {
    var go = e.target.closest('[data-go]'), act = e.target.closest('[data-act]'), item = e.target.closest('[data-id]');
    if (act && item && item.dataset.id && act.dataset.act) {
      var r = findR(item.dataset.id); if (!r) return;
      if (act.dataset.act === 'edit') return openEditor(r);
      if (act.dataset.act === 'done') {
        if (r.done) { r.done = false; r.doneAt = null; save(r); return; }
        var copy = JSON.parse(JSON.stringify(r));
        S.markDone(r, Date.now()); save(r); closeNotif(r.id);
        toast(S.isRecurring(r) ? 'סומן כבוצע. הפעם הבאה: ' + whenLabel(S.nextAfter(r, Date.now())) : 'כל הכבוד, בוצע ✓', 'ביטול', function () { save(copy); });
        return;
      }
      if (act.dataset.act === 'snoozemenu') return snoozeMenu(r, act);
    }
    if (go) {
      var g = go.dataset.go;
      if (g === 'new') return openEditor(null);
      if (g === 'newbday') return openEditor(null, { type: 'birthday' });
      if (g.indexOf('newday:') === 0) return openEditor(null, { start: g.slice(7) + 'T' + state.settings.defaultTime });
      if (g.indexOf('edit:') === 0) { var rr = findR(g.slice(5)); if (rr) openEditor(rr); return; }
      if (g === 'cleardone') {
        if (!confirm('למחוק את כל התזכורות שבוצעו?')) return;
        state.list.filter(function (x) { return x.done; }).forEach(function (x) { remove(x); });
        return;
      }
      if (['list', 'bday', 'cal', 'home', 'done'].indexOf(g) >= 0) return setTab(g);
    }
    var cat = e.target.closest('[data-cat]'); if (cat) { state.cat = cat.dataset.cat; render(); return; }
    var cal = e.target.closest('[data-cal]');
    if (cal) { var m = state.calMonth; state.calMonth = new Date(m.getFullYear(), m.getMonth() + (+cal.dataset.cal), 1); render(); return; }
    var day = e.target.closest('[data-day]');
    if (day) { state.calSel = day.dataset.day; var dd = S.parseLocal(day.dataset.day + 'T00:00'); if (dd.getMonth() !== state.calMonth.getMonth()) state.calMonth = new Date(dd.getFullYear(), dd.getMonth(), 1); render(); }
  }
  function setTab(t) { state.tab = t; render(); window.scrollTo(0, 0); }

  function snoozeMenu(r, anchor) {
    closeMenu();
    var m = document.createElement('div'); m.className = 'menu';
    var opts = [[5, '5 דקות'], [10, '10 דקות'], [15, '15 דקות'], [30, 'חצי שעה'], [60, 'שעה'], [180, '3 שעות'], ['tm', 'מחר בבוקר'], ['dn', 'סימון כבוצע']];
    m.innerHTML = opts.map(function (o) { return '<button data-v="' + o[0] + '">' + (o[0] === 'dn' ? ic('check') : ic('zz')) + ' ' + o[1] + '</button>'; }).join('');
    document.body.appendChild(m);
    var rc = anchor.getBoundingClientRect();
    m.style.top = Math.min(window.innerHeight - m.offsetHeight - 10, rc.bottom + 4) + 'px';
    m.style.left = Math.max(10, rc.left) + 'px';
    m.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      doSnooze(r, b.dataset.v); closeMenu();
    };
    setTimeout(function () { document.addEventListener('click', closeMenu, { once: true }); }, 0);
  }
  function closeMenu() { $$('.menu').forEach(function (m) { m.remove(); }); }
  function doSnooze(r, v) {
    var now = Date.now();
    if (v === 'dn') { S.markDone(r, now); save(r); closeNotif(r.id); toast('בוצע ✓'); return; }
    var mins;
    if (v === 'tm') { var t = new Date(); t.setDate(t.getDate() + 1); var p = state.settings.defaultTime.split(':'); t.setHours(+p[0], +p[1], 0, 0); mins = Math.round((t - now) / MIN); }
    else mins = +v;
    S.snooze(r, now, mins); save(r); closeNotif(r.id);
    toast('נדחה ל-' + whenLabel(r.snoozeUntil));
  }

  // ---------- עורך תזכורת ----------
  function blank(over) {
    var st = state.settings, t = new Date(Date.now() + 60 * MIN); t.setMinutes(Math.ceil(t.getMinutes() / 5) * 5, 0, 0);
    var r = { id: DB.rid(16), type: 'task', title: '', notes: '', start: S.fmtLocal(t), repeat: { kind: 'none', every: 1, days: [], mdays: [], until: '' }, lead: st.lead, nag: st.nag, sound: '', category: 'personal', priority: 'normal', image: null, subtasks: [], created: Date.now() };
    if (over && over.type === 'birthday') {
      var d = new Date(); r.type = 'birthday'; r.start = S.dayKey(d) + 'T' + st.bdayTime; r.repeat = { kind: 'yearly', every: 1 }; r.lead = st.bdayLead; r.nag = 0; r.category = 'family'; r.birthYear = null;
    }
    return Object.assign(r, over && over.type !== 'birthday' ? over : {});
  }
  function openSheet(html, cls) {
    closeSheet();
    var w = document.createElement('div'); w.className = 'sheet-wrap'; w.id = 'sheet-wrap';
    w.innerHTML = '<div class="sheet ' + (cls || '') + '" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div>';
    w.addEventListener('click', function (e) { if (e.target === w) closeSheet(); });
    document.body.appendChild(w); document.body.style.overflow = 'hidden';
    return w.firstChild;
  }
  function closeSheet() { var w = $('#sheet-wrap'); if (w) w.remove(); document.body.style.overflow = ''; SND.stop(); if (state.editing) emit('tz:editor-close', { reminder: state.editing }); state.editing = null; }

  var REPEATS = [['none', 'חד פעמי'], ['daily', 'כל יום / כל כמה ימים'], ['weekly', 'שבועי (ימים נבחרים)'], ['monthly', 'חודשי'], ['yearly', 'שנתי'], ['hebYearly', 'שנתי לפי תאריך עברי'], ['hours', 'כל כמה שעות'], ['minutes', 'כל כמה דקות']];
  var LEADS = [[0, 'בלי'], [5, '5 דקות לפני'], [10, '10 דקות לפני'], [15, 'רבע שעה לפני'], [30, 'חצי שעה לפני'], [60, 'שעה לפני'], [120, 'שעתיים לפני'], [1440, 'יום לפני'], [2880, 'יומיים לפני'], [10080, 'שבוע לפני']];
  var NAGS = [[0, 'כבוי'], [1, 'כל דקה'], [2, 'כל 2 דקות'], [5, 'כל 5 דקות'], [10, 'כל 10 דקות'], [15, 'כל רבע שעה'], [30, 'כל חצי שעה'], [60, 'כל שעה']];
  function opts(list, val) { return list.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); }

  function openEditor(r, over) {
    var isNew = !r;
    var e = isNew ? blank(over) : JSON.parse(JSON.stringify(r));
    e.repeat = Object.assign({ kind: 'none', every: 1, days: [], mdays: [], until: '' }, e.repeat || {});
    state.editing = e;
    var sheet = openSheet('<form id="ed" novalidate></form>');
    var form = $('#ed', sheet);
    function draw() {
      var bd = e.type === 'birthday', rep = e.repeat, base = S.parseLocal(e.start) || new Date();
      var date = e.start.slice(0, 10), time = e.start.slice(11, 16);
      var h = '<h2><span class="grow">' + (isNew ? (bd ? 'יום הולדת חדש' : 'תזכורת חדשה') : (bd ? 'עריכת יום הולדת' : 'עריכת תזכורת')) + '</span><button type="button" class="icon-btn" data-x="close" aria-label="סגירה">' + ic('x') + '</button></h2>';
      h += '<div class="seg"><button type="button" data-type="task" class="' + (!bd ? 'on' : '') + '">' + ic('bell') + ' תזכורת</button><button type="button" data-type="birthday" class="' + (bd ? 'on' : '') + '">' + ic('cake') + ' יום הולדת</button></div>';
      h += '<div class="card">';
      h += '<div class="field"><label for="f-title">' + (bd ? 'של מי יום ההולדת?' : 'מה להזכיר?') + '</label><div class="row"><input class="input" id="f-title" value="' + esc(e.title) + '" placeholder="' + (bd ? 'למשל: אמא' : 'למשל: לקחת ויטמין D') + '" autocomplete="off"><button type="button" class="icon-btn none" data-x="dictate" aria-label="הכתבה">' + ic('mic') + '</button></div><div class="tz-voice-slot"></div></div>';
      if (!bd) {
        h += '<div class="chips">' + [['10m', 'בעוד 10 דק׳'], ['30m', 'בעוד חצי שעה'], ['1h', 'בעוד שעה'], ['eve', 'הערב 20:00'], ['tm8', 'מחר 08:00'], ['tm9', 'מחר 09:00'], ['wk', 'בעוד שבוע']].map(function (q) { return '<button type="button" class="chip" data-quick="' + q[0] + '">' + q[1] + '</button>'; }).join('') + '</div>';
      }
      h += '<div class="row"><div class="field"><label for="f-date">' + (bd ? 'תאריך לידה' : 'תאריך') + '</label><input class="input" type="date" id="f-date" value="' + date + '"></div><div class="field"><label for="f-time">' + (bd ? 'שעת התזכורת' : 'שעה') + '</label><input class="input" type="time" id="f-time" value="' + time + '"></div></div>';
      h += '<div class="heb-note">' + esc(H.date(base).full) + '</div>';
      if (bd) {
        h += '<label class="switch"><span>שנת הלידה ידועה (לחישוב גיל)</span><input type="checkbox" id="f-byear"' + (e.birthYear ? ' checked' : '') + '></label>';
        h += '<label class="switch"><span>לפי התאריך העברי</span><input type="checkbox" id="f-hebbd"' + (rep.kind === 'hebYearly' ? ' checked' : '') + '></label>';
      }
      h += '</div>';
      if (!bd) {
        h += '<div class="card"><h3>' + ic('repeat') + ' חזרה</h3><div class="field"><select class="input" id="f-rep">' + opts(REPEATS, rep.kind) + '</select></div>';
        if (['daily', 'weekly', 'monthly', 'yearly', 'hours', 'minutes'].indexOf(rep.kind) >= 0) {
          var unit = { daily: 'ימים', weekly: 'שבועות', monthly: 'חודשים', yearly: 'שנים', hours: 'שעות', minutes: 'דקות' }[rep.kind];
          h += '<div class="field row"><span class="none">כל</span><input class="input" type="number" min="1" max="999" id="f-every" value="' + (rep.every || 1) + '" style="max-width:90px"><span>' + unit + '</span></div>';
        }
        if (rep.kind === 'weekly') {
          var ds = rep.days && rep.days.length ? rep.days : [base.getDay()];
          h += '<div class="field"><span class="lbl">באילו ימים?</span><div class="days">' + DOW.map(function (d, i) { return '<button type="button" data-wd="' + i + '" class="' + (ds.indexOf(i) >= 0 ? 'on' : '') + '">' + d + '</button>'; }).join('') + '</div></div>';
        }
        if (rep.kind === 'monthly') {
          var md = rep.mdays || [];
          h += '<div class="field"><span class="lbl">באילו ימים בחודש? (בלי בחירה = ' + base.getDate() + ' בכל חודש)</span><div class="mdays">';
          for (var i = 1; i <= 31; i++) h += '<button type="button" data-md="' + i + '" class="' + (md.indexOf(i) >= 0 ? 'on' : '') + '">' + i + '</button>';
          h += '<button type="button" data-md="-1" class="last ' + (md.indexOf(-1) >= 0 ? 'on' : '') + '">יום אחרון</button></div></div>';
        }
        if (rep.kind !== 'none') h += '<div class="field"><label for="f-until">עד תאריך (לא חובה)</label><input class="input" type="date" id="f-until" value="' + esc(rep.until || '') + '"></div>';
        h += '</div>';
      }
      h += '<div class="card"><h3>' + ic('bell') + ' התראה</h3>';
      h += '<div class="row"><div class="field"><label for="f-lead">תזכורת מוקדמת</label><select class="input" id="f-lead">' + opts(LEADS, e.lead || 0) + '</select></div>';
      if (!bd) h += '<div class="field"><label for="f-nag">נודניק עד שמסמנים בוצע</label><select class="input" id="f-nag">' + opts(NAGS, e.nag || 0) + '</select></div>';
      h += '</div><div class="field"><label for="f-sound">צליל</label><div class="row"><select class="input" id="f-sound"><option value="">ברירת המחדל (' + esc(SND.name(state.settings.sound)) + ')</option>' + SND.list.map(function (s) { return '<option value="' + s.id + '"' + (e.sound === s.id ? ' selected' : '') + '>' + s.name + '</option>'; }).join('') + '</select><button type="button" class="icon-btn none" data-x="preview" aria-label="השמעה">' + ic('play') + '</button></div></div></div>';
      h += '<div class="card"><h3>קטגוריה</h3><div class="chips">' + CATS.map(function (c) { return '<button type="button" class="chip' + (e.category === c.id ? ' on' : '') + '" data-ecat="' + c.id + '"><span class="dot" style="background:' + c.color + '"></span>' + c.name + '</button>'; }).join('') + '</div>';
      if (!bd) h += '<label class="switch"><span>' + ic('star') + ' חשוב</span><input type="checkbox" id="f-prio"' + (e.priority === 'high' ? ' checked' : '') + '></label>';
      h += '</div>';
      h += '<div class="card"><div class="field"><label for="f-notes">הערות</label><textarea class="input" id="f-notes" placeholder="פרטים נוספים...">' + esc(e.notes) + '</textarea></div>';
      if (!bd) {
        h += '<span class="lbl">רשימת משנה</span><div class="subtasks">' + (e.subtasks || []).map(function (s, i) { return '<div class="st"><input type="checkbox" data-st="' + i + '"' + (s.done ? ' checked' : '') + '><input type="text" data-stt="' + i + '" value="' + esc(s.text) + '"><button type="button" class="mini" data-stdel="' + i + '" aria-label="מחיקה">' + ic('x') + '</button></div>'; }).join('') + '</div><button type="button" class="btn ghost" data-x="addst">' + ic('plus') + ' הוספת פריט</button>';
      }
      h += '<div class="field" style="margin-top:8px"><span class="lbl">תמונה</span>' + (e.image ? '<div class="img-prev"><img src="' + e.image + '" alt=""><button type="button" data-x="rmimg" aria-label="הסרת תמונה">' + ic('x') + '</button></div>' : '<label class="btn">' + ic('img') + ' צירוף תמונה<input type="file" accept="image/*" id="f-img" hidden></label>') + '</div></div>';
      if (!isNew) {
        h += '<div class="card"><div class="chips">' +
          '<button type="button" class="chip" data-x="dup">' + ic('copy') + ' שכפול</button>' +
          '<button type="button" class="chip" data-x="gcal">' + ic('google') + ' הוספה ליומן Google</button>' +
          '<button type="button" class="chip" data-x="share">' + ic('share') + ' שיתוף</button>' +
          '<button type="button" class="chip" data-x="pause">' + ic('pause') + (e.paused ? ' הפעלה מחדש' : ' השהיה') + '</button>' +
          '<button type="button" class="chip" data-x="del" style="color:var(--danger)">' + ic('trash') + ' מחיקה</button></div></div>';
      }
      h += '<div class="actions-bar"><button type="button" class="btn ghost" data-x="close">ביטול</button><button type="submit" class="btn primary">' + ic('check') + ' שמירה</button></div>';
      form.innerHTML = h;
      emit('tz:editor', { el: form, reminder: e, isNew: isNew });
    }
    function readForm() {
      var v = function (id) { var x = $('#' + id, form); return x ? x.value : null; };
      if (v('f-title') != null) e.title = v('f-title').trim();
      var d = v('f-date') || S.dayKey(new Date()), t = v('f-time') || state.settings.defaultTime;
      e.start = d + 'T' + t;
      if ($('#f-rep', form)) e.repeat.kind = v('f-rep');
      if ($('#f-every', form)) e.repeat.every = Math.max(1, parseInt(v('f-every'), 10) || 1);
      if ($('#f-until', form)) e.repeat.until = v('f-until');
      if ($('#f-lead', form)) e.lead = +v('f-lead');
      if ($('#f-nag', form)) e.nag = +v('f-nag');
      if ($('#f-sound', form)) e.sound = v('f-sound');
      if ($('#f-notes', form)) e.notes = v('f-notes');
      if ($('#f-prio', form)) e.priority = $('#f-prio', form).checked ? 'high' : 'normal';
      $$('[data-stt]', form).forEach(function (x) { var s = e.subtasks[+x.dataset.stt]; if (s) s.text = x.value; });
      $$('[data-st]', form).forEach(function (x) { var s = e.subtasks[+x.dataset.st]; if (s) s.done = x.checked; });
      if (e.type === 'birthday') {
        e.repeat = { kind: $('#f-hebbd', form) && $('#f-hebbd', form).checked ? 'hebYearly' : 'yearly', every: 1 };
        e.birthYear = $('#f-byear', form) && $('#f-byear', form).checked ? +d.slice(0, 4) : null;
      }
    }
    form.addEventListener('change', function (ev) {
      var id = ev.target.id;
      if (['f-rep', 'f-date', 'f-hebbd', 'f-byear'].indexOf(id) >= 0) { readForm(); draw(); }
      if (id === 'f-img' && ev.target.files[0]) {
        readImage(ev.target.files[0]).then(function (url) { readForm(); e.image = url; draw(); }).catch(function () { toast('לא הצלחתי לקרוא את התמונה'); });
      }
      if (id === 'f-sound') { SND.unlock(); SND.play(ev.target.value || state.settings.sound, state.settings.volume); }
    });
    form.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.type) { readForm(); if (b.dataset.type !== e.type) { var keepT = e.title; var n = blank(b.dataset.type === 'birthday' ? { type: 'birthday' } : null); n.id = e.id; n.title = keepT; n.created = e.created; e = n; state.editing = e; } draw(); return; }
      if (b.dataset.quick) { readForm(); applyQuick(e, b.dataset.quick); draw(); return; }
      if (b.dataset.wd != null) { readForm(); var wd = +b.dataset.wd, ds = e.repeat.days && e.repeat.days.length ? e.repeat.days.slice() : [S.parseLocal(e.start).getDay()]; var ix = ds.indexOf(wd); if (ix >= 0) { if (ds.length > 1) ds.splice(ix, 1); } else ds.push(wd); e.repeat.days = ds; draw(); return; }
      if (b.dataset.md != null) { readForm(); var md = +b.dataset.md, ms = (e.repeat.mdays || []).slice(), j = ms.indexOf(md); if (j >= 0) ms.splice(j, 1); else ms.push(md); e.repeat.mdays = ms.sort(function (a, c) { return a - c; }); draw(); return; }
      if (b.dataset.ecat) { readForm(); e.category = b.dataset.ecat; draw(); return; }
      if (b.dataset.stdel != null) { readForm(); e.subtasks.splice(+b.dataset.stdel, 1); draw(); return; }
      var x = b.dataset.x; if (!x) return;
      if (x === 'close') return closeSheet();
      if (x === 'preview') { SND.unlock(); SND.play($('#f-sound', form).value || state.settings.sound, state.settings.volume); return; }
      if (x === 'addst') { readForm(); e.subtasks = e.subtasks || []; e.subtasks.push({ id: DB.rid(8), text: '', done: false }); draw(); var l = $$('[data-stt]', form); if (l.length) l[l.length - 1].focus(); return; }
      if (x === 'rmimg') { readForm(); e.image = null; draw(); return; }
      if (x === 'dictate') { dictate(function (txt) { var p = parseQuick(txt); var inp = $('#f-title', form); if (p.matched && e.type !== 'birthday') { readForm(); e.title = p.title; e.start = p.start; if (p.repeat) e.repeat = Object.assign(e.repeat, p.repeat); draw(); } else inp.value = (inp.value ? inp.value + ' ' : '') + txt; }, b); return; }
      if (x === 'del') { if (!confirm('למחוק את התזכורת?')) return; var orig = findR(e.id); closeSheet(); if (orig) { remove(orig); toast('נמחק', 'ביטול', function () { save(orig); }); } return; }
      if (x === 'dup') { readForm(); var c = JSON.parse(JSON.stringify(e)); c.id = DB.rid(16); c.title = e.title + ' (עותק)'; c.done = false; c.history = []; c.ackedUntil = 0; c.snoozeUntil = null; closeSheet(); openEditor(null, c); return; }
      if (x === 'gcal') { readForm(); window.open(gcalLink(e), '_blank', 'noopener'); return; }
      if (x === 'share') { readForm(); shareReminder(e); return; }
      if (x === 'pause') { readForm(); e.paused = !e.paused; doSave(); return; }
    });
    form.addEventListener('submit', function (ev) { ev.preventDefault(); readForm(); doSave(); });
    function doSave() {
      if (!e.title) { var t = $('#f-title', form); t.focus(); t.classList.add('shake'); setTimeout(function () { t.classList.remove('shake'); }, 400); toast(e.type === 'birthday' ? 'נא לכתוב את השם' : 'נא לכתוב מה להזכיר'); return; }
      var old = findR(e.id);
      if (old && old.start !== e.start) { e.ackedUntil = 0; e.done = false; e.snoozeUntil = null; }
      if (old && JSON.stringify(old.repeat) !== JSON.stringify(e.repeat)) e.ackedUntil = 0;
      if (!S.isRecurring(e) && S.parseLocal(e.start).getTime() > Date.now()) { e.done = false; e.ackedUntil = 0; }
      if (S.isRecurring(e) && !e.ackedUntil && isNew) e.ackedUntil = Date.now();
      if (S.isRecurring(e) && old && !old.ackedUntil) e.ackedUntil = Date.now();
      emit('tz:save', { reminder: e });
      save(e).then(function () {
        state.editing = null; closeSheet();
        var st = S.status(e, Date.now());
        toast(st.at && st.state !== 'done' ? 'נשמר. תזכורת ' + whenLabel(st.at) : 'נשמר');
        maybeAskPush();
      });
    }
    draw();
    if (isNew && e.type !== 'birthday') setTimeout(function () { var t = $('#f-title', form); if (t && !t.value) t.focus(); }, 150);
  }
  function applyQuick(e, q) {
    var d = new Date(), p;
    if (q === '10m') d = new Date(Date.now() + 10 * MIN);
    else if (q === '30m') d = new Date(Date.now() + 30 * MIN);
    else if (q === '1h') d = new Date(Date.now() + 60 * MIN);
    else if (q === 'eve') { d.setHours(20, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); }
    else if (q === 'tm8') { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); }
    else if (q === 'tm9') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
    else if (q === 'wk') { d.setDate(d.getDate() + 7); p = state.settings.defaultTime.split(':'); d.setHours(+p[0], +p[1], 0, 0); }
    e.start = S.fmtLocal(d);
  }
  function readImage(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var max = 1000, w = img.width, h = img.height, k = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = rej; img.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  function gcalLink(r) {
    var d = S.parseLocal(r.start), e2 = new Date(d.getTime() + 30 * MIN);
    var f = function (x) { return x.getFullYear() + S.pad(x.getMonth() + 1) + S.pad(x.getDate()) + 'T' + S.pad(x.getHours()) + S.pad(x.getMinutes()) + '00'; };
    var u = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(S.titleFor(r, d.getTime())) + '&dates=' + f(d) + '/' + f(e2) + '&details=' + encodeURIComponent(r.notes || '');
    var rr = rrule(r); if (rr) u += '&recur=' + encodeURIComponent('RRULE:' + rr);
    return u;
  }
  function rrule(r) {
    var rep = r.type === 'birthday' ? { kind: 'yearly', every: 1 } : (r.repeat || {}), n = rep.every || 1, s = '';
    var map = { minutes: 'MINUTELY', hours: 'HOURLY', daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
    if (!map[rep.kind]) return '';
    s = 'FREQ=' + map[rep.kind] + ';INTERVAL=' + n;
    if (rep.kind === 'weekly' && rep.days && rep.days.length) s += ';BYDAY=' + rep.days.map(function (d) { return ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d]; }).join(',');
    if (rep.kind === 'monthly' && rep.mdays && rep.mdays.length) s += ';BYMONTHDAY=' + rep.mdays.join(',');
    if (rep.until) s += ';UNTIL=' + rep.until.replace(/-/g, '') + 'T235959';
    return s;
  }
  function shareReminder(r) {
    var txt = S.titleFor(r, Date.now()) + '\n' + whenLabel(S.status(r, Date.now()).at || S.parseLocal(r.start).getTime()) + (S.isRecurring(r) ? ' (' + repeatLabel(r) + ')' : '') + (r.notes ? '\n' + r.notes : '');
    if (navigator.share) navigator.share({ title: r.title, text: txt }).catch(function () {});
    else { navigator.clipboard && navigator.clipboard.writeText(txt); toast('הועתק ללוח'); }
  }

  // ---------- הוספה מהירה וזיהוי טקסט ----------
  var NUMW = { 'אחת': 1, 'אחד': 1, 'שתיים': 2, 'שתי': 2, 'שניים': 2, 'שני': 2, 'שלוש': 3, 'שלושה': 3, 'ארבע': 4, 'ארבעה': 4, 'חמש': 5, 'חמישה': 5, 'שש': 6, 'שישה': 6, 'שבע': 7, 'שבעה': 7, 'שמונה': 8, 'תשע': 9, 'תשעה': 9, 'עשר': 10, 'עשרה': 10, 'עשרים': 20, 'שלושים': 30, 'ארבעים': 40, 'חמישים': 50, 'רבע': 15 };
  function parseQuick(text) {
    var s = ' ' + text.replace(/[״"]/g, '').trim() + ' ', now = new Date(), d = null, time = null, rep = null, m;
    function cut(re) { s = s.replace(re, ' '); }
    function num(x) { return /^\d+$/.test(x) ? +x : NUMW[x]; }
    // כל X
    if ((m = s.match(/\sכל\s(?:(\d+|\S+)\s)?(דקות|דקה|שעות|שעה|ימים|יום|שבוע|שבועות|חודש|חודשים|שנה|שנים)\s/))) {
      var n = m[1] ? num(m[1]) || 1 : 1, u = m[2];
      rep = { kind: /דק/.test(u) ? 'minutes' : /שע/.test(u) ? 'hours' : /יו|ימ/.test(u) ? 'daily' : /שבוע/.test(u) ? 'weekly' : /חודש/.test(u) ? 'monthly' : 'yearly', every: n };
      cut(m[0].replace(/\s+$/, '') ? new RegExp(m[0].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : /$^/);
    }
    if ((m = s.match(/\sכל\sיום\s(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\s/))) { rep = { kind: 'weekly', every: 1, days: [DOW_FULL.indexOf(m[1])] }; cut(m[0].trim()); }
    // בעוד X
    if ((m = s.match(/\sבעוד\s(?:(\d+|\S+)\s)?(דקות|דקה|דק׳|דק|שעות|שעה|שעתיים|ימים|יום|יומיים|שבוע|שבועיים|חצי שעה)\s/))) {
      var k = m[1] ? num(m[1]) : 1, uu = m[2];
      if (m[1] === 'חצי' || uu === 'חצי שעה') { k = 30; uu = 'דקות'; }
      if (m[1] === 'רבע') { k = 15; uu = 'דקות'; }
      if (uu === 'שעתיים') { k = 2; uu = 'שעות'; } if (uu === 'יומיים') { k = 2; uu = 'ימים'; } if (uu === 'שבועיים') { k = 14; uu = 'ימים'; }
      if (k) {
        var ms = /דק/.test(uu) ? k * MIN : /שע/.test(uu) ? k * 60 * MIN : /שבוע/.test(uu) ? k * 7 * DAY : k * DAY;
        d = new Date(Date.now() + ms); time = /דק|שע/.test(uu) ? [d.getHours(), d.getMinutes()] : null;
        cut(m[0].trim());
      }
    }
    if (!d) {
      if (/\sמחרתיים\s/.test(s)) { d = new Date(); d.setDate(d.getDate() + 2); cut(/מחרתיים/); }
      else if (/\sמחר\s/.test(s)) { d = new Date(); d.setDate(d.getDate() + 1); cut(/מחר/); }
      else if (/\sהיום\s/.test(s)) { d = new Date(); cut(/היום/); }
      else if ((m = s.match(/\s(?:ב)?יום\s(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\s/)) || (m = s.match(/\sב?(שבת)\s/))) {
        var target = DOW_FULL.indexOf(m[1]); d = new Date(); var diff = (target - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + diff); cut(m[0].trim());
      } else if ((m = s.match(/\s(?:ב-?|ב)?(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\s/))) {
        var y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : now.getFullYear();
        d = new Date(y, +m[2] - 1, +m[1]); if (!m[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(y + 1); cut(m[0].trim());
      }
    }
    if (!time && (m = s.match(/\s(?:ב-?|בשעה\s|ב\s)(\d{1,2})(?::(\d{2}))?\s/))) { time = [+m[1], +(m[2] || 0)]; cut(m[0].trim()); }
    if (!time && (m = s.match(/\s(\d{1,2}):(\d{2})\s/))) { time = [+m[1], +m[2]]; cut(m[0].trim()); }
    var part = null;
    if ((m = s.match(/\s(?:ב)?(בוקר|צהריים|צהרים|אחר הצהריים|אחה״צ|ערב|לילה)\s/))) { part = m[1]; cut(m[0].trim()); }
    if (time && part && /ערב|לילה|צהר|אחה/.test(part) && time[0] < 12) time[0] += 12;
    if (!time && part) time = /בוקר/.test(part) ? [8, 0] : /צהר/.test(part) ? [13, 0] : /ערב/.test(part) ? [20, 0] : [22, 0];
    var matched = !!(d || time || rep);
    if (!d) d = new Date();
    if (!time) { var p = state.settings.defaultTime.split(':'); time = rep && /minutes|hours/.test(rep.kind) ? [now.getHours(), now.getMinutes()] : [+p[0], +p[1]]; }
    d.setHours(time[0], time[1], 0, 0);
    if (!rep && d < now && matched && dayDiff(d) === 0) d.setDate(d.getDate() + 1);
    var title = s.replace(/\s+/g, ' ').replace(/^\s*(להזכיר לי|תזכיר לי|תזכורת)\s*/, '').replace(/\s(ב|ל|של)$/, '').trim();
    var out = { title: title, start: S.fmtLocal(d), matched: matched };
    if (rep) { out.repeat = Object.assign({ every: 1, days: [], mdays: [], until: '' }, rep); if (rep.kind === 'weekly' && !rep.days) out.repeat.days = [d.getDay()]; }
    return out;
  }
  function quickAdd(text) {
    if (!text.trim()) return;
    var p = parseQuick(text), r = blank();
    r.title = p.title || text.trim(); r.start = p.start; if (p.repeat) r.repeat = p.repeat;
    if (!p.matched) return openEditor(null, { title: r.title });
    if (S.isRecurring(r)) r.ackedUntil = Date.now() - 1;
    save(r).then(function () {
      toast('נוסף: ' + r.title + ' · ' + whenLabel(S.status(r, Date.now()).at), 'עריכה', function () { openEditor(findR(r.id)); });
      maybeAskPush();
    });
  }
  // הכתבה בקול
  function dictate(cb, btn) {
    if (NAT) return NAT.dictate(cb, btn, toast);
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('הדפדפן הזה לא תומך בהקלטה. אפשר להשתמש בכפתור המיקרופון במקלדת של הטלפון.'); return; }
    var rec = new SR(); rec.lang = 'he-IL'; rec.interimResults = false; rec.maxAlternatives = 1;
    if (btn) btn.classList.add('rec');
    rec.onresult = function (ev) { cb(ev.results[0][0].transcript); };
    rec.onerror = function (ev) { toast(ev.error === 'not-allowed' ? 'צריך לאשר גישה למיקרופון' : 'לא נקלט, נסו שוב'); };
    rec.onend = function () { if (btn) btn.classList.remove('rec'); };
    try { rec.start(); toast('מקשיב... דברו עכשיו'); } catch (e) { if (btn) btn.classList.remove('rec'); }
  }

  // ---------- התראות בתוך האפליקציה ----------
  var jobs = [], lastTick = Date.now(), fired = {}, alarmQ = [], alarmOpen = null;
  function rebuildJobs() { jobs = S.buildJobs(state.list, lastTick - 1, { sound: state.settings.sound }); }
  function tick() {
    var now = Date.now();
    if (now - lastTick > 6 * 3600000) { lastTick = now - 1000; rebuildJobs(); }
    jobs.forEach(function (j) {
      if (j.t > lastTick && j.t <= now) fire(j);
    });
    lastTick = now;
    if (jobs.length && jobs[0].t < now - 3600000) rebuildJobs();
    var cd = $('[data-countdown]'); if (cd) { var t = +cd.dataset.countdown; if (t <= now) render(); else cd.textContent = countdown(t); }
  }
  setInterval(function () { if (jobs.length && jobs[jobs.length - 1].t < Date.now()) rebuildJobs(); }, 15 * MIN);
  var pushActive = false;
  function fire(j) {
    var key = j.rid + ':' + j.t;
    if (fired[key]) return; fired[key] = 1;
    if (document.visibilityState === 'visible') return showAlarm(j);
    if (!NAT && !pushActive && typeof Notification !== 'undefined' && Notification.permission === 'granted' && navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(j.title, { body: j.body, icon: 'icon-192.png', badge: 'badge.png', dir: 'rtl', lang: 'he', tag: 'r-' + j.rid, renotify: true, requireInteraction: true, data: j, actions: [{ action: 'done', title: '✓ בוצע' }, { action: 'snooze', title: '💤 עוד 10 דק\'' }] }); });
    }
    alarmQ.push(j);
    try { SND.play(soundFor(j), state.settings.volume); } catch (e) {}
  }
  function soundFor(j) { var r = findR(j.rid); return (r && r.sound) || j.sound || state.settings.sound; }
  function showAlarm(j) {
    if (alarmOpen) { if (alarmOpen.rid === j.rid) return; if (!alarmQ.some(function (x) { return x.rid === j.rid; })) alarmQ.push(j); updateQueue(); return; }
    var r = findR(j.rid);
    if (j.rid !== 'test' && (!r || r.done)) return nextAlarm();
    alarmOpen = j;
    var lead = j.kind === 'lead';
    var w = document.createElement('div'); w.className = 'alarm-wrap'; w.id = 'alarm-wrap';
    var subs = r && r.subtasks && r.subtasks.length ? '<div class="notes">' + r.subtasks.map(function (s) { return (s.done ? '☑ ' : '☐ ') + esc(s.text); }).join('<br>') + '</div>' : '';
    w.innerHTML = '<div class="alarm" role="alertdialog" aria-live="assertive"><div class="bell"><img src="logo.png" alt=""></div>' +
      '<h2>' + esc(j.title) + '</h2><div class="when">' + esc(whenLabel(j.occ || j.t)) + (r && S.isRecurring(r) ? ' · ' + esc(repeatLabel(r)) : '') + '</div>' +
      (r && r.notes ? '<div class="notes">' + esc(r.notes) + '</div>' : '') + subs + (r && r.image ? '<img class="att" src="' + r.image + '" alt="">' : '') +
      '<div class="tz-voice-alarm-slot"></div>' +
      '<button class="btn" data-a="sound" hidden style="background:rgba(255,255,255,.2);color:#fff;margin-top:10px">🔊 הפעלת צליל</button>' +
      (lead || j.rid === 'test' ? '<button class="btn primary" data-a="close">הבנתי</button>' : '<button class="btn primary" data-a="done">' + ic('check') + ' בוצע</button>' +
        '<div class="snz"><button data-a="5">5 דק׳</button><button data-a="10">10 דק׳</button><button data-a="15">15 דק׳</button><button data-a="30">30 דק׳</button><button data-a="60">שעה</button><button data-a="tm">מחר בבוקר</button></div>' +
        '<div class="more"><button data-a="open">פתיחה ועריכה</button><button data-a="close">סגירה</button></div>') +
      '<div class="queue"></div></div>';
    document.body.appendChild(w);
    updateQueue();
    var snd = soundFor(j);
    if (state.settings.loop && !lead) SND.loop(snd, state.settings.volume, 90); else SND.play(snd, state.settings.volume);
    if (navigator.vibrate) try { navigator.vibrate([300, 150, 300, 150, 600]); } catch (e) {}
    setTimeout(function () { if (SND.locked() && $('[data-a="sound"]', w)) $('[data-a="sound"]', w).hidden = false; }, 400);
    w.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.dataset.a;
      if (a === 'sound') { SND.unlock(); SND.loop(snd, state.settings.volume, 60); b.hidden = true; return; }
      if (r && a === 'done') { S.markDone(r, Date.now()); save(r); toast('בוצע ✓'); }
      else if (r && /^\d+$/.test(a)) doSnooze(r, a);
      else if (r && a === 'tm') doSnooze(r, 'tm');
      else if (r && a === 'open') { closeAlarm(); openEditor(r); return; }
      closeAlarm();
    });
    closeNotif(j.rid);
    emit('tz:alarm', { reminder: r, data: j, el: w });
  }
  function updateQueue() { var q = $('#alarm-wrap .queue'); if (q) q.textContent = alarmQ.length ? 'ממתינות עוד ' + alarmQ.length + ' תזכורות' : ''; }
  function closeAlarm() {
    var w = $('#alarm-wrap'); if (w) w.remove();
    SND.stop();
    var r = alarmOpen && findR(alarmOpen.rid);
    emit('tz:alarm-close', { reminder: r, data: alarmOpen });
    alarmOpen = null;
    setTimeout(nextAlarm, 250);
  }
  function nextAlarm() { var j = alarmQ.shift(); if (j) showAlarm(j); }
  function closeNotif(rid) {
    if (NAT) { NAT.clearFor(rid); return; }
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.ready.then(function (reg) { return reg.getNotifications({ tag: 'r-' + rid }); }).then(function (ns) { (ns || []).forEach(function (n) { n.close(); }); }).catch(function () {});
  }

  // ---------- התראות דחיפה (גם כשהאפליקציה סגורה) ----------
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function standalone() { return !!NAT || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function b64ToBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); var bin = atob(s + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(bin, function (c) { return c.charCodeAt(0); }); }
  async function pushState() {
    if (NAT) { var np = await NAT.perm(); return np === 'granted' ? 'on' : np === 'denied' ? 'denied' : 'off'; }
    if (!pushSupported()) return isIOS() && !standalone() ? 'ios-install' : 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    var dev = await DB.meta('device');
    if (Notification.permission === 'granted' && dev && dev.push) return dev.serverPush === false ? 'no-server' : 'on';
    return 'off';
  }
  function withTimeout(p, ms, msg) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error(msg)); }, ms); })]);
  }
  async function enablePush(silent) {
    if (NAT) {
      var p = await NAT.request().catch(function () { return 'denied'; });
      if (p !== 'granted') { showBlockedHelp(); refreshBanner(); return false; }
      await DB.sync();
      if ((await NAT.exact()) !== 'granted') toast('כדי שהתזכורות יקפצו בדקה המדויקת, צריך לאשר "שעונים מעוררים ותזכורות".', 'לאישור', function () { NAT.openExact(); });
      else if (!silent) toast('ההתראות הופעלו ✓ הן יקפצו גם כשהאפליקציה סגורה');
      refreshBanner();
      return true;
    }
    if (!pushSupported()) { if (isIOS() && !standalone()) showInstall(); else toast('הדפדפן הזה לא תומך בהתראות. מומלץ Chrome, Edge או Safari מעודכן.'); return false; }
    if (Notification.permission === 'denied') { showBlockedHelp(); refreshBanner(); return false; }
    try {
      // חייב להיקרא מיד בלחיצה (בלי המתנה לפני), אחרת Safari מתעלם
      var permP = Notification.permission === 'granted' ? Promise.resolve('granted') : Notification.requestPermission();
      if (Notification.permission === 'default') toast('נא לאשר התראות בחלון שקפץ. אם לא קפץ חלון, לחצו על סמל הפעמון או המנעול בשורת הכתובת.');
      var perm = await withTimeout(Promise.resolve(permP), 90000, 'perm');
      if (perm !== 'granted') { toast('ההתראות לא אושרו. אפשר לאשר אותן בהגדרות האתר בדפדפן (סמל המנעול ליד הכתובת).'); refreshBanner(); return false; }
      if (!silent) toast('מפעיל התראות...');
      var reg = await withTimeout(navigator.serviceWorker.ready, 10000, 'sw'), dev = await DB.device();
    } catch (e) {
      toast(e && e.message === 'sw' ? 'רכיב הרקע של האפליקציה עוד לא נטען. רעננו את הדף ונסו שוב.' : e && e.message === 'perm' ? 'לא התקבל אישור להתראות.' : 'שגיאה בהפעלת התראות: ' + (e && e.message || e));
      return false;
    }
    try {
      var k = await withTimeout(fetch(DB.api('key')).then(function (r) { if (!r.ok) throw new Error('key'); return r.json(); }), 15000, 'key');
      var sub = await reg.pushManager.getSubscription();
      if (sub && dev.key && dev.key !== k.key) { await sub.unsubscribe(); sub = null; }
      if (!sub) {
        // שירות ההתראות של Google נכשל לפעמים בניסיון הראשון (״push service error״). מנסים שוב כמה פעמים.
        for (var tries = 0; !sub && tries < 4; tries++) {
          try { sub = await withTimeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(k.key) }), 20000, 'subscribe'); }
          catch (err) {
            if (tries === 3) throw err;
            try { var old = await reg.pushManager.getSubscription(); if (old) await old.unsubscribe(); } catch (x) {}
            await new Promise(function (r) { setTimeout(r, 1500 * (tries + 1)); });
          }
        }
      }
      dev.push = true; dev.key = k.key; dev.subSent = false; dev.serverPush = true; dev.lastError = null; await DB.setMeta('device', dev);
      var res = await DB.sync({ sub: true });
      if (res && res.ok) { pushActive = true; if (!silent) toast('ההתראות הופעלו ✓ הן יקפצו גם כשהאפליקציה סגורה'); }
      else { if (!silent) toast('ההתראות הופעלו, אבל השרת לא ענה (' + esc(res && (res.error || '') || '') + '). ננסה שוב אוטומטית.'); }
    } catch (e) {
      dev.push = true; dev.serverPush = false; dev.lastError = String(e && e.message || e); await DB.setMeta('device', dev);
      if (/push service/i.test(dev.lastError)) showPushServiceHelp(); else toast('לא הצלחתי להתחבר לשרת ההתראות (' + dev.lastError + '). ההתראות יפעלו בינתיים כשהאפליקציה פתוחה.');
    }
    refreshBanner();
    return true;
  }
  function showPushServiceHelp() {
    var h = '<p>הטלפון לא הצליח להירשם לשירות ההתראות של Google. זה קורה בעיקר בטלפוני Xiaomi / Redmi / POCO בגלל חיסכון בסוללה. כך מתקנים:</p><ol class="steps">' +
      '<li><b>הגדרות</b> ← <b>אפליקציות</b> ← <b>ניהול אפליקציות</b> ← <b>Chrome</b>.</li>' +
      '<li><b>חיסכון בסוללה</b> ← <b>ללא הגבלות</b>.</li>' +
      '<li>להפעיל <b>הפעלה אוטומטית</b> (Autostart).</li>' +
      '<li><b>התראות</b> ← לוודא שמופעל.</li>' +
      '<li>לוודא ש<b>שירותי Google Play</b> מעודכנים (בחנות Play).</li>' +
      '<li>לסגור את האפליקציה, לפתוח שוב, ולהפעיל התראות מחדש.</li></ol>';
    var s = openSheet('<h2><span class="grow">' + ic('bell') + ' עוד צעד קטן</span><button class="icon-btn" data-x="close">' + ic('x') + '</button></h2><div class="card">' + h + '</div><button class="btn primary block" data-x="retry">ניסיון נוסף עכשיו</button>');
    s.addEventListener('click', function (e) { if (e.target.closest('[data-x="close"]')) closeSheet(); if (e.target.closest('[data-x="retry"]')) { closeSheet(); enablePush(); } });
  }
  function showBlockedHelp() {
    var h = NAT ? '<ol class="steps"><li>פותחים <b>הגדרות</b> בטלפון ← <b>אפליקציות</b> ← <b>תזכורות</b>.</li><li><b>התראות</b> ← להפעיל את כל האפשרויות.</li><li>חוזרים לאפליקציה ולוחצים שוב על הבדיקה.</li></ol>' : isIOS() ? '<ol class="steps"><li>פותחים את <b>הגדרות</b> באייפון.</li><li>גוללים ל<b>התראות</b> ובוחרים <b>תזכורות</b>.</li><li>מפעילים <b>אפשר התראות</b>.</li></ol>'
      : '<ol class="steps"><li>לוחצים על סמל <b>המנעול</b> (או סמל ההגדרות) משמאל לכתובת האתר בשורת הכתובת.</li><li>ליד <b>התראות</b> בוחרים <b>אפשר</b>.</li><li>מרעננים את הדף ולוחצים שוב על הבדיקה.</li></ol><p class="small">באפליקציה מותקנת במחשב: תפריט ⋮ בחלון האפליקציה ← פרטי האפליקציה / הגדרות האתר ← התראות ← אפשר.</p>';
    var s = openSheet('<h2><span class="grow">' + ic('bell') + ' ההתראות חסומות</span><button class="icon-btn" data-x="close">' + ic('x') + '</button></h2><div class="card"><p>הדפדפן חוסם התראות מהאפליקציה, ולכן היא לא יכולה להקפיץ תזכורות. כך מאשרים:</p>' + h + '</div>');
    s.addEventListener('click', function (e) { if (e.target.closest('[data-x="close"]')) closeSheet(); });
  }
  async function refreshBanner() {
    var st = await pushState(), b = $('#notif-banner');
    pushActive = st === 'on';
    var msg = { off: 'כדי שהתזכורות יקפצו גם כשהאפליקציה סגורה, צריך להפעיל התראות.', 'ios-install': 'באייפון ההתראות עובדות רק אחרי התקנה למסך הבית.', denied: 'ההתראות חסומות בדפדפן. כדי לקבל תזכורות כשהאפליקציה סגורה, אשרו התראות בהגדרות האתר.' }[st];
    if (!msg) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = '<span style="color:var(--accent)">' + ic('bell') + '</span><div class="grow">' + msg + '</div>' + (st === 'off' ? '<button class="btn primary" id="b-enable">הפעלה</button>' : st === 'ios-install' ? '<button class="btn primary" id="b-ios">איך מתקינים?</button>' : st === 'denied' ? '<button class="btn primary" id="b-den">איך מאשרים?</button>' : '');
    var en = $('#b-enable'); if (en) en.onclick = function () { enablePush(); };
    var io = $('#b-ios'); if (io) io.onclick = showInstall;
    var dn = $('#b-den'); if (dn) dn.onclick = showBlockedHelp;
  }
  var askedPush = false;
  function maybeAskPush() {
    if (askedPush) return; askedPush = true;
    pushState().then(function (st) { if (st === 'off') toast('להפעיל התראות כדי שהתזכורת תקפוץ גם כשהאפליקציה סגורה?', 'הפעלה', function () { enablePush(); }); });
  }

  // ---------- התקנה ----------
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; updateInstallBtn(); });
  window.addEventListener('appinstalled', function () { deferredPrompt = null; updateInstallBtn(); toast('האפליקציה הותקנה ✓'); });
  function updateInstallBtn() { $('#btn-install').hidden = standalone(); }
  async function doInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      var ch = await deferredPrompt.userChoice; deferredPrompt = null;
      if (ch && ch.outcome === 'accepted') toast('מתקין... ✓');
      updateInstallBtn(); return;
    }
    showInstall();
  }
  function showInstall() {
    var ua = navigator.userAgent, h;
    var android = /android/i.test(ua), samsung = /SamsungBrowser/i.test(ua), firefox = /firefox|fxios/i.test(ua), edge = /edg/i.test(ua);
    if (isIOS()) {
      h = '<p>באייפון ובאייפד מתקינים דרך Safari:</p><ol class="steps"><li>פותחים את האתר ב-<b>Safari</b> (לא בתוך וואטסאפ או פייסבוק).</li><li>לוחצים על כפתור השיתוף <span class="kbd">⎋ ⬆</span> בתחתית המסך.</li><li>גוללים ובוחרים <b>״הוספה למסך הבית״</b>.</li><li>לוחצים <b>״הוסף״</b>.</li><li>פותחים את האפליקציה מהאייקון החדש ולוחצים <b>״הפעלה״</b> בפס ההתראות.</li></ol><p class="small">התראות כשהאפליקציה סגורה עובדות באייפון החל מ-iOS 16.4, ורק מהאפליקציה המותקנת.</p>';
    } else if (android) {
      h = '<ol class="steps"><li>פותחים את התפריט ' + (samsung ? '<span class="kbd">☰</span> בתחתית' : '<span class="kbd">⋮</span> למעלה') + '.</li><li>בוחרים <b>״התקנת אפליקציה״</b> או <b>״הוספה למסך הבית״</b>.</li><li>מאשרים. האייקון יופיע במסך הבית.</li></ol>' + (firefox ? '<p class="small">ב-Firefox ההתקנה מוגבלת. מומלץ לפתוח ב-Chrome.</p>' : '');
    } else {
      h = '<ol class="steps"><li>בשורת הכתובת למעלה, בצד ימין, לוחצים על סמל ההתקנה <span class="kbd">⊕</span> או <span class="kbd">🖥 ⬇</span>.</li><li>או: תפריט ' + (edge ? '<span class="kbd">…</span> ← ״אפליקציות״ ← ״התקנת אתר זה כאפליקציה״' : '<span class="kbd">⋮</span> ← ״העברה, שמירה ושיתוף״ ← ״התקנת הדף כאפליקציה״') + '.</li><li>מאשרים ״התקנה״. האפליקציה תיפתח בחלון משלה ותופיע בתפריט התחל.</li></ol>' + (firefox ? '<p class="small">Firefox במחשב לא תומך בהתקנה. מומלץ Chrome או Edge.</p>' : '') + '<p class="small">כדי לקבל התראות כשהחלון סגור, הדפדפן צריך לפעול ברקע (ב-Windows זה ברירת המחדל).</p>';
    }
    var s = openSheet('<h2><span class="grow">' + ic('install') + ' התקנת האפליקציה</span><button class="icon-btn" data-x="close">' + ic('x') + '</button></h2><div class="card">' + h + '</div>' + (deferredPrompt ? '<button class="btn primary block" id="inst-now">התקנה עכשיו</button>' : ''));
    s.addEventListener('click', function (e) { if (e.target.closest('[data-x="close"]')) closeSheet(); if (e.target.closest('#inst-now')) { closeSheet(); doInstall(); } });
  }

  // ---------- הגדרות ----------
  var ACCENTS = [['indigo', '#4f46e5'], ['teal', '#0d9488'], ['sky', '#0284c7'], ['violet', '#7c3aed'], ['rose', '#e11d48'], ['amber', '#d97706'], ['green', '#16a34a']];
  function applyTheme() {
    var st = state.settings, dark = st.theme === 'dark' || (st.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('tz-theme', JSON.stringify(dark ? 'dark' : 'light')); } catch (e) {}
    document.documentElement.dataset.accent = st.accent;
    document.documentElement.dataset.size = st.size;
    var tc = $('meta[name="theme-color"]'); if (tc) tc.content = dark ? '#0f1020' : '#f4f5fb';
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  async function openSettings() {
    var st = state.settings, ps = await pushState(), dev = await DB.meta('device');
    var pushTxt = { on: NAT ? '✅ פעילות. התזכורות מתוזמנות בטלפון עצמו ויקפצו גם כשהאפליקציה סגורה, גם בלי אינטרנט.' : '✅ פעילות. התזכורות יקפצו גם כשהאפליקציה סגורה.', off: 'כבויות.', denied: '⛔ חסומות בדפדפן. צריך לאשר בהגדרות האתר (סמל המנעול ליד הכתובת).', 'ios-install': 'באייפון צריך קודם להתקין את האפליקציה למסך הבית.', unsupported: 'הדפדפן הזה לא תומך בהתראות.', 'no-server': '⚠️ פעילות רק כשהאפליקציה פתוחה (שרת ההתראות לא זמין).' }[ps];
    var h = '<h2><span class="grow">' + ic('gear') + ' הגדרות</span><button class="icon-btn" data-x="close">' + ic('x') + '</button></h2>';
    h += '<div class="card"><h3>' + ic('bell') + ' התראות</h3><p>' + pushTxt + '</p>' + (dev && dev.lastSync ? '<p class="small">' + (NAT ? 'תזמון אחרון בטלפון: ' : 'סנכרון אחרון עם השרת: ') + esc(whenLabel(dev.lastSync)) + ' · ' + (dev.lastJobs || 0) + ' התראות מתוזמנות</p>' : '') +
      '<div class="row" style="flex-wrap:wrap">' + (ps !== 'on' ? '<button class="btn primary" data-s="enable">הפעלת התראות</button>' : '') + '<button class="btn" data-s="test">בדיקה עכשיו</button><button class="btn" data-s="test30">בדיקה בעוד 30 שניות</button>' + (NAT ? '<button class="btn" data-s="exact">הרשאת שעון מדויק</button>' : '') + '</div>' +
      '<p class="small">בבדיקה בעוד 30 שניות אפשר לסגור את האפליקציה לגמרי ולראות שההתראה קופצת.</p><p class="small" id="diag">בודק מצב...</p></div>';
    h += '<div class="card"><h3>' + ic('install') + ' התקנה</h3>' + (standalone() ? '<p>✅ האפליקציה מותקנת במכשיר הזה.</p>' : '<button class="btn primary" data-s="install">' + ic('install') + ' התקנת האפליקציה</button>') + '</div>';
    h += '<div class="card"><h3>🎵 צליל ברירת מחדל</h3><div class="sounds">' + SND.list.map(function (s) { return '<button class="snd' + (st.sound === s.id ? ' on' : '') + '" data-snd="' + s.id + '"><span class="play">' + ic('play') + '</span>' + s.name + '</button>'; }).join('') + '</div>' +
      '<div class="field" style="margin-top:12px"><label for="s-vol">עוצמה</label><input type="range" id="s-vol" min="0.1" max="1" step="0.05" value="' + st.volume + '" style="width:100%;accent-color:var(--accent)"></div>' +
      '<label class="switch"><span>להשמיע שוב ושוב עד שלוחצים (כשהאפליקציה פתוחה)</span><input type="checkbox" id="s-loop"' + (st.loop ? ' checked' : '') + '></label>' +
      (NAT ? '<p class="small">הצליל שנבחר מתנגן גם כשהאפליקציה סגורה.</p>' : '<p class="small">כשהאפליקציה סגורה, ההתראה מגיעה עם צליל ההתראות של הטלפון או המחשב. הצלילים שכאן מתנגנים כשהאפליקציה פתוחה או ברקע.</p>') + '</div>';
    h += '<div class="card"><h3>' + ic('clock') + ' ברירות מחדל</h3><div class="row"><div class="field"><label for="s-snz">דחייה מתוך התראה</label><select class="input" id="s-snz">' + opts([[5, '5 דקות'], [10, '10 דקות'], [15, '15 דקות'], [30, 'חצי שעה'], [60, 'שעה']], st.snoozeMin) + '</select></div><div class="field"><label for="s-time">שעה רגילה</label><input class="input" type="time" id="s-time" value="' + st.defaultTime + '"></div></div>' +
      '<div class="row"><div class="field"><label for="s-nag">נודניק לתזכורת חדשה</label><select class="input" id="s-nag">' + opts(NAGS, st.nag) + '</select></div><div class="field"><label for="s-lead">התראה מוקדמת</label><select class="input" id="s-lead">' + opts(LEADS, st.lead) + '</select></div></div>' +
      '<div class="row"><div class="field"><label for="s-btime">שעת תזכורת יום הולדת</label><input class="input" type="time" id="s-btime" value="' + st.bdayTime + '"></div><div class="field"><label for="s-blead">ימי הולדת: התראה מוקדמת</label><select class="input" id="s-blead">' + opts(LEADS, st.bdayLead) + '</select></div></div></div>';
    h += '<div class="card"><h3>🎨 מראה</h3><div class="seg">' + [['light', '☀️ בהיר'], ['dark', '🌙 כהה'], ['auto', '🔄 אוטומטי']].map(function (t) { return '<button data-theme="' + t[0] + '" class="' + (st.theme === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<span class="lbl">צבע</span><div class="swatches">' + ACCENTS.map(function (a) { return '<button data-acc="' + a[0] + '" class="' + (st.accent === a[0] ? 'on' : '') + '" style="background:' + a[1] + '" aria-label="' + a[0] + '"></button>'; }).join('') + '</div>' +
      '<label class="switch"><span>טקסט גדול</span><input type="checkbox" id="s-size"' + (st.size === 'large' ? ' checked' : '') + '></label>' +
      '<label class="switch"><span>הצגת תאריך עברי וחגים</span><input type="checkbox" id="s-heb"' + (st.showHeb ? ' checked' : '') + '></label></div>';
    h += '<div class="card"><h3>' + ic('lock') + ' נעילה בקוד</h3>' + (st.pinHash ? '<p>✅ האפליקציה נעולה בקוד.</p><div class="row"><div class="field"><label for="s-lockafter">לנעול אחרי</label><select class="input" id="s-lockafter">' + opts([[0, 'מיד'], [1, 'דקה'], [5, '5 דקות'], [15, 'רבע שעה'], [60, 'שעה']], st.lockAfter) + '</select></div></div><div class="row"><button class="btn" data-s="pin">שינוי קוד</button><button class="btn danger" data-s="nopin">ביטול נעילה</button></div>' : '<p class="small">קוד של 4 עד 8 ספרות שיידרש בכל פתיחה.</p><button class="btn" data-s="pin">הגדרת קוד</button>') + '</div>';
    h += '<div class="card"><h3>' + ic('download') + ' גיבוי והעברה למכשיר חדש</h3><p class="small">התזכורות נשמרות במכשיר הזה. כדי להעביר למכשיר אחר: שומרים קובץ גיבוי, שולחים אותו לעצמכם (מייל, וואטסאפ, Drive) ופותחים אותו בשחזור במכשיר החדש.</p>' +
      '<div class="row" style="flex-wrap:wrap"><button class="btn primary" data-s="export">' + ic('download') + ' שמירת גיבוי</button><label class="btn">' + ic('upload') + ' שחזור מגיבוי<input type="file" accept=".json,application/json" id="s-import" hidden></label><button class="btn" data-s="ics">' + ic('cal') + ' ייצוא ליומן (Google / Outlook)</button></div>' +
      (st.lastBackup ? '<p class="small">גיבוי אחרון: ' + esc(whenLabel(st.lastBackup)) + '</p>' : '') + '</div>';
    h += '<div class="card"><h3>ℹ️ אודות</h3><p class="small" style="line-height:1.7">נוצר ע"י <b>יאיר גלעדי</b><br>"המרכז לבריאות טבעית"<br><a href="tel:0542135831" style="white-space:nowrap;direction:ltr;unicode-bidi:isolate;display:inline-block">054-2135831</a> - <a href="https://el-habriut.co.il" target="_blank" rel="noopener" style="white-space:nowrap;direction:ltr;unicode-bidi:isolate;display:inline-block">https://el-habriut.co.il</a></p><p class="small">תזכורות · גרסה 2.0 · בלי פרסומות. ' + state.list.length + ' פריטים שמורים.</p><p class="small">מה כדאי לדעת: כדי שתזכורת תקפוץ כשהאפליקציה סגורה צריך אינטרנט במכשיר והתראות מאושרות. באייפון זה עובד רק מהאפליקציה המותקנת. במחשב, הדפדפן צריך לרוץ ברקע. מצב ״נא לא להפריע״ ומצב חיסכון בסוללה עלולים לעכב התראות.</p><button class="btn danger" data-s="reset">מחיקת כל הנתונים</button></div>';
    var s = openSheet(h);
    diagnostics().then(function (t) { var d = $('#diag', s); if (d) d.textContent = t; });
    s.addEventListener('click', async function (e) {
      if (e.target.closest('[data-x="close"]')) return closeSheet();
      var snd = e.target.closest('[data-snd]');
      if (snd) { SND.unlock(); st.sound = snd.dataset.snd; SND.stop(); SND.play(st.sound, st.volume); $$('.snd', s).forEach(function (b) { b.classList.toggle('on', b === snd); }); saveSettings(); changed(); return; }
      var th = e.target.closest('button[data-theme]'); if (th) { st.theme = th.dataset.theme; applyTheme(); saveSettings(); $$('[data-theme]', s).forEach(function (b) { b.classList.toggle('on', b === th); }); return; }
      var ac = e.target.closest('button[data-acc]'); if (ac) { st.accent = ac.dataset.acc; applyTheme(); saveSettings(); $$('[data-acc]', s).forEach(function (b) { b.classList.toggle('on', b === ac); }); return; }
      var b = e.target.closest('[data-s]'); if (!b) return;
      var a = b.dataset.s;
      if (a === 'enable') { await enablePush(); closeSheet(); openSettings(); }
      if (a === 'test' || a === 'test30') testPush(a === 'test30' ? 30 : 0);
      if (a === 'exact' && NAT) NAT.openExact();
      if (a === 'install') { closeSheet(); doInstall(); }
      if (a === 'export') exportBackup();
      if (a === 'ics') exportICS();
      if (a === 'pin') { closeSheet(); setPin(); }
      if (a === 'nopin') { st.pinHash = null; await saveSettings(); closeSheet(); openSettings(); toast('הנעילה בוטלה'); }
      if (a === 'reset') {
        if (!confirm('למחוק את כל התזכורות וההגדרות מהמכשיר הזה? מומלץ לשמור גיבוי קודם.')) return;
        if (!confirm('בטוח? אי אפשר לבטל.')) return;
        var dev2 = await DB.meta('device');
        if (dev2 && dev2.id) fetch(DB.api('forget'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: dev2.id, secret: dev2.secret }) }).catch(function () {});
        await DB.clear(); await DB.setMeta('settings', DEFAULTS); await DB.setMeta('device', null);
        location.reload();
      }
    });
    s.addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 's-vol') { st.volume = +e.target.value; SND.play(st.sound, st.volume); }
      if (id === 's-loop') st.loop = e.target.checked;
      if (id === 's-snz') st.snoozeMin = +e.target.value;
      if (id === 's-time') st.defaultTime = e.target.value || '09:00';
      if (id === 's-nag') st.nag = +e.target.value;
      if (id === 's-lead') st.lead = +e.target.value;
      if (id === 's-btime') st.bdayTime = e.target.value || '09:00';
      if (id === 's-blead') st.bdayLead = +e.target.value;
      if (id === 's-size') { st.size = e.target.checked ? 'large' : 'normal'; applyTheme(); }
      if (id === 's-heb') { st.showHeb = e.target.checked; render(); }
      if (id === 's-lockafter') st.lockAfter = +e.target.value;
      if (id === 's-import' && e.target.files[0]) importBackup(e.target.files[0]);
      saveSettings();
    });
  }
  async function testPush(delay) {
    try {
      if (NAT) {
        if ((await NAT.perm()) !== 'granted') { var okn = await enablePush(true); if (!okn) return; }
        await NAT.test(delay);
        toast(delay ? 'בעוד 30 שניות תקפוץ התראה. אפשר לסגור את האפליקציה עכשיו.' : 'נשלחה התראת בדיקה');
        return;
      }
      if (!pushSupported() || Notification.permission !== 'granted') { var ok = await enablePush(true); if (!ok) return; }
      toast('שולח בדיקה...');
      var ps = await pushState();
      if (ps !== 'on') { var ok2 = await enablePush(true); if (!ok2) return; ps = await pushState(); }
      if (ps !== 'on') { var dv = await DB.meta('device'); toast('לא הצלחתי לרשום את המכשיר להתראות' + (dv && dv.lastError ? ' (' + dv.lastError + ')' : '') + '. מציג בדיקה מקומית.'); showAlarm({ rid: 'test', t: Date.now(), title: 'בדיקת התראה ✓', body: '', kind: 'test' }); return; }
      var dev = await DB.meta('device');
      var send = function () { return fetch(DB.api('test'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: dev.id, secret: dev.secret, delay: delay }) }).then(function (x) { return x.json(); }); };
      var r = await withTimeout(send(), 15000, 'timeout').catch(function (e) { return { error: e.message }; });
      if (r.error === 'missing' || r.error === 'forbidden') { await DB.sync({ sub: true }); r = await withTimeout(send(), 15000, 'timeout').catch(function (e) { return { error: e.message }; }); }
      if (r.ok && !delay && r.status && r.status !== 201 && r.status !== 200) toast('שירות ההתראות של הטלפון דחה את ההודעה (קוד ' + r.status + '). שלחו לי צילום של שורת המצב.');
      else if (r.ok) toast(delay ? 'בעוד 30 שניות תקפוץ התראה. אפשר לסגור את האפליקציה עכשיו.' : 'נשלחה התראת בדיקה (קוד ' + (r.status || '?') + ')');
      else toast('הבדיקה נכשלה (' + (r.error || 'שגיאה') + '). נסו לרענן ולהפעיל את ההתראות מחדש.');
    } catch (e) { toast('הבדיקה נכשלה: ' + (e && e.message || e)); }
  }
  async function diagnostics() {
    if (NAT) return NAT.diag();
    var out = [];
    out.push('התראות בדפדפן: ' + ('Notification' in window ? Notification.permission : 'לא נתמך'));
    var reg = null; try { reg = navigator.serviceWorker && await withTimeout(navigator.serviceWorker.getRegistration(), 3000, 't'); } catch (e) {}
    out.push('רכיב רקע: ' + (reg && reg.active ? 'פעיל' : reg ? 'נטען' : 'לא רשום'));
    var sub = null; try { sub = reg && reg.pushManager && await reg.pushManager.getSubscription(); } catch (e) {}
    out.push('מנוי להתראות: ' + (sub ? 'יש' : 'אין'));
    try { var h = await withTimeout(fetch(DB.api('health')).then(function (r) { return r.json(); }), 8000, 't'); out.push('שרת: ' + (h.ok ? 'מחובר' : 'שגיאה')); } catch (e) { out.push('שרת: לא זמין'); }
    var dev = await DB.meta('device'); if (dev && dev.lastError) out.push('שגיאה אחרונה: ' + dev.lastError);
    if (dev && dev.id) {
      try {
        var st = await withTimeout(fetch(DB.api('status'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: dev.id, secret: dev.secret }) }).then(function (r) { return r.json(); }), 8000, 't');
        if (!st.ok) out.push('בשרת: המכשיר לא רשום (' + (st.error || '?') + (st.detail ? ': ' + st.detail : '') + ')');
        else {
          out.push('בשרת: ' + (st.hasSub ? 'רשום (' + st.host + ')' : 'בלי מנוי') + ', ' + st.jobs + ' ממתינות');
          if (st.last) out.push('שליחה אחרונה: ' + whenLabel(st.last.at) + ' · קוד ' + st.last.status + (st.last.text ? ' · ' + st.last.text : ''));
        }
      } catch (e) { out.push('בדיקת מצב בשרת נכשלה: ' + (e && e.message || e)); }
    }
    if (dev && dev.id) out.push('מזהה: ' + dev.id.slice(0, 6) + ' · כתובת שרת: ' + (DB.api('') || '').replace(/^https?:\/\//, '').replace(/\/api\/$/, '') + (dev.syncError ? ' · שגיאת סנכרון: ' + dev.syncError : ''));
    out.push('מותקנת: ' + (standalone() ? 'כן' : 'לא') + ' · ' + (isIOS() ? 'iOS' : /android/i.test(navigator.userAgent) ? 'Android' : 'מחשב'));
    return out.join(' · ');
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type }), file = null;
    try { file = new File([blob], name, { type: type }); } catch (e) {}
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return file;
  }
  async function exportBackup() {
    var data = { app: 'tz-reminders', version: 2, exported: new Date().toISOString(), reminders: state.list, settings: Object.assign({}, state.settings, { pinHash: null }) };
    var name = 'tizkorot-backup-' + S.dayKey(new Date()) + '.json', txt = JSON.stringify(data);
    var file = null; try { file = new File([txt], name, { type: 'application/json' }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && /android|iphone|ipad/i.test(navigator.userAgent)) {
      try { await navigator.share({ files: [file], title: 'גיבוי תזכורות' }); } catch (e) { if (e.name !== 'AbortError') download(name, txt, 'application/json'); }
    } else download(name, txt, 'application/json');
    state.settings.lastBackup = Date.now(); saveSettings();
    toast('הגיבוי נשמר (' + state.list.length + ' פריטים)');
  }
  function importBackup(file) {
    var fr = new FileReader();
    fr.onload = async function () {
      try {
        var d = JSON.parse(fr.result), list = Array.isArray(d) ? d : d.reminders;
        if (!Array.isArray(list)) throw new Error('format');
        list = list.map(function (x) { return x.dueAt || x.recurrence ? fromOld(x) : x; }).filter(function (x) { return x && x.id && x.start; });
        var replace = state.list.length && confirm('להחליף את כל התזכורות הקיימות בגיבוי?\nאישור = החלפה, ביטול = מיזוג עם הקיימות');
        if (replace) await DB.clear();
        await DB.putMany(list);
        if (d.settings && replace) { state.settings = Object.assign({}, DEFAULTS, d.settings, { pinHash: state.settings.pinHash }); await saveSettings(); applyTheme(); }
        state.list = await DB.all();
        closeSheet(); changed(); toast('שוחזרו ' + list.length + ' פריטים ✓');
      } catch (e) { toast('הקובץ לא נראה כמו גיבוי של האפליקציה'); }
    };
    fr.readAsText(file);
  }
  function exportICS() {
    var f = function (t) { var x = new Date(t); return x.getFullYear() + S.pad(x.getMonth() + 1) + S.pad(x.getDate()) + 'T' + S.pad(x.getHours()) + S.pad(x.getMinutes()) + '00'; };
    var escI = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&'); };
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//tizkorot//HE', 'CALSCALE:GREGORIAN'];
    var now = Date.now();
    state.list.filter(function (r) { return !r.done && !r.deleted; }).forEach(function (r) {
      var heb = r.repeat && r.repeat.kind === 'hebYearly', start;
      var occs = heb ? S.occurrences(r, now, now + 3 * 366 * DAY, 3) : [S.parseLocal(r.start).getTime()];
      occs.forEach(function (t, i) {
        lines.push('BEGIN:VEVENT', 'UID:' + r.id + (heb ? '-' + i : '') + '@tizkorot', 'DTSTAMP:' + f(now), 'DTSTART:' + f(t), 'DTEND:' + f(t + 30 * MIN), 'SUMMARY:' + escI(r.type === 'birthday' ? '🎂 יום הולדת ל' + r.title : r.title));
        if (r.notes) lines.push('DESCRIPTION:' + escI(r.notes));
        var rr = !heb && rrule(r); if (rr) lines.push('RRULE:' + rr);
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escI(r.title), 'TRIGGER:-PT' + (r.lead || 0) + 'M', 'END:VALARM', 'END:VEVENT');
      });
    });
    lines.push('END:VCALENDAR');
    download('tizkorot.ics', lines.join('\r\n'), 'text/calendar');
    toast('נשמר קובץ יומן. אפשר לפתוח אותו ב-Google Calendar ← הגדרות ← ייבוא');
  }

  // המרה מהגרסה הקודמת של האפליקציה
  function fromOld(o) {
    try {
      var d = new Date(o.dueAt || o.datetime || Date.now()), rc = o.recurrence || { type: 'once' }, rep = { kind: 'none', every: 1, days: [], mdays: [], until: '' };
      switch (rc.type) {
        case 'daily': rep.kind = 'daily'; break;
        case 'every_x_days': rep.kind = 'daily'; rep.every = rc.intervalDays || 1; break;
        case 'every_x_hours': rep.kind = 'hours'; rep.every = rc.intervalHours || 1; break;
        case 'specific_days': rep.kind = 'weekly'; rep.days = rc.daysOfWeek || []; break;
        case 'weekly': rep.kind = 'weekly'; rep.days = rc.daysOfWeek && rc.daysOfWeek.length ? rc.daysOfWeek : [d.getDay()]; break;
        case 'monthly': rep.kind = 'monthly'; break;
        case 'yearly': rep.kind = 'yearly'; break;
      }
      var snd = { bell: 'chime', beep: 'beep', chord: 'piano', persistent: 'alarm' }[o.sound] || '';
      var r = { id: String(o.id || DB.rid(16)), type: 'task', title: o.title || '', notes: o.notes || '', start: S.fmtLocal(d), repeat: rep, lead: 0, nag: o.persistentAlarm ? 5 : 0, sound: snd, category: catById[o.category] ? o.category : 'other', priority: o.priority === 'high' ? 'high' : 'normal', image: null, subtasks: (o.subtasks || []).map(function (s) { return { id: s.id || DB.rid(8), text: s.text || '', done: !!s.done }; }), created: Date.parse(o.createdAt) || Date.now(), done: !!o.completed, doneAt: o.completedAt ? Date.parse(o.completedAt) : null };
      if (rep.kind !== 'none') r.ackedUntil = Date.now();
      return r;
    } catch (e) { return null; }
  }
  async function migrateOld() {
    try {
      if (await DB.meta('migrated')) return;
      var raw = localStorage.getItem('tizkorot_reminders_v1');
      await DB.setMeta('migrated', true);
      if (!raw) return;
      var old = JSON.parse(raw);
      if (!Array.isArray(old) || !old.length) return;
      var list = old.map(fromOld).filter(Boolean);
      await DB.putMany(list);
      var th = localStorage.getItem('tizkorot_theme_v1'); if (th === 'dark' || th === 'light') state.settings.theme = th;
      setTimeout(function () { toast('הועברו ' + list.length + ' תזכורות מהגרסה הקודמת ✓'); }, 800);
    } catch (e) {}
  }

  // ---------- נעילה ----------
  async function hash(pin) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tz-salt-' + pin));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function pinPad(title, onDone, canCancel) {
    var w = document.createElement('div'); w.className = 'lock-wrap'; w.id = 'lock-wrap';
    var pin = '';
    w.innerHTML = '<div class="lock"><img src="logo.png" alt=""><h2>' + esc(title) + '</h2><div class="dots"></div><div class="err"></div><div class="pad">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 'x', 0, 'ok'].map(function (k) { return '<button data-k="' + k + '">' + (k === 'x' ? '⌫' : k === 'ok' ? '✓' : k) + '</button>'; }).join('') + '</div>' + (canCancel ? '<button class="btn ghost" data-k="cancel" style="margin-top:14px">ביטול</button>' : '') + '</div>';
    document.body.appendChild(w);
    function draw() { $('.dots', w).innerHTML = new Array(Math.max(4, pin.length) + 1).join('.').split('').map(function (_, i) { return '<i class="' + (i < pin.length ? 'f' : '') + '"></i>'; }).join(''); }
    function err(m) { $('.err', w).textContent = m; var l = $('.lock', w); l.classList.add('shake'); setTimeout(function () { l.classList.remove('shake'); }, 400); pin = ''; draw(); }
    function key(k) {
      if (k === 'cancel') { w.remove(); return; }
      if (k === 'x') pin = pin.slice(0, -1);
      else if (k === 'ok') { if (pin.length < 4) return err('לפחות 4 ספרות'); onDone(pin, w, err); return; }
      else if (pin.length < 8) pin += k;
      $('.err', w).textContent = ''; draw();
    }
    w.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) key(b.dataset.k); });
    w._key = function (e) { if (/^\d$/.test(e.key)) key(e.key); else if (e.key === 'Backspace') key('x'); else if (e.key === 'Enter') key('ok'); };
    document.addEventListener('keydown', w._key);
    var obs = new MutationObserver(function () { if (!document.body.contains(w)) { document.removeEventListener('keydown', w._key); obs.disconnect(); } });
    obs.observe(document.body, { childList: true });
    draw();
  }
  function setPin() {
    pinPad('בחירת קוד חדש', function (p1, w) {
      w.remove();
      pinPad('הקלדה חוזרת של הקוד', async function (p2, w2, err) {
        if (p1 !== p2) return err('הקודים לא תואמים');
        state.settings.pinHash = await hash(p1); await saveSettings(); w2.remove(); toast('הקוד נשמר 🔒');
      }, true);
    }, true);
  }
  var hiddenAt = 0, locked = false;
  function lock() {
    if (!state.settings.pinHash || locked) return;
    locked = true;
    pinPad('הקלידו את הקוד', async function (p, w, err) {
      if (await hash(p) === state.settings.pinHash) { w.remove(); locked = false; nextAlarm(); }
      else err('קוד שגוי');
    }, false);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else {
      if (hiddenAt && Date.now() - hiddenAt > (state.settings.lockAfter || 0) * MIN) lock();
      lastTick = Math.min(lastTick, Date.now()); tick(); render(); DB.sync();
    }
  });

  // ---------- הפעלה ----------
  async function init() {
    view = $('#view');
    state.settings = Object.assign({}, DEFAULTS, (await DB.meta('settings')) || {});
    applyTheme();
    await migrateOld();
    state.list = await DB.all();
    $('#tabs').innerHTML = '<div class="in">' + [['home', 'home', 'בית'], ['list', 'list', 'תזכורות'], ['cal', 'cal', 'לוח שנה'], ['bday', 'cake', 'ימי הולדת'], ['done', 'done', 'בוצעו']].map(function (t) { return '<button data-tab="' + t[0] + '">' + ic(t[1]) + '<span>' + t[2] + '</span></button>'; }).join('') + '</div>';
    $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    $('#fab').innerHTML = ic('plus'); $('#fab').onclick = function () { openEditor(null, state.tab === 'bday' ? { type: 'birthday' } : (state.tab === 'cal' && state.calSel ? { start: state.calSel + 'T' + state.settings.defaultTime } : null)); };
    $('#mic').innerHTML = ic('mic'); $('#mic').onclick = function () { dictate(function (t) { quickAdd(t); }, $('#mic')); };
    $('#btn-settings').innerHTML = ic('gear'); $('#btn-settings').onclick = openSettings;
    $('#btn-search').innerHTML = ic('search'); $('#btn-search').onclick = function () { setTab('list'); setTimeout(function () { var s = $('#search'); if (s) s.focus(); }, 50); };
    $('#btn-install').innerHTML = ic('install') + ' התקנה'; $('#btn-install').onclick = doInstall;
    view.addEventListener('click', onViewClick);
    view.addEventListener('input', function (e) { if (e.target.id === 'search') { state.q = e.target.value; render(); } });
    view.addEventListener('submit', function (e) { if (e.target.id === 'quick') { e.preventDefault(); var i = $('#quick-in'); quickAdd(i.value); i.value = ''; } });
    view.addEventListener('click', function (e) { if (e.target.closest('#quick-mic')) dictate(function (t) { quickAdd(t); }, e.target.closest('#quick-mic')); });
    document.addEventListener('pointerdown', SND.unlock, { passive: true });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); if ($('#alarm-wrap')) return; closeSheet(); } });
    updateInstallBtn();
    rebuildJobs();
    render();
    if (state.settings.pinHash) lock();

    if (!NAT && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(function (reg) { reg.update().catch(function () {}); }).catch(function () {});
      navigator.serviceWorker.addEventListener('message', function (e) {
        var m = e.data || {};
        if (m.type === 'push' && m.data) { var key = m.data.rid + ':' + m.data.t; if (!fired[key] && document.visibilityState === 'visible') { fired[key] = 1; showAlarm(m.data); } }
        if (m.type === 'changed') DB.all().then(function (l) { state.list = l; rebuildJobs(); render(); });
        if (m.type === 'open' && m.data) { var r = findR(m.data.rid); if (r && !alarmOpen) openEditor(r); }
      });
    }
    if (NAT) NAT.onAction(function (a) {
      var d = a.data || {}, r = findR(d.rid);
      if (!r || d.rid === 'test') return;
      if (a.action === 'done') { S.markDone(r, Date.now()); save(r); toast('בוצע ✓'); }
      else if (a.action === 'snooze') { S.snooze(r, Date.now(), state.settings.snoozeMin || 10); save(r); toast('נדחה ל-' + whenLabel(r.snoozeUntil)); }
      else { fired[r.id + ':' + d.t] = 1; if (!alarmOpen) showAlarm({ rid: r.id, t: d.t || Date.now(), occ: d.occ || d.t, title: S.titleFor(r, d.occ || d.t || Date.now()), kind: d.kind || 'main' }); }
    });
    refreshBanner();
    var q = new URLSearchParams(location.search);
    if (q.get('open')) { var r0 = findR(q.get('open')); if (r0) { var st0 = S.status(r0, Date.now()); if (st0.state === 'overdue' || st0.state === 'snoozed') showAlarm({ rid: r0.id, t: Date.now(), occ: st0.at, title: S.titleFor(r0, st0.at), kind: 'main' }); else openEditor(r0); } history.replaceState(null, '', location.pathname); }
    if (q.get('new')) { openEditor(null, q.get('new') === 'birthday' ? { type: 'birthday' } : null); history.replaceState(null, '', location.pathname); }
    if (q.get('tab')) { setTab(q.get('tab')); history.replaceState(null, '', location.pathname); }
    // תזכורות שהגיע זמנן בזמן שהאפליקציה הייתה סגורה
    setTimeout(function () {
      var now = Date.now(), over = state.list.filter(function (r) { var s = S.status(r, now); return s.state === 'overdue' && now - s.at < 2 * 3600000; });
      over.slice(0, 5).forEach(function (r) { var s = S.status(r, now); var k = r.id + ':' + s.at; if (!fired[k]) { fired[k] = 1; alarmQ.push({ rid: r.id, t: s.at, occ: s.at, title: S.titleFor(r, s.at), kind: 'main' }); } });
      if (!alarmOpen && !locked) nextAlarm();
    }, 600);
    setInterval(tick, 1000);
    setInterval(function () { DB.sync(); }, 20 * MIN);
    DB.sync().then(function () { refreshBanner(); });
  }
  window.tzToast = toast;
  window.TZ = { state: state, openEditor: openEditor, parseQuick: parseQuick, render: render, save: save };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
