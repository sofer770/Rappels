/* תזכורות - תזכורת לפי מיקום (רק באפליקציית האנדרואיד).
   בעורך התזכורת נוסף כרטיס "מיקום": בוחרים מקום (המיקום הנוכחי או חיפוש כתובת),
   ואם להזכיר בהגעה או ביציאה. הטלפון עצמו מקפיץ את ההתראה, גם כשהאפליקציה סגורה. */
(function (g) {
  'use strict';
  var N = g.TZNative;
  if (!N || !N.geo) return;
  var GEO = N.geo;
  var RADII = [[100, '100 מטר'], [200, '200 מטר'], [300, '300 מטר'], [500, 'חצי קילומטר'], [1000, 'קילומטר']];

  var css = document.createElement('style');
  css.textContent = '.loc-mode .chips:has([data-quick]), .loc-mode .row:has(#f-date), .loc-mode .heb-note, .loc-mode .card:has(#f-rep), .loc-mode .field:has(#f-lead), .loc-mode .field:has(#f-nag) { display: none !important; }' +
    '.tz-loc .res { display: grid; gap: 6px; margin-top: 8px; } .tz-loc .res button { text-align: start; } .tz-loc .place { font-weight: 700; margin: 6px 0; }';
  document.head.appendChild(css);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, a, fn) { if (g.tzToast) g.tzToast(m, a, fn); }

  function mount(d) {
    var form = d.el, r = d.reminder;
    if (!form || !r) return;
    var old = form.querySelector('.tz-loc'); if (old) old.remove();
    form.classList.remove('loc-mode');
    if (r.type === 'birthday') return;
    var on = !!r.locMode || !!(r.loc && typeof r.loc.lat === 'number');
    r.locMode = on;
    if (on) form.classList.add('loc-mode');
    var L = r.loc = Object.assign({ on: 'enter', radius: 200, every: false }, r.loc || {});
    var card = document.createElement('div');
    card.className = 'card tz-loc';
    var results = [];
    function draw(msg) {
      var h = '<label class="switch"><span>📍 להזכיר לפי מקום (במקום שעה)</span><input type="checkbox" data-l="toggle"' + (on ? ' checked' : '') + '></label>';
      if (on) {
        h += '<div class="place">' + (typeof L.lat === 'number' ? '📍 ' + esc(L.name || 'המקום שנבחר') : 'עוד לא נבחר מקום') + '</div>';
        h += '<div class="row" style="flex-wrap:wrap"><button type="button" class="btn" data-l="here">המיקום הנוכחי שלי</button></div>';
        h += '<div class="field row" style="margin-top:8px"><input class="input" id="loc-q" placeholder="או חיפוש כתובת, למשל: שופרסל רמת גן" autocomplete="off"><button type="button" class="btn" data-l="search">חיפוש</button></div>';
        if (msg) h += '<p class="small">' + esc(msg) + '</p>';
        if (results.length) h += '<div class="res">' + results.map(function (x, i) { return '<button type="button" class="btn ghost" data-pick="' + i + '">' + esc(x.name) + '</button>'; }).join('') + '</div>';
        h += '<div class="seg" style="margin-top:10px"><button type="button" data-on="enter" class="' + (L.on !== 'exit' ? 'on' : '') + '">כשמגיעים לשם</button><button type="button" data-on="exit" class="' + (L.on === 'exit' ? 'on' : '') + '">כשיוצאים משם</button></div>';
        h += '<div class="row" style="margin-top:8px"><div class="field"><label for="loc-r">מרחק מהמקום</label><select class="input" id="loc-r">' + RADII.map(function (o) { return '<option value="' + o[0] + '"' + (+L.radius === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>';
        h += '<label class="switch"><span>להזכיר בכל פעם (ולא רק בפעם הראשונה)</span><input type="checkbox" data-l="every"' + (L.every ? ' checked' : '') + '></label>';
      }
      card.innerHTML = h;
    }
    card.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.l === 'toggle') { on = r.locMode = t.checked; form.classList.toggle('loc-mode', on); draw(); }
      if (t.dataset.l === 'every') L.every = t.checked;
      if (t.id === 'loc-r') L.radius = +t.value;
    });
    card.addEventListener('keydown', function (e) { if (e.target.id === 'loc-q' && e.key === 'Enter') { e.preventDefault(); search(); } });
    card.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.on) { L.on = b.dataset.on; draw(); }
      if (b.dataset.l === 'here') here();
      if (b.dataset.l === 'search') search();
      if (b.dataset.pick != null) { var x = results[+b.dataset.pick]; L.lat = x.lat; L.lng = x.lng; L.name = x.name; results = []; draw(); }
    });
    async function here() {
      draw('מאתר את המיקום...');
      try {
        var st = await GEO.requestLocation();
        if (!st.fine) { draw('צריך לאשר גישה למיקום כדי לבחור את המיקום הנוכחי.'); return; }
        var p = await GEO.current();
        L.lat = p.lat; L.lng = p.lng; L.name = 'המיקום הנוכחי';
        try { var a = await GEO.search({ lat: p.lat, lng: p.lng }); if (a.results && a.results[0]) L.name = a.results[0].name; } catch (e) {}
        draw();
      } catch (e) { draw('לא הצלחתי לאתר את המיקום. בדקו שהמיקום (GPS) דלוק בטלפון.'); }
    }
    async function search() {
      var q = (card.querySelector('#loc-q') || {}).value || '';
      if (!q.trim()) return;
      draw('מחפש...');
      try {
        var a = await GEO.search({ q: q.trim() });
        results = a.results || [];
        draw(results.length ? 'בחרו את המקום הנכון:' : 'לא נמצא מקום כזה. נסו לכתוב כתובת מלאה עם עיר.');
      } catch (e) { results = []; draw('החיפוש נכשל. בדקו שיש אינטרנט ונסו שוב.'); }
    }
    draw();
    var first = form.querySelector('.card');
    if (first && first.nextSibling) form.insertBefore(card, first.nextSibling); else form.appendChild(card);
  }

  async function onSave(d) {
    var r = d.reminder; if (!r) return;
    if (!r.locMode || r.type === 'birthday') { delete r.loc; delete r.locMode; return; }
    delete r.locMode;
    if (typeof (r.loc || {}).lat !== 'number') { delete r.loc; toast('לא נבחר מקום, התזכורת נשמרה לפי שעה'); return; }
    try {
      var st = await GEO.status();
      if (!st.fine) st = await GEO.requestLocation();
      if (st.fine && !st.background) {
        toast('כדי שהתזכורת תקפוץ כשהאפליקציה סגורה, בחלון שייפתח בוחרים "לאפשר כל הזמן".', 'אישור', function () { GEO.requestBackground(); });
      }
    } catch (e) {}
  }

  document.addEventListener('tz:editor', function (e) { mount(e.detail); });
  document.addEventListener('tz:save', function (e) { onSave(e.detail); });
})(window);
