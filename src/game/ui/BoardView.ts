import Phaser from 'phaser';
import { tileIconKey } from '../config/assets';
import { textStyle } from '../config/theme';
import { isComplete } from '../core/Board';
import { FROST_HIDDEN_FROM, GameState, Loc, MoveResult, Tile, tileIce, tileId, tileType } from '../core/types';
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
  private checks: Phaser.GameObjects.Text[] = [];
  private pending: { loc: Loc; id: number; x: number; y: number; active: boolean; rejected: boolean } | null = null;
  private hoverSlot = -1;

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private iconMap: number[],
    private onTap: (loc: Loc) => void,
    private onDragStart: (loc: Loc) => boolean = () => false,
    private onDrop: (from: Loc, to: Loc) => void = () => undefined,
  ) {
    this.lanes = scene.add.graphics().setDepth(2);
    this.hilite = scene.add.graphics().setDepth(3);
    state.cols.forEach((_, index) => {
      const z = scene.add.zone(0, 0, 10, 10).setInteractive();
      z.on('pointerdown', (p: Phaser.Input.Pointer) => this.pointerDown({ kind: 'col', index }, p));
      this.zones.push(z);
      this.checks.push(scene.add.text(0, 0, '✓', textStyle(32, '#fff27a', '#8a5a12')).setOrigin(0.5).setDepth(4).setVisible(false));
    });
    for (let index = 0; index < state.cfg.traySize; index++) {
      const bg = scene.add.image(0, 0, 'tray_slot').setDepth(D_TRAY - 2);
      const lock = scene.add.image(0, 0, 'ic_lock').setDepth(D_TRAY + 50);
      const lockBadge = scene.add.text(0, 0, '', textStyle(24)).setOrigin(0.5).setDepth(D_TRAY + 51);
      const count = scene.add.text(0, 0, '', textStyle(28, '#fff27a')).setOrigin(0.5).setDepth(D_TRAY + 60);
      const zone = scene.add.zone(0, 0, 10, 10).setInteractive();
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.pointerDown({ kind: 'tray', index }, p));
      this.slots.push({ bg, lock, count, zone, lockBadge });
    }
    this.scene.input.on('pointermove', this.pointerMove, this);
    this.scene.input.on('pointerup', this.pointerUp, this);
    this.scene.input.on('pointerupoutside', this.pointerUp, this);
    this.scene.input.on('gameout', this.pointerUp, this);
  }

  // ---------------------------------------------------------------- layout

  /** `maxPitch` caps the tile spacing so short boards don't blow tiles up past their art resolution. */
  layout(board: BoardRect, tray: TrayGeom, maxPitch = 96): void {
    const { cols, cfg } = this.state;
    this.pitch = Math.min(board.w / cols.length, board.h / cfg.maxHeight, maxPitch);
    this.tile = Math.round(this.pitch * 0.94);
    const cx = board.x + board.w / 2;
    this.colX = cols.map((_, i) => cx + (i - (cols.length - 1) / 2) * this.pitch);
    this.bottomY = board.y + board.h;
    this.boardTop = this.bottomY - this.pitch * cfg.maxHeight;
    this.tray = tray;
    this.drawLanes();
    this.zones.forEach((z, i) => {
      const zoneTop = this.boardTop - this.tile * 0.45;
      const zoneH = this.bottomY - zoneTop;
      z.setPosition(this.colX[i], zoneTop + zoneH / 2).setSize(this.pitch, zoneH).setDepth(1);
      z.input?.hitArea.setTo(0, 0, z.width, z.height);
    });
    this.slots.forEach((s, i) => {
      const x = this.slotX(i);
      s.bg.setPosition(x, tray.cy).setScale(tray.slot / s.bg.width);
      s.lock.setPosition(x, tray.cy - tray.slot * 0.06).setScale((tray.slot * 0.5) / s.lock.width);
      s.lockBadge.setPosition(x, tray.cy + tray.slot * 0.34);
      s.count.setPosition(x + tray.slot * 0.3, tray.cy - tray.slot * 0.36);
      s.zone.setPosition(x, tray.cy).setSize(tray.slot + 8, tray.slot + 8).setDepth(2);
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
    this.colX.forEach((x, i) => {
      const done = isComplete(this.state, i);
      g.fillStyle(done ? 0xfff27a : 0xffffff, done ? 0.28 : 0.16).fillRoundedRect(x - w / 2, this.boardTop - 6, w, h, 14);
      g.lineStyle(done ? 5 : 3, done ? 0xffd15c : 0xffffff, done ? 0.95 : 0.35).strokeRoundedRect(x - w / 2, this.boardTop - 6, w, h, 14);
      const mark = this.checks[i];
      if (mark) mark.setPosition(x, this.boardTop + 18).setVisible(done).setFontSize(Math.round(this.tile * 0.42));
    });
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
    void stackLen;
    if (loc.kind === 'col') {
      return { x: this.colX[loc.index], y: this.bottomY - this.pitch * (index + 0.5), depth: D_TILE + index, visible: true };
    }
    return {
      x: this.slotX(loc.index),
      y: this.tray.cy,
      depth: D_TRAY,
      visible: true,
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
          this.scene.tweens.killTweensOf(v);
          v.setAngle(0);
          const off =
            Math.abs(v.x - p.x) > 1.5 ||
            Math.abs(v.y - p.y) > 1.5 ||
            Math.abs(v.scaleX - 1) > 0.02 ||
            Math.abs(v.scaleY - 1) > 0.02;
          if (duration > 0 && off) {
            this.scene.tweens.add({ targets: v, x: p.x, y: p.y, scaleX: 1, scaleY: 1, angle: 0, duration, ease: 'Quad.Out' });
          } else {
            v.setPosition(p.x, p.y).setScale(1).setAngle(0);
          }
        }
        v.setDepth(p.depth).setVisible(p.visible);
        const showFrost = faceDown && tileIce(t) > 0 && this.state.level < FROST_HIDDEN_FROM;
        v.setIce(tileIce(t), showFrost);
      });
    };
    this.state.cols.forEach((c, i) => place(c, { kind: 'col', index: i }, this.state.hidden[i]));
    this.state.tray.forEach((t, i) => place(t, { kind: 'tray', index: i }, 0));
    [...this.views.values()].forEach((v) => {
      if (!seen.has(v.tileId)) this.release(v);
    });
    this.refreshTray();
    this.drawLanes();
  }

  refreshTray(lockedLabel = ''): void {
    if (lockedLabel) this.slots.forEach((s) => s.lockBadge.setData('label', lockedLabel));
    this.slots.forEach((s, i) => {
      const locked = i >= this.state.trayOpen;
      s.bg.setTint(locked ? 0x8a93a8 : 0xffffff);
      s.lock.setVisible(locked);
      s.lockBadge.setVisible(locked && i === this.state.trayOpen).setText((s.lockBadge.getData('label') as string) ?? '');
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

  /** Column, or the nearest tray slot once the pointer is below the board. */
  locAt(x: number, y: number): Loc | null {
    if (!this.tray) return null;
    const slot = this.tray.slot;
    if (y >= this.bottomY - 8 && y <= this.tray.cy + slot * 0.85) {
      const index = this.nearestSlot(x);
      if (index >= 0) return { kind: 'tray', index };
      return null;
    }
    const col = this.colX.findIndex((cx) => Math.abs(x - cx) <= this.pitch * 0.55);
    if (col >= 0 && y >= this.boardTop - this.tile && y <= this.bottomY + 4) return { kind: 'col', index: col };
    return null;
  }

  /** Slot whose cell contains x, or -1 outside the tray row. */
  private nearestSlot(x: number): number {
    const n = this.state.cfg.traySize;
    const span = this.tray.slot + this.tray.gap;
    if (x < this.slotX(0) - span / 2 || x > this.slotX(n - 1) + span / 2) return -1;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x - this.slotX(i));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  private pointerDown(loc: Loc, p: Phaser.Input.Pointer): void {
    if (p.button > 0) return;
    if (this.pending?.active) this.finishDrag(this.pending.x, this.pending.y);
    this.pending = { loc, id: p.id, x: p.x, y: p.y, active: false, rejected: false };
  }

  private pointerMove(p: Phaser.Input.Pointer): void {
    const drag = this.pending;
    if (!drag || p.id !== drag.id || drag.rejected) return;
    drag.x = p.x;
    drag.y = p.y;
    if (!p.isDown) {
      this.finishDrag(p.x, p.y);
      return;
    }
    const dx = p.x - p.downX;
    const dy = p.y - p.downY;
    if (!drag.active && dx * dx + dy * dy < 8 * 8 && dy < 10) return;
    if (!drag.active) {
      if (!this.onDragStart(drag.loc)) {
        drag.rejected = true;
        return;
      }
      drag.active = true;
    }
    this.dragTo(p.x, p.y);
  }

  private pointerUp(p?: Phaser.Input.Pointer): void {
    if (!this.pending) return;
    if (p && typeof p.id === 'number' && p.id !== this.pending.id) return;
    this.finishDrag(p?.x ?? this.pending.x, p?.y ?? this.pending.y);
  }

  private finishDrag(x: number, y: number): void {
    const drag = this.pending;
    if (!drag) return;
    this.pending = null;
    this.hoverSlot = -1;
    if (!drag.active) {
      if (!drag.rejected) this.onTap(drag.loc);
      return;
    }
    this.onDrop(drag.loc, this.dropLoc(x, y) ?? drag.loc);
  }

  /**
   * The finger decides. A tile already snapped into a slot must not keep the drop stuck there
   * once the finger is back on a column.
   */
  private dropLoc(px: number, py: number): Loc | null {
    const underFinger = this.locAt(px, py);
    if (underFinger) return underFinger;
    const ids = this.lifted?.ids ?? [];
    const top = ids.length ? this.views.get(ids[ids.length - 1]) : undefined;
    if (!top) return null;
    return this.locAt(top.x, top.y + top.size * 0.2);
  }

  /** Tray takes one tile. That tile locks to the slot; the rest snap straight back onto the column. */
  private dragTo(px: number, py: number): void {
    const ids = this.lifted?.ids ?? [];
    if (!ids.length) return;
    const aim = this.locAt(px, py);
    const overTray = aim?.kind === 'tray';
    const flying = overTray ? ids.slice(-1) : ids;
    const parked = overTray ? ids.slice(0, -1) : [];
    parked.forEach((id) => this.seat(id, 0));
    if (!overTray) this.hoverSlot = -1;
    const n = flying.length;
    flying.forEach((id, i) => {
      const v = this.views.get(id);
      if (!v) return;
      const fromTop = n - 1 - i;
      if (overTray && aim) {
        const p = this.posOf(aim, 0, 1);
        const size = this.sizeFor({ loc: aim });
        v.setDepth(D_TRAY + 5).setAngle(0);
        if (v.size !== size) v.setTileSize(size);
        const entered = this.hoverSlot !== aim.index;
        this.hoverSlot = aim.index;
        if (entered) {
          this.scene.tweens.killTweensOf(v);
          this.scene.tweens.add({
            targets: v,
            x: p.x,
            y: p.y,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            duration: 90,
            ease: 'Back.Out',
            onComplete: () => v.setPosition(p.x, p.y).setScale(1).setAngle(0),
          });
        } else if (!this.scene.tweens.isTweening(v)) {
          v.setPosition(p.x, p.y).setScale(1).setAngle(0);
        }
        return;
      }
      this.scene.tweens.killTweensOf(v);
      if (this.lifted?.loc.kind === 'col' && v.size !== this.tile) v.setTileSize(this.tile);
      v.setDepth(D_FLY + i).setAngle(0).setScale(1.04);
      v.setPosition(px, py - this.tile * 0.12 - fromTop * this.pitch * 0.82);
    });
  }

  private seat(id: number, duration: number): void {
    const v = this.views.get(id);
    if (!v) return;
    const place = this.locOf(id);
    const stack = place.loc.kind === 'col' ? this.state.cols[place.loc.index] : this.state.tray[place.loc.index];
    const p = this.posOf(place.loc, place.index, stack.length);
    this.scene.tweens.killTweensOf(v);
    v.setAngle(0).setDepth(p.depth).setVisible(p.visible);
    if (duration <= 0) {
      v.setPosition(p.x, p.y).setScale(1);
      return;
    }
    this.scene.tweens.add({
      targets: v,
      x: p.x,
      y: p.y,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      duration,
      ease: 'Quad.Out',
      onComplete: () => v.setPosition(p.x, p.y).setScale(1).setAngle(0),
    });
  }

  lift(loc: Loc, n: number): void {
    this.drop();
    const stack = loc.kind === 'col' ? this.state.cols[loc.index] : this.state.tray[loc.index];
    const tiles = stack.slice(-n);
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
    const ids = this.lifted.ids;
    this.lifted = null;
    this.hoverSlot = -1;
    this.highlightTargets([]);
    ids.forEach((id) => {
      this.views.get(id)?.setGlow(false);
      this.seat(id, 140);
    });
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

  /** Jump → land → flip the uncovered box → gold-check any column that just filled. */
  async animateMove(res: MoveResult, onSorted: (col: number, center: { x: number; y: number }) => void): Promise<void> {
    const moved = new Set(res.moved.map((t) => tileId(t)));
    (this.lifted?.ids ?? []).filter((id) => !moved.has(id)).forEach((id) => this.seat(id, 0));
    this.lifted = null;
    this.hoverSlot = -1;
    this.highlightTargets([]);
    const to = res.to;
    const toStack = to.kind === 'col' ? this.state.cols[to.index] : this.state.tray[to.index];
    const landLen = toStack.length;
    const firstIndex = landLen - res.moved.length;

    services.audio.play('pick');
    const jumps = res.moved.map((t, i) => {
      const v = this.views.get(tileId(t));
      if (!v) return Promise.resolve();
      v.setGlow(false).setAngle(0).setDepth(D_FLY + i);
      this.scene.tweens.killTweensOf(v);
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

    for (const col of res.completed) {
      onSorted(col, { x: this.colX[col], y: this.boardTop + this.tile });
      const tiles = this.state.cols[col];
      tiles.forEach((t, i) => {
        const v = this.views.get(tileId(t));
        if (!v) return;
        this.scene.tweens.add({
          targets: v,
          y: v.y - 8,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 160,
          delay: i * 28,
          yoyo: true,
          ease: 'Quad.Out',
        });
      });
    }
    if (res.revealed.length || res.completed.length) await delay(this.scene, 80);
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
            v.setTileSize(endSize);
            v.setAngle(0).setPosition(x, y).setScale(1);
            services.audio.play('land');
            resolve();
          },
        });
      });
    });
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.pointerMove, this);
    this.scene.input.off('pointerup', this.pointerUp, this);
    this.scene.input.off('pointerupoutside', this.pointerUp, this);
    this.scene.input.off('gameout', this.pointerUp, this);
    this.views.forEach((v) => v.destroy());
    this.pool.forEach((v) => v.destroy());
    this.views.clear();
    this.pool = [];
  }
}
