# Releasing

**中文摘要**：发布就是「改一个版本号 → 提交 → 打 `vX.Y.Z` tag → 推送」。推 tag 后
`.github/workflows/release.yml` 会跑测试和 lint、校验版本一致性、带 provenance 发布到
npm，并自动创建 GitHub Release。不需要手工 `npm publish`，也不需要在本机登录 npm。

A release is one version in four places, bumped in a single commit and tagged:

| Place | What it carries |
|---|---|
| `package.json` `version` | the published version |
| `CHANGELOG.md` `## [x.y.z]` | what changed, in Keep a Changelog form |
| `client.js` `INDEX_VERSION` | the search-index snapshot this version reads |
| the git tag | `v` + the same version |

`npm run check:release` verifies all four (`tests/meta.test.mjs` checks the first
three on every `npm test`; the tag is only present in CI).

## Checklist

```bash
# 1. Every shipped change is committed and green.
npm ci && npm run lint && npm test

# 2. Bump the version in the three files above, then:
npm run check:release

# 3. Commit and tag. The tag is the release switch.
git commit -am "chore(release): 2.0.3"
git tag -a v2.0.3 -m "dsh-stock-quotes 2.0.3"
git push origin main
git push origin v2.0.3
```

Pushing the tag starts `.github/workflows/release.yml`, which:

1. fails if the tag, `package.json`, `CHANGELOG.md` and `INDEX_VERSION` disagree;
2. runs `npm run lint` and `npm test`;
3. publishes with `--provenance` (the npm page links the tarball to the run);
4. creates the GitHub release with generated notes, or updates it on a re-run.

Nothing publishes from a branch push — only from a `v*` tag.

## Publish credentials

Pick one, once:

- **Trusted publishing (recommended).** On npmjs.com: package → **Settings** →
  **Trusted publishing** → add repository `AhaCrazy/dsh-stock-quotes`, workflow
  `release.yml`. No repository secret. npm exchanges the job's OIDC token
  (`id-token: write` in the workflow) for a short-lived credential, which is why
  the job upgrades npm to the current release line first.
- **Granular `NPM_TOKEN`.** Create a granular token with read-and-write access to
  this package and store it as the `NPM_TOKEN` repository secret (Settings →
  Secrets and variables → Actions). The workflow prefers this when it is set.
  Note that npm is restricting granular tokens that bypass 2FA for direct
  publishing, so this is the transitional option.

## If CI cannot publish

`npm publish` still works from a checkout on the tag, and it is gated by
`prepublishOnly`, so the test suite runs first:

```bash
git checkout v2.0.3
npm publish   # publishConfig.access is already "public"
```

Do not publish a version that CI never built if you can avoid it: provenance is
what makes the registry record traceable.

## After publishing
- `npm view dsh-stock-quotes version` should print the new version, and
  `npm view dsh-stock-quotes versions` should list it.
- Both index URLs for the new version should answer 200:
  `https://cdn.jsdelivr.net/npm/dsh-stock-quotes@<version>/data/securities.json`
  and
  `https://cdn.jsdelivr.net/gh/AhaCrazy/dsh-stock-quotes@v<version>/data/securities.json`
  (jsDelivr caches; a brand-new version can take a few minutes).
- Consumers install with `plugin_manager action: install_bundle target:
  dsh-stock-quotes@<version>`.

## Registry quirks worth knowing

- **`minimumReleaseAge`.** pnpm 11 defers packages published within the last day,
  so a plugin installed immediately after publication can be held back until
  pnpm's supply-chain gate accepts it. The profile's `pnpm-workspace.yaml` gains a
  `minimumReleaseAgeExclude` entry when pnpm allows the install; if a profile
  install fails with no matching version, that exclusion is the missing piece.
- **A brand-new package name gets `0.0.0-stage`.** npm creates a placeholder
  version while it processes the very first publish of a name. It is not
  installed by `latest` and does not need action; removing it needs an npm
  session with 2FA (the web UI), because granular tokens that bypass 2FA may not
  unpublish.
- **DSH version gates.** `engines.dsh` is checked by `plugin_manager` before
  pnpm runs, with prereleases included (so `>=0.2.0` accepts `0.2.1-rc.5`).
  Keep that range honest: it is the compatibility promise users install against.
