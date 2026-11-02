import Phaser from 'phaser';
import { bodyStyle, COLORS } from '../config/theme';
import { sameLoc } from '../core/Rules';
import { Move } from '../core/Solver';
import { Loc } from '../core/types';
import { BoardView } from '../ui/BoardView';
import { platform } from './PlatformService';
import { services } from './Services';

const COPY = [
  ['Drag or tap the top treats', 'Drop them on a match\nor an empty column'],
  ['Nice! Pick up another stack', 'Drop it on a matching tile'],
];

/** Guided first moves on level 1: a hand points at the source, then the destination. Other taps are ignored. */
export class TutorialSystem {
  active = true;
  private step = 0;
  private phase: 0 | 1 = 0;
  private hand: Phaser.GameObjects.Image;
  private bubble: Phaser.GameObjects.Container;
  private bubbleBg: Phaser.GameObjects.Graphics;
  private bubbleText: Phaser.GameObjects.Text;
  private bubbleY = 0;
  private handTween?: Phaser.Tweens.Tween;

  constructor(
    private scene: Phaser.Scene,
    private view: BoardView,
    private moves: Move[],
  ) {
    this.hand = scene.add.image(0, 0, 'ic_hand').setOrigin(0.3, 0.05).setDepth(1500);
    this.hand.setScale(110 / this.hand.width);
    this.bubbleBg = scene.add.graphics();
    this.bubbleText = scene.add.text(0, 0, '', bodyStyle(32)).setOrigin(0.5);
    this.bubble = scene.add.container(0, 0, [this.bubbleBg, this.bubbleText]).setDepth(1500);
    this.moves = moves.slice(0, COPY.length);
  }

  layout(centerX: number, bubbleY: number): void {
    this.bubble.setX(centerX);
    this.bubbleY = bubbleY;
    this.bubble.setY(bubbleY);
    if (this.active) this.show();
  }

  /** Called before a tap is processed. */
  allow(loc: Loc): boolean {
    if (!this.active) return true;
    const ok = sameLoc(loc, this.moves[this.step][this.phase]);
    if (!ok) {
      services.audio.play('invalid');
      this.scene.tweens.add({ targets: this.hand, scale: this.hand.scale * 1.25, duration: 110, yoyo: true });
    }
    return ok;
  }

  onSelected(): void {
    if (!this.active) return;
    this.phase = 1;
    this.show();
  }

  /** Selection was put back down without a move. */
  onCancelled(): void {
    if (!this.active || this.phase === 0) return;
    this.phase = 0;
    this.show();
  }

  onMoved(): void {
    if (!this.active) return;
    this.step++;
    this.phase = 0;
    if (this.step >= this.moves.length) {
      this.finish();
      return;
    }
    this.show();
  }

  private show(): void {
    const target = this.moves[this.step][this.phase];
    const p = this.view.stackTopPos(target);
    this.say(COPY[this.step][this.phase]);
    this.handTween?.remove();
    this.hand.setVisible(true).setPosition(p.x, p.y + 10);
    this.handTween = this.scene.tweens.add({ targets: this.hand, y: p.y + 34, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private say(text: string): void {
    this.bubbleText.setText(text);
    const w = this.bubbleText.width + 56;
    const h = this.bubbleText.height + 32;
    this.bubbleBg
      .clear()
      .fillStyle(COLORS.outline)
      .fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 24)
      .fillStyle(0xffffff)
      .fillRoundedRect(-w / 2, -h / 2, w, h, 24);
    this.bubble.setVisible(true).setScale(0.85).setY(this.bubbleY);
    this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: 260, ease: 'Back.Out' });
  }

  private finish(): void {
    this.active = false;
    this.handTween?.remove();
    this.hand.setVisible(false);
    this.say('Fill each column with 12 alike.\nEmpty the tray to win.');
    services.save.update({ tutorialDone: true });
    platform.track('tutorial_completed');
    this.scene.time.delayedCall(3200, () =>
      this.scene.tweens.add({ targets: this.bubble, alpha: 0, duration: 300, onComplete: () => this.bubble.setVisible(false) }),
    );
  }
}
