// 题目档 → 检索：验收标准第 3 条。10 个真实作文题，各看前 8 条，
// 人工判「这些素材写这个题合不合适」。
import { sandbox as win } from './harness.mjs';
const T = win.__T;

const TOPICS = [
  '不拘一格的美',
  '规则该不该被打破',
  '记忆里的那张脸',
  '那些不起眼的坚持',
  '真正的勇敢',
  '时间都去哪了',
  '理解与误解',
  '传统手艺',
  '第一次上台',
  '那些说不出口的小情绪',
];

const tagged = T.matIndex().filter((x) => x.tags && x.tags.length);
console.log(`素材 ${T.matTotal()} 条，已标注 ${tagged.length} 条 (${((tagged.length / T.matTotal()) * 100).toFixed(1)}%)`);
console.log(`（语义检索只在这 ${tagged.length} 条里跑，未标注的不会被返回）\n`);

let noProfile = 0;
for (const t of TOPICS) {
  const p = T.conceptsForTopic(t);
  console.log('═'.repeat(78));
  console.log(`作文题：${t}`);
  if (!p) {
    noProfile++;
    console.log('  ⚠ 题目档没命中 —— 界面会退回关键词搜索并说明原因');
    continue;
  }
  const names = p.c.map((c) => T.concept(c).nm).join(' + ');
  const coreNames = (p.core || []).map((c) => T.concept(c).nm).join(' 或 ');
  const note = T.profileNote(t);
  console.log(`  档命中 ${p.profiles} 组 → 概念: ${names}`);
  console.log(`  门槛(必须命中其一): ${coreNames}`);
  if (note) console.log(`  档的提示: ${note}`);
  const res = T.searchByConcepts(p.c, p.core);
  console.log(`  检索到 ${res.length} 条，前 8：`);
  res.slice(0, 8).forEach((r, i) => {
    const hit = r.x.tags.filter((c) => p.c.includes(c)).map((c) => T.concept(c).nm);
    console.log(`   ${String(i + 1).padStart(2)}. ${r.x.m}`);
    console.log(`       命中${r.hit}面 [${hit.join('/')}]`);
  });
}
console.log('\n' + '═'.repeat(78));
console.log(`题目档未命中率: ${noProfile}/${TOPICS.length}`);
