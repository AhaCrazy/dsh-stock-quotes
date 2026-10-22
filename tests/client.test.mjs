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
const { reorderList, moveNextTo, candidateSecids: clientResolver } = mod.internals;
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

// --- the two halves must resolve symbols identically ----------------------
// The browser half cannot import quotes.js, so it carries a copy of the rules.
// Drift between the copies would make the panel and the tool disagree about
// what a spelling means, so compare them on everything people actually type.
const { candidateSecids: hostResolver } = await import('../quotes.js');
const SPELLINGS = [
  '600519', '000001', '300750', '688981', '430047', '830799', '920001', '900901', '200002',
  '000300', '000688', '000905', '510300', '159915', '161725', '128136',
  'sh600519', 'sz000001', 'bj430047', 'hk00700', 'usAAPL', 'SH.600519', 'hk 700',
  '600519.SH', '600519.SS', '600519.sh', '000001.SZ', '830799.BJ', '00700.HK',
  'AAPL.US', 'AAPL.O', '000300.SH', '600519.SZ', '1.600519', '116.00700', '105.AAPL',
  'BK1036', 'bk1036', '90.BK1036',
  '00700', '700', 'AAPL', 'BRK.B', '600519.XQ', '??', '', '   ',
];
let drift = 0;
for (const spelling of SPELLINGS) {
  const mine = JSON.stringify(clientResolver(spelling));
  const theirs = JSON.stringify(hostResolver(spelling));
  if (mine !== theirs) {
    drift += 1;
    console.log(`FAIL resolver drift on ${JSON.stringify(spelling)}\n     client ${mine}\n     host   ${theirs}`);
  }
}
check('client and host resolvers agree', drift, 0);
check('client resolver rejects a non-string', clientResolver(42), []);

// --- the search index ranking ---------------------------------------------
const { searchIndex } = mod.internals;
const SAMPLE = [
  ['贵州茅台', 'sh600519'],
  ['茅台酒业', 'sz000999'],
  ['半导体', 'BK1036'],
  ['半导体材料', 'BK1325'],
  ['阿里巴巴-W', 'hk09988'],
  ['AAPL', 'usAAPL'],
];
check('exact name ranks first', searchIndex(SAMPLE, '半导体')[0], ['半导体', 'BK1036']);
check('name prefix beats name substring', searchIndex(SAMPLE, '茅台').map(([name]) => name), ['茅台酒业', '贵州茅台']);
check('code prefix finds the entry', searchIndex(SAMPLE, 'sh600519')[0], ['贵州茅台', 'sh600519']);
check('board code prefix finds the board', searchIndex(SAMPLE, 'BK13')[0], ['半导体材料', 'BK1325']);
check('case-insensitive code', searchIndex(SAMPLE, 'usaapl')[0], ['AAPL', 'usAAPL']);
check('no match yields nothing', searchIndex(SAMPLE, 'zzzz'), []);
check('blank query yields nothing', searchIndex(SAMPLE, '   '), []);
check('limit is respected', searchIndex(SAMPLE, '茅台', 1).length, 1);
check('malformed entries are skipped', searchIndex([null, ['ok', 'sh600000'], []], 'ok').length, 1);

// --- the sparkline path ----------------------------------------------------
const { sparklinePath } = mod.internals;
const series = (pairs) => pairs.map(([t, v]) => ({ t, v }));
const tailOf = (path) => path.slice(path.lastIndexOf('L'));

check('a whole A-share session fills the box',
  tailOf(sparklinePath(series([['09:30', 10], ['15:00', 20]]), { kind: 'cn' })), 'L88.00 1.00');
check('a session that stops at 11:30 stops half way',
  tailOf(sparklinePath(series([['09:30', 10], ['11:30', 20]]), { kind: 'cn' })), 'L44.00 1.00');
check('the lunch break does not advance the line',
  tailOf(sparklinePath(series([['09:30', 10], ['12:00', 20]]), { kind: 'cn' })), 'L44.00 1.00');
check('the afternoon resumes from the middle',
  sparklinePath(series([['13:00', 10], ['14:00', 20]]), { kind: 'cn' }).startsWith('M44.00'), true);
check('a whole Hong Kong session fills the box',
  tailOf(sparklinePath(series([['09:30', 10], ['16:00', 20]]), { kind: 'hk' })), 'L88.00 1.00');
check('a US session crosses midnight without wrapping the axis',
  tailOf(sparklinePath(series([['21:30', 10], ['04:00', 20]]), { kind: 'us' })), 'L88.00 1.00');
check('US mid-session lands proportionally',
  tailOf(sparklinePath(series([['21:30', 10], ['00:30', 20]]), { kind: 'us' })), 'L40.62 1.00');
// Daylight saving: the US session opens at 21:30 Beijing in summer and 22:30 in
// winter. The open comes from the data, so both fill the box identically.
check('the US winter session fills the box',
  tailOf(sparklinePath(series([['22:30', 10], ['05:00', 20]]), { kind: 'us' })), 'L88.00 1.00');
check('the US winter clock follows the data',
  mod.internals.xAxisTicks(series([['22:30', 10], ['05:00', 20]]), 'us', 1, 390).map((tick) => tick.label),
  ['22:30', '01:00', '05:00']);
check('the US summer clock follows the data',
  mod.internals.xAxisTicks(series([['21:30', 10], ['04:00', 20]]), 'us', 1, 390).map((tick) => tick.label),
  ['21:30', '00:00', '04:00']);
check('an unknown session falls back to stretching',
  tailOf(sparklinePath(series([['09:30', 10], ['11:30', 20]]))), 'L88.00 1.00');
check('flat series sits on the midline',
  sparklinePath(series([['09:30', 5], ['10:00', 5]]), { kind: 'cn' }).includes(' 12.00'), true);
check('one point draws nothing', sparklinePath(series([['09:30', 5]]), { kind: 'cn' }), '');
check('empty series draws nothing', sparklinePath([], { kind: 'cn' }), '');
check('non-numeric points are ignored',
  sparklinePath(series([['09:30', 5], ['09:31', null], ['09:32', 7], ['09:33', 'x'], ['09:34', 9]]), { kind: 'cn' }).split('L').length, 3);

// --- scrubbing the sparkline ----------------------------------------------
const { seriesXAt, seriesY, seriesBounds } = mod.internals;
check('series bounds ignore junk', seriesBounds([{ v: 1 }, { v: null }, { v: 3 }, null, {}]), { min: 1, max: 3 });
check('series bounds of an empty series', seriesBounds([]), null);
check('the maximum sits at the top', seriesY(10, 0, 10, 24).toFixed(2), '1.00');
check('the minimum sits at the bottom', seriesY(0, 0, 10, 24).toFixed(2), '23.00');
check('a flat series sits on the midline', seriesY(5, 5, 5, 24), 12);
check('x follows the session clock', seriesXAt(series([['09:30', 1], ['11:30', 2]]), 1, 'cn').toFixed(1), '44.0');
check('x falls back to the index without a session', seriesXAt(series([['09:30', 1], ['11:30', 2]]), 1).toFixed(1), '88.0');

// --- the focus chart -------------------------------------------------------
const { focusGeometry, nearestIndex, xAxisTicks, formatLots } = mod.internals;
const CN_DAY = [
  { day: '2026-10-21', t: '09:30', v: 100, avg: 100, vol: 10 },
  { day: '2026-10-21', t: '10:30', v: 120, avg: 110, vol: 20 },
  { day: '2026-10-21', t: '11:30', v: 110, avg: 111, vol: 15 },
];
const geo = focusGeometry(CN_DAY, { kind: 'cn', mode: 1, preClose: 105 });

check('geometry builds a path', geo.d.startsWith('M'), true);
check('geometry builds a closed area', geo.area.endsWith('Z'), true);
check('high and low are identified', [geo.high.v, geo.low.v], [120, 100]);
check('the previous close is inside the plotted range', geo.min < 105 && geo.max > 105, true);
check('the average line is drawn for one day', geo.avg.startsWith('M'), true);
check('five-day mode drops the average line', focusGeometry(CN_DAY, { kind: 'cn', mode: 5 }).avg, '');
check('an unknown session still builds from the data', focusGeometry(CN_DAY, {}).d.startsWith('M'), true);
check('a flat series does not divide by zero', focusGeometry(series([['09:30', 5], ['10:00', 5]]), { kind: 'cn' }).d.startsWith('M'), true);
check('fewer than two points yields nothing', focusGeometry(CN_DAY.slice(0, 1), { kind: 'cn' }), null);
check('y ticks stay inside the plot box', geo.yTicks.every((tick) => tick.y >= 0 && tick.y <= 166), true);
check('y ticks ascend by value', geo.yTicks[0].value < geo.yTicks[geo.yTicks.length - 1].value, true);
check('session ticks for A shares', xAxisTicks(CN_DAY, 'cn', 1, 100).map((tick) => tick.label),
  ['09:30', '10:30', '11:30/13:00', '14:00', '15:00']);
check('the last session tick sits at the right edge', xAxisTicks(CN_DAY, 'cn', 1, 100)[4].x, 100);
const FIVE_DAYS = [
  { day: '2026-10-20', t: '09:30', v: 1 },
  { day: '2026-10-20', t: '15:00', v: 2 },
  { day: '2026-10-21', t: '09:30', v: 3 },
  { day: '2026-10-21', t: '15:00', v: 4 },
];
check('multi-day ticks mark each day start', xAxisTicks(FIVE_DAYS, 'cn', 5, 300).map((tick) => tick.label), ['10-20', '10-21']);
check('nearest index at the open', nearestIndex(CN_DAY, 0, 'cn', 1), 0);
check('nearest index at half a session', nearestIndex(CN_DAY, 0.5, 'cn', 1), 2);
check('nearest index clamps past the close', nearestIndex(CN_DAY, 1, 'cn', 1), 2);
check('nearest index for multi-day walks the series', nearestIndex(FIVE_DAYS, 0.5, 'cn', 5), 2);
check('an empty series has no nearest index', nearestIndex([], 0.5, 'cn', 1), -1);
check('lots are humanised', formatLots(123456), '12.35万手');
check('small lots stay raw', formatLots(43), '43手');
check('missing lots render a dash', formatLots(undefined), '—');

// --- sorting and preferences ----------------------------------------------
const { sortSymbols, normalisePrefs } = mod.internals;
const QUOTES = new Map([
  ['a', { name: 'AAA', price: 10, change: -1, changePct: -2, amount: 100 }],
  ['b', { name: 'BBB', price: 30, change: 3, changePct: 5, amount: 300 }],
  ['c', { name: 'CCC', price: 20, change: 0, changePct: 0, amount: 200 }],
]);
check('an unsorted list keeps the stored order', sortSymbols(['c', 'a', 'b'], null, 'desc', QUOTES), ['c', 'a', 'b']);
check('sort by change descending', sortSymbols(['a', 'b', 'c'], 'pct', 'desc', QUOTES), ['b', 'c', 'a']);
check('sort by change ascending', sortSymbols(['a', 'b', 'c'], 'pct', 'asc', QUOTES), ['a', 'c', 'b']);
check('sort by price', sortSymbols(['a', 'b', 'c'], 'price', 'asc', QUOTES), ['a', 'c', 'b']);
check('rows without a quote sink to the bottom', sortSymbols(['zz', 'a', 'b'], 'pct', 'desc', QUOTES), ['b', 'a', 'zz']);
const before = ['a', 'b'];
sortSymbols(before, 'pct', 'desc', QUOTES);
check('sorting does not mutate the watchlist', before, ['a', 'b']);

const defaults = normalisePrefs(undefined);
check('default refresh interval', defaults.refreshSeconds, 15);
check('default colour convention', defaults.convention, 'cn');
check('every optional column is on by default', defaults.columns, { open: true, high: true, low: true, amount: true });
check('an unknown refresh interval falls back', normalisePrefs({ refreshSeconds: 7 }).refreshSeconds, 15);
check('the alert threshold is clamped', normalisePrefs({ alertPct: 999 }).alertPct, 100);
check('a negative alert threshold disables alerts', normalisePrefs({ alertPct: -3 }).alertPct, 0);
check('charts default to on', normalisePrefs({}).chart, true);
check('an international convention is kept', normalisePrefs({ convention: 'intl' }).convention, 'intl');
check('a hidden column is kept hidden', normalisePrefs({ columns: { open: false } }).columns.open, false);

// --- bounded concurrency ---------------------------------------------------
// 2.0.0 shipped an empty chart column because the limit constant was undefined;
// `mapLimit` now treats a bad limit as a small positive width instead of zero.
const { mapLimit } = mod.internals;
const seen = [];
const limited = await mapLimit([1, 2, 3, 4, 5], 2, async (item) => {
  seen.push(item);
  return item * 2;
});
check('every item runs exactly once', limited, [2, 4, 6, 8, 10]);
check('the input order is preserved', seen.slice().sort((a, b) => a - b), [1, 2, 3, 4, 5]);
const invalidLimit = await mapLimit([1, 2, 3], undefined, async (item) => item + 1);
check('an invalid limit still runs the work', invalidLimit, [2, 3, 4]);
check('an empty list resolves to an empty array', await mapLimit([], 4, async () => 1), []);

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
const cardInputs = inputsOf(cardTree);
check('the name field is first', cardInputs[0].props.maxLength, 24);
check('the card carries refresh, colours, columns and alert controls', cardInputs.length >= 6, true);
check('the card offers a transfer box',
  collect(cardTree).some((node) => node.type === 'textarea'), true);

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
check('row can be focused by clicking', typeof firstRow.props.onClick, 'function');

// Header: select-all checkbox plus the drag column, then the column labels.
const headRow = collect(pageTree).find((node) => node.props && node.props.className === 'dsq-row dsq-headrow');
check('header has a select-all checkbox', headRow.children[0].children[0].props.type, 'checkbox');
check('header column count matches the body', headRow.children.length, firstRow.children.length);

// --- the trend column ------------------------------------------------------
const chartCells = (tree) => collect(tree).filter((node) => node.props && node.props.className === 'dsq-chart');
const tablewrapOf = (tree) => collect(tree).find((node) => node.props && node.props.className !== undefined && String(node.props.className).includes('dsq-tablewrap'));
check('charts are on by default', chartCells(pageTree).length, rows.length + 1);
check('the grid template carries the chart column',
  String(rows[0].props.style.gridTemplateColumns).includes('minmax(88px'), true);
check('the chart header is present', chartCells(pageTree)[0].props.role, 'columnheader');
check('a chart cell is emitted even before the series lands', chartCells(pageTree)[1].children.filter(Boolean).length, 0);
check('the chart cell accepts pointer moves', typeof chartCells(pageTree)[1].props.onPointerMove, 'function');
check('the chart cell clears the pointer', typeof chartCells(pageTree)[1].props.onPointerLeave, 'function');

setPrefs({ chart: false });
const plainTree = byName('main')[0].component({ t });
const plainRows = rowsOf(plainTree);
check('charts are off when the preference says so', chartCells(plainTree).length, 0);
check('the grid drops the chart column',
  String(plainRows[0].props.style.gridTemplateColumns).includes('minmax(88px'), false);
check('rows stay aligned without the column', plainRows[0].children.length, rows[0].children.length - 1);
store.delete('dsh-stock-quotes/prefs');

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
