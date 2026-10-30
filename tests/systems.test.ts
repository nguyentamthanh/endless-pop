import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../src/game/config/levels';
import { cloneState, tileCount } from '../src/game/core/Board';
import { generateLevel } from '../src/game/core/LevelGenerator';
import { mulberry32 } from '../src/game/core/rng';
import { MoveResult, makeTile } from '../src/game/core/types';
import { BOOSTER_PRICE, GameplaySystem } from '../src/game/systems/GameplaySystem';
let nextTileId = 5000;
import { ScoreSystem } from '../src/game/systems/ScoreSystem';

const clearOf = (n: number, runs = 1): MoveResult => ({
  from: { kind: 'col', index: 0 },
  to: { kind: 'col', index: 1 },
  moved: [],
  revealed: [],
  clears: Array.from({ length: runs }, () => ({ col: 1, tiles: Array.from({ length: n }, (_, i) => makeTile(i + 1, 0)) })),
});

describe('ScoreSystem', () => {
  it('scores 10 per tile with no combo on a first clear', () => {
    const s = new ScoreSystem();
    const gain = s.onMove(clearOf(4));
    expect(gain).toEqual({ points: 40, combo: 1, multiplier: 1 });
    expect(s.score).toBe(40);
    expect(s.cleared).toBe(4);
  });

  it('chains combos across consecutive clearing moves and applies 0.5 steps', () => {
    const s = new ScoreSystem();
    s.onMove(clearOf(4));
    const second = s.onMove(clearOf(4));
    expect(second.combo).toBe(2);
    expect(second.multiplier).toBe(1.5);
    expect(second.points).toBe(60);
  });

  it('counts every run popped by one move (cascade) as a combo step', () => {
    const s = new ScoreSystem();
    const gain = s.onMove(clearOf(4, 2));
    expect(gain.combo).toBe(2);
    expect(gain.points).toBe(Math.round(8 * 10 * 1.5));
  });

  it('drops the combo after more than two quiet moves', () => {
    const s = new ScoreSystem();
    s.onMove(clearOf(4));
    for (let i = 0; i < 3; i++) s.onMove(clearOf(0, 0));
    expect(s.onMove(clearOf(4)).combo).toBe(1);
  });

  it('awards stars by booster usage and coins by stars', () => {
    const s = new ScoreSystem();
    expect(s.stars()).toBe(3);
    s.boostersUsed = 2;
    expect(s.stars()).toBe(2);
    s.boostersUsed = 3;
    expect(s.stars()).toBe(1);
    expect(s.coinsFor(3)).toBe(40);
    expect(s.coinsFor(1)).toBe(20);
  });
});

describe('dead ends', () => {
  const fake = (cols: number[][], tray: number[][]) => {
    const state = {
      cols: cols.map((c) => c.map((t) => makeTile(nextTileId++, t))),
      hidden: cols.map(() => 0),
      tray: [...tray.map((t) => t.map((x) => makeTile(nextTileId++, x))), []].slice(0, 4),
      trayOpen: 3,
      cfg: { maxHeight: 8, clearCount: 4, trayCapacity: 3, traySize: 4 },
    };
    while (state.tray.length < 4) state.tray.push([]);
    return new GameplaySystem({ state, def: {}, iconMap: [], seedUsed: 0, solution: null } as never);
  };

  it('declares a loss when moves exist but the board can never be cleared', () => {
    // Only three tiles of type 0 exist and four are needed to pop, so no sequence of moves can win.
    const g = fake([[0, 0, 0]], [[1], [2]]);
    expect(g.stuck).toBe(true);
  });

  it('does not call a winnable cramped board lost', () => {
    const g = fake([[0, 0, 0, 0, 1], [1]], [[1], [1]]);
    expect(g.stuck).toBe(false);
  });

  it('skips the search when there is room to move', () => {
    const g = fake([[0, 0, 0], []], [[1]]);
    expect(g.isDeadEnd()).toBe(false);
  });
});

describe('GameplaySystem', () => {
  const level = generateLevel(CAMPAIGN[0]);

  it('plays the stored solution to a win with full stars', () => {
    const g = new GameplaySystem(level);
    for (const [from, to] of level.solution!) g.move(from, to);
    expect(g.won).toBe(true);
    expect(g.score.cleared).toBe(g.totalTiles);
    expect(g.score.stars()).toBe(3);
  });

  it('undo restores board, score and costs a charge', () => {
    const g = new GameplaySystem(level);
    const before = cloneState(g.state);
    const [from, to] = level.solution![0];
    g.move(from, to);
    expect(g.canUndo()).toBe(true);
    expect(g.undo()).toBe(true);
    expect(g.state.cols).toEqual(before.cols);
    expect(g.score.score).toBe(0);
    expect(g.charges.undo).toBe(2);
    expect(g.score.boostersUsed).toBe(1);
    expect(g.undo()).toBe(false);
  });

  it('undo rewinds the points of a clearing move', () => {
    const g = new GameplaySystem(level);
    for (const [from, to] of level.solution!) {
      g.move(from, to);
      if (g.score.score > 0) break;
    }
    expect(g.score.score).toBeGreaterThan(0);
    const cleared = g.score.cleared;
    g.undo();
    expect(g.score.cleared).toBeLessThan(cleared);
  });

  it('unlocks the extra tray slot once and keeps tile count', () => {
    const g = new GameplaySystem(level);
    const n = tileCount(g.state);
    expect(g.state.trayOpen).toBe(3);
    expect(g.unlockSlot()).toBe(true);
    expect(g.state.trayOpen).toBe(4);
    expect(g.canUnlockSlot()).toBe(false);
    expect(g.unlockSlot()).toBe(false);
    expect(tileCount(g.state)).toBe(n);
  });

  it('shuffle keeps tile count, can be undone, and counts as a booster', () => {
    const g = new GameplaySystem(generateLevel(CAMPAIGN[9]));
    const n = tileCount(g.state);
    const before = cloneState(g.state);
    expect(g.shuffle(mulberry32(3))).toBe(true);
    expect(tileCount(g.state)).toBe(n);
    expect(g.charges.shuffle).toBe(0);
    g.undo();
    expect(g.state.cols).toEqual(before.cols);
  });

  it('canRescue depends on charges and coins', () => {
    const g = new GameplaySystem(level);
    expect(g.canRescue(0)).toBe(true); // free shuffle
    g.charges = { undo: 0, shuffle: 0, slot: 0 };
    expect(g.canRescue(0)).toBe(false);
    expect(g.canRescue(BOOSTER_PRICE.shuffle)).toBe(true);
  });
});
