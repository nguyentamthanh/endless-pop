import Phaser from 'phaser';
import { CAMPAIGN_LENGTH } from '../config/levels';
import { textStyle } from '../config/theme';
import { services } from '../systems/Services';
import { Backdrop } from '../ui/Backdrop';
import { Button, iconButton } from '../ui/Button';
import { onLayout, safeInsets } from '../ui/layout';

const PER_ROW = 5;
const PER_PAGE = 20;

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    const save = services.save.get();
    const backdrop = new Backdrop(this, 'bg_game', false, false);
    const title = this.add.text(0, 0, 'Levels', textStyle(64)).setOrigin(0.5);
    const back = iconButton(this, 0, 0, 88, 'ic_home', () => this.go('Menu'));
    let page = 0;
    const pages = Math.ceil(CAMPAIGN_LENGTH / PER_PAGE);

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
    const prev = new Button(this, {
      x: 0,
      y: 0,
      texture: 'btn_blue',
      width: 140,
      height: 80,
      label: 'Prev',
      fontSize: 32,
      onClick: () => {
        page = Math.max(0, page - 1);
        place();
      },
    });
    const next = new Button(this, {
      x: 0,
      y: 0,
      texture: 'btn_blue',
      width: 140,
      height: 80,
      label: 'Next',
      fontSize: 32,
      onClick: () => {
        page = Math.min(pages - 1, page + 1);
        place();
      },
    });
    const pageText = this.add.text(0, 0, '', textStyle(32)).setOrigin(0.5);

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

    const place = (): void => {
      const w = this.scale.width;
      const h = this.scale.height;
      const ins = safeInsets(this);
      const top = ins.top;
      backdrop.layout(w, h);
      back.setPosition(62 + ins.left, top + 62);
      title.setPosition(w / 2, top + 62);
      const perRow = w > h * 1.05 ? PER_ROW * 2 : PER_ROW;
      const cell = Math.min(150, (w - ins.left - ins.right - 60) / perRow);
      const rows = Math.ceil(PER_PAGE / perRow);
      const avail = h - top - 420;
      const pitchY = Math.min(cell + 40, avail / rows);
      const startY = top + 170;
      const scale = Math.min(1.2, (pitchY - 30) / 112, cell / 120);
      const start = page * PER_PAGE;
      cells.forEach(({ btn, stars }, i) => {
        const onPage = i >= start && i < start + PER_PAGE;
        btn.setVisible(onPage);
        if (!onPage) {
          stars.forEach((s) => s.setVisible(false));
          return;
        }
        const local = i - start;
        const x = w / 2 + ((local % perRow) - (perRow - 1) / 2) * cell;
        const y = startY + Math.floor(local / perRow) * pitchY;
        btn.setPosition(x, y).setBaseScale(scale);
        const locked = i + 1 > save.unlocked;
        stars.forEach((s, k) => {
          s.setVisible(!locked);
          s.setPosition(x + (k - 1) * 30 * scale, y + 62 * scale).setScale((30 * scale) / s.width);
        });
      });
      const navY = startY + rows * pitchY + 20;
      prev.setPosition(w / 2 - 160, navY).setVisible(page > 0);
      next.setPosition(w / 2 + 160, navY).setVisible(page < pages - 1);
      pageText.setPosition(w / 2, navY).setText(`${page + 1} / ${pages}`);
      endless.setPosition(w / 2, navY + 100);
    };
    onLayout(this, () => place());
    this.cameras.main.fadeIn(220, 143, 211, 255);
  }

  private go(scene: string, data?: object): void {
    this.input.enabled = false;
    this.cameras.main.fadeOut(200, 143, 211, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scene, data));
  }
}
