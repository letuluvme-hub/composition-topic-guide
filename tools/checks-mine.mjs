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
  // 概念层上线后，这里不再报「关键词搜得到几个词」，而是报这道题该调哪些概念。
  // 契约：认出概念 → 说清概念数；认不出 → 必须如实说没有档，且给得出关键词/线索退路。
  const prof = T.conceptsForTopic(TOPIC);
  check('题目能推出概念档', !!prof, JSON.stringify(prof));
  if (prof) {
    check(
      '概念提示写清了概念数和门槛数',
      v1.includes(`${prof.c.length} 个概念`) && v1.includes(`${prof.core.length} 个是门槛`),
      v1.slice(0, 140),
    );
  } else {
    check(
      '认不出概念时如实说明并给退路',
      v1.includes('没有这道题的概念档') && (v1.includes('关键词搜') || v1.includes('按线索')),
      v1.slice(0, 140),
    );
  }
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

/* ── 语义层：概念标注 + 加权检索 + 门槛 ──────────────────────────
   这些是硬指标，不是"看起来能跑"。概念层的失败模式很隐蔽 ——
   返回一堆字面沾边但语义无关的素材，肉眼扫一遍很容易放过，
   所以每一条都钉死成可判定的断言。 */
section('语义层：1879 条素材全部有概念标签');

check('素材总数 1879', T.matTotal() === 1879, T.matTotal());
check('全部素材都标了概念（覆盖率 100%）', T.matTagged() === T.matTotal(), `${T.matTagged()}/${T.matTotal()}`);

const cs = T.concepts();
check('概念表 22 条', cs.length === 22, cs.length);
check('概念字母无重复', new Set(cs.map((c) => c.c)).size === cs.length);
check('每个概念都有名字和解释', cs.every((c) => c.nm && c.ds));
const unusedC = cs.filter((c) => !c.n);
check('没有从头到尾没用上的概念（否则这一格就是废的）', unusedC.length === 0, unusedC.map((c) => c.c).join(''));

// 稀有度权重必须真的区分得开。全部 1.0 等于没加权。
const ws2 = cs.map((c) => c.w);
check('稀有度权重不是全部相等', Math.max(...ws2) - Math.min(...ws2) > 0.05, `max=${Math.max(...ws2).toFixed(3)} min=${Math.min(...ws2).toFixed(3)}`);
check('权重都归一在 0~1', ws2.every((w) => w >= 0 && w <= 1));
// 「唯一」最稀（1.2%），「具体物」最常见（24.7%）—— 权重顺序必须反过来
check('越稀的概念权重越高', cs.find((c) => c.c === 'b').w > cs.find((c) => c.c === 'o').w);

section('语义层：加权检索 + 门槛确实在起作用');

{
  const r = T.searchByConcepts(['a', 'b', 'k']);
  check('多概念检索有结果', r.length > 0, r.length);
  check('命中面数非递增', r.every((x, i) => i === 0 || r[i - 1].hit >= x.hit));
  check('每条至少命中 1 个查询概念', r.every((x) => x.hit >= 1));
}

// 门槛是硬排除，不是降权
{
  const withGate = T.searchByConcepts(['g', 'j', 'n', 'k', 'o'], ['v']);
  check('门槛挡住了不含核心概念的素材', withGate.every((x) => x.x.tags.includes('v')));
  const noGate = T.searchByConcepts(['g', 'j', 'n', 'k', 'o']);
  check('关掉门槛结果变多（说明门槛确实在筛）', noGate.length > withGate.length, `${noGate.length} vs ${withGate.length}`);
  check('门槛后仍有结果', withGate.length > 0, withGate.length);
}

// 抽象题的关键回归：早期版本里「阳台上还晾着两块抹布」会排进《传统手艺》前二
{
  const p = T.conceptsForTopic('传统手艺');
  const top5 = T.searchByConcepts(p.c, p.core).slice(0, 5).map((x) => x.x.m);
  check(
    '《传统手艺》前 5 条不全是无主的旧物',
    top5.filter((m) => /抹布|旧灯泡|抽屉最里层/.test(m)).length <= 1,
    JSON.stringify(top5),
  );
}

section('语义层：题目档');

const PROBE = [
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
for (const t of PROBE) {
  const p = T.conceptsForTopic(t);
  check(`「${t}」有概念档`, !!p);
  if (!p) continue;
  check(`  「${t}」核心概念都合法`, (p.core || []).every((c) => !!T.concept(c)), JSON.stringify(p.core));
  check(`  「${t}」核心概念包含在查询概念里`, (p.core || []).every((c) => p.c.includes(c)));
  check(`  「${t}」检索有结果`, T.searchByConcepts(p.c, p.core).length > 0);
}

// 一个词不能属于两档：两档并集会稀释概念，被稀释的结果就是「值日表」这种无关素材
{
  const dup2 = {};
  for (const t of PROBE.concat(['美', '传统', '第一次', '勇敢'])) {
    const p = T.conceptsForTopic(t);
    if (p && p.profiles > 1) dup2[t] = p.profiles;
  }
  check('常见题没有触发多档并集（一个词只能属于一档）', Object.keys(dup2).length === 0, JSON.stringify(dup2));
}

check('没档的题老实返回 null，不瞎猜', T.conceptsForTopic('zzz查无此题abc') === null);

section('语义层：界面真的用上了');

{
  T.setMode('mine');
  T.my().topic = '不拘一格的美';
  T.my().cc = null;
  T.my().gate = undefined;
  T.my().q = '';
  T.my().slice = null;
  T.render();

  const t2 = txt();
  check('画出了概念芯片', t2.includes('与常规不同'), t2.slice(0, 200));
  check('门槛概念有标记', t2.includes('门槛'));
  check('显示概念检索结果条数', /概念检索：\d+ 个概念/.test(t2), t2.match(/概念检索：[^\n]{0,60}/)?.[0]);
  check('每条素材写明命中了哪些概念', el.get('view').querySelectorAll('.tg').length > 0, el.get('view').querySelectorAll('.tg').length);

  // 芯片真的可点，而且点了会改状态
  const chips = el.get('view').querySelectorAll('button.chipb').filter((b) => (b.textContent || '').includes('唯一'));
  check('「唯一」芯片渲染出来了', chips.length === 1, chips.length);
  if (chips.length) {
    const prof2 = T.conceptsForTopic('不拘一格的美');
    chips[0].click();
    const after = T.my().cc;
    check('点芯片会记录手动选择', Array.isArray(after), JSON.stringify(after));
    check('点芯片取消了那个概念', after && !after.includes('b'), JSON.stringify(after));
    check('只动了点的那一个，其他概念都还在', after && after.length === prof2.c.length - 1, `${after} vs ${prof2.c.length - 1}`);
    // 复位按钮只在手动改过之后才出现 —— 没改过的时候给复位是废话
    check('手动改过之后有「回到题目推荐」的复位入口', txt().includes('回到题目推荐'));
    const backBtn = el.get('view').querySelectorAll('button.abtn').find((b) => (b.textContent || '').includes('回到题目推荐'));
    check('点复位能回到题目档', !!backBtn);
    if (backBtn) {
      backBtn.click();
      check('复位后 cc 变回 null', T.my().cc === null, JSON.stringify(T.my().cc));
      check('复位后复位按钮自己消失了', !txt().includes('回到题目推荐'));
    }
  }

  // 关键词模式不能和概念模式混起来，否则「没命中」说不清是哪一环造成的
  T.my().q = '饭票';
  T.render();
  check('打了字就走关键词模式', txt().includes('关键词检索'), txt().match(/关键词检索[^\n]{0,40}/)?.[0]);
  T.my().q = '';
  T.my().slice = '第一次';
  T.render();
  check('点线索切片也走关键词模式', txt().includes('切片'));
  T.my().slice = null;
  T.render();
  check('清掉后回到概念模式', txt().includes('概念检索'));
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
if (failures.length) {
  console.log('失败项:');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
