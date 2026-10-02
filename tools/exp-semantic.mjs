// 语义检索方案对比实验。
// 目标：给定一个「考场作文题」（抽象判断），能不能把 1879 条素材里真正有用的挑出来。
// 方案 A = 现在的关键词/子串搜索
// 方案 B = n-gram 模糊相似（无模型，纯本地）
// 方案 C = 概念标签检索（人工/规则给素材打结构化标签，用户按概念选，不输入关键词）
import { sandbox as win } from './harness.mjs';
const T = win.__T;
const MATS = T.matIndex().map((x) => ({ ...x }));

/* ═════ 方案 A：关键词 / 子串 ═════ */
function searchA(q) {
  return MATS.filter((x) => x.m.includes(q));
}

/* ═════ 方案 B：n-gram 模糊相似 ═════ */
function grams(s, n = 2) {
  const t = s.replace(/[\s，。、：；！？「」【】《》]/g, '');
  const g = new Set();
  for (let i = 0; i + n <= t.length; i++) g.add(t.slice(i, i + n));
  return g;
}
const MG = MATS.map((x) => grams(x.m));
function searchB(q) {
  const qg = grams(q);
  const scored = [];
  for (let i = 0; i < MATS.length; i++) {
    let hit = 0;
    for (const g of qg) if (MG[i].has(g)) hit++;
    const cov = hit / qg.size; // 覆盖率：题目的词有多少能在素材里找到
    if (cov > 0) scored.push({ m: MATS[i], cov });
  }
  scored.sort((a, b) => b.cov - a.cov);
  return scored;
}

/* ═════ 方案 C：概念标签 ═════
   关键假设：抽象作文题（如《不拘一格的美》）无法靠字面命中，
   但它落在少数几个**概念**上。把素材按这些概念打标签，
   用户选概念而不是打关键词。 */
const CONCEPTS = [
  { k: '与众人不同',   re: /只有[^，。]{0,6}(我|他|她|一)|就我一个|全场|全班|别人都|都[^，。]{0,3}不|没有人|没人|反着|偏偏/ },
  { k: '少数 / 唯一',  re: /唯一|只有一个|一共一|数得出|就剩|剩下[一二三两]/ },
  { k: '被否定',      re: /被说|被笑|说我|笑我|被老师点|挨骂|不叫|改名|说了不算|没人信|劝我|让我改/ },
  { k: '坚持己见',    re: /我还是|我坚持|没有改|不改|照旧|依旧|还是那|我说不|没答应|拒绝了/ },
  { k: '第一次',      re: /第一次/ },
  { k: '出乎意料',    re: /居然|竟然|没想到|原来|谁也没想到|不是|反而/ },
  { k: '被看见',      re: /看见|看到|盯|举了|抬头|注意到|全场安静|被记住|名字/ },
  { k: '笨拙 / 不好看', re: /难看|丑|歪|破旧|旧了|掉漆|锈|裂|皱|矮|不整齐|不标准/ },
  { k: '规矩 / 惯例',  re: /规定|要求|必须|按规矩|排队|统一|一样|每[个天]|照常|惯例|打分/ },
  { k: '改 变',       re: /后来|第二[天年]|终于|变了|改成|换成|再没|再也没有/ },
  { k: '慢 / 停下',    re: /停[了住]|愣[住]|顿[了住]|没有动|没接话|特别慢|扫得特别慢|等了很久/ },
  { k: '一个人',      re: /一个人[^\s]{0,4}(时|了|在)|没人[^\s]{0,4}时候|自己[^\s]{0,4}(时|在)|独处|自己一个人/ },
  { k: '手作 / 具体物', re: /罐|票|镜|盒|刀|笔|纸|布|绳|勺|锅|锁|表|铃|灯|窗|门|桌|椅|袋|瓶/ },
  { k: '声音',        re: /声音|喊|说|讲|念|读|吵|安静|笑|没出声|开口/ },
  { k: '身体',        re: /手|指|脚|牙|背|肩|头|眼睛|脖子|掌心/ },
  { k: '数字 / 计量',  re: /[0-9]|[一二三四五六七八九十两几]个|[一二三四五六七八九十]分|[一二三四五六七八九十]格|[一二三四五六七八九十]年|[一二三四五六七八九十]秒/ },
];
const TAG = MATS.map((x) => CONCEPTS.filter((c) => c.re.test(x.m)).map((c) => c.k));
console.log('概念标签覆盖:');
CONCEPTS.forEach((c, i) => console.log(`   ${String(TAG.filter((t) => t.includes(c.k)).length).padStart(4)} 条  ${c.k}`));
const untagged = TAG.filter((t) => !t.length).length;
console.log(`   ${String(untagged).padStart(4)} 条  （无标签）`);

function searchC(concepts) {
  return MATS.map((x, i) => ({ m: x, tags: TAG[i], n: TAG[i].filter((t) => concepts.includes(t)).length }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n || a.m.m.length - b.m.m.length);
}

/* ═════ 用真实的给定作文题测 ═════ */
const TOPICS = [
  { topic: '不拘一格的美', concepts: ['与众人不同', '少数 / 唯一', '被否定', '被看见', '出乎意料', '笨拙 / 不好看', '规矩 / 惯例', '坚持己见'] },
  { topic: '那些不起眼的坚持', concepts: ['坚持己见', '慢 / 停下', '改 变', '一个人'] },
  { topic: '记忆里的那张脸', concepts: ['声音', '身体', '被看见', '一个人'] },
  { topic: '规则该不该被打破', concepts: ['规矩 / 惯例', '被否定', '与众人不同', '坚持己见'] },
];

for (const T2 of TOPICS) {
  console.log('\n' + '='.repeat(78));
  console.log(`作文题：${T2.topic}`);
  console.log('='.repeat(78));

  const a = searchA(T2.topic);
  console.log(`A 关键词(整句搜): ${a.length} 条 ${a.length ? '← ' + a.slice(0, 2).map((x) => x.m).join(' / ') : ''}`);

  const b = searchB(T2.topic);
  console.log(`B n-gram 模糊: ${b.length} 条，覆盖率最高 ${b.length ? (b[0].cov * 100).toFixed(0) + '%' : '-'}`);
  b.slice(0, 2).forEach((r) => console.log(`     ${(r.cov * 100).toFixed(0)}%  ${r.m.m}`));

  const c = searchC(T2.concepts);
  console.log(`C 概念标签: ${c.length} 条`);
  c.slice(0, 5).forEach((r) => console.log(`     [${r.tags.join(',')}]  ${r.m.m}`));
}

/* ═════ 关键量：关键词方案对「抽象题」的失败率 ═════ */
console.log('\n' + '='.repeat(78));
console.log('关键词方案的系统性失败');
console.log('='.repeat(78));
const ABSTRACT = ['不拘一格的美', '成长原来是这样', '那些不起眼的坚持', '关于选择', '真正的勇敢', '时间的味道', '生命的力量'];
let zero = 0;
for (const t of ABSTRACT) {
  const n = searchA(t).length;
  if (!n) zero++;
  console.log(`   ${t.padEnd(12)} 整句命中 ${n} 条`);
}
console.log(`\n抽象题整句命中 0 条的比例: ${zero}/${ABSTRACT.length}`);
