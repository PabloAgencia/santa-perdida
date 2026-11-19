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
  constructor(map = null) {
    this.map = map;
    this.cola = [];
    this.tViral = 0;
    // LO QUE GRABA LA GENTE (NPCSystem.scare): si un video corre, la radio lo
    // cuenta, con el barrio. Como mucho uno cada tres minutos.
    this.onViral = (q) => this.viral(q);
    EventBus.on('npc:viral', this.onViral);
    this.t = 4;
    this.enCoche = false;
    this.ultimaBusca = 0;
    this.tBusca = 0;
    this.turno = 0;
  }

  destroy() {
    EventBus.off('npc:viral', this.onViral);
  }

  update(dt, conduciendo) {
    this.tViral -= dt;
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

    if (this.cola.length && this.t > 4) this.t = 4;
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 35 + Math.random() * 20;
    if (this.cola.length) { this.decir(this.cola.shift(), true); return; }

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

  viral(q) {
    if (!q || this.tViral > 0) return;
    this.tViral = 180;
    const barrio = (this.map && this.map.distritoAt(q.x, q.y)) || 'la ciudad';
    const visitas = (50 + Math.floor(Math.random() * 400)) * 1000;
    const que = q.motivo === 'explosion'
      ? `un coche reventando en ${barrio}. Se ve a la gente correr, y al fondo, a alguien que ni se inmuta`
      : `un tiroteo en plena calle, en ${barrio}. Se oyen los tiros y una señora que grita «¡otra vez no!»`;
    const ver = Math.floor(Math.random() * 3);
    const textos = [
      `Corre por las redes un vídeo de ${que}. Ya va por ${visitas.toLocaleString('es-ES')} visitas. Santa Perdida, siempre en tendencias por lo mismo.`,
      `Me mandáis un vídeo: ${que}. ${visitas.toLocaleString('es-ES')} reproducciones y subiendo. La policía dice que lo está «estudiando».`,
      `Lo más visto de hoy en la ciudad: ${que}. Si sales en el vídeo, un consejo: cámbiate de chaqueta.`,
    ];
    this.cola.push(textos[ver]);
    if (this.cola.length > 2) this.cola.shift();
  }

  decir(texto, noticia = false) {
    EventBus.emit(EVT_RADIO, { emisora: RADIO.nombre, texto, noticia });
  }
}
