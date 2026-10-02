// 把 data/topic-profiles.txt 内联进 index.html（TOPIC_PROFILES / conceptsForTopic / profileNote）
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, 'data/topic-profiles.txt'), 'utf8');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

// 内联区块用一对哨兵注释夹住，比靠中文标题匹配稳
const BEGIN = '/* == TOPIC_PROFILES:BEGIN == */';
const END = '/* == TOPIC_PROFILES:END == */';
const i = html.indexOf(BEGIN);
const j = html.indexOf(END);
if (i < 0 || j < 0 || j < i) {
  console.error('index.html 里找不到成对的哨兵注释');
  process.exit(1);
}

const next =
  html.slice(0, i + BEGIN.length) +
  '\n' +
  src.trimEnd() +
  '\n' +
  html.slice(j);
writeFileSync(resolve(root, 'index.html'), next, 'utf8');
console.log(`题目档已内联：${src.length} 字符（区块 ${j - i} → ${src.length + BEGIN.length + END.length + 2}）`);
