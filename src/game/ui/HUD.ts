import Phaser from 'phaser';
import { COLORS, textStyle } from '../config/theme';
import { Mascot } from '../entities/Mascot';
import { iconButton, Button } from './Button';
import { ProgressBar } from './ProgressBar';

export const HUD_HEIGHT = 200;

/** Top bar: pause, level, score, coins, Moo and the board-clear progress. */
export class HUD {
  readonly mascot: Mascot;
  readonly pauseBtn: Button;
  private levelText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private coinIcon: Phaser.GameObjects.Image;
  private coinText: Phaser.GameObjects.Text;
  private coinPill: Phaser.GameObjects.Graphics;
  private bar: ProgressBar;
  private barText: Phaser.GameObjects.Text;
  private goalText: Phaser.GameObjects.Text;
  private shownScore = 0;

  constructor(private scene: Phaser.Scene, levelLabel: string, onPause: () => void) {
    this.pauseBtn = iconButton(scene, 0, 0, 84, 'ic_pause', onPause).setDepth(500);
    this.levelText = scene.add.text(0, 0, levelLabel, textStyle(40)).setOrigin(0.5).setDepth(500);
    this.scoreText = scene.add.text(0, 0, 'Score 0', textStyle(28, '#fff27a')).setOrigin(0.5).setDepth(500);
    this.coinPill = scene.add.graphics().setDepth(499);
    this.coinIcon = scene.add.image(0, 0, 'ic_coin').setDepth(500);
    this.coinText = scene.add.text(0, 0, '0', textStyle(30)).setOrigin(0, 0.5).setDepth(500);
    this.bar = new ProgressBar(scene, 0, 0, 300, 30, COLORS.green).setDepth(500);
    this.barText = scene.add.text(0, 0, '', textStyle(22)).setOrigin(0.5).setDepth(501);
    this.goalText = scene.add.text(0, 0, '', textStyle(24)).setOrigin(0.5).setDepth(501);
    this.mascot = new Mascot(scene, 0, 0, 120).setDepth(500);
  }

  layout(w: number, top: number): void {
    const y1 = top + 52;
    const y2 = top + 140;
    this.pauseBtn.setPosition(58, y1);
    this.levelText.setPosition(w / 2, y1 - 6);
    this.scoreText.setPosition(w / 2, y1 + 36);
    this.coinIcon.setPosition(w - 150, y1).setScale(46 / this.coinIcon.width);
    this.coinText.setPosition(w - 122, y1);
    this.coinPill.clear().fillStyle(COLORS.shadow, 0.35).fillRoundedRect(w - 180, y1 - 26, 160, 52, 26);
    this.mascot.setPosition(80, y2 - 10);
    const barW = Math.min(w - 230, 460);
    this.bar.setPosition(w / 2 + 45, y2 + 18).resize(barW);
    this.barText.setPosition(w / 2 + 45, y2 + 16);
    this.goalText.setPosition(w / 2 + 45, y2 - 22);
  }

  setGoal(clearCount: number): void {
    this.goalText.setText(`Stack ${clearCount} alike to pop`);
  }

  setCoins(n: number): void {
    this.coinText.setText(`${n}`);
  }

  setProgress(cleared: number, total: number, animate = true): void {
    this.bar.setValue(total ? cleared / total : 0, animate);
    this.barText.setText(`${cleared} / ${total}`);
  }

  setScore(score: number): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      shownScore: score,
      duration: 350,
      onUpdate: () => this.scoreText.setText(`Score ${Math.round(this.shownScore)}`),
    });
    if (score > 0) this.scene.tweens.add({ targets: this.scoreText, scale: 1.2, duration: 90, yoyo: true });
  }

  bumpCoins(): void {
    this.scene.tweens.add({ targets: [this.coinIcon], scale: this.coinIcon.scale * 1.3, duration: 100, yoyo: true });
  }
}
