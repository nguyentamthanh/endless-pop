import Phaser from 'phaser';

export type Mood = 'idle' | 'happy' | 'shocked' | 'sad';

/** Moo the cow: idle breathing/bobbing, plus short reaction poses. */
export class Mascot extends Phaser.GameObjects.Container {
  private img: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private size: number;
  private mood: Mood = 'idle';
  private revert?: Phaser.Time.TimerEvent;
  private idleTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number) {
    super(scene, x, y);
    this.size = size;
    this.shadow = scene.add.ellipse(0, size * 0.46, size * 0.6, size * 0.1, 0x24406b, 0.25);
    this.img = scene.add.image(0, 0, 'moo_idle').setOrigin(0.5, 0.95);
    this.img.setY(size * 0.47);
    this.add([this.shadow, this.img]);
    this.fit();
    scene.add.existing(this);
    this.startIdle();
  }

  private fit(): void {
    this.img.setScale(this.size / Math.max(this.img.width, this.img.height));
    this.img.setData('base', this.img.scale);
  }

  setSize2(size: number): void {
    this.size = size;
    this.shadow.setPosition(0, size * 0.46).setSize(size * 0.6, size * 0.1);
    this.img.setY(size * 0.47);
    this.fit();
    this.startIdle();
  }

  private startIdle(): void {
    this.idleTween?.remove();
    const base = this.img.getData('base') as number;
    this.img.setScale(base);
    // Breathing squash-and-stretch anchored at the feet.
    this.idleTween = this.scene.tweens.add({
      targets: this.img,
      scaleY: base * 1.04,
      scaleX: base * 0.97,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /** Shows a pose for `hold` ms (0 = keep), then returns to idle. */
  setMood(mood: Mood, hold = 1100): void {
    this.revert?.remove();
    if (mood !== this.mood) {
      this.mood = mood;
      this.img.setTexture(mood === 'idle' ? 'moo_idle' : `moo_${mood}`);
      this.fit();
      this.startIdle();
    }
    if (mood === 'happy') this.hop();
    if (mood === 'shocked') this.wobble();
    if (mood !== 'idle' && hold > 0) this.revert = this.scene.time.delayedCall(hold, () => this.setMood('idle'));
  }

  hop(): void {
    this.scene.tweens.add({ targets: this.img, y: this.size * 0.47 - this.size * 0.16, duration: 160, yoyo: true, ease: 'Quad.Out' });
  }

  wobble(): void {
    this.scene.tweens.add({ targets: this.img, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => this.img.setAngle(0) });
  }
}
