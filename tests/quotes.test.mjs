// Checks for the pure quote layer: symbol resolution, formatting, batching and
// cancellation. The deterministic part needs no network; the live section is
// skipped (not failed) when the endpoint is unreachable.
import {
  candidateSecids, fetchQuotes, formatAmount, toNumber, toQuote, marketName, SYMBOL_HELP,
} from '../quotes.js';

let failures = 0;
let skipped = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n     expected ${e}\n     actual   ${a}`}`);
};

console.log('--- candidateSecids ---');
// A bare six-digit code is ambiguous, so both markets are offered and the first
// one that answers wins; an explicit market is authoritative.
check('600519', candidateSecids('600519'), ['1.600519', '0.600519']);
check('000001', candidateSecids('000001'), ['0.000001', '1.000001']);
check('300750', candidateSecids('300750'), ['0.300750', '1.300750']);
check('688981', candidateSecids('688981'), ['1.688981', '0.688981']);
check('430047 (BJ)', candidateSecids('430047'), ['0.430047', '1.430047']);
check('830799 (BJ)', candidateSecids('830799'), ['0.830799', '1.830799']);
check('920001 (BJ 92x)', candidateSecids('920001'), ['0.920001', '1.920001']);
check('900901 (SH B)', candidateSecids('900901'), ['1.900901', '0.900901']);
check('000300 (index, market 0 empty first)', candidateSecids('000300'), ['0.000300', '1.000300']);
check('sh600519', candidateSecids('sh600519'), ['1.600519']);
check('SH.600519', candidateSecids('SH.600519'), ['1.600519']);
check('sz000001', candidateSecids('sz000001'), ['0.000001']);
check('bj430047', candidateSecids('bj430047'), ['0.430047']);
check('00700 (HK)', candidateSecids('00700'), ['116.00700']);
check('700 (HK padded)', candidateSecids('700'), ['116.00700']);
check('hk00700', candidateSecids('hk00700'), ['116.00700']);
check('hk 700', candidateSecids('hk 700'), ['116.00700']);
check('AAPL (US)', candidateSecids('AAPL'), ['105.AAPL', '106.AAPL', '107.AAPL']);
check('usAAPL', candidateSecids('usAAPL'), ['105.AAPL', '106.AAPL', '107.AAPL']);
check('brk.b stays a US ticker', candidateSecids('BRK.B'), ['105.BRK.B', '106.BRK.B', '107.BRK.B']);
check('secid passthrough', candidateSecids('1.600519'), ['1.600519']);

console.log('--- suffix notation (同花顺 / 通达信 exports) ---');
check('600519.SH', candidateSecids('600519.SH'), ['1.600519']);
check('600519.SS (Yahoo SH)', candidateSecids('600519.SS'), ['1.600519']);
check('600519.sh lowercase', candidateSecids('600519.sh'), ['1.600519']);
check('000001.SZ', candidateSecids('000001.SZ'), ['0.000001']);
check('830799.BJ', candidateSecids('830799.BJ'), ['0.830799']);
check('00700.HK', candidateSecids('00700.HK'), ['116.00700']);
check('AAPL.US', candidateSecids('AAPL.US'), ['105.AAPL', '106.AAPL', '107.AAPL']);
check('AAPL.O (NASDAQ)', candidateSecids('AAPL.O'), ['105.AAPL', '106.AAPL', '107.AAPL']);
check('000300.SH keeps the index on market 1', candidateSecids('000300.SH'), ['1.000300']);
check('explicit market has no fallback', candidateSecids('600519.SZ'), ['0.600519']);
check('BK1036 board', candidateSecids('BK1036'), ['90.BK1036']);
check('bk1036 lowercase board', candidateSecids('bk1036'), ['90.BK1036']);
check('90.BK1036 secid passthrough', candidateSecids('90.BK1036'), ['90.BK1036']);

check('unknown suffix is not a market', candidateSecids('600519.XQ'), []);
check('garbage', candidateSecids('??'), []);
check('empty', candidateSecids('   '), []);
check('non-string', candidateSecids(42), []);

console.log('--- helpers ---');
check('toNumber(1.5)', toNumber(1.5), 1.5);
check('toNumber("-")', toNumber('-'), undefined);
check('toNumber("")', toNumber(''), undefined);
check('toNumber("3.2")', toNumber('3.2'), 3.2);
check('marketName(1)', marketName(1, '600519'), 'SH');
check('marketName(0 sz)', marketName(0, '000001'), 'SZ');
check('marketName(0 bj)', marketName(0, '830799'), 'BJ');
check('marketName(116)', marketName(116, '00700'), 'HK');
check('marketName(105)', marketName(105, 'AAPL'), 'NASDAQ');
check('formatAmount(2.26e9)', formatAmount(2.26e9), '22.60亿');
check('formatAmount(70944)', formatAmount(70944), '7.09万');
check('formatAmount(12.5)', formatAmount(12.5), '12.50');
check('formatAmount(undefined)', formatAmount(undefined), '—');
check('toQuote drops absent fields', toQuote({ f12: 'AAPL', f13: 105, f14: '苹果', f2: '-', f3: -1.84 }), {
  symbol: '105.AAPL', code: 'AAPL', name: '苹果', market: 'NASDAQ', changePct: -1.84,
});

console.log('--- cancellation (no network needed) ---');
const controller = new AbortController();
controller.abort();
let aborted = false;
try {
  await fetchQuotes(['600519'], { signal: controller.signal });
} catch (error) {
  aborted = error?.name === 'AbortError' || /abort/i.test(String(error?.message));
}
check('pre-aborted signal rejects', aborted, true);

console.log('--- empty input short-circuits without a request ---');
const empty = await fetchQuotes([], { fetchImpl: async () => { throw new Error('should not fetch'); } });
check('empty input yields no quotes', empty.quotes, []);
check('empty input yields no unresolved', empty.unresolved, []);

console.log('--- live endpoint (skipped when offline) ---');
try {
  const live = await fetchQuotes(['sh000001', 'sh600519', 'sz000001', 'hk00700', 'usAAPL', 'nope!!']);
  console.log('asOf', live.asOf);
  for (const quote of live.quotes) {
    console.log(`  ${quote.symbol.padEnd(10)} ${String(quote.name).padEnd(12)} ${quote.code.padEnd(8)} ${quote.market.padEnd(7)} price=${quote.price} chg=${quote.change} pct=${quote.changePct}% amount=${formatAmount(quote.amount)}`);
  }
  console.log('  unresolved =', JSON.stringify(live.unresolved));
  check('resolved 5 of 6', live.quotes.length, 5);
  check('unresolved is the bad one', live.unresolved, ['nope!!']);
  check('every quote has a price', live.quotes.every((quote) => typeof quote.price === 'number'), true);
  check('every quote has a name', live.quotes.every((quote) => typeof quote.name === 'string' && quote.name.length > 0), true);

  let calls = 0;
  const counting = async (url, init) => {
    calls++;
    return fetch(url, init);
  };
  const many = await fetchQuotes(['600519', '000001', '300750', '00700', 'AAPL', 'MSFT'], { fetchImpl: counting });
  check('one request serves six symbols', calls, 1);
  check('six quotes', many.quotes.length, 6);
} catch (error) {
  skipped += 1;
  console.log(`SKIP live endpoint: ${error?.message ?? error}`);
}

console.log(`\nSYMBOL_HELP: ${SYMBOL_HELP}`);
console.log(failures === 0
  ? `\nALL CHECKS PASSED${skipped > 0 ? ` (${skipped} live section skipped)` : ''}`
  : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
