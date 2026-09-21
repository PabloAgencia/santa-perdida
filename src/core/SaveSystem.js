import { EventBus, EVT } from './EventBus.js';
import { GameState } from './GameState.js';
import { SAVE } from '../config/balance.js';
import { Cloud } from './Cloud.js';

// Tres ranuras de partida, cada una con su progreso. La que esta en uso se
// recuerda, asi que al volver al juego se sigue donde se dejo.

let ranuraActual = 1;

function clave(n) {
  return `${SAVE.key}-${n}`;
}

function leerCrudo(n) {
  try {
    const raw = localStorage.getItem(clave(n));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// La partida de antes de que hubiera ranuras pasa a ser la numero 1. Asi
// nadie pierde lo que tenia jugado al actualizar el juego.
(function migrarPartidaAntigua() {
  try {
    const vieja = localStorage.getItem(SAVE.key);
    if (vieja && !localStorage.getItem(clave(1))) {
      localStorage.setItem(clave(1), vieja);
      localStorage.removeItem(SAVE.key);
    }
    const guardada = parseInt(localStorage.getItem(SAVE.keyRanuraActiva), 10);
    if (guardada >= 1 && guardada <= SAVE.ranuras) ranuraActual = guardada;
  } catch {
    /* sin localStorage se juega igual, pero sin guardar */
  }
})();

export const SaveSystem = {
  get ranura() {
    return ranuraActual;
  },

  usarRanura(n) {
    ranuraActual = Math.min(SAVE.ranuras, Math.max(1, n | 0));
    try {
      localStorage.setItem(SAVE.keyRanuraActiva, String(ranuraActual));
    } catch {
      /* da igual: se pierde solo al cerrar */
    }
    return ranuraActual;
  },

  save(n = ranuraActual) {
    // quien tenga datos vivos (posiciones, coches) los vuelca en GameState antes
    EventBus.emit(EVT.BEFORE_SAVE);
    try {
      localStorage.setItem(clave(n), JSON.stringify(GameState.serialize()));
      EventBus.emit(EVT.SAVED, { ok: true, ranura: n });
      // si hay cuenta, ademas sube a la nube. Nunca bloquea el guardado de
      // aqui: si no hay internet, la partida local ya esta a salvo.
      if (Cloud.conectado) {
        Cloud.subir(n).catch(() => {
          /* se reintenta en el siguiente guardado */
        });
      }
      return true;
    } catch (err) {
      console.warn('[Save] no se pudo guardar:', err);
      EventBus.emit(EVT.SAVED, { ok: false, ranura: n });
      return false;
    }
  },

  load(n = ranuraActual) {
    const data = leerCrudo(n);
    if (!data) return false;
    const ok = GameState.load(data);
    if (ok) {
      this.usarRanura(n);
      EventBus.emit(EVT.AFTER_LOAD, data);
    }
    return ok;
  },

  // guardar una partida que viene de fuera (de la nube) en una ranura
  guardarCrudo(n, estado) {
    try {
      localStorage.setItem(clave(n), JSON.stringify(estado));
      return true;
    } catch {
      return false;
    }
  },

  hasSave(n = ranuraActual) {
    return !!leerCrudo(n);
  },

  hayAlguna() {
    for (let n = 1; n <= SAVE.ranuras; n++) if (this.hasSave(n)) return true;
    return false;
  },

  // resumen para la pantalla de ranuras, sin cargar la partida
  resumen(n) {
    const d = leerCrudo(n);
    if (!d) return null;
    const misiones = d.flags && d.flags.misiones ? Object.keys(d.flags.misiones).length : 0;
    return {
      ranura: n,
      dinero: d.money || 0,
      misiones,
      entregas: (d.stats && d.stats.deliveries) || 0,
      salud: d.health ?? 100,
      fecha: d.savedAt || null,
    };
  },

  clear(n = ranuraActual) {
    try {
      localStorage.removeItem(clave(n));
    } catch {
      /* sin localStorage no hay nada que borrar */
    }
  },

  borrarTodo() {
    for (let n = 1; n <= SAVE.ranuras; n++) this.clear(n);
  },
};
