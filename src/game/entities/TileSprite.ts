import Phaser from 'phaser';
import { textStyle } from '../config/theme';

/**
 * One board tile: card base + icon, or the face-down back.
 * Pooled by BoardView; `size` is the on-screen edge length.
 */
export class TileSprite extends Phaser.GameObjects.Container {
  tileId = 0;
  /** Current on-screen edge length. */
  size = 0;
  private glow: Phaser.GameObjects.Image;
  private base: Phaser.GameObjects.Image;
  private icon: Phaser.GameObjects.Image;
  private back: Phaser.GameObjects.Image;
  private mark: Phaser.GameObjects.Text;
  private faceDown = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.glow = scene.add.image(0, 0, 'fx_glow').setVisible(false).setTint(0xfff27a);
    this.base = scene.add.image(0, 0, 'tile_base');
    this.icon = scene.add.image(0, 0, 'icon_0');
    this.back = scene.add.image(0, 0, 'tile_back').setVisible(false);
    // Face-down tiles show a big "?": the player can't tell what is underneath until it is uncovered.
    this.mark = scene.add.text(0, 0, '?', textStyle(64, '#ffffff', '#1f4a9e')).setOrigin(0.5).setVisible(false);
    this.add([this.glow, this.base, this.icon, this.back, this.mark]);
    scene.add.existing(this);
  }

  setup(tileId: number, iconKey: string, size: number, faceDown: boolean): this {
    this.tileId = tileId;
    this.icon.setTexture(iconKey);
    this.setTileSize(size);
    this.setFaceDown(faceDown);
    this.setGlow(false);
    this.setScale(1).setAlpha(1).setAngle(0).setActive(true).setVisible(true);
    return this;
  }

  setTileSize(size: number): void {
    this.size = size;
    // Cards are slightly taller than wide (3D lip); squash to a square cell so stacks tile exactly.
    this.base.setDisplaySize(size, size);
    this.back.setDisplaySize(size, size);
    this.mark.setFontSize(Math.round(size * 0.7)).setStroke('#1f4a9e', Math.max(3, Math.round(size * 0.1))).setY(-size * 0.02);
    const iconSize = size * 0.74;
    this.icon.setScale(iconSize / Math.max(this.icon.width, this.icon.height)).setY(-size * 0.03);
    this.glow.setScale((size * 1.6) / this.glow.width);
  }

  setFaceDown(down: boolean): void {
    this.faceDown = down;
    this.base.setVisible(!down);
    this.icon.setVisible(!down);
    this.back.setVisible(down);
    this.mark.setVisible(down);
  }

  isFaceDown = () => this.faceDown;

  setGlow(on: boolean): this {
    this.glow.setVisible(on);
    this.scene.tweens.killTweensOf(this.glow);
    if (on) {
      this.glow.setAlpha(0.9);
      this.scene.tweens.add({ targets: this.glow, alpha: 0.45, duration: 420, yoyo: true, repeat: -1 });
    }
    return this;
  }

  /** Card flip to face-up. */
  flipUp(delay = 0): void {
    if (!this.faceDown) return;
    const sx = this.scaleX || 1;
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      delay,
      duration: 110,
      ease: 'Quad.In',
      onComplete: () => {
        this.setFaceDown(false);
        this.scene.tweens.add({ targets: this, scaleX: sx, duration: 160, ease: 'Back.Out' });
      },
    });
  }
}
