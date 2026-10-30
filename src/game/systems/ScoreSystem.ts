import { MoveResult } from '../core/types';

export const POINTS_PER_TILE = 10;
/** A clear within this many moves of the previous one keeps the combo alive. */
export const COMBO_WINDOW = 2;

export interface ScoreGain {
  points: number;
  /** 0 when the move cleared nothing; 1 for a plain clear, 2+ for combos. */
  combo: number;
  multiplier: number;
}

export class ScoreSystem {
  score = 0;
  cleared = 0;
  moves = 0;
  boostersUsed = 0;
  bestCombo = 0;
  private streak = 0;
  private movesSinceClear = 0;

  onMove(result: MoveResult): ScoreGain {
    this.moves++;
    const tiles = result.clears.reduce((n, c) => n + c.tiles.length, 0);
    if (tiles === 0) {
      this.movesSinceClear++;
      if (this.movesSinceClear > COMBO_WINDOW) this.streak = 0;
      return { points: 0, combo: 0, multiplier: 1 };
    }
    // Every extra run popped by the same move counts as a combo step too.
    this.streak = (this.streak > 0 && this.movesSinceClear <= COMBO_WINDOW ? this.streak : 0) + result.clears.length;
    this.movesSinceClear = 0;
    this.bestCombo = Math.max(this.bestCombo, this.streak);
    const multiplier = 1 + 0.5 * (this.streak - 1);
    const points = Math.round(tiles * POINTS_PER_TILE * multiplier);
    this.score += points;
    this.cleared += tiles;
    return { points, combo: this.streak, multiplier };
  }

  /** Undo rewinds the score of the undone move (passed in by the caller). */
  rewind(points: number, tiles: number): void {
    this.score = Math.max(0, this.score - points);
    this.cleared = Math.max(0, this.cleared - tiles);
    this.streak = 0;
    this.movesSinceClear = 0;
  }

  stars(): number {
    if (this.boostersUsed === 0) return 3;
    return this.boostersUsed <= 2 ? 2 : 1;
  }

  coinsFor(stars: number): number {
    return 10 + stars * 10;
  }
}
