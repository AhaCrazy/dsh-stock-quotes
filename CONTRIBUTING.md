# Contributing to dsh-stock-quotes

[中文](#中文) · [README](README.md) · [English README](README.en.md)

Thanks for wanting to improve `dsh-stock-quotes` — a DeepSeek Harness plugin
that shows A-share, Hong Kong and US quotes in a sidebar panel and gives the
agent a `stock_quote` tool. Issues and pull requests are welcome.

- Found a security problem? **Don't open a public issue** — report it privately
  as described in [SECURITY.md](SECURITY.md).
- Found a bug or want a feature? Use the issue forms under
  [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE).

## Requirements

- Node.js **20 or newer**. CI runs the suite on Node 20.x, 22.x and 24.x.
- Git.
- A DeepSeek Harness build only if you want to try the plugin in the GUI; the
  tests do not need one.

There is **nothing to install**. The plugin has zero runtime dependencies and
the test suite uses only Node built-ins, so `npm install` is not required (and
CI never runs it).

## Run the tests

```bash
npm test
```

`npm test` chains the plain Node test scripts listed in `package.json`
(`tests/quotes.test.mjs`, `tests/render.test.mjs`, `tests/client.test.mjs`, and
any later additions). There is no test framework and no magic runner: each file
is a `node` script that prints `ok` / `FAIL` lines and exits non-zero on
failure.

- `tests/quotes.test.mjs` — symbol resolution, batching, formatting and
  cancellation. The deterministic part never touches the network; the live
  section is skipped (not failed) when the endpoint is unreachable.
- `tests/render.test.mjs` — the tool definition and the text it renders: two
  decimals, signed changes, an em dash for missing fields, no throw on
  degenerate input.
- `tests/client.test.mjs` — emulates the module loader, locale service, slot
  registry and React, then asserts what the plugin registers, what the
  components render, and the pure list/search/reorder functions. It also
  compares the browser-side and Host-side symbol parsers so the two can never
  drift apart.

Add or extend an assertion in the matching file for every behavior change. A
bug fix without a regression test is likely to be asked for one. CI additionally
runs `node --check` on every `*.js` / `*.mjs` file outside `node_modules` and
parses every JSON file in the repository.

## Project layout

| Path | Role |
|---|---|
| `package.json` | Bundle manifest (`dsh.bundle.patch`, `dsh.client`), package exports, `npm test` |
| `cordis.patch.yml` | Loader patch: inserts the Host row and its default watchlist |
| `index.js` | Host half: registers `stock_quote` as a raw `ToolDefinition` |
| `quotes.js` | Pure data layer shared by the Host half: symbol resolution, batched fetch, formatting |
| `client.js` | Browser half: the panel, its settings card, the sidebar icon, charts and alerts |
| `locale/{zh,en}.json` | Plugin-manager card title and description |
| `data/securities.json` | Generated search index (~11k entries) used by add-by-name |
| `scripts/build-index.mjs` | Regenerates `data/securities.json` from Eastmoney (needs network) |
| `tests/*.test.mjs` | The test scripts chained by `npm test` |
| `.github/` | CI workflow, issue forms, PR template |
| `README.md` / `README.en.md` | Bilingual user documentation (Chinese primary) |

## The two constraints that matter

Both exist because of how a DSH plugin bundle is loaded. Breaking either one
produces a plugin that fails to activate rather than a visible error, so please
keep them in mind before refactoring.

### 1. The browser half must stay one self-contained file

`client.js` is **not** bundled. The Harness Web app loads it as a plain script
whose body calls:

```js
window.__ModuleLoader__.load({
  id: 'dsh-stock-quotes',
  factory(require) {
    const React = require('react'); // provided by the loader
    // ...
  },
});
```

Rules that follow from that:

- No `import` statements and no `require('./something.js')` of local files —
  there is no bundler to resolve them. Everything the browser half needs lives
  in `client.js` (or another file only if the loader is taught to load it,
  which it currently is not).
- The only `require` allowed is the loader-provided one (`react`). The client
  half deliberately imports **no** `@deepseek-ai/dsh-client-*` packages; it
  draws its own controls with theme tokens (`--dsw-alias-*`) so it survives
  Harness version changes.
- Don't rely on a build step, TypeScript, JSX, or package-local helpers.

### 2. The Host half must not use bare `@deepseek-ai/...` imports

A workspace-authored bundle is linked into a profile from *outside* that
profile, so bare Harness package specifiers do not resolve and the row fails
with `failed to import`. The Host half therefore:

- imports only Node built-ins and files **inside this package**
  (`index.js` imports `./quotes.js`);
- registers `stock_quote` as a raw `ToolDefinition` (a `parameters` JSON Schema
  plus `output.schema` / `output.render`) instead of using a schema helper from
  the Harness packages.

If you need more of the Harness API in the Host half, propose it in an issue
first — the workaround is part of the compatibility story, not an oversight.

## Coding style

- 2-space indentation, **single quotes**, **semicolons**, trailing newline, LF
  line endings, UTF-8. `.editorconfig` encodes this.
- ES modules throughout (`"type": "module"`); no build step, no transpiler.
- **No runtime dependencies.** `dependencies` stays empty; don't add a package
  for something a few lines of standard JavaScript can do.
- Comments in English; user-facing strings are localized (Chinese/English), so
  keep UI text out of hard-coded prose where a locale string exists.
- Prefer small pure functions (formatting, sorting, scoring, symbol parsing)
  that can be asserted directly in `tests/*.test.mjs`.
- Keep the symbol rules in `quotes.js` and the copy inside `client.js` in
  agreement; `tests/client.test.mjs` fails when the two drift.
- The generated index `data/securities.json` is not edited by hand. Regenerate
  it and commit the result when listings change:

  ```bash
  node scripts/build-index.mjs   # needs access to push2.eastmoney.com
  ```

## Optional formatting and linting (non-gating)

Prettier and ESLint configuration files are checked in for editors and for
people who like them, but **CI does not run them and they are not
devDependencies**. To use them locally:

```bash
npm i -D eslint @eslint/js   # ESLint flat config; see the header in eslint.config.js
npx eslint .
npx prettier --check .
```

`eslint.config.js` enables only `@eslint/js` recommended rules (plus Node
globals, browser globals for `client.js`) and ignores the generated `data/`.
`.prettierrc.json` uses single quotes, 120-column width and semicolons. Neither
tool is required for a pull request.

## Submitting a pull request

1. Fork the repository and branch from `main`.
2. Make the change, add or update tests, run `npm test`.
3. Update the user docs when behavior or configuration changed — `README.md`
   (Chinese, primary) **and** `README.en.md` — and add an entry under
   `## [Unreleased]` in `CHANGELOG.md`.
4. Fill in `PULL_REQUEST_TEMPLATE.md`. Attach screenshots or a short recording
   for UI changes.
5. CI must be green. A maintainer will review; small, focused PRs are much
   easier to review than mixed refactor + feature ones.

Versioning follows [Semantic Versioning](https://semver.org/): bug fixes bump
patch, features bump minor, breaking changes bump major.

---

## 中文

感谢参与 `dsh-stock-quotes` —— 一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
插件：在侧边栏数据面板里显示 A 股 / 港股 / 美股行情，并向 Agent 提供
`stock_quote` 工具。

- 发现安全问题：**不要开公开 issue**，请按 [SECURITY.md](SECURITY.md) 私下报告。
- 发现 Bug 或想提建议：使用 [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE) 里的模板。

### 环境要求

- Node.js **20 及以上**（CI 覆盖 20.x / 22.x / 24.x）。
- Git。
- 只有想在 GUI 里实际运行插件时才需要 DeepSeek Harness；跑测试不需要。

插件**运行时零依赖**，测试只用 Node 内置模块，因此不需要 `npm install`，
CI 也不会执行安装。

### 运行测试

```bash
npm test
```

`npm test` 按 `package.json` 里的顺序依次执行纯 Node 测试脚本
（`tests/quotes.test.mjs`、`tests/render.test.mjs`、`tests/client.test.mjs`）。
没有测试框架：每个文件都是普通 `node` 脚本，打印 `ok` / `FAIL`，失败时以
非零码退出。

修改行为时请在对应的测试文件里补断言；修 Bug 时最好带回归测试。CI 还会对
`node_modules` 之外的所有 `*.js` / `*.mjs` 跑 `node --check`，并解析仓库里
每个 JSON 文件。

### 目录结构

| 路径 | 作用 |
|---|---|
| `package.json` | bundle 清单（`dsh.bundle.patch`、`dsh.client`）、包导出、`npm test` |
| `cordis.patch.yml` | Loader 补丁：插入 Host 行及默认自选股 |
| `index.js` | Host 半：以原生 `ToolDefinition` 注册 `stock_quote` |
| `quotes.js` | 纯数据层：代码解析、批量取数、格式化（Host 半使用） |
| `client.js` | 浏览器半：面板、设置卡、侧边栏图标、曲线与提醒 |
| `locale/{zh,en}.json` | 插件管理器卡片的标题与描述 |
| `data/securities.json` | 生成的搜索索引（约 1.1 万条），供按名称添加使用 |
| `scripts/build-index.mjs` | 从东财重新生成 `data/securities.json`（需要联网） |
| `tests/*.test.mjs` | `npm test` 串联的测试脚本 |
| `.github/` | CI、issue 模板、PR 模板 |
| `README.md` / `README.en.md` | 双语用户文档（中文为主） |

### 两条必须遵守的约束

这两条源于 DSH 插件 bundle 的加载方式。违反了通常不是报错，而是插件直接
激活失败，所以改动前请务必确认。

1. **浏览器半必须保持单文件自包含。** `client.js` 没有打包器，Harness Web
   端把它当普通脚本加载，由文件内的 `window.__ModuleLoader__.load({ id,
   factory(require) { ... } })` 注册。因此不能写 `import`，也不能
   `require('./xxx.js')` 本地文件；唯一允许的 `require` 是加载器提供的
   `react`。浏览器半不 import 任何 `@deepseek-ai/dsh-client-*` 包，控件全部
   自己写、只用主题 token（`--dsw-alias-*`），这样跨 Harness 版本更稳。
2. **Host 半不能写裸 `@deepseek-ai/...` import。** 工作区里的 bundle 是 link
   进 profile 的，这些裸模块名解析不到，整行会 `failed to import`。所以 Host
   半只 import Node 内置模块和本包内的文件（`index.js` 引用 `./quotes.js`），
   工具以原生 `ToolDefinition` 注册。若需要更多 Harness API，请先开 issue
   讨论。

### 代码风格

- 2 空格缩进、**单引号**、**分号**，文件末尾换行，LF 换行，UTF-8；
  `.editorconfig` 已配置。
- 全程 ES Modules（`"type": "module"`），没有构建步骤和转译。
- **不加运行时依赖。** `dependencies` 保持为空，几行标准 JavaScript 能做的
  事不要引入包。
- 注释用英文；面向用户的文案做中英本地化，不要把中文硬编码进逻辑里。
- 尽量写成可直接断言的小纯函数（格式化、排序、搜索打分、代码解析），并在
  `tests/*.test.mjs` 里覆盖。
- `quotes.js` 与 `client.js` 里的代码解析规则必须一致；
  `tests/client.test.mjs` 会在两份实现漂移时失败。
- 生成的 `data/securities.json` 不要手改。新股上市后重跑并提交：

  ```bash
  node scripts/build-index.mjs   # 需要能访问 push2.eastmoney.com
  ```

### 可选的格式化 / Lint（不参与 CI）

仓库里带了 Prettier 和 ESLint 配置，供编辑器和喜欢的同学使用，但 **CI
不跑、也不是 devDependencies**：

```bash
npm i -D eslint @eslint/js   # 扁平配置，说明见 eslint.config.js 头部注释
npx eslint .
npx prettier --check .
```

`eslint.config.js` 只启用 `@eslint/js` 推荐规则（Node 全局变量，`client.js`
额外加浏览器全局变量），并忽略生成的 `data/`；`.prettierrc.json` 使用单引号、
120 列宽、分号。两者都不是 PR 的必需项。

### 提交 PR

1. Fork 仓库，从 `main` 拉分支。
2. 修改代码、补测试、跑 `npm test`。
3. 行为或配置有变时同步更新用户文档：`README.md`（中文，主文档）**和**
   `README.en.md`，并在 `CHANGELOG.md` 的 `## [Unreleased]` 下加一条。
4. 按 `PULL_REQUEST_TEMPLATE.md` 填写说明；UI 改动请附截图或录屏。
5. CI 必须通过。改动越聚焦越好，重构和新功能尽量拆成不同 PR。

版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)：修 Bug 升
patch，新功能升 minor，破坏性变更升 major。
