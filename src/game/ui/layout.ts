import Phaser from 'phaser';

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Device safe-area (notch, home indicator) in game pixels.
 * Read from a CSS probe element padded with env(safe-area-inset-*).
 */
export function safeInsets(scene: Phaser.Scene): Insets {
  const probe = document.getElementById('safe-area-probe');
  const css = probe ? getComputedStyle(probe) : null;
  const px = (v: string | undefined) => parseFloat(v ?? '0') || 0;
  const k = scene.scale.gameSize.width / Math.max(1, scene.scale.displaySize.width);
  return {
    top: px(css?.paddingTop) * k,
    bottom: px(css?.paddingBottom) * k,
    left: px(css?.paddingLeft) * k,
    right: px(css?.paddingRight) * k,
  };
}

/** Runs `fn` now and on every resize until the scene shuts down. */
export function onLayout(scene: Phaser.Scene, fn: (w: number, h: number) => void): void {
  const handler = () => fn(scene.scale.width, scene.scale.height);
  scene.scale.on(Phaser.Scale.Events.RESIZE, handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, handler));
  handler();
}

/** Scales an image so it covers the whole w×h area. */
export function cover(img: Phaser.GameObjects.Image, w: number, h: number): void {
  const s = Math.max(w / img.width, h / img.height);
  img.setScale(s).setPosition(w / 2, h / 2);
}
