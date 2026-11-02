import { describe, expect, it } from 'vitest';
import { tileCount } from '../src/game/core/Board';
import { levelDef } from '../src/game/config/levels';
import { clearLevelCache, generateLevel } from '../src/game/core/LevelGenerator';
import { legalMoves } from '../src/game/core/Rules';
import { GameState, Loc, Tile, makeTile, tileId, tileType } from '../src/game/core/types';
import { GameplaySystem } from '../src/game/systems/GameplaySystem';

const C = (index: number): Loc => ({ kind: 'col', index });
const T = (index: number): Loc => ({ kind: 'tray', index });

/** Levels that cross each rule band: plain, fewer boxes, ice, frost, hidden frost, late. */
const SAMPLE = [1, 10, 41, 51, 61, 71, 100];

function idsOf(s: GameState): number[] {
  const ids: number[] = [];
  for (const col of s.cols) for (const t of col) ids.push(tileId(t));
  for (const slot of s.tray) for (const t of slot) ids.push(tileId(t));
  return ids.sort((a, b) => a - b);
}

function assertBoard(s: GameState, startIds: number[]): void {
  expect(s.cols).toHaveLength(8);
  expect(s.tray).toHaveLength(s.cfg.traySize);
  expect(s.trayOpen).toBeGreaterThan(0);
  expect(s.trayOpen).toBeLessThanOrEqual(s.cfg.traySize);
  for (const col of s.cols) expect(col.length).toBeLessThanOrEqual(s.cfg.maxHeight);
  for (let i = 0; i < s.trayOpen; i++) expect(s.tray[i].length).toBeLessThanOrEqual(1);
  for (let i = s.trayOpen; i < s.tray.length; i++) expect(s.tray[i]).toHaveLength(0);
  for (const n of s.hidden) expect(n).toBeGreaterThanOrEqual(0);
  s.cols.forEach((col, i) => expect(s.hidden[i]).toBeLessThanOrEqual(col.length));
  expect(idsOf(s)).toEqual(startIds);
  expect(tileCount(s)).toBe(startIds.length);
}

describe('full play', () => {
  it('replays each rule-band level to a win without losing or duplicating tiles', () => {
    clearLevelCache();
    for (const id of SAMPLE) {
      const level = generateLevel(levelDef(id));
      expect(level.state.cols).toHaveLength(8);
      expect(level.state.trayOpen).toBe(2);
      if (!level.solution) {
        expect(id).toBeGreaterThan(71);
        assertBoard(level.state, idsOf(level.state));
        continue;
      }

      const play = new GameplaySystem(level);
      const startIds = idsOf(play.state);
      expect(startIds.length % 12).toBe(0);
      assertBoard(play.state, startIds);

      for (const [from, to] of level.solution!) {
        const n = play.count(from, to);
        expect(n, `level ${id} move`).toBeGreaterThan(0);
        if (to.kind === 'tray') expect(n).toBe(1);
        const { result } = play.move(from, to);
        expect(result.moved).toHaveLength(n);
        if (to.kind === 'tray') {
          expect(result.moved).toHaveLength(1);
          expect(play.state.tray[to.index]).toHaveLength(1);
          expect(tileId(play.state.tray[to.index][0])).toBe(tileId(result.moved[0]));
        }
        assertBoard(play.state, startIds);
        expect(play.won || legalMoves(play.state).length > 0).toBe(true);
      }

      expect(play.won, `level ${id} won`).toBe(true);
      expect(play.stuck).toBe(false);
      expect(play.state.tray.every((slot) => slot.length === 0)).toBe(true);
      const filled = play.state.cols.filter((col) => col.length > 0);
      expect(filled, `level ${id} filled columns`).toHaveLength(play.goal);
      for (const col of filled) {
        expect(col).toHaveLength(play.state.cfg.maxHeight);
        expect(new Set(col.map(tileType)).size).toBe(1);
      }
      expect(play.score.score).toBeGreaterThan(0);
    }
  }, 30_000);

  it('plays a hand-built board to a win, including a one-tile tray hop', () => {
    const tiles = (types: number[], id0: number): Tile[] => types.map((t, i) => makeTile(id0 + i, t));
    const state: GameState = {
      cols: [tiles([2, 1, 1], 1), tiles([2, 2], 4), tiles([1], 6), [], [], [], [], []],
      hidden: [0, 0, 0, 0, 0, 0, 0, 0],
      tray: [[], [], [], []],
      trayOpen: 2,
      moves: 0,
      counts: [12, 12],
      level: 1,
      cfg: { maxHeight: 3, traySize: 4 },
    };
    const level = {
      def: { id: 1, seed: 1 },
      state,
      iconMap: [],
      seedUsed: 1,
      solution: null,
      verified: false,
    };
    const play = new GameplaySystem(level);
    const startIds = idsOf(play.state);

    expect(play.count(C(0), T(0))).toBe(1);
    play.move(C(0), T(0));
    expect(play.state.cols[0].map(tileType)).toEqual([2, 1]);
    expect(play.state.tray[0]).toHaveLength(1);
    expect(play.count(C(0), T(0))).toBe(0);

    play.move(T(0), C(2));
    expect(play.state.tray[0]).toHaveLength(0);
    expect(play.state.cols[2].map(tileType)).toEqual([1, 1]);
    play.move(C(0), T(0));
    play.move(T(0), C(2));
    expect(play.state.cols[2].map(tileType)).toEqual([1, 1, 1]);
    play.move(C(1), C(0));
    expect(play.state.cols[0].map(tileType)).toEqual([2, 2, 2]);
    expect(play.state.cols[1]).toHaveLength(0);
    expect(play.won).toBe(true);
    expect(idsOf(play.state)).toEqual(startIds);
  });
});
