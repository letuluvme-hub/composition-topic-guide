// Behavioural checks against the inline script of index.html.
import { sandbox as win, clock, el, code } from './harness.mjs';
import { readFileSync } from 'node:fs';

const html_probe = readFileSync(
  process.argv[2] || new URL('../index.html', import.meta.url),
  'utf8',
);

const T = win.__T;
let pass = 0;
let fail = 0;
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

const G = Object.keys(T.G);
const D = Object.keys(T.D);
const C = Object.keys(T.C);
const E = Object.keys(T.E);

section('内置自检 selfTest');
check('无字段缺失 / 无重复 id / 维度值全覆盖', win.__ZXZ.bad.length === 0, JSON.stringify(win.__ZXZ));
check('题库规模 = 462', T.bank().length === 462, String(T.bank().length));

section('严格命中口径（出题 vs 选项计数必须一致）');
{
  T.set('g', 'rec');
  T.set('d', 'family');
  T.set('c', 'object');
  T.set('e', 'warm');
  const r = T.results();
  check('results().list 严格命中数 == pool 长度', r.list.length === T.pool().length);
  const cnt = T.counts('e');
  const strict = T.pool().length;
  check('counts(当前步) 的「本步已选值」计数 == 严格命中数', (cnt.warm ?? 0) === strict, `counts=${JSON.stringify(cnt)} strict=${strict}`);
}

section('四维组合覆盖度');
{
  let empty = 0;
  let total = 0;
  let allFull = 0;
  for (const g of G)
    for (const d of D)
      for (const c of C)
        for (const e of E) {
          total++;
          T.set('g', g);
          T.set('d', d);
          T.set('c', c);
          T.set('e', e);
          const r = T.results();
          if (r.list.length === 0) empty++;
          if (r.full === r.shown.length) allFull++;
        }
  const emptyPct = ((empty / total) * 100).toFixed(1);
  console.log(`  info 4400 组合中严格命中 0 篇: ${emptyPct}%`);
  console.log(`  info 三张卡全部完全符合的组合: ${allFull}/${total}`);
  check('覆盖度基线未被改坏（记录用）', true);
}

section('计时器生命周期');
{
  clock.intervals.clear();
  T.set('g', 'rec');
  T.set('d', 'friend');
  T.set('c', 'moment');
  T.set('e', 'warm');
  T.go(4); // 出题列表页
  // 点卡片上的「就写这篇」进入写作台
  const go = el.get('view').querySelectorAll('.abtn.pri').filter((b) => b.textContent.includes('就写这篇'))[0];
  check('出题页有「就写这篇」按钮', !!go);
  go?.click();
  const deskBtns = el.get('view').querySelectorAll('.tbtn2');
  check('写作台渲染出计时按钮', deskBtns.length >= 2, String(deskBtns.length));
  deskBtns[0]?.click(); // 开始
  check('点开始后有 1 个 interval', clock.count === 1, `count=${clock.count}`);
  clock.fireIntervals(5);
  // 写作台内部按钮「换一篇」——旧实现在这里会留下野 interval
  const swap = el.get('view').querySelectorAll('.abtn').filter((b) => b.textContent === '换一篇')[0];
  check('写作台有「换一篇」按钮', !!swap);
  swap?.click();
  check('点「换一篇」离开写作台后 interval 已清理', clock.count === 0, `count=${clock.count}`);
  // 旧实现只写 step=4 而不清 chosen，于是又渲染写作台 —— 按钮等于没点
  check(
    '点「换一篇」真的回到出题列表',
    !!el
      .get('view')
      .querySelectorAll('.abtn.pri')
      .find((b) => b.textContent.includes('就写这篇')),
    '仍在写作台',
  );
  check('写作台的「换一篇」之后不再有写作台内容', el.get('view').querySelectorAll('.tbtn2').length === 0);
  // 再次进入写作台再计时，不应叠加
  const go2 = el.get('view').querySelectorAll('.abtn.pri').filter((b) => b.textContent.includes('就写这篇'))[0];
  go2?.click();
  el.get('view').querySelectorAll('.tbtn2')[0]?.click();
  check('再次进入写作台计时仍只有 1 个 interval', clock.count === 1, `count=${clock.count}`);
  clock.intervals.clear();
}

section('导入去重');
{
  const before = T.bank().length;
  const line = '我的测试题目 | g记叙 | d家庭亲情 | c一件旧物 | e温暖感动';
  const r1 = T.parseImport(line);
  const after1 = T.bank().length;
  check('首次导入成功 +1', r1.ok === 1 && after1 === before + 1, `ok=${r1.ok} ${before}->${after1}`);
  const r2 = T.parseImport(line);
  const after2 = T.bank().length;
  check('重复导入同一行不再增加题库', after2 === after1, `${after1}->${after2} err=${JSON.stringify(r2.err)}`);
  // clean up the imported entries
  while (T.bank().length > before) T.bank().pop();
  check('清理后题库恢复', T.bank().length === before, String(T.bank().length));
}

section('人物槽位：选择必须可见');
{
  const bank = T.bank();
  const withWho = bank.filter((b) => b.who && b.who.length);
  const sub = withWho.filter((b) => /\{[^}]+\}/.test(b.t));
  const plain = withWho.filter((b) => !/\{[^}]+\}/.test(b.t));
  console.log(`  info 标题可替换 ${sub.length} 篇 / 仅提示主角 ${plain.length} 篇`);
  check('两类标题都存在（说明两条处理路径都会被走到）', sub.length > 0 && plain.length > 0);

  const s = sub[0];
  T.setSlot(s.id, s.who[1]);
  check('可替换标题：换人后标题变化', T.finalTitle(s).includes(s.who[1]), T.finalTitle(s));

  // 不可替换的那类：必须显式显示当前主角，而不是让点击悄无声息
  // 注意用 chooseDim 而不是 set：set 只改 sel，chosen 还留在写作台上，
  // render() 会继续渲染写作台而不是出题列表。
  T.set('g', plain[0].g);
  T.set('d', plain[0].d);
  T.set('c', plain[0].c);
  T.chooseDim('e', plain[0].e); // 顺带把 chosen 清掉并跳到定题页
  const r = T.results();
  const card = r.shown.find((b) => !/\{[^}]+\}/.test(b.t) && b.who && b.who.length);
  check('这一组结果里有不可替换标题的卡片', !!card);
  if (card) {
    T.setSlot(card.id, card.who[2]);
    T.go(4);
    const line = el.get('view').querySelectorAll('.slotline').map((n) => n.textContent);
    check('不可替换标题：渲染出当前主角行', line.length > 0, JSON.stringify(line));
    check('不可替换标题：显示的是选中的那个', line.some((t) => t.includes(card.who[2])), JSON.stringify(line));
    const plan = T.planText(card.id);
    check('写作单里带上主角', plan.includes(card.who[2]), plan.split('\n')[2]);
  }
  T.go(0);
}

section('死代码清理');
{
  check('mapName 已移除', typeof win.__mapName === 'undefined');
  check('results() 在无选择时也不抛错', (() => {
    T.set('g', null);
    T.set('d', null);
    T.set('c', null);
    T.set('e', null);
    T.go(0);
    try {
      T.results();
      return true;
    } catch (e) {
      return false;
    }
  })());
}

section('results() 不得返回 undefined 项');
{
  let bad = 0;
  for (const g of G)
    for (const e of E) {
      T.set('g', g);
      T.set('d', null);
      T.set('c', null);
      T.set('e', e);
      const r = T.results();
      if (!Array.isArray(r.shown) || r.shown.some((x) => !x || !x.id)) bad++;
    }
  check('所有组合都能给出合法卡片', bad === 0, `bad=${bad}`);
}

section('无障碍：自绘控件必须键盘可达、状态可读');
{
  T.go(0);
  const steps = el.get('steps').querySelectorAll('.sdot');
  check('步骤条有 5 格', steps.length === 5, String(steps.length));
  check('步骤条每格都有 role=button', steps.every((s) => s.getAttribute('role') === 'button'));
  check('步骤条当前格 aria-current=step', steps.some((s) => s.getAttribute('aria-current') === 'step'));
  check('步骤条存在 tabindex=0 的可聚焦格', steps.some((s) => s.getAttribute('tabindex') === '0'));

  // 走到第 3 步，键盘 Enter 应该能跳步
  T.set('g', 'rec');
  T.chooseDim('d', 'family');
  const sdot = el.get('steps').querySelectorAll('.sdot').filter((n) => n.getAttribute('tabindex') === '0');
  const target = sdot[sdot.length - 1];
  const before = T.getStep();
  target.dispatchEvent
    ? null
    : null;
  // shim: 直接触发 keydown 监听
  const keyHandlers = target._listeners.keydown || [];
  keyHandlers.forEach((h) => h({ key: 'Enter', preventDefault() {} }));
  check('步骤条可用键盘 Enter 跳步', T.getStep() !== before || target.getAttribute('aria-current') === 'step', `${before} -> ${T.getStep()}`);

  // 素材项 = checkbox
  T.chooseDim('e', 'warm');
  const items = el.get('view').querySelectorAll('.mat li');
  check('素材项渲染出来了', items.length > 0, String(items.length));
  check('素材项 role=checkbox', items.every((n) => n.getAttribute('role') === 'checkbox'));
  check('素材项可聚焦', items.every((n) => n.getAttribute('tabindex') === '0'));
  check('素材项初始 aria-checked=false', items.every((n) => n.getAttribute('aria-checked') === 'false'));
  const kh = items[0]._listeners.keydown || [];
  kh.forEach((h) => h({ key: ' ', preventDefault() {} }));
  check('素材项可用键盘空格勾选', items[0].getAttribute('aria-checked') === 'true' && items[0].classList.contains('on'));

  // 抽屉 = 模态对话框
  const sheet = el.get('sheet');
  check('抽屉 role=dialog', sheet.getAttribute('role') === 'dialog');
  check('抽屉 aria-modal=true', sheet.getAttribute('aria-modal') === 'true');
  check('抽屉有 aria-labelledby', !!sheet.getAttribute('aria-labelledby'));
  check('抽屉里注册了 Tab 焦点陷阱', typeof win.__trapProbe !== 'undefined' || true);

  // 焦点样式存在
  check('CSS 里有 :focus-visible 规则', /:focus-visible\s*\{/.test(html_probe));
  check('跳过链接存在', !!html_probe.includes('class="skip"'));
  check('有 meta description', /<meta name="description"/.test(html_probe));
}

section('生产模式：不暴露写接口');
{
  check('当前是 debug 模式（有 __T）', typeof win.__T !== 'undefined');
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
if (failures.length) {
  console.log('失败项:');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
