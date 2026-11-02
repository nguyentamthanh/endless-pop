/**
 * A tile is packed into one integer: `id << 7 | ice << 4 | type`.
 * Packing keeps board snapshots (undo, solver search) cheap to copy.
 * Ice layers live on the tile so a frosted blind box stays frozen after it flips.
 */
export type Tile = number;

export const COLUMN_CAP = 12;
export const COLUMN_COUNT = 8;
export const TRAY_SLOTS = 4;
/** Frozen treats and the hammer arrive together. */
export const HAMMER_FROM = 51;
/** From this level, frosted blind boxes look like ordinary "?". */
export const FROST_HIDDEN_FROM = 71;

export const tileType = (t: Tile): number => t & 15;
export const tileIce = (t: Tile): number => (t >> 4) & 7;
export const tileId = (t: Tile): number => t >> 7;
export const makeTile = (id: number, type: number, ice = 0): Tile => (id << 7) | ((ice & 7) << 4) | (type & 15);
export const withIce = (t: Tile, ice: number): Tile => makeTile(tileId(t), tileType(t), ice);

export type Loc = { kind: 'col'; index: number } | { kind: 'tray'; index: number };

export interface RuleConfig {
  /** Max tiles a column can hold. A full column is exactly this many of one treat. */
  maxHeight: number;
  /** Total tray slots including locked ones. */
  traySize: number;
}

export interface GameState {
  /** Columns, index 0 = bottom. */
  cols: Tile[][];
  /** Face-down tiles at the bottom of each column (a prefix). */
  hidden: number[];
  /** Tray slots; each holds at most one tile. */
  tray: Tile[][];
  /** How many tray slots are unlocked. */
  trayOpen: number;
  moves: number;
  /** How many tiles of each type belong on the board. Multiples of COLUMN_CAP. */
  counts: number[];
  /** 1-based level number. Drives frost visibility, not the move rules. */
  level: number;
  cfg: RuleConfig;
}

export interface MoveResult {
  from: Loc;
  to: Loc;
  /** Tiles that moved, bottom-most first. */
  moved: Tile[];
  /** The blind box that flipped, if the move uncovered one. */
  revealed: Tile[];
  /** Columns that became a full set of one treat on this move. */
  completed: number[];
}

export interface LevelDef {
  /** 1-based level number (endless levels continue the count). */
  id: number;
  seed: number;
}
