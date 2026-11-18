// core.js — ฟังก์ชันคำนวณล้วน ๆ (ไม่แตะ DOM) ใช้ได้ทั้งเบราว์เซอร์ (window.DebtCore) และ Node (require)
(function (root) {
  'use strict';

  var EPS_PAID = 0.005;   // ถือว่าหมดหนี้เมื่อเหลือไม่เกิน 0.5 สตางค์
  var MAX_MONTHS = 1200;  // จำลองไม่เกิน 100 ปี
  var STUCK_MONTHS = 120; // กรณีหนี้ไม่ลด หยุดที่ 10 ปี

  // แสดงเงินบาท ทศนิยม 2 ตำแหน่ง มีจุลภาค (ไม่ใช้ toLocaleString)
  function formatBaht(n) {
    var cents = Math.round(Math.abs(n) * 100);
    var neg = n < 0 && cents !== 0;
    var intPart = String(Math.floor(cents / 100));
    var dec = String(cents % 100);
    if (dec.length < 2) dec = '0' + dec;
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + intPart + '.' + dec;
  }

  // 418 -> "34 ปี 10 เดือน"
  function monthsToText(n) {
    var y = Math.floor(n / 12), m = n % 12;
    if (y === 0) return m + ' เดือน';
    return m === 0 ? y + ' ปี' : y + ' ปี ' + m + ' เดือน';
  }

  // เงินที่ต้องจ่ายในเดือนนี้ ตามวิธีจ่าย
  function paymentFor(o, start, due) {
    if (o.strategy === 'fixed') return Math.min(o.p, due);
    return Math.min(Math.max(o.m * start, o.floor || 0), due);
  }

  // [Recurrence relations] จำลองทีละเดือน: B(k) = B(k-1) + ดอกเบี้ย − เงินที่จ่าย
  // = (1+r)·B(k-1) − p (วิธี B) หรือ (1+r−m)·B(k-1) (วิธี A, floor=0)
  function simulate(o) {
    var B0 = o.balance, r = o.apr / 100 / 12;
    var neverDecreases = o.strategy === 'fixed' && o.p <= r * B0;
    var limit = neverDecreases ? STUCK_MONTHS : MAX_MONTHS;
    var rows = [], bal = B0, totalPaid = 0;
    var months = null, monthsTo1pct = null;
    for (var k = 1; k <= limit; k++) {
      var start = bal, interest = start * r, due = start + interest;
      var payment = paymentFor(o, start, due);
      var end = due - payment; // ไม่ปัดเศษระหว่างคำนวณ
      rows.push({ month: k, start: start, interest: interest, payment: payment, end: end });
      totalPaid += payment;
      if (monthsTo1pct === null && end <= 0.01 * B0) monthsTo1pct = k;
      if (end <= EPS_PAID) { months = k; break; }
      bal = end;
    }
    return {
      rows: rows, r: r, months: months, monthsTo1pct: monthsTo1pct,
      totalPaid: totalPaid,
      // ดอกเบี้ยรวม = เงินที่จ่ายทั้งหมด − ยอดเริ่มต้น (เศษ ≤ 0.5 สตางค์ที่เหลือถือว่าหมดแล้ว)
      totalInterest: months === null ? null : totalPaid - B0,
      firstPayment: rows[0].payment,
      lastPayment: months === null ? null : rows[rows.length - 1].payment,
      neverDecreases: neverDecreases
    };
  }

  // [Recurrence relations -> สูตรปิด] Bn = (1+r)^n·B0 − p·((1+r)^n − 1)/r
  // (พิสูจน์ด้วย Mathematical induction ในหน้าเว็บ ข้อ 1)
  function closedFormFixed(B0, r, p, n) {
    if (r === 0) return B0 - p * n;
    var g = Math.pow(1 + r, n);
    return g * B0 - p * (g - 1) / r;
  }

  // [Recurrence relations -> สูตรปิด] Bn = B0·(1+r−m)^n (วิธี A, floor=0)
  function closedFormPct(B0, r, m, n) {
    return B0 * Math.pow(1 + r - m, n);
  }

  // ตั้ง Bn = 0 ในสูตรปิดแล้วแก้หา p: p = r·B0 / (1 − (1+r)^(−n))
  function requiredPayment(balance, apr, n) {
    var r = apr / 100 / 12;
    var exact = r === 0 ? balance / n : r * balance / (1 - Math.pow(1 + r, -n));
    return { exact: exact, roundedUp: Math.ceil(exact - 1e-9) };
  }

  // [Mathematical reasoning] เทียบสูตรปิดกับตารางทีละเดือน คืนความต่างสูงสุด (บาท)
  // ตรวจเฉพาะเดือนที่จ่ายตามกฎปกติ (เดือนสุดท้ายที่จ่ายแค่ยอดที่เหลือ สูตรปิดไม่ครอบคลุม)
  function verifyClosedForm(o, maxMonths) {
    var sim = simulate(o), r = sim.r, maxDiff = 0;
    for (var i = 0; i < sim.rows.length && i < maxMonths; i++) {
      var row = sim.rows[i], n = row.month, cf;
      if (o.strategy === 'fixed') {
        if (row.payment !== o.p) break;
        cf = closedFormFixed(o.balance, r, o.p, n);
      } else {
        if (row.payment !== o.m * row.start) break;
        cf = closedFormPct(o.balance, r, o.m, n);
      }
      maxDiff = Math.max(maxDiff, Math.abs(cf - row.end));
    }
    return maxDiff;
  }

  // ข้อความอธิบายเดือนแรก ๆ (เห็นการไล่ค่าลำดับทีละขั้น)
  function explainFirstMonthsTh(o, count) {
    return simulate(o).rows.slice(0, count).map(function (w) {
      return 'เดือนที่ ' + w.month + ': ยอดเดิม ' + formatBaht(w.start) +
        ' + ดอกเบี้ย ' + formatBaht(w.interest) + ' แล้วจ่าย ' + formatBaht(w.payment) +
        ' เหลือ ' + formatBaht(w.end);
    });
  }

  function toCsv(rows) {
    var lines = ['เดือน,ยอดต้นเดือน,ดอกเบี้ย,เงินที่จ่าย,ยอดปลายเดือน'];
    rows.forEach(function (w) {
      lines.push([w.month, w.start.toFixed(2), w.interest.toFixed(2), w.payment.toFixed(2), w.end.toFixed(2)].join(','));
    });
    return lines.join('\n');
  }

  // ===== v1 =====

  // รวมเงินที่จ่ายต่อปี แยกเป็นดอกเบี้ยกับเงินต้น (principal = payment − interest)
  function splitByYear(rows) {
    var out = [];
    rows.forEach(function (w) {
      var y = Math.floor((w.month - 1) / 12) + 1;
      if (!out[y - 1]) out[y - 1] = { year: y, interest: 0, principal: 0, payment: 0 };
      out[y - 1].interest += w.interest;
      out[y - 1].payment += w.payment;
    });
    out.forEach(function (o) { o.principal = o.payment - o.interest; });
    return out;
  }

  // 0.05 -> "5", 0.075 -> "7.5" (ตัดศูนย์ท้าย)
  function pctText(m) { return String(Math.round(m * 100 * 1e6) / 1e6); }

  // ประโยคเปรียบเทียบ A กับ B (params = { m: สัดส่วน, p: บาท })
  function compareSentenceTh(a, b, params) {
    var never = 'ไม่หมดหนี้ภายใน 100 ปี';
    var tA = a.months === null ? never : 'ใช้เวลา ' + monthsToText(a.months) + ' (ดอกเบี้ย ' + formatBaht(a.totalInterest) + ' บาท)';
    var tB = b.months === null ? never : 'ใช้เวลา ' + monthsToText(b.months) + ' (ดอกเบี้ย ' + formatBaht(b.totalInterest) + ' บาท)';
    var s = 'จ่ายขั้นต่ำ ' + pctText(params.m) + '% ' + tA + ' ส่วนจ่ายคงที่ ' + formatBaht(params.p) + ' บาท' + tB;
    if (a.months !== null && b.months !== null) {
      // ผลต่างของตัวเลขที่แสดง (ปัดเป็นสตางค์ก่อน) ผู้อ่านลบเองได้ตรงกัน
      var d = Math.abs(Math.round(a.totalInterest * 100) - Math.round(b.totalInterest * 100)) / 100;
      s += ' ต่างกัน ' + formatBaht(d) + ' บาท';
    }
    return s;
  }

  // [Mathematical reasoning] ขั้นอุปนัยหนึ่งขั้นด้วยตัวเลขจริง: ใช้สูตรลำดับจาก Bk แล้วเทียบกับสูตรปิดที่ k+1
  function inductionStepDemo(o) {
    var r = o.apr / 100 / 12;
    var Bk = closedFormFixed(o.balance, r, o.p, o.k);
    var nextByRecurrence = (1 + r) * Bk - o.p;
    var nextByClosedForm = closedFormFixed(o.balance, r, o.p, o.k + 1);
    return { Bk: Bk, nextByRecurrence: nextByRecurrence, nextByClosedForm: nextByClosedForm,
      diff: Math.abs(nextByRecurrence - nextByClosedForm) };
  }

  // หลายบัตร: แต่ละใบยังเป็นสูตรลำดับเดิม B(k) = (1+r)·B(k−1) − เงินที่จ่ายให้ใบนั้น [Recurrence relations]
  function simulateMulti(o) {
    var cards = o.cards, n = cards.length, strat = o.strategy;
    var bal = cards.map(function (c) { return c.balance; });
    var paidOffMonth = cards.map(function () { return null; });
    var totals = [], totalPaid = 0, months = null, budgetTooLow = false;
    var B0sum = bal.reduce(function (s, x) { return s + x; }, 0);
    for (var k = 1; k <= MAX_MONTHS; k++) {
      var active = [], due = [], minPay = [], pay = [];
      for (var i = 0; i < n; i++) {
        pay[i] = 0;
        if (paidOffMonth[i] !== null) continue;
        var start = bal[i], c = cards[i];
        due[i] = start * (1 + c.apr / 100 / 12);
        minPay[i] = Math.min(Math.max(c.m * start, c.floor || 0), due[i]);
        active.push(i);
      }
      if (k === 1 && strat !== 'minonly') {
        budgetTooLow = o.budget < active.reduce(function (s, i) { return s + minPay[i]; }, 0);
      }
      if (strat === 'minonly') {
        active.forEach(function (i) { pay[i] = minPay[i]; });
      } else {
        // ลำดับความสำคัญ: avalanche = APR มากก่อน, snowball = ยอดน้อยก่อน (เท่ากัน = ลำดับที่กรอก)
        var order = active.slice().sort(function (x, y) {
          var d = strat === 'avalanche' ? cards[y].apr - cards[x].apr : bal[x] - bal[y];
          return d !== 0 ? d : x - y;
        });
        var left = o.budget;
        order.forEach(function (i) { var t = Math.min(minPay[i], left); pay[i] = t; left -= t; }); // ขั้นต่ำก่อน
        order.forEach(function (i) { var t = Math.min(due[i] - pay[i], left); pay[i] += t; left -= t; }); // เงินเหลือจ่ายเพิ่ม
      }
      var sumEnd = 0, sumPay = 0;
      active.forEach(function (i) {
        var end = due[i] - pay[i];
        sumPay += pay[i];
        if (end <= EPS_PAID) { paidOffMonth[i] = k; bal[i] = 0; } else { bal[i] = end; sumEnd += end; }
      });
      totalPaid += sumPay;
      totals.push({ month: k, balance: sumEnd, payment: sumPay });
      if (paidOffMonth.every(function (x) { return x !== null; })) { months = k; break; }
    }
    return { months: months, paidOffMonth: paidOffMonth, totals: totals, totalPaid: totalPaid,
      totalInterest: months === null ? null : totalPaid - B0sum, budgetTooLow: budgetTooLow };
  }

  // เก็บค่าลง URL hash (ไม่ใช้ btoa/atob เพื่อให้ Node ใช้ได้)
  function encodeState(obj) { return encodeURIComponent(JSON.stringify(obj)); }
  function decodeState(str) {
    try { return JSON.parse(decodeURIComponent(String(str).replace(/^#/, ''))); } catch (e) { return null; }
  }

  var api = {
    formatBaht: formatBaht, monthsToText: monthsToText, simulate: simulate,
    closedFormFixed: closedFormFixed, closedFormPct: closedFormPct,
    requiredPayment: requiredPayment, verifyClosedForm: verifyClosedForm,
    explainFirstMonthsTh: explainFirstMonthsTh, toCsv: toCsv,
    splitByYear: splitByYear, compareSentenceTh: compareSentenceTh, inductionStepDemo: inductionStepDemo,
    simulateMulti: simulateMulti, encodeState: encodeState, decodeState: decodeState
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DebtCore = api;
})(this);
