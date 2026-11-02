import Phaser from 'phaser';
import { BOOSTER_PRICE, BoosterKind } from '../systems/GameplaySystem';
import { Button } from './Button';

/** Undo (left of the tray) and Hammer (right, from level 51). Extra Slot lives on the locked tray slot. */
export class BoosterBar {
  readonly undo: Button;
  readonly hammer: Button;

  constructor(scene: Phaser.Scene, onUse: (kind: BoosterKind) => void) {
    const make = (kind: BoosterKind, texture: string, icon: string) =>
      new Button(scene, {
        x: 0,
        y: 0,
        texture,
        width: 100,
        height: 100,
        icon,
        iconScale: 0.62,
        sfx: 'booster',
        onClick: () => onUse(kind),
      }).setDepth(400);
    this.undo = make('undo', 'btn_round', 'ic_undo');
    this.hammer = new Button(scene, {
      x: 0,
      y: 0,
      texture: 'btn_round',
      width: 100,
      height: 100,
      label: '❄',
      fontSize: 48,
      sfx: 'booster',
      onClick: () => onUse('hammer'),
    }).setDepth(400);
  }

  layout(undoX: number, hammerX: number, y: number, size: number): void {
    this.undo.setPosition(undoX, y).setBaseScale(size / 100);
    this.hammer.setPosition(hammerX, y).setBaseScale(size / 100);
  }

  setHammerVisible(on: boolean): void {
    this.hammer.setVisible(on);
  }

  /** Badge shows remaining charges, or the coin price once they run out. */
  refresh(charges: Record<BoosterKind, number>, canUndo: boolean, hammerArmed = false): void {
    const label = (k: BoosterKind) => (charges[k] > 0 ? `${charges[k]}` : `${BOOSTER_PRICE[k]}`);
    this.undo.setBadge(label('undo'), charges.undo > 0 ? 0xff4d6d : 0xf0a500).setEnabled(canUndo);
    this.hammer.setBadge(hammerArmed ? '!' : label('hammer'), charges.hammer > 0 ? 0x7ecbff : 0xf0a500);
  }
}
