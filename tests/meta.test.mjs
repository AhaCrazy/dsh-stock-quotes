// Release-consistency checks: the things a user reads about the package and the
// things the code actually does have to agree before a version is tagged.
import { readFileSync } from 'node:fs';

let failures = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n     expected ${e}\n     actual   ${a}`}`);
};

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const client = read('client.js');
const changelog = read('CHANGELOG.md');

console.log('--- version ---');
check('version is semver', /^\d+\.\d+\.\d+$/.test(pkg.version), true);
const pinned = /const INDEX_VERSION = '([^']+)';/.exec(client);
check('client declares an index version', pinned !== null, true);
check('the index URL is pinned to the package version', pinned === null ? null : pinned[1], pkg.version);
check('the changelog has a heading for this version', changelog.includes(`## [${pkg.version}]`), true);

console.log('--- packaging ---');
check('the package is publishable', pkg.private, undefined);
check('it declares public access', pkg.publishConfig.access, 'public');
check('it declares DSH compatibility', typeof pkg.engines.dsh, 'string');
check('it declares a Node floor', typeof pkg.engines.node, 'string');
check('no runtime dependencies', pkg.dependencies, undefined);
const devDeps = Object.keys(pkg.devDependencies === undefined ? {} : pkg.devDependencies).sort();
check('dev dependencies are lint tooling only', devDeps, ['@eslint/js', 'eslint']);
check('the lockfile is committed', (() => {
  try {
    readFileSync(new URL('../package-lock.json', import.meta.url));
    return true;
  } catch {
    return false;
  }
})(), true);
check('the browser half ships', pkg.files.includes('client.js'), true);
check('the search index ships', pkg.files.some((entry) => entry.startsWith('data/')), true);
check('the index builder ships', pkg.files.some((entry) => entry.startsWith('scripts/')), true);
check('the licence ships', pkg.files.includes('LICENSE'), true);
check('the changelog ships', pkg.files.includes('CHANGELOG.md'), true);
check('the bundle patch is declared', pkg.dsh.bundle.patch, './cordis.patch.yml');
check('the web client is declared', pkg.dsh.client.platform, 'web');

console.log('--- files the docs promise ---');
for (const path of ['README.md', 'README.en.md', 'LICENSE', 'CHANGELOG.md', 'SECURITY.md', 'CONTRIBUTING.md']) {
  const present = (() => {
    try {
      readFileSync(new URL(`../${path}`, import.meta.url));
      return true;
    } catch {
      return false;
    }
  })();
  check(`${path} exists`, present, true);
}

console.log('--- the shipped index ---');
const index = JSON.parse(read('data/securities.json'));
check('the index has entries', index.entries.length > 1000, true);
check('every entry is a name/code pair', index.entries.every((entry) => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && typeof entry[1] === 'string'), true);
check('the index records when it was generated', typeof index.generated, 'string');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
