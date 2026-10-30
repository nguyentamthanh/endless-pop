import Phaser from 'phaser';
import { COLORS } from '../config/theme';

/** Rounded progress bar with an animated fill and a shine strip. */
export class ProgressBar extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private value = 0;
  private shown = 0;
  private bw: number;
  private bh: number;
  private color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number = COLORS.green) {
    super(scene, x, y);
    this.bw = w;
    this.bh = h;
    this.color = color;
    this.g = scene.add.graphics();
    this.add(this.g);
    scene.add.existing(this);
    this.draw();
  }

  resize(w: number): void {
    this.bw = w;
    this.draw();
  }

  setValue(v: number, animate = true): void {
    this.value = Phaser.Math.Clamp(v, 0, 1);
    this.scene.tweens.killTweensOf(this);
    if (!animate) {
      this.shown = this.value;
      this.draw();
      return;
    }
    this.scene.tweens.add({
      targets: this,
      shown: this.value,
      duration: 400,
      ease: 'Cubic.Out',
      onUpdate: () => this.draw(),
    });
  }

  private draw(): void {
    const { bw: w, bh: h, g } = this;
    const r = h / 2;
    g.clear();
    g.fillStyle(COLORS.outline).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, r);
    g.fillStyle(0x2f4f86, 0.85).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    const inner = w - 8;
    const fw = Math.max(0, inner * this.shown);
    if (fw > 0) {
      const fr = Math.min(r - 4, fw / 2);
      g.fillStyle(this.color).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, fw, h - 8, fr);
      g.fillStyle(0xffffff, 0.35).fillRoundedRect(-w / 2 + 8, -h / 2 + 6, Math.max(0, fw - 8), (h - 8) * 0.35, fr / 2);
    }
  }
}
