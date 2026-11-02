import { completedCount, isMono, topRunLength, topType } from './Board';
import { GameState, Loc, MoveResult, Tile, tileIce, withIce } from './types';

const stackAt = (s: GameState, loc: Loc): Tile[] => (loc.kind === 'col' ? s.cols[loc.index] : s.tray[loc.index]);

export const sameLoc = (a: Loc, b: Loc): boolean => a.kind === b.kind && a.index === b.index;

const topBlocked = (s: GameState, col: number): boolean => {
  const c = s.cols[col];
  if (c.length === 0) return false;
  const top = c.length - 1;
  return top < s.hidden[col] || tileIce(c[top]) > 0;
};

/** Tiles a tap on `loc` would lift. A tray slot lifts its single tile. */
export function liftCount(s: GameState, loc: Loc): number {
  if (loc.kind === 'col') return topRunLength(s, loc.index);
  if (loc.index >= s.trayOpen || s.tray[loc.index].length === 0) return 0;
  return 1;
}

/**
 * Number of tiles that move from `from` to `to`; 0 means illegal.
 * Column-to-column moves the whole top run or nothing. The tray takes one tile into an empty slot.
 * A fully sorted column cannot be dumped into an empty one (that changes nothing).
 */
export function moveCount(s: GameState, from: Loc, to: Loc): number {
  if (sameLoc(from, to) || (from.kind === 'tray' && to.kind === 'tray')) return 0;
  if (from.kind === 'col' && to.kind === 'col') {
    const len = topRunLength(s, from.index);
    if (len === 0) return 0;
    const dst = s.cols[to.index];
    if (dst.length === 0) return isMono(s, from.index) ? 0 : len;
    if (topBlocked(s, to.index) || topType(dst) !== topType(s.cols[from.index])) return 0;
    if (s.cfg.maxHeight - dst.length < len) return 0;
    return len;
  }
  if (from.kind === 'col' && to.kind === 'tray') {
    if (to.index >= s.trayOpen || s.tray[to.index].length > 0) return 0;
    return topRunLength(s, from.index) > 0 ? 1 : 0;
  }
  if (from.kind === 'tray' && to.kind === 'col') {
    const slot = s.tray[from.index];
    if (from.index >= s.trayOpen || slot.length === 0) return 0;
    const dst = s.cols[to.index];
    if (dst.length === 0) return 1;
    if (topBlocked(s, to.index) || topType(dst) !== topType(slot)) return 0;
    if (s.cfg.maxHeight - dst.length < 1) return 0;
    return 1;
  }
  return 0;
}

function meltVisible(s: GameState, layers: number): void {
  s.cols.forEach((c, ci) => {
    for (let i = s.hidden[ci]; i < c.length; i++) {
      const ice = tileIce(c[i]);
      if (ice > 0) c[i] = withIce(c[i], Math.max(0, ice - layers));
    }
  });
}

function crackVisible(s: GameState, col: number): void {
  const c = s.cols[col];
  for (let i = s.hidden[col]; i < c.length; i++) {
    const ice = tileIce(c[i]);
    if (ice > 0) c[i] = withIce(c[i], ice - 1);
  }
}

function revealTop(s: GameState, col: number): Tile[] {
  const c = s.cols[col];
  if (c.length === 0 || s.hidden[col] < c.length) return [];
  s.hidden[col] = c.length - 1;
  return [c[c.length - 1]];
}

function completeSet(s: GameState): Set<number> {
  const out = new Set<number>();
  s.cols.forEach((_, i) => {
    if (s.cols[i].length === s.cfg.maxHeight && isMono(s, i)) out.add(i);
  });
  return out;
}

/** Applies a legal move in place. Throws on an illegal move so callers can't desync. */
export function applyMove(s: GameState, from: Loc, to: Loc): MoveResult {
  const k = moveCount(s, from, to);
  if (k === 0) throw new Error('Illegal move');
  const before = completeSet(s);
  const src = stackAt(s, from);
  const moved = src.splice(src.length - k, k);
  stackAt(s, to).push(...moved);
  s.moves++;
  const gained = completedCount(s) - before.size;
  if (gained > 0) meltVisible(s, gained);
  const revealed: Tile[] = [];
  if (from.kind === 'col') {
    const c = s.cols[from.index];
    if (c.length > 0 && s.hidden[from.index] >= c.length) {
      const a = Math.max(0, from.index - 1);
      const b = Math.min(s.cols.length - 1, from.index + 1);
      for (let j = a; j <= b; j++) crackVisible(s, j);
      revealed.push(...revealTop(s, from.index));
    }
  }
  const completed = [...completeSet(s)].filter((i) => !before.has(i));
  return { from, to, moved, revealed, completed };
}

export function allLocs(s: GameState): Loc[] {
  const locs: Loc[] = s.cols.map((_, index) => ({ kind: 'col', index }) as Loc);
  for (let index = 0; index < s.trayOpen; index++) locs.push({ kind: 'tray', index });
  return locs;
}

/** Same order as the reference: column-column, column-tray, then tray-column. */
export function legalMoves(s: GameState): Array<[Loc, Loc]> {
  const moves: Array<[Loc, Loc]> = [];
  for (let i = 0; i < s.cols.length; i++) {
    const from: Loc = { kind: 'col', index: i };
    for (let j = 0; j < s.cols.length; j++) {
      const to: Loc = { kind: 'col', index: j };
      if (moveCount(s, from, to) > 0) moves.push([from, to]);
    }
    for (let k = 0; k < s.trayOpen; k++) {
      const to: Loc = { kind: 'tray', index: k };
      if (moveCount(s, from, to) > 0) moves.push([from, to]);
    }
  }
  for (let k = 0; k < s.trayOpen; k++) {
    const from: Loc = { kind: 'tray', index: k };
    for (let j = 0; j < s.cols.length; j++) {
      const to: Loc = { kind: 'col', index: j };
      if (moveCount(s, from, to) > 0) moves.push([from, to]);
    }
  }
  return moves;
}

export const hasLegalMove = (s: GameState): boolean => legalMoves(s).length > 0;
