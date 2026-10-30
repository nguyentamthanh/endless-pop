import { levelDef, CAMPAIGN_LENGTH } from '../config/levels';
import { generateLevel, GeneratedLevel } from '../core/LevelGenerator';

const cache = new Map<number, GeneratedLevel>();

/** Builds (and memoises) a validated level. Campaign and endless levels share one numbering. */
export function loadLevel(id: number): GeneratedLevel {
  let lvl = cache.get(id);
  if (!lvl) {
    lvl = generateLevel(levelDef(id));
    cache.set(id, lvl);
  }
  return lvl;
}

export const isEndless = (id: number): boolean => id > CAMPAIGN_LENGTH;

export const levelLabel = (id: number): string => (isEndless(id) ? `Endless ${id - CAMPAIGN_LENGTH}` : `Level ${id}`);
