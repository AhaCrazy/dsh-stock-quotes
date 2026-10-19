// Smoke test for the browser half without a browser: emulates the module loader,
// the locale service, the slot registry and a minimal React reconciler, then
// checks what the plugin registers, the pure list transforms, and what the
// components render. No DeepSeek Harness packages are needed.
import { readFileSync } from 'node:fs';

let failures = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n     expected ${e}\n     actual   ${a}`}`);
};

// --- browser stubs ---------------------------------------------------------
const store = new Map();
globalThis.window = {
  __ModuleLoader__: {
    load: ({ id, factory }) => {
      window.__module = { id, factory };
    },
  },
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
  },
  setInterval: () => 0,
  clearInterval: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1280,
  innerHeight: 900,
};
globalThis.document = {
  visibilityState: 'visible',
  addEventListener: () => {},
  removeEventListener: () => {},
};

// --- React stub that actually renders (functions are invoked, tree walked) --
const React = {
  Fragment: Symbol('Fragment'),
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useRef: (init) => ({ current: init }),
  useMemo: (fn) => fn(),
};

/** Walk a rendered element tree, invoking function components like React would. */
function walk(node, visit) {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (typeof node !== 'object') {
    visit({ type: '#text', value: String(node) });
    return;
  }
  if (typeof node.type === 'function') {
    walk(node.type(node.props), visit);
    return;
  }
  visit(node);
  walk(node.children, visit);
}

const collect = (node) => {
  const nodes = [];
  walk(node, (entry) => nodes.push(entry));
  return nodes;
};
const renderText = (node) => collect(node).filter((entry) => entry.type === '#text').map((entry) => entry.value).join('');
const inputsOf = (tree) => collect(tree).filter((node) => node.type === 'input');
const rowsOf = (tree) => collect(tree).filter((node) => node.props && node.props.role === 'row' && typeof node.props.onContextMenu === 'function');

// --- load the client module ------------------------------------------------
await import('../client.js');
const { id, factory } = globalThis.window.__module;
check('loader id equals package name', id, 'dsh-stock-quotes');

const mod = factory((specifier) => {
  if (specifier === 'react') return React;
  throw new Error(`unexpected require: ${specifier}`);
});
check('module injects slots+locale', mod.inject, ['slots', 'locale']);
check('module exports apply', typeof mod.apply, 'function');

// --- pure list transforms --------------------------------------------------
const { reorderList, moveNextTo } = mod.internals;
check('top', reorderList(['a', 'b', 'c'], ['c'], 'top'), ['c', 'a', 'b']);
check('bottom', reorderList(['a', 'b', 'c'], ['a'], 'bottom'), ['b', 'c', 'a']);
check('up single', reorderList(['a', 'b', 'c'], ['b'], 'up'), ['b', 'a', 'c']);
check('down single', reorderList(['a', 'b', 'c'], ['b'], 'down'), ['a', 'c', 'b']);
check('up at top is a no-op', reorderList(['a', 'b'], ['a'], 'up'), ['a', 'b']);
check('down at bottom is a no-op', reorderList(['a', 'b'], ['b'], 'down'), ['a', 'b']);
check('multi top keeps relative order', reorderList(['a', 'b', 'c', 'd'], ['b', 'd'], 'top'), ['b', 'd', 'a', 'c']);
check('multi bottom keeps relative order', reorderList(['a', 'b', 'c', 'd'], ['a', 'c'], 'bottom'), ['b', 'd', 'a', 'c']);
check('contiguous block moves up as a block', reorderList(['a', 'b', 'c', 'd'], ['c', 'd'], 'up'), ['a', 'c', 'd', 'b']);
check('contiguous block moves down as a block', reorderList(['a', 'b', 'c', 'd'], ['a', 'b'], 'down'), ['c', 'a', 'b', 'd']);
check('scattered selection shifts each entry', reorderList(['a', 'b', 'c', 'd'], ['b', 'd'], 'up'), ['b', 'a', 'd', 'c']);
check('everything selected is a no-op', reorderList(['a', 'b'], ['a', 'b'], 'top'), ['a', 'b']);
check('unknown mode is a no-op', reorderList(['a', 'b'], ['a'], 'sideways'), ['a', 'b']);
check('drop before target', moveNextTo(['a', 'b', 'c'], ['c'], 'a', false), ['c', 'a', 'b']);
check('drop after target', moveNextTo(['a', 'b', 'c'], ['a'], 'c', true), ['b', 'c', 'a']);
check('drop onto itself is a no-op', moveNextTo(['a', 'b', 'c'], ['b'], 'b', true), ['a', 'b', 'c']);
check('drop next to the neighbour', moveNextTo(['a', 'b', 'c'], ['a'], 'b', false), ['a', 'b', 'c']);
check('unknown drop target is a no-op', moveNextTo(['a', 'b'], ['a'], 'zz', false), ['a', 'b']);

// --- fake Cordis client context -------------------------------------------
const registered = [];
const injected = [];
let dictionaries = null;
let namespace = null;

const ctx = {
  effect: (fn) => fn(),
  locale: {
    register: (ns, dicts) => {
      namespace = ns;
      dictionaries = dicts;
      return () => {};
    },
    bind: () => (key) => {
      const dict = dictionaries && dictionaries.zh;
      if (dict && Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
      return key;
    },
  },
  slots: {
    inject: (key, callback) => {
      const disposer = callback();
      injected.push({ key, disposer });
      return disposer;
    },
    register: (options, component) => {
      registered.push({ options, component });
      return () => {};
    },
  },
};

mod.apply(ctx);

const t = ctx.locale.bind();
const byName = (name) => registered.filter((entry) => entry.options.name === name);
const setPrefs = (value) => store.set('dsh-stock-quotes/prefs', JSON.stringify(value));
const setWatchlist = (value) => store.set('dsh-stock-quotes/watchlist', JSON.stringify(value));

// --- locale dictionaries ---------------------------------------------------
check('locale namespace', namespace, 'stock-quotes');
check('zh/en keys balanced', Object.keys(dictionaries.zh).sort(), Object.keys(dictionaries.en).sort());
check('default label (zh)', dictionaries.zh['panel.defaultLabel'], '\u6570\u636e');
check('no empty dictionary value', Object.values(dictionaries.zh).concat(Object.values(dictionaries.en)).every((value) => typeof value === 'string' && value.length > 0), true);
check('no orphaned remove label', Object.prototype.hasOwnProperty.call(dictionaries.zh, 'watchlist.remove'), false);

// --- registrations ---------------------------------------------------------
check('slots injected', injected.map((entry) => entry.key), ['main', 'plugins.bundle.config', 'sidebar.panellist']);
check('one main page', byName('main').length, 1);
check('main key', byName('main')[0].options.key, 'stock-quotes');
check('no standalone settings page', byName('settings.section').length, 0);
check('one bundle-page card', byName('plugins.bundle.config').length, 1);
check('bundle-page card key', byName('plugins.bundle.config')[0].options.key, 'dsh-stock-quotes');
check('one sidebar icon', byName('sidebar.panellist').length, 1);
const icon = byName('sidebar.panellist')[0];
check('sidebar id', icon.options.id, 'stock-quotes');
check('label is a thunk', typeof icon.options.label, 'function');

// --- name resolution -------------------------------------------------------
check('default label resolves neutrally', icon.options.label(), '\u6570\u636e');
setPrefs({ label: '   Records   ' });
check('label is trimmed', icon.options.label(), 'Records');
setPrefs({ label: 'x'.repeat(80) });
check('label capped at 24', icon.options.label().length, 24);
setPrefs({ label: '' });
check('empty falls back to default', icon.options.label(), '\u6570\u636e');
store.set('dsh-stock-quotes/prefs', 'not json');
check('corrupt prefs fall back', icon.options.label(), '\u6570\u636e');
store.delete('dsh-stock-quotes/prefs');

// --- the bundle-page card --------------------------------------------------
const cardTree = byName('plugins.bundle.config')[0].component({ t });
check('bundle card renders', renderText(cardTree).includes('\u9762\u677f\u8bbe\u7f6e'), true);
check('bundle card has one input', inputsOf(cardTree).length, 1);

setPrefs({ label: 'Records' });
const cardTree2 = byName('plugins.bundle.config')[0].component({ t });
check('saved name is prefilled', inputsOf(cardTree2)[0].props.value, 'Records');
const summaryTree = byName('plugins.bundle.config')[0].component({ t, view: 'summary' });
check('summary view is one line', inputsOf(summaryTree).length, 0);
store.delete('dsh-stock-quotes/prefs');

// --- the quotes panel: rows, selection, drag handles -----------------------
setWatchlist(['AAPL', '600519', '00700']);
const pageTree = byName('main')[0].component({ t });
const rows = rowsOf(pageTree);
const text = renderText(pageTree);
check('renders one row per watchlist entry, in order', rows.map((row) => row.props.key), ['AAPL', '600519', '00700']);
check('panel heading uses the configured name', text.includes('\u6570\u636e'), true);
check('table headers still render', text.includes('\u6700\u65b0\u4ef7'), true);
check('no delete button remains', text.includes('\u2715'), false);
check('no delete-button class remains', collect(pageTree).some((node) => node.props && node.props.className === 'dsq-x'), false);

const firstRow = rows[0];
const firstChildren = firstRow.children.filter((child) => child && typeof child === 'object');
check('row starts with a checkbox cell', firstChildren[0].props.className, 'dsq-pick');
check('row checkbox is unchecked', firstChildren[0].children[0].props.checked, false);
check('row has a drag grip cell', firstChildren[1].props.className, 'dsq-grip-cell');
check('grip is draggable', firstChildren[1].children[0].props.draggable, 'true');
check('row reacts to right click', typeof firstRow.props.onContextMenu, 'function');
check('row accepts drops', typeof firstRow.props.onDrop, 'function');
check('row tracks drag over', typeof firstRow.props.onDragOver, 'function');

// Header: select-all checkbox plus the drag column, then the column labels.
const headRow = collect(pageTree).find((node) => node.props && node.props.className === 'dsq-row dsq-headrow');
check('header has a select-all checkbox', headRow.children[0].children[0].props.type, 'checkbox');
check('header column count matches the body', headRow.children.length, firstRow.children.length);

// --- source hygiene --------------------------------------------------------
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');
check('no Harness client package import', /@deepseek-ai\/dsh-client-/.test(source.replace(/^.*inject.*$/gm, '')), false);
check('no literal colours', /#[0-9a-fA-F]{3,8}\b/.test(source), false);
check('uses theme tokens', source.includes('--dsw-alias-'), true);
check('no dead settings-page code', /PreferencesPage|settings\.section|dsq-prefs-title/.test(source), false);
check('no dead panel-settings code', /showSettings|dsq-foot|dsq-inline/.test(source), false);
check('no dead delete-button code', /dsq-x|dsq-act|removeSymbol/.test(source), false);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
