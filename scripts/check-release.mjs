// Release gate: one version, in every place that ships it.
//
// `tests/meta.test.mjs` already ties the CHANGELOG and the pinned search-index
// version to `package.json`; this script adds the git tag to that contract and
// runs before anything reaches the registry, so a mistyped tag fails in CI
// instead of publishing a version nobody meant to cut.
//
// `GITHUB_REF_NAME` is set by GitHub Actions on a tag push. Running it locally
// checks the manifest-side rules only.
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const version = JSON.parse(read('package.json')).version;
// GitHub sets GITHUB_REF_NAME to a branch name on branch pushes; only a `v*` ref
// is a release, so the tag check stays quiet in ordinary CI runs.
const ref = process.env.GITHUB_REF_NAME ?? '';
const tag = ref.startsWith('v') ? ref.slice(1) : '';
const problems = [];

if (tag !== '' && tag !== version) {
  problems.push(`the tag says ${tag} but package.json says ${version}`);
}

const pinned = /const INDEX_VERSION = '([^']+)';/.exec(read('client.js'));
if (pinned === null) problems.push('client.js declares no INDEX_VERSION');
else if (pinned[1] !== version) problems.push(`INDEX_VERSION is ${pinned[1]}, package.json is ${version}`);

if (!read('CHANGELOG.md').includes(`## [${version}]`)) {
  problems.push(`CHANGELOG.md has no "## [${version}]" heading`);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`release-check: FAIL ${problem}`);
  console.error('release-check: bump the version in one commit — package.json, CHANGELOG.md and INDEX_VERSION — then tag that commit.');
  process.exitCode = 1;
} else {
  console.log(`release-check: ${version} is consistent${tag === '' ? ' (tag not checked: GITHUB_REF_NAME is unset)' : ` with tag v${tag}`}`);
}
