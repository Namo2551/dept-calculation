// test.js — รันด้วย: node test.js (ไม่ใช้ framework)
var C = require('./core.js');
var pass = 0, fail = 0;

function ok(cond, name) {
  if (cond) pass++; else { fail++; console.log('FAIL: ' + name); }
}
function near(a, b, name, tol) {
  tol = tol === undefined ? 0.01 : tol;
  ok(a !== null && Math.abs(a - b) <= tol, name + ' (ได้ ' + a + ' ต้องการ ' + b + ')');
}
function eq(a, b, name) { ok(a === b, name + ' (ได้ ' + JSON.stringify(a) + ' ต้องการ ' + JSON.stringify(b) + ')'); }

var B0 = 30000, APR = 16, r = APR / 100 / 12;
function A(m, floor) { return { balance: B0, apr: APR, strategy: 'pct', m: m, floor: floor }; }
function B(p) { return { balance: B0, apr: APR, strategy: 'fixed', p: p }; }
function endAt(s, k) { return s.rows[k - 1].end; }

// formatBaht
eq(C.formatBaht(30000), '30,000.00', 'formatBaht 30000');
eq(C.formatBaht(1234567.891), '1,234,567.89', 'formatBaht 1234567.891');
eq(C.formatBaht(0.5), '0.50', 'formatBaht 0.5');

// monthsToText
var mt = { 0: '0 เดือน', 5: '5 เดือน', 12: '1 ปี', 17: '1 ปี 5 เดือน', 24: '2 ปี', 51: '4 ปี 3 เดือน',
  53: '4 ปี 5 เดือน', 124: '10 ปี 4 เดือน', 173: '14 ปี 5 เดือน', 418: '34 ปี 10 เดือน' };
Object.keys(mt).forEach(function (k) { eq(C.monthsToText(+k), mt[k], 'monthsToText ' + k); });

// r และดอกเบี้ยเดือนแรก
near(r, 0.0133333, 'r', 1e-6);
near(C.simulate(B(1500)).rows[0].interest, 400, 'ดอกเบี้ยเดือนแรก');

// วิธี A 5% floor 0
var a5 = C.simulate(A(0.05, 0));
eq(a5.monthsTo1pct, 124, 'A5 monthsTo1pct'); eq(a5.months, 418, 'A5 months');
near(a5.totalInterest, 10909.08, 'A5 totalInterest'); eq(C.formatBaht(a5.totalInterest), '10,909.08', 'A5 totalInterest แสดงผล');
near(endAt(a5, 12), 19161.98, 'A5 end12'); near(endAt(a5, 24), 12239.38, 'A5 end24'); near(endAt(a5, 60), 3189.46, 'A5 end60');
near(a5.rows[0].payment, 1500, 'A5 pay1'); near(a5.rows[1].payment, 1445, 'A5 pay2'); near(a5.rows[11].payment, 994.57, 'A5 pay12');

// วิธี A 10% floor 0
var a10 = C.simulate(A(0.10, 0));
eq(a10.monthsTo1pct, 51, 'A10 monthsTo1pct'); eq(a10.months, 173, 'A10 months');
near(a10.totalInterest, 4615.38, 'A10 totalInterest'); eq(C.formatBaht(a10.totalInterest), '4,615.38', 'A10 totalInterest แสดงผล');
near(endAt(a10, 12), 10108.18, 'A10 end12'); near(endAt(a10, 24), 3405.84, 'A10 end24'); near(endAt(a10, 60), 130.28, 'A10 end60');

// วิธี A 5% floor 500
var a5f = C.simulate(A(0.05, 500));
eq(a5f.months, 53, 'A5f500 months'); near(a5f.totalInterest, 8980.60, 'A5f500 totalInterest');
near(a5f.lastPayment, 410.33, 'A5f500 lastPayment');

// วิธี B
var b1500 = C.simulate(B(1500));
eq(b1500.months, 24, 'B1500 months'); eq(b1500.monthsTo1pct, 24, 'B1500 monthsTo1pct');
near(b1500.totalPaid, 35126.95, 'B1500 totalPaid'); near(b1500.totalInterest, 5126.95, 'B1500 totalInterest');
near(endAt(b1500, 12), 15787.66, 'B1500 end12'); near(b1500.lastPayment, 626.95, 'B1500 lastPayment');

var b2000 = C.simulate(B(2000));
eq(b2000.months, 17, 'B2000 months'); near(b2000.totalInterest, 3695.90, 'B2000 totalInterest');
near(b2000.lastPayment, 1695.90, 'B2000 lastPayment');

var b1000 = C.simulate(B(1000));
eq(b1000.months, 39, 'B1000 months'); near(b1000.totalInterest, 8568.40, 'B1000 totalInterest');
near(b1000.lastPayment, 568.40, 'B1000 lastPayment');

var b400 = C.simulate(B(400));
eq(b400.neverDecreases, true, 'B400 neverDecreases'); eq(b400.months, null, 'B400 months');
near(endAt(b400, 12), 30000, 'B400 end12'); near(endAt(b400, 24), 30000, 'B400 end24');

var b300 = C.simulate(B(300));
eq(b300.neverDecreases, true, 'B300 neverDecreases');
near(endAt(b300, 1), 30100, 'B300 end1'); near(endAt(b300, 12), 31292.03, 'B300 end12'); near(endAt(b300, 24), 32806.64, 'B300 end24');

// requiredPayment
var req = { 12: [2721.9257, 2722, 2663.04], 24: [1468.8933, 1469, 5253.01], 36: [1054.7110, 1055, 7966.76], 60: [729.5417, 730, 13758.28] };
Object.keys(req).forEach(function (n) {
  var rp = C.requiredPayment(B0, APR, +n);
  near(rp.exact, req[n][0], 'requiredPayment exact n=' + n, 0.001);
  eq(rp.roundedUp, req[n][1], 'requiredPayment roundedUp n=' + n);
  var s = C.simulate(B(rp.roundedUp));
  eq(s.months, +n, 'จ่าย roundedUp หมดใน n=' + n);
  near(s.totalInterest, req[n][2], 'ดอกเบี้ยรวม n=' + n);
});

// สูตรปิด (Recurrence relations) และการตรวจกับตาราง
near(C.closedFormFixed(B0, r, 1500, 12), 15787.659144, 'closedFormFixed n=12', 1e-6);
ok(C.verifyClosedForm(B(1500), 24) < 1e-6, 'verifyClosedForm B1500 24 เดือน');
near(C.closedFormPct(B0, r, 0.05, 12), 19161.98, 'closedFormPct n=12');
ok(C.verifyClosedForm(A(0.05, 0), 124) < 1e-6, 'verifyClosedForm A5 124 เดือน');

// ข้อ 2 (induction): ยอดหนี้วิธี A ไม่เป็นศูนย์
[0.01, 0.05, 0.10, 0.5].forEach(function (m) {
  for (var n = 0; n <= 100; n++) ok(C.closedFormPct(B0, r, m, n) > 0, 'closedFormPct > 0 m=' + m + ' n=' + n);
});

// ข้อ 3 (induction): จ่ายไม่เกินดอกเบี้ยเดือนแรก หนี้ไม่ลด
[400, 300, 100].forEach(function (p) {
  var s = C.simulate(B(p));
  eq(s.neverDecreases, true, 'neverDecreases p=' + p);
  ok(s.rows.length === 120, '120 เดือน p=' + p);
  ok(s.rows.every(function (w) { return w.end >= 30000 - 1e-9; }), 'ทุกแถว >= B0 p=' + p);
});
eq(b1500.neverDecreases, false, 'B1500 neverDecreases = false');

// explainFirstMonthsTh
var ex = C.explainFirstMonthsTh(B(1500), 3);
eq(ex[0], 'เดือนที่ 1: ยอดเดิม 30,000.00 + ดอกเบี้ย 400.00 แล้วจ่าย 1,500.00 เหลือ 28,900.00', 'explain เดือน 1');
eq(ex[1], 'เดือนที่ 2: ยอดเดิม 28,900.00 + ดอกเบี้ย 385.33 แล้วจ่าย 1,500.00 เหลือ 27,785.33', 'explain เดือน 2');

// toCsv
var lines = C.toCsv(b1500.rows).split('\n');
eq(lines[0], 'เดือน,ยอดต้นเดือน,ดอกเบี้ย,เงินที่จ่าย,ยอดปลายเดือน', 'CSV header');
eq(lines.length - 1, b1500.rows.length, 'CSV จำนวนบรรทัด');

// ===== v1 =====
function sum(a, key) { return a.reduce(function (s, x) { return s + x[key]; }, 0); }

// splitByYear
var yb = C.splitByYear(b1500.rows);
eq(yb.length, 2, 'splitByYear B จำนวนปี');
near(yb[0].interest, 3787.66, 'B ปี1 interest'); near(yb[0].principal, 14212.34, 'B ปี1 principal');
near(yb[1].interest, 1339.29, 'B ปี2 interest'); near(yb[1].principal, 15787.66, 'B ปี2 principal');
near(sum(yb, 'interest'), 5126.95, 'B รวม interest'); near(sum(yb, 'principal'), 30000, 'B รวม principal');
var ya = C.splitByYear(a5.rows);
eq(ya.length, 35, 'splitByYear A จำนวนปี');
near(ya[0].interest, 3941.10, 'A ปี1 interest'); near(ya[0].principal, 10838.02, 'A ปี1 principal');
near(ya[1].interest, 2517.31, 'A ปี2 interest'); near(ya[1].principal, 6922.60, 'A ปี2 principal');

// compareSentenceTh
eq(C.compareSentenceTh(a5, b1500, { m: 0.05, p: 1500 }),
  'จ่ายขั้นต่ำ 5% ใช้เวลา 34 ปี 10 เดือน (ดอกเบี้ย 10,909.08 บาท) ส่วนจ่ายคงที่ 1,500.00 บาทใช้เวลา 2 ปี (ดอกเบี้ย 5,126.95 บาท) ต่างกัน 5,782.13 บาท',
  'compareSentenceTh A5 vs B1500');
ok(C.compareSentenceTh(a5, b400, { m: 0.05, p: 400 }).indexOf('ไม่หมดหนี้ภายใน 100 ปี') >= 0 &&
   C.compareSentenceTh(a5, b400, { m: 0.05, p: 400 }).indexOf('ต่างกัน') < 0, 'compareSentenceTh กรณีไม่หมดหนี้');
ok(C.compareSentenceTh(a5, b1500, { m: 0.075, p: 1500 }).indexOf('จ่ายขั้นต่ำ 7.5% ') === 0, 'compareSentenceTh m=7.5');

// inductionStepDemo (Mathematical reasoning)
for (var k = 0; k <= 60; k++) ok(C.inductionStepDemo({ balance: B0, apr: APR, p: 1500, k: k }).diff < 1e-6, 'inductionStepDemo diff k=' + k);
near(C.inductionStepDemo({ balance: B0, apr: APR, p: 1500, k: 11 }).nextByClosedForm, 15787.659144, 'inductionStepDemo k=11', 1e-6);

// simulateMulti
var cards = [
  { name: 'บัตร A', balance: 20000, apr: 24, m: 0.05, floor: 200 },
  { name: 'บัตร B', balance: 8000, apr: 18, m: 0.05, floor: 200 },
  { name: 'บัตร C', balance: 3000, apr: 12, m: 0.05, floor: 200 }];
function multi(s, b) { return C.simulateMulti({ cards: cards, budget: b, strategy: s }); }
function checkMulti(tag, r, x) {
  eq(r.months, x.months, tag + ' months');
  if (x.paid) eq(JSON.stringify(r.paidOffMonth), JSON.stringify(x.paid), tag + ' paidOffMonth');
  near(r.totalInterest, x.interest, tag + ' totalInterest');
  if (x.totalPaid) near(r.totalPaid, x.totalPaid, tag + ' totalPaid');
  if (x.ends) x.ends.forEach(function (v, i) { near(r.totals[i].balance, v, tag + ' ยอดรวมเดือน ' + (i + 1)); });
  if (x.last) near(r.totals[r.totals.length - 1].payment, x.last, tag + ' เงินจ่ายเดือนสุดท้าย');
  if (x.low !== undefined) eq(r.budgetTooLow, x.low, tag + ' budgetTooLow');
}
checkMulti('avalanche 3000', multi('avalanche', 3000), { months: 12, paid: [10, 12, 12], interest: 3390.91, totalPaid: 34390.91, ends: [28550, 26054.10, 23511.35], last: 1390.91, low: false });
checkMulti('snowball 3000', multi('snowball', 3000), { months: 12, paid: [12, 6, 2], interest: 3827.52, totalPaid: 34827.52, ends: [28550, 26068.10, 23553.21], last: 1827.52 });
checkMulti('minonly', multi('minonly', 3000), { months: 79, paid: [79, 44, 17], interest: 14598.37, totalPaid: 45598.37, ends: [29950, 28926.10, 27927.40] });
checkMulti('avalanche 2000', multi('avalanche', 2000), { months: 19, interest: 5474.99 });
checkMulti('snowball 2000', multi('snowball', 2000), { months: 19, interest: 5965.28 });
checkMulti('avalanche 1000', multi('avalanche', 1000), { months: 45, interest: 13731.21, low: true });
near(31000 + 550 - 3000, multi('avalanche', 3000).totals[0].balance, 'เช็กยอดรวมเดือนแรก 31000+550−3000');

// encodeState / decodeState
var st = { single: { bal: '30,000', apr: 16.5, m: 7.5 }, cards: [{ name: 'บัตรเงินสด ใบที่ ๑', balance: 1234.56, apr: 18.25 }], budget: 3000 };
eq(JSON.stringify(C.decodeState(C.encodeState(st))), JSON.stringify(st), 'encode/decode round trip');
eq(C.decodeState('%%%'), null, 'decodeState("%%%") = null');

console.log('ผ่าน ' + pass + ' / ' + (pass + fail) + (fail ? ' — ไม่ผ่าน ' + fail : ' — ผ่านทั้งหมด'));
process.exit(fail ? 1 : 0);
