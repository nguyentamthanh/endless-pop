import Phaser from 'phaser';
import { COLORS, textStyle } from '../config/theme';

export interface PanelOptions {
  width: number;
  height: number;
  title?: string;
  depth?: number;
}

/**
 * Modal window: dims and blocks everything below, pops in with a bounce.
 * Put content in `content` (coordinates relative to the panel centre).
 */
export class Panel extends Phaser.GameObjects.Container {
  readonly content: Phaser.GameObjects.Container;
  private dim: Phaser.GameObjects.Rectangle;
  private resizeHandler: () => void;

  constructor(scene: Phaser.Scene, opts: PanelOptions) {
    super(scene, 0, 0);
    this.setDepth(opts.depth ?? 2000);
    this.dim = scene.add.rectangle(0, 0, 10, 10, COLORS.dim, 0.6).setOrigin(0).setInteractive();
    this.content = scene.add.container(0, 0);
    const frame = scene.textures.getFrame('panel');
    const corner = Math.round(Math.min(frame.width, frame.height) * 0.22);
    const bg = scene.add.nineslice(0, 0, 'panel', undefined, opts.width, opts.height, corner, corner, corner, corner);
    this.content.add(bg);
    if (opts.title) {
      const rf = scene.textures.getFrame('ribbon');
      const ribbonW = Math.min(opts.width * 0.95, 560);
      const rs = 110 / rf.height;
      const ribbon = scene.add
        .nineslice(0, -opts.height / 2 + 6, 'ribbon', undefined, ribbonW / rs, rf.height, Math.round(rf.width * 0.22), Math.round(rf.width * 0.22))
        .setScale(rs);
      const title = scene.add.text(0, -opts.height / 2, opts.title, textStyle(46)).setOrigin(0.5);
      this.content.add([ribbon, title]);
    }
    this.add([this.dim, this.content]);
    scene.add.existing(this);

    this.resizeHandler = () => this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler));
    this.layout();
  }

  layout(): void {
    const { width: w, height: h } = this.scene.scale;
    this.dim.setSize(w, h);
    this.dim.input?.hitArea.setTo(0, 0, w, h);
    // Shrink the whole window on very short screens.
    const panel = this.content.getAt(0) as Phaser.GameObjects.NineSlice;
    const fit = Math.min(1, (h * 0.9) / (panel.height + 80), (w * 0.94) / panel.width);
    this.content.setPosition(w / 2, h / 2).setData('fit', fit);
    if (!this.scene.tweens.isTweening(this.content)) this.content.setScale(fit);
  }

  open(): this {
    const fit = (this.content.getData('fit') as number) ?? 1;
    this.dim.setAlpha(0);
    this.content.setScale(fit * 0.6).setAlpha(0);
    this.scene.tweens.add({ targets: this.dim, alpha: 1, duration: 180 });
    this.scene.tweens.add({ targets: this.content, scale: fit, alpha: 1, duration: 320, ease: 'Back.Out' });
    return this;
  }

  close(onDone?: () => void): void {
    this.scene.tweens.add({ targets: this.dim, alpha: 0, duration: 160 });
    this.scene.tweens.add({
      targets: this.content,
      scale: this.content.scale * 0.7,
      alpha: 0,
      duration: 160,
      ease: 'Quad.In',
      onComplete: () => {
        this.destroy();
        onDone?.();
      },
    });
  }
}
