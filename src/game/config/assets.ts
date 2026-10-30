/**
 * Every image the game loads. Paths are relative to /public.
 * `ASSET_MANIFEST.md` documents size, prompt and usage for each key.
 */
export interface ImageAsset {
  key: string;
  url: string;
}

export const TILE_ICON_COUNT = 8;
export const tileIconKey = (icon: number): string => `icon_${icon}`;

/** English names for tile icons (tutorial copy, accessibility). */
export const TILE_ICON_NAMES = ['Moo', 'Milk', 'Sunflower', 'Carrot', 'Strawberry', 'Lollipop', 'Hay', 'Clover'];

const img = (key: string, url: string): ImageAsset => ({ key, url: `assets/${url}` });

/** Loaded by Boot so the loading screen has art. */
export const BOOT_IMAGES: ImageAsset[] = [img('moo_idle', 'characters/moo_idle.png'), img('bg_sky', 'backgrounds/bg_sky.webp')];

export const IMAGES: ImageAsset[] = [
  // backgrounds
  img('bg_game', 'backgrounds/bg_game.webp'),
  img('bg_hills', 'backgrounds/bg_hills.png'),
  img('bg_meadow', 'backgrounds/bg_meadow.png'),
  img('cloud_0', 'backgrounds/cloud_0.png'),
  img('cloud_1', 'backgrounds/cloud_1.png'),
  img('cloud_2', 'backgrounds/cloud_2.png'),
  // characters
  img('moo_happy', 'characters/moo_happy.png'),
  img('moo_shocked', 'characters/moo_shocked.png'),
  img('moo_sad', 'characters/moo_sad.png'),
  // gameplay objects
  img('tile_base', 'objects/tile_base.png'),
  img('tile_back', 'objects/tile_back.png'),
  ...Array.from({ length: TILE_ICON_COUNT }, (_, i) => img(tileIconKey(i), `objects/icon_${i}.png`)),
  // ui
  img('btn_green', 'ui/btn_green.png'),
  img('btn_yellow', 'ui/btn_yellow.png'),
  img('btn_blue', 'ui/btn_blue.png'),
  img('btn_pink', 'ui/btn_pink.png'),
  img('btn_round', 'ui/btn_round.png'),
  img('panel', 'ui/panel.png'),
  img('ribbon', 'ui/ribbon.png'),
  img('tray_slot', 'ui/tray_slot.png'),
  ...[
    'play',
    'pause',
    'settings',
    'restart',
    'home',
    'sound_on',
    'sound_off',
    'music_on',
    'music_off',
    'undo',
    'shuffle',
    'add_slot',
    'lock',
    'star',
    'star_empty',
    'coin',
    'close',
    'levels',
    'hand',
  ].map((n) => img(`ic_${n}`, `ui/ic_${n}.png`)),
  // effects + result art
  img('fx_sparkle', 'effects/fx_sparkle.png'),
  img('fx_star', 'effects/fx_star.png'),
  img('fx_puff', 'effects/fx_puff.png'),
  img('trophy', 'effects/trophy.png'),
  img('rain_cloud', 'effects/rain_cloud.png'),
];
