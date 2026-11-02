import { COLUMN_CAP, COLUMN_COUNT, GameState, LevelDef, makeTile, Tile, TRAY_SLOTS, withIce } from './types';
import { moveCount } from './Rules';
import { mulberry32, randInt, Rng, shuffleInPlace } from './rng';
import { Move, searchWin } from './Solver';

export const ICON_COUNT = 8;
export const TRAY_SIZE = TRAY_SLOTS;

export interface GeneratedLevel {
  def: LevelDef;
  state: GameState;
  /** Maps board type index → icon index (0..ICON_COUNT-1). */
  iconMap: number[];
  seedUsed: number;
  /** A known solution from the starting state (null if the time budget ran out). */
  solution: Move[] | null;
  verified: boolean;
}

interface IceSpec {
  count: number;
  layers: [number, number];
}

interface Params {
  K: number;
  blind: number;
  opened: number[];
  ice: IceSpec | null;
  frost: number;
}

const GROUPS: Array<{ max: number; K: [number, number] }> = [
  { max: 10, K: [3, 3] },
  { max: 20, K: [4, 4] },
  { max: 30, K: [5, 5] },
  { max: 40, K: [6, 6] },
  { max: 9999, K: [7, 7] },
];

/** Intro levels teach one new rule with 5 treats. */
const INTRO: Record<number, string> = { 41: 'fewer', 51: 'ice', 61: 'frostbox', 71: 'hiddenfrost' };

const groupOf = (n: number) => GROUPS.find((g) => n <= g.max) ?? GROUPS[GROUPS.length - 1];

function params(n: number, r: Rng): Params {
  const g = groupOf(n);
  const p: Params = {
    K: INTRO[n] ? 5 : randInt(r, g.K[0], g.K[1]),
    blind: 8,
    opened: [3, 3, 3, 3, 2, 2, 2, 2],
    ice: null,
    frost: 0,
  };
  if (n >= 41) {
    p.blind = 9;
    p.opened = [2, 2, 2, 2, 1, 1, 1, 1];
  }
  if (n >= 51) {
    const hard = n % 5 === 0;
    const rest = n % 5 === 1 && n !== 51;
    if (n === 51) p.ice = { count: 2, layers: [1, 1] };
    else if (hard) p.ice = { count: 3, layers: [1, 2] };
    else if (!rest && r() < 0.5) p.ice = { count: randInt(r, 2, 3), layers: [1, 1] };
  }
  if (n >= 61) {
    const hard = n % 5 === 0;
    const rest = n % 5 === 1 && !INTRO[n];
    p.frost = INTRO[n] ? 3 : hard ? randInt(r, 3, 4) : rest ? 0 : randInt(r, 2, 3);
    if (n === 61 || n === 71) p.ice = null;
    else if (hard) p.ice = null;
  }
  if (n >= 100) {
    p.ice = { count: randInt(r, 2, 3), layers: [1, 2] };
    p.frost = randInt(r, 3, 4);
  }
  return p;
}

function candidate(r: Rng, P: Params, n: number, uid: { v: number }): GameState {
  const opened = shuffleInPlace(P.opened.slice(), r);
  const sizes = opened.map((o) => P.blind + o);
  const total = sizes.reduce((a, b) => a + b, 0);
  const full = total / COLUMN_CAP;
  const share = new Array<number>(P.K).fill(1);
  for (let x = P.K; x < full; x++) share[Math.floor(r() * P.K)]++;
  const counts = share.map((v) => v * COLUMN_CAP);
  const tiles: number[] = [];
  counts.forEach((nn, k) => {
    for (let x = 0; x < nn; x++) tiles.push(k);
  });
  shuffleInPlace(tiles, r);
  const cols: Tile[][] = [];
  const hidden: number[] = [];
  let p = 0;
  for (let i = 0; i < COLUMN_COUNT; i++) {
    const slice = tiles.slice(p, p + sizes[i]);
    p += sizes[i];
    cols.push(slice.map((k) => makeTile(++uid.v, k)));
    hidden.push(P.blind);
  }
  if (P.ice) {
    const spots = shuffleInPlace(
      cols.map((_, i) => i).filter((i) => cols[i].length - hidden[i] >= 2),
      r,
    ).slice(0, P.ice.count);
    for (const i of spots) {
      const openCount = cols[i].length - hidden[i];
      const pick = hidden[i] + Math.floor(r() * (openCount - 1));
      cols[i][pick] = withIce(cols[i][pick], randInt(r, P.ice.layers[0], P.ice.layers[1]));
    }
  }
  if (P.frost) {
    const boxes: Array<[number, number]> = [];
    cols.forEach((c, ci) => {
      for (let x = 1; x < hidden[ci] && x < c.length; x++) boxes.push([ci, x]);
    });
    shuffleInPlace(boxes, r);
    for (const [ci, x] of boxes.slice(0, P.frost)) cols[ci][x] = withIce(cols[ci][x], 1);
  }
  return {
    cols,
    hidden,
    tray: [[], [], [], []],
    trayOpen: 2,
    moves: 0,
    counts,
    level: n,
    cfg: { maxHeight: COLUMN_CAP, traySize: TRAY_SLOTS },
  };
}

function hasShelfMove(s: GameState): boolean {
  for (let i = 0; i < s.cols.length; i++) {
    for (let j = 0; j < s.cols.length; j++) {
      if (s.cols[j].length > 0 && moveCount(s, { kind: 'col', index: i }, { kind: 'col', index: j }) > 0) return true;
    }
  }
  return false;
}

const cache = new Map<number, GeneratedLevel>();

/**
 * Seeded board for level N. Same recipe as the Sweet Hop Sort reference:
 * 8 columns, 12-high, 7 full sets plus one empty column, blind boxes on the bottom.
 */
export function generateLevel(def: LevelDef): GeneratedLevel {
  const n = def.id;
  const hit = cache.get(n);
  if (hit) return hit;
  const r = mulberry32(n * 7919 + 13);
  const P = params(n, r);
  const uid = { v: n * 1000 };
  const playouts = n > 60 ? 40 : n > 30 ? 28 : 16;
  let fallback: GameState | null = null;
  let solution: Move[] | null = null;
  let state: GameState | null = null;
  const t0 = performance.now();
  for (let a = 0; a < 150 && !solution && performance.now() - t0 < 1500; a++) {
    const s = candidate(r, P, n, uid);
    if (!hasShelfMove(s)) continue;
    fallback ??= s;
    const win = searchWin(s, r, playouts);
    if (win) {
      state = s;
      solution = win;
    }
  }
  state ??= fallback ?? candidate(r, P, n, uid);
  const out: GeneratedLevel = {
    def,
    state,
    iconMap: Array.from({ length: ICON_COUNT }, (_, i) => i),
    seedUsed: n * 7919 + 13,
    solution,
    verified: solution !== null,
  };
  cache.set(n, out);
  return out;
}

/** Test hook: drop the memo so a fresh seed walk can be observed. */
export function clearLevelCache(): void {
  cache.clear();
}
