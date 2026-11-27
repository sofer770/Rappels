// בדיקת הצפנת Web Push מול ספרייה עצמאית (http_ece) ובדיקת חתימת VAPID
import assert from 'node:assert/strict';
import ece from 'http_ece';
import crypto from 'node:crypto';
import { encryptPayload, generateVapid, sendPush, b64u, unb64u } from '../worker/push.js';

// מנוי מדומה של דפדפן
const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
const auth = crypto.randomBytes(16);
const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: b64u(ua.getPublicKey()), auth: b64u(auth) } };
const msg = JSON.stringify({ title: 'שלום עולם ✓', body: 'בדיקה', rid: 'x' });

const body = await encryptPayload(sub, msg);
const plain = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: ua, authSecret: auth });
assert.equal(plain.toString('utf8'), msg);
console.log('✓ payload decrypts with http_ece (RFC 8291)');

// VAPID: חתימה תקינה ומבנה הכותרת
const vapid = await generateVapid();
let captured;
globalThis.fetch = async (url, init) => { captured = { url, init }; return new Response('', { status: 201 }); };
const st = await sendPush(sub, { title: 't' }, vapid, 'https://example.com');
assert.equal(st.status, 201);
const h = captured.init.headers;
assert.equal(h['Content-Encoding'], 'aes128gcm');
const m = h.Authorization.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
assert.ok(m, h.Authorization);
const claims = JSON.parse(Buffer.from(unb64u(m[2])).toString());
assert.equal(claims.aud, 'https://fcm.googleapis.com');
assert.equal(claims.sub, 'https://example.com');
const pub = await crypto.webcrypto.subtle.importKey('raw', unb64u(m[4]), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
const okSig = await crypto.webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, unb64u(m[3]), new TextEncoder().encode(m[1] + '.' + m[2]));
assert.ok(okSig);
console.log('✓ VAPID JWT signature verifies');
console.log('\n2 push tests passed');
