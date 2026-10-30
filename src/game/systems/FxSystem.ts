import Phaser from 'phaser';
import { textStyle } from '../config/theme';

const CONFETTI_TINTS = [0xff7eb6, 0xffd54a, 0x6ed36b, 0x4fa8ff, 0xb68cff, 0xff9f43];

/**
 * Particle bursts and floating score text. Emitters are created once per scene and fired with
 * `explode()`; floating texts come from a small pool so popping tiles allocates nothing.
 */
export class FxSystem {
  private sparkle: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars: Phaser.GameObjects.Particles.ParticleEmitter;
  private puff: Phaser.GameObjects.Particles.ParticleEmitter;
  private confettiEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private texts: Phaser.GameObjects.Text[] = [];

  constructor(private scene: Phaser.Scene, depth = 900) {
    this.sparkle = scene.add
      .particles(0, 0, 'fx_sparkle', {
        emitting: false,
        speed: { min: 120, max: 320 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.45, end: 0 },
        rotate: { min: 0, max: 360 },
        lifespan: { min: 350, max: 600 },
        gravityY: 300,
      })
      .setDepth(depth);
    this.stars = scene.add
      .particles(0, 0, 'fx_star', {
        emitting: false,
        speed: { min: 200, max: 420 },
        angle: { min: 200, max: 340 },
        scale: { start: 0.35, end: 0.1 },
        rotate: { start: 0, end: 360 },
        alpha: { start: 1, end: 0 },
        lifespan: 800,
        gravityY: 600,
      })
      .setDepth(depth);
    this.puff = scene.add
      .particles(0, 0, 'fx_puff', {
        emitting: false,
        speed: { min: 20, max: 80 },
        scale: { start: 0.25, end: 0.6 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 450,
      })
      .setDepth(depth - 1);
    this.confettiEmitter = scene.add
      .particles(0, 0, 'fx_confetti', {
        emitting: false,
        speed: { min: 300, max: 750 },
        angle: { min: 230, max: 310 },
        scaleX: { min: 0.6, max: 1.2 },
        scaleY: { min: 0.6, max: 1.2 },
        rotate: { min: 0, max: 360 },
        lifespan: 2200,
        gravityY: 700,
        tint: CONFETTI_TINTS,
      })
      .setDepth(depth + 10);
  }

  pop(x: number, y: number, count = 8): void {
    this.sparkle.explode(count, x, y);
    this.puff.explode(2, x, y);
  }

  starBurst(x: number, y: number, count = 10): void {
    this.stars.explode(count, x, y);
  }

  confetti(x: number, y: number, count = 80): void {
    this.confettiEmitter.explode(count, x, y);
  }

  floatText(x: number, y: number, text: string, size = 40, color = '#ffffff'): void {
    let t = this.texts.find((tx) => !tx.active);
    if (!t) {
      t = this.scene.add.text(0, 0, '', textStyle(size)).setOrigin(0.5).setDepth(950);
      this.texts.push(t);
    }
    t.setActive(true).setVisible(true).setText(text).setStyle(textStyle(size, color)).setPosition(x, y).setAlpha(1).setScale(0.4);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: t,
      y: y - 90,
      alpha: 0,
      delay: 380,
      duration: 520,
      ease: 'Quad.In',
      onComplete: () => t!.setActive(false).setVisible(false),
    });
  }
}
