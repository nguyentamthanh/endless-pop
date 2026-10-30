import { platform } from './PlatformService';

export interface SaveData {
  /** Highest level the player may start. */
  unlocked: number;
  stars: Record<number, number>;
  bestScore: Record<number, number>;
  coins: number;
  sound: boolean;
  music: boolean;
  tutorialDone: boolean;
}

const DEFAULTS: SaveData = {
  unlocked: 1,
  stars: {},
  bestScore: {},
  coins: 100,
  sound: true,
  music: true,
  tutorialDone: false,
};

/** One Bridge storage key per field; they are read and written together in a single call. */
const KEYS = Object.keys(DEFAULTS) as Array<keyof SaveData>;
const STORAGE_KEYS = KEYS.map((k) => `ep_${k}`);
/** Writes are coalesced so a burst of updates costs one storage call. */
const FLUSH_DELAY_MS = 250;

const fresh = (): SaveData => ({ ...DEFAULTS, stars: {}, bestScore: {} });

/**
 * Progress storage. Everything lives in memory and is mirrored to the Playgama Bridge Storage
 * (cloud save where the platform has it); there is no direct localStorage access.
 */
export class SaveSystem {
  private data: SaveData = fresh();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /** Loads saved progress. Call once, after the Bridge is initialised and before the first scene. */
  async load(): Promise<void> {
    const raw = await platform.storageGet(STORAGE_KEYS);
    const next = fresh();
    KEYS.forEach((key, i) => {
      const text = raw[i];
      if (text === null || text === undefined) return;
      try {
        const value = typeof text === 'string' ? JSON.parse(text) : text;
        if (typeof value === typeof DEFAULTS[key]) (next as unknown as Record<string, unknown>)[key] = value;
      } catch {
        // A corrupt entry falls back to its default.
      }
    });
    this.data = next;
  }

  get(): Readonly<SaveData> {
    return this.data;
  }

  update(patch: Partial<SaveData>): void {
    this.data = { ...this.data, ...patch };
    this.scheduleFlush();
  }

  /** Records a win; returns true if this was a new best score. */
  recordWin(level: number, stars: number, score: number, coins: number): boolean {
    const best = this.data.bestScore[level] ?? 0;
    this.data.stars[level] = Math.max(this.data.stars[level] ?? 0, stars);
    this.data.bestScore[level] = Math.max(best, score);
    this.data.unlocked = Math.max(this.data.unlocked, level + 1);
    this.data.coins += coins;
    this.scheduleFlush();
    return score > best;
  }

  spendCoins(n: number): boolean {
    if (this.data.coins < n) return false;
    this.update({ coins: this.data.coins - n });
    return true;
  }

  totalStars(): number {
    return Object.values(this.data.stars).reduce((a, b) => a + b, 0);
  }

  bestOverall(): number {
    return Object.values(this.data.bestScore).reduce((a, b) => Math.max(a, b), 0);
  }

  reset(): void {
    this.data = { ...fresh(), sound: this.data.sound, music: this.data.music };
    this.scheduleFlush();
  }

  /** Writes now (used when the page is about to be hidden). */
  flushNow(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    void platform.storageSet(
      STORAGE_KEYS,
      KEYS.map((k) => JSON.stringify(this.data[k])),
    );
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flushNow(), FLUSH_DELAY_MS);
  }
}
