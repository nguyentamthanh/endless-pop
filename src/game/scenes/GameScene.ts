import Phaser from 'phaser';
import { describe } from '../core/Board';
import { allLocs, sameLoc } from '../core/Rules';
import { solve } from '../core/Solver';
import { Loc } from '../core/types';
import { FxSystem } from '../systems/FxSystem';
import { BOOSTER_PRICE, BoosterKind, GameplaySystem } from '../systems/GameplaySystem';
import { levelLabel, loadLevel } from '../systems/LevelSystem';
import { ScoreGain } from '../systems/ScoreSystem';
import { PLATFORM_PAUSE_EVENT, platform } from '../systems/PlatformService';
import { services } from '../systems/Services';
import { PerformanceSampler } from '../systems/Telemetry';
import { TutorialSystem } from '../systems/TutorialSystem';
import { Backdrop } from '../ui/Backdrop';
import { BoardView } from '../ui/BoardView';
import { BoosterBar } from '../ui/BoosterBar';
import { HUD, HUD_HEIGHT } from '../ui/HUD';
import { onLayout, safeInsets } from '../ui/layout';

export interface ResultData {
  win: boolean;
  level: number;
  score: number;
  stars: number;
  coins: number;
  newBest: boolean;
  bestCombo: number;
}

const wait = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, r));

const MECHANIC_TIP: Record<number, string> = {
  41: 'Blind boxes — opening one cracks nearby ice',
  51: 'Frozen treats. The hammer breaks the top ice',
  61: 'Frosted boxes stay icy after they flip',
  71: 'Some ? boxes hide frost underneath',
};

export class GameScene extends Phaser.Scene {
  private levelId = 1;
  private play!: GameplaySystem;
  private view!: BoardView;
  private hud!: HUD;
  private boosters!: BoosterBar;
  private fx!: FxSystem;
  private tutorial?: TutorialSystem;
  private selected: Loc | null = null;
  private busy = false;
  private ended = false;
  private hammerArmed = false;
  private stuckWarned = false;
  private boardCenter = { x: 360, y: 640 };
  private sampler = new PerformanceSampler();

  constructor() {
    super('Game');
  }

  init(data: { level?: number }): void {
    this.levelId = data.level ?? services.save.get().unlocked;
    this.selected = null;
    this.busy = true;
    this.ended = false;
    this.hammerArmed = false;
    this.stuckWarned = false;
    this.tutorial = undefined;
  }

  create(): void {
    const level = loadLevel(this.levelId);
    this.play = new GameplaySystem(level);
    const backdrop = new Backdrop(this, 'bg_game', false);
    this.fx = new FxSystem(this);
    this.view = new BoardView(
      this,
      this.play.state,
      level.iconMap,
      (loc) => this.onTap(loc),
      (loc) => this.onDragStart(loc),
      (from, to) => this.onDrop(from, to),
    );
    this.hud = new HUD(this, levelLabel(this.levelId), () => this.pause());
    this.hud.setGoal('Fill each column with 12 alike');
    this.boosters = new BoosterBar(this, (k) => void this.useBooster(k));
    this.boosters.setHammerVisible(this.play.hammerUnlocked);

    const save = services.save.get();
    if (this.levelId === 1 && !save.tutorialDone && level.solution) {
      this.tutorial = new TutorialSystem(this, this.view, level.solution);
    }

    onLayout(this, (w, h) => {
      backdrop.layout(w, h);
      this.layout(w, h);
    });

    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.game.events.on(PLATFORM_PAUSE_EVENT, this.onHidden, this);
    this.events.on(Phaser.Scenes.Events.PAUSE, this.sampler.reset, this.sampler);
    this.events.on(Phaser.Scenes.Events.RESUME, this.sampler.reset, this.sampler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
      this.game.events.off(PLATFORM_PAUSE_EVENT, this.onHidden, this);
      this.events.off(Phaser.Scenes.Events.PAUSE, this.sampler.reset, this.sampler);
      this.events.off(Phaser.Scenes.Events.RESUME, this.sampler.reset, this.sampler);
      this.view.destroy();
      if (this.debugEnabled()) delete (window as unknown as Record<string, unknown>).__ep;
    });

    this.refreshUI();
    this.hud.setProgress(0, this.play.goal, false);
    this.cameras.main.fadeIn(220, 143, 211, 255);
    services.audio.play('whoosh');
    platform.message('level_started', this.levelId);
    const tip = MECHANIC_TIP[this.levelId];
    this.time.delayedCall(this.view.introDrop(), () => {
      this.busy = false;
      if (tip) this.toast(tip);
    });
    if (this.debugEnabled()) this.installDebug();
  }

  update(): void {
    if (!this.ended) this.sampler.frame();
  }

  private layout(w: number, h: number): void {
    const ins = safeInsets(this);
    const top = ins.top + 6;
    const left = ins.left;
    const right = ins.right;
    // Wide screens (desktop, tablets and phones held sideways) move the HUD into a side column so the
    // board can use the full height; tall screens keep the HUD as a band on top.
    const landscape = w > h * 1.05;
    const sideW = landscape ? Math.min(440, Math.max(300, w * 0.22)) : 0;
    if (landscape) this.hud.layoutSide(sideW, top, h, left);
    else this.hud.layout(w, top, left);

    const usableW = w - left - right;
    const cx = left + usableW / 2;
    const slot = Math.min(108, (usableW - 32 - 2 * 104 - 50) / 4);
    const gap = 10;
    const barY = h - ins.bottom - Math.max(70, slot / 2 + 24);
    const trayHalf = 2 * slot + 1.5 * gap;
    const btn = Math.min(100, slot * 1.02);
    this.boosters.layout(cx - trayHalf - 14 - btn / 2, cx + trayHalf + 14 + btn / 2, barY, btn);
    const boardTop = landscape ? top + 24 : top + HUD_HEIGHT;
    const boardBottom = barY - slot / 2 - 28;
    // Symmetric side margins keep the board centred on screen in landscape.
    const boardX = left + 12 + sideW;
    const boardW = usableW - 24 - 2 * sideW;
    this.view.layout({ x: boardX, y: boardTop, w: boardW, h: boardBottom - boardTop }, { cx, cy: barY, slot, gap }, landscape ? 124 : 96);
    this.boardCenter = { x: cx, y: (boardTop + boardBottom) / 2 };
    this.tutorial?.layout(cx, boardTop + 50);
  }

  // ---------------------------------------------------------------- input

  private onTap(loc: Loc): void {
    if (this.busy || this.ended) return;
    if (this.hammerArmed) {
      if (loc.kind === 'col') void this.swingHammer(loc.index);
      else this.toast('Tap a frozen column');
      return;
    }
    if (this.tutorial && !this.tutorial.allow(loc)) return;
    if (loc.kind === 'tray' && loc.index >= this.play.state.trayOpen) {
      void this.useBooster('slot');
      return;
    }
    const sel = this.selected;
    if (!sel) {
      if (this.play.lift(loc) > 0) this.select(loc);
      else this.view.nudgeColumn(loc);
      return;
    }
    if (sameLoc(sel, loc)) {
      this.deselect();
      return;
    }
    if (this.play.count(sel, loc) > 0) {
      void this.performMove(sel, loc);
    } else if (this.play.lift(loc) > 0 && !this.tutorial?.active) {
      this.select(loc);
    } else {
      this.view.shakeLifted();
      services.audio.play('invalid');
      this.hud.mascot.setMood('shocked', 700);
    }
  }

  private onDragStart(loc: Loc): boolean {
    if (this.busy || this.ended || this.hammerArmed) return false;
    if (this.tutorial && !this.tutorial.allow(loc)) return false;
    if (loc.kind === 'tray' && loc.index >= this.play.state.trayOpen) return false;
    if (this.play.lift(loc) <= 0) return false;
    this.select(loc);
    return true;
  }

  private onDrop(from: Loc, to: Loc): void {
    if (this.busy || this.ended) {
      this.deselect();
      return;
    }
    if (sameLoc(from, to)) {
      this.deselect();
      return;
    }
    if (this.tutorial && !this.tutorial.allow(to)) {
      this.deselect();
      return;
    }
    if (to.kind === 'tray' && to.index >= this.play.state.trayOpen) {
      this.deselect();
      void this.useBooster('slot');
      return;
    }
    if (this.play.count(from, to) > 0) {
      void this.performMove(from, to);
      return;
    }
    services.audio.play('invalid');
    this.hud.mascot.setMood('shocked', 700);
    this.deselect();
  }

  private select(loc: Loc): void {
    this.selected = loc;
    this.view.lift(loc, this.play.lift(loc));
    this.view.highlightTargets(allLocs(this.play.state).filter((t) => this.play.count(loc, t) > 0));
    services.audio.play('pick');
    this.tutorial?.onSelected();
  }

  private deselect(): void {
    const had = this.selected;
    this.selected = null;
    this.view.drop();
    if (had) this.tutorial?.onCancelled();
  }

  private async performMove(from: Loc, to: Loc): Promise<void> {
    this.busy = true;
    this.selected = null;
    const { result, gain } = this.play.move(from, to);
    await this.view.animateMove(result, (col, center) => {
      if (col === result.completed[0]) this.onSorted(center, gain);
    });
    this.hud.setScore(this.play.score.score);
    this.hud.setProgress(this.play.completed, this.play.goal);
    this.refreshUI();
    this.tutorial?.onMoved();
    this.busy = false;
    this.checkEnd();
  }

  private onSorted(c: { x: number; y: number }, gain: ScoreGain): void {
    this.fx.starBurst(c.x, c.y, 10 + gain.combo * 2);
    this.fx.floatText(c.x, c.y - 20, `+${gain.points}`, 44, '#fff27a');
    this.hud.mascot.setMood('happy');
    services.audio.play('pop', gain.combo);
    if (gain.combo >= 2) {
      this.fx.floatText(this.boardCenter.x, this.boardCenter.y - 80, `Combo x${gain.combo}!`, 64, '#ff9fd0');
      services.audio.play('combo', gain.combo);
      this.cameras.main.shake(180, 0.004 + gain.combo * 0.001);
    }
  }

  // ---------------------------------------------------------------- boosters

  private async useBooster(kind: BoosterKind): Promise<void> {
    if (this.busy || this.ended || this.tutorial?.active) return;
    if (kind === 'hammer' && !this.play.hammerUnlocked) return;
    if (kind === 'hammer' && this.hammerArmed) {
      this.hammerArmed = false;
      this.refreshUI();
      return;
    }
    if (kind === 'undo' && !this.play.canUndo()) return this.toast('Nothing to undo');
    if (kind === 'slot' && !this.play.canUnlockSlot()) return;
    if (kind === 'hammer' && !this.play.hasIce() && !this.hammerArmed) return this.toast('No ice to break');
    if (this.play.charges[kind] === 0) {
      if (!services.save.spendCoins(BOOSTER_PRICE[kind])) {
        services.audio.play('invalid');
        return this.toast(`Need ${BOOSTER_PRICE[kind]} coins`);
      }
      this.play.charges[kind]++;
      services.audio.play('coin');
      this.hud.bumpCoins();
    }
    this.deselect();
    if (kind === 'hammer') {
      this.hammerArmed = true;
      this.refreshUI();
      this.toast('Tap a frozen column');
      return;
    }
    this.busy = true;
    platform.track('booster_used', { kind });
    if (kind === 'undo') {
      this.play.undo();
      this.view.syncAll(260);
      this.hud.setScore(this.play.score.score);
      this.hud.setProgress(this.play.completed, this.play.goal);
      await wait(this, 300);
    } else {
      this.play.unlockSlot();
      this.view.refreshTray();
      const p = this.view.stackTopPos({ kind: 'tray', index: this.play.state.trayOpen - 1 });
      this.fx.starBurst(p.x, p.y, 14);
      await wait(this, 200);
    }
    this.hud.mascot.setMood('happy');
    this.refreshUI();
    this.busy = false;
    this.checkEnd();
  }

  private async swingHammer(col: number): Promise<void> {
    if (!this.play.hammer(col)) {
      this.toast('No ice in that column');
      return;
    }
    this.hammerArmed = false;
    this.busy = true;
    platform.track('booster_used', { kind: 'hammer' });
    this.cameras.main.shake(120, 0.004);
    this.view.syncAll(220);
    const p = this.view.stackTopPos({ kind: 'col', index: col });
    this.fx.starBurst(p.x, p.y, 10);
    services.audio.play('booster');
    await wait(this, 240);
    this.refreshUI();
    this.busy = false;
    this.checkEnd();
  }

  private refreshUI(): void {
    const c = this.play.charges;
    this.boosters.refresh(c, this.play.canUndo(), this.hammerArmed);
    this.view.refreshTray(c.slot > 0 ? `+${c.slot}` : `${BOOSTER_PRICE.slot}`);
    this.hud.setCoins(services.save.get().coins);
  }

  private toast(text: string): void {
    this.fx.floatText(this.boardCenter.x, this.boardCenter.y, text, 40);
  }

  // ---------------------------------------------------------------- end of level

  private checkEnd(): void {
    if (this.ended) return;
    if (this.play.won) void this.win();
    else if (this.play.stuck) {
      if (this.play.canRecover(services.save.get().coins)) {
        if (!this.stuckWarned) {
          this.stuckWarned = true;
          this.toast('Out of space — use a booster');
        }
      } else void this.lose();
    } else this.stuckWarned = false;
  }

  private async win(): Promise<void> {
    this.ended = true;
    const score = this.play.score;
    const stars = score.stars();
    const coins = score.coinsFor(stars);
    const newBest = services.save.recordWin(this.levelId, stars, score.score, coins);
    services.audio.play('win');
    platform.message('level_completed', this.levelId);
    this.hud.mascot.setMood('happy', 0);
    this.fx.confetti(this.boardCenter.x, this.scale.height);
    await wait(this, 900);
    this.openResult({ win: true, level: this.levelId, score: score.score, stars, coins, newBest, bestCombo: score.bestCombo });
  }

  private async lose(): Promise<void> {
    this.ended = true;
    this.deselect();
    services.audio.play('lose');
    platform.message('level_failed', this.levelId);
    this.hud.mascot.setMood('sad', 0);
    this.fx.floatText(this.boardCenter.x, this.boardCenter.y, 'Out of space!', 64, '#ff9fd0');
    await wait(this, 1300);
    const s = this.play.score;
    this.openResult({ win: false, level: this.levelId, score: s.score, stars: 0, coins: 0, newBest: false, bestCombo: s.bestCombo });
  }

  private openResult(data: ResultData): void {
    this.scene.launch('Result', data);
    this.scene.pause();
  }

  // ---------------------------------------------------------------- pause / visibility

  private pause(): void {
    if (this.ended || !this.scene.isActive()) return;
    this.deselect();
    services.audio.setPaused(true);
    platform.message('level_paused', this.levelId);
    this.scene.launch('Pause', { level: this.levelId });
    this.scene.pause();
  }

  private onHidden(): void {
    if (this.scene.isActive() && !this.ended) this.pause();
  }

  // ---------------------------------------------------------------- debug (?debug=1)

  private debugEnabled(): boolean {
    return new URLSearchParams(location.search).has('debug');
  }

  private installDebug(): void {
    (window as unknown as Record<string, unknown>).__ep = {
      state: () => describe(this.play.state),
      level: () => this.levelId,
      noMoves: () => void this.lose(),
      /** Plays the solver's moves through the real input path until the level ends. */
      autoplay: async (maxMoves = 500) => {
        this.tutorial = undefined;
        const { solution } = solve(this.play.state, 60000);
        if (!solution) return 'no solution';
        for (const [from, to] of solution.slice(0, maxMoves)) {
          while (this.busy) await wait(this, 30);
          if (this.ended) break;
          await this.performMove(from, to);
        }
        return this.play.won ? 'won' : 'stopped';
      },
    };
  }
}
