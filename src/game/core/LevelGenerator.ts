import { topRunLength } from './Board';
import { mulberry32, randInt, Rng, shuffleInPlace } from './rng';
import { Move, solve } from './Solver';
import { GameState, LevelDef, makeTile, tileType } from './types';

export const ICON_COUNT = 8;
export const TRAY_SIZE = 4;

export interface GeneratedLevel {
  def: LevelDef;
  state: GameState;
  /** Maps board type index → icon index (0..ICON_COUNT-1). */
  iconMap: number[];
  seedUsed: number;
  /** A known solution from the starting state (null only if validation failed). */
  solution: Move[] | null;
}

function columnHeights(def: LevelDef, total: number, rng: Rng): number[] {
  const filled = def.columns - def.emptyColumns;
  const cap = def.maxHeight - 1;
  const base = Math.floor(total / filled);
  if (base > cap || (base === cap && total % filled > 0)) {
    throw new Error(`Level ${def.id}: ${total} tiles do not fit in ${filled} columns of ${def.maxHeight}`);
  }
  const h = new Array<number>(filled).fill(base);
  for (let i = 0; i < total % filled; i++) h[i]++;
  // Uneven skyline like the reference: shift tiles between random columns.
  for (let i = 0; i < filled * 2; i++) {
    const a = randInt(rng, 0, filled - 1);
    const b = randInt(rng, 0, filled - 1);
    if (a !== b && h[a] > 3 && h[b] < cap) {
      h[a]--;
      h[b]++;
    }
  }
  return h;
}

/** Sequence of tile types laid in short chunks so the board starts mixed but readable. */
function typeSequence(def: LevelDef, rng: Rng): number[] {
  const remaining = new Array<number>(def.types).fill(def.groupsPerType * def.clearCount);
  const seq: number[] = [];
  let prev = -1;
  for (;;) {
    const choices = remaining.map((n, t) => (n > 0 && t !== prev ? t : -1)).filter((t) => t >= 0);
    const pool = choices.length ? choices : remaining.map((n, t) => (n > 0 ? t : -1)).filter((t) => t >= 0);
    if (!pool.length) return seq;
    // Weighted by remaining count keeps the distribution even through the sequence.
    let roll = rng() * pool.reduce((s, t) => s + remaining[t], 0);
    let type = pool[0];
    for (const t of pool) {
      roll -= remaining[t];
      if (roll <= 0) {
        type = t;
        break;
      }
    }
    const chunk = Math.min(remaining[type], randInt(rng, 1, def.maxChunk));
    for (let i = 0; i < chunk; i++) seq.push(type);
    remaining[type] -= chunk;
    prev = type;
  }
}

/** Builds the starting board for one seed (no solvability check). */
export function buildState(def: LevelDef, seed: number): GameState {
  const rng = mulberry32(seed);
  const total = def.types * def.groupsPerType * def.clearCount;
  for (let attempt = 0; attempt < 50; attempt++) {
    const heights = columnHeights(def, total, rng);
    const seq = typeSequence(def, rng);
    const filled: number[][] = [];
    let p = 0;
    for (const h of heights) {
      filled.push(seq.slice(p, p + h));
      p += h;
    }
    // No run on the board may be close to popping at the start.
    const tooLong = filled.some((c) => {
      let run = 1;
      for (let i = 1; i < c.length; i++) {
        run = c[i] === c[i - 1] ? run + 1 : 1;
        if (run >= def.clearCount - 1) return true;
      }
      return false;
    });
    if (tooLong) continue;

    const order = shuffleInPlace(
      Array.from({ length: def.columns }, (_, i) => i),
      rng,
    );
    const cols: number[][] = Array.from({ length: def.columns }, () => []);
    let id = 1;
    filled.forEach((types, i) => {
      cols[order[i]] = types.map((t) => makeTile(id++, t));
    });
    const state: GameState = {
      cols,
      hidden: cols.map((c) => Math.min(def.hiddenRows, Math.max(0, c.length - 1))),
      tray: Array.from({ length: TRAY_SIZE }, () => []),
      trayOpen: def.traySlots,
      cfg: {
        maxHeight: def.maxHeight,
        clearCount: def.clearCount,
        trayCapacity: def.trayCapacity,
        traySize: TRAY_SIZE,
      },
    };
    if (state.cols.some((_, i) => topRunLength(state, i) >= def.clearCount)) continue;
    return state;
  }
  throw new Error(`Level ${def.id}: could not lay out tiles`);
}

export function iconMapFor(def: LevelDef): number[] {
  const rng = mulberry32(def.seed ^ 0x5eed);
  const icons = shuffleInPlace(
    Array.from({ length: ICON_COUNT }, (_, i) => i),
    rng,
  );
  return icons.slice(0, def.types);
}

/**
 * Builds a level and proves it can be cleared, retrying with derived seeds.
 * Deterministic: the same def always yields the same board.
 */
export function generateLevel(def: LevelDef, budget = 5000, attempts = 40): GeneratedLevel {
  let last: GeneratedLevel | null = null;
  for (let a = 0; a < attempts; a++) {
    const seedUsed = (def.seed + a * 7919) >>> 0;
    const state = buildState(def, seedUsed);
    const { solution } = solve(state, budget);
    last = { def, state, iconMap: iconMapFor(def), seedUsed, solution };
    if (solution) return last;
  }
  return last!;
}

export const typesOnBoard = (s: GameState): number[] =>
  [...new Set(s.cols.flat().concat(s.tray.flat()).map(tileType))].sort();
