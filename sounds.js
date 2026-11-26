/* תזכורות - צלילי התראה מקוריים, מסונתזים בדפדפן (בלי קבצים). */
(function (g) {
  'use strict';
  var ctx = null, master = null, loopTimer = null, loopStop = 0, current = [];
  function ac() {
    if (!ctx) {
      var C = g.AudioContext || g.webkitAudioContext;
      if (!C) return null;
      ctx = new C(); master = ctx.createGain(); master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, t0, dur, opts) {
    opts = opts || {};
    var o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + (opts.glide || dur));
    if (opts.vib) {
      var l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = opts.vib; lg.gain.value = freq * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur + 0.05);
    }
    var v = opts.vol == null ? 0.3 : opts.vol, a = opts.attack || 0.005;
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(v, t0 + a);
    if (opts.flat) { gn.gain.setValueAtTime(v, t0 + dur - 0.03); gn.gain.linearRampToValueAtTime(0.0001, t0 + dur); }
    else gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn); gn.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
    current.push(o);
  }
  function noise(t0, dur, vol, freq) {
    var len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq || 3000; f.Q.value = 1.2;
    gn.gain.setValueAtTime(vol || 0.1, t0); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(gn); gn.connect(master); s.start(t0); current.push(s);
  }
  function bellAt(f, t, dur, vol) {
    [[1, 1], [2.0, 0.5], [2.76, 0.35], [5.4, 0.2], [8.9, 0.08]].forEach(function (p) { tone(f * p[0], t, dur / (p[0] * 0.6 + 0.4), { vol: vol * p[1] }); });
  }
  var N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.5, G6: 1568 };

  // כל צליל: שם בעברית, פונקציה שמנגנת, ומשך (שניות)
  var LIST = [
    { id: 'chime', name: 'פעמונים רכים', len: 1.6, play: function (t) { tone(N.E6, t, 1.2, { vol: 0.25 }); tone(N.C6, t + 0.25, 1.3, { vol: 0.25 }); tone(N.G5, t + 0.5, 1.1, { vol: 0.2 }); } },
    { id: 'marimba', name: 'מרימבה', len: 1.2, play: function (t) { [N.C5, N.E5, N.G5, N.C6].forEach(function (f, i) { tone(f, t + i * 0.13, 0.45, { type: 'triangle', vol: 0.4 }); tone(f * 4, t + i * 0.13, 0.08, { vol: 0.05 }); }); } },
    { id: 'dingdong', name: 'דינג-דונג', len: 1.6, play: function (t) { bellAt(N.E5, t, 1.4, 0.22); bellAt(N.C5, t + 0.55, 1.6, 0.22); } },
    { id: 'harp', name: 'נבל', len: 1.6, play: function (t) { [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6, N.D6, N.E6].forEach(function (f, i) { tone(f, t + i * 0.07, 1.0, { type: 'triangle', vol: 0.18 }); }); } },
    { id: 'birds', name: 'ציוץ ציפורים', len: 1.5, play: function (t) { for (var i = 0; i < 6; i++) { var s = t + i * 0.18 + (i % 2 ? 0.05 : 0); tone(2600 + (i % 3) * 300, s, 0.09, { to: 4200, glide: 0.08, vol: 0.12 }); tone(3800, s + 0.1, 0.06, { to: 2500, glide: 0.05, vol: 0.08 }); } } },
    { id: 'drops', name: 'טיפות מים', len: 1.3, play: function (t) { [0, 0.22, 0.38, 0.7, 0.85].forEach(function (d, i) { tone(900 + i * 120, t + d, 0.18, { to: 1800 + i * 150, glide: 0.06, vol: 0.25 }); }); } },
    { id: 'beep', name: 'צפצוף דיגיטלי', len: 1.1, play: function (t) { for (var i = 0; i < 3; i++) tone(1046, t + i * 0.3, 0.16, { type: 'square', vol: 0.12, flat: true }); } },
    { id: 'alarm', name: 'שעון מעורר', len: 1.6, play: function (t) { for (var i = 0; i < 8; i++) tone(i % 2 ? 1250 : 1000, t + i * 0.18, 0.15, { type: 'square', vol: 0.12, flat: true }); } },
    { id: 'gong', name: 'גונג', len: 3, play: function (t) { [[110, 0.35], [221, 0.2], [292, 0.15], [413, 0.1], [587, 0.06]].forEach(function (p) { tone(p[0], t, 3, { vol: p[1], attack: 0.02 }); }); noise(t, 0.3, 0.05, 800); } },
    { id: 'temple', name: 'פעמון עמוק', len: 2.6, play: function (t) { bellAt(N.A4 / 2, t, 2.6, 0.3); } },
    { id: 'flute', name: 'חליל', len: 1.8, play: function (t) { [N.G5, N.A5, N.C6, N.A5].forEach(function (f, i) { tone(f, t + i * 0.38, 0.42, { vib: 5, vol: 0.2, attack: 0.06, flat: true }); }); } },
    { id: 'piano', name: 'פסנתר', len: 1.8, play: function (t) { [[N.C5, 0], [N.E5, 0.18], [N.G5, 0.36], [N.C6, 0.54]].forEach(function (p) { tone(p[0], t + p[1], 1.2, { type: 'triangle', vol: 0.28 }); tone(p[0] * 2, t + p[1], 0.6, { vol: 0.06 }); }); } },
    { id: 'pulse', name: 'דופק עדין', len: 1.4, play: function (t) { for (var i = 0; i < 4; i++) tone(330, t + i * 0.3, 0.22, { vol: 0.3, attack: 0.03 }); } },
    { id: 'rise', name: 'עולה ומתעורר', len: 1.4, play: function (t) { tone(400, t, 1.1, { to: 1600, glide: 1.0, vol: 0.2, attack: 0.1 }); tone(800, t + 0.2, 0.9, { to: 2400, glide: 0.8, vol: 0.08, attack: 0.1 }); } },
    { id: 'kalimba', name: 'קלימבה', len: 1.5, play: function (t) { [N.E5, N.G5, N.B5, N.D6, N.B5].forEach(function (f, i) { tone(f, t + i * 0.16, 0.7, { vol: 0.25 }); tone(f * 5.4, t + i * 0.16, 0.05, { vol: 0.03 }); }); } },
    { id: 'retro', name: 'משחק רטרו', len: 1.0, play: function (t) { [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6].forEach(function (f, i) { tone(f, t + i * 0.08, 0.08, { type: 'square', vol: 0.09, flat: true }); }); } },
    { id: 'none', name: 'שקט (רק חלון)', len: 0.1, play: function () {} }
  ];
  var byId = {}; LIST.forEach(function (s) { byId[s.id] = s; });

  function stop() {
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
    current.forEach(function (o) { try { o.stop(); } catch (e) {} });
    current = [];
  }
  function play(id, volume) {
    var c = ac(); if (!c) return 0;
    var s = byId[id] || byId.chime;
    master.gain.value = volume == null ? 0.8 : volume;
    current = current.filter(function () { return true; });
    s.play(c.currentTime + 0.05);
    return s.len;
  }
  // מנגן שוב ושוב עד עצירה (מקסימום maxSec שניות)
  function loop(id, volume, maxSec) {
    stop();
    loopStop = Date.now() + (maxSec || 90) * 1000;
    (function again() {
      var len = play(id, volume);
      if (Date.now() + (len + 1.2) * 1000 < loopStop) loopTimer = setTimeout(again, (len + 1.2) * 1000);
    })();
  }
  function unlock() { var c = ac(); if (c && c.state === 'suspended') c.resume(); }
  function locked() { return !ctx || ctx.state !== 'running'; }

  g.Sounds = { list: LIST, play: play, loop: loop, stop: stop, unlock: unlock, locked: locked, name: function (id) { return (byId[id] || byId.chime).name; } };
})(window);
