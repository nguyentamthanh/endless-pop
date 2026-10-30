import Phaser from 'phaser';
import { COLORS } from '../config/theme';

type G = Phaser.GameObjects.Graphics;

/** Textures that are always procedural (tiny particles). */
export function createCoreTextures(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (g: G) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  make('fx_confetti', 18, 10, (g) => g.fillStyle(0xffffff).fillRoundedRect(0, 0, 18, 10, 3));
  make('fx_dot', 16, 16, (g) => g.fillStyle(0xffffff).fillCircle(8, 8, 8));
  make('px', 2, 2, (g) => g.fillStyle(0xffffff).fillRect(0, 0, 2, 2));

  // Soft gradients can't be keyed out of generated art, so these two are drawn here.
  if (!scene.textures.exists('fx_glow')) {
    const tex = scene.textures.createCanvas('fx_glow', 128, 128)!;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    tex.refresh();
  }
  if (!scene.textures.exists('fx_rays')) {
    const tex = scene.textures.createCanvas('fx_rays', 512, 512)!;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
    grad.addColorStop(0, 'rgba(255,246,170,0.95)');
    grad.addColorStop(1, 'rgba(255,246,170,0)');
    ctx.fillStyle = grad;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(256, 256);
      ctx.arc(256, 256, 256, a, a + Math.PI / 14);
      ctx.closePath();
      ctx.fill();
    }
    tex.refresh();
  }
}

const ICON_COLORS = [0xffffff, 0xe8f6ff, 0xffc928, 0xff8a3d, 0xff4d6d, 0xff7eb6, 0xe8c15a, 0x52c45a];

function star(g: G, cx: number, cy: number, r: number, color: number): void {
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  g.fillStyle(color).fillPoints(pts, true);
  g.lineStyle(4, COLORS.outline).strokePoints(pts, true);
}

function drawMoo(g: G, s: number): void {
  const c = s / 2;
  g.fillStyle(COLORS.outline).fillEllipse(c, c + 4, s * 0.86, s * 0.76);
  g.fillStyle(0xffffff).fillEllipse(c, c, s * 0.8, s * 0.7);
  g.fillStyle(0x3b3b3b).fillEllipse(c - s * 0.2, c - s * 0.16, s * 0.22, s * 0.16);
  g.fillStyle(0xffb3c7).fillEllipse(c, c + s * 0.18, s * 0.42, s * 0.22);
  g.fillStyle(0x1e1e1e).fillRoundedRect(c - s * 0.3, c - s * 0.08, s * 0.26, s * 0.14, 8);
  g.fillRoundedRect(c + s * 0.04, c - s * 0.08, s * 0.26, s * 0.14, 8);
  g.fillRect(c - s * 0.06, c - s * 0.05, s * 0.12, s * 0.03);
}

/**
 * Safety net only: draws a simple vector stand-in for any image that failed to load,
 * so a missing file never breaks the game. Real art lives in public/assets.
 */
export function createFallback(scene: Phaser.Scene, key: string): void {
  const g = scene.make.graphics({}, false);
  let w = 128;
  let h = 128;
  if (key.startsWith('bg_')) {
    w = 720;
    h = 1280;
    g.fillGradientStyle(COLORS.skyDeep, COLORS.skyDeep, COLORS.sky, COLORS.sky, 1).fillRect(0, 0, w, h);
    if (key === 'bg_hills' || key === 'bg_meadow') {
      g.clear();
      h = 400;
      g.fillStyle(key === 'bg_hills' ? 0x9ad97a : 0x6ec85a).fillEllipse(w / 2, h, w * 1.6, h * 1.4);
    }
  } else if (key.startsWith('cloud_')) {
    w = 256;
    h = 120;
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(70, 70, 45).fillCircle(130, 50, 55).fillCircle(190, 72, 42).fillRect(70, 70, 120, 45);
  } else if (key.startsWith('moo_') || key.startsWith('icon_0')) {
    w = h = key.startsWith('moo_') ? 360 : 128;
    drawMoo(g, w);
  } else if (key === 'tile_base' || key === 'tile_back') {
    g.fillStyle(COLORS.outline).fillRoundedRect(0, 6, 128, 122, 22);
    g.fillStyle(key === 'tile_base' ? COLORS.cream : 0x6aa8ef).fillRoundedRect(4, 2, 120, 116, 20);
  } else if (key.startsWith('icon_')) {
    const i = Number(key.slice(5));
    g.fillStyle(COLORS.outline).fillCircle(64, 66, 50);
    g.fillStyle(ICON_COLORS[i] ?? 0xffffff).fillCircle(64, 62, 46);
  } else if (key.startsWith('btn_')) {
    const colors: Record<string, number> = { btn_green: 0x5fcf5a, btn_yellow: 0xffc928, btn_blue: 0x4fa8ff, btn_pink: 0xff7eb6, btn_round: 0x4fa8ff };
    if (key === 'btn_round') {
      g.fillStyle(COLORS.outline).fillCircle(64, 68, 60);
      g.fillStyle(colors[key]).fillCircle(64, 62, 56);
    } else {
      w = 320;
      h = 128;
      g.fillStyle(COLORS.outline).fillRoundedRect(0, 8, w, h - 8, 56);
      g.fillStyle(colors[key] ?? 0x5fcf5a).fillRoundedRect(4, 2, w - 8, h - 14, 52);
    }
  } else if (key === 'panel') {
    w = 512;
    h = 512;
    g.fillStyle(COLORS.outline).fillRoundedRect(0, 8, w, h - 8, 48);
    g.fillStyle(COLORS.cream).fillRoundedRect(8, 4, w - 16, h - 20, 42);
  } else if (key === 'ribbon') {
    w = 512;
    h = 128;
    g.fillStyle(COLORS.pink).fillRoundedRect(0, 10, w, h - 20, 24);
  } else if (key === 'tray_slot') {
    g.fillStyle(0x2f5fa8, 0.9).fillRoundedRect(0, 0, 128, 128, 24);
    g.fillStyle(0x3f76c9).fillRoundedRect(8, 8, 112, 112, 20);
  } else if (key === 'ic_star' || key === 'fx_star') {
    star(g, 64, 66, 56, COLORS.yellow);
  } else if (key === 'ic_star_empty') {
    star(g, 64, 66, 56, 0xb7c3d9);
  } else if (key === 'ic_coin') {
    g.fillStyle(COLORS.outline).fillCircle(64, 66, 56);
    g.fillStyle(0xffc928).fillCircle(64, 62, 52);
  } else if (key.startsWith('ic_')) {
    g.fillStyle(0xffffff).fillCircle(64, 64, 34);
  } else if (key === 'fx_sparkle' || key === 'fx_glow' || key === 'fx_puff') {
    g.fillStyle(key === 'fx_puff' ? 0xffffff : 0xfff5b0, key === 'fx_glow' ? 0.5 : 1).fillCircle(64, 64, 60);
  } else if (key === 'fx_rays') {
    w = h = 512;
    g.fillStyle(0xfff3a0, 0.45);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillTriangle(256, 256, 256 + Math.cos(a) * 360, 256 + Math.sin(a) * 360, 256 + Math.cos(a + 0.2) * 360, 256 + Math.sin(a + 0.2) * 360);
    }
  } else if (key === 'trophy') {
    w = h = 256;
    g.fillStyle(0xffc928).fillRoundedRect(68, 30, 120, 120, 40).fillRect(108, 140, 40, 50).fillRoundedRect(70, 190, 116, 36, 10);
  } else if (key === 'rain_cloud') {
    w = h = 256;
    g.fillStyle(0x9aa7bd).fillCircle(90, 110, 50).fillCircle(150, 95, 60).fillCircle(195, 120, 40);
  }
  g.generateTexture(key, w, h);
  g.destroy();
}
