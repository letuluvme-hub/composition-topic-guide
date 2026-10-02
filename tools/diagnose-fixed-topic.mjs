// 题目给定为《不拘一格的美》时，现有工具能帮上多少忙？
import { sandbox as win, el } from './harness.mjs';
const T = win.__T;
const bank = T.bank();
const TOPIC = '不拘一格的美';

/* ---------- 1. 题库里有这道题吗 ---------- */
console.log(`══ 题库里有《${TOPIC}》吗 ══`);
const hit = bank.filter((b) => b.t.includes('不拘') || b.idea.includes('不拘'));
console.log('标题/立意含「不拘」的:', hit.length, '篇');
// 概念近邻
const NEAR = ['特别', '独特', '规矩', '常规', '审美', '与众不同', '个例', '标准', '刻板', '偏见', '主流', '包容', '多元', '不一样'];
console.log('\n概念近邻词在题库里的分布:');
for (const w of NEAR) {
  const n = bank.filter((b) => b.t.includes(w) || b.idea.includes(w) || b.mat.some((m) => m.includes(w)) || b.how.some((h) => h.includes(w))).length;
  if (n) console.log(`   ${w}: ${n} 篇`);
}

/* ---------- 2. 这个题目该写成什么体裁 ---------- */
console.log('\n══ 体裁判断 ══');
console.log('「不拘一格的美」是一个观点/判断 —— 核心是"给美下定义 + 论证为什么"');
console.log('最接近的体裁: 议论说理 (argue) —— 题库里有', bank.filter((b) => b.g === 'argue').length, '篇');
console.log('但也可以是: 记叙文(写一个不按常规的人) / 写景状物(写一处 unconventional 的景)');
const argue = bank.filter((b) => b.g === 'argue');
console.log('\n题库现有议论文的切口分布:');
const cDist = {};
for (const b of argue) cDist[b.c] = (cDist[b.c] || 0) + 1;
for (const [k, v] of Object.entries(cDist).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${T.C[k].nm}: ${v} 篇`);
}
console.log('\n现有议论文的骨架长这样（4 步）:');
argue.slice(0, 2).forEach((b) => {
  console.log(`\n   《${b.t}》`);
  b.how.forEach((h, i) => console.log(`      ${i + 1}. ${h}`));
  console.log(`      立意: ${b.idea}`);
});

/* ---------- 3. 如果用「加题」硬塞进去会得到什么 ---------- */
console.log('\n══ 走「加题」这条路会拿到什么 ══');
const line = `${TOPIC} | g议论 | d社会见闻 | c一句话 | e成长领悟`;
const res = T.parseImport(line);
const added = T.bank()[T.bank().length - 1];
console.log('导入结果:', JSON.stringify(res));
console.log('得到的卡片:');
console.log(`   题目: 《${added.t}》`);
console.log(`   立意: ${added.idea}`);
console.log('   素材:');
added.mat.forEach((m) => console.log(`      - ${m}`));
console.log('   骨架:');
added.how.forEach((h) => console.log(`      - ${h}`));
console.log(`   翻车点: ${added.trap}`);
console.log('\n↑ 这就是"自带题目"目前能拿到的全部帮助：四段通用套话，跟"不拘一格的美"无关。');
console.log('   而且默认维度被强制成 family/object/insight 之类，跟题目本身无关。');
T.bank().pop();

/* ---------- 4. 素材里有哪些能直接用 ---------- */
console.log('\n══ 1879 条素材里能拿来论证「不拘一格的美」的 ══');
const matAll = [];
for (const b of bank) for (const m of b.mat) matAll.push({ m, t: b.t, g: b.g });
// 找"不合常规但有价值"的具体时刻：老手艺、怪癖、例外、第一次…
const PAT = /第一次|没人|只有|不一样的|反着|偏偏|居然|竟然|不敢|被说|别人都|都笑|没人敢|少数/;
const picks = matAll.filter((x) => PAT.test(x.m));
console.log(`筛出 ${picks.length} 条"不合常规/例外"类素材，示例:`);
[...new Set(picks.map((p) => p.m))].slice(0, 10).forEach((m) => console.log(`   · ${m}`));
