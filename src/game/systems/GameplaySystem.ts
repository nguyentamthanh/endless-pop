import { cloneState, isWin, restoreState, tileCount } from '../core/Board';
import { GeneratedLevel } from '../core/LevelGenerator';
import { Rng } from '../core/rng';
import { applyMove, hasLegalMove, liftCount, moveCount, shuffleFaceUp } from '../core/Rules';
import { GameState, Loc, MoveResult } from '../core/types';
import { ScoreGain, ScoreSystem } from './ScoreSystem';

export type BoosterKind = 'undo' | 'shuffle' | 'slot';

export const BOOSTER_START: Record<BoosterKind, number> = { undo: 3, shuffle: 1, slot: 1 };
export const BOOSTER_PRICE: Record<BoosterKind, number> = { undo: 40, shuffle: 60, slot: 80 };

interface HistoryEntry {
  state: GameState;
  points: number;
  tiles: number;
}

/** Game rules + history + boosters for one level run. Knows nothing about rendering. */
export class GameplaySystem {
  readonly level: GeneratedLevel;
  readonly state: GameState;
  readonly score = new ScoreSystem();
  readonly totalTiles: number;
  charges: Record<BoosterKind, number> = { ...BOOSTER_START };
  private history: HistoryEntry[] = [];

  constructor(level: GeneratedLevel) {
    this.level = level;
    this.state = cloneState(level.state);
    this.totalTiles = tileCount(level.state);
  }

  lift = (loc: Loc): number => liftCount(this.state, loc);
  count = (from: Loc, to: Loc): number => moveCount(this.state, from, to);

  move(from: Loc, to: Loc): { result: MoveResult; gain: ScoreGain } {
    const snapshot = cloneState(this.state);
    const result = applyMove(this.state, from, to);
    const gain = this.score.onMove(result);
    const tiles = result.clears.reduce((n, c) => n + c.tiles.length, 0);
    this.history.push({ state: snapshot, points: gain.points, tiles });
    if (this.history.length > 200) this.history.shift();
    return { result, gain };
  }

  canUndo = (): boolean => this.history.length > 0;

  undo(): boolean {
    const entry = this.history.pop();
    if (!entry) return false;
    restoreState(this.state, entry.state);
    this.score.rewind(entry.points, entry.tiles);
    this.use('undo');
    return true;
  }

  shuffle(rng: Rng): boolean {
    const next = shuffleFaceUp(this.state, rng);
    if (!next) return false;
    this.history.push({ state: cloneState(this.state), points: 0, tiles: 0 });
    restoreState(this.state, next);
    this.use('shuffle');
    return true;
  }

  canUnlockSlot = (): boolean => this.state.trayOpen < this.state.cfg.traySize;

  unlockSlot(): boolean {
    if (!this.canUnlockSlot()) return false;
    this.state.trayOpen++;
    this.use('slot');
    return true;
  }

  get won(): boolean {
    return isWin(this.state);
  }

  get stuck(): boolean {
    return !this.won && !hasLegalMove(this.state);
  }

  /** Whether any booster could still change a stuck position. */
  canRescue(coins: number): boolean {
    const affordable = (k: BoosterKind) => this.charges[k] > 0 || coins >= BOOSTER_PRICE[k];
    return (
      (this.canUndo() && affordable('undo')) ||
      affordable('shuffle') ||
      (this.canUnlockSlot() && affordable('slot'))
    );
  }

  private use(kind: BoosterKind): void {
    this.charges[kind] = Math.max(0, this.charges[kind] - 1);
    this.score.boostersUsed++;
  }
}
