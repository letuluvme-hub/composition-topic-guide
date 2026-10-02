// Minimal DOM shim so index.html's inline script can be executed under Node,
// giving us a real test bed for the pure logic + render side effects.
// Usage: node harness.mjs [path/to/index.html]
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(process.argv[2] || resolve(repoRoot, 'index.html'));
const html = readFileSync(target, 'utf8');

const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
if (!m) throw new Error('no inline <script> found in ' + target);
const code = m[1];

/* ---------- element ---------- */
let NODE_SEQ = 0;
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.dataset = {};
    this.style = new Proxy({}, { get: (t, k) => t[k] ?? '', set: (t, k, v) => ((t[k] = v), true) });
    this._classes = new Set();
    this._text = '';
    this._listeners = {};
    this._seq = NODE_SEQ++;
    this.id = '';
    this._classes = new Set();
    this.classList = {
      add: (...c) => c.forEach((x) => this._classes.add(x)),
      remove: (...c) => c.forEach((x) => this._classes.delete(x)),
      contains: (c) => this._classes.has(c),
      toggle: (c, force) => {
        const on = force === undefined ? !this._classes.has(c) : !!force;
        on ? this._classes.add(c) : this._classes.delete(c);
        return on;
      },
    };
  }
  /* className 必须和类集合同步，否则 querySelectorAll('.abtn.pri')
     永远匹配不到 app 自己创建的节点（第一版桩就栽在这里）。 */
  get className() {
    return [...this._classes].join(' ');
  }
  set className(v) {
    this._classes = new Set(
      String(v == null ? '' : v)
        .split(/\s+/)
        .filter(Boolean),
    );
  }
  appendChild(n) {
    if (!n) return n;
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this;
    this.children.push(n);
    return n;
  }
  insertBefore(n, ref) {
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) return this.appendChild(n);
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this;
    this.children.splice(i, 0, n);
    return n;
  }
  removeChild(n) {
    const i = this.children.indexOf(n);
    if (i >= 0) this.children.splice(i, 1);
    n.parentNode = null;
    return n;
  }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === 'id') this.id = String(v);
  }
  getAttribute(k) {
    return this.attributes[k] ?? null;
  }
  addEventListener(type, fn) {
    (this._listeners[type] ||= []).push(fn);
  }
  removeEventListener(type, fn) {
    const a = this._listeners[type];
    if (a) this._listeners[type] = a.filter((x) => x !== fn);
  }
  click() {
    for (const fn of this._listeners.click || []) fn({ stopPropagation() {}, preventDefault() {}, target: this });
  }
  select() {}
  set innerHTML(v) {
    if (v === '') this.children.forEach((c) => (c.parentNode = null)), (this.children = []);
    else this._html = v;
  }
  get innerHTML() {
    return this._html ?? '';
  }
  set textContent(v) {
    this.children.forEach((c) => (c.parentNode = null));
    this.children = [];
    this._text = String(v);
  }
  get textContent() {
    if (this.children.length) return this.children.map((c) => c.textContent).join('');
    return this._text;
  }
  // compound selector: '#id' | '.cls' | 'tag' | 'tag.cls#id'
  _match(sel) {
    const parts = sel.match(/^([a-zA-Z]*)((?:[.#][\w-]+)*)$/);
    if (!parts) return false;
    const [, tag, rest] = parts;
    if (tag && this.tagName !== tag.toUpperCase()) return false;
    for (const tok of rest.match(/[.#][\w-]+/g) || []) {
      if (tok[0] === '#' ? this.id !== tok.slice(1) : !this._classes.has(tok.slice(1))) return false;
    }
    return true;
  }
  _walk(fn) {
    for (const c of this.children) {
      if (c instanceof El) {
        fn(c);
        c._walk(fn);
      }
    }
  }
  // supports descendant combinators: '.mat li', 'div .card .tt'
  querySelectorAll(sel) {
    const steps = sel.trim().split(/\s+/);
    const out = [];
    this._walk((e) => {
      let node = e;
      let i = steps.length - 1;
      if (!node._match(steps[i])) return;
      node = node.parentNode;
      i--;
      while (i >= 0) {
        let found = false;
        while (node) {
          if (node instanceof El && node._match(steps[i])) {
            found = true;
            node = node.parentNode;
            break;
          }
          node = node.parentNode;
        }
        if (!found) return;
        i--;
      }
      out.push(e);
    });
    return out;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
}

class TextNode {
  constructor(t) {
    this._text = String(t);
    this.parentNode = null;
  }
  get textContent() {
    return this._text;
  }
}

/* ---------- document ---------- */
const byId = new Map();
const body = new El('body');
const doc = {
  body,
  documentElement: new El('html'),
  _listeners: {},
  createElement: (t) => new El(t),
  createTextNode: (t) => new TextNode(t),
  createDocumentFragment: () => new El('#fragment'),
  getElementById: (id) => byId.get(id) || null,
  querySelector: (s) => body.querySelector(s),
  querySelectorAll: (s) => body.querySelectorAll(s),
  addEventListener(t, fn) {
    (doc._listeners[t] ||= []).push(fn);
  },
  execCommand: () => true,
  scrollTo() {},
  title: '',
};

// pre-create every element referenced by the static markup, carrying its
// attributes across (role / aria-* live there and the app's a11y is checked on them)
for (const mm of html.matchAll(/<([a-zA-Z]+)([^>]*\sid="([^"]+)"[^>]*)>/g)) {
  const [, tag, attrs, id] = mm;
  const e = new El(tag);
  e.id = id;
  const ATTR_RE = /[a-zA-Z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g;
  for (const a of attrs.matchAll(ATTR_RE)) {
    const [raw] = a;
    const eq = raw.indexOf('=');
    const k = eq < 0 ? raw : raw.slice(0, eq);
    const v = eq < 0 ? '' : raw.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    e.setAttribute(k, v);
  }
  e.setAttribute('id', id);
  byId.set(id, e);
  body.appendChild(e);
}

/* ---------- storage ---------- */
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => void store.clear(),
};

/* ---------- timers (instrumented so we can detect leaks) ---------- */
const liveIntervals = new Set();
const timers = {
  setInterval: (fn, ms) => {
    const id = timers._seq++;
    liveIntervals.add({ id, fn, ms });
    return id;
  },
  clearInterval: (id) => {
    for (const t of liveIntervals) if (t.id === id) liveIntervals.delete(t);
  },
  setTimeout: (fn, ms) => {
    const id = timers._seq++;
    timers._timeouts ||= new Map();
    timers._timeouts.set(id, fn);
    return id;
  },
  clearTimeout: (id) => void timers._timeouts?.delete(id),
  _seq: 1,
  _timeouts: new Map(),
};
function fireIntervals(times = 1) {
  for (let i = 0; i < times; i++) for (const t of [...liveIntervals]) t.fn();
}
function runTimeouts() {
  const pending = [...timers._timeouts.values()];
  timers._timeouts.clear();
  for (const fn of pending) fn();
}

const win = {
  document: doc,
  localStorage,
  navigator: {},
  setInterval: timers.setInterval,
  clearInterval: timers.clearInterval,
  setTimeout: timers.setTimeout,
  clearTimeout: timers.clearTimeout,
  scrollTo() {},
  location: {
    search: process.env.HARNESS_SEARCH ?? '?debug',
    hostname: process.env.HARNESS_HOST ?? 'localhost',
    protocol: 'http:',
  },
  Math,
  Date,
  JSON,
  Object,
  Array,
  String,
  Number,
  RegExp,
  console,
};
win.window = win;
win.self = win;
win.globalThis = win;

vm.createContext(win);
vm.runInContext(code, win, { filename: 'index.html:inline-script' });

export const sandbox = win;
export const el = byId;
export const DOM = { El, TextNode, body, doc };
export const clock = {
  intervals: liveIntervals,
  get count() {
    return liveIntervals.size;
  },
  fireIntervals,
  runTimeouts,
  storage: store,
  resetStorage: () => store.clear(),
  toasts: [],
};
export { code };
