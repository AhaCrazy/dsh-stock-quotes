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
| Add | Type a symbol in the top input, press Enter |
| **Delete** | **Right-click a row** → menu → Delete (there is no per-row ✕ button) |
| **Reorder** | Drag the ⠿ handle; a brand-colored line shows the drop position — or use the right-click menu's move items |
| **Multi-select** | Checkbox on each row; the header checkbox selects / clears everything |
| **Batch** | With ≥1 selected, a bar appears: delete selected / move to top / move to bottom / clear |
| Other menu items | Copy symbols (newline-joined), select all, clear selection |

The context menu is **selection-aware**: if the right-clicked row is part of a multi-selection, delete/move/copy act on the whole selection and the labels carry the count; otherwise they act on that one row.

Order and membership persist in the browser (`localStorage`, key `dsh-stock-quotes/watchlist`). Rows always render in watchlist order and quotes are mapped by symbol, so reordering can never desynchronize a code from its price.

## Display name

The sidebar label, the panel heading and the notification text all use one configurable name, defaulting to `数据`. Change it in **Settings → Plugins → "数据面板" → Panel settings**. Leave the field empty to get the default back. Values are whitespace-collapsed and capped at 24 characters; they live in `localStorage` under `dsh-stock-quotes/prefs`.

## Symbol spellings

| Market | Spellings | Examples |
|---|---|---|
| Shanghai | 6 digits, or `sh` prefix | `600519`, `sh600519`, `688981`, `900901` |
| Shenzhen | 6 digits, or `sz` prefix | `000001`, `sz000001`, `300750` |
| Beijing | 6 digits, or `bj` prefix | `430047`, `830799`, `920001` |
| Hong Kong | 1–5 digits, or `hk` prefix | `00700`, `700`, `hk00700` |
| US | letters, or `us` prefix | `AAPL`, `usAAPL`, `BRK.B` (matched across NASDAQ / NYSE / AMEX) |
| Raw secid | `market.code` | `1.600519`, `116.00700` |

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
- `tests/client.test.mjs` — emulates the module loader, the locale service, the slot registry and React, then asserts what the plugin registers, what its components render, and the reorder/move list transforms.

The Host half's full contract check needs packages from a DeepSeek Harness installation, so it is kept out of this repo.

## License

MIT — see [LICENSE](LICENSE).
