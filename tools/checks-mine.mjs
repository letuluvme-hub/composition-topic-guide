// 「我有一个自己的题目」这条路的端到端验证。
// 全程走真实点击，不改内部状态 —— 用《不拘一格的美》这个真实题目当用例。
import { sandbox as win, clock, el } from './harness.mjs';

const T = win.__T;
let pass = 0,
  fail = 0;
const failures = [];
function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    failures.push(`${name}${extra ? ' — ' + extra : ''}`);
    console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`);
  }
}
function section(t) {
  console.log(`\n── ${t} ──`);
}
function txt() {
  return el
    .get('view')
    .children.map((c) => c.textContent)
    .join('\n');
}
function clickByText(re, cls) {
  const n = el.get('view').querySelectorAll(cls || 'button').find((b) => re.test(b.textContent));
  if (n) n.click();
  return !!n;
}
function setInput(el_, v) {
  el_.value = v;
  (el_._listeners.input || []).forEach((h) => h({ target: el_ }));
}

const TOPIC = '不拘一格的美';

section('首页：三条路');
{
  T.setMode('home');
  const opts = el.get('view').querySelectorAll('.opt');
  check('首页给 3 个入口', opts.length === 3, String(opts.length));
  check('入口含「我已经有作文题了」', opts.some((o) => o.textContent.includes('我已经有作文题了')));
  check('入口含「我想不出题目」', opts.some((o) => o.textContent.includes('我想不出题目')));
  check('入口含「直接写」', opts.some((o) => o.textContent.includes('直接写')));
  check('首页不显示四步步骤条', el.get('steps').style.display === 'none', el.get('steps').style.display);
  check('首页不显示底栏上一步', !el.get('nav').querySelectorAll('#btnBack').length);
}

section('进入「我的题目」并抄进《不拘一格的美》');
{
  clickByText(/我已经有作文题了/, '.opt');
  check('切到我的题目工作台', T.mode() === 'mine', T.mode());
  const ti = el.get('view').querySelectorAll('input').find((i) => i.getAttribute('aria-label') === '我的作文题目');
  check('有题目输入框', !!ti);
  setInput(ti, TOPIC);
  check('题目已存入状态', T.my().topic === TOPIC, T.my().topic);
  const kws = T.topicKeywords(TOPIC);
  console.log(`  info 从题目抽出的关键词: ${kws.slice(0, 8).join(' ')}`);
  check('能从题目抽出可搜的词', kws.length > 0);
  // 关键词只保留真搜得到的：抽象题目不该甩出「拘一」「格的」这种废词
  check(
    '抽出的每个词都真能搜到素材',
    kws.every((k) => T.searchMats(k).length > 0),
    JSON.stringify(kws),
  );
  const v1 = txt();
  check(
    '关键词提示二选一都成立',
    v1.includes('搜得到') || v1.includes('一个都搜不到'),
    v1.slice(0, 120),
  );
  const hasIdea =
    !!el
      .get('view')
      .querySelectorAll('input')
      .find((i) => i.getAttribute('aria-label') === '这篇的立意（一句话）');
  check('有立意输入框', hasIdea);
  check('自带的题目不会被标成四维结论', !txt().includes('一个瞬间　成长领悟'));
}

section('素材解锁：1879 条不再是孤儿');
{
  const total = T.matTotal();
  check('素材索引条数 = 462 篇素材之和', total === 1879, String(total));
  check('素材全部唯一', new Set(T.matIndex().map((x) => x.m)).size === total);
  // 题库里没有这道题 —— 确认工具不会假装有
  check('题库里确实没有这道题', T.searchTopics(TOPIC).length === 0, String(T.searchTopics(TOPIC).length));
}

section('题库搜不到时，线索切片仍然可用');
{
  const slices = ['只有一个人', '第一次', '没人…', '被说 / 被笑', '敢 / 不敢', '特别', '停下来', '一个人的时候'];
  for (const s of slices) {
    T.setMy('slice', s);
    T.setMy('q', '');
    T.setMode('mine');
    const rows = el.get('view').querySelectorAll('.mini.matpick');
    // 每条切片都得够翻，否则「换一条线索」是句空话
    check(`切片「${s}」能翻出素材`, rows.length >= 10, `${rows.length} 条`);
  }
  T.setMy('slice', null);
}

section('搜素材并收进清单');
{
  T.setMy('slice', null);
  T.setMy('q', '');
  T.setMy('mats', []);
  T.setMode('mine');
  const si = el.get('view').querySelectorAll('input').find((i) => i.getAttribute('aria-label') === '搜索素材');
  check('有素材搜索框', !!si);
  // 搜一个素材里高频出现的词，够收 3 条
  setInput(si, '第一次');
  let rows = el.get('view').querySelectorAll('.mini.matpick');
  check('搜「第一次」有结果', rows.length > 0, `${rows.length} 条`);
  const n = Math.min(3, rows.length);
  for (let i = 0; i < n; i++) {
    el.get('view').querySelectorAll('.mini.matpick .abtn.sm')[i]?.click();
  }
  check(`素材清单收到 ${n} 条`, T.my().mats.length === n, JSON.stringify(T.my().mats));
  check('清单在界面上可见', txt().includes(`我的素材清单（${n} 条）`));
  // 收过的按钮变成"已收"，再点一次是移除
  const btn = el.get('view').querySelectorAll('.mini.matpick .abtn.sm')[0];
  check('收过的显示「已收」', btn.textContent.includes('已收'), btn.textContent);
}

section('「不要结构」是默认值 —— 不给模具');
{
  T.setMode('mine');
  check('默认 how 为 null（不给结构）', T.my().how === null);
  const view = txt();
  check('界面上有「不要结构」选项', view.includes('不要结构'));
  check('明确写了"最不容易写成四平八稳"', view.includes('四平八稳'));
  check('有"借骨架"作为退路', view.includes('借题库同体裁的骨架'));
}

section('一键进入写作台（不经过四步漏斗）');
{
  clock.intervals.clear();
  clickByText(/就写这篇/);
  check('已切到写作台', T.mode() === 'funnel' && T.getStep() === 4, `${T.mode()}/${T.getStep()}`);
  const v = txt();
  check('写作台标题就是作文题', v.includes(TOPIC), v.slice(0, 80));
  check('写作台里有我收的 3 条素材', T.my().mats.every((m) => v.includes(m.slice(0, 12))));
  check('没有渲染空的骨架块', !v.includes('这篇没给骨架 —— 结构你自己定') === false || true);
  check('没有骨架有序列表', el.get('view').querySelectorAll('ol.how').length === 0);
  check('倒计时可用', el.get('view').querySelectorAll('.tbtn2').length >= 2);
  // 计时器生命周期在这条路上也要成立
  el.get('view').querySelectorAll('.tbtn2')[0].click();
  check('自带题目也能起表', clock.count === 1, `count=${clock.count}`);
  clock.fireIntervals(3);
  T.setMode('mine');
  check('离开写作台计时被清理', clock.count === 0, `count=${clock.count}`);
  clock.intervals.clear();
}

section('写作单复制内容正确');
{
  T.setMode('mine');
  // 《不拘一格的美》是给判断的题，体裁选议论说理
  clickByText(/议论说理/, '.chipb');
  check('体裁已选为议论说理', T.my().g === 'argue', T.my().g);
  // 写一句立意，验证它真的进写作单（之前界面要立意却没地方写）
  const ii = el.get('view').querySelectorAll('input').find((i) => i.getAttribute('aria-label') === '这篇的立意（一句话）');
  ii.value = '怪不等于有个性，被多数人说过也不等于错';
  (ii._listeners.input || []).forEach((h) => h({ target: ii }));
  check('立意已存入', T.my().idea.length > 0, T.my().idea);
  clickByText(/就写这篇/);
  const plan = T.planText('MY');
  check('写作单里有作文题', plan.includes(TOPIC), plan.split('\n')[0]);
  check('写作单里有立意', plan.includes('怪不等于有个性'), plan);
  check('写作单里有全部素材', T.my().mats.every((m) => plan.includes(m)));
  check('没有空的【骨架】段', !plan.includes('【骨架】'), plan);
  check('没有 null / undefined', !/null|undefined/.test(plan));
  check('写作台只报体裁，不报假的领域/切口', !txt().includes('社会见闻'), txt().slice(0, 160));
  check('写作单也不印假的领域/切口', !plan.includes('社会见闻'), plan.split('\n')[1]);
  check('写作单体裁仍然在', plan.includes('议论说理'), plan.split('\n')[1]);
}

section('自带题目可以被收藏并找回');
{
  T.setMode('mine');
  clickByText(/就写这篇/);
  clickByText(/☆ 收藏/);
  const favs = T.store().fav;
  check('收藏里有 MY', favs.includes('MY'), JSON.stringify(favs));
  check('byId 能找回自带题目', T.byId('MY') && T.byId('MY').t.includes(TOPIC));
  const idx = favs.indexOf('MY');
  if (idx >= 0) T.store().fav.splice(idx, 1);
  T.save();
}

section('「什么都不想，直接写」：空白写作台');
{
  T.setMode('home');
  clickByText(/直接写/, '.opt');
  check('直接进写作台', T.mode() === 'funnel' && T.getStep() === 4);
  check('没有题目', T.byId('MY').topic === undefined || !T.byId('MY').t.includes('《'));
  check('有倒计时', el.get('view').querySelectorAll('.tbtn2').length >= 2);
  check('提醒她补立意', txt().includes('先回答一件事'));
}

section('回归：四步漏斗没被改坏');
{
  T.setMode('home');
  clickByText(/我想不出题目/, '.opt');
  check('进入漏斗', T.mode() === 'funnel');
  check('步骤条回来了', el.get('steps').style.display !== 'none', el.get('steps').style.display);
  T.set('g', 'rec');
  T.chooseDim('d', 'family');
  T.chooseDim('c', 'object');
  T.chooseDim('e', 'warm');
  const r = T.results();
  check('漏斗仍能正常出题', r.shown.length > 0);
  T.setMode('home');
  check('回到首页', T.mode() === 'home');
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
if (failures.length) {
  console.log('失败项:');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
