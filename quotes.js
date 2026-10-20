/**
 * Symbol resolution + quote fetching for dsh-stock-quotes.
 *
 * This module is the Host half's data layer. It has no Harness imports, so it can
 * be syntax-checked and exercised directly with node. The browser half carries its
 * own copy of the same rules (a plain-JS client bundle cannot import a local file),
 * so any change to the rules here must be mirrored in `client.js`.
 *
 * Data source: Eastmoney's public quote endpoint. It is JSON, UTF-8, needs no key
 * and echoes the requesting origin in `Access-Control-Allow-Origin`, which is why
 * the browser half can call it directly.
 *
 * @module dsh-stock-quotes/quotes
 */

/** Batch quote endpoint. One request serves a whole watchlist. */
const BATCH_ENDPOINT = 'https://push2.eastmoney.com/api/qt/ulist.np/get';

/**
 * Requested fields: f12 code, f13 market, f14 name, f2 price, f3 change pct,
 * f4 change amount, f5 volume (lots), f6 turnover, f15 high, f16 low, f17 open,
 * f18 previous close, f20 total market cap, f21 float market cap.
 */
const BATCH_FIELDS = 'f12,f13,f14,f2,f3,f4,f5,f6,f15,f16,f17,f18,f20,f21';

/** Eastmoney market numbers tried for a bare US ticker, in order. */
const US_MARKETS = [105, 106, 107];

/** How the accepted symbol spellings are described to models and users. */
export const SYMBOL_HELP =
  'Accepted symbol spellings: A-share `600519`, `sh600519`, `sz000001`, `bj430047`, `600519.SH`, `000001.SZ`; '
  + 'Hong Kong `00700`, `hk00700`, `00700.HK`; US `AAPL`, `usAAPL`, `AAPL.US`; '
  + 'or a raw Eastmoney secid such as `1.600519`. A bare 1-5 digit number is read as Hong Kong. '
  + 'Chinese names are not resolved; pass a code.';

/**
 * Pad a Hong Kong code to its five-digit form (`700` -> `00700`).
 * @param body - digits as typed.
 * @returns The padded code.
 */
function hkCode(body) {
  const digits = body.replace(/^0+/, '');
  return digits === '' ? '00000' : digits.padStart(5, '0');
}

/**
 * Secids for one market. `sh` is market 1, `sz`/`bj` share market 0, Hong Kong is
 * 116, and the three US exchanges are 105/106/107.
 * @param market - `sh` | `sz` | `bj` | `hk` | `us`.
 * @param body - the code part, already uppercased.
 * @returns Candidate secids, best first.
 */
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
 * Expand one user/model spelling into the secids worth trying, best first.
 *
 * Accepts the spellings people copy out of a quote terminal — `600519`,
 * `600519.SH`, `sh600519`, `1.600519` — plus Hong Kong and US codes. A bare
 * six-digit A-share code is genuinely ambiguous (Shanghai indices share the
 * `000xxx` range with Shenzhen listings), so both markets are offered and the
 * first one that answers wins; an explicit market is authoritative.
 *
 * @param input - a symbol spelling, possibly with an exchange prefix or suffix.
 * @returns Candidate secids; empty when the spelling cannot be interpreted.
 */
export function candidateSecids(input) {
  if (typeof input !== 'string') return [];
  const raw = input.trim();
  if (raw === '') return [];

  // Suffix notation: `600519.SH`, `000001.SZ`, `00700.HK`, `AAPL.US`, `AAPL.O`.
  const suffixed = /^([^.\-]+)[.\-]([A-Za-z]{1,2})$/.exec(raw);
  if (suffixed !== null) {
    const market = SUFFIX_MARKETS[suffixed[2].toUpperCase()];
    const body = suffixed[1].trim().toUpperCase();
    if (market !== undefined && body !== '') return secidsForMarket(market, body);
  }

  // Already a secid, e.g. `1.600519` (a market id of at most three digits).
  if (/^\d{1,3}\.[A-Za-z0-9._-]+$/.test(raw)) return [raw];

  const prefixed = /^(sh|sz|bj|hk|us|nasdaq|nyse)[.:_-]?(.+)$/i.exec(raw);
  const prefix = prefixed === null ? '' : prefixed[1].toLowerCase();
  const body = (prefixed === null ? raw : prefixed[2]).trim().toUpperCase();
  if (body === '') return [];

  if (prefix === 'nasdaq' || prefix === 'nyse') return secidsForMarket('us', body);
  if (prefix !== '') return secidsForMarket(prefix, body);

  if (/^\d{6}$/.test(body)) {
    // 92xxxx are Beijing codes that start with 9; every other 4/8/0/1/2/3 code is
    // Shenzhen or Beijing on market 0, and 5/6/9 are Shanghai. Try the likely
    // market first, then the other one, so index codes such as `000300` still work.
    const primary = /^92\d{4}$/.test(body) ? 'sz' : (/^[569]/.test(body) ? 'sh' : 'sz');
    const secondary = primary === 'sh' ? 'sz' : 'sh';
    return [...secidsForMarket(primary, body), ...secidsForMarket(secondary, body)];
  }
  if (/^\d{1,5}$/.test(body)) return secidsForMarket('hk', body);
  if (/^[A-Z][A-Z0-9.-]*$/.test(body)) return secidsForMarket('us', body);
  return [];
}

/**
 * Coerce a quote field into a finite number.
 * @param value - raw field value; Eastmoney uses `"-"` for "not applicable".
 * @returns The number, or undefined when the field carries no value.
 */
export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * Name the exchange a quote row came from.
 * @param market - Eastmoney market number.
 * @param code - security code.
 * @returns A short exchange label.
 */
export function marketName(market, code) {
  switch (market) {
    case 1: return 'SH';
    case 0: return /^(4|8|92)/.test(String(code)) ? 'BJ' : 'SZ';
    case 116: return 'HK';
    case 105: return 'NASDAQ';
    case 106: return 'NYSE';
    case 107: return 'AMEX';
    default: return String(market ?? '');
  }
}

/**
 * Convert one Eastmoney row into the plugin's quote shape, dropping absent fields
 * so the tool's output schema never sees a null.
 * @param row - one entry of the endpoint's `data.diff` array.
 * @returns A plain quote object.
 */
export function toQuote(row) {
  const code = row.f12 === undefined || row.f12 === null ? '' : String(row.f12);
  const quote = {
    symbol: `${row.f13}.${code}`,
    code,
    name: typeof row.f14 === 'string' ? row.f14 : '',
    market: marketName(row.f13, code),
  };
  const numeric = {
    price: row.f2,
    change: row.f4,
    changePct: row.f3,
    open: row.f17,
    high: row.f15,
    low: row.f16,
    preClose: row.f18,
    volume: row.f5,
    amount: row.f6,
    marketCap: row.f20,
    floatMarketCap: row.f21,
  };
  for (const [key, value] of Object.entries(numeric)) {
    const parsed = toNumber(value);
    if (parsed !== undefined) quote[key] = parsed;
  }
  return quote;
}

/**
 * Format a turnover figure the way a Chinese market page does.
 * @param value - amount in the quote currency.
 * @returns A short human string.
 */
export function formatAmount(value) {
  const parsed = toNumber(value);
  if (parsed === undefined) return '—';
  if (Math.abs(parsed) >= 1e8) return `${(parsed / 1e8).toFixed(2)}亿`;
  if (Math.abs(parsed) >= 1e4) return `${(parsed / 1e4).toFixed(2)}万`;
  return parsed.toFixed(2);
}

/**
 * Fetch quotes for a list of symbol spellings with one batched request.
 *
 * @param inputs - symbol spellings as typed by the user or the model.
 * @param options - `signal` cancels the request, `timeoutMs` bounds it, and
 *   `fetchImpl` overrides the transport for tests.
 * @returns `{ quotes, unresolved, asOf }`; `quotes[].symbol` echoes the input.
 * @throws When the endpoint is unreachable or answers with a non-JSON/HTTP error.
 */
export async function fetchQuotes(inputs, options = {}) {
  const { signal, timeoutMs = 10000, fetchImpl = globalThis.fetch } = options;
  const list = (Array.isArray(inputs) ? inputs : [inputs])
    .map((entry) => String(entry ?? '').trim())
    .filter((entry) => entry !== '');

  const plan = list.map(candidateSecids);
  const secids = [];
  for (const group of plan) {
    for (const secid of group) if (!secids.includes(secid)) secids.push(secid);
  }

  const asOf = new Date().toISOString();
  if (secids.length === 0) return { quotes: [], unresolved: list, asOf };

  const controller = new AbortController();
  const abortFromParent = () => controller.abort(signal?.reason);
  if (signal !== undefined) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', abortFromParent, { once: true });
  }
  const timer = setTimeout(
    () => controller.abort(new Error(`stock quote request timed out after ${timeoutMs}ms`)),
    timeoutMs,
  );

  let payload;
  try {
    const url = `${BATCH_ENDPOINT}?secids=${encodeURIComponent(secids.join(','))}`
      + `&fields=${BATCH_FIELDS}&invt=2&fltt=2&_=${Date.now()}`;
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`quote endpoint answered HTTP ${response.status}`);
    payload = await response.json();
  } finally {
    clearTimeout(timer);
    if (signal !== undefined) signal.removeEventListener('abort', abortFromParent);
  }

  const diff = payload?.data?.diff;
  const rows = Array.isArray(diff) ? diff : diff === undefined || diff === null ? [] : [diff];
  const bySecid = new Map(rows.map((row) => [`${row.f13}.${row.f12}`, row]));

  const quotes = [];
  const unresolved = [];
  for (let index = 0; index < list.length; index++) {
    const row = plan[index].map((secid) => bySecid.get(secid)).find((hit) => hit !== undefined);
    if (row === undefined) {
      unresolved.push(list[index]);
      continue;
    }
    quotes.push({ ...toQuote(row), symbol: list[index] });
  }
  return { quotes, unresolved, asOf };
}
