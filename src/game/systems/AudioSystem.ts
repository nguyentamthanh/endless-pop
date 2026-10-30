export type Sfx =
  | 'click'
  | 'pick'
  | 'land'
  | 'pop'
  | 'combo'
  | 'invalid'
  | 'flip'
  | 'win'
  | 'lose'
  | 'coin'
  | 'star'
  | 'booster'
  | 'whoosh';

const NOTE = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);
// C major pentatonic around C5, as semitone offsets from A4.
const PENTA = [-9, -7, -5, -2, 0, 3, 5, 7, 10, 12];
// I–V–vi–IV bass roots (C3, G2, A2, F2).
const BASS = [-21, -26, -24, -28];
const MELODY = [0, 2, 4, 2, 5, 4, 2, -1, 3, 4, 6, 4, 7, 6, 4, -1, 2, 4, 5, 4, 2, 1, 0, -1, 4, 5, 7, 5, 4, 2, 1, 0];
const BPM = 104;
const STEP = 60 / BPM / 2; // eighth notes

/**
 * All sounds are synthesised with Web Audio: no audio files to download, instant start.
 * The context is suspended whenever the game is paused or the tab is hidden.
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noise!: AudioBuffer;
  private soundOn: boolean;
  private musicOn: boolean;
  private paused = false;
  private hidden = false;
  private platformMuted = false;
  private musicTimer: number | null = null;
  private nextStepTime = 0;
  private step = 0;

  constructor(soundOn: boolean, musicOn: boolean) {
    this.soundOn = soundOn;
    this.musicOn = musicOn;
  }

  /** Must run inside a user gesture on mobile browsers. Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.55;
      this.musicBus.connect(this.master);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    this.refresh();
  }

  isSoundOn = () => this.soundOn;
  isMusicOn = () => this.musicOn;

  setSound(on: boolean): void {
    this.soundOn = on;
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    this.refresh();
  }

  /** Game paused (pause menu). */
  setPaused(p: boolean): void {
    this.paused = p;
    this.refresh();
  }

  /** Browser tab hidden / app backgrounded. */
  setHidden(h: boolean): void {
    this.hidden = h;
    this.refresh();
  }

  /** Host platform allows or forbids audio (ads, platform mute). */
  setPlatformAudio(enabled: boolean): void {
    this.platformMuted = !enabled;
    this.refresh();
  }

  private get silenced(): boolean {
    return this.hidden || this.platformMuted;
  }

  private get active(): boolean {
    return !!this.ctx && !this.silenced;
  }

  private refresh(): void {
    if (!this.ctx) return;
    if (this.silenced) {
      void this.ctx.suspend();
    } else if (this.ctx.state !== 'running') {
      void this.ctx.resume();
    }
    const wantMusic = this.musicOn && !this.paused && !this.silenced;
    if (wantMusic && this.musicTimer === null) {
      this.nextStepTime = this.ctx.currentTime + 0.1;
      this.musicTimer = window.setInterval(() => this.scheduleMusic(), 50);
    } else if (!wantMusic && this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  play(name: Sfx, combo = 0): void {
    if (!this.soundOn || this.paused || !this.active) return;
    const t = this.ctx!.currentTime + 0.005;
    const up = Math.pow(2, Math.min(combo, 8) / 12);
    switch (name) {
      case 'click':
        this.tone(880, t, 0.05, 'sine', 0.25, 1200);
        break;
      case 'pick':
        this.tone(520 * up, t, 0.09, 'triangle', 0.3, 780 * up);
        break;
      case 'land':
        this.tone(260, t, 0.09, 'sine', 0.45, 150);
        this.burst(t, 0.03, 2400, 0.08);
        break;
      case 'pop':
        this.tone(620 * up, t, 0.1, 'sine', 0.35, 1250 * up);
        this.burst(t, 0.04, 5000, 0.12);
        break;
      case 'combo':
        [0, 4, 7, 12].forEach((s, i) => this.tone(NOTE(3 + s + combo), t + i * 0.06, 0.14, 'triangle', 0.22));
        break;
      case 'invalid':
        this.tone(220, t, 0.07, 'square', 0.12, 200);
        this.tone(170, t + 0.08, 0.1, 'square', 0.12, 150);
        break;
      case 'flip':
        this.burst(t, 0.06, 3200, 0.1);
        this.tone(900, t, 0.05, 'sine', 0.1, 1300);
        break;
      case 'win':
        [0, 4, 7, 12, 16].forEach((s, i) => this.tone(NOTE(3 + s), t + i * 0.1, 0.3, 'triangle', 0.25));
        this.tone(NOTE(27), t + 0.5, 0.6, 'sine', 0.12);
        break;
      case 'lose':
        [7, 4, 0, -5].forEach((s, i) => this.tone(NOTE(3 + s), t + i * 0.16, 0.3, 'triangle', 0.22, NOTE(2 + s)));
        break;
      case 'coin':
        this.tone(988, t, 0.06, 'square', 0.12);
        this.tone(1319, t + 0.06, 0.16, 'square', 0.12);
        break;
      case 'star':
        this.tone(1047, t, 0.25, 'sine', 0.22);
        this.tone(1568, t + 0.05, 0.3, 'sine', 0.15);
        break;
      case 'booster':
        this.tone(400, t, 0.35, 'sawtooth', 0.1, 1400);
        this.tone(800, t + 0.05, 0.3, 'sine', 0.15, 2000);
        break;
      case 'whoosh':
        this.burst(t, 0.18, 1400, 0.12);
        break;
    }
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, bus?: GainNode): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private burst(t: number, dur: number, cutoff: number, gain: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** Look-ahead scheduler for the background loop (4 bars, I–V–vi–IV). */
  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    while (this.nextStepTime < ctx.currentTime + 0.2) {
      const s = this.step % 32;
      const t = this.nextStepTime;
      if (s % 8 === 0) this.tone(NOTE(BASS[s / 8]), t, STEP * 7, 'triangle', 0.16, undefined, this.musicBus);
      if (s % 2 === 0) this.tone(NOTE(BASS[Math.floor(s / 8)] + 12), t, STEP * 0.8, 'sine', 0.05, undefined, this.musicBus);
      const m = MELODY[s];
      if (m >= 0) this.tone(NOTE(PENTA[m]), t, STEP * 1.6, 'sine', 0.07, undefined, this.musicBus);
      this.nextStepTime += STEP;
      this.step++;
    }
  }
}
