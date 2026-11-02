import { cloneState, isWin, topRunLength } from './Board';
import { applyMove, legalMoves, moveCount } from './Rules';
import { mulberry32, Rng } from './rng';
import { GameState, Loc } from './types';

export type Move = [Loc, Loc];

export interface SolveResult {
  solution: Move[] | null;
  nodes: number;
  /** True when the search gave up without a win. */
  exhausted: boolean;
}

function scoreMove(s: GameState, [from, to]: Move): number {
  if (from.kind === 'tray') return s.cols[to.index].length ? 14 : 3;
  const c = s.cols[from.index];
  if (to.kind === 'tray') {
    const below = c.length >= 2 ? c.length - 2 : -1;
    return -6 + (below >= 0 && below < s.hidden[from.index] ? 3 : 0);
  }
  const len = moveCount(s, from, to);
  const below = c.length - len - 1;
  const rev = below >= 0 && below < s.hidden[from.index] ? 5 : 0;
  if (s.cols[to.index].length === 0) return 1 + rev;
  return 6 + 2 * topRunLength(s, to.index) + rev;
}

/**
 * Greedy random playouts with full knowledge, matching the reference solver.
 * Uses the caller's RNG so level generation stays deterministic.
 * Returns the moves of the first winning playout, or null.
 */
export function searchWin(s0: GameState, r: Rng, playouts: number): Move[] | null {
  for (let p = 0; p < playouts; p++) {
    const s = cloneState(s0);
    s.trayOpen = Math.min(s.trayOpen, 2);
    const moves: Move[] = [];
    let last: Move | null = null;
    for (let step = 0; step < 450; step++) {
      if (isWin(s)) return moves;
      let ms = legalMoves(s);
      if (last && last[0].kind === 'col' && last[1].kind === 'col') {
        const back = last;
        ms = ms.filter((m) => !(m[0].kind === 'col' && m[1].kind === 'col' && m[0].index === back[1].index && m[1].index === back[0].index));
      }
      if (!ms.length) break;
      let m: Move;
      if (r() < 0.72) {
        let best = -1e9;
        m = ms[0];
        for (const x of ms) {
          const sc = scoreMove(s, x) + r() * 2;
          if (sc > best) {
            best = sc;
            m = x;
          }
        }
      } else {
        m = ms[Math.floor(r() * ms.length)];
      }
      applyMove(s, m[0], m[1]);
      moves.push(m);
      last = m;
    }
  }
  return null;
}

/** A few fresh playouts. Used by debug autoplay, not by level generation. */
export function solve(s: GameState, playouts = 48): SolveResult {
  const r = mulberry32((s.level * 997 + s.moves * 13 + 1) >>> 0);
  const solution = searchWin(s, r, playouts);
  return { solution, nodes: playouts, exhausted: solution === null };
}
