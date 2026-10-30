/**
 * Single source of truth for generated art: the exact prompt typed into the Gemini web app for every
 * raw image and how tools/process-assets.mjs turns it into game files. ASSET_MANIFEST.md is generated from this.
 *
 * Every prompt below was sent as "Generate an image: <prompt>" in one Gemini chat (so the later Moo poses
 * could refer to "the same character as before").
 *
 * kind:
 *   sprite – one object on a flat magenta background → transparent PNG
 *   sheet  – several objects on magenta, cut apart in reading order (rows top→bottom, left→right)
 *   full   – full-bleed picture (backgrounds, icon, promo) → cropped/resized, no transparency
 */

export const STYLE =
  'Cute 2D cartoon mobile casual game art, thick dark-brown outlines, soft cel shading, bright pastel and candy colors, ' +
  'glossy highlights, clean vector look, high detail, no text, no letters, no numbers, no watermark-like logos.';

const MOO_DESC =
  'a chubby round white baby cow mascot with a few black spots, small rounded pink snout with two nostrils, tiny cream horns, ' +
  'floppy ears with pink inside, short stubby legs, and cool black sunglasses always on';

const SAME_MOO =
  'The exact same character as before (Moo, the chubby white baby cow with black spots, pink snout, cream horns, black sunglasses)';

const POSE_STYLE =
  'Cute 2D cartoon mobile casual game art, thick dark-brown outlines, soft cel shading, bright pastel and candy colors, glossy highlights, clean vector look, no text, no letters, no numbers. ' +
  'Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadow on the background, no gradient.';

const SHEET_TAIL = 'Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient, no sparkles.';

export const JOBS = [
  // ---------------------------------------------------------------- characters
  {
    raw: 'moo_idle.png',
    kind: 'sprite',
    prompt:
      `Full-body character art of Moo: ${MOO_DESC}. Standing front view, confident cheeky smile, one hoof on hip. ${STYLE} ` +
      'Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadow on the background, no gradient, generous empty space between objects.',
    out: [{ file: 'characters/moo_idle.png', size: 512 }],
    use: 'Menu hero, loading screen, HUD reactions (idle pose)',
  },
  {
    raw: 'moo_happy.png',
    kind: 'sprite',
    prompt: `The exact same character as the previous image (Moo, the chubby white baby cow with black spots, pink snout, cream horns, black sunglasses), full body, jumping with joy, big open-mouth smile, holding a shiny golden trophy cup above its head. ${POSE_STYLE}`,
    out: [{ file: 'characters/moo_happy.png', size: 512 }],
    use: 'Combo/clear reaction in the HUD, victory screen',
  },
  {
    raw: 'moo_shocked.png',
    kind: 'sprite',
    prompt: `${SAME_MOO}, full body, shocked and surprised, mouth wide open in an O, sunglasses slipping down its snout, hooves raised up. ${POSE_STYLE}`,
    out: [{ file: 'characters/moo_shocked.png', size: 512 }],
    use: 'Invalid move / No-moves panel reaction',
  },
  {
    raw: 'moo_sad.png',
    kind: 'sprite',
    prompt: `${SAME_MOO}, full body, sitting sadly on the ground, droopy ears, a single big tear rolling from under the sunglasses, small frown. ${POSE_STYLE}`,
    out: [{ file: 'characters/moo_sad.png', size: 512 }],
    use: 'Game-over screen',
  },
  // ---------------------------------------------------------------- tiles
  {
    raw: 'tile_icons.png',
    kind: 'sheet',
    prompt:
      'A wide image with a set of 8 separate game item icons arranged in a neat grid of 4 columns and 2 rows, all the same size and style, each fully separated from the others by wide magenta gaps: ' +
      '1) the head only of Moo, the same cow character as before, with black sunglasses, 2) a glass milk bottle with a blue cap, 3) a sunflower blossom, 4) an orange carrot with green leaves, ' +
      '5) a red strawberry, 6) a pink and white swirl lollipop, 7) a golden hay bale, 8) a green four-leaf clover. ' +
      'Cute 2D cartoon mobile casual game art, thick dark-brown outlines, soft cel shading, bright candy colors, glossy highlights, no text, no letters, no numbers. ' +
      SHEET_TAIL,
    out: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ file: `objects/icon_${i}.png`, size: 160 })),
    use: 'Tile faces (icon_0 Moo, 1 milk, 2 sunflower, 3 carrot, 4 strawberry, 5 lollipop, 6 hay, 7 clover)',
  },
  {
    raw: 'tile_cards.png',
    kind: 'sheet',
    prompt:
      'A wide image with two separate square game tile cards side by side with a wide magenta gap between them, same size, seen straight from the front, rounded corners, thick dark-brown outline, ' +
      'and a thicker darker bottom edge so each looks like a chunky 3D block. Left card: a plain empty cream/ivory face with a subtle inner bevel and no icon. ' +
      'Right card: the face-down back side, sky-blue with a small cute white paw-print pattern in the middle. ' +
      'Cute 2D cartoon mobile casual game art, soft cel shading, glossy highlights, no text, no letters, no numbers. ' +
      SHEET_TAIL,
    out: [
      { file: 'objects/tile_base.png', size: 160 },
      { file: 'objects/tile_back.png', size: 160 },
    ],
    use: 'Tile card face (behind icons) and face-down back',
  },
  // ---------------------------------------------------------------- ui
  {
    raw: 'ui_icons_a.png',
    kind: 'sheet',
    prompt:
      'A wide image with a set of 9 separate chunky game UI glyph icons, each with a white fill and thick dark-brown outline, arranged in a neat 3 columns by 3 rows grid with wide magenta gaps between every icon, all the same size, ' +
      'reading order left to right then top to bottom: 1) play triangle, 2) pause symbol (two bars), 3) settings gear, 4) restart circular arrow, 5) house (home), 6) speaker with sound waves, ' +
      '7) speaker with a red X (muted), 8) double music note, 9) double music note with a red diagonal slash. ' +
      'Cute 2D cartoon mobile game UI style, soft cel shading, no text, no letters, no numbers. ' +
      SHEET_TAIL,
    out: ['play', 'pause', 'settings', 'restart', 'home', 'sound_on', 'sound_off', 'music_on', 'music_off'].map((n) => ({ file: `ui/ic_${n}.png`, size: 128 })),
    use: 'Icons on round buttons (menu, pause, settings)',
  },
  {
    raw: 'ui_icons_b.png',
    kind: 'sheet',
    prompt:
      'A wide image with a set of 9 separate chunky game UI icons arranged in a neat 3 columns by 3 rows grid with wide magenta gaps between every icon, all the same size, thick dark-brown outlines, ' +
      'reading order left to right then top to bottom: 1) a white curved undo arrow, 2) two white crossing shuffle arrows, 3) a white plus sign on a small rounded square, 4) a golden padlock, ' +
      '5) a shiny gold star, 6) an empty grey star, 7) a shiny gold coin with a cow-spot emboss, 8) a white X close mark, 9) a white 2x2 grid of four rounded squares. ' +
      'Cute 2D cartoon mobile game UI style, soft cel shading, no text, no letters, no numbers. ' +
      SHEET_TAIL,
    out: ['undo', 'shuffle', 'add_slot', 'lock', 'star', 'star_empty', 'coin', 'close', 'levels'].map((n) => ({ file: `ui/ic_${n}.png`, size: 128 })),
    use: 'Booster icons, stars, coins, lock, close, level-select icon',
  },
  {
    raw: 'ui_buttons.png',
    kind: 'sheet',
    prompt:
      'A wide image with six separate blank glossy game buttons, no icons and no text, arranged in a 3 columns by 2 rows grid with wide magenta gaps between them, reading order left to right then top to bottom: ' +
      '1) a wide green pill-shaped button, 2) a wide yellow pill-shaped button, 3) a wide blue pill-shaped button, 4) a wide pink pill-shaped button, 5) a round blue circle button, ' +
      '6) a dark-navy rounded-square inset slot (an empty socket). Each has a thick dark-brown outline, a darker bottom lip for 3D depth and a glossy top highlight. ' +
      'Cute 2D cartoon mobile game UI style, soft cel shading. ' +
      SHEET_TAIL,
    out: [
      { file: 'ui/btn_green.png', size: 320 },
      { file: 'ui/btn_yellow.png', size: 320 },
      { file: 'ui/btn_blue.png', size: 320 },
      { file: 'ui/btn_pink.png', size: 320 },
      { file: 'ui/btn_round.png', size: 160 },
      { file: 'ui/tray_slot.png', size: 160 },
    ],
    use: 'Pill buttons (3-sliced), round icon buttons, tray slots',
  },
  {
    raw: 'ui_panel.png',
    kind: 'sheet',
    prompt:
      'A wide image with two separate blank game UI frames side by side with a wide magenta gap between them. ' +
      'Left: a large square cream/ivory popup panel with rounded corners, a thick dark-brown outline, a light inner border and soft inner shading, completely empty inside. ' +
      'Right: a wide pink ribbon banner with folded ends and a thick dark-brown outline, completely empty with no text, for holding a title. ' +
      'Cute 2D cartoon mobile game UI style, soft cel shading, glossy highlights. ' +
      SHEET_TAIL,
    out: [
      { file: 'ui/panel.png', size: 512 },
      { file: 'ui/ribbon.png', size: 512 },
    ],
    use: 'Popup windows (9-sliced) and their title ribbon',
  },
  // ---------------------------------------------------------------- effects / result art
  {
    raw: 'fx_sheet.png',
    kind: 'sheet',
    prompt:
      'A wide image with six separate game effect and prop sprites arranged in a 3 columns by 2 rows grid with wide magenta gaps between them, reading order left to right then top to bottom: ' +
      '1) a four-pointed white-yellow twinkle sparkle, 2) a plump shiny yellow star with a thick dark-brown outline, 3) a soft white puff of smoke cloud, ' +
      '4) a shiny golden trophy cup with a thick dark-brown outline, 5) a small grey rain cloud with a few blue raindrops falling below it, ' +
      '6) a cartoon white-gloved hand with the index finger pointing up, thick dark-brown outline. ' +
      'Cute 2D cartoon mobile game art, soft cel shading, no text, no letters, no numbers. ' +
      'Isolated on a perfectly flat solid magenta (#FF00FF) background, no shadows, no gradient.',
    out: [
      { file: 'effects/fx_sparkle.png', size: 96 },
      { file: 'effects/fx_star.png', size: 96 },
      { file: 'effects/fx_puff.png', size: 128 },
      { file: 'effects/trophy.png', size: 256 },
      { file: 'effects/rain_cloud.png', size: 256 },
      { file: 'ui/ic_hand.png', size: 160 },
    ],
    use: 'Particles, result-screen props, tutorial pointer',
  },
  // ---------------------------------------------------------------- backgrounds
  {
    raw: 'bg_sky.png',
    kind: 'full',
    prompt:
      'Generate an image in tall vertical 9:16 portrait aspect ratio: a bright cheerful cartoon sky background for a mobile game menu, soft blue gradient getting lighter toward the bottom, ' +
      'warm sun glow in the top corner, a few faint sparkles, no clouds, no ground, no characters, no objects, no text. Clean soft vector style.',
    out: [{ file: 'backgrounds/bg_sky.webp', width: 720, height: 1280 }],
    use: 'Menu + loading sky layer',
  },
  {
    raw: 'bg_game.png',
    kind: 'full',
    prompt:
      'Generate an image in tall vertical 9:16 portrait aspect ratio: a calm pastel periwinkle-blue gradient backdrop for a mobile puzzle game with very subtle soft bokeh circles and faint cow-spot shapes, ' +
      'low contrast so game pieces stand out, empty in the middle, no characters, no clouds, no text. Clean soft vector style.',
    out: [{ file: 'backgrounds/bg_game.webp', width: 720, height: 1280 }],
    use: 'Gameplay and level-select backdrop',
  },
  {
    raw: 'bg_land.png',
    kind: 'sheet',
    prompt:
      'A wide image with two separate wide landscape strips for a parallax game background, one above the other with a wide magenta gap between them, each strip spanning almost the full width of the image. ' +
      'Top strip: far rolling light-green hills with a few round trees, flat bottom edge, wavy top edge. ' +
      'Bottom strip: a near bright-green meadow with little white daisies and a short wooden fence, flat bottom edge, wavy top edge. ' +
      'Cute 2D cartoon mobile game art, thick dark-brown outlines on trees and fence only, soft cel shading, no text. ' +
      SHEET_TAIL,
    out: [
      { file: 'backgrounds/bg_hills.png', size: 1024 },
      { file: 'backgrounds/bg_meadow.png', size: 1024 },
    ],
    use: 'Menu parallax land layers',
  },
  {
    raw: 'clouds.png',
    kind: 'sheet',
    prompt:
      'Three separate fluffy white cartoon clouds of different shapes in a row with wide magenta gaps between them, soft blue-tinted shading underneath, thin soft outline. ' +
      'Cute 2D cartoon mobile game art, no text. ' +
      SHEET_TAIL,
    out: [0, 1, 2].map((i) => ({ file: `backgrounds/cloud_${i}.png`, size: 384 })),
    use: 'Drifting parallax clouds (menu + gameplay)',
  },
  // ---------------------------------------------------------------- store art
  {
    raw: 'app_icon.png',
    kind: 'full',
    prompt:
      'Generate an image in square 1:1 aspect ratio: a mobile app icon showing the big friendly face of Moo, the same chubby white baby cow character with black spots, pink snout, cream horns and black sunglasses, ' +
      'filling most of the frame and winking, on a vivid sky-blue background with a few colorful square cream game tiles flying around it. ' +
      'Cute 2D cartoon style, thick dark-brown outlines, glossy highlights, full-bleed square (no rounded corners), no text, no letters.',
    out: [
      { file: 'ui/app_icon.png', width: 256, height: 256 },
      { file: 'store/app_icon_512.png', width: 512, height: 512 },
      { file: 'store/cover_square_800x800.png', width: 800, height: 800 },
    ],
    use: 'Favicon / home-screen icon / store icon',
  },
  {
    raw: 'promo.png',
    kind: 'full',
    prompt:
      'Generate an image in wide 16:9 landscape aspect ratio: promotional key art for a mobile puzzle game. Moo, the same chubby white baby cow with black spots, pink snout, cream horns and black sunglasses, ' +
      'jumps happily in the center in front of colorful stacks of square cream game tiles (with milk bottle, sunflower, carrot, strawberry and lollipop icons), tiles bouncing through the air with sparkles, ' +
      'sunny blue sky and a green meadow. Cute 2D cartoon style, thick dark-brown outlines, glossy highlights, vivid candy colors, no text, no letters, no logos.',
    out: [
      { file: 'store/promo_1280x720.png', width: 1280, height: 720 },
      { file: 'store/cover_landscape_1920x1080.png', width: 1920, height: 1080 },
    ],
    use: 'Store / portal thumbnail and Playgama landscape cover',
  },
  {
    raw: 'banner_portrait.png',
    kind: 'full',
    prompt:
      'Generate an image in tall vertical 9:16 portrait aspect ratio: promotional key art banner for a mobile puzzle game. Moo, the same chubby white baby cow with black spots, pink snout, cream horns and black sunglasses, ' +
      'jumps happily in the lower middle, surrounded by tall colorful stacks of square cream game tiles (with milk bottle, sunflower, carrot, strawberry, lollipop, hay bale and clover icons) that bounce through the air with sparkles and stars. ' +
      'Sunny bright blue sky with fluffy clouds at the top, green meadow at the bottom. Leave the top third fairly calm. Cute 2D cartoon style, thick dark-brown outlines, glossy highlights, vivid candy colors, no text, no letters, no logos.',
    out: [{ file: 'store/cover_portrait_1080x1920.png', width: 1080, height: 1920 }],
    use: 'Playgama portrait cover',
  },
];
