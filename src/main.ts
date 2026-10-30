import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import './styles/main.css';
import Phaser from 'phaser';
import { gameConfig } from './game/GameConfig';
import { PLATFORM_PAUSE_EVENT, platform } from './game/systems/PlatformService';
import { services } from './game/systems/Services';

async function boot(): Promise<void> {
  // Bridge first: saved progress and the host's audio state are needed before the first scene.
  await platform.init();
  await services.save.load();

  const { save, audio } = services;
  audio.setSound(save.get().sound);
  audio.setMusic(save.get().music);
  audio.setPlatformAudio(platform.audioEnabled);

  // Mobile browsers only allow audio after a gesture.
  window.addEventListener('pointerdown', () => audio.unlock(), { passive: true });

  const game = new Phaser.Game(gameConfig);
  if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __game: Phaser.Game }).__game = game;

  game.events.on(Phaser.Core.Events.HIDDEN, () => {
    audio.setHidden(true);
    save.flushNow();
  });
  game.events.on(Phaser.Core.Events.VISIBLE, () => audio.setHidden(false));
  window.addEventListener('pagehide', () => save.flushNow());

  // One handler covers interstitials, rewarded ads, tab switches and platform pauses.
  platform.onAudioChanged((enabled) => audio.setPlatformAudio(enabled));
  platform.onPauseChanged((paused) => {
    audio.setHidden(paused);
    if (paused) game.events.emit(PLATFORM_PAUSE_EVENT);
  });
}

void boot();
