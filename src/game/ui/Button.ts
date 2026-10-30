import Phaser from 'phaser';
import { textStyle } from '../config/theme';
import { Sfx } from '../systems/AudioSystem';
import { services } from '../systems/Services';

export interface ButtonOptions {
  x: number;
  y: number;
  /** Pill buttons: btn_green / btn_yellow / btn_blue / btn_pink. Round: btn_round. */
  texture: string;
  width: number;
  height: number;
  label?: string;
  fontSize?: number;
  icon?: string;
  /** Icon size relative to button height. */
  iconScale?: number;
  onClick: () => void;
  sfx?: Sfx;
}

/** Chunky game button: squash on press, bounce on release, click sound, optional badge. */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Image | Phaser.GameObjects.NineSlice;
  private labelText?: Phaser.GameObjects.Text;
  private iconImg?: Phaser.GameObjects.Image;
  private badge?: Phaser.GameObjects.Container;
  private badgeText?: Phaser.GameObjects.Text;
  private enabled = true;
  private base = 1;
  private opts: ButtonOptions;

  constructor(scene: Phaser.Scene, opts: ButtonOptions) {
    super(scene, opts.x, opts.y);
    this.opts = opts;
    const { width: w, height: h } = opts;
    if (opts.texture === 'btn_round') {
      this.bg = scene.add.image(0, 0, opts.texture).setDisplaySize(w, h);
    } else {
      // 3-slice so pills keep round caps at any width.
      const frame = scene.textures.getFrame(opts.texture);
      const cap = Math.round(frame.height * 0.5);
      const s = h / frame.height;
      this.bg = scene.add.nineslice(0, 0, opts.texture, undefined, w / s, frame.height, cap, cap).setScale(s);
    }
    this.add(this.bg);
    if (opts.icon) {
      const size = h * (opts.iconScale ?? 0.6);
      this.iconImg = scene.add.image(opts.label ? -w / 2 + h * 0.55 : 0, -h * 0.04, opts.icon);
      this.iconImg.setScale(size / Math.max(this.iconImg.width, this.iconImg.height));
      this.add(this.iconImg);
    }
    if (opts.label) {
      const fs = opts.fontSize ?? Math.round(h * 0.42);
      const offset = opts.icon ? h * 0.3 : 0;
      this.labelText = scene.add.text(offset, -h * 0.05, opts.label, textStyle(fs)).setOrigin(0.5);
      this.add(this.labelText);
    }
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', this.press, this);
    this.on('pointerup', this.release, this);
    this.on('pointerout', this.cancel, this);
    scene.add.existing(this);
  }

  /** Layout scale; press animations are relative to it. */
  setBaseScale(s: number): this {
    this.base = s;
    this.setScale(s);
    return this;
  }

  setLabel(text: string): this {
    this.labelText?.setText(text);
    return this;
  }

  setIcon(key: string): this {
    if (this.iconImg) {
      const size = this.opts.height * (this.opts.iconScale ?? 0.6);
      this.iconImg.setTexture(key).setScale(size / Math.max(this.iconImg.width, this.iconImg.height));
    }
    return this;
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.5);
    return this;
  }

  /** Small bubble in the top-right corner (booster charges, prices). Null hides it. */
  setBadge(text: string | null, color = 0xff4d6d): this {
    if (text === null) {
      this.badge?.setVisible(false);
      return this;
    }
    if (!this.badge) {
      const r = this.opts.height * 0.22;
      const circle = this.scene.add.graphics();
      this.badgeText = this.scene.add.text(0, -1, '', textStyle(Math.round(r * 1.1))).setOrigin(0.5);
      this.badge = this.scene.add.container(this.opts.width / 2 - r * 0.6, -this.opts.height / 2 + r * 0.6, [circle, this.badgeText]);
      this.badge.setData('r', r).setData('g', circle);
      this.add(this.badge);
    }
    const r = this.badge.getData('r') as number;
    const g = this.badge.getData('g') as Phaser.GameObjects.Graphics;
    this.badgeText!.setText(text);
    const bw = Math.max(r * 2, this.badgeText!.width + r * 0.8);
    g.clear().fillStyle(0x6b4423).fillRoundedRect(-bw / 2, -r + 2, bw, r * 2, r).fillStyle(color).fillRoundedRect(-bw / 2, -r - 1, bw, r * 2, r);
    this.badge.setVisible(true);
    return this;
  }

  private press(): void {
    if (!this.enabled) return;
    services.audio.unlock();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scaleX: this.base * 0.9, scaleY: this.base * 0.86, duration: 70, ease: 'Quad.Out' });
    this.setData('pressed', true);
  }

  private release(): void {
    if (!this.getData('pressed')) return;
    this.setData('pressed', false);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scaleX: this.base, scaleY: this.base, duration: 260, ease: 'Back.Out' });
    if (!this.enabled) return;
    services.audio.play(this.opts.sfx ?? 'click');
    this.opts.onClick();
  }

  private cancel(): void {
    if (!this.getData('pressed')) return;
    this.setData('pressed', false);
    this.scene.tweens.add({ targets: this, scaleX: this.base, scaleY: this.base, duration: 160, ease: 'Quad.Out' });
  }
}

/** Round icon button helper. */
export const iconButton = (scene: Phaser.Scene, x: number, y: number, size: number, icon: string, onClick: () => void) =>
  new Button(scene, { x, y, texture: 'btn_round', width: size, height: size, icon, iconScale: 0.58, onClick });
