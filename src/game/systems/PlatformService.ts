import bridge from '@playgama/bridge';

type Handler = (...args: unknown[]) => void;

const INIT_TIMEOUT_MS = 6000;
/** If an ad never reports a state at all, give up waiting after this long. */
const AD_SILENCE_MS = 4000;
const AD_MAX_MS = 180000;

/**
 * Thin wrapper over the Playgama Bridge SDK.
 *
 * Every call is guarded so the game keeps working when the Bridge cannot be loaded (offline, blocked CDN):
 * ads become no-ops, storage stays in memory, audio/pause events never fire.
 */
class PlatformService {
  private ready = false;
  private gameReadySent = false;

  /** Resolves once Bridge is initialised, or after a timeout. Never rejects. */
  async init(): Promise<void> {
    try {
      const init = Promise.resolve(bridge.initialize());
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, INIT_TIMEOUT_MS));
      await Promise.race([init, timeout]);
      this.ready = !!bridge?.platform;
    } catch (e) {
      console.warn('[bridge] initialisation failed, running without platform services', e);
      this.ready = false;
    }
  }

  get available(): boolean {
    return this.ready;
  }

  /** ISO 639-1 language code reported by the host (English is the default and fallback). */
  get language(): string {
    try {
      return this.ready ? bridge.platform.language || 'en' : 'en';
    } catch {
      return 'en';
    }
  }

  get audioEnabled(): boolean {
    try {
      return this.ready ? bridge.platform.isAudioEnabled !== false : true;
    } catch {
      return true;
    }
  }

  /** Host asked us to pause (ad, tab hidden, platform menu). */
  onPauseChanged(cb: (paused: boolean) => void): void {
    this.listen(() => bridge.platform, bridge.EVENT_NAME.PAUSE_STATE_CHANGED, cb as Handler);
  }

  onAudioChanged(cb: (enabled: boolean) => void): void {
    this.listen(() => bridge.platform, bridge.EVENT_NAME.AUDIO_STATE_CHANGED, cb as Handler);
  }

  /** The first playable frame is on screen. Sent once. */
  gameReady(): void {
    if (this.gameReadySent) return;
    this.gameReadySent = true;
    this.message('game_ready');
  }

  message(name: string, level?: number): void {
    if (!this.ready) return;
    try {
      const opts = level === undefined ? undefined : { world: 'main', level: String(level) };
      void Promise.resolve(bridge.platform.sendMessage(name, opts)).catch(() => undefined);
    } catch {
      // Telemetry must never break the game.
    }
  }

  /** Custom event with a flat payload (string / number / boolean values only). */
  track(name: string, data?: Record<string, string | number | boolean>): void {
    if (!this.ready) return;
    try {
      bridge.analytics.send(name, data);
    } catch {
      // ignore
    }
  }

  /** Reads several keys in one call. Missing keys come back as null. */
  async storageGet(keys: string[]): Promise<Array<string | null>> {
    if (!this.ready) return keys.map(() => null);
    try {
      const data = (await bridge.storage.get(keys)) as unknown;
      return keys.map((_, i) => (Array.isArray(data) ? ((data[i] as string | null | undefined) ?? null) : null));
    } catch {
      return keys.map(() => null);
    }
  }

  /** Writes several keys in one call. Returns false if the platform refused. */
  async storageSet(keys: string[], values: string[]): Promise<boolean> {
    if (!this.ready) return false;
    try {
      await bridge.storage.set(keys, values);
      return true;
    } catch {
      return false;
    }
  }

  get interstitialSupported(): boolean {
    try {
      return this.ready && !!bridge.advertisement.isInterstitialSupported;
    } catch {
      return false;
    }
  }

  get rewardedSupported(): boolean {
    try {
      return this.ready && !!bridge.advertisement.isRewardedSupported;
    } catch {
      return false;
    }
  }

  /** Shows an interstitial at a natural pause. Resolves when it is closed, failed, or not available. */
  showInterstitial(placement = 'level_end'): Promise<void> {
    if (!this.interstitialSupported) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const ad = bridge.advertisement;
      let finished = false;
      let silence: ReturnType<typeof setTimeout> | undefined;
      const cap = setTimeout(() => finish(), AD_MAX_MS);
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(silence);
        clearTimeout(cap);
        try {
          ad.off(bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onState);
        } catch {
          // ignore
        }
        resolve();
      };
      const onState: Handler = (state) => {
        clearTimeout(silence);
        if (state === 'closed' || state === 'failed') finish();
      };
      try {
        ad.on(bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onState);
        silence = setTimeout(finish, AD_SILENCE_MS);
        ad.showInterstitial(placement);
      } catch {
        finish();
      }
    });
  }

  /** Resolves true only when the platform confirms the reward (state `rewarded`). */
  showRewarded(placement = 'free_shuffle'): Promise<boolean> {
    if (!this.rewardedSupported) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      const ad = bridge.advertisement;
      let finished = false;
      let rewarded = false;
      let silence: ReturnType<typeof setTimeout> | undefined;
      const cap = setTimeout(() => finish(), AD_MAX_MS);
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(silence);
        clearTimeout(cap);
        try {
          ad.off(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, onState);
        } catch {
          // ignore
        }
        resolve(rewarded);
      };
      const onState: Handler = (state) => {
        clearTimeout(silence);
        if (state === 'rewarded') rewarded = true;
        if (state === 'closed' || state === 'failed') finish();
      };
      try {
        ad.on(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, onState);
        silence = setTimeout(finish, AD_SILENCE_MS);
        ad.showRewarded(placement);
      } catch {
        finish();
      }
    });
  }

  private listen(target: () => { on(event: string, cb: Handler): void }, event: string, cb: Handler): void {
    if (!this.ready) return;
    try {
      target().on(event, cb);
    } catch {
      // ignore
    }
  }
}

export const platform = new PlatformService();

/** Emitted on the Phaser game when the host platform asks us to pause (ad, platform menu). */
export const PLATFORM_PAUSE_EVENT = 'ep-platform-pause';
