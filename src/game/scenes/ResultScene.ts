import Phaser from 'phaser';
import { bodyStyle, textStyle } from '../config/theme';
import { Mascot } from '../entities/Mascot';
import { FxSystem } from '../systems/FxSystem';
import { platform } from '../systems/PlatformService';
import { services } from '../systems/Services';
import { Button, iconButton } from '../ui/Button';
import { Panel } from '../ui/Panel';
import type { ResultData } from './GameScene';

/** Victory / game-over overlay on top of the paused GameScene. */
export class ResultScene extends Phaser.Scene {
  private result!: ResultData;

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.result = data;
  }

  create(): void {
    const d = this.result;
    const fx = new FxSystem(this, 2500);
    const panel = new Panel(this, { width: 600, height: 820, title: d.win ? 'Level Clear!' : 'Out of moves' }).open();
    const b = panel.content;

    const art = this.add.image(0, -230, d.win ? 'fx_rays' : 'rain_cloud');
    art.setScale((d.win ? 520 : 170) / art.width);
    b.add(art);
    if (d.win) {
      art.setAlpha(0.8);
      this.tweens.add({ targets: art, angle: 360, duration: 9000, repeat: -1 });
    } else {
      art.setY(-275);
      this.tweens.add({ targets: art, x: { from: -12, to: 12 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const rain = this.add.particles(0, 0, 'fx_dot', {
        x: { min: -60, max: 60 },
        y: -215,
        speedY: { min: 320, max: 420 },
        scaleX: 0.25,
        scaleY: 0.7,
        lifespan: 380,
        frequency: 70,
        tint: 0x7fb6ff,
        alpha: { start: 0.9, end: 0 },
      });
      b.add(rain);
    }
    const moo = new Mascot(this, d.win ? -60 : 0, d.win ? -150 : -120, 250);
    moo.setMood(d.win ? 'happy' : 'sad', 0);
    b.add(moo);

    // Stars (a lost level shows none).
    const starY = 30;
    (d.win ? [0, 1, 2] : []).forEach((i) => {
      const empty = this.add.image((i - 1) * 120, starY - (i === 1 ? 20 : 0), 'ic_star_empty');
      empty.setScale(100 / empty.width);
      b.add(empty);
      if (i < d.stars) {
        const s = this.add.image(empty.x, empty.y, 'ic_star').setScale(0);
        b.add(s);
        this.tweens.add({
          targets: s,
          scale: 110 / s.width,
          delay: 450 + i * 300,
          duration: 380,
          ease: 'Back.Out',
          onStart: () => {
            services.audio.play('star');
            const m = b.getWorldTransformMatrix();
            fx.starBurst(m.tx + s.x * b.scaleX, m.ty + s.y * b.scaleY, 10);
          },
        });
      }
    });

    const score = this.add.text(0, d.win ? 140 : 100, `Score ${d.score}`, textStyle(48, '#fff27a')).setOrigin(0.5);
    b.add(score);
    if (!d.win) b.add(this.add.text(0, 180, 'So close! Try again.', bodyStyle(30)).setOrigin(0.5));
    if (d.newBest) {
      const best = this.add.text(20, 190, 'New best!', textStyle(30, '#ff9fd0')).setOrigin(0.5);
      const cup = this.add.image(-90, 188, 'trophy');
      cup.setScale(54 / cup.width);
      b.add([cup, best]);
      this.tweens.add({ targets: [best, cup], scale: '*=1.15', duration: 400, yoyo: true, repeat: -1 });
    } else if (d.win && d.bestCombo >= 2) {
      b.add(this.add.text(0, 190, `Best combo x${d.bestCombo}`, bodyStyle(28)).setOrigin(0.5));
    }
    if (d.win) {
      const coin = this.add.image(-50, 240, 'ic_coin');
      coin.setScale(48 / coin.width);
      const coinText = this.add.text(-20, 240, '+0', textStyle(40)).setOrigin(0, 0.5);
      b.add([coin, coinText]);
      const counter = { v: 0 };
      this.tweens.add({
        targets: counter,
        v: d.coins,
        delay: 1300,
        duration: 600,
        onStart: () => services.audio.play('coin'),
        onUpdate: () => coinText.setText(`+${Math.round(counter.v)}`),
      });
      this.time.delayedCall(400, () => fx.confetti(this.scale.width / 2, this.scale.height, 90));
    }

    const main = new Button(this, {
      x: 0,
      y: 330,
      texture: 'btn_green',
      width: 300,
      height: 100,
      label: d.win ? 'Next' : 'Retry',
      icon: d.win ? 'ic_play' : 'ic_restart',
      fontSize: 44,
      onClick: () => this.restartGame(d.win ? d.level + 1 : d.level),
    });
    const replay = iconButton(this, -220, 330, 96, 'ic_restart', () => this.restartGame(d.level)).setVisible(d.win);
    const home = iconButton(this, 220, 330, 96, 'ic_home', () => {
      this.scene.stop('Game');
      this.scene.start('Menu');
    });
    b.add([main, replay, home]);
  }

  private leaving = false;

  /** A level transition is a natural pause: show an interstitial (the platform rate-limits them), then go. */
  private restartGame(level: number): void {
    if (this.leaving) return;
    this.leaving = true;
    void platform.showInterstitial('level_end').then(() => {
      this.scene.get('Game').scene.restart({ level });
      this.scene.stop();
    });
  }
}
