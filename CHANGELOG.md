# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The 1.x headings group the fast pre-2.0 development series (roughly one release
per merged theme) rather than every intermediate patch; the dates are the days
those series closed. The current release is **2.0.0**, cut on 2026-10-22.

## [Unreleased]

## [2.0.0] - 2026-10-22

The release that turns the 1.x panel into a configurable, multi-watchlist tool
and makes the plugin publishable. No runtime dependencies were added.

### Added

- Localized `stock_quote` output: the tool's rendered text follows the Harness
  locale (Chinese/English) instead of always being Chinese.
- A version-pinned search index: the panel requests the `data/securities.json`
  that belongs to the installed plugin version, so a CDN-cached index can never
  disagree with the shipped parser.
- Settings for the refresh interval, the red/green convention (red-up vs.
  green-up), and column visibility.
- Column sorting in the panel, independent of the stored watchlist order.
- Multiple watchlists, with a switcher in the panel.
- JSON import/export of watchlists and settings.
- Price-move alerts on watched symbols.
- Keyboard access for the panel (rows, menus, dialogs) and an error boundary
  around the browser half so one failed render cannot blank the sidebar.
- `engines` and `peerDependencies` for DeepSeek Harness compatibility, plus
  npm-publishable package metadata (`files`, `exports`, repository/bugs/homepage).
- GitHub Actions CI: Node 20/22/24, `node --check` on every JavaScript file,
  `npm test`, and a parse check for every JSON file.

### Changed

- The session model is derived from the data instead of a fixed wall-clock
  offset, which also fixes the US session being one hour off during winter time.
- Quote and trend requests share a concurrency cap and a failure backoff, so a
  slow endpoint degrades gracefully across many watched symbols.
- Refresh failures are non-destructive: a failed request keeps the last good
  values (and reports the problem) instead of clearing the panel or watchlist.

### Fixed

- US session times no longer shift by an hour under winter time/DST.
- Transient quote or trend errors no longer wipe the rendered table or lose a
  watchlist edit.

## [1.9.0] - 2026-10-21

Closes the 1.6–1.9 chart series.

### Added

- A per-row intraday sparkline, toggled by a toolbar button and remembered in
  preferences.
- Click-a-row focus chart: Y-axis ticks and grid, a dashed previous-close
  baseline, an average-price line, a 1D/5D switch, and a crosshair readout
  (`time · price · ±% vs previous close · average · volume`).
- Hovering a sparkline scrubs that row's numbers — price, change and change %
  temporarily follow the minute under the pointer, and the code line shows the
  timestamp.

### Changed

- Sparklines are drawn against the **whole trading session** instead of
  stretching the available data across the box, so a half-finished trading day
  stops half way and the blank right side is the part that has not traded yet.

## [1.5.0] - 2026-10-20

Closes the 1.0–1.5 foundation series.

### Added

- A neutral, configurable sidebar data panel: plain table glyph, display name
  defaulting to 「数据」/ "Data", editable in plugin settings, with the panel
  state persisted in `localStorage`.
- A watchlist with a selection-aware right-click menu, drag-handle reordering
  and multi-select batch actions (delete / move to top / move to bottom).
- The `stock_quote` tool, batching one or several symbols (or the configured
  default watchlist) into a single request, with two-decimal, signed and
  em-dash-aware rendered text.
- Bilingual documentation: Chinese `README.md` plus English `README.en.md`.
- Symbol resolution covering prefixes, suffixes (including `600519.SH`
  notation) and a cross-market fallback for ambiguous bare six-digit codes.
- Eastmoney industry/concept boards (`BK1036`) by code and by board name.
- Add-by-name search backed by a generated `data/securities.json` index
  (~11k A-share, index, Hong Kong and board entries) fetched once from a CDN
  and cached for a day.

### Changed

- Every displayed quote number is formatted to two decimals in both the panel
  and the tool output.
- The sidebar entry and panel headings use the neutral, configurable display
  name rather than a market-data-looking label.

[Unreleased]: https://github.com/AhaCrazy/dsh-stock-quotes/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/AhaCrazy/dsh-stock-quotes/releases/tag/v2.0.0
[1.9.0]: https://github.com/AhaCrazy/dsh-stock-quotes/releases/tag/v1.9.0
[1.5.0]: https://github.com/AhaCrazy/dsh-stock-quotes/releases/tag/v1.5.0
