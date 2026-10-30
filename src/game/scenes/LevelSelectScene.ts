import Phaser from 'phaser';
import { CAMPAIGN_LENGTH } from '../config/levels';
import { textStyle } from '../config/theme';
import { services } from '../systems/Services';
import { Backdrop } from '../ui/Backdrop';
import { Button, iconButton } from '../ui/Button';
import { onLayout, safeInsets } from '../ui/layout';

const PER_ROW = 5;

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    const save = services.save.get();
    const backdrop = new Backdrop(this, 'bg_game', false, false);
    const title = this.add.text(0, 0, 'Levels', textStyle(64)).setOrigin(0.5);
    const back = iconButton(this, 0, 0, 88, 'ic_home', () => this.go('Menu'));

    const cells = Array.from({ length: CAMPAIGN_LENGTH }, (_, i) => {
      const level = i + 1;
      const locked = level > save.unlocked;
      const btn = new Button(this, {
        x: 0,
        y: 0,
        texture: 'btn_round',
        width: 112,
        height: 112,
        label: locked ? undefined : `${level}`,
        icon: locked ? 'ic_lock' : undefined,
        iconScale: 0.5,
        fontSize: 44,
        onClick: () => (locked ? services.audio.play('invalid') : this.go('Game', { level })),
      });
      if (locked) btn.setAlpha(0.6);
      const stars = [0, 1, 2].map((k) =>
        this.add.image(0, 0, k < (save.stars[level] ?? 0) ? 'ic_star' : 'ic_star_empty').setVisible(!locked),
      );
      return { btn, stars };
    });

    // Endless is open from the start and keeps its own progress.
    const endless = new Button(this, {
      x: 0,
      y: 0,
      texture: 'btn_pink',
      width: 420,
      height: 100,
      label: `Endless  ${save.endless}`,
      fontSize: 36,
      onClick: () => this.go('Game', { level: CAMPAIGN_LENGTH + services.save.get().endless }),
    });

    onLayout(this, (w, h) => {
      const ins = safeInsets(this);
      const top = ins.top;
      backdrop.layout(w, h);
      back.setPosition(62 + ins.left, top + 62);
      title.setPosition(w / 2, top + 62);
      // Wide screens get a 10-wide grid (3 rows) instead of 5-wide (6 rows).
      const perRow = w > h * 1.05 ? PER_ROW * 2 : PER_ROW;
      const cell = Math.min(150, (w - ins.left - ins.right - 60) / perRow);
      const rows = Math.ceil(CAMPAIGN_LENGTH / perRow);
      const avail = h - top - 340;
      const pitchY = Math.min(cell + 40, avail / rows);
      const startY = top + 170 + (perRow > PER_ROW ? 60 : 0);
      const scale = Math.min(1.2, (pitchY - 30) / 112, cell / 120);
      cells.forEach(({ btn, stars }, i) => {
        const x = w / 2 + ((i % perRow) - (perRow - 1) / 2) * cell;
        const y = startY + Math.floor(i / perRow) * pitchY;
        btn.setPosition(x, y).setBaseScale(scale);
        stars.forEach((s, k) => s.setPosition(x + (k - 1) * 30 * scale, y + 62 * scale).setScale((30 * scale) / s.width));
      });
      endless.setPosition(w / 2, startY + rows * pitchY + 30);
    });
    this.cameras.main.fadeIn(220, 143, 211, 255);
  }

  private go(scene: string, data?: object): void {
    this.input.enabled = false;
    this.cameras.main.fadeOut(200, 143, 211, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scene, data));
  }
}
