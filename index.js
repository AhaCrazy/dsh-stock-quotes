/**
 * dsh-stock-quotes — Host half.
 *
 * Registers one model-facing tool, `stock_quote`, which answers "what is the price
 * of X right now" for a single stock or a whole watchlist in one request. The
 * browser half of this bundle owns the visual panel; this half owns the data and
 * the agent surface so quotes can also reach the conversation.
 *
 * This module deliberately imports nothing outside the package: a workspace-authored
 * bundle is linked into the profile from outside it, so a bare `@deepseek-ai/...`
 * specifier would not resolve and the row would fail to activate. The tool is
 * therefore registered as a raw ToolDefinition — a `parameters` JSON Schema plus
 * `output.schema`/`output.render` — which is the exact shape the tool registry
 * consumes, with argument handling validated here instead of by a schema helper.
 *
 * @module dsh-stock-quotes
 */
import { SYMBOL_HELP, fetchQuotes, formatAmount } from './quotes.js';

export const name = 'stock-quotes';

export const inject = ['tools'];

/** Fallback watchlist when the row's config does not override it. */
const FALLBACK_SYMBOLS = ['sh000001', 'sh600519', 'sz300750', 'hk00700', 'usAAPL'];

const SOURCE = '东方财富 (Eastmoney)';

/** Short spelling reminder for the result text; the full help rides the tool description. */
const SYMBOL_HINT = '示例：600519 / sh600519 / 00700 / AAPL';

const DESCRIPTION = [
  'Read the latest market quote (price, change, percentage, open/high/low, previous close, turnover)',
  'for one or more listed securities: Chinese A-shares, Hong Kong and US stocks.',
  'Call it with the symbols the user named; call it with no arguments for the configured watchlist.',
  SYMBOL_HELP,
  'Never guess a price: report only what this tool returns.',
].join(' ');

/**
 * Model-facing parameter schema, in the raw JSON Schema dialect the registry
 * accepts (`type`/`properties`/`required`/`additionalProperties`/`items` plus
 * annotations). `symbols` is optional: omitting it selects the watchlist.
 */
const PARAMETERS = {
  type: 'object',
  additionalProperties: false,
  properties: {
    symbols: {
      type: 'array',
      description: 'Symbols to quote, e.g. ["sh600519", "00700", "AAPL"]. Omit to quote the configured watchlist.',
      items: { type: 'string' },
    },
  },
};

/** Output schema; optional numeric fields are omitted rather than emitted as null. */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    asOf: { type: 'string', description: 'Instant the quotes were read, ISO 8601.' },
    source: { type: 'string', description: 'Quote data provider.' },
    quotes: {
      type: 'array',
      description: 'One entry per resolved symbol, in the order requested.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          symbol: { type: 'string', description: 'The spelling that was requested.' },
          code: { type: 'string', description: 'Exchange security code.' },
          name: { type: 'string', description: 'Security name.' },
          market: { type: 'string', description: 'Exchange label, e.g. SH, SZ, HK, NASDAQ.' },
          price: { type: 'number', description: 'Latest price.' },
          change: { type: 'number', description: 'Change against the previous close.' },
          changePct: { type: 'number', description: 'Change percentage.' },
          open: { type: 'number', description: 'Session open.' },
          high: { type: 'number', description: 'Session high.' },
          low: { type: 'number', description: 'Session low.' },
          preClose: { type: 'number', description: 'Previous close.' },
          volume: { type: 'number', description: 'Volume in lots.' },
          amount: { type: 'number', description: 'Turnover in the quote currency.' },
          marketCap: { type: 'number', description: 'Total market capitalisation.' },
          floatMarketCap: { type: 'number', description: 'Float market capitalisation.' },
        },
        required: ['symbol', 'code', 'name', 'market'],
      },
    },
    unresolved: {
      type: 'array',
      description: 'Requested symbols that produced no quote.',
      items: { type: 'string' },
    },
  },
  required: ['asOf', 'source', 'quotes', 'unresolved'],
};

/**
 * Normalise the model-supplied arguments without trusting their shape.
 * @param args - raw tool arguments.
 * @param defaultSymbols - watchlist used when no symbol is supplied.
 * @returns The symbols to quote.
 */
function requestedSymbols(args, defaultSymbols) {
  const raw = args === null || typeof args !== 'object' ? undefined : args.symbols;
  const list = typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw : [];
  const wanted = list
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry !== '');
  return wanted.length > 0 ? wanted : defaultSymbols;
}

/**
 * Build the `stock_quote` definition.
 *
 * Exported so a test can validate it against the real tool registry without
 * activating the plugin.
 *
 * @param defaultSymbols - watchlist used when the model passes no symbols.
 * @returns A registry-ready ToolDefinition.
 */
export function buildToolDefinition(defaultSymbols = FALLBACK_SYMBOLS) {
  return {
    name: 'stock_quote',
    description: DESCRIPTION,
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderQuotes(value) }],
    },
    isConcurrencySafe: () => true,
    presentCall(args) {
      const raw = args === null || typeof args !== 'object' ? undefined : args.symbols;
      const list = typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw : [];
      const shown = list.filter((entry) => typeof entry === 'string');
      return {
        card: 'generic',
        title: shown.length > 0 ? `查询行情 ${shown.join(' ')}` : '查询自选股行情',
        kind: 'fetch',
      };
    },
    async execute(args, exec) {
      const result = await fetchQuotes(requestedSymbols(args, defaultSymbols), { signal: exec?.signal });
      return { ...result, source: SOURCE };
    },
  };
}

/**
 * Format the tool's result as the text the model reads back.
 * @param value - the executed tool's own value.
 * @returns The rendered conversation text.
 */
export function renderQuotes(value) {
  const quotes = Array.isArray(value?.quotes) ? value.quotes : [];
  const unresolved = Array.isArray(value?.unresolved) ? value.unresolved : [];
  const lines = [`股票行情 · ${stamp(value?.asOf)} · 数据源：${SOURCE}`];

  if (quotes.length === 0) lines.push('（没有取到任何行情）');
  for (const quote of quotes) {
    const price = number(quote.price);
    const change = number(quote.change);
    const pct = number(quote.changePct);
    const arrow = change === undefined || change === 0 ? '·' : change > 0 ? '▲' : '▼';
    const delta = change === undefined
      ? ''
      : ` ${arrow} ${signed(change)}${pct === undefined ? '' : ` (${signed(pct)}%)`}`;
    const detail = [
      quote.open === undefined ? undefined : `开${text(quote.open)}`,
      quote.high === undefined ? undefined : `高${text(quote.high)}`,
      quote.low === undefined ? undefined : `低${text(quote.low)}`,
      quote.preClose === undefined ? undefined : `昨收${text(quote.preClose)}`,
      quote.amount === undefined ? undefined : `额${formatAmount(quote.amount)}`,
    ].filter((part) => part !== undefined);
    lines.push(
      `${quote.name || quote.code} (${quote.symbol}${quote.market ? ` · ${quote.market}` : ''}) `
      + `${text(price)}${delta}`
      + (detail.length === 0 ? '' : ` · ${detail.join(' ')}`),
    );
  }
  if (unresolved.length > 0) {
    lines.push(`未找到或无法解析：${unresolved.join('、')}（${SYMBOL_HINT}）`);
  }
  return lines.join('\n');
}

/**
 * Render an optional numeric field.
 * @param value - candidate value.
 * @returns Its string form, or undefined when absent.
 */
function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Render a quote number the same way the panel does — two decimals, `—` when the
 * field carries no value — so the conversation text and the table never disagree
 * about how a price looks.
 * @param value - candidate value.
 * @returns The formatted text.
 */
function text(value) {
  const parsed = number(value);
  return parsed === undefined ? '—' : parsed.toFixed(2);
}

/**
 * Prefix a positive number with `+` so the direction survives plain text.
 * @param value - a finite number.
 * @returns The signed string.
 */
function signed(value) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

/**
 * Format an ISO instant in the market's own time zone.
 * @param iso - ISO timestamp from the fetch result.
 * @returns A readable local timestamp.
 */
function stamp(iso) {
  const date = new Date(typeof iso === 'string' ? iso : Date.now());
  if (Number.isNaN(date.getTime())) return String(iso ?? '');
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Register the `stock_quote` tool on the profile.
 * @param ctx - the plugin's Host context.
 * @param config - the row's config, whose `defaultSymbols` seeds the watchlist.
 */
export function apply(ctx, config = {}) {
  const configured = config !== null && typeof config === 'object' && Array.isArray(config.defaultSymbols)
    ? config.defaultSymbols.filter((entry) => typeof entry === 'string' && entry.trim() !== '')
    : [];
  ctx.tools.register(buildToolDefinition(configured.length > 0 ? configured : FALLBACK_SYMBOLS));
}
