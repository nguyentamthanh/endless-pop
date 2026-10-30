import { describe, expect, it } from 'vitest';
import { cloneState, isWin, tileCount, topRunLength } from '../src/game/core/Board';
import { buildState, generateLevel } from '../src/game/core/LevelGenerator';
import { applyMove, hasLegalMove, legalMoves, moveCount, shuffleFaceUp } from '../src/game/core/Rules';
import { mulberry32 } from '../src/game/core/rng';
import { solve } from '../src/game/core/Solver';
import { GameState, Loc, makeTile, tileType } from '../src/game/core/types';
import { CAMPAIGN, endlessDef } from '../src/game/config/levels';

let nextId = 1;
const col = (...types: number[]) => types.map((t) => makeTile(nextId++, t));
const C = (index: number): Loc => ({ kind: 'col', index });
const T = (index: number): Loc => ({ kind: 'tray', index });

function state(cols: number[][], hidden: number[] = [], opts: Partial<GameState['cfg']> = {}): GameState {
  return {
    cols: cols.map((c) => col(...c)),
    hidden: cols.map((_, i) => hidden[i] ?? 0),
    tray: [[], [], [], []],
    trayOpen: 3,
    cfg: { maxHeight: 8, clearCount: 4, trayCapacity: 3, traySize: 4, ...opts },
  };
}

describe('rules', () => {
  it('lifts the whole same-type run and stops at face-down tiles', () => {
    const s = state([[1, 1, 2, 2, 2]], [0]);
    expect(topRunLength(s, 0)).toBe(3);
    const h = state([[2, 2, 2]], [2]);
    expect(topRunLength(h, 0)).toBe(1);
  });

  it('only moves onto a matching top, an empty column or a compatible tray slot', () => {
    const s = state([[0, 1], [2, 1], [3], []]);
    expect(moveCount(s, C(0), C(1))).toBe(1);
    expect(moveCount(s, C(0), C(2))).toBe(0);
    expect(moveCount(s, C(0), C(3))).toBe(1);
    expect(moveCount(s, C(0), T(0))).toBe(1);
    expect(moveCount(s, C(0), T(3))).toBe(0); // locked slot
    expect(moveCount(s, C(0), C(0))).toBe(0);
  });

  it('moves only what fits when the target column is nearly full', () => {
    const s = state([[1, 1, 1], [0, 0, 0, 0, 0, 0, 1]], [], { maxHeight: 8, clearCount: 9 });
    expect(moveCount(s, C(0), C(1))).toBe(1);
    const res = applyMove(s, C(0), C(1));
    expect(res.moved.length).toBe(1);
    expect(s.cols[0].length).toBe(2);
  });

  it('pops a run of N on landing and reveals the tile underneath', () => {
    const s = state([[1, 1], [3, 0, 1, 1]], [0, 2]);
    const res = applyMove(s, C(0), C(1));
    expect(res.clears).toHaveLength(1);
    expect(res.clears[0].tiles.map(tileType)).toEqual([1, 1, 1, 1]);
    expect(s.cols[1].map(tileType)).toEqual([3, 0]);
    expect(s.hidden[1]).toBe(1);
    expect(res.revealed.map(tileType)).toEqual([0]);
  });

  it('reveals the new top of the source column', () => {
    const s = state([[2, 3, 1], [1]], [2, 0]);
    const res = applyMove(s, C(0), C(1));
    expect(s.hidden[0]).toBe(1);
    expect(res.revealed.map(tileType)).toEqual([3]);
  });

  it('tray slots hold one type up to capacity and give back their whole content', () => {
    const s = state([[1, 1], [1], [0]]);
    applyMove(s, C(0), T(0));
    expect(s.tray[0].length).toBe(2);
    expect(moveCount(s, C(1), T(0))).toBe(1);
    expect(moveCount(s, C(2), T(0))).toBe(0);
    applyMove(s, C(1), T(0));
    expect(moveCount(s, C(0), T(0))).toBe(0); // column empty
    expect(moveCount(s, T(0), C(0))).toBe(3);
  });

  it('detects a lost position', () => {
    const s = state([[0, 1], [2, 3]], [], { maxHeight: 2 });
    s.tray = [col(4), col(5), col(6), []];
    expect(hasLegalMove(s)).toBe(false);
  });

  it('wins when everything is cleared', () => {
    const s = state([[1, 1], [1, 1]]);
    applyMove(s, C(0), C(1));
    expect(isWin(s)).toBe(true);
  });

  it('shuffle keeps tile counts and face-down tiles', () => {
    const s = buildState(CAMPAIGN[9], 1234);
    const next = shuffleFaceUp(s, mulberry32(7))!;
    expect(next).not.toBeNull();
    expect(tileCount(next)).toBe(tileCount(s));
    next.cols.forEach((c, i) => {
      expect(c.length).toBe(s.cols[i].length);
      expect(c.slice(0, s.hidden[i])).toEqual(s.cols[i].slice(0, s.hidden[i]));
    });
  });
});

describe('levels', () => {
  it('generation is deterministic', () => {
    const a = generateLevel(CAMPAIGN[4]);
    const b = generateLevel(CAMPAIGN[4]);
    expect(a.state.cols).toEqual(b.state.cols);
    expect(a.seedUsed).toBe(b.seedUsed);
  });

  it.each(CAMPAIGN.map((d) => [d.id, d] as const))('campaign level %i is solvable', (_id, def) => {
    const lvl = generateLevel(def);
    expect(lvl.solution, `level ${def.id} has no solution`).not.toBeNull();
    // Replay the solution with the real rules to make sure solver and rules agree.
    const s = cloneState(lvl.state);
    for (const [from, to] of lvl.solution!) applyMove(s, from, to);
    expect(isWin(s)).toBe(true);
    expect(tileCount(lvl.state)).toBe(def.types * def.groupsPerType * def.clearCount);
    expect(legalMoves(lvl.state).length).toBeGreaterThan(0);
  });

  it.each([31, 37, 52, 99])('endless level %i is solvable', (id) => {
    const lvl = generateLevel(endlessDef(id));
    expect(lvl.solution).not.toBeNull();
  });

  it('solver reports no solution for a dead end', () => {
    const s = state([[0, 1], [2, 3]], [], { maxHeight: 2 });
    s.tray = [col(4), col(5), col(6), []];
    expect(solve(s).solution).toBeNull();
  });
});
