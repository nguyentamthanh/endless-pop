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
  private iceMark: Phaser.GameObjects.Text;
  private faceDown = false;
  private iceLayers = 0;
  private frostOnBack = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.glow = scene.add.image(0, 0, 'fx_glow').setVisible(false).setTint(0xfff27a);
    this.base = scene.add.image(0, 0, 'tile_base');
    this.icon = scene.add.image(0, 0, 'icon_0');
    this.back = scene.add.image(0, 0, 'tile_back').setVisible(false);
    // Face-down tiles show a big "?": the player can't tell what is underneath until it is uncovered.
    this.mark = scene.add.text(0, 0, '?', textStyle(64, '#ffffff', '#1f4a9e')).setOrigin(0.5).setVisible(false);
    this.iceMark = scene.add.text(0, 0, '', textStyle(28, '#e8f7ff', '#1a4d86')).setOrigin(0.5).setVisible(false);
    this.add([this.glow, this.base, this.icon, this.back, this.mark, this.iceMark]);
    scene.add.existing(this);
  }

  setup(tileId: number, iconKey: string, size: number, faceDown: boolean): this {
    this.tileId = tileId;
    this.icon.setTexture(iconKey);
    this.iceLayers = 0;
    this.frostOnBack = false;
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
    this.iceMark.setFontSize(Math.round(size * 0.34)).setStroke('#1a4d86', Math.max(2, Math.round(size * 0.06))).setY(size * 0.28);
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
    this.applyIce();
  }

  /** Ice layers. `frostOnBack` draws a flake on a still-closed box (hidden from level 71). */
  setIce(layers: number, frostOnBack: boolean): void {
    this.iceLayers = layers;
    this.frostOnBack = frostOnBack;
    this.applyIce();
  }

  private applyIce(): void {
    const frozen = this.iceLayers > 0 && !this.faceDown;
    this.iceMark.setVisible(frozen || (this.faceDown && this.frostOnBack && this.iceLayers > 0));
    this.iceMark.setText(this.iceLayers > 1 ? `❄${this.iceLayers}` : '❄');
    this.base.setTint(frozen ? 0xb9e7ff : 0xffffff);
    if (this.faceDown) this.iceMark.setY(-this.size * 0.22);
    else this.iceMark.setY(this.size * 0.28);
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
