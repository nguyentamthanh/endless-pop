import { cloneState, topRunLength, topType } from './Board';
import { Rng, shuffleInPlace } from './rng';
import { ClearEvent, GameState, Loc, MoveResult, Tile, tileType } from './types';

const stackAt = (s: GameState, loc: Loc): Tile[] => (loc.kind === 'col' ? s.cols[loc.index] : s.tray[loc.index]);

export const sameLoc = (a: Loc, b: Loc): boolean => a.kind === b.kind && a.index === b.index;

/** Tiles a tap on `loc` would lift. A tray slot always lifts its whole content. */
export function liftCount(s: GameState, loc: Loc): number {
  if (loc.kind === 'col') return topRunLength(s, loc.index);
  if (loc.index >= s.trayOpen) return 0;
  return s.tray[loc.index].length;
}

/** Number of tiles that would move from `from` to `to`; 0 means the move is illegal. */
export function moveCount(s: GameState, from: Loc, to: Loc): number {
  if (sameLoc(from, to)) return 0;
  if (from.kind === 'tray' && to.kind === 'tray') return 0;
  const run = liftCount(s, from);
  if (run === 0) return 0;
  const type = topType(stackAt(s, from));
  if (to.kind === 'col') {
    const dst = s.cols[to.index];
    if (dst.length > 0 && topType(dst) !== type) return 0;
    return Math.min(run, s.cfg.maxHeight - dst.length);
  }
  if (to.index >= s.trayOpen) return 0;
  const slot = s.tray[to.index];
  if (slot.length > 0 && topType(slot) !== type) return 0;
  return Math.min(run, s.cfg.trayCapacity - slot.length);
}

/** Turns the new top tile of a column face-up. Returns revealed tiles. */
function revealTop(s: GameState, col: number): Tile[] {
  const len = s.cols[col].length;
  const limit = Math.max(0, len - 1);
  if (s.hidden[col] <= limit) return [];
  const revealed = s.cols[col].slice(limit, s.hidden[col]);
  s.hidden[col] = limit;
  return revealed;
}

/** Pops the top run of a column while it is long enough; chains if a reveal extends a run. */
function resolveColumn(s: GameState, col: number, out: MoveResult): void {
  for (;;) {
    const run = topRunLength(s, col);
    if (run < s.cfg.clearCount) return;
    const tiles = s.cols[col].splice(s.cols[col].length - run, run);
    out.clears.push({ col, tiles } satisfies ClearEvent);
    out.revealed.push(...revealTop(s, col));
  }
}

/** Applies a legal move in place. Throws on an illegal move so callers can't desync. */
export function applyMove(s: GameState, from: Loc, to: Loc): MoveResult {
  const k = moveCount(s, from, to);
  if (k === 0) throw new Error('Illegal move');
  const src = stackAt(s, from);
  const moved = src.splice(src.length - k, k);
  stackAt(s, to).push(...moved);
  const out: MoveResult = { from, to, moved, revealed: [], clears: [] };
  if (from.kind === 'col') out.revealed.push(...revealTop(s, from.index));
  if (to.kind === 'col') resolveColumn(s, to.index, out);
  if (from.kind === 'col') resolveColumn(s, from.index, out);
  return out;
}

export function allLocs(s: GameState): Loc[] {
  const locs: Loc[] = s.cols.map((_, index) => ({ kind: 'col', index }) as Loc);
  for (let index = 0; index < s.trayOpen; index++) locs.push({ kind: 'tray', index });
  return locs;
}

export function legalMoves(s: GameState): Array<[Loc, Loc]> {
  const locs = allLocs(s);
  const moves: Array<[Loc, Loc]> = [];
  for (const a of locs) {
    if (liftCount(s, a) === 0) continue;
    for (const b of locs) if (moveCount(s, a, b) > 0) moves.push([a, b]);
  }
  return moves;
}

export const hasLegalMove = (s: GameState): boolean => legalMoves(s).length > 0;

/**
 * Shuffle booster: redistributes face-up board tiles across the same positions.
 * Tries several permutations and keeps one with no instant pop and at least one legal move.
 * Returns the new state (input untouched) or null if nothing better was found.
 */
export function shuffleFaceUp(s: GameState, rng: Rng, attempts = 30): GameState | null {
  const slots: Array<[number, number]> = [];
  const pool: Tile[] = [];
  s.cols.forEach((c, ci) =>
    c.forEach((t, ri) => {
      if (ri >= s.hidden[ci]) {
        slots.push([ci, ri]);
        pool.push(t);
      }
    }),
  );
  if (pool.length < 2) return null;
  let fallback: GameState | null = null;
  for (let i = 0; i < attempts; i++) {
    const next = cloneState(s);
    shuffleInPlace(pool, rng);
    slots.forEach(([ci, ri], k) => (next.cols[ci][ri] = pool[k]));
    const instantPop = next.cols.some((_, ci) => topRunLength(next, ci) >= s.cfg.clearCount);
    if (instantPop) continue;
    if (hasLegalMove(next)) return next;
    fallback ??= next;
  }
  return fallback;
}

/** Types that still exist anywhere, used by the HUD's goal counter. */
export function remainingByType(s: GameState): Map<number, number> {
  const m = new Map<number, number>();
  const add = (t: Tile) => m.set(tileType(t), (m.get(tileType(t)) ?? 0) + 1);
  s.cols.forEach((c) => c.forEach(add));
  s.tray.forEach((c) => c.forEach(add));
  return m;
}
