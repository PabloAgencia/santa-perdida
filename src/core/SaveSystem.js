import { EventBus, EVT } from './EventBus.js';
import { GameState } from './GameState.js';
import { SAVE } from '../config/balance.js';

export const SaveSystem = {
  save() {
    // quien tenga datos vivos (posiciones, coches) los vuelca en GameState antes
    EventBus.emit(EVT.BEFORE_SAVE);
    try {
      localStorage.setItem(SAVE.key, JSON.stringify(GameState.serialize()));
      EventBus.emit(EVT.SAVED, { ok: true });
      return true;
    } catch (err) {
      console.warn('[Save] no se pudo guardar:', err);
      EventBus.emit(EVT.SAVED, { ok: false });
      return false;
    }
  },

  load() {
    let raw = null;
    try {
      raw = localStorage.getItem(SAVE.key);
    } catch (err) {
      console.warn('[Save] no se pudo leer:', err);
      return false;
    }
    if (!raw) return false;

    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.warn('[Save] partida corrupta, se descarta:', err);
      this.clear();
      return false;
    }

    const ok = GameState.load(data);
    if (ok) EventBus.emit(EVT.AFTER_LOAD, data);
    return ok;
  },

  hasSave() {
    try {
      return !!localStorage.getItem(SAVE.key);
    } catch {
      return false;
    }
  },

  clear() {
    try {
      localStorage.removeItem(SAVE.key);
    } catch {
      /* sin localStorage no hay nada que borrar */
    }
  },
};
