import { AudioSystem } from './AudioSystem';
import { SaveSystem } from './SaveSystem';

/** App-wide singletons shared by every scene. */
const save = new SaveSystem();
const audio = new AudioSystem(save.get().sound, save.get().music);

export const services = { save, audio };
