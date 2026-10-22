# Security Policy

`dsh-stock-quotes` is a DeepSeek Harness plugin. It runs as a Host-half module
inside the Harness process and as a browser-half module inside the Harness Web
UI, so security reports are taken seriously — including reports about the
rendering of third-party quote data, the search index, and the import/export
paths.

## Supported versions

| Version | Supported |
| --- | --- |
| 2.x (latest release) | ✅ |
| < 2.0 | ❌ |

Only the latest 2.x release receives security fixes. The 1.x series is
unsupported; upgrade to 2.x first and check whether the report still reproduces.

## Reporting a vulnerability

**Please do not open a public issue, and do not post proofs of concept in the
issue tracker or discussions.**

Report privately through GitHub Security Advisories:

1. Go to <https://github.com/AhaCrazy/dsh-stock-quotes/security/advisories>.
2. Click **Report a vulnerability** (this opens a private advisory draft).
3. Include as much of the following as you can:
   - affected plugin version (`package.json` → `version`) and DeepSeek Harness
     version;
   - operating system and browser (for the panel half);
   - a minimal reproduction: symbols, clicks, crafted quote payload, or a
     `data/securities.json` / watchlist export that triggers the issue;
   - impact and attack scenario — who can trigger it and what they gain;
   - any suggested fix or mitigation.

If you cannot use Security Advisories, open a minimal public issue that says
only "I have a security report, please enable a private channel" — without
technical details or exploit steps — and a maintainer will follow up.

We aim to acknowledge a private report within **7 days**, agree on a
disclosure timeline with you, and credit you in the advisory unless you ask
otherwise. Please give us a reasonable window to ship a fix before publishing
details. This is a volunteer-maintained project, so timelines are best effort.

## Scope

In scope (examples):

- arbitrary code execution or injection through quote data, names, board names
  or the search index — e.g. a name rendered as HTML instead of text;
- cross-site scripting or DOM sanitization bypasses in the browser half;
- prototype pollution or logic bugs in JSON watchlist/settings import;
- leaking data the plugin has access to (watchlists, settings, quote requests)
  to an unintended third party;
- supply-chain problems in the published package.

Out of scope:

- accuracy, availability or latency of quote data, and the terms of service of
  the upstream public quote endpoints;
- social engineering, physical access, or issues that require a compromised
  browser/extension;
- reports that only describe a missing hardening header or a best-practice
  preference with no demonstrated impact.

## Data and privacy notes

- The plugin needs **no API key, account or credential**, and it does not ask
  for one. Never paste tokens, passwords or personal data into an issue or a
  security report.
- Watchlists, settings and alerts are stored in the browser's `localStorage`
  (`dsh-stock-quotes/watchlist`, `dsh-stock-quotes/prefs`, …). They are not
  uploaded by the plugin.
- The panel and the `stock_quote` tool make network requests directly to public
  quote and search-index endpoints (e.g. Eastmoney, jsDelivr,
  raw.githubusercontent) from the machine running Harness. Which requests your
  deployment allows is up to your environment's network policy.
- Import/export and the search index are user-supplied files or data fetched
  over the network. Only import watchlist exports you trust.

## Quote data is not financial advice

Quotes come from **unofficial, public, delayed/snapshot endpoints**. They may be
inaccurate, incomplete, delayed or unavailable, and the upstream endpoints can
change or block access at any time. The plugin and its maintainers give no
warranty of accuracy or fitness for any purpose.

**This plugin is for information and display only. Do not use its output for
trading or investment decisions.** It is not investment advice, and it is not a
market-data feed.
