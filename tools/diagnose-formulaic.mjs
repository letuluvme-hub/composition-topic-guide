// 「不拘一格」诊断：题库本身有多模板化？
// 如果 462 篇的骨架/立意/素材高度重复，那工具越"规范"就越四平八稳。
import { sandbox as win } from './harness.mjs';
const T = win.__T;
const bank = T.bank();

/* ---------- 1. 骨架（how） ---------- */
console.log('══ 1. 4 步骨架 how ══');
const howLens = {};
const howShapes = {};
const howFirst = {};
for (const b of bank) {
  howLens[b.how.length] = (howLens[b.how.length] || 0) + 1;
  // 骨架的"形状" = 每一步去掉具体内容后的措辞骨架
  const shape = b.how.map((s) => s.replace(/[「」【】：:，,。.、\s]/g, '').slice(0, 3)).join(' | ');
  howShapes[shape] = (howShapes[shape] || 0) + 1;
  const f = b.how[0].replace(/[「」【】：:，,。.、\s]/g, '').slice(0, 2);
  howFirst[f] = (howFirst[f] || 0) + 1;
}
console.log('每篇步数分布:', JSON.stringify(howLens));
console.log('不同"形状"数:', Object.keys(howShapes).length, '/ 462');
console.log('出现最多的 5 种形状:');
Object.entries(howShapes).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([k, v]) => console.log(`   ${v} 篇  ${k}`));
console.log('开头两步措辞前缀分布 (top 8):');
Object.entries(howFirst).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log(`   ${v} 篇  "${k}…"`));

/* ---------- 2. 素材条目是否逐字重复 ---------- */
console.log('\n══ 2. 素材条目 mat ══');
const allMat = [];
for (const b of bank) for (const m of b.mat) allMat.push(m);
console.log('素材条目总数:', allMat.length, ' 去重后:', new Set(allMat).size,
  ` (重复率 ${((1 - new Set(allMat).size / allMat.length) * 100).toFixed(1)}%)`);

/* ---------- 3. 立意 idea 的措辞重复 ---------- */
console.log('\n══ 3. 立意 idea ══');
// 用字符 4-gram 集合算 Jaccard 相似度，看有多少对"高度雷同"
function grams(s, n = 4) {
  const t = s.replace(/[\s，。、：；！？「」【】《》]/g, '');
  const out = new Set();
  for (let i = 0; i + n <= t.length; i++) out.add(t.slice(i, i + n));
  return out;
}
const G = bank.map((b) => grams(b.idea));
let pairs = 0;
let sims = [];
for (let i = 0; i < G.length; i++) {
  for (let j = i + 1; j < G.length; j++) {
    let inter = 0;
    for (const g of G[i]) if (G[j].has(g)) inter++;
    const sim = inter / (G[i].size + G[j].size - inter);
    if (sim >= 0.3) { pairs++; sims.push({ sim, a: bank[i].id, b: bank[j].id }); }
  }
}
console.log(`立意 4-gram Jaccard >= 0.3 的对数: ${pairs} (占全部 ${((G.length*(G.length-1))/2).toLocaleString()} 对)`);
sims.sort((x, y) => y.sim - x.sim);
console.log('最雷同的几对:');
sims.slice(0, 3).forEach((s) => {
  console.log(`   ${s.a}/${s.b} sim=${s.sim.toFixed(2)}`);
  console.log(`     ${T.byId(s.a).idea}`);
  console.log(`     ${T.byId(s.b).idea}`);
});

/* ---------- 4. 翻车点 trap ---------- */
console.log('\n══ 4. 翻车点 trap ══');
const allTrap = bank.map((b) => b.trap);
console.log('去重后:', new Set(allTrap).size, '/ 462');
const traps = [...new Set(allTrap)].slice(0, 4);
traps.forEach((t) => console.log('   · ' + t));

/* ---------- 5. 标题句式 ---------- */
console.log('\n══ 5. 标题句式 ══');
const pats = {
  '那个/这件 + 名词': /《那[个件些]/,
  '第一次…': /《第一次/,
  '我…的…': /^《我/,
  '含「一刻/那一刻」': /[一那]刻/,
  '含数字': /[一二三四五六七八九十两\d]/,
};
for (const [k, re] of Object.entries(pats)) {
  const n = bank.filter((b) => re.test(b.t)).length;
  console.log(`   ${k}: ${n} 篇 (${((n / 462) * 100).toFixed(1)}%)`);
}
const titles = bank.map((b) => b.t.replace(/[《》]/g, ''));
console.log('   标题平均字数:', (titles.reduce((a, t) => a + t.length, 0) / titles.length).toFixed(1));

/* ---------- 6. 体裁分布 ---------- */
console.log('\n══ 6. 体裁 ══');
const g = {};
for (const b of bank) g[b.g] = (g[b.g] || 0) + 1;
for (const [k, v] of Object.entries(g)) console.log(`   ${T.G[k].nm} ${k}: ${v} 篇 (${((v/462)*100).toFixed(1)}%)`);

/* ---------- 7. 现在一次出题，3 张卡长什么样 ---------- */
console.log('\n══ 7. 典型一次出题（rec+family+object+warm）══');
T.set('g','rec'); T.set('d','family'); T.set('c','object'); T.set('e','warm');
const r = T.results();
console.log('严格命中:', r.list.length, ' 出卡:', r.shown.length, ' 全中:', r.full, ' 差一项:', r.near, ' 差两项+:', r.extra);
r.shown.forEach((b) => {
  console.log(`\n   [${T.matchScore(b)}分] ${T.finalTitle(b)}`);
  console.log(`      骨架: ${b.how.map((h) => h.slice(0, 18)).join(' / ')}`);
});
