import { COLUMN_CAP, GameState, Tile, tileIce, tileType } from './types';

export function cloneState(s: GameState): GameState {
  return {
    cols: s.cols.map((c) => c.slice()),
    hidden: s.hidden.slice(),
    tray: s.tray.map((t) => t.slice()),
    trayOpen: s.trayOpen,
    moves: s.moves,
    counts: s.counts.slice(),
    level: s.level,
    cfg: s.cfg,
  };
}

/** Copies `src` into `dst` in place (used by undo so views keep their state reference). */
export function restoreState(dst: GameState, src: GameState): void {
  dst.cols = src.cols.map((c) => c.slice());
  dst.hidden = src.hidden.slice();
  dst.tray = src.tray.map((t) => t.slice());
  dst.trayOpen = src.trayOpen;
  dst.moves = src.moves;
  dst.counts = src.counts.slice();
  dst.level = src.level;
}

export const isHidden = (s: GameState, col: number, row: number): boolean => row < s.hidden[col];

/** Length of the face-up, unfrozen, same-type run at the top of a column. */
export function topRunLength(s: GameState, col: number): number {
  const c = s.cols[col];
  if (c.length === 0) return 0;
  const top = c.length - 1;
  if (top < s.hidden[col] || tileIce(c[top]) > 0) return 0;
  const type = tileType(c[top]);
  let n = 0;
  for (let i = top; i >= 0; i--) {
    if (i < s.hidden[col] || tileIce(c[i]) > 0 || tileType(c[i]) !== type) break;
    n++;
  }
  return n;
}

export const topType = (stack: Tile[]): number => (stack.length ? tileType(stack[stack.length - 1]) : -1);

/** One treat, nothing hidden. Ice does not break a mono column. */
export function isMono(s: GameState, col: number): boolean {
  const c = s.cols[col];
  if (c.length === 0 || s.hidden[col] > 0) return false;
  const type = tileType(c[0]);
  return c.every((t) => tileType(t) === type);
}

/** Gold-check column: full and one treat, with every box opened. */
export const isComplete = (s: GameState, col: number): boolean =>
  s.cols[col].length === s.cfg.maxHeight && isMono(s, col);

export const completedCount = (s: GameState): number => s.cols.reduce((n, _, i) => n + (isComplete(s, i) ? 1 : 0), 0);

/** How many full columns the level needs. Counts are multiples of the column cap. */
export const goalColumns = (s: GameState): number => s.counts.reduce((n, c) => n + c, 0) / COLUMN_CAP;

export const tileCount = (s: GameState): number =>
  s.cols.reduce((n, c) => n + c.length, 0) + s.tray.reduce((n, t) => n + t.length, 0);

/** Tray empty, and every column empty or full of one treat (hidden tiles still count). */
export function isWin(s: GameState): boolean {
  if (s.tray.some((slot) => slot.length > 0)) return false;
  return s.cols.every((c) => c.length === 0 || (c.length === s.cfg.maxHeight && c.every((t) => tileType(t) === tileType(c[0]))));
}

export function hasIce(s: GameState): boolean {
  return s.cols.some((c) => c.some((t) => tileIce(t) > 0));
}

/** Stable textual form, mostly for tests and debugging. */
export function describe(s: GameState): string {
  const cols = s.cols.map((c, i) =>
    c.map((t, r) => `${r < s.hidden[i] ? '?' : ''}${tileType(t)}${tileIce(t) ? `i${tileIce(t)}` : ''}`).join(' ') || '-',
  );
  const tray = s.tray.map((t, i) => (i < s.trayOpen ? t.map(tileType).join('') || '_' : 'X'));
  return `${cols.join(' | ')} || ${tray.join(' ')}`;
}
