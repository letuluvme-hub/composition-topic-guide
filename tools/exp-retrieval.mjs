// 语义检索到底行不行：拿真实作文题跑，看前 N 条人工判不判得「写这个题合适」。
// 这是 docs/TAXONOMY.md 里定的验收标准第 3 条。
import { sandbox as win } from './harness.mjs';
const T = win.__T;
const idx = T.matIndex();
const tagged = idx.filter((x) => x.tags && x.tags.length);

console.log(`素材 ${idx.length} 条，其中已标注 ${tagged.length} 条 (${((tagged.length / idx.length) * 100).toFixed(1)}%)`);
console.log('\n概念权重（1/sqrt(频率) 归一，越稀有越靠前）:');
const cs = T.concepts ? T.concepts() : null;
if (cs) {
  cs.slice()
    .sort((a, b) => b.w - a.w)
    .forEach((c) => console.log(`   ${c.c} ${String(c.n).padStart(4)} 条  w=${c.w.toFixed(3)}  ${c.nm}`));
}

/* 题目 → 概念。这是我手写的词表（不是模型），规则就能算出来。 */
const TOPICS = [
  {
    topic: '不拘一格的美',
    // "不拘一格"=与常规不同/唯一；"美"在这里只能是"不美的东西美"→破旧/很少/没被看见
    keys: ['美', '独特', '特别', '别致', '不一样', '千姿百态', '各有千秋'],
  },
  { topic: '那些不起眼的坚持', keys: ['坚持', '毅力', '长年', '日复一日', '默默', '平凡'] },
  { topic: '记忆里的那张脸', keys: ['记忆', '想起', '忘不掉', '那张脸', '怀念'] },
  { topic: '规则该不该被打破', keys: ['规则', '规矩', '传统', '该不该', '打破', '遵守'] },
  { topic: '真正的勇敢', keys: ['勇敢', '怕', '害怕', '不敢', '面对'] },
  { topic: '时间都去哪了', keys: ['时间', '日子', '一天', '长大', '小时候', '以前'] },
  { topic: '那些小情绪', keys: ['生气', '难过', '委屈', '误会', '心情', '别扭'] },
];

/* 词 → 概念。手写映射表，规则可算，不需要模型。 */
const WORD2CONCEPT = {
  // 与常规不同 / 独特
  美: 'a', 独特: 'a', 特别: 'a', 别致: 'a', 不一样: 'a', 千姿百态: 'a', 各有千秋: 'a',
  与众不同: 'a', 个性: 'a', 突破: 'a', 创新: 'a', 反: 'a', 破格: 'a',
  唯一: 'b', 只有: 'b', 唯一性: 'b',
  忽略: 'c', 忽视: 'c', 偏见: 'c', 误解: 'c', 没人看见: 'c', 被遗忘: 'c',
  否定: 'd', 嘲笑: 'd', 被骂: 'd', 反对: 'd', 质疑: 'd', 不理解: 'd',
  看见: 'e', 发现: 'e', 认可: 'e', 理解: 'e', 被记住: 'e', 欣赏: 'e',
  影响: 'f', 传染: 'f', 跟着: 'f', 风潮: 'f', 都这样: 'f',
  坚持: 'g', 毅力: 'g', 长年: 'g', 日复一日: 'g', 反复: 'g', 天天: 'g', 年复一年: 'g',
  时间: 'h', 那天: 'h', 第几天: 'h', 一段时间: 'h', 后来: 'i', 以前: 'i', 小时候: 'i',
  成长: 'i', 变化: 'i', 改变: 'i', 从前: 'i', 现在: 'i',
  继续: 'j', 没停: 'j', 坚持着: 'j', 还在: 'j', 持续: 'j',
  破: 'k', 旧: 'k', 丑: 'k', 歪: 'k', 不整齐: 'k', 老: 'k', 磨损: 'k', 不标准: 'k', 朴素: 'k',
  慢: 'l', 缓: 'l',
  安静: 'm', 沉默: 'm', 静: 'm', 没声音: 'm',
  小: 'n', 少: 'n', 不起眼: 'n', 微小: 'n', 平凡: 'n', 普通: 'n', 默默: 'n',
  东西: 'o', 物: 'o',
  声音: 'p', 喊: 'p', 说话: 'p', 笑: 'p',
  手: 'q', 身体: 'q', 动作: 'q',
  字: 'r', 笔记: 'r', 写: 'r',
  数: 's', 多少: 's',
  规则: 't', 规矩: 't', 传统: 't', 遵守: 't', 应该: 't', 秩序: 't', 要求: 't',
  第一次: 'u', 起初: 'u',
  害怕: 'j', 勇敢: 'j', 怕: 'j', 不敢: 'j', 面对: 'j',
  生气: 'd', 委屈: 'c', 难过: 'c', 误会: 'c', 心情: 'c', 别扭: 'c', 不开心: 'c',
  日子: 'h', 一天: 'h', 长大: 'i',
};

function conceptsFor(topic, keys) {
  const want = new Set();
  for (const k of keys) {
    if (WORD2CONCEPT[k]) want.add(WORD2CONCEPT[k]);
  }
  // 题目里直接出现的概念词也要算
  for (const [w, c] of Object.entries(WORD2CONCEPT)) {
    if (topic.includes(w)) want.add(c);
  }
  return [...want];
}

console.log('\n' + '='.repeat(80));
for (const T2 of TOPICS) {
  const cs2 = conceptsFor(T2.topic, T2.keys);
  const res = T.searchByConcepts(cs2);
  console.log(`\n作文题：${T2.topic}`);
  console.log(`映射到概念：${cs2.join(' ')}   → 命中 ${res.length} 条`);
  res.slice(0, 8).forEach((r, i) => {
    const tags = r.x.tags.map((c) => T.concept(c).nm).join('/');
    console.log(`  ${String(i + 1).padStart(2)}. ${r.x.m}`);
    console.log(`      [${tags}]  ← 《${r.x.t}》`);
  });
}
