# Gameplay analysis

Reference: user-supplied screen recording `IMG_1398.MP4` (22.8 s, portrait 880×1920, 60 fps),
showing the "萌宠跳跳" stage of the mini-game 《消消没够》 (level 7). Frames were extracted with
ffmpeg at 1–4 fps for review. No frames from the reference are shipped with this project.

## What the video shows

| Time | Content |
|------|---------|
| 0.0–2.0 s | Promotional splash / game menu (logo, mascot, "click link" overlay). **Not gameplay.** |
| 2.0–21.0 s | Live gameplay, level 7. |
| 21.0–22.8 s | Phone control-centre (end of recording). |

### Board
- 8 vertical lanes (columns). Tiles stack bottom-up inside each lane; lanes extend above the tiles,
  so columns can grow taller.
- 6 tile types (cream square cards with an icon).
- The lower rows of every column are **face-down tiles ("?")**.
- Columns start at uneven heights.

### Turn
- A move takes the **top run** of a column (the topmost tile plus every tile of the same type
  directly below it) and moves it onto **another column whose top tile has the same type**.
  - 2.9 s: a single watering-can tile leaves column 3 and lands on column 2 (top = watering can).
  - 5.0 s: a cow tile leaves column 5 and lands on column 3 (top = cow).
  - 13.0 s: **two** cow tiles leave column 4 *together* and land on column 3 (top = cow).
- Tiles travel on a high arc ("jump"), leaving the top of the board, then drop onto the target,
  with tiles of a group slightly staggered.

### HUD / meta
- Bottom: a 4-slot holding tray (slot 4 locked behind a video-ad icon), a **Shuffle** button and an
  **Undo** button.
- An on-screen hint says to prioritise unlocking the 3rd tray slot.

### Not visible in the clip
- No tiles are cleared during the 19 s of play: column 3 gathers 5–6 cows in a row and nothing
  pops. Clear rule, win and lose conditions therefore cannot be read from the video.

## Rules agreed with the user (assumptions filling the gaps)

1. **Clear**: when the top run of a column reaches **N or more** tiles of one type, the run pops.
   `N` is set per level (4 for the tutorial, up to 10 late game). Revealed face-down tiles that form a
   new run ≥ N pop in a chain → **combo**.
2. **Input**: tap a source (column or tray slot) to lift its top run, then tap a destination.
   Valid destinations: a column whose top tile matches, an empty column, an empty tray slot or a tray
   slot holding the same type. If the target column lacks room, only the tiles that fit move.
3. **Tray**: 3 slots by default, a 4th unlocked by the *Extra Slot* booster. A slot stores one type
   (any count). Tray tiles never pop by themselves; they must be moved back to the board.
4. **Face-down tiles** turn face-up when they become the top of their column.
5. **Win**: board and tray empty. Every type's tile count is a multiple of N.
6. **Lose**: no legal move left (tray full, no matching tops, no empty columns). The player may
   rescue the run with remaining boosters (Undo / Shuffle / Extra Slot), otherwise Game Over.

## Original identity

Our game, **Endless Pop**, keeps the *feel* (tap-to-jump stacking, hidden tiles, tray, undo/shuffle)
but uses its own name, logo, mascot rendition ("Moo", a white cow with black sunglasses), its own
tile icon set (milk, sunflower, carrot, strawberry, lollipop, hay, clover, Moo face), its own
levels, sounds and UI. No logos, icons or screenshots from the reference are used.
