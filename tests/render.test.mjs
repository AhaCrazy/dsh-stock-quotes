// Checks for the Host half's model-facing surface: the tool definition and the
// text it renders. index.js imports nothing outside its own package, so this
// runs with plain node and no DeepSeek Harness installation.
import { buildToolDefinition, renderQuotes } from '../index.js';

let failures = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n     expected ${e}\n     actual   ${a}`}`);
};

const tool = buildToolDefinition();

console.log('--- tool definition ---');
check('name', tool.name, 'stock_quote');
check('symbols is optional', tool.parameters.required, undefined);
check('symbols is an array of strings', tool.parameters.properties.symbols.items.type, 'string');
check('output schema is an object', tool.output.schema.type, 'object');
check('quote items require the identity fields', tool.output.schema.properties.quotes.items.required, ['symbol', 'code', 'name', 'market']);
check('concurrency safe', tool.isConcurrencySafe({}), true);
check('call title with symbols', tool.presentCall({ symbols: ['sh600519'] }).title, '\u67e5\u8be2\u884c\u60c5 sh600519');
check('call title without symbols', tool.presentCall({}).title, '\u67e5\u8be2\u81ea\u9009\u80a1\u884c\u60c5');
check('call title tolerates junk', tool.presentCall({ symbols: 5 }).title, '\u67e5\u8be2\u81ea\u9009\u80a1\u884c\u60c5');
check('render returns one text block', tool.output.render({}, { quotes: [], unresolved: [] })[0].type, 'text');

const VALUE = {
  asOf: '2026-01-01T00:00:00.000Z',
  source: '\u4e1c\u65b9\u8d22\u5bcc (Eastmoney)',
  quotes: [
    { symbol: 'sh600519', code: '600519', name: 'MAOTAI', market: 'SH', price: 1319.9, change: 6.93, changePct: 0.53, open: 1311.57, high: 1321.97, low: 1301.68, preClose: 1312.97, amount: 2020261861 },
    { symbol: 'usAAPL', code: 'AAPL', name: 'APPLE', market: 'NASDAQ', price: 342, change: -0.96, changePct: -0.28, open: 346.085, high: 347.82, low: 340.46, amount: 13667892736 },
  ],
  unresolved: ['NOPE'],
};

const rendered = renderQuotes(VALUE);
console.log('\n' + rendered + '\n');

console.log('--- rendered text ---');
check('header names the source', rendered.split('\n')[0].includes('Eastmoney'), true);
check('price uses two decimals', rendered.includes('1319.90'), true);
check('round numbers still show two decimals', rendered.includes('342.00'), true);
check('change is signed', rendered.includes('+6.93'), true);
check('negative change keeps its sign', rendered.includes('-0.96'), true);
check('percentage is signed and closed', rendered.includes('(+0.53%)'), true);
check('negative percentage', rendered.includes('(-0.28%)'), true);
check('details are formatted', rendered.includes('\u5f001311.57'), true);
check('three-decimal input is rendered with two', /\u5f00346\.0\d/.test(rendered) && !rendered.includes('346.085'), true);
check('turnover is humanised', rendered.includes('\u4ebf'), true);
check('unresolved line lists the miss', rendered.includes('NOPE'), true);
check('no undefined or NaN leaks', /undefined|NaN/.test(rendered), false);

console.log('--- missing fields ---');
const blank = renderQuotes({
  asOf: '2026-01-01T00:00:00.000Z',
  quotes: [{ symbol: 'usY', code: 'Y', name: 'Y', market: 'NYSE' }],
  unresolved: [],
});
check('absent price renders a dash', blank.includes('Y (usY \u00b7 NYSE) \u2014'), true);
check('absent price keeps no change block', blank.includes('\u25b2') || blank.includes('\u25bc'), false);

console.log('--- degenerate input ---');
check('empty value still renders a header', renderQuotes({}).split('\n')[0].includes('Eastmoney'), true);
check('null value does not throw', typeof renderQuotes(null), 'string');
check('empty quotes say so', renderQuotes({ quotes: [] }).includes('\u6ca1\u6709\u53d6\u5230'), true);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
