/**
 * dsh-stock-quotes — Client half (Web UI).
 *
 * Two registrations, both root-scoped:
 *   - the行情 page in the layout's `main` keyed slot under the key `stock-quotes`;
 *   - its sidebar icon in `sidebar.panellist`, whose id addresses that same key.
 *
 * The page reads quotes straight from the public Eastmoney endpoint: it is JSON,
 * key-free and CORS-permissive, so no Host plumbing is needed for the visual half.
 * The symbol rules and quote shape mirror the Host half's `quotes.js`.
 */
window.__ModuleLoader__.load({
  id: 'dsh-stock-quotes',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'stock-quotes';
    const PANEL_ID = 'stock-quotes';
    /** Must equal package.json `name`: it keys the bundle's own settings card. */
    const PKG = 'dsh-stock-quotes';
    const STORAGE_KEY = 'dsh-stock-quotes/watchlist';
    const REFRESH_MS = 15000;
    const DEFAULT_SYMBOLS = ['sh000001', 'sh600519', 'sz300750', 'hk00700', 'usAAPL'];

    const BATCH_ENDPOINT = 'https://push2.eastmoney.com/api/qt/ulist.np/get';
    const BATCH_FIELDS = 'f12,f13,f14,f2,f3,f4,f5,f6,f15,f16,f17,f18';
    const US_MARKETS = [105, 106, 107];

    const FALLBACK_TEXT = {
      'panel.defaultLabel': '数据',
      'panel.auto': '自动刷新',
      'panel.refresh': '刷新',
      'panel.add': '添加',
      'panel.placeholder': '代码，如 sh600519 / 00700 / AAPL',
      'panel.empty': '自选股为空。在上面输入代码后回车即可添加。',
      'panel.loading': '加载中…',
      'panel.error': '行情获取失败',
      'panel.retry': '重试',
      'panel.unresolved': '未找到',
      'panel.convention': '红涨绿跌',
      'panel.source': '数据源：东方财富',
      'panel.drag': '拖动排序',
      'panel.copied': '已复制代码',
      'panel.copyFailed': '复制失败',
      'menu.title': '关注项操作',
      'menu.remove': '删除',
      'menu.copy': '复制代码',
      'menu.moveTop': '置顶',
      'menu.moveUp': '上移',
      'menu.moveDown': '下移',
      'menu.moveBottom': '置底',
      'menu.selectAll': '全选',
      'menu.clearSelection': '清除选择',
      'menu.select': '选中',
      'batch.selected': '已选',
      'batch.remove': '删除所选',
      'batch.top': '置顶',
      'batch.bottom': '置底',
      'batch.clear': '取消选择',
      'col.name': '名称 / 代码',
      'col.price': '最新价',
      'col.change': '涨跌额',
      'col.pct': '涨跌幅',
      'col.open': '今开',
      'col.high': '最高',
      'col.low': '最低',
      'col.amount': '成交额',
      'settings.title': '显示名称',
      'settings.cardTitle': '面板设置',
      'settings.cardDesc': '修改侧边栏图标与面板显示的名称；留空则用默认名称。',
      'settings.name': '名称',
      'settings.namePlaceholder': '留空则用默认名称',
      'settings.nameHint': '建议用不指向具体内容的中性名称，例如「数据」「报表」「Records」。',
      'settings.save': '保存',
      'settings.reset': '恢复默认',
      'settings.saved': '已保存',
      'settings.effective': '当前生效',
    };

    const CSS = `
.dsq-root{box-sizing:border-box;width:100%;min-width:0;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base)}
.dsq-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-gutter:stable}
.dsq-inner{padding:28px clamp(16px,3vw,40px) 48px}
[data-platform=darwin] .dsq-inner{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
.dsq-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 4px}
.dsq-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.dsq-meta{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsq-grow{flex:1 1 auto}
.dsq-toolbar{display:flex;align-items:center;gap:8px;margin:12px 0 16px;flex-wrap:wrap}
.dsq-btn{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;padding:3px 12px;border-radius:999px;cursor:pointer;white-space:nowrap;transition:border-color .2s,color .2s}
.dsq-btn:hover{border-color:var(--dsw-alias-label-secondary);color:var(--dsw-alias-label-primary)}
.dsq-btn[aria-checked=true]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.dsq-form{display:flex;align-items:center;gap:8px;flex:0 1 340px;min-width:220px}
.dsq-input{box-sizing:border-box;flex:1 1 auto;min-width:0;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;padding:5px 10px;border-radius:8px}
.dsq-input::placeholder{color:var(--dsw-alias-label-secondary)}
.dsq-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.dsq-tablewrap{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow-x:auto}
.dsq-grid{min-width:820px}
.dsq-row{display:grid;grid-template-columns:28px 20px minmax(150px,1.6fr) repeat(4,minmax(72px,.9fr)) repeat(3,minmax(64px,.8fr));align-items:center;gap:8px;padding:6px 14px 6px 10px;border-top:1px solid var(--dsw-alias-border-l1)}
.dsq-row:first-child{border-top:none}
.dsq-row:not(.dsq-headrow):hover{background:var(--dsw-alias-bg-layer-2)}
.dsq-headrow{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsq-num{text-align:right;font-variant-numeric:tabular-nums}
.dsq-up{color:var(--dsw-alias-state-error-primary)}
.dsq-down{color:var(--dsw-alias-state-success-primary)}
.dsq-flat{color:var(--dsw-alias-label-primary)}
.dsq-id{display:flex;flex-direction:column;min-width:0}
.dsq-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsq-code{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsq-missing{color:var(--dsw-alias-label-secondary)}
.dsq-selected{background:var(--dsw-alias-bg-layer-2)}
.dsq-dragging{opacity:.45}
.dsq-drop-before{box-shadow:inset 0 2px 0 var(--dsw-alias-brand-primary)}
.dsq-drop-after{box-shadow:inset 0 -2px 0 var(--dsw-alias-brand-primary)}
.dsq-pick{display:flex;align-items:center;justify-content:center}
.dsq-pick input{width:14px;height:14px;margin:0;cursor:pointer;accent-color:var(--dsw-alias-brand-primary)}
.dsq-grip-cell{display:flex;align-items:center;justify-content:center}
.dsq-grip{color:var(--dsw-alias-label-secondary);cursor:grab;font-size:12px;line-height:1;padding:2px;user-select:none}
.dsq-grip:active{cursor:grabbing}
.dsq-selbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px;padding:8px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.dsq-selcount{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsq-notice{color:var(--dsw-alias-state-success-primary);font-size:12px;line-height:18px}
.dsq-menu{position:fixed;z-index:40;box-sizing:border-box;padding:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);overflow-y:auto;max-height:70vh}
.dsq-menu:focus{outline:none}
.dsq-menu-item{display:block;box-sizing:border-box;width:100%;border:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;text-align:left;padding:6px 10px;border-radius:6px;cursor:pointer;white-space:nowrap}
.dsq-menu-item:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.dsq-menu-item:disabled{color:var(--dsw-alias-state-idle-primary);cursor:default}
.dsq-menu-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1)}
.dsq-empty{border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;padding:32px 20px;text-align:center;color:var(--dsw-alias-label-secondary);line-height:20px}
.dsq-note{margin-top:12px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsq-error{margin:12px 0 0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.dsq-prefs-row{display:flex;align-items:flex-start;gap:16px;padding:14px 0;border-top:1px solid var(--dsw-alias-border-l1)}
.dsq-prefs-row:first-of-type{border-top:none}
.dsq-prefs-key{flex:0 0 120px;padding-top:5px;color:var(--dsw-alias-label-secondary)}
.dsq-prefs-field{display:flex;flex-direction:column;gap:6px;flex:1 1 auto;min-width:0}
.dsq-prefs-input{box-sizing:border-box;width:100%;max-width:320px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;padding:5px 10px;border-radius:8px}
.dsq-prefs-input::placeholder{color:var(--dsw-alias-label-secondary)}
.dsq-prefs-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.dsq-prefs-hint{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsq-prefs-actions{display:flex;align-items:center;gap:8px;padding-top:16px}
.dsq-prefs-saved{color:var(--dsw-alias-state-success-primary);font-size:12px;line-height:18px}
.dsq-card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:16px 18px;margin:16px 0;color:var(--dsw-alias-label-primary);font-size:13px}
.dsq-card-title{margin:0 0 6px;font-size:14px;font-weight:500;line-height:22px}
.dsq-card-desc{margin:0 0 4px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
`;

    /** Pad a Hong Kong code to five digits. */
    function hkCode(body) {
      const digits = body.replace(/^0+/, '');
      return digits === '' ? '00000' : digits.padStart(5, '0');
    }

    /** Expand one spelling into the secids worth trying, best first. */
    function candidateSecids(input) {
      if (typeof input !== 'string') return [];
      const raw = input.trim();
      if (raw === '') return [];
      if (/^\d+\.[A-Za-z0-9]+$/.test(raw)) return [raw];
      const prefixed = /^(sh|sz|bj|hk|us|nasdaq|nyse)[.:_-]?(.+)$/i.exec(raw);
      const prefix = prefixed === null ? '' : prefixed[1].toLowerCase();
      const body = (prefixed === null ? raw : prefixed[2]).trim().toUpperCase();
      if (body === '') return [];
      if (prefix === 'sh') return [`1.${body}`];
      if (prefix === 'sz' || prefix === 'bj') return [`0.${body}`];
      if (prefix === 'hk') return [`116.${hkCode(body)}`];
      if (prefix === 'us' || prefix === 'nasdaq' || prefix === 'nyse') {
        return US_MARKETS.map((market) => `${market}.${body}`);
      }
      if (/^\d{6}$/.test(body)) {
        if (/^92\d{4}$/.test(body)) return [`0.${body}`];
        return [/^[569]/.test(body) ? `1.${body}` : `0.${body}`];
      }
      if (/^\d{1,5}$/.test(body)) return [`116.${hkCode(body)}`];
      if (/^[A-Z][A-Z0-9.-]*$/.test(body)) return US_MARKETS.map((market) => `${market}.${body}`);
      return [];
    }

    function toNumber(value) {
      if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    }

    function marketName(market, code) {
      switch (market) {
        case 1: return 'SH';
        case 0: return /^(4|8|92)/.test(String(code)) ? 'BJ' : 'SZ';
        case 116: return 'HK';
        case 105: return 'NASDAQ';
        case 106: return 'NYSE';
        case 107: return 'AMEX';
        default: return String(market === undefined || market === null ? '' : market);
      }
    }

    /** One requested batch, resolved back onto the requested spellings. */
    async function fetchQuotes(inputs, options) {
      const { signal } = options || {};
      const list = (Array.isArray(inputs) ? inputs : [inputs])
        .map((entry) => String(entry === undefined || entry === null ? '' : entry).trim())
        .filter((entry) => entry !== '');
      const plan = list.map(candidateSecids);
      const secids = [];
      for (const group of plan) {
        for (const secid of group) if (secids.indexOf(secid) === -1) secids.push(secid);
      }
      if (secids.length === 0) return { quotes: [], unresolved: list };

      const url = `${BATCH_ENDPOINT}?secids=${encodeURIComponent(secids.join(','))}`
        + `&fields=${BATCH_FIELDS}&invt=2&fltt=2&_=${Date.now()}`;
      const response = await fetch(url, { signal, cache: 'no-store', headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();

      const diff = payload && payload.data ? payload.data.diff : undefined;
      const rows = Array.isArray(diff) ? diff : diff === undefined || diff === null ? [] : [diff];
      const bySecid = new Map();
      for (const row of rows) bySecid.set(`${row.f13}.${row.f12}`, row);

      const quotes = [];
      const unresolved = [];
      for (let index = 0; index < list.length; index++) {
        let row;
        for (const secid of plan[index]) {
          const hit = bySecid.get(secid);
          if (hit !== undefined) { row = hit; break; }
        }
        if (row === undefined) { unresolved.push(list[index]); continue; }
        const code = row.f12 === undefined || row.f12 === null ? '' : String(row.f12);
        quotes.push({
          symbol: list[index],
          code,
          name: typeof row.f14 === 'string' ? row.f14 : '',
          market: marketName(row.f13, code),
          price: toNumber(row.f2),
          changePct: toNumber(row.f3),
          change: toNumber(row.f4),
          high: toNumber(row.f15),
          low: toNumber(row.f16),
          open: toNumber(row.f17),
          preClose: toNumber(row.f18),
          volume: toNumber(row.f5),
          amount: toNumber(row.f6),
        });
      }
      return { quotes, unresolved };
    }

    /** Read the saved watchlist; a saved empty list stays empty. */
    function readWatchlist() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((entry) => typeof entry === 'string' && entry.trim() !== '')
              .map((entry) => entry.trim());
          }
        }
      } catch {
        /* A blocked or corrupt store falls back to the defaults. */
      }
      return DEFAULT_SYMBOLS.slice();
    }

    function writeWatchlist(list) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        /* Persisting is a convenience; the page still works without it. */
      }
    }

    /**
     * Display preferences, kept in the browser so the plugin needs no Host
     * plumbing. Only the sidebar/page name is user-configurable; the default is
     * deliberately neutral so the entry does not advertise what it shows.
     */
    const PREFS_KEY = 'dsh-stock-quotes/prefs';
    const NAME_LIMIT = 24;
    const prefsListeners = new Set();

    /** Collapse whitespace and bound the length of a user-supplied name. */
    function cleanLabel(raw) {
      return String(raw === undefined || raw === null ? '' : raw)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, NAME_LIMIT);
    }

    /** Read the saved preferences; anything unreadable falls back to defaults. */
    function readPrefs() {
      try {
        const raw = window.localStorage.getItem(PREFS_KEY);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (parsed !== null && typeof parsed === 'object') {
            return { label: typeof parsed.label === 'string' ? parsed.label : '' };
          }
        }
      } catch {
        /* A blocked or corrupt store falls back to the defaults. */
      }
      return { label: '' };
    }

    /** Persist preferences and let the sidebar re-render with the new name. */
    function writePrefs(next) {
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify({ label: cleanLabel(next.label) }));
      } catch {
        /* The name change is a convenience; the panel still works without it. */
      }
      for (const listener of [...prefsListeners]) {
        try {
          listener();
        } catch {
          /* One failing listener must not block the others. */
        }
      }
    }

    /** Subscribe to preference changes. */
    function onPrefsChange(listener) {
      prefsListeners.add(listener);
      return () => prefsListeners.delete(listener);
    }

    /** Resolve the translate seat, falling back to the built-in dictionaries. */
    function translate(props) {
      return typeof props.t === 'function'
        ? props.t
        : (key) => (Object.prototype.hasOwnProperty.call(FALLBACK_TEXT, key) ? FALLBACK_TEXT[key] : key);
    }

    /** The name shown in the sidebar, the panel heading and the settings entry. */
    function displayName(t) {
      return cleanLabel(readPrefs().label) || t('panel.defaultLabel');
    }

    function fmt(value) {
      return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—';
    }

    function fmtSigned(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
    }

    function fmtAmount(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
      if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
      return value.toFixed(2);
    }

    function toneOf(change) {
      if (typeof change !== 'number' || !Number.isFinite(change) || change === 0) return 'flat';
      return change > 0 ? 'up' : 'down';
    }

    function clockOf(ms) {
      if (!ms) return '';
      const date = new Date(ms);
      const pad = (value) => String(value).padStart(2, '0');
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    function describeError(error) {
      if (error instanceof Error && error.message) return error.message;
      return String(error);
    }

    /**
     * Move a group of watchlist entries inside the list.
     *
     * `top`/`bottom` hoist or sink the whole group; `up`/`down` shift it one slot.
     * Entry identity is the symbol spelling, which is also what the list stores.
     *
     * @param list - current order.
     * @param moving - entries to move.
     * @param mode - `top` | `bottom` | `up` | `down`.
     * @returns The new order; the same array when nothing can move.
     */
    function reorderList(list, moving, mode) {
      const movingSet = new Set(moving);
      const block = list.filter((entry) => movingSet.has(entry));
      if (block.length === 0 || block.length === list.length) return list;
      const rest = list.filter((entry) => !movingSet.has(entry));
      if (mode === 'top') return [...block, ...rest];
      if (mode === 'bottom') return [...rest, ...block];
      if (mode === 'up') {
        // One pass, top to bottom: each moving entry swaps with a non-moving
        // predecessor, which shifts a contiguous block up in one pass too.
        const out = list.slice();
        let moved = false;
        for (let index = 1; index < out.length; index++) {
          if (movingSet.has(out[index]) && !movingSet.has(out[index - 1])) {
            const held = out[index - 1];
            out[index - 1] = out[index];
            out[index] = held;
            moved = true;
          }
        }
        return moved ? out : list;
      }
      if (mode === 'down') {
        const out = list.slice();
        let moved = false;
        for (let index = out.length - 2; index >= 0; index--) {
          if (movingSet.has(out[index]) && !movingSet.has(out[index + 1])) {
            const held = out[index + 1];
            out[index + 1] = out[index];
            out[index] = held;
            moved = true;
          }
        }
        return moved ? out : list;
      }
      return list;
    }

    /**
     * Insert `moving` entries directly before or after `target`.
     * @param list - current order.
     * @param moving - entries to move (dragged row).
     * @param target - the row that was dropped on.
     * @param after - whether the drop landed on the lower half of the target.
     * @returns The new order; the same array when nothing moves.
     */
    function moveNextTo(list, moving, target, after) {
      const movingSet = new Set(moving);
      if (movingSet.has(target)) return list;
      const block = list.filter((entry) => movingSet.has(entry));
      if (block.length === 0 || block.length === list.length) return list;
      const rest = list.filter((entry) => !movingSet.has(entry));
      const index = rest.indexOf(target);
      if (index < 0) return list;
      const at = index + (after ? 1 : 0);
      return [...rest.slice(0, at), ...block, ...rest.slice(at)];
    }

    /** The行情 page registered under the `main` key `stock-quotes`. */
    function StockQuotesPage(props) {
      const t = translate(props);
      const [symbols, setSymbols] = React.useState(readWatchlist);
      const [view, setView] = React.useState({ status: 'loading', quotes: [], updatedAt: 0, error: '' });
      const [auto, setAuto] = React.useState(true);
      const [draft, setDraft] = React.useState('');
      const [selected, setSelected] = React.useState(() => new Set());
      const [menu, setMenu] = React.useState(null);
      const [drag, setDrag] = React.useState(null);
      const [dropAt, setDropAt] = React.useState(null);
      const [notice, setNotice] = React.useState('');
      const symbolsRef = React.useRef(symbols);
      symbolsRef.current = symbols;
      const menuRef = React.useRef(null);
      const headCheckRef = React.useRef(null);
      const noticeTimer = React.useRef(null);

      const runRefresh = React.useCallback(async (signal) => {
        const list = symbolsRef.current;
        if (list.length === 0) {
          setView({ status: 'ready', quotes: [], updatedAt: Date.now(), error: '' });
          return;
        }
        try {
          const result = await fetchQuotes(list, signal ? { signal } : undefined);
          if (signal && signal.aborted) return;
          setView({ status: 'ready', quotes: result.quotes, updatedAt: Date.now(), error: '' });
        } catch (error) {
          if (signal && signal.aborted) return;
          setView((previous) => ({ ...previous, status: 'error', error: describeError(error) }));
        }
      }, []);

      // Refetch whenever the watchlist changes, and cancel an in-flight request on
      // unmount or replacement so a stale answer never lands in the table.
      React.useEffect(() => {
        const controller = new AbortController();
        void runRefresh(controller.signal);
        return () => controller.abort();
      }, [runRefresh, symbols]);

      React.useEffect(() => { writeWatchlist(symbols); }, [symbols]);

      React.useEffect(() => {
        if (!auto) return undefined;
        const id = window.setInterval(() => {
          if (document.visibilityState === 'hidden') return;
          void runRefresh();
        }, REFRESH_MS);
        return () => window.clearInterval(id);
      }, [auto, runRefresh]);

      // Close the context menu on anything that would leave it stranded.
      React.useEffect(() => {
        if (menu === null) return undefined;
        const close = () => setMenu(null);
        const onPointerDown = (event) => {
          if (menuRef.current !== null && menuRef.current.contains(event.target)) return;
          setMenu(null);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setMenu(null);
        };
        document.addEventListener('mousedown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('resize', close);
        window.addEventListener('scroll', close, true);
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown, true);
          window.removeEventListener('resize', close);
          window.removeEventListener('scroll', close, true);
        };
      }, [menu]);

      React.useEffect(() => {
        if (menu === null || menuRef.current === null) return;
        menuRef.current.focus();
      }, [menu]);

      React.useEffect(() => {
        if (headCheckRef.current === null) return;
        headCheckRef.current.indeterminate = selected.size > 0 && selected.size < symbols.length;
      }, [selected, symbols]);

      React.useEffect(() => () => {
        if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
      }, []);

      const flash = (text) => {
        setNotice(text);
        if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
        noticeTimer.current = window.setTimeout(() => {
          noticeTimer.current = null;
          setNotice('');
        }, 1600);
      };

      const copyText = (text) => {
        const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
        if (clipboard === undefined || typeof clipboard.writeText !== 'function') {
          flash(t('panel.copyFailed'));
          return;
        }
        clipboard.writeText(text).then(
          () => flash(t('panel.copied')),
          () => flash(t('panel.copyFailed')),
        );
      };

      const addSymbol = (event) => {
        event.preventDefault();
        const value = draft.trim();
        if (value === '') return;
        setSymbols((previous) => (previous.some((entry) => entry.toLowerCase() === value.toLowerCase())
          ? previous
          : previous.concat(value)));
        setDraft('');
      };

      const toggleSelected = (symbol) => {
        setSelected((previous) => {
          const next = new Set(previous);
          if (next.has(symbol)) next.delete(symbol);
          else next.add(symbol);
          return next;
        });
      };
      const selectAll = () => setSelected(new Set(symbolsRef.current));
      const clearSelection = () => setSelected(new Set());

      const removeMany = (list) => {
        const drop = new Set(list);
        setSymbols((previous) => previous.filter((entry) => !drop.has(entry)));
        setSelected((previous) => {
          const next = new Set(previous);
          for (const symbol of drop) next.delete(symbol);
          return next;
        });
        setMenu(null);
      };

      const moveMany = (list, mode) => {
        setSymbols((previous) => reorderList(previous, list, mode));
        setMenu(null);
      };

      /** A row action applies to the whole selection when that row is selected. */
      const scopeFor = (symbol) => (selected.has(symbol)
        ? symbols.filter((entry) => selected.has(entry))
        : [symbol]);

      const openMenu = (symbol, event) => {
        event.preventDefault();
        setMenu({ symbol, x: event.clientX, y: event.clientY });
      };

      const quoteBySymbol = new Map(view.quotes.map((quote) => [quote.symbol, quote]));

      const rowFor = (symbol) => {
        const quote = quoteBySymbol.get(symbol);
        const tone = quote === undefined ? '' : `dsq-${toneOf(quote.change)}`;
        const isSelected = selected.has(symbol);
        const isDropTarget = dropAt !== null && dropAt.symbol === symbol;
        const className = [
          'dsq-row',
          quote === undefined ? 'dsq-missing' : '',
          isSelected ? 'dsq-selected' : '',
          isDropTarget ? (dropAt.after ? 'dsq-drop-after' : 'dsq-drop-before') : '',
          drag === symbol ? 'dsq-dragging' : '',
        ].filter((part) => part !== '').join(' ');

        const cells = quote === undefined
          ? [0, 1, 2, 3, 4, 5, 6].map((index) => h('div', { className: 'dsq-num', role: 'cell', key: `dash${index}` }, '—'))
          : [
            h('div', { className: `dsq-num ${tone}`, role: 'cell' }, fmt(quote.price)),
            h('div', { className: `dsq-num ${tone}`, role: 'cell' }, fmtSigned(quote.change)),
            h('div', { className: `dsq-num ${tone}`, role: 'cell' }, `${fmtSigned(quote.changePct)}%`),
            h('div', { className: 'dsq-num', role: 'cell' }, fmt(quote.open)),
            h('div', { className: 'dsq-num', role: 'cell' }, fmt(quote.high)),
            h('div', { className: 'dsq-num', role: 'cell' }, fmt(quote.low)),
            h('div', { className: 'dsq-num', role: 'cell' }, fmtAmount(quote.amount)),
          ];

        return h('div', {
          className,
          role: 'row',
          key: symbol,
          'aria-selected': isSelected,
          onContextMenu: (event) => openMenu(symbol, event),
          onDragOver: (event) => {
            if (drag === null) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            setDropAt({ symbol, after: event.clientY - rect.top > rect.height / 2 });
          },
          onDragLeave: () => setDropAt((previous) => (previous !== null && previous.symbol === symbol ? null : previous)),
          onDrop: (event) => {
            event.preventDefault();
            const after = dropAt !== null && dropAt.symbol === symbol ? dropAt.after : false;
            if (drag !== null) setSymbols((previous) => moveNextTo(previous, [drag], symbol, after));
            setDrag(null);
            setDropAt(null);
          },
        },
        h('div', { className: 'dsq-pick', role: 'cell' },
          h('input', {
            type: 'checkbox',
            checked: isSelected,
            'aria-label': `${t('menu.select')} ${symbol}`,
            onChange: () => toggleSelected(symbol),
          })),
        h('div', { className: 'dsq-grip-cell', role: 'cell' },
          h('span', {
            className: 'dsq-grip',
            draggable: 'true',
            title: t('panel.drag'),
            'aria-hidden': 'true',
            onDragStart: (event) => {
              event.dataTransfer.setData('text/plain', symbol);
              event.dataTransfer.effectAllowed = 'move';
              setDrag(symbol);
            },
            onDragEnd: () => {
              setDrag(null);
              setDropAt(null);
            },
          }, '\u28ff')),
        h('div', { className: 'dsq-id', role: 'cell' },
          h('span', { className: 'dsq-name' }, quote === undefined ? symbol : (quote.name || quote.code)),
          h('span', { className: 'dsq-code' }, quote === undefined ? t('panel.unresolved') : `${symbol} · ${quote.market}`)),
        ...cells);
      };

      const allSelected = symbols.length > 0 && selected.size === symbols.length;
      const headRow = h('div', { className: 'dsq-row dsq-headrow', role: 'row' },
        h('div', { className: 'dsq-pick', role: 'columnheader' },
          h('input', {
            type: 'checkbox',
            ref: headCheckRef,
            checked: allSelected,
            'aria-label': t('menu.selectAll'),
            onChange: () => {
              if (allSelected) clearSelection();
              else selectAll();
            },
          })),
        h('div', { className: 'dsq-grip-cell', role: 'columnheader', 'aria-hidden': 'true' }),
        h('div', { role: 'columnheader' }, t('col.name')),
        h('div', { className: 'dsq-num', role: 'columnheader' }, t('col.price')),
        h('div', { className: 'dsq-num', role: 'columnheader' }, t('col.change')),
        h('div', { className: 'dsq-num', role: 'columnheader' }, t('col.pct')),
        h('div', { className: 'dsq-num', role: 'columnheader' }, t('col.open')),
        h('div', { className: 'dsq-num', role: 'columnheader' }, t('col.high')),
        h('div', { className: 'dsq-num', role: 'columnheader' }, t('col.low')),
        h('div', { className: 'dsq-num', role: 'columnheader' }, t('col.amount')));

      /** The right-click menu for one row, scoped to the selection when it applies. */
      const buildMenu = () => {
        const { symbol } = menu;
        const scope = scopeFor(symbol);
        const count = scope.length;
        const sized = (key) => (count > 1 ? `${t(key)} (${count})` : t(key));
        const scopeSet = new Set(scope);
        const firstIndex = symbols.findIndex((entry) => scopeSet.has(entry));
        let lastIndex = -1;
        for (let index = 0; index < symbols.length; index++) {
          if (scopeSet.has(symbols[index])) lastIndex = index;
        }
        const canUp = firstIndex > 0;
        const canDown = lastIndex >= 0 && lastIndex < symbols.length - 1;

        const entry = (key, label, action, disabled) => h('button', {
          type: 'button',
          key,
          className: 'dsq-menu-item',
          role: 'menuitem',
          disabled: disabled === true,
          onClick: () => {
            action();
            setMenu(null);
          },
        }, label);

        const width = 200;
        const viewportWidth = typeof window === 'undefined' ? 1200 : window.innerWidth;
        const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
        const left = Math.max(8, Math.min(menu.x, viewportWidth - width - 8));
        const top = Math.max(8, Math.min(menu.y, viewportHeight - 320));

        return h('div', {
          className: 'dsq-menu',
          role: 'menu',
          ref: menuRef,
          tabIndex: -1,
          'aria-label': t('menu.title'),
          style: { left: `${left}px`, top: `${top}px`, width: `${width}px` },
          onContextMenu: (event) => event.preventDefault(),
        },
        entry('remove', sized('menu.remove'), () => removeMany(scope)),
        entry('copy', sized('menu.copy'), () => copyText(scope.join('\n'))),
        h('div', { className: 'dsq-menu-sep', key: 'sep-move' }),
        entry('top', sized('menu.moveTop'), () => moveMany(scope, 'top'), !canUp),
        entry('up', sized('menu.moveUp'), () => moveMany(scope, 'up'), !canUp),
        entry('down', sized('menu.moveDown'), () => moveMany(scope, 'down'), !canDown),
        entry('bottom', sized('menu.moveBottom'), () => moveMany(scope, 'bottom'), !canDown),
        h('div', { className: 'dsq-menu-sep', key: 'sep-select' }),
        entry('select-all', t('menu.selectAll'), selectAll, symbols.length === 0),
        entry('clear-select', t('menu.clearSelection'), clearSelection, selected.size === 0));
      };

      const status = view.status === 'loading'
        ? t('panel.loading')
        : view.status === 'error'
          ? `${t('panel.error')}：${view.error}`
          : view.updatedAt > 0
            ? `${clockOf(view.updatedAt)} · ${t('panel.convention')} · ${t('panel.source')}`
            : t('panel.source');

      return h(React.Fragment, null,
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        h('div', { className: 'dsq-root' },
          h('div', { className: 'dsq-scroll' },
            h('div', { className: 'dsq-inner' },
              h('div', { className: 'dsq-head' },
                h('h1', { className: 'dsq-title' }, displayName(t)),
                h('span', { className: 'dsq-meta' }, status)),
              h('div', { className: 'dsq-toolbar' },
                h('form', { className: 'dsq-form', onSubmit: addSymbol },
                  h('input', {
                    className: 'dsq-input',
                    type: 'text',
                    value: draft,
                    placeholder: t('panel.placeholder'),
                    'aria-label': t('panel.placeholder'),
                    spellCheck: false,
                    onChange: (event) => setDraft(event.target.value),
                  }),
                  h('button', { className: 'dsq-btn', type: 'submit' }, t('panel.add'))),
                h('span', { className: 'dsq-grow' }),
                notice === '' ? null : h('span', { className: 'dsq-notice' }, notice),
                h('button', {
                  type: 'button',
                  className: 'dsq-btn',
                  onClick: () => { void runRefresh(); },
                }, t('panel.refresh')),
                h('button', {
                  type: 'button',
                  className: 'dsq-btn',
                  role: 'switch',
                  'aria-checked': auto,
                  'aria-label': t('panel.auto'),
                  onClick: () => setAuto((value) => !value),
                }, `${t('panel.auto')} ${auto ? '· 15s' : ''}`.trim())),
              selected.size === 0
                ? null
                : h('div', { className: 'dsq-selbar' },
                  h('span', { className: 'dsq-selcount' }, `${t('batch.selected')} ${selected.size}`),
                  h('button', {
                    type: 'button',
                    className: 'dsq-btn',
                    onClick: () => removeMany(symbols.filter((entry) => selected.has(entry))),
                  }, t('batch.remove')),
                  h('button', {
                    type: 'button',
                    className: 'dsq-btn',
                    onClick: () => setSymbols((previous) => reorderList(previous, symbols.filter((entry) => selected.has(entry)), 'top')),
                  }, t('batch.top')),
                  h('button', {
                    type: 'button',
                    className: 'dsq-btn',
                    onClick: () => setSymbols((previous) => reorderList(previous, symbols.filter((entry) => selected.has(entry)), 'bottom')),
                  }, t('batch.bottom')),
                  h('button', {
                    type: 'button',
                    className: 'dsq-btn',
                    onClick: clearSelection,
                  }, t('batch.clear'))),
              symbols.length === 0
                ? h('div', { className: 'dsq-empty' }, t('panel.empty'))
                : h('div', { className: 'dsq-tablewrap', role: 'table' },
                  h('div', { className: 'dsq-grid' }, headRow, symbols.map(rowFor))),
              view.status === 'error'
                ? h('button', {
                  type: 'button',
                  className: 'dsq-btn',
                  style: { marginTop: '12px' },
                  onClick: () => { void runRefresh(); },
                }, t('panel.retry'))
                : null,
              h('div', { className: 'dsq-note' },
                t('panel.placeholder')))),
          menu === null ? null : buildMenu()));
    }

    /**
     * Sidebar icon: the owner supplies the square edge. A plain table glyph, so a
     * glance at the rail reads as "some data view" rather than "stock market".
     */
    function PanelIcon(props) {
      const size = typeof props.size === 'number' && props.size > 0 ? props.size : 16;
      return h('svg', {
        viewBox: '0 0 16 16',
        width: size,
        height: size,
        'aria-hidden': true,
        focusable: 'false',
        style: { display: 'block' },
      },
      h('rect', { x: '2.2', y: '3.1', width: '11.6', height: '9.8', rx: '2', fill: 'none', stroke: 'currentColor', strokeWidth: '1.3' }),
      h('path', {
        d: 'M2.6 6.5h10.8M6.4 6.5v6',
        stroke: 'currentColor',
        strokeWidth: '1.1',
        strokeLinecap: 'round',
        fill: 'none',
      }));
    }

    /**
     * The display-name control. Shared by the standalone settings page and the
     * bundle's own page, so both stay in sync and only one form exists.
     */
    function NameSettingForm(props) {
      const t = translate(props);
      const [draft, setDraft] = React.useState(() => readPrefs().label);
      const [saved, setSaved] = React.useState(false);
      const effective = cleanLabel(draft) || t('panel.defaultLabel');

      const save = (event) => {
        event.preventDefault();
        writePrefs({ label: draft });
        setSaved(true);
      };
      const reset = () => {
        writePrefs({ label: '' });
        setDraft('');
        setSaved(true);
      };

      return h('form', { className: 'dsq-prefs-form', onSubmit: save },
        h('div', { className: 'dsq-prefs-row' },
          h('span', { className: 'dsq-prefs-key' }, t('settings.name')),
          h('div', { className: 'dsq-prefs-field' },
            h('input', {
              className: 'dsq-prefs-input',
              type: 'text',
              value: draft,
              maxLength: NAME_LIMIT,
              placeholder: t('settings.namePlaceholder'),
              'aria-label': t('settings.name'),
              onChange: (event) => {
                setDraft(event.target.value);
                setSaved(false);
              },
            }),
            h('span', { className: 'dsq-prefs-hint' }, t('settings.nameHint')),
            h('span', { className: 'dsq-prefs-hint' }, `${t('settings.effective')}：${effective}`))),
        h('div', { className: 'dsq-prefs-actions' },
          h('button', { className: 'dsq-btn', type: 'submit' }, t('settings.save')),
          h('button', { className: 'dsq-btn', type: 'button', onClick: reset }, t('settings.reset')),
          saved ? h('span', { className: 'dsq-prefs-saved' }, t('settings.saved')) : null));
    }

    /**
     * The same control rendered on the bundle's own page in Settings → Plugins,
     * which is where "this plugin's settings" is looked for. The owner asks for a
     * `summary` one-liner in the rows and a full `page` form on the page itself.
     */
    function BundleSettingsCard(props) {
      const t = translate(props);
      if (props.view === 'summary') {
        return h('span', null, `${t('settings.title')}：${displayName(t)}`);
      }
      return h(React.Fragment, null,
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        h('section', { className: 'dsq-card' },
          h('h2', { className: 'dsq-card-title' }, t('settings.cardTitle')),
          h('p', { className: 'dsq-card-desc' }, t('settings.cardDesc')),
          h(NameSettingForm, { t })));
    }

    /**
     * Register the locale namespace, the panel page, the settings page that owns
     * the display name, and the sidebar entry named by that setting.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, {
        zh: {
          'panel.defaultLabel': FALLBACK_TEXT['panel.defaultLabel'],
          'panel.auto': FALLBACK_TEXT['panel.auto'],
          'panel.refresh': FALLBACK_TEXT['panel.refresh'],
          'panel.add': FALLBACK_TEXT['panel.add'],
          'panel.placeholder': FALLBACK_TEXT['panel.placeholder'],
          'panel.empty': FALLBACK_TEXT['panel.empty'],
          'panel.loading': FALLBACK_TEXT['panel.loading'],
          'panel.error': FALLBACK_TEXT['panel.error'],
          'panel.retry': FALLBACK_TEXT['panel.retry'],
          'panel.unresolved': FALLBACK_TEXT['panel.unresolved'],
          'panel.convention': FALLBACK_TEXT['panel.convention'],
          'panel.source': FALLBACK_TEXT['panel.source'],
          'panel.drag': FALLBACK_TEXT['panel.drag'],
          'panel.copied': FALLBACK_TEXT['panel.copied'],
          'panel.copyFailed': FALLBACK_TEXT['panel.copyFailed'],
          'menu.title': FALLBACK_TEXT['menu.title'],
          'menu.remove': FALLBACK_TEXT['menu.remove'],
          'menu.copy': FALLBACK_TEXT['menu.copy'],
          'menu.moveTop': FALLBACK_TEXT['menu.moveTop'],
          'menu.moveUp': FALLBACK_TEXT['menu.moveUp'],
          'menu.moveDown': FALLBACK_TEXT['menu.moveDown'],
          'menu.moveBottom': FALLBACK_TEXT['menu.moveBottom'],
          'menu.selectAll': FALLBACK_TEXT['menu.selectAll'],
          'menu.clearSelection': FALLBACK_TEXT['menu.clearSelection'],
          'menu.select': FALLBACK_TEXT['menu.select'],
          'batch.selected': FALLBACK_TEXT['batch.selected'],
          'batch.remove': FALLBACK_TEXT['batch.remove'],
          'batch.top': FALLBACK_TEXT['batch.top'],
          'batch.bottom': FALLBACK_TEXT['batch.bottom'],
          'batch.clear': FALLBACK_TEXT['batch.clear'],
          'col.name': FALLBACK_TEXT['col.name'],
          'col.price': FALLBACK_TEXT['col.price'],
          'col.change': FALLBACK_TEXT['col.change'],
          'col.pct': FALLBACK_TEXT['col.pct'],
          'col.open': FALLBACK_TEXT['col.open'],
          'col.high': FALLBACK_TEXT['col.high'],
          'col.low': FALLBACK_TEXT['col.low'],
          'col.amount': FALLBACK_TEXT['col.amount'],
          'settings.title': FALLBACK_TEXT['settings.title'],
          'settings.cardTitle': FALLBACK_TEXT['settings.cardTitle'],
          'settings.cardDesc': FALLBACK_TEXT['settings.cardDesc'],
          'settings.name': FALLBACK_TEXT['settings.name'],
          'settings.namePlaceholder': FALLBACK_TEXT['settings.namePlaceholder'],
          'settings.nameHint': FALLBACK_TEXT['settings.nameHint'],
          'settings.save': FALLBACK_TEXT['settings.save'],
          'settings.reset': FALLBACK_TEXT['settings.reset'],
          'settings.saved': FALLBACK_TEXT['settings.saved'],
          'settings.effective': FALLBACK_TEXT['settings.effective'],
        },
        en: {
          'panel.defaultLabel': 'Data',
          'panel.auto': 'Auto refresh',
          'panel.refresh': 'Refresh',
          'panel.add': 'Add',
          'panel.placeholder': 'Symbol, e.g. sh600519 / 00700 / AAPL',
          'panel.empty': 'Your watchlist is empty. Type a symbol above and press Enter.',
          'panel.loading': 'Loading…',
          'panel.error': 'Quote request failed',
          'panel.retry': 'Retry',
          'panel.unresolved': 'not found',
          'panel.convention': 'red up / green down',
          'panel.source': 'Source: Eastmoney',
          'panel.drag': 'Drag to reorder',
          'panel.copied': 'Symbols copied',
          'panel.copyFailed': 'Copy failed',
          'menu.title': 'Watchlist actions',
          'menu.remove': 'Delete',
          'menu.copy': 'Copy symbol',
          'menu.moveTop': 'Move to top',
          'menu.moveUp': 'Move up',
          'menu.moveDown': 'Move down',
          'menu.moveBottom': 'Move to bottom',
          'menu.selectAll': 'Select all',
          'menu.clearSelection': 'Clear selection',
          'menu.select': 'Select',
          'batch.selected': 'Selected',
          'batch.remove': 'Delete selected',
          'batch.top': 'Move to top',
          'batch.bottom': 'Move to bottom',
          'batch.clear': 'Clear selection',
          'col.name': 'Name / symbol',
          'col.price': 'Price',
          'col.change': 'Change',
          'col.pct': 'Change %',
          'col.open': 'Open',
          'col.high': 'High',
          'col.low': 'Low',
          'col.amount': 'Turnover',
          'settings.title': 'Display name',
          'settings.cardTitle': 'Panel settings',
          'settings.cardDesc': 'Rename the sidebar entry and the panel heading; leave empty for the default.',
          'settings.name': 'Name',
          'settings.namePlaceholder': 'Empty uses the default',
          'settings.nameHint': 'A neutral name that does not describe the contents works best, e.g. "Data", "Reports", "Records".',
          'settings.save': 'Save',
          'settings.reset': 'Reset',
          'settings.saved': 'Saved',
          'settings.effective': 'In effect',
        },
      }), 'stock-quotes: dictionaries');

      const t = ctx.locale.bind(NS);
      /** Re-read on every projection by the sidebar, so a rename needs no reload. */
      const currentName = () => displayName(t);

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
      }, StockQuotesPage));

      // The bundle's own page is where "this plugin's settings" is looked for, so
      // the same control also renders there (keyed by the package name).
      ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
        name: 'plugins.bundle.config',
        key: PKG,
        locale: NS,
      }, BundleSettingsCard));

      const registerIcon = () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 30,
        label: currentName,
        locale: NS,
      }, PanelIcon);

      // The owner re-reads `label` on every projection, but saving a setting does
      // not re-project the sidebar, so re-register the entry to make a rename show
      // up immediately instead of on the next navigation.
      let disposeIcon = null;
      ctx.slots.inject('sidebar.panellist', () => {
        disposeIcon = registerIcon();
        return () => {
          const dispose = disposeIcon;
          disposeIcon = null;
          if (typeof dispose === 'function') dispose();
        };
      });

      ctx.effect(() => onPrefsChange(() => {
        if (disposeIcon === null) return;
        try {
          disposeIcon();
          disposeIcon = registerIcon();
        } catch {
          // The sidebar declaration is not live right now; slots.inject remounts it.
          disposeIcon = null;
        }
      }), 'stock-quotes: display name');
    }

    return {
      name: NS,
      inject: ['slots', 'locale'],
      apply,
      /** Pure list transforms, exported so the smoke test can exercise them. */
      internals: { reorderList, moveNextTo },
    };
  },
});
