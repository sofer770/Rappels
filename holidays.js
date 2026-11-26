/* תזכורות - תאריך עברי, חגים ומועדים לתצוגת לוח השנה. */
(function (g) {
  'use strict';
  var HEB_MONTH = { Tishri: 'תשרי', Heshvan: 'חשוון', Kislev: 'כסלו', Tevet: 'טבת', Shevat: 'שבט', Adar: 'אדר', 'Adar I': 'אדר א׳', 'Adar II': 'אדר ב׳', Nisan: 'ניסן', Iyar: 'אייר', Sivan: 'סיוון', Tamuz: 'תמוז', Av: 'אב', Elul: 'אלול' };
  var ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], TENS = ['', 'י', 'כ', 'ל'];
  function gem(n) {
    if (n === 15) return 'ט״ו'; if (n === 16) return 'ט״ז';
    var s = TENS[Math.floor(n / 10)] + ONES[n % 10];
    return s.length > 1 ? s.slice(0, -1) + '״' + s.slice(-1) : s + '׳';
  }
  function yearGem(y) {
    y = y % 1000; var h = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'][Math.floor(y / 100)];
    var r = y % 100, t = r === 15 ? 'טו' : r === 16 ? 'טז' : TENS.concat(['מ', 'נ', 'ס', 'ע', 'פ', 'צ'])[Math.floor(r / 10)] + ONES[r % 10];
    var s = h + t; return s.length > 1 ? s.slice(0, -1) + '״' + s.slice(-1) : s + '׳';
  }
  var cache = {};
  function heb(dt) {
    var k = dt.getFullYear() + '-' + dt.getMonth() + '-' + dt.getDate();
    if (cache[k]) return cache[k];
    var p = g.Sched.hebParts(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12));
    var o = { day: p.day, month: p.month, year: p.year, dayH: gem(p.day), monthH: HEB_MONTH[p.month] || p.month, yearH: yearGem(p.year) };
    o.full = o.dayH + ' ב' + o.monthH + ' ' + o.yearH;
    o.short = o.dayH + ' ' + o.monthH;
    return (cache[k] = o);
  }
  function isLeap(y) { return ((7 * y + 1) % 19) < 7; }
  // חגים: [חודש, יום, שם, סוג]  סוג: h=חג, m=מועד/שמחה, f=צום/זיכרון
  var FIXED = [
    ['Tishri', 1, 'ראש השנה', 'h'], ['Tishri', 2, 'ראש השנה', 'h'], ['Tishri', 3, 'צום גדליה', 'f'], ['Tishri', 10, 'יום כיפור', 'h'],
    ['Tishri', 15, 'סוכות', 'h'], ['Tishri', 16, 'חול המועד', 'm'], ['Tishri', 17, 'חול המועד', 'm'], ['Tishri', 18, 'חול המועד', 'm'], ['Tishri', 19, 'חול המועד', 'm'], ['Tishri', 20, 'חול המועד', 'm'],
    ['Tishri', 21, 'הושענא רבה', 'm'], ['Tishri', 22, 'שמיני עצרת', 'h'],
    ['Kislev', 25, 'חנוכה', 'm'], ['Kislev', 26, 'חנוכה', 'm'], ['Kislev', 27, 'חנוכה', 'm'], ['Kislev', 28, 'חנוכה', 'm'], ['Kislev', 29, 'חנוכה', 'm'], ['Kislev', 30, 'חנוכה', 'm'],
    ['Tevet', 10, 'עשרה בטבת', 'f'], ['Shevat', 15, 'ט״ו בשבט', 'm'],
    ['Nisan', 14, 'ערב פסח', 'm'], ['Nisan', 15, 'פסח', 'h'], ['Nisan', 16, 'חול המועד', 'm'], ['Nisan', 17, 'חול המועד', 'm'], ['Nisan', 18, 'חול המועד', 'm'], ['Nisan', 19, 'חול המועד', 'm'], ['Nisan', 20, 'חול המועד', 'm'], ['Nisan', 21, 'שביעי של פסח', 'h'],
    ['Nisan', 27, 'יום השואה', 'f'], ['Iyar', 4, 'יום הזיכרון', 'f'], ['Iyar', 5, 'יום העצמאות', 'm'], ['Iyar', 18, 'ל״ג בעומר', 'm'], ['Iyar', 28, 'יום ירושלים', 'm'],
    ['Sivan', 6, 'שבועות', 'h'], ['Tamuz', 17, 'י״ז בתמוז', 'f'], ['Av', 9, 'תשעה באב', 'f'], ['Av', 15, 'ט״ו באב', 'm'], ['Elul', 29, 'ערב ראש השנה', 'm']
  ];
  function holidays(dt) {
    var h = heb(dt), out = [], m = h.month;
    var adarMain = isLeap(h.year) ? 'Adar II' : 'Adar';
    FIXED.forEach(function (f) { if (f[0] === m && f[1] === h.day) out.push({ name: f[2], kind: f[3] }); });
    if (m === adarMain && h.day === 13) out.push({ name: 'תענית אסתר', kind: 'f' });
    if (m === adarMain && h.day === 14) out.push({ name: 'פורים', kind: 'm' });
    if (m === adarMain && h.day === 15) out.push({ name: 'שושן פורים', kind: 'm' });
    // חנוכה ממשיך לטבת (סה״כ 8 ימים)
    if (m === 'Tevet' && h.day <= 3) {
      var y = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - h.day);
      var kislevLast = heb(y).day; // 29 או 30
      if (h.day <= (kislevLast === 30 ? 2 : 3)) out.push({ name: 'חנוכה', kind: 'm' });
    }
    if ((h.day === 1 || h.day === 30) && m !== 'Tishri') out.push({ name: 'ראש חודש', kind: 'r' });
    return out;
  }
  g.Heb = { date: heb, holidays: holidays, gem: gem };
})(window);
