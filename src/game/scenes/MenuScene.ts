import Phaser from 'phaser';
import { COLORS, bodyStyle, textStyle } from '../config/theme';
import { Mascot } from '../entities/Mascot';
import { levelLabel } from '../systems/LevelSystem';
import { platform } from '../systems/PlatformService';
import { services } from '../systems/Services';
import { Button, iconButton } from '../ui/Button';
import { onLayout, safeInsets } from '../ui/layout';
import { Panel } from '../ui/Panel';
import { Backdrop } from '../ui/Backdrop';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const save = services.save;
    const backdrop = new Backdrop(this, 'bg_sky', true);
    const titleTop = this.add.text(0, 0, 'ENDLESS', textStyle(96, '#ffffff', '#6b4423')).setOrigin(0.5);
    const titleBottom = this.add.text(0, 0, 'POP!', textStyle(140, '#ffffff', '#6b4423')).setOrigin(0.5);
    this.gradient(titleTop, ['#ffb3d9', '#ff5fa2']);
    this.gradient(titleBottom, ['#fff27a', '#ffb300']);
    this.tweens.add({ targets: titleBottom, angle: { from: -3, to: 3 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: [titleTop, titleBottom], scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const moo = new Mascot(this, 0, 0, 430);
    const mooHit = this.add.zone(0, 0, 300, 360).setInteractive();
    mooHit.on('pointerdown', () => {
      services.audio.play('pop', 4);
      moo.setMood('happy', 900);
    });

    const next = save.get().unlocked;
    const play = new Button(this, { x: 0, y: 0, texture: 'btn_green', width: 380, height: 128, label: 'PLAY', fontSize: 60, onClick: () => this.go('Game', { level: next }) });
    const levelInfo = this.add.text(0, 0, levelLabel(next), textStyle(30, '#fff27a')).setOrigin(0.5);
    const levels = new Button(this, { x: 0, y: 0, texture: 'btn_blue', width: 300, height: 96, label: 'LEVELS', icon: 'ic_levels', fontSize: 38, onClick: () => this.go('LevelSelect') });
    this.tweens.add({ targets: play, scaleX: 1.05, scaleY: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const settings = iconButton(this, 0, 0, 88, 'ic_settings', () => this.openSettings());
    const sound = iconButton(this, 0, 0, 88, save.get().sound ? 'ic_sound_on' : 'ic_sound_off', () => {
      const on = !services.audio.isSoundOn();
      services.audio.setSound(on);
      save.update({ sound: on });
      sound.setIcon(on ? 'ic_sound_on' : 'ic_sound_off');
    });

    const statsBg = this.add.graphics();
    const coinIcon = this.add.image(0, 0, 'ic_coin');
    const coinText = this.add.text(0, 0, `${save.get().coins}`, textStyle(32)).setOrigin(0, 0.5);
    const starIcon = this.add.image(0, 0, 'ic_star');
    const starText = this.add.text(0, 0, `${save.totalStars()}`, textStyle(32)).setOrigin(0, 0.5);
    const best = this.add.text(0, 0, `Best score: ${save.bestOverall()}`, textStyle(28)).setOrigin(0.5);

    onLayout(this, (w, h) => {
      const ins = safeInsets(this);
      const top = ins.top;
      const bottom = ins.bottom;
      backdrop.layout(w, h);
      settings.setPosition(62 + ins.left, top + 62);
      sound.setPosition(w - 62 - ins.right, top + 62);
      statsBg.clear().fillStyle(COLORS.shadow, 0.3).fillRoundedRect(w / 2 - 170, top + 36, 340, 54, 27);
      coinIcon.setPosition(w / 2 - 135, top + 63).setScale(44 / coinIcon.width);
      coinText.setPosition(w / 2 - 105, top + 63);
      starIcon.setPosition(w / 2 + 35, top + 63).setScale(44 / starIcon.width);
      starText.setPosition(w / 2 + 65, top + 63);
      best.setPosition(w / 2, h - bottom - 34);

      if (w > h * 1.05) {
        // Wide screens: Moo on the left half, title and buttons on the right half.
        const colX = w * 0.64;
        moo.setSize2(Math.min(560, h * 0.5));
        moo.setPosition(w * 0.32, h * 0.52);
        const titleY = top + h * 0.2;
        titleTop.setPosition(colX, titleY);
        titleBottom.setPosition(colX, titleY + 120);
        const playY = titleY + 360;
        play.setPosition(colX, playY);
        levelInfo.setPosition(colX, playY + 86);
        levels.setPosition(colX, playY + 168);
      } else {
        moo.setSize2(430);
        const titleY = top + Math.max(170, h * 0.15);
        titleTop.setPosition(w / 2, titleY);
        titleBottom.setPosition(w / 2, titleY + 120);
        const playY = h - bottom - Math.max(250, h * 0.2);
        moo.setPosition(w / 2, Math.min(playY - 280, titleY + 420));
        play.setPosition(w / 2, playY);
        levelInfo.setPosition(w / 2, playY + 86);
        levels.setPosition(w / 2, playY + 168);
      }
      mooHit.setPosition(moo.x, moo.y);
    });
    this.cameras.main.fadeIn(250, 143, 211, 255);
    // First playable frame: loading is over and the player can tap Play.
    platform.gameReady();
  }

  private gradient(t: Phaser.GameObjects.Text, stops: string[]): void {
    const g = t.context.createLinearGradient(0, 0, 0, t.height);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    t.setFill(g);
  }

  private go(scene: string, data?: object): void {
    this.input.enabled = false;
    this.cameras.main.fadeOut(220, 143, 211, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scene, data));
  }

  private openSettings(): void {
    const save = services.save;
    const panel = new Panel(this, { width: 560, height: 620, title: 'Settings' }).open();
    const row = (y: number, label: string, icons: [string, string], get: () => boolean, set: (on: boolean) => void) => {
      const text = this.add.text(-200, y, label, bodyStyle(38)).setOrigin(0, 0.5);
      const state = this.add.text(60, y, get() ? 'On' : 'Off', bodyStyle(32)).setOrigin(0.5);
      const btn: Button = iconButton(this, 170, y, 96, get() ? icons[0] : icons[1], () => {
        set(!get());
        btn.setIcon(get() ? icons[0] : icons[1]);
        state.setText(get() ? 'On' : 'Off');
      });
      panel.content.add([text, state, btn]);
    };
    row(-160, 'Sound', ['ic_sound_on', 'ic_sound_off'], () => services.audio.isSoundOn(), (on) => {
      services.audio.setSound(on);
      save.update({ sound: on });
    });
    row(-50, 'Music', ['ic_music_on', 'ic_music_off'], () => services.audio.isMusicOn(), (on) => {
      services.audio.setMusic(on);
      save.update({ music: on });
    });
    const tutorial = new Button(this, {
      x: 0,
      y: 70,
      texture: 'btn_blue',
      width: 400,
      height: 84,
      label: 'Replay tutorial',
      fontSize: 32,
      onClick: () => {
        save.update({ tutorialDone: false });
        panel.close(() => this.go('Game', { level: 1 }));
      },
    });
    const reset = new Button(this, {
      x: 0,
      y: 170,
      texture: 'btn_pink',
      width: 400,
      height: 84,
      label: 'Reset progress',
      fontSize: 32,
      onClick: () => this.confirmReset(panel),
    });
    const close = iconButton(this, 250, -280, 76, 'ic_close', () => panel.close());
    panel.content.add([tutorial, reset, close]);
  }

  private confirmReset(parent: Panel): void {
    const panel = new Panel(this, { width: 520, height: 400, title: 'Reset?', depth: 2100 }).open();
    const msg = this.add.text(0, -40, 'All levels, stars and\ncoins will be lost.', bodyStyle(32)).setOrigin(0.5);
    const yes = new Button(this, {
      x: -110,
      y: 90,
      texture: 'btn_pink',
      width: 190,
      height: 80,
      label: 'Reset',
      fontSize: 32,
      onClick: () => {
        services.save.reset();
        panel.close();
        parent.close(() => this.scene.restart());
      },
    });
    const no = new Button(this, { x: 110, y: 90, texture: 'btn_green', width: 190, height: 80, label: 'Keep', fontSize: 32, onClick: () => panel.close() });
    panel.content.add([msg, yes, no]);
  }
}

