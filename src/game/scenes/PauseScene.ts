import Phaser from 'phaser';
import { bodyStyle } from '../config/theme';
import { platform } from '../systems/PlatformService';
import { services } from '../systems/Services';
import { Button, iconButton } from '../ui/Button';
import { Panel } from '../ui/Panel';

/** Overlay over a paused GameScene. Music stays silent until Resume. */
export class PauseScene extends Phaser.Scene {
  private level = 1;

  constructor() {
    super('Pause');
  }

  init(data: { level: number }): void {
    this.level = data.level;
  }

  create(): void {
    const panel = new Panel(this, { width: 560, height: 720, title: 'Paused' }).open();
    const btn = (y: number, texture: string, label: string, icon: string, onClick: () => void) =>
      new Button(this, { x: 0, y, texture, width: 400, height: 100, label, icon, fontSize: 40, onClick });
    const resume = btn(-170, 'btn_green', 'Resume', 'ic_play', () => panel.close(() => this.resume()));
    const restart = btn(-50, 'btn_yellow', 'Restart', 'ic_restart', () => this.leave(() => this.scene.get('Game').scene.restart({ level: this.level })));
    const home = btn(70, 'btn_blue', 'Home', 'ic_home', () =>
      this.leave(() => {
        this.scene.stop('Game');
        this.scene.start('Menu');
      }),
    );
    const sound = iconButton(this, -90, 220, 96, services.audio.isSoundOn() ? 'ic_sound_on' : 'ic_sound_off', () => {
      const on = !services.audio.isSoundOn();
      services.audio.setSound(on);
      services.save.update({ sound: on });
      sound.setIcon(on ? 'ic_sound_on' : 'ic_sound_off');
    });
    const music = iconButton(this, 90, 220, 96, services.audio.isMusicOn() ? 'ic_music_on' : 'ic_music_off', () => {
      const on = !services.audio.isMusicOn();
      services.audio.setMusic(on);
      services.save.update({ music: on });
      music.setIcon(on ? 'ic_music_on' : 'ic_music_off');
    });
    const hint = this.add.text(0, 290, 'Sound      Music', bodyStyle(26)).setOrigin(0.5);
    panel.content.add([resume, restart, home, sound, music, hint]);
  }

  private resume(): void {
    services.audio.setPaused(false);
    platform.message('level_resumed', this.level);
    this.scene.resume('Game');
    this.scene.stop();
  }

  private leave(next: () => void): void {
    services.audio.setPaused(false);
    this.scene.stop();
    next();
  }
}
