// 端到端走一遍《不拘一格的美》，把界面上的真实内容打出来看。
import { sandbox as win, el } from './harness.mjs';
const T = win.__T;
const TOPIC = '不拘一格的美';

function dump(label) {
  console.log('\n' + '─'.repeat(72));
  console.log('  ' + label);
  console.log('─'.repeat(72));
  const walk = (n, d = 0) => {
    const own = n._text || '';
    const kids = n.children.length;
    if (own || kids <= 1) {
      const cls = n.className ? `[${n.className}]` : '';
      if (own) console.log('  '.repeat(1 + d) + own);
    }
    n.children.forEach((c) => walk(c, d + 1));
  };
  el.get('view').children.forEach((c) => walk(c, 0));
}

function clickByText(re, cls) {
  const n = el.get('view').querySelectorAll(cls || 'button').find((b) => re.test(b.textContent));
  if (n) n.click();
  return !!n;
}
function setInput(node, v) {
  node.value = v;
  (node._listeners.input || []).forEach((h) => h({ target: node }));
}

console.log('作文题：' + TOPIC);
console.log('题库里含「不拘」的题目：' + T.searchTopics(TOPIC).length + ' 篇（工具不会假装有）');

/* ---- 1. 首页 ---- */
T.setMode('home');
dump('① 首页');

/* ---- 2. 抄题 ---- */
clickByText(/我已经有作文题了/, '.opt');
const ti = el.get('view').querySelectorAll('input').find((i) => i.getAttribute('aria-label') === '我的作文题目');
setInput(ti, TOPIC);
dump('② 我的题目（刚抄完题，还没选体裁、没搜素材）');

/* ---- 3. 选体裁：议论说理 ---- */
clickByText(/议论说理/, '.chipb');
dump('③ 选完体裁 = 议论说理');

/* ---- 4. 线索切片翻素材 ---- */
clickByText(/^只有一个人$/, '.chipb');
const rows = el.get('view').querySelectorAll('.mini.matpick');
console.log(`\n  切片「只有一个人」翻出 ${rows.length} 条：`);
rows.slice(0, 6).forEach((r) => console.log('    · ' + r.textContent.replace(/收进我的清单|已收/g, '').trim()));

/* ---- 5. 再看一条更适合议论文的线索 ---- */
clickByText(/^敢 \/ 不敢$/, '.chipb');
const rows2 = el.get('view').querySelectorAll('.mini.matpick');
console.log(`\n  切片「敢 / 不敢」翻出 ${rows2.length} 条：`);
rows2.slice(0, 6).forEach((r) => console.log('    · ' + r.textContent.replace(/收进我的清单|已收/g, '').trim()));

/* ---- 6. 收 3 条进清单 ---- */
for (let i = 0; i < 3; i++) el.get('view').querySelectorAll('.mini.matpick .abtn.sm')[i]?.click();
dump('⑥ 收进清单之后的素材区（顺带看参考区）');

/* ---- 7. 进写作台 ---- */
clickByText(/就写这篇/);
console.log('\n' + '═'.repeat(72));
console.log('  写作单（点「复制整份写作单」会复制这个）');
console.log('═'.repeat(72));
console.log(
  T.planText('MY')
    .split('\n')
    .map((l) => '  ' + l)
    .join('\n'),
);
