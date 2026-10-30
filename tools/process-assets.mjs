#!/usr/bin/env node
/**
 * Turns raw Gemini images (raw-assets/) into game-ready files (public/assets/).
 *
 *   node tools/process-assets.mjs              process every job whose raw file exists
 *   node tools/process-assets.mjs tile_icons   only jobs whose raw name contains the filter
 *   node tools/process-assets.mjs --manifest   regenerate ASSET_MANIFEST.md
 *
 * Sprites are drawn on flat magenta: the background is flood-filled from the borders, close-to-key
 * pockets are cleared everywhere, edges are feathered and de-spilled. Sheets are split into
 * connected components (small fragments merge into the nearest object; specks such as the
 * generator's corner watermark are dropped) and ordered top-to-bottom, left-to-right.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { JOBS, STYLE } from './asset-jobs.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const RAW = path.join(ROOT, 'raw-assets');
const OUT = path.join(ROOT, 'public', 'assets');
const STORE = path.join(ROOT, 'store-art'); // store/portal art is not shipped with the game
const dest = (file) => (file.startsWith('store/') ? path.join(STORE, file.slice(6)) : path.join(OUT, file));

// ------------------------------------------------------------------ full-bleed

async function processFull(job, src) {
  const meta = await sharp(src).metadata();
  // Drop a thin frame: removes the generator's corner watermark and edge artefacts.
  const mx = Math.round(meta.width * 0.05);
  const my = Math.round(meta.height * 0.05);
  for (const o of job.out) {
    const dst = dest(o.file);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    let img = sharp(src)
      .extract({ left: mx, top: my, width: meta.width - 2 * mx, height: meta.height - 2 * my })
      .resize(o.width, o.height, { fit: 'cover', position: 'centre' });
    img = dst.endsWith('.webp') ? img.webp({ quality: 82 }) : img.png({ compressionLevel: 9 });
    await img.toFile(dst);
    report(dst);
  }
}

// ------------------------------------------------------------------ keyed sprites / sheets

async function processKeyed(job, src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
  const key = borderColor(px, w, h);
  removeBackground(px, w, h, key);
  const objects = findObjects(px, w, h, job.out.length);
  if (objects.length < job.out.length) {
    throw new Error(`found ${objects.length} objects, expected ${job.out.length}`);
  }
  for (let i = 0; i < job.out.length; i++) {
    const o = job.out[i];
    const b = objects[i];
    const pad = 2;
    const left = Math.max(0, b.x0 - pad);
    const top = Math.max(0, b.y0 - pad);
    const cw = Math.min(w, b.x1 + pad + 1) - left;
    const ch = Math.min(h, b.y1 + pad + 1) - top;
    // Keep only this object's pixels inside its crop (neighbours may overlap the box).
    const crop = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const si = (top + y) * w + (left + x);
        if (b.label.has(labels[si]) || (labels[si] === 0 && px[si * 4 + 3] > 0 && nearBox(b, left + x, top + y))) {
          crop.set(px.subarray(si * 4, si * 4 + 4), (y * cw + x) * 4);
        }
      }
    }
    const dst = dest(o.file);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    await sharp(crop, { raw: { width: cw, height: ch, channels: 4 } })
      .resize(o.size, o.size, { fit: 'inside', kernel: 'lanczos3' })
      .png({ compressionLevel: 9, palette: true, quality: 92, effort: 9, dither: 0.6 })
      .toFile(dst);
    report(dst);
  }
}

const nearBox = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

function borderColor(px, w, h) {
  const rs = [];
  const gs = [];
  const bs = [];
  const sample = (x, y) => {
    const i = (y * w + x) * 4;
    rs.push(px[i]);
    gs.push(px[i + 1]);
    bs.push(px[i + 2]);
  };
  for (let x = 0; x < w; x += 4) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y += 4) {
    sample(0, y);
    sample(w - 1, y);
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}

const HARD = 120; // flood-fill reach from the border
const STRICT = 70; // anything this close to the key is background, even in enclosed pockets
const SOFT_HI = 170; // edge pixels between STRICT and SOFT_HI get partial alpha

function removeBackground(px, w, h, key) {
  const n = w * h;
  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const dr = px[i * 4] - key[0];
    const dg = px[i * 4 + 1] - key[1];
    const db = px[i * 4 + 2] - key[2];
    dist[i] = Math.sqrt(dr * dr + dg * dg + db * db);
  }
  const bg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  const push = (i) => {
    if (!bg[i] && dist[i] < HARD) {
      bg[i] = 1;
      queue[qt++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }
  for (let i = 0; i < n; i++) if (dist[i] < STRICT) bg[i] = 1;

  for (let i = 0; i < n; i++) {
    if (bg[i]) {
      px[i * 4 + 3] = 0;
      continue;
    }
    const x = i % w;
    const edge = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (i >= w && bg[i - w]) || (i < n - w && bg[i + w]);
    if (!edge || dist[i] >= SOFT_HI) continue;
    const a = Math.min(1, Math.max(0.05, (dist[i] - STRICT) / (SOFT_HI - STRICT)));
    // De-spill: remove the key colour that bled into the anti-aliased edge.
    for (let c = 0; c < 3; c++) {
      px[i * 4 + c] = Math.max(0, Math.min(255, (px[i * 4 + c] - (1 - a) * key[c]) / a));
    }
    px[i * 4 + 3] = Math.round(a * 255);
  }
}

let labels = new Int32Array(0);

function findObjects(px, w, h, expected) {
  const n = w * h;
  labels = new Int32Array(n);
  const comps = [];
  const queue = new Int32Array(n);
  let next = 1;
  for (let s = 0; s < n; s++) {
    if (labels[s] || px[s * 4 + 3] < 40) continue;
    const c = { id: next, area: 0, x0: w, y0: h, x1: 0, y1: 0 };
    labels[s] = next;
    let qh = 0;
    let qt = 0;
    queue[qt++] = s;
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % w;
      const y = (i / w) | 0;
      c.area++;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of nb) {
        if (j >= 0 && !labels[j] && px[j * 4 + 3] >= 40) {
          labels[j] = next;
          queue[qt++] = j;
        }
      }
    }
    comps.push(c);
    next++;
  }
  const minArea = w * h * 0.0015;
  // Generator watermark: a small mark in the bottom-right corner.
  const isWatermark = (c) => c.x0 > w * 0.85 && c.y0 > h * 0.85 && c.area < w * h * 0.01;
  const real = comps.filter((c) => !isWatermark(c));
  real.sort((a, b) => b.area - a.area);
  const seeds = real.slice(0, expected).filter((c) => c.area >= minArea);
  const objects = seeds.map((c) => ({ ...c, label: new Set([c.id]) }));
  const reach = Math.min(w, h) * 0.05;
  for (const c of real.slice(expected)) {
    let best = null;
    let bestD = Infinity;
    for (const o of objects) {
      const dx = Math.max(o.x0 - c.x1, c.x0 - o.x1, 0);
      const dy = Math.max(o.y0 - c.y1, c.y0 - o.y1, 0);
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    if (best && bestD <= reach) {
      best.label.add(c.id);
      best.x0 = Math.min(best.x0, c.x0);
      best.y0 = Math.min(best.y0, c.y0);
      best.x1 = Math.max(best.x1, c.x1);
      best.y1 = Math.max(best.y1, c.y1);
    }
  }
  // Reading order: group into rows by vertical overlap, then left to right.
  objects.sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
  const rows = [];
  for (const o of objects) {
    const cy = (o.y0 + o.y1) / 2;
    const row = rows.find((r) => cy >= r.y0 && cy <= r.y1);
    if (row) {
      row.items.push(o);
      row.y0 = Math.min(row.y0, o.y0);
      row.y1 = Math.max(row.y1, o.y1);
    } else rows.push({ y0: o.y0, y1: o.y1, items: [o] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.x0 - b.x0));
}

function report(dst) {
  const kb = (fs.statSync(dst).size / 1024).toFixed(1);
  console.log(`✓  ${path.relative(ROOT, dst).replace(/\\/g, '/')}  ${kb} KB`);
}

// ------------------------------------------------------------------ manifest

function writeManifest() {
  const lines = [
    '# Asset manifest',
    '',
    'All art was generated for this project with **Google Gemini (gemini.google.com, image generation)** from the prompts below,',
    'then processed by `tools/process-assets.mjs` (background removal, slicing, resize, compression).',
    'No image comes from the reference game. Text and numbers are never baked into art: everything readable is Phaser Text.',
    '',
    'Status is computed when this file is generated: **present** = the game file exists in `public/assets`, **missing** = the game',
    'falls back to a simple vector stand-in drawn by `TextureFactory.ts` until the file is added.',
    '',
    'Procedural (not generated): `fx_glow` and `fx_rays` (canvas gradients), `fx_confetti`, `fx_dot`, `px` particles (`TextureFactory.createCoreTextures`), and all sound (`AudioSystem`, Web Audio synthesis).',
    '',
    'Generated in the Gemini web app (gemini.google.com, image generation) on 2026-10-30. Every file below is the Gemini output with only background removal, cropping, resizing and compression applied.',
    '',
    `Shared style suffix: _${STYLE}_`,
    '',
    'Sprites/sheets are requested on flat magenta `#FF00FF`, which the processor keys out.',
    '',
  ];
  for (const job of JOBS) {
    lines.push(`## ${job.raw.replace(/\.png$/, '')}`, '');
    lines.push(`- Raw file: \`raw-assets/${job.raw}\` (${job.kind})`);
    lines.push(`- Used for: ${job.use}`);
    lines.push('- Prompt:', '', '  > ' + job.prompt.replace(STYLE, '_[style]_'), '');
    lines.push('| Output | Size | Format | Status |', '|---|---|---|---|');
    for (const o of job.out) {
      const file = dest(o.file);
      const exists = fs.existsSync(file);
      const dims = o.size ? `fit ${o.size}×${o.size}` : `${o.width}×${o.height}`;
      const kb = exists ? ` (${(fs.statSync(file).size / 1024).toFixed(0)} KB)` : '';
      const shown = o.file.startsWith('store/') ? `store-art/${o.file.slice(6)}` : `public/assets/${o.file}`;
      lines.push(`| \`${shown}\` | ${dims} | ${path.extname(o.file).slice(1).toUpperCase()} | ${exists ? 'present' + kb : 'missing'} |`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(ROOT, 'ASSET_MANIFEST.md'), lines.join('\n'));
  console.log('ASSET_MANIFEST.md written');
}

// ------------------------------------------------------------------ run

const args = process.argv.slice(2);
if (args.includes('--manifest')) {
  writeManifest();
  process.exit(0);
}
const filter = args.find((a) => !a.startsWith('--'));

let failures = 0;
for (const job of JOBS) {
  if (filter && !job.raw.includes(filter)) continue;
  const src = path.join(RAW, job.raw);
  if (!fs.existsSync(src)) {
    console.log(`·  ${job.raw}: raw file missing, skipped`);
    continue;
  }
  try {
    if (job.kind === 'full') await processFull(job, src);
    else await processKeyed(job, src);
  } catch (e) {
    failures++;
    console.error(`✗  ${job.raw}: ${e.message}`);
  }
}
if (failures) process.exitCode = 1;

