import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from './config/theme';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { ResultScene } from './scenes/ResultScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#8fd3ff',
  scale: {
    // EXPAND keeps the 720-wide design and grows the short side, so tall phones get a taller board.
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },
  // All sound is synthesised by AudioSystem; Phaser's own audio is not needed.
  audio: { noAudio: true },
  render: { antialias: true, powerPreference: 'high-performance' },
  input: { activePointers: 2 },
  // ?debug=1 drives the loop with setTimeout so automated tests keep running in background tabs.
  fps: { target: 60, forceSetTimeOut: new URLSearchParams(location.search).has('debug') },
  scene: [BootScene, PreloadScene, MenuScene, LevelSelectScene, GameScene, PauseScene, ResultScene],
};
