/**
 * Opt-in ESLint configuration — NOT run by CI.
 *
 * The plugin ships with zero runtime dependencies and the workflow installs no
 * devDependencies, so a lint job would fail simply because `eslint` is absent.
 * Everything below is optional tooling for contributors. To use it:
 *
 *     npm i -D eslint @eslint/js
 *     npx eslint .
 *
 * It enables only the `@eslint/js` recommended rules (no custom or stylistic
 * rules), gives Node globals to the server-side files and browser globals to
 * the single-file client half, and ignores the generated `data/` directory.
 */
import js from '@eslint/js';

/** Minimal Node global names, spelled out so this file needs no `globals` package. */
const nodeGlobals = {
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  cancelAnimationFrame: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  global: 'readonly',
  globalThis: 'readonly',
  process: 'readonly',
  queueMicrotask: 'readonly',
  requestAnimationFrame: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  structuredClone: 'readonly',
};

/** Browser globals used by `client.js`, which never runs in Node. */
const browserGlobals = {
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  cancelAnimationFrame: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  localStorage: 'readonly',
  navigator: 'readonly',
  queueMicrotask: 'readonly',
  requestAnimationFrame: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  structuredClone: 'readonly',
  TextDecoder: 'readonly',
  TextEncoder: 'readonly',
  window: 'readonly',
};

export default [
  {
    ignores: ['data/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals,
    },
  },
  {
    // The browser half is a plain script loaded by the Harness web loader.
    files: ['client.js'],
    languageOptions: {
      globals: { ...nodeGlobals, ...browserGlobals },
    },
  },
];
