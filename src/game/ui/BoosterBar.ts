import Phaser from 'phaser';
import { BOOSTER_PRICE, BoosterKind } from '../systems/GameplaySystem';
import { Button } from './Button';

/** Undo (left of the tray) and Shuffle (right of the tray). Extra Slot lives on the locked tray slot. */
export class BoosterBar {
  readonly undo: Button;
  readonly shuffle: Button;

  constructor(scene: Phaser.Scene, onUse: (kind: BoosterKind) => void) {
    const make = (kind: BoosterKind, texture: string, icon: string) =>
      new Button(scene, { x: 0, y: 0, texture, width: 100, height: 100, icon, iconScale: 0.62, sfx: 'booster', onClick: () => onUse(kind) }).setDepth(400);
    this.undo = make('undo', 'btn_round', 'ic_undo');
    this.shuffle = make('shuffle', 'btn_round', 'ic_shuffle');
  }

  layout(undoX: number, shuffleX: number, y: number, size: number): void {
    this.undo.setPosition(undoX, y).setBaseScale(size / 100);
    this.shuffle.setPosition(shuffleX, y).setBaseScale(size / 100);
  }

  /** Badge shows remaining charges, or the coin price once they run out. */
  refresh(charges: Record<BoosterKind, number>, canUndo: boolean): void {
    const label = (k: BoosterKind) => (charges[k] > 0 ? `${charges[k]}` : `${BOOSTER_PRICE[k]}`);
    this.undo.setBadge(label('undo'), charges.undo > 0 ? 0xff4d6d : 0xf0a500).setEnabled(canUndo);
    this.shuffle.setBadge(label('shuffle'), charges.shuffle > 0 ? 0xff4d6d : 0xf0a500);
  }
}
