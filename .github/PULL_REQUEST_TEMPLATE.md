# Summary

<!-- What changed, and why. Link the issue it fixes: "Closes #123". -->

-

# Related issue

<!-- Remove if there is none. -->

# Checklist

- [ ] `npm test` passes locally (it runs `tests/quotes.test.mjs`, `tests/render.test.mjs` and `tests/client.test.mjs`).
- [ ] No runtime dependencies were added: `dependencies` stays empty, `quotes.js`/`index.js` import only Node built-ins and files inside this package.
- [ ] The two hard constraints still hold: `client.js` stays one self-contained file loaded via `window.__ModuleLoader__.load` (no local imports), and the Host half has no bare `@deepseek-ai/...` imports.
- [ ] Docs are updated when behavior or configuration changed (`README.md`, `README.en.md`, and `CHANGELOG.md`).
- [ ] Screenshots or a short screen recording are attached for UI changes (panel, sparkline, focus chart, settings).
- [ ] No secrets, API keys or personal data are included in code, logs or screenshots.
