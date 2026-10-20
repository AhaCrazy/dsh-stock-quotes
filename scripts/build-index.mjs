// Build data/securities.json — the searchable index the panel ships with.
//
// The browser half cannot call a name-search API (the public ones send no CORS
// header), so the index is generated here, committed, and fetched from a CDN.
// Re-run this when you want to pick up new listings:
//
//   node scripts/build-index.mjs
//
// Every entry is [name, spelling] where the spelling is exactly what the panel
// accepts on input (sh600519 / sz300750 / hk00700 / usAAPL / BK1036).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'data', 'securities.json');

const CLIST = 'https://push2.eastmoney.com/api/qt/clist/get';
const FIELDS = 'f12,f13,f14';

/** Unix families to include, with a hard page cap so a surprise count cannot run away. */
const FAMILIES = [
  { key: 'a-share', fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048', maxPages: 70 },
  { key: 'index', fs: 'm:1+t:1,m:0+t:5', maxPages: 40 },
  { key: 'hk', fs: 'm:116+t:3', maxPages: 40 },
  { key: 'hk-index', fs: 'm:116+t:1', maxPages: 10 },
  { key: 'industry-board', fs: 'm:90+t:2+f:!50', maxPages: 10 },
  { key: 'concept-board', fs: 'm:90+t:3+f:!50', maxPages: 10 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage({ fs, page }, attempt = 1) {
  const url = `${CLIST}?pn=${page}&pz=100&po=1&np=1&fltt=2&invt=2&fid=f12&fs=${fs}&fields=${FIELDS}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return { rows: payload?.data?.diff ?? [], total: payload?.data?.total ?? 0 };
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(500 * attempt);
    return fetchPage({ fs, page }, attempt + 1);
  }
}

/** Turn a secid (`1.600519`) into the spelling the panel accepts. */
function spellingOf(market, code) {
  const text = String(code).trim();
  if (text === '') return '';
  switch (market) {
    case 1: return `sh${text}`;
    case 0: return /^(4|8|92)/.test(text) ? `sz${text}` : `sz${text}`;
    case 116: return `hk${text}`;
    case 105:
    case 106:
    case 107: return `us${text}`;
    case 90: return text.startsWith('BK') ? text : `BK${text}`;
    default: return `${market}.${text}`;
  }
}

const entries = new Map();
const counts = {};

for (const family of FAMILIES) {
  let page = 1;
  let total = 0;
  let taken = 0;
  while (page <= family.maxPages) {
    const { rows, total: reported } = await fetchPage({ fs: family.fs, page });
    total = reported || total;
    if (rows.length === 0) break;
    for (const row of rows) {
      const name = String(row.f14 ?? '').trim();
      const spelling = spellingOf(Number(row.f13), row.f12);
      if (name === '' || spelling === '') continue;
      if (!entries.has(spelling)) {
        entries.set(spelling, name);
        taken += 1;
      }
    }
    page += 1;
    process.stdout.write(`  ${family.key}: page ${page - 1} (${counts[family.key] ?? 0}/${total || '?'})\r`);
    await sleep(120);
  }
  counts[family.key] = total;
  process.stdout.write(`${family.key}: ${taken} new entries (total reported ${total})\n`);
}

const list = [...entries.entries()].map(([spelling, name]) => [name, spelling]);
list.sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'));

const payload = {
  generated: new Date().toISOString(),
  count: list.length,
  entries: list,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(payload)}\n`, 'utf8');

const bytes = Buffer.byteLength(JSON.stringify(payload));
console.log(`\nwrote ${OUT}`);
console.log(`entries: ${list.length}  bytes: ${bytes}  (~${(bytes / 1024).toFixed(0)} KB)`);
