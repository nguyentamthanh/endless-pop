import { describe, expect, it } from 'vitest';
import { cloneState } from '../src/game/core/Board';
import { GeneratedLevel } from '../src/game/core/LevelGenerator';
import { GameState, Loc, MoveResult, makeTile, tileIce, tileType, withIce } from '../src/game/core/types';
import { GameplaySystem } from '../src/game/systems/GameplaySystem';
import { ScoreSystem } from '../src/game/systems/ScoreSystem';

let nextId = 1;
const C = (index: number): Loc => ({ kind: 'col', index });

function board(cols: number[][], extra: Partial<GameState> = {}): GameState {
  return {
    cols: cols.map((c) => c.map((t) => makeTile(nextId++, t))),
    hidden: cols.map(() => 0),
    tray: [[], [], [], []],
    trayOpen: 2,
    moves: 0,
    counts: [],
    level: extra.level ?? 1,
    cfg: { maxHeight: 12, traySize: 4 },
    ...extra,
  };
}

function play(state: GameState, id = state.level): GameplaySystem {
  const level: GeneratedLevel = {
    def: { id, seed: 1 },
    state,
    iconMap: [],
    seedUsed: 1,
    solution: null,
    verified: false,
  };
  return new GameplaySystem(level);
}

const sorted = (n = 1): MoveResult => ({
  from: C(0),
  to: C(1),
  moved: [],
  revealed: [],
  completed: Array.from({ length: n }, (_, i) => i),
});

describe('ScoreSystem', () => {
  it('scores 120 for the first completed column', () => {
    const s = new ScoreSystem();
    expect(s.onMove(sorted())).toEqual({ points: 120, combo: 1, multiplier: 1 });
    expect(s.cleared).toBe(1);
  });

  it('chains combos across consecutive sorts', () => {
    const s = new ScoreSystem();
    s.onMove(sorted());
    const second = s.onMove(sorted());
    expect(second.combo).toBe(2);
    expect(second.multiplier).toBe(1.5);
    expect(second.points).toBe(180);
  });

  it('counts every column completed by one move', () => {
    const s = new ScoreSystem();
    const gain = s.onMove(sorted(2));
    expect(gain.combo).toBe(2);
    expect(gain.points).toBe(360);
  });

  it('drops the combo after more than two quiet moves', () => {
    const s = new ScoreSystem();
    s.onMove(sorted());
    for (let i = 0; i < 3; i++) s.onMove(sorted(0));
    expect(s.onMove(sorted()).combo).toBe(1);
  });

  it('awards stars by booster usage', () => {
    const s = new ScoreSystem();
    expect(s.stars()).toBe(3);
    s.boostersUsed = 2;
    expect(s.stars()).toBe(2);
    s.boostersUsed = 3;
    expect(s.stars()).toBe(1);
  });
});

describe('GameplaySystem', () => {
  it('undo restores the board, keeps a newly opened tray slot, and costs a charge', () => {
    const g = play(board([[2, 1, 1], []]));
    const before = cloneState(g.state);
    g.move(C(0), C(1));
    g.charges.slot = 2;
    expect(g.unlockSlot()).toBe(true);
    expect(g.undo()).toBe(true);
    expect(g.state.cols.map((c) => c.map(tileType))).toEqual(before.cols.map((c) => c.map(tileType)));
    expect(g.state.trayOpen).toBe(3);
    expect(g.charges.undo).toBe(2);
    expect(g.unlockSlot()).toBe(true);
    expect(g.state.trayOpen).toBe(4);
    expect(g.canUnlockSlot()).toBe(false);
  });

  it('breaks the highest iced tile with the hammer from level 51', () => {
    const early = board([[1]]);
    early.cols[0][0] = withIce(early.cols[0][0], 1);
    expect(play(early, 1).hammer(0)).toBe(false);

    const iced = board([[1, 2]], { level: 51 });
    iced.cols[0][0] = withIce(iced.cols[0][0], 1);
    iced.cols[0][1] = withIce(iced.cols[0][1], 2);
    const g = play(iced, 51);
    expect(g.hammerUnlocked).toBe(true);
    expect(g.hammer(0)).toBe(true);
    expect(tileIce(g.state.cols[0][1])).toBe(0);
    expect(tileIce(g.state.cols[0][0])).toBe(1);
    expect(g.charges.hammer).toBe(0);
    expect(g.hammer(0)).toBe(false);
  });

  it('is stuck without a legal move, but can recover with a booster', () => {
    const iced = board([[1]], { level: 51 });
    iced.cols[0][0] = withIce(iced.cols[0][0], 1);
    const g = play(iced, 51);
    expect(g.stuck).toBe(true);
    expect(g.won).toBe(false);
    expect(g.canRecover(0)).toBe(true);
    g.charges.hammer = 0;
    g.charges.undo = 0;
    g.charges.slot = 0;
    expect(g.canRecover(0)).toBe(false);
    expect(g.canRecover(80)).toBe(true);
  });
});
