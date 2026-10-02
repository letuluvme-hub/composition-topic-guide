// Static sanity pass over index.html: extract the inline script, syntax-check it,
// and look for calls to functions that no longer exist.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const html = readFileSync('index.html', 'utf8');
const js = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];

const dir = mkdtempSync(join(tmpdir(), 'zdc-'));
const tmp = join(dir, 'inline.js');
writeFileSync(tmp, js, 'utf8');

let syntaxOk = true;
try {
  execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
} catch (e) {
  syntaxOk = false;
  console.log('语法检查失败:\n' + e.stderr.toString());
}
console.log('内联脚本语法:', syntaxOk ? 'OK' : 'FAIL', `(${js.split('\n').length} 行, ${js.length} 字符)`);

// defined top-level function names
const defined = new Set(
  [...js.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]),
);
// every `name(` that is not a keyword / method / local
const KEYWORDS = new Set([
  'if','for','while','switch','catch','return','typeof','function','new','delete','void',
  'do','else','in','of','await','yield','throw','case','break','continue','var','let','const',
]);
const CALLED = /([A-Za-z_$][\w$]*)\s*\(/g;
const suspects = new Map();
for (const m of js.matchAll(CALLED)) {
  const name = m[1];
  if (KEYWORDS.has(name)) continue;
  if (defined.has(name)) continue;
  if (/^[A-Z]/.test(name)) continue; // constructor-ish: el(), El(), Math.*, JSON.*
  if (/^(set|get|has|add|remove|toggle|indexOf|push|join|map|filter|forEach|reduce|slice|splice|concat|find|includes|match|replace|test|toString|toFixed|toLowerCase|trim|split|appendChild|insertBefore|removeChild|setAttribute|getAttribute|addEventListener|querySelector|querySelectorAll|createElement|createTextNode|getElementById|scrollTo|getAttribute|focus|click|startsWith|endsWith|keys|values|entries|assign|freeze|stringify|parse|log|warn|error|imul|ceil|floor|round|max|min|abs|now|reverse|some|every|flat|fill|charAt|repeat|at|findIndex|sort)\b/.test(name))
    continue;
  suspects.set(name, (suspects.get(name) || 0) + 1);
}
console.log('\n未定义却被调用的标识符（已排除内置/方法名）:');
if (!suspects.size) console.log('  （无）');
for (const [k, v] of suspects) console.log(`  ${k} ×${v}`);

// leftover markers of things we removed / that should not ship
console.log('\n遗留标记:');
const markers = {
  'window.__T 无条件暴露': /window\.__T\s*=/.test(js),
  'debug 门控存在': /var DEBUG=/.test(js),
  'rank() 定义': /function\s+rank\s*\(/.test(js),
  'mapName() 定义': /function\s+mapName\s*\(/.test(js),
  'console.log 残留': /console\.(log|debug)\s*\(/.test(js),
  'TODO/FIXME': /TODO|FIXME|XXX/.test(js),
  ':focus 样式': /:focus-visible\s*\{/.test(html),
};
for (const [k, v] of Object.entries(markers)) console.log(`  ${v ? '有' : '无'}  ${k}`);

console.log('\n文件大小:', html.length.toLocaleString(), 'bytes');
