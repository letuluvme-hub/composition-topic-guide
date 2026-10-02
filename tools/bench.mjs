// 1) perf: results() 现在的分桶实现 vs 旧的「全量 sort 取前 3」
// 2) 行为等价：两种算法在全部 4400 组合上给出的卡片序列必须完全一致
import { sandbox as win, code } from './harness.mjs';
const T = win.__T;
const G = Object.keys(T.G), D = Object.keys(T.D), C = Object.keys(T.C), E = Object.keys(T.E);

// ---- 旧算法：照抄改之前的实现 ----
function oldResults(bank, sel, salt) {
  const match = (b) =>
    (!sel.g || b.g === sel.g) && (!sel.d || b.d === sel.d) &&
    (!sel.c || b.c === sel.c) && (!sel.e || b.e === sel.e);
  const keyOf = (s) => [s.g, s.d, s.c, s.e].join('|');
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const score = (b) => { const k = ['g','d','c','e']; let n = 0; for (let i = 0; i < 4; i++) if (!sel[k[i]] || b[k[i]] === sel[k[i]]) n++; return n; };
  const list = bank.filter(match);
  const seen = {}, out = [];
  const cmp = (a, b) => { const d = score(b) - score(a); if (d) return d;
    return hash(salt + '|' + keyOf(sel) + '|' + a.id) - hash(salt + '|' + keyOf(sel) + '|' + b.id); };
  const push = (b) => { const t = b.g+'|'+b.d+'|'+b.c+'|'+b.e; if (seen[t]) return false; seen[t] = 1; out.push(b); return true; };
  const ss = list.slice().sort(cmp);
  for (let i = 0; i < ss.length && out.length < 3; i++) push(ss[i]);
  if (out.length < 3) { const ws = bank.slice().sort(cmp); for (let i = 0; i < ws.length && out.length < 3; i++) push(ws[i]); }
  return out.map((b) => b.id);
}

const bank = T.bank();
let mismatch = 0, compared = 0;
for (const g of G) for (const d of D) for (const c of C) for (const e of E) {
  for (const salt of [0, 1, 7]) {
    T.set('g', g); T.set('d', d); T.set('c', c); T.set('e', e); T.setSalt(salt);
    const now = T.results().shown.map((b) => b.id);
    const before = oldResults(bank, { g, d, c, e }, salt);
    compared++;
    if (JSON.stringify(now) !== JSON.stringify(before)) {
      if (mismatch < 3) console.log('MISMATCH', g, d, c, e, salt, now, before);
      mismatch++;
    }
  }
}
console.log(`行为等价: 比较 ${compared} 组（4400 组合 × 3 个 salt），不一致 ${mismatch} 组`);

// ---- perf ----
function bench(label, fn) {
  fn(); // warm
  const t0 = process.hrtime.bigint();
  const n = fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`${label}: ${ms.toFixed(1)} ms  (${n} 次)`);
  return ms;
}
let selIdx = 0;
const combos = [];
for (const g of G) for (const d of D) for (const c of C) for (const e of E) combos.push({ g, d, c, e });

bench('新（分桶）results()', () => {
  let acc = 0;
  for (const s of combos) { T.set('g', s.g); T.set('d', s.d); T.set('c', s.c); T.set('e', s.e); acc += T.results().shown.length; }
  return acc;
});
bench('旧（全量 sort）results()', () => {
  let acc = 0;
  for (const s of combos) acc += oldResults(bank, s, 0).length;
  return acc;
});

// 单次「换一批」的体感
T.set('g','rec'); T.set('d','family'); T.set('c','object'); T.set('e','warm');
bench('单次 换一批（新）', () => { T.setSalt(1); return T.results().shown.length; });
bench('单次 换一批（旧）', () => oldResults(bank, {g:'rec',d:'family',c:'object',e:'warm'}, 1).length);
