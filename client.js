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
    const CHART_TTL = 60000;
    const DEFAULT_SYMBOLS = ['sh000001', 'sh600519', 'sz300750', 'hk00700', 'usAAPL'];

    const BATCH_ENDPOINT = 'https://push2.eastmoney.com/api/qt/ulist.np/get';
    const BATCH_FIELDS = 'f12,f13,f14,f2,f3,f4,f5,f6,f15,f16,f17,f18';
    const US_MARKETS = [105, 106, 107];

    const FALLBACK_TEXT = {
      'panel.defaultLabel': '数据',
      'panel.auto': '自动刷新',
      'panel.refresh': '刷新',
      'panel.add': '添加',
      'panel.placeholder': '代码或板块名，如 600519、半导体、00700',
      'panel.empty': '自选股为空。在上面输入代码或板块名后回车即可添加。',
      'panel.notFound': '未找到该代码或板块',
      'panel.resolving': '查询板块…',
      'panel.thsBoardCode': '同花顺板块码无法直接使用，请输入板块名称（如 半导体）或东财代码 BK1036',
      'panel.loading': '加载中…',
      'panel.error': '行情获取失败',
      'panel.retry': '重试',
      'panel.unresolved': '未找到',
      'panel.convention': '红涨绿跌',
      'panel.source': '数据源：东方财富',
      'panel.drag': '拖动排序',
      'panel.chart': '曲线',
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
      'col.trend': '走势',
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
.dsq-form{position:relative;display:flex;align-items:center;gap:8px;flex:0 1 340px;min-width:220px}
.dsq-input{box-sizing:border-box;flex:1 1 auto;min-width:0;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;padding:5px 10px;border-radius:8px}
.dsq-input::placeholder{color:var(--dsw-alias-label-secondary)}
.dsq-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.dsq-suggest{position:absolute;top:calc(100% + 4px);left:0;z-index:40;display:flex;flex-direction:column;gap:2px;min-width:100%;max-width:360px;padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-overlay);box-shadow:0 10px 28px rgb(0 0 0 / 0.3)}
.dsq-suggest-item{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:5px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;text-align:left;cursor:pointer}
.dsq-suggest-item:hover,.dsq-suggest-item:focus-visible{background:var(--dsw-alias-bg-layer-2);outline:none}
.dsq-suggest-code{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dsq-tablewrap{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow-x:auto}
.dsq-grid{min-width:820px}
.dsq-chart-on .dsq-grid{min-width:912px}
.dsq-row{display:grid;grid-template-columns:28px 20px minmax(150px,1.6fr) repeat(4,minmax(72px,.9fr)) repeat(3,minmax(64px,.8fr));align-items:center;gap:8px;padding:6px 14px 6px 10px;border-top:1px solid var(--dsw-alias-border-l1)}
.dsq-chart-on .dsq-row{grid-template-columns:28px 20px minmax(140px,1.5fr) minmax(88px,1.1fr) repeat(4,minmax(72px,.9fr)) repeat(3,minmax(64px,.8fr))}
.dsq-chart{display:flex;align-items:center;justify-content:center;min-width:0}
.dsq-chart svg{display:block;width:100%;height:24px}
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

    /** Secids for one market: 1 = Shanghai, 0 = Shenzhen/Beijing, 116 = HK, 105-107 = US. */
    function secidsForMarket(market, body) {
      if (market === 'sh') return [`1.${body}`];
      if (market === 'sz' || market === 'bj') return [`0.${body}`];
      if (market === 'hk') return [`116.${hkCode(body)}`];
      if (market === 'us') return US_MARKETS.map((secidMarket) => `${secidMarket}.${body}`);
      return [];
    }

    /** Exchange suffixes seen in exports from 同花顺 / 通达信 / Yahoo. */
    const SUFFIX_MARKETS = {
      SH: 'sh', SS: 'sh', SZ: 'sz', BJ: 'bj', HK: 'hk', US: 'us', O: 'us', N: 'us', A: 'us',
    };

    /**
     * Expand one spelling into the secids worth trying, best first. Mirrors
     * `quotes.js`: prefix and suffix notation, Hong Kong and US codes, and both
     * markets for an ambiguous bare six-digit A-share code.
     */
    function candidateSecids(input) {
      if (typeof input !== 'string') return [];
      const raw = input.trim();
      if (raw === '') return [];

      const suffixed = /^([^.\-]+)[.\-]([A-Za-z]{1,2})$/.exec(raw);
      if (suffixed !== null) {
        const market = SUFFIX_MARKETS[suffixed[2].toUpperCase()];
        const suffixedBody = suffixed[1].trim().toUpperCase();
        if (market !== undefined && suffixedBody !== '') return secidsForMarket(market, suffixedBody);
      }

      if (/^\d{1,3}\.[A-Za-z0-9._-]+$/.test(raw)) return [raw];

      const prefixed = /^(sh|sz|bj|hk|us|nasdaq|nyse)[.:_-]?(.+)$/i.exec(raw);
      const prefix = prefixed === null ? '' : prefixed[1].toLowerCase();
      const body = (prefixed === null ? raw : prefixed[2]).trim().toUpperCase();
      if (body === '') return [];

      if (prefix === 'nasdaq' || prefix === 'nyse') return secidsForMarket('us', body);
      if (prefix !== '') return secidsForMarket(prefix, body);

      if (/^\d{6}$/.test(body)) {
        const primary = /^92\d{4}$/.test(body) ? 'sz' : (/^[569]/.test(body) ? 'sh' : 'sz');
        const secondary = primary === 'sh' ? 'sz' : 'sh';
        return [...secidsForMarket(primary, body), ...secidsForMarket(secondary, body)];
      }
      if (/^\d{1,5}$/.test(body)) return secidsForMarket('hk', body);
      // Eastmoney boards (板块) live on market 90: `BK1036` is the 半导体 board.
      if (/^BK\d+$/.test(body)) return [`90.${body}`];
      if (/^[A-Z][A-Z0-9.-]*$/.test(body)) return secidsForMarket('us', body);
      return [];
    }

    /**
     * Board (板块) names resolve against Eastmoney's own index, which this page can
     * read directly. The index is ~1000 rows across ten pages, so it is fetched on
     * demand and cached for a while instead of on every keystroke.
     */
    const BOARD_FAMILIES = ['m:90+t:2+f:!50', 'm:90+t:3+f:!50'];
    const BOARD_TTL = 10 * 60 * 1000;
    let boardIndex = null;
    let boardIndexAt = 0;

    /** Eastmoney appends Ⅱ/Ⅲ to split boards, so ignore that suffix when matching. */
    function boardNameKey(name) {
      return String(name).trim().replace(/[/\u2161-\u2163]$/, '');
    }

    async function fetchBoardIndex() {
      if (boardIndex !== null && Date.now() - boardIndexAt < BOARD_TTL) return boardIndex;
      const rows = [];
      for (const family of BOARD_FAMILIES) {
        for (let page = 1; page <= 6; page += 1) {
          const url = 'https://push2.eastmoney.com/api/qt/clist/get'
            + `?pn=${page}&pz=100&po=1&np=1&fltt=2&invt=2&fid=f3&fs=${family}&fields=f12,f14`;
          // A missing page should narrow the index, not fail the whole lookup, so
          // a page that errors twice is skipped rather than thrown.
          let chunk = null;
          for (let attempt = 0; attempt < 2 && chunk === null; attempt += 1) {
            try {
              const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
              if (!response.ok) break;
              const payload = await response.json();
              chunk = payload?.data?.diff ?? [];
            } catch {
              // Leave the page missing; the loop retries once and then moves on.
            }
          }
          if (chunk === null || chunk.length === 0) break;
          rows.push(...chunk);
        }
      }
      const index = new Map();
      for (const row of rows) {
        const name = boardNameKey(row.f14);
        const code = String(row.f12 ?? '');
        if (name !== '' && code !== '' && !index.has(name)) index.set(name, code);
      }
      boardIndex = index;
      boardIndexAt = Date.now();
      return index;
    }

    /**
     * Resolve a board name to its Eastmoney code.
     * @param query - what the user typed, e.g. `半导体`.
     * @returns The `BKxxxx` code, or an empty string when there is no unique match.
     */
    async function resolveBoard(query) {
      const wanted = boardNameKey(query);
      if (wanted.length < 2) return '';
      const index = await fetchBoardIndex();
      if (index.has(wanted)) return index.get(wanted);
      const hits = [...index.entries()].filter(([name]) => name.includes(wanted) || wanted.includes(name));
      return hits.length === 1 ? hits[0][1] : '';
    }

    /**
     * Name search. No public search endpoint sends a CORS header, so the searchable
     * list is generated by `scripts/build-index.mjs`, committed to the repository and
     * served from a CDN: one request, cached in localStorage for a day.
     */
    const INDEX_URLS = [
      'https://cdn.jsdelivr.net/gh/AhaCrazy/dsh-stock-quotes@main/data/securities.json',
      'https://raw.githubusercontent.com/AhaCrazy/dsh-stock-quotes/main/data/securities.json',
    ];
    const INDEX_KEY = 'dsh-stock-quotes/index';
    const INDEX_TTL = 24 * 60 * 60 * 1000;
    let indexPromise = null;

    function readIndexCache() {
      try {
        const raw = window.localStorage.getItem(INDEX_KEY);
        if (raw === null) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.entries) && parsed.entries.length > 0 ? parsed : null;
      } catch {
        return null;
      }
    }

    function writeIndexCache(entries) {
      try {
        window.localStorage.setItem(INDEX_KEY, JSON.stringify({ at: Date.now(), entries }));
      } catch {
        // Quota or private mode: the index just stays in memory for this page.
      }
    }

    async function loadIndex() {
      if (indexPromise !== null) return indexPromise;
      indexPromise = (async () => {
        const cached = readIndexCache();
        if (cached !== null && Date.now() - (cached.at ?? 0) < INDEX_TTL) return cached;
        for (const url of INDEX_URLS) {
          try {
            const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!response.ok) continue;
            const payload = await response.json();
            if (Array.isArray(payload?.entries) && payload.entries.length > 0) {
              writeIndexCache(payload.entries);
              return { at: Date.now(), entries: payload.entries };
            }
          } catch {
            // Try the next host, then fall back to whatever is cached.
          }
        }
        return cached ?? { at: 0, entries: [] };
      })();
      return indexPromise;
    }

    /**
     * Rank index entries for a typed query: exact name, name prefix, name substring,
     * then code prefix. Stable and dependency-free — the list is ~11k rows.
     */
    function searchIndex(entries, query, limit = 8) {
      const text = String(query ?? '').trim().toLowerCase();
      if (text === '' || !Array.isArray(entries)) return [];
      const scored = [];
      for (const entry of entries) {
        if (!Array.isArray(entry) || entry.length < 2) continue;
        const name = String(entry[0]);
        const spelling = String(entry[1]);
        const lowerName = name.toLowerCase();
        let score = -1;
        if (lowerName === text) score = 0;
        else if (lowerName.startsWith(text)) score = 1;
        else if (lowerName.includes(text)) score = 2;
        else if (spelling.toLowerCase().startsWith(text)) score = 3;
        if (score >= 0) scored.push([score, name, spelling]);
      }
      scored.sort((left, right) => left[0] - right[0] || left[1].localeCompare(right[1], 'zh-Hans-CN'));
      return scored.slice(0, limit).map(([, name, spelling]) => [name, spelling]);
    }

    const TREND_ENDPOINT = 'https://push2his.eastmoney.com/api/qt/stock/trends2/get';

    /**
     * Intraday close series for one entry, trying each candidate market the
     * spelling allows. Only `time,close` is requested: the full row would be three
     * times the payload and nothing else is drawn.
     * @param input - a watchlist spelling.
     * @param signal - optional abort signal.
     * @returns Close values in chronological order; empty when nothing answers.
     */
    async function fetchTrend(input, signal) {
      for (const secid of candidateSecids(input)) {
        try {
          const url = `${TREND_ENDPOINT}?secid=${encodeURIComponent(secid)}`
            + `&fields1=f1,f2&fields2=f51,f53&ndays=1&iscr=0&iscca=0&_=${Date.now()}`;
          const response = await fetch(url, { signal, cache: 'no-store', headers: { accept: 'application/json' } });
          if (!response.ok) continue;
          const payload = await response.json();
          const rows = payload !== null && payload !== undefined && payload.data
            ? payload.data.trends
            : undefined;
          if (!Array.isArray(rows) || rows.length === 0) continue;
          const points = [];
          for (const row of rows) {
            const parts = String(row).split(',');
            const value = Number(parts[1]);
            if (Number.isFinite(value)) points.push(value);
          }
          if (points.length >= 2) return points;
        } catch (error) {
          if (error !== null && typeof error === 'object' && error.name === 'AbortError') throw error;
        }
      }
      return [];
    }

    /**
     * SVG path for a sparkline: the series stretched over the box, a flat series
     * drawn along the midline.
     * @param points - close values, oldest first.
     * @param width - box width in user units.
     * @param height - box height in user units.
     * @returns Path data, or an empty string when there is nothing to draw.
     */
    function sparklinePath(points, width = 88, height = 24) {
      const values = (Array.isArray(points) ? points : [])
        .filter((value) => typeof value === 'number' && Number.isFinite(value));
      if (values.length < 2) return '';
      let min = values[0];
      let max = values[0];
      for (const value of values) {
        if (value < min) min = value;
        if (value > max) max = value;
      }
      const span = max - min;
      const stepX = width / (values.length - 1);
      const usable = height - 2;
      let path = '';
      for (let index = 0; index < values.length; index += 1) {
        const x = (index * stepX).toFixed(2);
        const y = (span === 0 ? height / 2 : height - ((values[index] - min) / span) * usable - 1).toFixed(2);
        path += `${index === 0 ? 'M' : 'L'}${x} ${y}`;
      }
      return path;
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
            return {
              label: typeof parsed.label === 'string' ? parsed.label : '',
              chart: parsed.chart !== false,
            };
          }
        }
      } catch {
        /* A blocked or corrupt store falls back to the defaults. */
      }
      return { label: '', chart: true };
    }

    /**
     * Persist preferences and let the sidebar re-render with the new name. Omitted
     * fields keep their stored value, so setting the name never resets the chart
     * toggle and vice versa.
     */
    function writePrefs(next) {
      const current = readPrefs();
      const label = next !== null && typeof next === 'object' && next.label !== undefined
        ? cleanLabel(next.label)
        : current.label;
      const chart = next !== null && typeof next === 'object' && next.chart !== undefined
        ? next.chart !== false
        : current.chart;
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify({ label, chart }));
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
      const [matches, setMatches] = React.useState([]);
      const [chart, setChart] = React.useState(() => readPrefs().chart);
      const [trends, setTrends] = React.useState({});
      const symbolsRef = React.useRef(symbols);
      symbolsRef.current = symbols;
      const trendsRef = React.useRef({});
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

      // Intraday lines, only while the chart column is on. One request per entry,
      // refreshed at most every CHART_TTL so a 15-second quote tick does not turn
      // into a burst of history requests.
      React.useEffect(() => {
        if (!chart) return undefined;
        let cancelled = false;
        const load = async () => {
          const wanted = symbolsRef.current.filter((symbol) => {
            const entry = trendsRef.current[symbol];
            return entry === undefined || Date.now() - entry.at > CHART_TTL;
          }).slice(0, 20);
          if (wanted.length === 0) return;
          const settled = await Promise.all(wanted.map(async (symbol) => {
            try {
              const points = await fetchTrend(symbol);
              return [symbol, points];
            } catch {
              return null;
            }
          }));
          if (cancelled) return;
          const next = { ...trendsRef.current };
          let changed = false;
          for (const item of settled) {
            if (item === null) continue;
            next[item[0]] = { at: Date.now(), points: item[1] };
            changed = true;
          }
          if (!changed) return;
          trendsRef.current = next;
          setTrends(next);
        };
        void load();
        const id = window.setInterval(() => {
          if (document.visibilityState === 'hidden') return;
          void load();
        }, CHART_TTL);
        return () => {
          cancelled = true;
          window.clearInterval(id);
        };
      }, [chart, symbols]);

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

      React.useEffect(() => {
        const query = draft.trim();
        if (query === '') {
          setMatches([]);
          return undefined;
        }
        let cancelled = false;
        const timer = window.setTimeout(() => {
          void loadIndex()
            .then((payload) => {
              if (!cancelled) setMatches(searchIndex(payload.entries, query));
            })
            .catch(() => {
              if (!cancelled) setMatches([]);
            });
        }, 180);
        return () => {
          cancelled = true;
          window.clearTimeout(timer);
        };
      }, [draft]);

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

      const addingRef = React.useRef(false);

      const commitSymbol = (entry) => {
        const cleaned = String(entry).trim();
        if (cleaned === '') return;
        setSymbols((previous) => (previous.some((item) => item.toLowerCase() === cleaned.toLowerCase())
          ? previous
          : previous.concat(cleaned)));
        setDraft('');
        setMatches([]);
      };

      const addSymbol = async (event) => {
        event.preventDefault();
        if (addingRef.current) return;
        const value = draft.trim();
        if (value === '') return;
        // A typed code wins over a suggestion: it is exactly what the user meant.
        if (candidateSecids(value).length > 0) {
          commitSymbol(value);
          return;
        }
        if (matches.length > 0) {
          commitSymbol(matches[0][1]);
          return;
        }
        // Not a code. A 同花顺 board code (88xxxx) is private to 同花顺 and has no
        // public mapping, so point at the two spellings that do work.
        if (/^88\d{4}$/.test(value)) {
          flash(t('panel.thsBoardCode'));
          return;
        }
        if (!/[\u4e00-\u9fa5]/.test(value)) {
          flash(t('panel.notFound'));
          return;
        }
        addingRef.current = true;
        flash(t('panel.resolving'));
        try {
          const code = await resolveBoard(value);
          if (code === '') flash(t('panel.notFound'));
          else commitSymbol(code);
        } catch {
          flash(t('panel.notFound'));
        } finally {
          addingRef.current = false;
        }
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

      /**
       * The sparkline cell. Colour follows the day's change, the same convention as
       * the numbers (red up, green down), and a flat day stays neutral.
       */
      const chartCell = (symbol, quote) => {
        const entry = trends[symbol];
        const path = entry === undefined ? '' : sparklinePath(entry.points);
        const change = quote === undefined ? undefined : quote.change;
        const stroke = change === undefined || change === 0
          ? 'var(--dsw-alias-state-idle-primary)'
          : change > 0
            ? 'var(--dsw-alias-state-error-primary)'
            : 'var(--dsw-alias-state-success-primary)';
        // The cell is always present while the column is on, even before the series
        // lands: a missing cell would shift every later column in that row.
        return h('div', { className: 'dsq-chart', role: 'cell' },
          path === '' ? null : h('svg', {
            viewBox: '0 0 88 24',
            preserveAspectRatio: 'none',
            'aria-hidden': true,
            focusable: 'false',
          },
          h('path', {
            d: path,
            fill: 'none',
            stroke,
            strokeWidth: '1.2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            vectorEffect: 'non-scaling-stroke',
          })));
      };

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

        const numeric = quote === undefined
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
        // Build the child list instead of emitting a null placeholder, so the row and
        // the header always agree on how many cells they have.
        const rowCells = chart ? [chartCell(symbol, quote), ...numeric] : numeric;

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
        ...rowCells);
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
        ...(chart ? [h('div', { className: 'dsq-chart', role: 'columnheader' }, t('col.trend'))] : []),
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
                    onKeyDown: (event) => {
                      if (event.key === 'Escape') setMatches([]);
                    },
                  }),
                  h('button', { className: 'dsq-btn', type: 'submit' }, t('panel.add')),
                  matches.length === 0 ? null : h('div', { className: 'dsq-suggest', role: 'listbox' },
                    matches.map(([name, spelling]) => h('button', {
                      type: 'button',
                      key: spelling,
                      className: 'dsq-suggest-item',
                      role: 'option',
                      title: spelling,
                      onClick: () => commitSymbol(spelling),
                    },
                    h('span', { className: 'dsq-suggest-name' }, name),
                    h('span', { className: 'dsq-suggest-code' }, spelling))))),
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
                }, `${t('panel.auto')} ${auto ? '· 15s' : ''}`.trim()),
                h('button', {
                  type: 'button',
                  className: 'dsq-btn',
                  role: 'switch',
                  'aria-checked': chart,
                  'aria-label': t('panel.chart'),
                  onClick: () => {
                    const next = !chart;
                    setChart(next);
                    writePrefs({ chart: next });
                  },
                }, t('panel.chart'))),
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
                : h('div', { className: chart ? 'dsq-tablewrap dsq-chart-on' : 'dsq-tablewrap', role: 'table' },
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
          'panel.notFound': FALLBACK_TEXT['panel.notFound'],
          'panel.resolving': FALLBACK_TEXT['panel.resolving'],
          'panel.thsBoardCode': FALLBACK_TEXT['panel.thsBoardCode'],
          'panel.loading': FALLBACK_TEXT['panel.loading'],
          'panel.error': FALLBACK_TEXT['panel.error'],
          'panel.retry': FALLBACK_TEXT['panel.retry'],
          'panel.unresolved': FALLBACK_TEXT['panel.unresolved'],
          'panel.convention': FALLBACK_TEXT['panel.convention'],
          'panel.source': FALLBACK_TEXT['panel.source'],
          'panel.drag': FALLBACK_TEXT['panel.drag'],
          'panel.chart': FALLBACK_TEXT['panel.chart'],
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
          'col.trend': FALLBACK_TEXT['col.trend'],
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
          'panel.placeholder': 'Symbol or board name, e.g. 600519, 半导体, 00700',
          'panel.empty': 'Your watchlist is empty. Type a symbol or board name above and press Enter.',
          'panel.notFound': 'No symbol or board matches that',
          'panel.resolving': 'Looking up boards…',
          'panel.thsBoardCode': 'A 同花顺 board code cannot be used here; type the board name (e.g. 半导体) or the Eastmoney code BK1036',
          'panel.loading': 'Loading…',
          'panel.error': 'Quote request failed',
          'panel.retry': 'Retry',
          'panel.unresolved': 'not found',
          'panel.convention': 'red up / green down',
          'panel.source': 'Source: Eastmoney',
          'panel.drag': 'Drag to reorder',
          'panel.chart': 'Charts',
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
          'col.trend': 'Trend',
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
      /** Pure helpers, exported so the smoke test can exercise them. */
      internals: { reorderList, moveNextTo, candidateSecids, searchIndex, sparklinePath, fetchTrend },
    };
  },
});
