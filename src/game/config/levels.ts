import { LevelDef } from '../core/types';

/** Campaign follows the reference curve: 150 seeded levels, endless continues past that. */
export const CAMPAIGN_LENGTH = 150;

export const CAMPAIGN: LevelDef[] = Array.from({ length: CAMPAIGN_LENGTH }, (_, i) => ({
  id: i + 1,
  seed: (i + 1) * 7919 + 13,
}));

export function endlessDef(id: number): LevelDef {
  return { id, seed: id * 7919 + 13 };
}

export const levelDef = (id: number): LevelDef => (id <= CAMPAIGN_LENGTH ? CAMPAIGN[id - 1] : endlessDef(id));
