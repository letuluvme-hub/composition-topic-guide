// 校验标签文件：每行必须是 <序号>\t<标签字母串>，字母必须在允许集合内，
// 序号必须连续且覆盖到 1878。顺带报出质量问题。
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sandbox as win } from './harness.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2);
if (!files.length) {
  console.error('用法: node tools/check-tags.mjs <标签文件...>');
  process.exit(2);
}

const ALLOWED = 'abcdefghijklmnopqrstuv'.split('');
const set = new Set(ALLOWED);

const rows = new Map();
let dupes = 0;
// 与 build-tags.mjs 同一套约定：以 -v.txt 结尾的是 overlay，只往已有标签上加字母。
// base 之间重复要报错（说明两份标注打架了），overlay 重复是正常的。
const isOverlay = (f) => /-v\.txt$/.test(f);
const ordered = [...files].sort((a, b) => Number(isOverlay(b)) - Number(isOverlay(a)));
for (const f of ordered) {
  const p = resolve(f);
  if (!existsSync(p)) {
    console.log(`缺少文件: ${f}`);
    process.exit(1);
  }
  let lineNo = 0;
  let sawDataInFile = false;
  for (const raw of readFileSync(p, 'utf8').split('\\n')) {
    lineNo++;
    if (!raw.trim()) continue;
    // 以 # 开头的是文件头注释，只能出现在该文件自己的数据之前。
    // （文件名排序后 b2 会排在 txt 前面，所以不能拿全局 rows 判断。）
    if (raw.trimStart().startsWith('#')) {
      if (sawDataInFile) {
        console.log(`${f}:${lineNo} 注释出现在本文件数据中间: ${JSON.stringify(raw)}`);
        process.exit(1);
      }
      continue;
    }
    sawDataInFile = true;
    const m = raw.match(/^(\d+)\s+([a-z]*)\s*$/);
    if (!m) {
      console.log(`${f}:${lineNo} 格式错: ${JSON.stringify(raw)}`);
      process.exit(1);
    }
    const idx = Number(m[1]);
    const tags = m[2];
    const bad = [...tags].filter((c) => !set.has(c));
    if (bad.length) {
      console.log(`${f}:${lineNo} 非法字母 ${JSON.stringify(bad)} in ${JSON.stringify(tags)}`);
      process.exit(1);
    }
    if ([...tags].length !== new Set(tags).size) {
      console.log(`${f}:${lineNo} 字母重复: ${tags}`);
    }
    if ([...tags].length === 0) {
      console.log(`${f}:${lineNo} 空标签: ${idx}`);
    }
    if (isOverlay(f)) {
      if (!rows.has(idx)) {
        console.log(`${f}:${lineNo} overlay 给了一条没有基础标注的素材 ${idx}`);
        process.exit(1);
      }
      rows.set(idx, [...new Set(rows.get(idx) + tags)].sort().join(''));
      continue;
    }
    if (rows.has(idx)) {
      dupes++;
      console.log(`序号重复: ${idx} (${f}:${lineNo})`);
      if (rows.get(idx) !== tags) {
        console.log(`  两份基础标注不一致: "${rows.get(idx)}" vs "${tags}"`);
        process.exit(1);
      }
    }
    rows.set(idx, tags);
  }
}

const T = win.__T;
const TOTAL = T.matTotal();
console.log(`题库素材总数: ${TOTAL}`);
console.log(`已标注: ${rows.size}  (${((rows.size / TOTAL) * 100).toFixed(1)}%)`);
console.log(`重复序号: ${dupes}`);

const missing = [];
for (let i = 0; i < TOTAL; i++) if (!rows.has(i)) missing.push(i);
if (missing.length) {
  const ranges = [];
  let s = missing[0], prev = missing[0];
  for (const i of missing.slice(1)) {
    if (i === prev + 1) prev = i;
    else {
      ranges.push(s === prev ? `${s}` : `${s}-${prev}`);
      s = prev = i;
    }
  }
  ranges.push(s === prev ? `${s}` : `${s}-${prev}`);
  console.log(`未标注 ${missing.length} 条，区间: ${ranges.slice(0, 12).join(', ')}${ranges.length > 12 ? ' …' : ''}`);
}

// 标签使用统计
const usage = {};
for (const t of rows.values()) for (const c of t) usage[c] = (usage[c] || 0) + 1;
console.log('\n概念使用率:');
const NAME = {
  a: 'A1 与常规不同', b: 'A2 唯一', c: 'A3 被忽略', d: 'A4 被否定', e: 'A5 被看见',
  f: 'A6 别人跟着变', g: 'B1 重复', h: 'B2 时间点', i: 'B3 后来变了', j: 'B4 没停',
  k: 'C1 破旧', l: 'C2 慢', m: 'C3 静', n: 'C4 很小', o: 'D1 具体物',
  p: 'D2 声音', q: 'D3 身体', r: 'D4 字迹', s: 'D5 数字', t: 'E1 规矩', u: 'E2 第一次', v: 'E3 以此为业',
};
for (const c of ALLOWED) {
  const n = usage[c] || 0;
  const pctv = rows.size ? ((n / rows.size) * 100).toFixed(1) : '0.0';
  const flag = n === 0 ? '  ← 没用上' : n / rows.size > 0.85 ? '  ← 判别力过低' : '';
  console.log(`  ${c}  ${String(n).padStart(5)}  ${String(pctv).padStart(5)}%  ${NAME[c]}${flag}`);
}

// 自相矛盾检查：这些组合说明标注时手滑了
console.log('\n可疑组合:');
const SUSPECT = [
  ['a', 'c', 'A1 与常规不同 + A3 被忽略 —— 同一件事通常只占一头，多半标滥了'],
  ['a', 'f', 'A1 与常规不同 + A6 别人跟着变 —— 若真跟了风就不算"不同"'],
  ['g', 'i', 'B1 重复 + B3 后来变了 —— 重复到某个时间点才叫变化，标其一'],
  ['b', 'g', 'A2 唯一 + B1 重复 —— 唯一的东西不会重复，检查是否漏标'],
  ['e', 'c', 'A5 被看见 + A3 被忽略 —— 同一瞬间两头都占，多半标滥了'],
  ['d', 'e', 'A4 被否定 + A5 被看见 —— 反例才成立，多数是标错一个'],
];
for (const [x, y, why] of SUSPECT) {
  const n = [...rows.entries()].filter(([, t]) => t.includes(x) && t.includes(y)).length;
  if (n) console.log(`  ${x}+${y}  ${n} 条  ${why}`);
}

const avg = rows.size ? ([...rows.values()].reduce((a, t) => a + t.length, 0) / rows.size).toFixed(2) : '0';
console.log(`\n平均每条标签数: ${avg}`);
process.exit(missing.length ? 1 : 0);
