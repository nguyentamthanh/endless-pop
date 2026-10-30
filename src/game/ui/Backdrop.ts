import Phaser from 'phaser';
import { cover } from './layout';

const CLOUD_SPEED = [14, 22, 32]; // px per second, far → near

/** Layered background: sky, drifting parallax clouds, and (on the menu) hills + meadow. */
export class Backdrop {
  private sky: Phaser.GameObjects.Image;
  private clouds: Phaser.GameObjects.Image[] = [];
  private hills?: Phaser.GameObjects.Image;
  private meadow?: Phaser.GameObjects.Image;
  private hillsFill?: Phaser.GameObjects.Rectangle;
  private meadowFill?: Phaser.GameObjects.Rectangle;
  private w = 720;

  constructor(scene: Phaser.Scene, skyKey: string, withLand: boolean, withClouds = true) {
    this.sky = scene.add.image(0, 0, skyKey).setDepth(-100);
    for (let i = 0; i < (withClouds ? 3 : 0); i++) {
      this.clouds.push(scene.add.image(0, 0, `cloud_${i}`).setDepth(-90 + i).setAlpha(0.92));
    }
    if (withLand) {
      // The art strips are short; solid fills in their bottom-edge colour carry them to the screen edge.
      this.hillsFill = scene.add.rectangle(0, 0, 10, 10, 0xbfd66c).setOrigin(0.5, 0).setDepth(-81);
      this.meadowFill = scene.add.rectangle(0, 0, 10, 10, 0x81a132).setOrigin(0.5, 0).setDepth(-71);
      this.hills = scene.add.image(0, 0, 'bg_hills').setOrigin(0.5, 1).setDepth(-80);
      this.meadow = scene.add.image(0, 0, 'bg_meadow').setOrigin(0.5, 1).setDepth(-70);
    }
    const tick = (_t: number, dt: number) => this.update(dt);
    scene.events.on(Phaser.Scenes.Events.UPDATE, tick);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, tick));
  }

  layout(w: number, h: number): void {
    this.w = w;
    cover(this.sky, w, h);
    this.clouds.forEach((c, i) => {
      c.setScale(((0.32 + i * 0.1) * w) / c.width);
      c.setY(h * (0.08 + i * 0.11));
      if (!c.getData('placed')) {
        c.setX(w * (0.2 + i * 0.33));
        c.setData('placed', true);
      }
    });
    if (this.hills && this.meadow && this.hillsFill && this.meadowFill) {
      const hillsBottom = h * 0.9;
      const meadowBottom = h * 0.97;
      this.hills.setPosition(w / 2, hillsBottom).setScale(w / this.hills.width);
      this.meadow.setPosition(w / 2, meadowBottom).setScale(w / this.meadow.width);
      this.hillsFill.setPosition(w / 2, hillsBottom - 2).setSize(w, h - hillsBottom + 4);
      this.meadowFill.setPosition(w / 2, meadowBottom - 2).setSize(w, h - meadowBottom + 4);
    }
  }

  /** Delta-time drift so speed is the same at any frame rate. */
  private update(dt: number): void {
    this.clouds.forEach((c, i) => {
      c.x += (CLOUD_SPEED[i] * dt) / 1000;
      if (c.x - c.displayWidth / 2 > this.w) c.x = -c.displayWidth / 2;
    });
  }
}
