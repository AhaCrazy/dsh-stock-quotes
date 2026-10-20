# dsh-stock-quotes

[中文](README.md) | **English**

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that shows **live quotes for a watchlist of stocks** in a sidebar data panel, and registers a `stock_quote` tool so the agent can answer "what is 贵州茅台 at right now" inside the conversation.

- **Panel**: A-shares, Hong Kong and US symbols in one list — price, change, change %, open / high / low, turnover; 15 s auto-refresh; right-click menu, drag to reorder, multi-select batch actions.
- **Tool**: `stock_quote` reads one or several symbols (or the configured watchlist) in a single batched request.
- **Neutral by default**: the sidebar entry is called `数据` ("Data") with a plain table glyph, and the display name is configurable. It reads as a generic data view rather than a stock ticker.

> Quotes are delayed/snapshot data from a public endpoint. For information only — **not investment advice**, not for trading decisions.

## Requirements

- DeepSeek Harness (0.2.x, with the `plugin_manager` tool)
- No API key, no extra dependencies. The Host half imports nothing outside its own package.

## Install

```bash
git clone https://github.com/AhaCrazy/dsh-stock-quotes.git
```

Then, from a DSH session, install the bundle by its absolute directory:

```
plugin_manager  action: install_bundle  target: <path-to>/dsh-stock-quotes
```

The sidebar icon appears once the client module loads — reload the page if it does not show up immediately. `stock_quote` shows up in the agent's tool list on the next request.

To remove it:

```
plugin_manager  action: remove_bundle  target: dsh-stock-quotes
```

## Panel actions

| Action | How |
|---|---|
| Add | Type a symbol or board name in the top input, press Enter |
| **Delete** | **Right-click a row** → menu → Delete (there is no per-row ✕ button) |
| **Reorder** | Drag the ⠿ handle; a brand-colored line shows the drop position — or use the right-click menu's move items |
| **Multi-select** | Checkbox on each row; the header checkbox selects / clears everything |
| **Batch** | With ≥1 selected, a bar appears: delete selected / move to top / move to bottom / clear |
| Other menu items | Copy symbols (newline-joined), select all, clear selection |
| **Charts** | The "Charts" button in the toolbar toggles a per-row intraday line |

The context menu is **selection-aware**: if the right-clicked row is part of a multi-selection, delete/move/copy act on the whole selection and the labels carry the count; otherwise they act on that one row.

Order and membership persist in the browser (`localStorage`, key `dsh-stock-quotes/watchlist`). Rows always render in watchlist order and quotes are mapped by symbol, so reordering can never desynchronize a code from its price.

## Charts

The **Charts** button in the toolbar toggles a per-row **intraday line** (today's session). The choice is stored in `localStorage` (`chart` in `dsh-stock-quotes/prefs`) and is **on by default**.

- Data comes from Eastmoney's intraday endpoint; A-shares, Hong Kong, US and boards all work (US shows the latest session)
- Refreshed every 60 seconds, deliberately not tied to the 15-second quote tick, so it cannot become a request storm
- Colour follows the day's move — red up, green down, neutral when flat — matching the number columns
- With charts off, **no trend request is made**; only the numbers remain
- A row whose series has not arrived yet keeps an empty cell, so columns never shift

## Display name

The sidebar label, the panel heading and the notification text all use one configurable name, defaulting to `数据`. Change it in **Settings → Plugins → "数据面板" → Panel settings**. Leave the field empty to get the default back. Values are whitespace-collapsed and capped at 24 characters; they live in `localStorage` under `dsh-stock-quotes/prefs`.

## Symbol spellings

| Market | Spellings | Examples |
|---|---|---|
| Shanghai | 6 digits, `sh` prefix, `.SH`/`.SS` suffix | `600519`, `sh600519`, `600519.SH`, `688981`, `900901` |
| Shenzhen | 6 digits, `sz` prefix, `.SZ` suffix | `000001`, `sz000001`, `000001.SZ`, `300750` |
| Beijing | 6 digits, `bj` prefix, `.BJ` suffix | `430047`, `830799`, `920001` |
| Hong Kong | 1–5 digits, `hk` prefix, `.HK` suffix | `00700`, `700`, `hk00700`, `00700.HK` |
| US | letters, `us` prefix, `.US`/`.O`/`.N` suffix | `AAPL`, `usAAPL`, `AAPL.US`, `BRK.B` (matched across NASDAQ / NYSE / AMEX) |
| Raw secid | `market.code` | `1.600519`, `116.00700` |

**Ambiguous bare six-digit codes**: both markets are tried and the first that answers wins. So `000300` (沪深300, Shanghai only) falls through to `1.000300`, while `000001` exists on both and defaults to Shenzhen (平安银行) — write `sh000001` or `000001.SH` for the Shanghai index. An explicit prefix or suffix is authoritative and never falls back, so a wrong market reports "not found" rather than silently picking another listing.

## Boards (板块)

Eastmoney's industry and concept boards come through the same quote endpoint, and the panel can add them directly:

| Spelling | Examples |
|---|---|
| Eastmoney board code | `BK1036` (半导体), `BK0891` (国产芯片) |
| **Board name** (panel only) | type `半导体`, `白酒`, `存储芯片` — exact name match first, then a unique substring match |
| Raw secid | `90.BK1036` |

Three things to know:

1. **同花顺's board codes (`88xxxx`, e.g. `881121`) are a proprietary encoding with no public mapping**, so they cannot be added as-is — use the name or the Eastmoney code instead: `881121` is 半导体, so type `半导体` or `BK1036`.
2. The two sources have **different constituents and weights**, so the index level and change will differ (measured at the same moment: Eastmoney 半导体 `+3.47%`, 同花顺 `+3.25%`). Matching 同花顺 exactly is not possible.
3. Name lookup happens in the panel only; `stock_quote` takes the code, e.g. `BK1036`.

## Search (add by name)

You do not need to know the code — typing in the input pops suggestions (name + canonical code) and one click adds the entry:

| Typed | Suggestions |
|---|---|
| `茅台` | 贵州茅台 `sh600519` |
| `半导体` | 半导体 `BK1036` (plus 半导体材料 `BK1325` and others) |
| `BK13` | 半导体材料 `BK1325` |
| `600519` | added directly (an exact code wins, no picking needed) |

Ranking: exact name → name prefix → name substring → code prefix.

The suggestions come from `data/securities.json` in this repository (~11k rows: A-shares, indices, Hong Kong, industry and concept boards). The panel fetches it once from jsDelivr / raw.githubusercontent and caches it for a day. The file is generated:

```bash
node scripts/build-index.mjs   # needs access to push2.eastmoney.com
```

Re-run and commit after new listings appear. When the index cannot be fetched (offline, blocked), adding by code and by board name still works.

## Coverage

The data comes from Eastmoney's public quote endpoint, so what you can add is what it covers:

- ✅ A-shares, Beijing, Hong Kong, US, indices, ETFs / LOFs, convertible bonds, B-shares, boards (`BKxxxx`)
- ❌ Delisted or retired codes (e.g. `110043`), off-exchange fund NAVs, futures, options, FX
- ❌ Chinese stock-name search: not supported (the public search endpoints send no CORS header, so the browser cannot read them) — use a code; board names are the exception, see above

If a code you can see in 同花顺 does not resolve, try it with its full suffix (`600519.SH`); if that still fails, the data source does not carry it.

## Configuration

`cordis.patch.yml` ships a watchlist that `stock_quote` falls back to when the model calls it without arguments:

```yaml
- insert:
    - id: stock-quotes
      name: 'dsh-stock-quotes'
      config:
        defaultSymbols:
          - sh000001
          - sh600519
          - sz300750
          - hk00700
          - usAAPL
```

The panel keeps its own watchlist in the browser, independently of this list: the config is for the agent, the panel is for looking.

## How it works

| File | Role |
|---|---|
| `package.json` | Bundle manifest: `dsh.bundle.patch` inserts the Host row, `dsh.client` makes the Web app load the browser half |
| `cordis.patch.yml` | Loader patch: inserts the `stock-quotes` row with the default watchlist |
| `index.js` | Host half: registers `stock_quote` as a raw `ToolDefinition` (no imports outside the package) |
| `quotes.js` | Pure data layer: symbol resolution, batched fetch, formatting |
| `client.js` | Browser half: `main` panel, `plugins.bundle.config` settings card, `sidebar.panellist` icon |
| `locale/{zh,en}.json` | Plugin-manager card title and description |

Two design notes worth knowing if you modify it:

- **No bare `@deepseek-ai/...` imports in the Host half.** A bundle linked into a profile from outside it does not resolve those specifiers, so the row would fail to import. It registers a raw `ToolDefinition` instead.
- **The client half does not import any Harness client package.** It writes its own controls with theme tokens (`--dsw-alias-*`) only, which keeps it stable across Harness versions.

## Tests

```bash
npm test
```

- `tests/quotes.test.mjs` — symbol resolution, batching, formatting and cancellation. The deterministic part needs no network, and the live section is skipped when the endpoint is unreachable.
- `tests/render.test.mjs` — the tool definition and the text it renders: two decimals, signed changes, an em dash for missing fields, and no throw on degenerate input.
- `tests/client.test.mjs` — emulates the module loader, the locale service, the slot registry and React, then asserts what the plugin registers, what its components render, and the reorder/move list transforms.

The Host half's full contract check needs packages from a DeepSeek Harness installation, so it is kept out of this repo.

## License

MIT — see [LICENSE](LICENSE).
