import Phaser from 'phaser';
import { tileIconKey } from '../config/assets';
import { textStyle } from '../config/theme';
import { ClearEvent, GameState, Loc, MoveResult, Tile, tileId, tileType } from '../core/types';
import { TileSprite } from '../entities/TileSprite';
import { services } from '../systems/Services';

export interface BoardRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TrayGeom {
  cx: number;
  cy: number;
  slot: number;
  gap: number;
}

const JUMP_MS = 380;
const STAGGER_MS = 55;
const POP_STAGGER_MS = 45;
const D_TILE = 10;
const D_TRAY = 300;
const D_FLY = 1000;

interface SlotView {
  bg: Phaser.GameObjects.Image;
  lock: Phaser.GameObjects.Image;
  count: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  lockBadge: Phaser.GameObjects.Text;
}

const delay = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, r));

/**
 * Renders a GameState: lanes, tiles, tray. Owns every tile animation.
 * The state object is shared with GameplaySystem and read after each change.
 */
export class BoardView {
  tile = 64;
  private pitch = 68;
  private colX: number[] = [];
  private bottomY = 0;
  private boardTop = 0;
  private tray!: TrayGeom;
  private lanes: Phaser.GameObjects.Graphics;
  private hilite: Phaser.GameObjects.Graphics;
  private zones: Phaser.GameObjects.Zone[] = [];
  private slots: SlotView[] = [];
  private views = new Map<number, TileSprite>();
  private pool: TileSprite[] = [];
  private lifted: { loc: Loc; ids: number[] } | null = null;

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private iconMap: number[],
    private onTap: (loc: Loc) => void,
  ) {
    this.lanes = scene.add.graphics().setDepth(2);
    this.hilite = scene.add.graphics().setDepth(3);
    state.cols.forEach((_, index) => {
      const z = scene.add.zone(0, 0, 10, 10).setInteractive();
      z.on('pointerdown', () => this.onTap({ kind: 'col', index }));
      this.zones.push(z);
    });
    for (let index = 0; index < state.cfg.traySize; index++) {
      const bg = scene.add.image(0, 0, 'tray_slot').setDepth(D_TRAY - 2);
      const lock = scene.add.image(0, 0, 'ic_lock').setDepth(D_TRAY + 50);
      const lockBadge = scene.add.text(0, 0, '', textStyle(24)).setOrigin(0.5).setDepth(D_TRAY + 51);
      const count = scene.add.text(0, 0, '', textStyle(28, '#fff27a')).setOrigin(0.5).setDepth(D_TRAY + 60);
      const zone = scene.add.zone(0, 0, 10, 10).setInteractive();
      zone.on('pointerdown', () => this.onTap({ kind: 'tray', index }));
      this.slots.push({ bg, lock, count, zone, lockBadge });
    }
  }

  // ---------------------------------------------------------------- layout

  layout(board: BoardRect, tray: TrayGeom): void {
    const { cols, cfg } = this.state;
    this.pitch = Math.min(board.w / cols.length, board.h / cfg.maxHeight, 96);
    this.tile = Math.round(this.pitch * 0.94);
    const cx = board.x + board.w / 2;
    this.colX = cols.map((_, i) => cx + (i - (cols.length - 1) / 2) * this.pitch);
    this.bottomY = board.y + board.h;
    this.boardTop = this.bottomY - this.pitch * cfg.maxHeight;
    this.tray = tray;
    this.drawLanes();
    this.zones.forEach((z, i) => {
      z.setPosition(this.colX[i], (this.boardTop + this.bottomY) / 2 - 10).setSize(this.pitch, this.bottomY - this.boardTop + 40);
      z.input?.hitArea.setTo(0, 0, z.width, z.height);
    });
    this.slots.forEach((s, i) => {
      const x = this.slotX(i);
      s.bg.setPosition(x, tray.cy).setScale(tray.slot / s.bg.width);
      s.lock.setPosition(x, tray.cy - tray.slot * 0.06).setScale((tray.slot * 0.5) / s.lock.width);
      s.lockBadge.setPosition(x, tray.cy + tray.slot * 0.34);
      s.count.setPosition(x + tray.slot * 0.3, tray.cy - tray.slot * 0.36);
      s.zone.setPosition(x, tray.cy).setSize(tray.slot + tray.gap, tray.slot + 20);
      s.zone.input?.hitArea.setTo(0, 0, s.zone.width, s.zone.height);
    });
    this.views.forEach((v) => v.setTileSize(this.sizeFor(this.locOf(v.tileId))));
    this.syncAll(0);
  }

  private slotX(i: number): number {
    const n = this.state.cfg.traySize;
    return this.tray.cx + (i - (n - 1) / 2) * (this.tray.slot + this.tray.gap);
  }

  private drawLanes(): void {
    const g = this.lanes.clear();
    const w = this.tile + 10;
    const h = this.bottomY - this.boardTop + 12;
    for (const x of this.colX) {
      g.fillStyle(0xffffff, 0.16).fillRoundedRect(x - w / 2, this.boardTop - 6, w, h, 14);
      g.lineStyle(3, 0xffffff, 0.35).strokeRoundedRect(x - w / 2, this.boardTop - 6, w, h, 14);
    }
  }

  /** Lanes that would accept the lifted tiles glow softly. */
  highlightTargets(targets: Loc[]): void {
    const g = this.hilite.clear();
    this.scene.tweens.killTweensOf(g);
    if (!targets.length) return;
    const w = this.tile + 10;
    const h = this.bottomY - this.boardTop + 12;
    for (const t of targets) {
      if (t.kind === 'col') {
        g.fillStyle(0xfff27a, 0.22).fillRoundedRect(this.colX[t.index] - w / 2, this.boardTop - 6, w, h, 14);
        g.lineStyle(4, 0xfff27a, 0.8).strokeRoundedRect(this.colX[t.index] - w / 2, this.boardTop - 6, w, h, 14);
      } else {
        const s = this.tray.slot + 8;
        g.lineStyle(5, 0xfff27a, 0.9).strokeRoundedRect(this.slotX(t.index) - s / 2, this.tray.cy - s / 2, s, s, 18);
      }
    }
    g.setAlpha(1);
    this.scene.tweens.add({ targets: g, alpha: 0.45, duration: 450, yoyo: true, repeat: -1 });
  }

  // ---------------------------------------------------------------- positions

  private locOf(id: number): { loc: Loc; index: number } {
    const s = this.state;
    for (let c = 0; c < s.cols.length; c++) {
      const i = s.cols[c].findIndex((t) => tileId(t) === id);
      if (i >= 0) return { loc: { kind: 'col', index: c }, index: i };
    }
    for (let k = 0; k < s.tray.length; k++) {
      const i = s.tray[k].findIndex((t) => tileId(t) === id);
      if (i >= 0) return { loc: { kind: 'tray', index: k }, index: i };
    }
    return { loc: { kind: 'col', index: 0 }, index: 0 };
  }

  private sizeFor(p: { loc: Loc }): number {
    return p.loc.kind === 'tray' ? Math.round(this.tray.slot * 0.8) : this.tile;
  }

  /** Screen position of the tile at `index` inside a stack. */
  posOf(loc: Loc, index: number, stackLen: number): { x: number; y: number; depth: number; visible: boolean } {
    if (loc.kind === 'col') {
      return { x: this.colX[loc.index], y: this.bottomY - this.pitch * (index + 0.5), depth: D_TILE + index, visible: true };
    }
    const fromTop = stackLen - 1 - index;
    return {
      x: this.slotX(loc.index),
      y: this.tray.cy + Math.min(fromTop, 2) * 5 - 2,
      depth: D_TRAY + index,
      visible: fromTop < 3,
    };
  }

  /** Top-of-stack world position (where an incoming tile lands). */
  stackTopPos(loc: Loc): { x: number; y: number } {
    const stack = loc.kind === 'col' ? this.state.cols[loc.index] : this.state.tray[loc.index];
    const p = this.posOf(loc, Math.max(0, stack.length - 1), stack.length);
    return { x: p.x, y: loc.kind === 'col' ? p.y : this.tray.cy };
  }

  laneCenter(col: number): { x: number; y: number } {
    return { x: this.colX[col], y: (this.boardTop + this.bottomY) / 2 };
  }

  // ---------------------------------------------------------------- views

  private acquire(t: Tile, faceDown: boolean, size: number): TileSprite {
    const v = this.pool.pop() ?? new TileSprite(this.scene);
    v.setup(tileId(t), tileIconKey(this.iconMap[tileType(t)]), size, faceDown);
    this.views.set(tileId(t), v);
    return v;
  }

  private release(v: TileSprite): void {
    this.scene.tweens.killTweensOf(v);
    v.setGlow(false);
    v.setActive(false).setVisible(false);
    this.views.delete(v.tileId);
    this.pool.push(v);
  }

  /** Puts every tile where the state says. duration 0 = snap. */
  syncAll(duration = 220): void {
    const seen = new Set<number>();
    const place = (stack: Tile[], loc: Loc, hiddenCount: number) => {
      stack.forEach((t, i) => {
        const id = tileId(t);
        seen.add(id);
        const p = this.posOf(loc, i, stack.length);
        const faceDown = i < hiddenCount;
        const size = this.sizeFor({ loc });
        let v = this.views.get(id);
        if (!v) {
          v = this.acquire(t, faceDown, size).setPosition(p.x, p.y);
          if (duration > 0) {
            v.setScale(0);
            this.scene.tweens.add({ targets: v, scale: 1, duration: duration + 80, ease: 'Back.Out' });
          }
        } else {
          v.setTileSize(size);
          if (v.isFaceDown() && !faceDown) v.flipUp();
          else if (!v.isFaceDown() && faceDown) v.setFaceDown(true);
          if (duration > 0 && (v.x !== p.x || v.y !== p.y)) {
            this.scene.tweens.add({ targets: v, x: p.x, y: p.y, duration, ease: 'Cubic.Out' });
          } else {
            v.setPosition(p.x, p.y);
          }
        }
        v.setDepth(p.depth).setVisible(p.visible);
      });
    };
    this.state.cols.forEach((c, i) => place(c, { kind: 'col', index: i }, this.state.hidden[i]));
    this.state.tray.forEach((t, i) => place(t, { kind: 'tray', index: i }, 0));
    [...this.views.values()].forEach((v) => {
      if (!seen.has(v.tileId)) this.release(v);
    });
    this.refreshTray();
  }

  refreshTray(lockedLabel = ''): void {
    if (lockedLabel) this.slots.forEach((s) => s.lockBadge.setData('label', lockedLabel));
    this.slots.forEach((s, i) => {
      const locked = i >= this.state.trayOpen;
      s.bg.setTint(locked ? 0x8a93a8 : 0xffffff);
      s.lock.setVisible(locked);
      s.lockBadge.setVisible(locked).setText((s.lockBadge.getData('label') as string) ?? '');
      const n = this.state.tray[i].length;
      s.count.setVisible(n > 1).setText(`×${n}`);
    });
  }

  /** Level start: tiles rain into their lanes, column by column. */
  introDrop(): number {
    let last = 0;
    this.state.cols.forEach((c, ci) =>
      c.forEach((t, ri) => {
        const v = this.views.get(tileId(t));
        if (!v) return;
        const y = v.y;
        const wait = ci * 45 + ri * 28;
        last = Math.max(last, wait);
        v.setY(y - this.scene.scale.height).setAlpha(0);
        this.scene.tweens.add({ targets: v, y, alpha: 1, delay: wait, duration: 420, ease: 'Back.Out' });
      }),
    );
    return last + 420;
  }

  // ---------------------------------------------------------------- interactions

  lift(loc: Loc, n: number): void {
    this.drop();
    const stack = loc.kind === 'col' ? this.state.cols[loc.index] : this.state.tray[loc.index];
    const tiles = loc.kind === 'col' ? stack.slice(stack.length - n) : stack.slice(-1);
    const ids = tiles.map(tileId);
    this.lifted = { loc, ids };
    const rise = loc.kind === 'col' ? this.tile * 0.28 : this.tray.slot * 0.18;
    ids.forEach((id, i) => {
      const v = this.views.get(id);
      if (!v) return;
      const p = this.posOf(loc, stack.length - ids.length + i, stack.length);
      v.setGlow(true);
      this.scene.tweens.killTweensOf(v);
      this.scene.tweens.add({ targets: v, y: p.y - rise, scaleX: 1.06, scaleY: 1.06, duration: 150, ease: 'Back.Out' });
    });
  }

  drop(): void {
    if (!this.lifted) return;
    const { loc, ids } = this.lifted;
    this.lifted = null;
    const stack = loc.kind === 'col' ? this.state.cols[loc.index] : this.state.tray[loc.index];
    ids.forEach((id) => {
      const v = this.views.get(id);
      if (!v) return;
      v.setGlow(false);
      const idx = stack.findIndex((t) => tileId(t) === id);
      if (idx < 0) return;
      const p = this.posOf(loc, idx, stack.length);
      this.scene.tweens.killTweensOf(v);
      this.scene.tweens.add({ targets: v, y: p.y, scaleX: 1, scaleY: 1, duration: 140, ease: 'Quad.Out' });
    });
    this.highlightTargets([]);
  }

  shakeLifted(): void {
    const ids = this.lifted?.ids ?? [];
    ids.forEach((id) => {
      const v = this.views.get(id);
      if (!v) return;
      this.scene.tweens.add({ targets: v, x: v.x + 8, duration: 45, yoyo: true, repeat: 3 });
    });
  }

  nudgeColumn(loc: Loc): void {
    const stack = loc.kind === 'col' ? this.state.cols[loc.index] : this.state.tray[loc.index];
    const v = stack.length ? this.views.get(tileId(stack[stack.length - 1])) : undefined;
    if (v) this.scene.tweens.add({ targets: v, y: v.y - 10, duration: 70, yoyo: true });
  }

  /** Jump → land → pop runs → flip reveals. `onClear` fires per popped run (for score/fx). */
  async animateMove(res: MoveResult, onClear: (ev: ClearEvent, center: { x: number; y: number }) => void): Promise<void> {
    this.lifted = null;
    this.highlightTargets([]);
    const to = res.to;
    const toStack = to.kind === 'col' ? this.state.cols[to.index] : this.state.tray[to.index];
    // Final resting slots of the moved tiles, as if nothing had popped yet.
    const clearedDest = res.clears.filter((c) => to.kind === 'col' && c.col === to.index).reduce((n, c) => n + c.tiles.length, 0);
    const landLen = toStack.length + clearedDest;
    const firstIndex = landLen - res.moved.length;
    const destHidden = to.kind === 'col' ? this.state.hidden[to.index] : 0;

    services.audio.play('pick');
    const jumps = res.moved.map((t, i) => {
      const v = this.views.get(tileId(t));
      if (!v) return Promise.resolve();
      v.setGlow(false).setDepth(D_FLY + i);
      const end = this.posOf(to, firstIndex + i, landLen);
      const endSize = this.sizeFor({ loc: to });
      return this.jump(v, end.x, end.y, endSize, i * STAGGER_MS).then(() => {
        v.setDepth(to.kind === 'col' ? D_TILE + firstIndex + i : D_TRAY + firstIndex + i);
      });
    });

    // Source column: reveal right after the tiles leave.
    const fromCol = res.from.kind === 'col' ? res.from.index : -1;
    res.revealed.forEach((t) => {
      const v = this.views.get(tileId(t));
      if (v && fromCol >= 0 && this.state.cols[fromCol].includes(t)) {
        v.flipUp(140);
        this.scene.time.delayedCall(140, () => services.audio.play('flip'));
      }
    });

    await Promise.all(jumps);
    // Tray stacks keep only the top tiles visible.
    if (to.kind === 'tray') this.syncAll(120);

    for (const ev of res.clears) {
      const mid = ev.tiles[Math.floor(ev.tiles.length / 2)];
      const mv = this.views.get(tileId(mid));
      onClear(ev, { x: mv?.x ?? this.colX[ev.col], y: mv?.y ?? this.bottomY });
      await Promise.all(
        [...ev.tiles].reverse().map((t, i) => {
          const v = this.views.get(tileId(t));
          return v ? this.popTile(v, i * POP_STAGGER_MS) : Promise.resolve();
        }),
      );
    }
    if (destHidden || res.clears.length) await delay(this.scene, 60);
    this.syncAll(160);
    await delay(this.scene, 180);
  }

  /** Quadratic-Bezier hop over the board, growing mid-air and squashing on landing. */
  private jump(v: TileSprite, x: number, y: number, endSize: number, wait: number): Promise<void> {
    return new Promise((resolve) => {
      const counter = { t: 0 };
      this.scene.time.delayedCall(wait, () => {
        const sx = v.x;
        const sy = v.y;
        const cx = (sx + x) / 2;
        const cy = Math.min(sy, y) - this.pitch * 2.2 - Math.abs(x - sx) * 0.25;
        const startSize = v.size;
        const tilt = 12 * Math.sign(x - sx || 1);
        this.scene.tweens.add({
          targets: counter,
          t: 1,
          duration: JUMP_MS,
          ease: 'Sine.InOut',
          onUpdate: () => {
            const t = counter.t;
            const u = 1 - t;
            v.setPosition(u * u * sx + 2 * u * t * cx + t * t * x, u * u * sy + 2 * u * t * cy + t * t * y);
            v.setAngle(Math.sin(t * Math.PI) * tilt);
            v.setScale(1 + Math.sin(t * Math.PI) * 0.18);
            if (startSize !== endSize) v.setTileSize(startSize + (endSize - startSize) * t);
          },
          onComplete: () => {
            v.setAngle(0);
            v.setScale(1.18, 0.8);
            services.audio.play('land');
            this.scene.tweens.add({ targets: v, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.Out', onComplete: () => resolve() });
          },
        });
      });
    });
  }

  private popTile(v: TileSprite, wait: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: v,
        scale: 1.3,
        delay: wait,
        duration: 110,
        ease: 'Quad.Out',
        onStart: () => v.setDepth(D_FLY + 50),
        onComplete: () => {
          this.scene.events.emit('tile-pop', v.x, v.y);
          this.scene.tweens.add({
            targets: v,
            scale: 0,
            alpha: 0,
            duration: 140,
            ease: 'Back.In',
            onComplete: () => {
              this.release(v);
              resolve();
            },
          });
        },
      });
    });
  }

  destroy(): void {
    this.views.forEach((v) => v.destroy());
    this.pool.forEach((v) => v.destroy());
    this.views.clear();
    this.pool = [];
  }
}
