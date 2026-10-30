/**
 * A tile is packed into one integer: `id << 4 | type`.
 * Packing keeps board snapshots (undo, solver search) cheap to copy.
 */
export type Tile = number;

export const tileType = (t: Tile): number => t & 15;
export const tileId = (t: Tile): number => t >> 4;
export const makeTile = (id: number, type: number): Tile => (id << 4) | type;

export type Loc = { kind: 'col'; index: number } | { kind: 'tray'; index: number };

export interface RuleConfig {
  /** Max tiles a column can hold. */
  maxHeight: number;
  /** Run length that pops. */
  clearCount: number;
  /** Max tiles one tray slot can hold. */
  trayCapacity: number;
  /** Total tray slots including locked ones. */
  traySize: number;
}

export interface GameState {
  /** Columns, index 0 = bottom. */
  cols: Tile[][];
  /** Number of face-down tiles at the bottom of each column. */
  hidden: number[];
  /** Tray slots; each holds tiles of one type. */
  tray: Tile[][];
  /** How many tray slots are unlocked. */
  trayOpen: number;
  cfg: RuleConfig;
}

export interface ClearEvent {
  col: number;
  tiles: Tile[];
}

export interface MoveResult {
  from: Loc;
  to: Loc;
  /** Tiles that moved, bottom-most first, as they sit in the destination. */
  moved: Tile[];
  /** Tiles that turned face-up (in any column) as a consequence of the move. */
  revealed: Tile[];
  /** Runs that popped, in order. */
  clears: ClearEvent[];
}

export interface LevelDef {
  /** 1-based level number (endless levels continue the count). */
  id: number;
  seed: number;
  columns: number;
  /** Number of distinct tile types on the board. */
  types: number;
  clearCount: number;
  maxHeight: number;
  /** Groups of `clearCount` tiles per type. */
  groupsPerType: number;
  /** Face-down rows at the bottom of each column. */
  hiddenRows: number;
  /** Columns that start empty. */
  emptyColumns: number;
  /** Unlocked tray slots at start. */
  traySlots: number;
  trayCapacity: number;
  /** Longest run of one type the generator may lay down. */
  maxChunk: number;
}
