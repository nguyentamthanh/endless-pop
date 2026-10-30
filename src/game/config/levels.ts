import { mulberry32, randInt } from '../core/rng';
import { LevelDef } from '../core/types';

/**
 * Hand-tuned campaign. Edit freely; `npm test` proves every level is solvable.
 * Columns: id, columns, types, clearCount (N), maxHeight, groupsPerType, hiddenRows,
 *          emptyColumns, traySlots, trayCapacity, maxChunk
 */
type Row = [number, number, number, number, number, number, number, number, number, number, number];

// prettier-ignore
const ROWS: Row[] = [
  [ 1, 4, 3,  4,  8, 1, 0, 1, 3, 3, 2],
  [ 2, 5, 3,  4,  9, 2, 1, 1, 3, 3, 2],
  [ 3, 5, 4,  4, 10, 2, 2, 1, 3, 3, 2],
  [ 4, 6, 4,  5, 10, 2, 2, 1, 3, 4, 3],
  [ 5, 6, 4,  5, 11, 2, 3, 0, 3, 4, 3],
  [ 6, 6, 5,  5, 11, 2, 3, 1, 3, 4, 3],
  [ 7, 7, 5,  5, 11, 2, 3, 1, 3, 4, 3],
  [ 8, 7, 5,  6, 11, 2, 3, 1, 3, 5, 3],
  [ 9, 7, 6,  5, 11, 2, 4, 1, 3, 4, 3],
  [10, 8, 6,  5, 11, 2, 4, 1, 3, 4, 3],
  [11, 8, 6,  6, 12, 2, 4, 1, 3, 5, 3],
  [12, 8, 5,  6, 12, 2, 4, 0, 3, 5, 4],
  [13, 8, 6,  6, 12, 2, 5, 1, 3, 5, 4],
  [14, 8, 7,  5, 12, 2, 5, 1, 3, 4, 3],
  [15, 8, 5,  7, 12, 2, 5, 1, 3, 6, 4],
  [16, 8, 6,  6, 12, 2, 5, 0, 3, 5, 4],
  [17, 8, 7,  6, 12, 2, 5, 0, 3, 5, 4],
  [18, 8, 6,  8, 12, 1, 4, 1, 3, 7, 4],
  [19, 8, 7,  6, 12, 2, 6, 0, 3, 5, 4],
  [20, 8, 7,  8, 12, 1, 5, 1, 3, 7, 4],
  [21, 8, 8,  5, 12, 2, 6, 0, 3, 4, 3],
  [22, 8, 6,  9, 12, 1, 5, 1, 3, 8, 4],
  [23, 8, 7,  8, 12, 1, 6, 0, 3, 7, 4],
  [24, 8, 8,  7, 12, 1, 6, 1, 3, 6, 4],
  [25, 8, 7,  9, 12, 1, 6, 1, 3, 8, 5],
  [26, 8, 8,  8, 12, 1, 7, 1, 3, 7, 5],
  [27, 8, 7, 10, 12, 1, 7, 1, 3, 9, 5],
  [28, 8, 8,  9, 12, 1, 7, 0, 3, 8, 5],
  [29, 8, 8, 10, 12, 1, 8, 0, 3, 9, 5],
  [30, 8, 8, 10, 12, 1, 9, 0, 3, 9, 5],
];

const toDef = ([id, columns, types, clearCount, maxHeight, groupsPerType, hiddenRows, emptyColumns, traySlots, trayCapacity, maxChunk]: Row): LevelDef => ({
  id,
  seed: 1000 + id * 101,
  columns,
  types,
  clearCount,
  maxHeight,
  groupsPerType,
  hiddenRows,
  emptyColumns,
  traySlots,
  trayCapacity,
  maxChunk,
});

export const CAMPAIGN: LevelDef[] = ROWS.map(toDef);
export const CAMPAIGN_LENGTH = CAMPAIGN.length;

/** Levels after the campaign: endless, seeded by level number, hard-ish but varied. */
export function endlessDef(id: number): LevelDef {
  const rng = mulberry32(id * 2654435761);
  const clearCount = randInt(rng, 6, 10);
  const types = randInt(rng, 6, 8);
  const emptyColumns = randInt(rng, 0, 1);
  const capacity = (8 - emptyColumns) * 11;
  const groupsPerType = types * clearCount * 2 <= capacity * 0.9 ? 2 : 1;
  return {
    id,
    seed: 1000 + id * 101,
    columns: 8,
    types,
    clearCount,
    maxHeight: 12,
    groupsPerType,
    hiddenRows: randInt(rng, 5, 9),
    emptyColumns,
    traySlots: 3,
    trayCapacity: clearCount - 1,
    maxChunk: randInt(rng, 3, 5),
  };
}

export const levelDef = (id: number): LevelDef => (id <= CAMPAIGN_LENGTH ? CAMPAIGN[id - 1] : endlessDef(id));
