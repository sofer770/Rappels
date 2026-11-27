// מייצר קבצי WAV מהצלילים המסונתזים של האפליקציה (sounds.js), כדי שאפליקציית האנדרואיד
// תשמיע אותם גם כשהיא סגורה. מריצים פעם אחת כשמשנים צלילים: node scripts/render-sounds.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'android-res', 'raw');
const RATE = 22050, REPEAT = 2, GAP = 0.5;
(async () => {
  const src = fs.readFileSync(path.join(root, 'sounds.js'), 'utf8');
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<html></html>');
  const ids = await p.evaluate((src) => { window.AudioContext = function () {}; eval(src); return Sounds.list.map(s => [s.id, s.len]); }, src);
  for (const [id, len] of ids) {
    const dur = id === 'none' ? 0.3 : (len + GAP) * REPEAT + 0.6;
    const b64 = await p.evaluate(async ({ src, id, dur, RATE, REPEAT, GAP, len }) => {
      const off = new OfflineAudioContext(1, Math.ceil(RATE * dur), RATE);
      window.AudioContext = function () { return off; };
      off.resume = () => Promise.resolve();
      eval(src);
      // מנגנים כמה פעמים ברצף
      const s = Sounds.list.find(x => x.id === id);
      Sounds.play(id, 0.9);
      for (let i = 1; i < REPEAT; i++) { const t = 0.05 + i * (len + GAP); s.play(t); }
      const buf = await off.startRendering();
      const d = buf.getChannelData(0); let peak = 0; for (const v of d) peak = Math.max(peak, Math.abs(v));
      const gain = peak > 0 ? Math.min(4, 0.95 / peak) : 1;
      const n = d.length, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
      const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i] * gain)) * 32767, true);
      let bin = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
      return btoa(bin);
    }, { src, id, dur, RATE, REPEAT, GAP, len });
    fs.writeFileSync(path.join(out, 'snd_' + id + '.wav'), Buffer.from(b64, 'base64'));
    console.log('snd_' + id + '.wav');
  }
  await b.close();
})();
