import Phaser from 'phaser';

export const FONT = 'Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';

export const COLORS = {
  sky: 0x8fd3ff,
  skyDeep: 0x5ab4f0,
  cream: 0xfff4dc,
  outline: 0x6b4423,
  pink: 0xff7eb6,
  yellow: 0xffd54a,
  green: 0x6ed36b,
  blue: 0x4fa8ff,
  lane: 0xffffff,
  shadow: 0x24406b,
  dim: 0x1b2a48,
} as const;

export const BASE_WIDTH = 720;
export const BASE_HEIGHT = 1280;

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

/** Chunky outlined game text; size in px. */
export function textStyle(size: number, color = '#ffffff', stroke = '#6b4423'): TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: '700',
    color,
    stroke,
    strokeThickness: Math.max(3, Math.round(size * 0.16)),
    align: 'center',
    shadow: { offsetX: 0, offsetY: Math.round(size * 0.08), color: 'rgba(36,64,107,0.35)', blur: 0, fill: true, stroke: true },
  };
}

/** Plain text for body copy inside panels. */
export function bodyStyle(size: number, color = '#6b4423'): TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '600', color, align: 'center' };
}
