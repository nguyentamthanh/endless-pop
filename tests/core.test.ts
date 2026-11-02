import { describe, expect, it } from 'vitest';
import { isComplete, isWin, topRunLength } from '../src/game/core/Board';
import { generateLevel } from '../src/game/core/LevelGenerator';
import { applyMove, moveCount } from '../src/game/core/Rules';
import { levelDef } from '../src/game/config/levels';
import { GameState, Loc, Tile, makeTile, tileIce, tileType, withIce } from '../src/game/core/types';

let nextId = 1;
const C = (index: number): Loc => ({ kind: 'col', index });
const T = (index: number): Loc => ({ kind: 'tray', index });

function state(
  cols: number[][],
  hidden: number[] = [],
  ice: Array<[number, number, number]> = [],
  extra: Partial<GameState> = {},
): GameState {
  const built = cols.map((c) => c.map((t) => makeTile(nextId++, t)));
  for (const [ci, ri, layers] of ice) built[ci][ri] = withIce(built[ci][ri], layers);
  return {
    cols: built,
    hidden: cols.map((_, i) => hidden[i] ?? 0),
    tray: [[], [], [], []],
    trayOpen: 2,
    moves: 0,
    counts: [],
    level: 1,
    cfg: { maxHeight: 12, traySize: 4 },
    ...extra,
  };
}

const types = (tiles: Tile[]) => tiles.map(tileType);

describe('sort rules', () => {
  it('stops a top run at a hidden or frozen tile', () => {
    expect(topRunLength(state([[1, 1, 2, 2, 2]]), 0)).toBe(3);
    expect(topRunLength(state([[2, 2, 2]], [2]), 0)).toBe(1);
    expect(topRunLength(state([[1, 1]], [], [[0, 1, 1]]), 0)).toBe(0);
  });

  it('sends one tile to an empty open tray slot', () => {
    const s = state([[1, 1, 1], []]);
    expect(moveCount(s, C(0), T(0))).toBe(1);
    expect(moveCount(s, C(0), T(2))).toBe(0);
    applyMove(s, C(0), T(0));
    expect(s.tray[0]).toHaveLength(1);
    expect(s.cols[0]).toHaveLength(2);
    expect(moveCount(s, C(0), T(0))).toBe(0);
    expect(moveCount(s, T(0), C(1))).toBe(1);
  });

  it('moves a whole column run or nothing', () => {
    const blocked = state([[1, 1, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]]);
    expect(moveCount(blocked, C(0), C(1))).toBe(0);
    expect(blocked.cols[0]).toHaveLength(3);
  });

  it('refuses to dump a sorted column into an empty one', () => {
    expect(moveCount(state([[1, 1], []]), C(0), C(1))).toBe(0);
    const mixed = state([[2, 1, 1], []]);
    expect(moveCount(mixed, C(0), C(1))).toBe(2);
    applyMove(mixed, C(0), C(1));
    expect(types(mixed.cols[0])).toEqual([2]);
    expect(types(mixed.cols[1])).toEqual([1, 1]);
  });

  it('cracks visible ice beside a newly opened box, then reveals', () => {
    const s = state([[9, 1], [2], []], [1, 0, 0], [[1, 0, 2]]);
    const res = applyMove(s, C(0), C(2));
    expect(types(res.revealed)).toEqual([9]);
    expect(s.hidden[0]).toBe(0);
    expect(tileIce(s.cols[1][0])).toBe(1);
  });

  it('keeps frost on a box that just flipped', () => {
    const s = state([[4, 1], []], [1, 0], [[0, 0, 1]]);
    applyMove(s, C(0), C(1));
    expect(s.hidden[0]).toBe(0);
    expect(tileIce(s.cols[0][0])).toBe(1);
  });

  it('melts one visible ice layer for each column just completed', () => {
    const s = state([Array(11).fill(1), [2], [1]], [], [[1, 0, 1]]);
    const res = applyMove(s, C(2), C(0));
    expect(res.completed).toEqual([0]);
    expect(isComplete(s, 0)).toBe(true);
    expect(tileIce(s.cols[1][0])).toBe(0);
  });

  it('wins when the tray is empty and every column is empty or full of one treat', () => {
    const won = state([[1, 1], [], [2, 2]], [], [], { cfg: { maxHeight: 2, traySize: 4 } });
    expect(isWin(won)).toBe(true);
    won.tray[0] = [makeTile(900, 3)];
    expect(isWin(won)).toBe(false);
    const hiddenFull = state([[1, 1]], [1], [], { cfg: { maxHeight: 2, traySize: 4 } });
    expect(isWin(hiddenFull)).toBe(true);
    expect(isComplete(hiddenFull, 0)).toBe(false);
  });
});

describe('level recipe', () => {
  it('builds an 8-column board with two open tray slots', () => {
    const lvl = generateLevel(levelDef(1));
    expect(lvl.state.cols).toHaveLength(8);
    expect(lvl.state.cfg.maxHeight).toBe(12);
    expect(lvl.state.trayOpen).toBe(2);
    const n = lvl.state.cols.reduce((sum, c) => sum + c.length, 0);
    expect(n % 12).toBe(0);
  });
});
