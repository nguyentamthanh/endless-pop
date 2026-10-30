import { cloneState, isWin, topRunLength } from './Board';
import { applyMove, legalMoves } from './Rules';
import { GameState, Loc, tileType } from './types';

export type Move = [Loc, Loc];

export interface SolveResult {
  solution: Move[] | null;
  nodes: number;
  /** True when the search gave up because it hit the node budget. */
  exhausted: boolean;
}

/** Column order and tray order don't affect the rules, so sort them for the visited set. */
function stateKey(s: GameState): string {
  const cols = s.cols.map((c, i) => `${s.hidden[i]}:${c.map(tileType).join('')}`).sort();
  const tray = s.tray.slice(0, s.trayOpen).map((t) => t.map(tileType).join('')).sort();
  return `${cols.join('|')}#${tray.join('|')}`;
}

/** Moves that can never help: moving a whole fully-visible column into an empty one. */
function isPointless(s: GameState, [from, to]: Move): boolean {
  if (from.kind !== 'col' || to.kind !== 'col') return false;
  const src = s.cols[from.index];
  return s.cols[to.index].length === 0 && s.hidden[from.index] === 0 && topRunLength(s, from.index) === src.length;
}

function scoreChild(before: GameState, after: GameState, [from, to]: Move, cleared: number, revealed: number): number {
  let score = cleared * 100 + revealed * 30;
  if (to.kind === 'col') {
    score += before.cols[to.index].length > 0 ? 20 + topRunLength(after, to.index) * 3 : 4;
  } else {
    score -= 25;
  }
  if (from.kind === 'tray') score += 15;
  return score;
}

/**
 * Depth-first search with a visited set and a node budget.
 * Used to guarantee that generated levels can be cleared, and by the debug autoplayer.
 */
export function solve(start: GameState, budget = 60000): SolveResult {
  const visited = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;
  let exhausted = false;

  const dfs = (s: GameState): boolean => {
    if (isWin(s)) return true;
    if (nodes >= budget) {
      exhausted = true;
      return false;
    }
    nodes++;
    const key = stateKey(s);
    if (visited.has(key)) return false;
    visited.add(key);

    const children: Array<{ move: Move; next: GameState; score: number }> = [];
    for (const move of legalMoves(s)) {
      if (isPointless(s, move)) continue;
      const next = cloneState(s);
      const res = applyMove(next, move[0], move[1]);
      const cleared = res.clears.reduce((n, c) => n + c.tiles.length, 0);
      children.push({ move, next, score: scoreChild(s, next, move, cleared, res.revealed.length) });
    }
    children.sort((a, b) => b.score - a.score);
    for (const child of children) {
      path.push(child.move);
      if (dfs(child.next)) return true;
      path.pop();
      if (exhausted) return false;
    }
    return false;
  };

  const ok = dfs(cloneState(start));
  return { solution: ok ? path.slice() : null, nodes, exhausted };
}
