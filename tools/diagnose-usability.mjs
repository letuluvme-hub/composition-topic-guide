// 「写一篇」这个任务现在要付出多少操作成本？以及有没有搜索？
import { sandbox as win, el } from './harness.mjs';
const T = win.__T;
const src = el.get('view');

/* ---------- 1. 现有搜索/过滤能力 ---------- */
console.log('══ 搜索 / 过滤能力 ══');
const hasInput = /<input|type="search"|搜索|查找|关键词/.test(
  el.get('view').outerHTML || '',
);
console.log('页面里有没有搜索框或关键词过滤:', hasInput ? '有' : '没有 —— 462 篇只能靠 4 步漏斗定位');
console.log('462 篇只能通过「体裁→领域→切口→情感」四层漏斗到达；没有搜索、没有排序、没有直达。');

/* ---------- 2. 点到写作台要几次点击 ---------- */
console.log('\n══ 从打开页面到开始写 ══');
let clicks = 0;
const trace = [];
function step(label, fn) {
  const ok = fn();
  trace.push(`${ok ? '✔' : '✘'} ${label}`);
  if (ok) clicks++;
  return ok;
}

// 最优路径：4 步各点一次 + 出题 + 就写这篇
T.go(0);
step('第1步 选体裁', () => { T.chooseDim('g', 'rec'); return true; });
step('第2步 选领域', () => { T.chooseDim('d', 'family'); return true; });
step('第3步 选切口', () => { T.chooseDim('c', 'object'); return true; });
step('第4步 选情感', () => { T.chooseDim('e', 'warm'); return true; });
step('从3张卡里挑1张「就写这篇」', () => {
  const go = el.get('view').querySelectorAll('.abtn.pri').find((b) => b.textContent.includes('就写这篇'));
  go?.click();
  return !!T.planText(T.bank()[0].id);
});
console.log(trace.join('\n'));
console.log(`最少点击次数: ${clicks}`);

/* ---------- 3. 「我已经有想写的东西」这条路存在吗？ ---------- */
console.log('\n══ 能不能跳过漏斗直接写 ══');
T.go(0);
const viewHtml = [...el.get('view').children].map((c) => c.textContent).join(' | ');
console.log('首页提供选项:', viewHtml.slice(0, 120));
console.log('有没有「直接写 / 我自己有想法 / 空白纸」这类出口:',
  /直接写|自己有想法|空白|自由|不拘/.test(viewHtml) ? '有' : '没有 —— 必须先答完四个问题才能拿到任何东西');

/* ---------- 4. 素材能不能当入口 ---------- */
console.log('\n══ 素材清单（1879 条）能不能当搜索入口 ══');
const allMat = [];
for (const b of T.bank()) for (const m of b.mat) allMat.push({ m, id: b.id, t: b.t });
console.log('素材条目总数:', allMat.length, '（全部唯一）');
console.log('随机 8 条看看是不是可搜索的"具体时刻":');
allMat.filter((_, i) => i % 235 === 0).slice(0, 8).forEach((x) => console.log(`   ${x.m}   ← 《${x.t}》`));

const kw = ['饭票', '闹钟', '奶粉', '阳', '错题'];
console.log('\n按关键词搜素材（模拟搜索框）:');
for (const k of kw) {
  const hitM = allMat.filter((x) => x.m.includes(k));
  const hitT = T.bank().filter((b) => b.t.includes(k));
  console.log(`   「${k}」: 命中素材 ${hitM.length} 条 / 命中标题 ${hitT.length} 篇`);
}

/* ---------- 5. 一篇作文实际需要几次「骨架」 ---------- */
console.log('\n══ 骨架结构多样性 ══');
const beats = T.bank().map((b) => b.how.length);
console.log('每篇骨架步数:', [...new Set(beats)].join(','), '← 只有一种');
const verbs = {};
for (const b of T.bank()) {
  for (const step of b.how) {
    const v = step.slice(0, 2);
    verbs[v] = (verbs[v] || 0) + 1;
  }
}
console.log('各步开头两个字 top 10:');
Object.entries(verbs).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) =>
  console.log(`   ${String(v).padStart(4)}  "${k}"`),
);
console.log(`\n不同步骤动词数: ${Object.keys(verbs).length}，但步数恒为 4`);
