import { MoveResult } from '../core/types';

export const POINTS_PER_COLUMN = 120;
/** A sort within this many moves of the previous one keeps the combo alive. */
export const COMBO_WINDOW = 2;

export interface ScoreGain {
  points: number;
  /** 0 when the move completed nothing; 1 for a plain sort, 2+ for combos. */
  combo: number;
  multiplier: number;
}

export class ScoreSystem {
  score = 0;
  /** Columns completed. */
  cleared = 0;
  moves = 0;
  boostersUsed = 0;
  bestCombo = 0;
  private streak = 0;
  private movesSinceClear = 0;

  onMove(result: MoveResult): ScoreGain {
    this.moves++;
    const n = result.completed.length;
    if (n === 0) {
      this.movesSinceClear++;
      if (this.movesSinceClear > COMBO_WINDOW) this.streak = 0;
      return { points: 0, combo: 0, multiplier: 1 };
    }
    this.streak = (this.streak > 0 && this.movesSinceClear <= COMBO_WINDOW ? this.streak : 0) + n;
    this.movesSinceClear = 0;
    this.bestCombo = Math.max(this.bestCombo, this.streak);
    const multiplier = 1 + 0.5 * (this.streak - 1);
    const points = Math.round(n * POINTS_PER_COLUMN * multiplier);
    this.score += points;
    this.cleared += n;
    return { points, combo: this.streak, multiplier };
  }

  /** Undo rewinds the score of the undone move (passed in by the caller). */
  rewind(points: number, columns: number): void {
    this.score = Math.max(0, this.score - points);
    this.cleared = Math.max(0, this.cleared - columns);
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
