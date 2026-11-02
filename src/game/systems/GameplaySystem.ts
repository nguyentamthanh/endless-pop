import { cloneState, completedCount, goalColumns, hasIce, isWin, restoreState } from '../core/Board';
import { GeneratedLevel } from '../core/LevelGenerator';
import { applyMove, hasLegalMove, liftCount, moveCount } from '../core/Rules';
import { GameState, HAMMER_FROM, Loc, MoveResult, tileIce, withIce } from '../core/types';
import { ScoreGain, ScoreSystem } from './ScoreSystem';

export type BoosterKind = 'undo' | 'hammer' | 'slot';

export const BOOSTER_START: Record<BoosterKind, number> = { undo: 3, hammer: 1, slot: 1 };
export const BOOSTER_PRICE: Record<BoosterKind, number> = { undo: 40, hammer: 80, slot: 80 };

interface HistoryEntry {
  state: GameState;
  points: number;
  columns: number;
}

/** Sort rules + history + boosters for one level run. Knows nothing about rendering. */
export class GameplaySystem {
  readonly level: GeneratedLevel;
  readonly state: GameState;
  readonly score = new ScoreSystem();
  readonly goal: number;
  charges: Record<BoosterKind, number> = { ...BOOSTER_START };
  private history: HistoryEntry[] = [];

  constructor(level: GeneratedLevel) {
    this.level = level;
    this.state = cloneState(level.state);
    this.goal = goalColumns(level.state);
  }

  lift = (loc: Loc): number => liftCount(this.state, loc);
  count = (from: Loc, to: Loc): number => moveCount(this.state, from, to);

  get completed(): number {
    return completedCount(this.state);
  }

  move(from: Loc, to: Loc): { result: MoveResult; gain: ScoreGain } {
    const snapshot = cloneState(this.state);
    const result = applyMove(this.state, from, to);
    const gain = this.score.onMove(result);
    this.history.push({ state: snapshot, points: gain.points, columns: result.completed.length });
    if (this.history.length > 200) this.history.shift();
    return { result, gain };
  }

  canUndo = (): boolean => this.history.length > 0;

  undo(): boolean {
    const entry = this.history.pop();
    if (!entry) return false;
    const open = this.state.trayOpen;
    restoreState(this.state, entry.state);
    this.state.trayOpen = Math.max(this.state.trayOpen, open);
    this.score.rewind(entry.points, entry.columns);
    this.use('undo');
    return true;
  }

  /** Hammer is taught from level 51. Breaks the highest iced tile in a column, hidden or not. */
  get hammerUnlocked(): boolean {
    return this.level.def.id >= HAMMER_FROM;
  }

  hasIce = (): boolean => hasIce(this.state);

  hammer(col: number): boolean {
    if (!this.hammerUnlocked || this.charges.hammer <= 0) return false;
    const c = this.state.cols[col];
    if (!c) return false;
    for (let i = c.length - 1; i >= 0; i--) {
      if (tileIce(c[i]) > 0) {
        this.history.push({ state: cloneState(this.state), points: 0, columns: 0 });
        c[i] = withIce(c[i], 0);
        this.use('hammer');
        return true;
      }
    }
    return false;
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

  /** Lost only when nothing can move. Recovery boosters are checked by the scene before ending. */
  get stuck(): boolean {
    return !this.won && !hasLegalMove(this.state);
  }

  /** True when undo, a tray slot, or the hammer can still change the board. */
  canRecover(coins: number): boolean {
    if (this.canUndo() && (this.charges.undo > 0 || coins >= BOOSTER_PRICE.undo)) return true;
    if (this.canUnlockSlot() && (this.charges.slot > 0 || coins >= BOOSTER_PRICE.slot)) return true;
    if (this.hammerUnlocked && this.hasIce() && (this.charges.hammer > 0 || coins >= BOOSTER_PRICE.hammer)) return true;
    return false;
  }

  private use(kind: BoosterKind): void {
    this.charges[kind] = Math.max(0, this.charges[kind] - 1);
    this.score.boostersUsed++;
  }
}
