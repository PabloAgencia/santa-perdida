import { RADIO } from '../config/radio.js';
import { GameState } from '../core/GameState.js';
import { EventBus } from '../core/EventBus.js';
import { cumpleTodas } from '../core/condiciones.js';

// MAREJADA FM (config/radio.js). Solo suena yendo en coche: al subir dice la
// emisora y, despues, una frase cada 35-55 s. Por orden de prioridad:
//   1. la persecucion en directo, si llevas 3 estrellas o mas (una vez por
//      nivel y como mucho cada minuto)
//   2. una noticia nueva de lo que has hecho (una sola vez por partida)
//   3. ambiente y anuncios, alternando, al azar
// UIScene la pinta como un rotulo abajo (evento 'radio').

export const EVT_RADIO = 'radio:linea';

export class RadioSystem {
  constructor() {
    this.t = 4;
    this.enCoche = false;
    this.ultimaBusca = 0;
    this.tBusca = 0;
    this.turno = 0;
  }

  update(dt, conduciendo) {
    if (!conduciendo) { this.enCoche = false; return; }
    if (!this.enCoche) {
      this.enCoche = true;
      this.t = Math.min(this.t, 3);
    }
    this.tBusca -= dt;

    // la persecucion no espera a su turno
    const nivel = GameState.wanted;
    if (nivel > this.ultimaBusca && this.tBusca <= 0) {
      const linea = [...RADIO.persecucion].reverse().find((l) => nivel >= l.busca);
      if (linea) { this.decir(linea.texto); this.tBusca = 60; this.t = 30; }
    }
    if (nivel < 3) this.ultimaBusca = Math.min(this.ultimaBusca, nivel);
    if (nivel >= 3) this.ultimaBusca = Math.max(this.ultimaBusca, nivel);

    this.t -= dt;
    if (this.t > 0) return;
    this.t = 35 + Math.random() * 20;

    const oidas = GameState.flags.radioOida = GameState.flags.radioOida || {};
    const nueva = RADIO.noticias.findIndex((n, i) => !oidas[i] && cumpleTodas(n.solo));
    if (nueva >= 0) {
      oidas[nueva] = true;
      this.decir(RADIO.noticias[nueva].texto, true);
      return;
    }
    const lista = this.turno++ % 2 === 0 ? RADIO.ambiente : RADIO.anuncios;
    this.decir(lista[Math.floor(Math.random() * lista.length)]);
  }

  decir(texto, noticia = false) {
    EventBus.emit(EVT_RADIO, { emisora: RADIO.nombre, texto, noticia });
  }
}
