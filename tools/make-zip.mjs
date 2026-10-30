#!/usr/bin/env node
/**
 * Packs dist/ into build/endless-pop-<version>.zip for upload (index.html at the archive root,
 * forward-slash Latin file names only). Run `npm run build` first, or use `npm run pack`.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { zipSync } from 'fflate';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const dist = join(root, 'dist');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const files = {};
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files[relative(dist, full).split(sep).join('/')] = new Uint8Array(readFileSync(full));
  }
})(dist);

const bad = Object.keys(files).filter((n) => !/^[A-Za-z0-9_./-]+$/.test(n));
if (bad.length) throw new Error(`Non-Latin or unsafe file names: ${bad.join(', ')}`);
if (!files['index.html']) throw new Error('dist/index.html is missing: run the build first');

const out = join(root, 'build');
mkdirSync(out, { recursive: true });
const target = join(out, `endless-pop-${version}.zip`);
// Already-compressed formats are stored; everything else is deflated.
const stored = /\.(png|webp|woff2?)$/i;
const zipped = zipSync(
  Object.fromEntries(Object.entries(files).map(([n, d]) => [n, [d, { level: stored.test(n) ? 0 : 9 }]])),
);
writeFileSync(target, zipped);
console.log(`${target}\n${Object.keys(files).length} files, ${(zipped.length / 1024).toFixed(0)} KB`);
