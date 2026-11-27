// מעתיק את קבצי האפליקציה לתיקייה www עבור אפליקציית האנדרואיד, ומוסיף את Capacitor ו-native.js.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
const files = ['index.html', 'styles.css', 'app.js', 'schedule.js', 'store.js', 'sounds.js', 'holidays.js', 'config.js', 'native.js', 'voice-note.js', 'location.js', 'manifest.json', 'logo.png', 'icon-192.png', 'badge.png', 'apple-touch-icon.png', 'icon-maskable-512.png'];
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
fs.copyFileSync(path.join(root, 'node_modules/@capacitor/core/dist/capacitor.js'), path.join(out, 'capacitor.js'));
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
if (!html.includes('<script src="config.js"></script>')) throw new Error('index.html: config.js script tag not found');
html = html.replace('<script src="config.js"></script>', '<script src="capacitor.js"></script>\n<script src="config.js"></script>');
if (!html.includes('<script src="app.js"></script>')) throw new Error('index.html: app.js script tag not found');
html = html.replace('<script src="app.js"></script>', '<script src="native.js"></script>\n<script src="app.js"></script>\n<script src="location.js"></script>');
// בלי manifest של אתר בתוך האפליקציה
html = html.replace(/<link rel="manifest"[^>]*>\s*/, '');
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('www ready:', fs.readdirSync(out).length, 'files');
