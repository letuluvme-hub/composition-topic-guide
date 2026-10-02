// Production mode: no ?debug, no localhost -> write hooks must not be exposed.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(process.argv[2] || resolve(repoRoot, 'index.html'));
const html = readFileSync(target, 'utf8');
const code = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];

// minimal document: the app only needs getElementById at boot
const noop = () => {};
const stub = () => ({
  classList: { add: noop, remove: noop, contains: () => false, toggle: () => false },
  style: {},
  dataset: {},
  children: [],
  appendChild() {},
  insertBefore() {},
  removeChild() {},
  addEventListener: noop,
  querySelectorAll: () => [],
  querySelector: () => null,
  setAttribute: noop,
  getAttribute: () => null,
  innerHTML: '',
  textContent: '',
  value: '',
  parentNode: null,
});

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const store = new Map();
const win = {
  location: { search: '', hostname: 'example.github.io', protocol: 'https:' },
  console,
  Math,
  Date,
  JSON,
  Object,
  Array,
  String,
  Number,
  RegExp,
  setTimeout: () => 1,
  clearTimeout: noop,
  setInterval: () => 1,
  clearInterval: noop,
  scrollTo: noop,
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
  },
  document: {
    body: stub(),
    getElementById: (id) => (ids.includes(id) ? stub() : null),
    createElement: stub,
    createTextNode: () => ({}),
    addEventListener: noop,
  },
  navigator: {},
};
win.window = win;
win.self = win;
win.globalThis = win;
vm.createContext(win);

let crashed = null;
try {
  vm.runInContext(code, win, { filename: 'prod' });
} catch (e) {
  crashed = e;
}

const exposed = typeof win.__T !== 'undefined';
console.log('生产模式启动:', crashed ? `崩溃 -> ${crashed}` : '正常');
console.log('window.__T 是否暴露:', exposed ? '是（不该）' : '否（正确）');
console.log('window.__ZXZ 自检结果:', JSON.stringify(win.__ZXZ));

// and confirm debug mode still gets the hooks
const win2 = { ...win, location: { search: '?debug', hostname: 'example.github.io', protocol: 'https:' } };
win2.window = win2;
win2.self = win2;
win2.globalThis = win2;
vm.createContext(win2);
vm.runInContext(code, win2, { filename: 'debug' });
console.log('debug 模式 __T 暴露:', typeof win2.__T !== 'undefined' ? '是（正确）' : '否（不该）');

process.exit(crashed || exposed || typeof win2.__T === 'undefined' ? 1 : 0);
