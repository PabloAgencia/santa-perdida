import { FACTIONS, FACTION_KEYS } from '../config/factions.js';
import { puertaDe } from '../world/puertas.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';

// GUERRA POR EL TERRITORIO (de San Andreas): un punto por banda, en su
// propio barrio. Te acercas a pie y con E la desafias. Vienen CUATRO
// oleadas de tres, una detras de otra; si las aguantas todas, ganas — un
// pago grande y la banda te respeta al maximo de golpe. Si te alejas
// demasiado o mueres, se cancela y puedes volver a intentarlo cuando
// quieras.
//
// NO cambia quien manda de verdad en el barrio (ZONE_OWNER): eso movería
// NPCSystem, NegocioSystem y FactionSystem a la vez por una sola mecanica.
// "Ganar el territorio" aqui es ganarte el respeto de la banda, no
// heredar el barrio.

const OLEADAS = 4;
const POR_OLEADA = 3;
const RECOMPENSA = 4000;
const ALCANCE = 70;
const RADIO_ABANDONO = 900;       // alejarte mas que esto cancela la guerra
const PAUSA_ENTRE_OLEADAS = 4;    // segundos de respiro tras limpiar una

export class GuerraTerritorioSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.puntos = [];
    this.cerca = null;
    this.activo = null;
    this.colocar();
  }

  colocar() {
    for (const key of FACTION_KEYS) {
      const zona = FACTIONS[key].zones[0];
      const candidatos = this.map.buildings
        .filter((b) => b.zone === zona && !b.isHideout && b.pw >= 64 && b.ph >= 64)
        .sort((a, b) => a.px - b.px || a.py - b.py);

      // el primero libre: saltar los que ya tienen el cartel de otro
      // sistema (un piso, un negocio...), que si no se leen uno encima del otro
      const b = candidatos.find((c) => !this.scene.edificiosOcupados || !this.scene.edificiosOcupados.has(c));
      if (!b) continue;

      const puerta = puertaDe(this.map, b) || { x: b.px, y: b.py };
      const punto = { faction: key, x: puerta.x, y: puerta.y };
      this.puntos.push(punto);
      this.pintar(punto);
      if (this.scene.edificiosOcupados) this.scene.edificiosOcupados.add(b);
    }
  }

  pintar(p) {
    const f = FACTIONS[p.faction];
    p.aro = this.scene.add.image(p.x, p.y, 'ring')
      .setDisplaySize(58, 58).setTint(f.accent).setDepth(6);
    this.scene.tweens.add({
      targets: p.aro, scale: { from: 0.85, to: 1.15 },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.scene.add.text(p.x, p.y - 32, `TERRITORIO\n${f.short}`, {
      fontFamily: 'Pricedown, Anton, Impact, sans-serif', fontSize: '12px',
      color: '#' + f.accent.toString(16).padStart(6, '0'),
      stroke: '#05060a', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(6);
  }

  update(dt, player, enCoche) {
    this.cerca = null;
    if (!this.activo && !enCoche) {
      for (const p of this.puntos) {
        if (Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) < ALCANCE) {
          this.cerca = p;
          break;
        }
      }
    }

    if (this.activo) this.actualizarConflicto(dt, player);
  }

  iniciar(punto) {
    if (this.activo) return false;
    this.activo = { faction: punto.faction, oleada: 0, vivos: [], pausaTimer: 0, punto };
    EventBus.emit(EVT.NOTIFY, {
      text: `Guerra por el territorio de ${FACTIONS[punto.faction].name}`, tone: 'danger',
    });
    this.siguienteOleada();
    return true;
  }

  siguienteOleada() {
    const c = this.activo;
    c.oleada++;
    const atacantes = [];
    for (let i = 0; i < POR_OLEADA; i++) {
      const a = (Math.PI * 2 * i) / POR_OLEADA + Math.random() * 0.5;
      const x = c.punto.x + Math.cos(a) * 80;
      const y = c.punto.y + Math.sin(a) * 80;
      if (this.map.isSolidBox(x, y, 20, 20)) continue;
      const p = this.scene.npcs.crearPandillero(x, y, c.faction);
      p.guerraTerritorio = true;
      atacantes.push(p);
    }
    c.vivos = atacantes;
    EventBus.emit(EVT.NOTIFY, { text: `Oleada ${c.oleada} de ${OLEADAS}`, tone: 'danger' });
  }

  actualizarConflicto(dt, player) {
    const c = this.activo;

    if (Phaser.Math.Distance.Between(c.punto.x, c.punto.y, player.x, player.y) > RADIO_ABANDONO) {
      this.cancelar();
      return;
    }

    c.vivos = c.vivos.filter((p) => !p.down);
    if (c.vivos.length > 0) return;

    if (c.oleada >= OLEADAS) {
      this.ganar();
      return;
    }

    c.pausaTimer += dt;
    if (c.pausaTimer >= PAUSA_ENTRE_OLEADAS) {
      c.pausaTimer = 0;
      this.siguienteOleada();
    }
  }

  ganar() {
    const faction = this.activo.faction;
    GameState.addMoney(RECOMPENSA, 'territorio');
    GameState.changeFaction(faction, 999);
    Audio.notes([262, 330, 392, 523.25], 0.14, 'triangle', 0.12);
    EventBus.emit(EVT.BIG_MESSAGE, { title: 'TERRITORIO GANADO', subtitle: FACTIONS[faction].name });
    EventBus.emit(EVT.NOTIFY, {
      text: `${FACTIONS[faction].name} te respeta ahora · +${RECOMPENSA} €`, tone: 'money',
    });
    this.activo = null;
  }

  // te alejas o mueres a mitad: se acaba aqui, sin pago. Los que sigan
  // vivos de la oleada en curso dejan de ser hostiles "porque si": vuelven
  // a depender de la reputacion real, como cualquier otro de su banda.
  cancelar() {
    for (const p of this.activo.vivos) p.guerraTerritorio = false;
    EventBus.emit(EVT.NOTIFY, { text: 'Te has alejado: la guerra se acaba aqui', tone: 'dim' });
    this.activo = null;
  }
}
