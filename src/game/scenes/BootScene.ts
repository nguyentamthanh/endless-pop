import Phaser from 'phaser';
import { BOOT_IMAGES } from '../config/assets';
import { FONT } from '../config/theme';

/** Loads the tiny set of images the loading screen needs and waits for the bundled font. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    BOOT_IMAGES.forEach((a) => this.load.image(a.key, a.url));
  }

  create(): void {
    const family = FONT.split(',')[0];
    const fonts = document.fonts
      ? Promise.all([document.fonts.load(`700 40px ${family}`), document.fonts.load(`600 40px ${family}`)])
      : Promise.resolve();
    // Never block the game on fonts for more than a moment.
    const timeout = new Promise((r) => setTimeout(r, 1500));
    void Promise.race([fonts, timeout]).then(() => this.scene.start('Preload'));
  }
}
