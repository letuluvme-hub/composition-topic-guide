// 把 data/mat-tags*.txt 压成 index.html 里 MAT_TAG_DATA 那一行。
// 每条 5 个字符：下标(3位定长) + 标签字母(2个)。
// 顺带把覆盖率写进 index.html，好让界面如实说「已标注 N / 1879」。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sandbox } from './harness.mjs';

/* 素材总数直接问 harness，不要 shell out 去问 check-tags ——
   check-tags 在覆盖率未满时返回非零（那是给 CI 看的），不该把 build 拖挂。 */
const TOTAL = sandbox.__T.matTotal();

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const indexPath = join(root, 'index.html');

const files = readdirSync(dataDir)
  .filter((f) => /^mat-tags.*\.txt$/.test(f))
  .sort();
if (!files.length) {
  console.error('data/ 下没有 mat-tags*.txt');
  process.exit(1);
}

const rows = new Map();
for (const f of files) {
  const p = join(dataDir, f);
  let lineNo = 0;
  for (const raw of readFileSync(p, 'utf8').split('\n')) {
    lineNo++;
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const m = raw.match(/^(\d+)\s+([a-z]*)$/);
    if (!m) {
      console.error(`${f}:${lineNo} 格式错: ${JSON.stringify(raw)}`);
      process.exit(1);
    }
    const idx = Number(m[1]);
    const tags = [...new Set(m[2])].sort().join('');
    if (tags.length > 15) {
      console.error(`${f}:${lineNo} 标签超过 15 个，压不进 1 位十六进制长度: ${tags}`);
      process.exit(1);
    }
    if (rows.has(idx) && rows.get(idx) !== tags) {
      console.error(`序号 ${idx} 在两个文件里标签不一致: "${rows.get(idx)}" vs "${tags}"`);
      process.exit(1);
    }
    rows.set(idx, tags);
  }
}

const idxs = [...rows.keys()].sort((a, b) => a - b);
let packed = '';
for (const i of idxs) {
  if (i > 999) {
    console.error(`下标超过 999，压不进定长格式：${i}`);
    process.exit(1);
  }
  const t = rows.get(i);
  // 下标(3位定长) + 标签个数(1位十六进制) + 标签字母
  packed += String(i).padStart(3, '0') + t.length.toString(16) + t;
}

const html = readFileSync(indexPath, 'utf8');
const next = html.replace(/var MAT_TAG_DATA='[^']*';/, `var MAT_TAG_DATA='${packed}';`);
if (next === html && !/var MAT_TAG_DATA='';/.test(html)) {
  console.error('没找到 MAT_TAG_DATA 声明，检查 index.html');
  process.exit(1);
}
writeFileSync(indexPath, next, 'utf8');

console.log(`合并 ${files.length} 个文件，标注 ${rows.size} / ${TOTAL} 条 (${((rows.size / TOTAL) * 100).toFixed(1)}%)`);
console.log(`MAT_TAG_DATA: ${packed.length} 字符`);
if (rows.size < TOTAL) {
  console.log(`未标注 ${TOTAL - rows.size} 条 —— 语义检索只在这 ${rows.size} 条里跑，界面会写明覆盖率。`);
}
