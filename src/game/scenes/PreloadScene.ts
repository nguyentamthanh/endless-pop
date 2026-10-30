import Phaser from 'phaser';
import { BOOT_IMAGES, IMAGES } from '../config/assets';
import { COLORS, textStyle } from '../config/theme';
import { Mascot } from '../entities/Mascot';
import { createCoreTextures, createFallback } from '../systems/TextureFactory';
import { cover, onLayout } from '../ui/layout';
import { ProgressBar } from '../ui/ProgressBar';

/** Loading screen with progress; fills in stand-ins for any image that failed to load. */
export class PreloadScene extends Phaser.Scene {
  private missing: string[] = [];

  constructor() {
    super('Preload');
  }

  preload(): void {
    BOOT_IMAGES.forEach((a) => {
      if (!this.textures.exists(a.key)) createFallback(this, a.key);
    });
    const bg = this.add.image(0, 0, 'bg_sky');
    const moo = new Mascot(this, 0, 0, 260);
    const label = this.add.text(0, 0, 'Loading…', textStyle(40)).setOrigin(0.5);
    const bar = new ProgressBar(this, 0, 0, 420, 36, COLORS.yellow);
    onLayout(this, (w, h) => {
      cover(bg, w, h);
      moo.setPosition(w / 2, h * 0.45);
      label.setPosition(w / 2, h * 0.62);
      bar.setPosition(w / 2, h * 0.68);
    });
    this.tweens.add({ targets: moo, y: '-=24', duration: 380, yoyo: true, repeat: -1, ease: 'Quad.Out' });

    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => {
      bar.setValue(v, false);
      label.setText(`Loading… ${Math.round(v * 100)}%`);
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => this.missing.push(file.key));
    IMAGES.forEach((a) => this.load.image(a.key, a.url));
  }

  create(): void {
    createCoreTextures(this);
    // A file can fail to load (404) or fail to decode (dev server answering with HTML).
    for (const { key } of IMAGES) {
      if (!this.textures.exists(key) && !this.missing.includes(key)) this.missing.push(key);
    }
    for (const key of this.missing) {
      if (this.textures.exists(key)) this.textures.remove(key);
      createFallback(this, key);
    }
    if (this.missing.length) console.warn(`[assets] using stand-ins for: ${this.missing.join(', ')}`);
    this.cameras.main.fadeOut(250, 143, 211, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Menu'));
  }
}
