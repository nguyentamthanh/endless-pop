import { GameState, Tile, tileType } from './types';

export function cloneState(s: GameState): GameState {
  return {
    cols: s.cols.map((c) => c.slice()),
    hidden: s.hidden.slice(),
    tray: s.tray.map((t) => t.slice()),
    trayOpen: s.trayOpen,
    cfg: s.cfg,
  };
}

/** Copies `src` into `dst` in place (used by undo so views keep their state reference). */
export function restoreState(dst: GameState, src: GameState): void {
  dst.cols = src.cols.map((c) => c.slice());
  dst.hidden = src.hidden.slice();
  dst.tray = src.tray.map((t) => t.slice());
  dst.trayOpen = src.trayOpen;
}

export const isHidden = (s: GameState, col: number, row: number): boolean => row < s.hidden[col];

/** Length of the face-up same-type run at the top of a column. */
export function topRunLength(s: GameState, col: number): number {
  const c = s.cols[col];
  if (c.length === 0) return 0;
  const type = tileType(c[c.length - 1]);
  let n = 0;
  for (let i = c.length - 1; i >= s.hidden[col] && tileType(c[i]) === type; i--) n++;
  return n;
}

export const topType = (stack: Tile[]): number => (stack.length ? tileType(stack[stack.length - 1]) : -1);

export const tileCount = (s: GameState): number =>
  s.cols.reduce((n, c) => n + c.length, 0) + s.tray.reduce((n, t) => n + t.length, 0);

export const isWin = (s: GameState): boolean => tileCount(s) === 0;

/** Stable textual form, mostly for tests and debugging. */
export function describe(s: GameState): string {
  const cols = s.cols.map(
    (c, i) => c.map((t, r) => (r < s.hidden[i] ? `?${tileType(t)}` : `${tileType(t)}`)).join(' ') || '-',
  );
  const tray = s.tray.map((t, i) => (i < s.trayOpen ? t.map(tileType).join('') || '_' : 'X'));
  return `${cols.join(' | ')} || ${tray.join(' ')}`;
}
