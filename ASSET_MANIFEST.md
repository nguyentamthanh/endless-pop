# Asset manifest

All art was generated for this project with **Google Gemini (gemini.google.com, image generation)** from the prompts below,
then processed by `tools/process-assets.mjs` (background removal, slicing, resize, compression).
No image comes from the reference game. Text and numbers are never baked into art: everything readable is Phaser Text.

Status is computed when this file is generated: **present** = the game file exists in `public/assets`, **missing** = the game
falls back to a simple vector stand-in drawn by `TextureFactory.ts` until the file is added.

Procedural (not generated): `fx_glow` and `fx_rays` (canvas gradients), `fx_confetti`, `fx_dot`, `px` particles (`TextureFactory.createCoreTextures`), and all sound (`AudioSystem`, Web Audio synthesis).

Generated in the Gemini web app (gemini.google.com, image generation) on 2026-10-30. Every file below is the Gemini output with only background removal, cropping, resizing and compression applied.

Shared style suffix: _Cute 2D cartoon mobile casual game art, thick dark-brown outlines, soft cel shading, bright pastel and candy colors, glossy highlights, clean vector look, high detail, no text, no letters, no numbers, no watermark-like logos._

Sprites/sheets are requested on flat magenta `#FF00FF`, which the processor keys out.

## moo_idle

- Raw file: `raw-assets/moo_idle.png` (sprite)
- Used for: Menu hero, loading screen, HUD reactions (idle pose)
- Prompt:

  > Full-body character art of Moo: a chubby round white baby cow mascot with a few black spots, small rounded pink snout with two nostrils, tiny cream horns, floppy ears with pink inside, short stubby legs, and cool black sunglasses always on. Standing front view, confident cheeky smile, one hoof on hip. _[style]_ Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadow on the background, no gradient, generous empty space between objects.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/characters/moo_idle.png` | fit 512×512 | PNG | present (70 KB) |

## moo_happy

- Raw file: `raw-assets/moo_happy.png` (sprite)
- Used for: Combo/clear reaction in the HUD, victory screen
- Prompt:

  > The exact same character as the previous image (Moo, the chubby white baby cow with black spots, pink snout, cream horns, black sunglasses), full body, jumping with joy, big open-mouth smile, holding a shiny golden trophy cup above its head. Cute 2D cartoon mobile casual game art, thick dark-brown outlines, soft cel shading, bright pastel and candy colors, glossy highlights, clean vector look, no text, no letters, no numbers. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadow on the background, no gradient.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/characters/moo_happy.png` | fit 512×512 | PNG | present (66 KB) |

## moo_shocked

- Raw file: `raw-assets/moo_shocked.png` (sprite)
- Used for: Invalid move / No-moves panel reaction
- Prompt:

  > The exact same character as before (Moo, the chubby white baby cow with black spots, pink snout, cream horns, black sunglasses), full body, shocked and surprised, mouth wide open in an O, sunglasses slipping down its snout, hooves raised up. Cute 2D cartoon mobile casual game art, thick dark-brown outlines, soft cel shading, bright pastel and candy colors, glossy highlights, clean vector look, no text, no letters, no numbers. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadow on the background, no gradient.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/characters/moo_shocked.png` | fit 512×512 | PNG | present (75 KB) |

## moo_sad

- Raw file: `raw-assets/moo_sad.png` (sprite)
- Used for: Game-over screen
- Prompt:

  > The exact same character as before (Moo, the chubby white baby cow with black spots, pink snout, cream horns, black sunglasses), full body, sitting sadly on the ground, droopy ears, a single big tear rolling from under the sunglasses, small frown. Cute 2D cartoon mobile casual game art, thick dark-brown outlines, soft cel shading, bright pastel and candy colors, glossy highlights, clean vector look, no text, no letters, no numbers. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadow on the background, no gradient.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/characters/moo_sad.png` | fit 512×512 | PNG | present (80 KB) |

## tile_icons

- Raw file: `raw-assets/tile_icons.png` (sheet)
- Used for: Tile faces (icon_0 Moo, 1 milk, 2 sunflower, 3 carrot, 4 strawberry, 5 lollipop, 6 hay, 7 clover)
- Prompt:

  > A wide image with a set of 8 separate game item icons arranged in a neat grid of 4 columns and 2 rows, all the same size and style, each fully separated from the others by wide magenta gaps: 1) the head only of Moo, the same cow character as before, with black sunglasses, 2) a glass milk bottle with a blue cap, 3) a sunflower blossom, 4) an orange carrot with green leaves, 5) a red strawberry, 6) a pink and white swirl lollipop, 7) a golden hay bale, 8) a green four-leaf clover. Cute 2D cartoon mobile casual game art, thick dark-brown outlines, soft cel shading, bright candy colors, glossy highlights, no text, no letters, no numbers. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient, no sparkles.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/objects/icon_0.png` | fit 160×160 | PNG | present (10 KB) |
| `public/assets/objects/icon_1.png` | fit 160×160 | PNG | present (8 KB) |
| `public/assets/objects/icon_2.png` | fit 160×160 | PNG | present (15 KB) |
| `public/assets/objects/icon_3.png` | fit 160×160 | PNG | present (9 KB) |
| `public/assets/objects/icon_4.png` | fit 160×160 | PNG | present (11 KB) |
| `public/assets/objects/icon_5.png` | fit 160×160 | PNG | present (9 KB) |
| `public/assets/objects/icon_6.png` | fit 160×160 | PNG | present (13 KB) |
| `public/assets/objects/icon_7.png` | fit 160×160 | PNG | present (11 KB) |

## tile_cards

- Raw file: `raw-assets/tile_cards.png` (sheet)
- Used for: Tile card face (behind icons) and face-down back
- Prompt:

  > A wide image with two separate square game tile cards side by side with a wide magenta gap between them, same size, seen straight from the front, rounded corners, thick dark-brown outline, and a thicker darker bottom edge so each looks like a chunky 3D block. Left card: a plain empty cream/ivory face with a subtle inner bevel and no icon. Right card: the face-down back side, sky-blue with a small cute white paw-print pattern in the middle. Cute 2D cartoon mobile casual game art, soft cel shading, glossy highlights, no text, no letters, no numbers. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient, no sparkles.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/objects/tile_base.png` | fit 160×160 | PNG | present (8 KB) |
| `public/assets/objects/tile_back.png` | fit 160×160 | PNG | present (11 KB) |

## ui_icons_a

- Raw file: `raw-assets/ui_icons_a.png` (sheet)
- Used for: Icons on round buttons (menu, pause, settings)
- Prompt:

  > A wide image with a set of 9 separate chunky game UI glyph icons, each with a white fill and thick dark-brown outline, arranged in a neat 3 columns by 3 rows grid with wide magenta gaps between every icon, all the same size, reading order left to right then top to bottom: 1) play triangle, 2) pause symbol (two bars), 3) settings gear, 4) restart circular arrow, 5) house (home), 6) speaker with sound waves, 7) speaker with a red X (muted), 8) double music note, 9) double music note with a red diagonal slash. Cute 2D cartoon mobile game UI style, soft cel shading, no text, no letters, no numbers. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient, no sparkles.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/ui/ic_play.png` | fit 128×128 | PNG | present (5 KB) |
| `public/assets/ui/ic_pause.png` | fit 128×128 | PNG | present (6 KB) |
| `public/assets/ui/ic_settings.png` | fit 128×128 | PNG | present (7 KB) |
| `public/assets/ui/ic_restart.png` | fit 128×128 | PNG | present (8 KB) |
| `public/assets/ui/ic_home.png` | fit 128×128 | PNG | present (6 KB) |
| `public/assets/ui/ic_sound_on.png` | fit 128×128 | PNG | present (6 KB) |
| `public/assets/ui/ic_sound_off.png` | fit 128×128 | PNG | present (5 KB) |
| `public/assets/ui/ic_music_on.png` | fit 128×128 | PNG | present (6 KB) |
| `public/assets/ui/ic_music_off.png` | fit 128×128 | PNG | present (7 KB) |

## ui_icons_b

- Raw file: `raw-assets/ui_icons_b.png` (sheet)
- Used for: Booster icons, stars, coins, lock, close, level-select icon
- Prompt:

  > A wide image with a set of 9 separate chunky game UI icons arranged in a neat 3 columns by 3 rows grid with wide magenta gaps between every icon, all the same size, thick dark-brown outlines, reading order left to right then top to bottom: 1) a white curved undo arrow, 2) two white crossing shuffle arrows, 3) a white plus sign on a small rounded square, 4) a golden padlock, 5) a shiny gold star, 6) an empty grey star, 7) a shiny gold coin with a cow-spot emboss, 8) a white X close mark, 9) a white 2x2 grid of four rounded squares. Cute 2D cartoon mobile game UI style, soft cel shading, no text, no letters, no numbers. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient, no sparkles.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/ui/ic_undo.png` | fit 128×128 | PNG | present (5 KB) |
| `public/assets/ui/ic_shuffle.png` | fit 128×128 | PNG | present (6 KB) |
| `public/assets/ui/ic_add_slot.png` | fit 128×128 | PNG | present (9 KB) |
| `public/assets/ui/ic_lock.png` | fit 128×128 | PNG | present (7 KB) |
| `public/assets/ui/ic_star.png` | fit 128×128 | PNG | present (7 KB) |
| `public/assets/ui/ic_star_empty.png` | fit 128×128 | PNG | present (6 KB) |
| `public/assets/ui/ic_coin.png` | fit 128×128 | PNG | present (9 KB) |
| `public/assets/ui/ic_close.png` | fit 128×128 | PNG | present (6 KB) |
| `public/assets/ui/ic_levels.png` | fit 128×128 | PNG | present (6 KB) |

## ui_buttons

- Raw file: `raw-assets/ui_buttons.png` (sheet)
- Used for: Pill buttons (3-sliced), round icon buttons, tray slots
- Prompt:

  > A wide image with six separate blank glossy game buttons, no icons and no text, arranged in a 3 columns by 2 rows grid with wide magenta gaps between them, reading order left to right then top to bottom: 1) a wide green pill-shaped button, 2) a wide yellow pill-shaped button, 3) a wide blue pill-shaped button, 4) a wide pink pill-shaped button, 5) a round blue circle button, 6) a dark-navy rounded-square inset slot (an empty socket). Each has a thick dark-brown outline, a darker bottom lip for 3D depth and a glossy top highlight. Cute 2D cartoon mobile game UI style, soft cel shading. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient, no sparkles.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/ui/btn_green.png` | fit 320×320 | PNG | present (15 KB) |
| `public/assets/ui/btn_yellow.png` | fit 320×320 | PNG | present (16 KB) |
| `public/assets/ui/btn_blue.png` | fit 320×320 | PNG | present (15 KB) |
| `public/assets/ui/btn_pink.png` | fit 320×320 | PNG | present (15 KB) |
| `public/assets/ui/btn_round.png` | fit 160×160 | PNG | present (10 KB) |
| `public/assets/ui/tray_slot.png` | fit 160×160 | PNG | present (7 KB) |

## ui_panel

- Raw file: `raw-assets/ui_panel.png` (sheet)
- Used for: Popup windows (9-sliced) and their title ribbon
- Prompt:

  > A wide image with two separate blank game UI frames side by side with a wide magenta gap between them. Left: a large square cream/ivory popup panel with rounded corners, a thick dark-brown outline, a light inner border and soft inner shading, completely empty inside. Right: a wide pink ribbon banner with folded ends and a thick dark-brown outline, completely empty with no text, for holding a title. Cute 2D cartoon mobile game UI style, soft cel shading, glossy highlights. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient, no sparkles.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/ui/panel.png` | fit 512×512 | PNG | present (121 KB) |
| `public/assets/ui/ribbon.png` | fit 512×512 | PNG | present (28 KB) |

## fx_sheet

- Raw file: `raw-assets/fx_sheet.png` (sheet)
- Used for: Particles, result-screen props, tutorial pointer
- Prompt:

  > A wide image with six separate game effect and prop sprites arranged in a 3 columns by 2 rows grid with wide magenta gaps between them, reading order left to right then top to bottom: 1) a four-pointed white-yellow twinkle sparkle, 2) a plump shiny yellow star with a thick dark-brown outline, 3) a soft white puff of smoke cloud, 4) a shiny golden trophy cup with a thick dark-brown outline, 5) a small grey rain cloud with a few blue raindrops falling below it, 6) a cartoon white-gloved hand with the index finger pointing up, thick dark-brown outline. Cute 2D cartoon mobile game art, soft cel shading, no text, no letters, no numbers. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/effects/fx_sparkle.png` | fit 96×96 | PNG | present (2 KB) |
| `public/assets/effects/fx_star.png` | fit 96×96 | PNG | present (5 KB) |
| `public/assets/effects/fx_puff.png` | fit 128×128 | PNG | present (5 KB) |
| `public/assets/effects/trophy.png` | fit 256×256 | PNG | present (22 KB) |
| `public/assets/effects/rain_cloud.png` | fit 256×256 | PNG | present (18 KB) |
| `public/assets/ui/ic_hand.png` | fit 160×160 | PNG | present (8 KB) |

## bg_sky

- Raw file: `raw-assets/bg_sky.png` (full)
- Used for: Menu + loading sky layer
- Prompt:

  > Generate an image in tall vertical 9:16 portrait aspect ratio: a bright cheerful cartoon sky background for a mobile game menu, soft blue gradient getting lighter toward the bottom, warm sun glow in the top corner, a few faint sparkles, no clouds, no ground, no characters, no objects, no text. Clean soft vector style.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/backgrounds/bg_sky.webp` | 720×1280 | WEBP | present (6 KB) |

## bg_game

- Raw file: `raw-assets/bg_game.png` (full)
- Used for: Gameplay and level-select backdrop
- Prompt:

  > Generate an image in tall vertical 9:16 portrait aspect ratio: a calm pastel periwinkle-blue gradient backdrop for a mobile puzzle game with very subtle soft bokeh circles and faint cow-spot shapes, low contrast so game pieces stand out, empty in the middle, no characters, no clouds, no text. Clean soft vector style.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/backgrounds/bg_game.webp` | 720×1280 | WEBP | present (6 KB) |

## bg_land

- Raw file: `raw-assets/bg_land.png` (sheet)
- Used for: Menu parallax land layers
- Prompt:

  > A wide image with two separate wide landscape strips for a parallax game background, one above the other with a wide magenta gap between them, each strip spanning almost the full width of the image. Top strip: far rolling light-green hills with a few round trees, flat bottom edge, wavy top edge. Bottom strip: a near bright-green meadow with little white daisies and a short wooden fence, flat bottom edge, wavy top edge. Cute 2D cartoon mobile game art, thick dark-brown outlines on trees and fence only, soft cel shading, no text. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient, no sparkles.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/backgrounds/bg_hills.png` | fit 1024×1024 | PNG | present (47 KB) |
| `public/assets/backgrounds/bg_meadow.png` | fit 1024×1024 | PNG | present (49 KB) |

## clouds

- Raw file: `raw-assets/clouds.png` (sheet)
- Used for: Drifting parallax clouds (menu + gameplay)
- Prompt:

  > Three separate fluffy white cartoon clouds of different shapes in a row with wide magenta gaps between them, soft blue-tinted shading underneath, thin soft outline. Cute 2D cartoon mobile game art, no text. Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient, no sparkles.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/backgrounds/cloud_0.png` | fit 384×384 | PNG | present (24 KB) |
| `public/assets/backgrounds/cloud_1.png` | fit 384×384 | PNG | present (23 KB) |
| `public/assets/backgrounds/cloud_2.png` | fit 384×384 | PNG | present (23 KB) |

## app_icon

- Raw file: `raw-assets/app_icon.png` (full)
- Used for: Favicon / home-screen icon / store icon
- Prompt:

  > Generate an image in square 1:1 aspect ratio: a mobile app icon showing the big friendly face of Moo, the same chubby white baby cow character with black spots, pink snout, cream horns and black sunglasses, filling most of the frame and winking, on a vivid sky-blue background with a few colorful square cream game tiles flying around it. Cute 2D cartoon style, thick dark-brown outlines, glossy highlights, full-bleed square (no rounded corners), no text, no letters.

| Output | Size | Format | Status |
|---|---|---|---|
| `public/assets/ui/app_icon.png` | 256×256 | PNG | present (107 KB) |
| `store-art/app_icon_512.png` | 512×512 | PNG | present (361 KB) |
| `store-art/cover_square_800x800.png` | 800×800 | PNG | present (820 KB) |

## promo

- Raw file: `raw-assets/promo.png` (full)
- Used for: Store / portal thumbnail and Playgama landscape cover
- Prompt:

  > Generate an image in wide 16:9 landscape aspect ratio: promotional key art for a mobile puzzle game. Moo, the same chubby white baby cow with black spots, pink snout, cream horns and black sunglasses, jumps happily in the center in front of colorful stacks of square cream game tiles (with milk bottle, sunflower, carrot, strawberry and lollipop icons), tiles bouncing through the air with sparkles, sunny blue sky and a green meadow. Cute 2D cartoon style, thick dark-brown outlines, glossy highlights, vivid candy colors, no text, no letters, no logos.

| Output | Size | Format | Status |
|---|---|---|---|
| `store-art/promo_1280x720.png` | 1280×720 | PNG | present (2058 KB) |
| `store-art/cover_landscape_1920x1080.png` | 1920×1080 | PNG | present (4499 KB) |

## banner_portrait

- Raw file: `raw-assets/banner_portrait.png` (full)
- Used for: Playgama portrait cover
- Prompt:

  > Generate an image in tall vertical 9:16 portrait aspect ratio: promotional key art banner for a mobile puzzle game. Moo, the same chubby white baby cow with black spots, pink snout, cream horns and black sunglasses, jumps happily in the lower middle, surrounded by tall colorful stacks of square cream game tiles (with milk bottle, sunflower, carrot, strawberry, lollipop, hay bale and clover icons) that bounce through the air with sparkles and stars. Sunny bright blue sky with fluffy clouds at the top, green meadow at the bottom. Leave the top third fairly calm. Cute 2D cartoon style, thick dark-brown outlines, glossy highlights, vivid candy colors, no text, no letters, no logos.

| Output | Size | Format | Status |
|---|---|---|---|
| `store-art/cover_portrait_1080x1920.png` | 1080×1920 | PNG | present (4346 KB) |
