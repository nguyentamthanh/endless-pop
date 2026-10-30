import { platform } from './PlatformService';

const WINDOW_MS = 30000;
const MAX_FRAMES = 4000;
/** A gap this long is a pause or a background stall, not a slow frame. */
const GAP_MS = 2000;
const TARGET_FPS = 60;

const percentile = (sorted: Float32Array, n: number, p: number): number => sorted[Math.min(n - 1, Math.floor((p / 100) * n))];

/**
 * Emits one aggregated `performance_sample` event roughly every 30 s of active gameplay.
 * Call `frame()` once per rendered gameplay frame and `reset()` when gameplay pauses or resumes.
 */
export class PerformanceSampler {
  private frames = new Float32Array(MAX_FRAMES);
  private count = 0;
  private activeMs = 0;
  private windowStart = 0;
  private last = 0;

  reset(): void {
    this.last = 0;
  }

  frame(): void {
    const now = performance.now();
    if (this.last === 0 || now - this.last > GAP_MS) {
      this.last = now;
      if (this.windowStart === 0) this.windowStart = now;
      return;
    }
    const dt = now - this.last;
    this.last = now;
    if (this.count < MAX_FRAMES) this.frames[this.count++] = dt;
    this.activeMs += dt;
    if (this.activeMs >= WINDOW_MS) this.flush(now);
  }

  private flush(now: number): void {
    const n = this.count;
    if (n < 10) return;
    const sorted = this.frames.slice(0, n).sort();
    let over50 = 0;
    let over100 = 0;
    let over250 = 0;
    let over500 = 0;
    let over1000 = 0;
    for (let i = 0; i < n; i++) {
      const t = sorted[i];
      if (t > 50) over50++;
      if (t > 100) over100++;
      if (t > 250) over250++;
      if (t > 500) over500++;
      if (t > 1000) over1000++;
    }
    const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
    platform.track('performance_sample', {
      target_fps: TARGET_FPS,
      window_ms: Math.round(now - this.windowStart),
      active_ms: Math.round(this.activeMs),
      frame_count: n,
      fps_avg: round((n / this.activeMs) * 1000),
      fps_p10: round(1000 / percentile(sorted, n, 90)),
      frame_time_p50_ms: round(percentile(sorted, n, 50)),
      frame_time_p95_ms: round(percentile(sorted, n, 95)),
      frame_time_p99_ms: round(percentile(sorted, n, 99)),
      frame_time_max_ms: round(sorted[n - 1]),
      frames_over_50ms: over50,
      frames_over_100ms: over100,
      frames_over_250ms: over250,
      frames_over_500ms: over500,
      frames_over_1000ms: over1000,
      game_version: __APP_VERSION__,
    });
    this.count = 0;
    this.activeMs = 0;
    this.windowStart = now;
  }
}
