/*
 * voice-note.js - הודעה קולית מוקלטת לתזכורת
 *
 * מוסיף לעורך התזכורת כפתור מיקרופון להקלטת הודעה קולית. ההקלטה נשמרת
 * במכשיר (IndexedDB 'tz-voice') ומתנגנת אוטומטית כשהתזכורת קופצת.
 *
 * מתחבר לאפליקציה דרך אירועים בלבד (בלי לגעת בקוד שלה):
 *   'tz:editor'      detail {el, reminder}   העורך נפתח. ה-UI נכנס ל-.tz-voice-slot
 *   'tz:save'        detail {reminder}       לפני שמירה. כאן נקבע reminder.voiceId
 *   'tz:alarm'       detail {reminder}       ההתראה נפתחה. ההודעה מתנגנת
 *   'tz:alarm-close' detail {reminder}       ההתראה נסגרה. ההשמעה נעצרת
 *   'tz:delete'      detail {reminder}       תזכורת נמחקה. ההקלטה נמחקת
 *   'tz:render'      (אופציונלי) אחרי ציור רשימה: ממלא .tz-voice-badge[data-id]
 *
 * API גלובלי: window.TzVoice
 */
(function () {
  'use strict';

  var MAX_SECONDS = 180;
  var DB_NAME = 'tz-voice';
  var STORE = 'notes';

  // ---------------------------------------------------------------- storage
  var dbPromise = null;
  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('no-idb')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(STORE, mode);
        var out = fn(t.objectStore(STORE));
        t.oncomplete = function () { resolve(out && 'result' in out ? out.result : undefined); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }
  var store = {
    put: function (rec) { return tx('readwrite', function (s) { return s.put(rec); }); },
    get: function (id) { return id ? tx('readonly', function (s) { return s.get(id); }) : Promise.resolve(null); },
    del: function (id) { return id ? tx('readwrite', function (s) { return s.delete(id); }) : Promise.resolve(); },
    keys: function () { return tx('readonly', function (s) { return s.getAllKeys(); }); }
  };

  function newId() {
    return 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------------------------------------------------------------- helpers
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }
  function icon(name) {
    var paths = {
      mic: '<path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3M8.5 21h7"/>',
      stop: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/>',
      play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
      pause: '<rect x="7" y="5.5" width="3.5" height="13" rx="1" fill="currentColor"/><rect x="13.5" y="5.5" width="3.5" height="13" rx="1" fill="currentColor"/>',
      trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
      redo: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>'
    };
    var span = document.createElement('span');
    span.className = 'tzv-ico';
    span.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
    return span;
  }
  function toast(msg) {
    // Uses the app's toast if it exposes one, otherwise a small built-in one.
    if (typeof window.tzToast === 'function') { window.tzToast(msg); return; }
    var t = h('div', { class: 'tzv-toast', role: 'status', text: msg });
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('tzv-toast-out'); }, 2600);
    setTimeout(function () { t.remove(); }, 3000);
  }
  function supported() {
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && window.MediaRecorder);
  }
  function pickMime() {
    var opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'];
    for (var i = 0; i < opts.length; i++) {
      try { if (MediaRecorder.isTypeSupported(opts[i])) return opts[i]; } catch (e) {}
    }
    return '';
  }
  function micErrorText(err) {
    var n = err && err.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'אין הרשאה למיקרופון. אפשר אותה בהגדרות הדפדפן ונסה שוב.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'לא נמצא מיקרופון במכשיר.';
    if (n === 'NotReadableError') return 'המיקרופון תפוס על ידי אפליקציה אחרת.';
    return 'לא הצלחתי להפעיל את המיקרופון.';
  }

  // ---------------------------------------------------------------- playback
  var player = { audio: null, url: null, onState: null };
  function stopPlayback() {
    if (player.audio) { try { player.audio.pause(); } catch (e) {} }
    if (player.url) { URL.revokeObjectURL(player.url); }
    var cb = player.onState;
    player.audio = null; player.url = null; player.onState = null;
    if (cb) cb('stopped');
  }
  function playBlob(blob, onState) {
    stopPlayback();
    var url = URL.createObjectURL(blob);
    var a = new Audio(url);
    player.audio = a; player.url = url; player.onState = onState || null;
    a.onended = function () { if (player.audio === a) stopPlayback(); };
    a.ontimeupdate = function () { if (player.audio === a && onState) onState('time', a.currentTime, a.duration); };
    if (onState) onState('playing');
    return a.play().catch(function (err) {
      if (player.audio === a) stopPlayback();
      throw err;
    });
  }
  function playId(id, onState) {
    return store.get(id).then(function (rec) {
      if (!rec || !rec.blob) throw new Error('missing');
      return playBlob(rec.blob, onState);
    });
  }

  // ---------------------------------------------------------------- recorder
  var rec = null; // active recording session
  function startRecording(onTick) {
    if (!supported()) return Promise.reject(Object.assign(new Error('unsupported'), { name: 'Unsupported' }));
    stopPlayback();
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      var mime = pickMime();
      var mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      var chunks = [];
      var started = Date.now();
      var session = { mr: mr, stream: stream, started: started, timer: null, analyser: null, ctx: null };

      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          session.ctx = new AC();
          var src = session.ctx.createMediaStreamSource(stream);
          session.analyser = session.ctx.createAnalyser();
          session.analyser.fftSize = 256;
          src.connect(session.analyser);
        }
      } catch (e) { session.analyser = null; }
      var buf = session.analyser ? new Uint8Array(session.analyser.fftSize) : null;

      session.done = new Promise(function (resolve) {
        mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        mr.onstop = function () {
          clearInterval(session.timer);
          stream.getTracks().forEach(function (t) { t.stop(); });
          if (session.ctx) { try { session.ctx.close(); } catch (e) {} }
          var type = mr.mimeType || mime || (chunks[0] && chunks[0].type) || 'audio/webm';
          resolve({ blob: new Blob(chunks, { type: type }), duration: (Date.now() - started) / 1000, type: type });
        };
      });
      session.timer = setInterval(function () {
        var elapsed = (Date.now() - started) / 1000;
        var level = 0;
        if (session.analyser) {
          session.analyser.getByteTimeDomainData(buf);
          var peak = 0;
          for (var i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
          level = Math.min(1, peak / 70);
        }
        if (onTick) onTick(elapsed, level);
        if (elapsed >= MAX_SECONDS) stopRecording();
      }, 100);
      mr.start(250);
      rec = session;
      return session;
    });
  }
  function stopRecording() {
    if (!rec) return Promise.resolve(null);
    var s = rec; rec = null;
    if (s.mr.state !== 'inactive') s.mr.stop();
    return s.done;
  }
  function cancelRecording() {
    if (!rec) return;
    var s = rec; rec = null;
    s.mr.ondataavailable = null;
    if (s.mr.state !== 'inactive') s.mr.stop();
  }

  // ---------------------------------------------------------------- editor UI
  // One editor at a time. draft = what the editor currently shows.
  //   draft.voiceId : id of the audio that will be attached on save (or null)
  //   draft.fresh   : ids recorded in this editor session (deleted if not kept)
  var editor = null;

  function mountEditor(detail) {
    var reminder = (detail && detail.reminder) || {};
    var root = detail && detail.el;
    var slot = (root && root.querySelector && root.querySelector('.tz-voice-slot')) || document.querySelector('.tz-voice-slot');
    if (!slot) return;
    cancelRecording();
    stopPlayback();
    discardUnsaved();

    var state = { voiceId: reminder.voiceId || null, origId: reminder.voiceId || null, fresh: [], duration: null };
    var box = h('div', { class: 'tzv-box', dir: 'rtl' });
    var label = h('div', { class: 'tzv-label', text: 'הודעה קולית' });
    var body = h('div', { class: 'tzv-body' });
    box.appendChild(label); box.appendChild(body);
    slot.innerHTML = '';
    slot.appendChild(box);
    editor = { state: state, slot: slot, body: body };

    function renderEmpty() {
      body.innerHTML = '';
      var btn = h('button', { type: 'button', class: 'tzv-btn tzv-rec', 'aria-label': 'הקלט הודעה קולית', onclick: begin }, [icon('mic'), h('span', { text: 'הקלט הודעה' })]);
      body.appendChild(btn);
      body.appendChild(h('span', { class: 'tzv-hint', text: 'תושמע בקולך כשהתזכורת תקפוץ' }));
      if (!supported()) {
        btn.disabled = true;
        body.lastChild.textContent = 'הדפדפן הזה לא תומך בהקלטה';
      }
    }
    function renderRecording() {
      body.innerHTML = '';
      var dot = h('span', { class: 'tzv-dot' });
      var time = h('span', { class: 'tzv-time', text: '0:00' });
      var meter = h('span', { class: 'tzv-meter' }, [h('span', { class: 'tzv-meter-fill' })]);
      var stop = h('button', { type: 'button', class: 'tzv-btn tzv-stop', 'aria-label': 'עצור הקלטה', onclick: finish }, [icon('stop'), h('span', { text: 'עצור' })]);
      body.appendChild(h('span', { class: 'tzv-live' }, [dot, h('span', { text: 'מקליט' }), time]));
      body.appendChild(meter);
      body.appendChild(stop);
      return { time: time, fill: meter.firstChild };
    }
    function renderHas(duration) {
      body.innerHTML = '';
      var play = h('button', { type: 'button', class: 'tzv-btn tzv-play', 'aria-label': 'השמע' }, [icon('play'), h('span', { text: 'השמע' })]);
      var len = h('span', { class: 'tzv-time', text: duration != null ? fmt(duration) : '' });
      play.addEventListener('click', function () {
        if (player.audio) { stopPlayback(); return; }
        playId(state.voiceId, function (st, t) {
          if (st === 'playing') { play.replaceChildren(icon('pause'), h('span', { text: 'עצור' })); }
          else if (st === 'time') { len.textContent = fmt(t); }
          else { play.replaceChildren(icon('play'), h('span', { text: 'השמע' })); len.textContent = duration != null ? fmt(duration) : ''; }
        }).catch(function () { toast('לא הצלחתי להשמיע את ההקלטה'); });
      });
      var redo = h('button', { type: 'button', class: 'tzv-btn tzv-ghost', 'aria-label': 'הקלט מחדש', title: 'הקלט מחדש', onclick: begin }, [icon('redo')]);
      var del = h('button', { type: 'button', class: 'tzv-btn tzv-ghost tzv-danger', 'aria-label': 'מחק הקלטה', title: 'מחק הקלטה', onclick: function () {
        stopPlayback();
        state.voiceId = null;
        renderEmpty();
      } }, [icon('trash')]);
      body.appendChild(play); body.appendChild(len); body.appendChild(h('span', { class: 'tzv-grow' })); body.appendChild(redo); body.appendChild(del);
    }

    var ui = null;
    function begin() {
      ui = renderRecording();
      startRecording(function (sec, level) {
        if (!ui) return;
        ui.time.textContent = fmt(sec);
        ui.fill.style.transform = 'scaleX(' + Math.max(0.04, level).toFixed(2) + ')';
        if (sec >= MAX_SECONDS) finish();
      }).catch(function (err) {
        ui = null;
        toast(err && err.name === 'Unsupported' ? 'הדפדפן הזה לא תומך בהקלטה' : micErrorText(err));
        if (state.voiceId) renderHas(state.duration); else renderEmpty();
      });
    }
    function finish() {
      if (!ui) return;
      ui = null;
      stopRecording().then(function (res) {
        if (!res || !res.blob.size || res.duration < 0.5) {
          toast('ההקלטה קצרה מדי, נסה שוב');
          if (state.voiceId) renderHas(state.duration); else renderEmpty();
          return;
        }
        var id = newId();
        return store.put({ id: id, blob: res.blob, type: res.type, duration: res.duration, createdAt: new Date().toISOString() }).then(function () {
          state.fresh.push(id);
          state.voiceId = id;
          state.duration = res.duration;
          renderHas(res.duration);
        });
      }).catch(function () {
        toast('שמירת ההקלטה נכשלה');
        renderEmpty();
      });
    }

    if (state.voiceId) {
      renderHas(null);
      store.get(state.voiceId).then(function (r) {
        if (editor && editor.state === state && r) { state.duration = r.duration; if (!ui && state.voiceId === r.id) renderHas(r.duration); }
        if (!r && editor && editor.state === state && state.voiceId === reminder.voiceId) { state.voiceId = null; renderEmpty(); }
      }).catch(function () {});
    } else {
      renderEmpty();
    }
  }

  // Remove audio recorded in an editor that was closed without saving.
  function discardUnsaved() {
    if (!editor) return;
    var s = editor.state;
    s.fresh.forEach(function (id) { store.del(id).catch(function () {}); });
    editor = null;
  }

  function onSave(detail) {
    var reminder = detail && detail.reminder;
    if (!reminder || !editor) return;
    cancelRecording();
    stopPlayback();
    var s = editor.state;
    reminder.voiceId = s.voiceId || null;
    // Delete anything this editor session replaced or recorded and dropped.
    var toDelete = s.fresh.filter(function (id) { return id !== s.voiceId; });
    if (s.origId && s.origId !== s.voiceId) toDelete.push(s.origId);
    toDelete.forEach(function (id) { store.del(id).catch(function () {}); });
    editor = null;
  }

  // ---------------------------------------------------------------- alarm UI
  var alarmTimer = null;
  function onAlarm(detail) {
    var reminder = detail && detail.reminder;
    clearTimeout(alarmTimer);
    document.querySelectorAll('.tzv-alarm').forEach(function (n) { n.remove(); });
    if (!reminder || !reminder.voiceId) return;
    store.get(reminder.voiceId).then(function (r) {
      if (!r || !r.blob) return;
      var slot = (detail.el && detail.el.querySelector && detail.el.querySelector('.tz-voice-alarm-slot')) ||
                 document.querySelector('.tz-voice-alarm-slot');
      var btn = h('button', { type: 'button', class: 'tzv-btn tzv-play tzv-alarm-btn' }, [icon('play'), h('span', { text: 'השמע את ההודעה הקולית' })]);
      var wrap = h('div', { class: 'tzv-alarm', dir: 'rtl' }, [btn]);
      if (slot) { slot.innerHTML = ''; slot.appendChild(wrap); }
      else if (detail.el && detail.el.appendChild) { detail.el.appendChild(wrap); }
      function state(st) {
        if (st === 'playing') btn.replaceChildren(icon('pause'), h('span', { text: 'עצור הודעה' }));
        else if (st === 'stopped') btn.replaceChildren(icon('play'), h('span', { text: 'השמע שוב' }));
      }
      btn.addEventListener('click', function () {
        if (player.audio) stopPlayback();
        else playBlob(r.blob, state).catch(function () { toast('לא הצלחתי להשמיע את ההודעה'); });
      });
      // Let the alarm tone sound first, then play the voice message.
      alarmTimer = setTimeout(function () {
        playBlob(r.blob, state).catch(function () {
          // Autoplay blocked: the button stays for a manual tap.
          btn.classList.add('tzv-pulse');
        });
      }, 1600);
    }).catch(function () {});
  }
  function onAlarmClose() {
    clearTimeout(alarmTimer);
    stopPlayback();
    document.querySelectorAll('.tzv-alarm').forEach(function (n) { n.remove(); });
  }

  function onDelete(detail) {
    var r = detail && detail.reminder;
    if (r && r.voiceId) store.del(r.voiceId).catch(function () {});
  }

  // Optional small play button on list cards: <span class="tz-voice-badge" data-voice-id="..."></span>
  function fillBadges(root) {
    (root || document).querySelectorAll('.tz-voice-badge[data-voice-id]').forEach(function (el) {
      var id = el.getAttribute('data-voice-id');
      if (!id || el.firstChild) return;
      var b = h('button', { type: 'button', class: 'tzv-chip', title: 'השמע הודעה קולית', 'aria-label': 'השמע הודעה קולית' }, [icon('mic'), h('span', { text: 'הודעה קולית' })]);
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (player.audio) { stopPlayback(); return; }
        playId(id, function (st) { b.classList.toggle('tzv-chip-on', st === 'playing'); })
          .catch(function () { toast('לא הצלחתי להשמיע את ההקלטה'); });
      });
      el.appendChild(b);
    });
  }

  // Remove audio that no reminder points to anymore.
  function prune(liveIds) {
    var keep = {};
    (liveIds || []).forEach(function (id) { if (id) keep[id] = 1; });
    if (editor) { editor.state.fresh.forEach(function (id) { keep[id] = 1; }); }
    return store.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return !keep[k]; }).map(store.del));
    });
  }

  // ---------------------------------------------------------------- styles
  var css = '' +
    '.tzv-box{--tzv-accent:var(--accent,#4f46e5);--tzv-bg:var(--surface-2,#f1f5f9);--tzv-fg:var(--text,#0f172a);--tzv-muted:var(--text-muted,#64748b);--tzv-rec:#e11d48;' +
      'background:var(--tzv-bg);color:var(--tzv-fg);border-radius:14px;padding:10px 12px;margin-top:8px;font:inherit}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not(.light) .tzv-box{--tzv-bg:var(--surface-2,#1e293b);--tzv-fg:var(--text,#e2e8f0);--tzv-muted:var(--text-muted,#94a3b8)}}' +
    '.dark .tzv-box,[data-theme="dark"] .tzv-box{--tzv-bg:var(--surface-2,#1e293b);--tzv-fg:var(--text,#e2e8f0);--tzv-muted:var(--text-muted,#94a3b8)}' +
    '.tzv-label{font-size:12px;font-weight:700;color:var(--tzv-muted);margin-bottom:6px}' +
    '.tzv-body{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:40px}' +
    '.tzv-btn{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:12px;padding:9px 14px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;min-height:40px;transition:transform .1s,opacity .2s}' +
    '.tzv-btn:active{transform:scale(.97)}.tzv-btn:disabled{opacity:.5;cursor:not-allowed}' +
    '.tzv-btn:focus-visible,.tzv-chip:focus-visible{outline:2px solid var(--tzv-accent,#4f46e5);outline-offset:2px}' +
    '.tzv-rec{background:var(--tzv-rec);color:#fff}' +
    '.tzv-stop{background:var(--tzv-fg);color:var(--tzv-bg)}' +
    '.tzv-play{background:var(--tzv-accent,#4f46e5);color:#fff}' +
    '.tzv-ghost{background:transparent;color:var(--tzv-muted);padding:9px}' +
    '.tzv-ghost:hover{color:var(--tzv-fg)}.tzv-danger:hover{color:var(--tzv-rec)}' +
    '.tzv-ico{display:inline-flex}.tzv-grow{flex:1}' +
    '.tzv-hint{font-size:12px;color:var(--tzv-muted)}' +
    '.tzv-time{font-variant-numeric:tabular-nums;font-size:14px;font-weight:600;color:var(--tzv-muted);min-width:3ch}' +
    '.tzv-live{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--tzv-rec)}' +
    '.tzv-live .tzv-time{color:inherit}' +
    '.tzv-dot{width:10px;height:10px;border-radius:50%;background:var(--tzv-rec);animation:tzv-blink 1s infinite}' +
    '.tzv-meter{flex:1;min-width:60px;height:6px;border-radius:3px;background:rgba(127,127,127,.25);overflow:hidden}' +
    '.tzv-meter-fill{display:block;height:100%;background:var(--tzv-rec);transform-origin:right;transform:scaleX(.04);transition:transform .1s}' +
    '.tzv-alarm{margin:10px 0}.tzv-alarm-btn{width:100%;justify-content:center;padding:12px 14px}' +
    '.tzv-pulse{animation:tzv-pulse 1.2s infinite}' +
    '.tzv-chip{display:inline-flex;align-items:center;gap:4px;border:0;border-radius:999px;padding:3px 9px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;background:rgba(79,70,229,.12);color:var(--accent,#4f46e5)}' +
    '.tzv-chip .tzv-ico svg{width:14px;height:14px}.tzv-chip-on{background:var(--accent,#4f46e5);color:#fff}' +
    '.tzv-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;z-index:9999;direction:rtl;max-width:calc(100% - 32px);transition:opacity .4s}' +
    '.tzv-toast-out{opacity:0}' +
    '@keyframes tzv-blink{50%{opacity:.25}}' +
    '@keyframes tzv-pulse{0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,.5)}50%{box-shadow:0 0 0 8px rgba(79,70,229,0)}}' +
    '@media (prefers-reduced-motion:reduce){.tzv-dot,.tzv-pulse{animation:none}}';
  function injectCss() {
    if (document.getElementById('tzv-style')) return;
    var s = document.createElement('style');
    s.id = 'tzv-style';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // ---------------------------------------------------------------- wiring
  injectCss();
  document.addEventListener('tz:editor', function (e) { mountEditor(e.detail); });
  document.addEventListener('tz:editor-close', function () { cancelRecording(); stopPlayback(); discardUnsaved(); });
  document.addEventListener('tz:save', function (e) { onSave(e.detail); });
  document.addEventListener('tz:alarm', function (e) { onAlarm(e.detail || {}); });
  document.addEventListener('tz:alarm-close', onAlarmClose);
  document.addEventListener('tz:delete', function (e) { onDelete(e.detail); });
  document.addEventListener('tz:render', function (e) { fillBadges(e.detail && e.detail.el); });

  window.TzVoice = {
    supported: supported,
    play: playId,
    stop: stopPlayback,
    prune: prune,
    fillBadges: fillBadges,
    _store: store
  };
})();
