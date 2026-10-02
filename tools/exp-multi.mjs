// 单概念 vs 多概念检索，差别有多大。
// 假设：docs/TAXONOMY.md 说「按组合检索」，但我的题目→概念映射把 7 个词
// 塌缩成了 1 个概念（a）。如果这个假设成立，多概念应该显著更好。
import { sandbox as win } from './harness.mjs';
const T = win.__T;

function show(title, concepts, n = 6) {
  const res = T.searchByConcepts(concepts);
  const names = concepts.map((c) => T.concept(c).nm).join(' + ');
  console.log(`\n${'─'.repeat(76)}`);
  console.log(`${title}`);
  console.log(`概念：${names}  →  ${res.length} 条`);
  res.slice(0, n).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.x.m}`);
    console.log(`     [${r.x.tags.map((c) => T.concept(c).nm).join('/')}]`);
  });
}

console.log('《不拘一格的美》—— 单概念 vs 多概念');
show('单概念 a（与常规不同）', ['a']);
show('a + b（+唯一）', ['a', 'b']);
show('a + b + k（+唯一 +破旧）', ['a', 'b', 'k']);
show('a + b + k + c + e（+唯一 +破旧 +被忽略 +被看见）', ['a', 'b', 'k', 'c', 'e']);

console.log('\n\n《规则该不该被打破》');
show('单概念 t（规矩）', ['t'], 5);
show('t + a（规矩 +与常规不同）', ['t', 'a'], 5);

console.log('\n\n《记忆里的那张脸》');
show('p + q + r（声音 +身体动作 +字迹）', ['p', 'q', 'r'], 6);
show('p + q + n（声音 +身体动作 +很小）', ['p', 'q', 'n'], 6);

/* 权重函数对比：现在用 1/sqrt(频率)。a 有 175 条、o 有 401 条，
   权重比只有 1.5 倍 —— 区分度太弱。看看改成 idf 会不会更分得开。 */
console.log('\n\n' + '='.repeat(76));
console.log('权重函数对比（a=175条, b=19条, o=401条, n=69条）');
const cs = T.concepts();
const byc = Object.fromEntries(cs.map((c) => [c.c, c]));
for (const [name, f] of [
  ['1/sqrt(n)  现在用的', (n) => 1 / Math.sqrt(n)],
  ['1/n       更激进', (n) => 1 / n],
  ['log(N/n)  idf', (n, N) => Math.log(N / n)],
]) {
  const mx = Math.max(...['a', 'b', 'o', 'n'].map((c) => f(byc[c].n, 540)));
  const w = Object.fromEntries(['a', 'b', 'o', 'n'].map((c) => [c, (f(byc[c].n, 540) / mx).toFixed(3)]));
  console.log(`  ${name.padEnd(18)} a=${w.a} b=${w.b} n=${w.n} o=${w.o}`);
}
console.log('\n  a/o 比值越大，「与常规不同 + 唯一」这类查询越不会被「只是有具体物」淹没。');
