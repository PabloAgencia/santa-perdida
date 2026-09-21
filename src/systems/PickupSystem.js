import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';
import { TILE } from '../config/balance.js';
import { T } from '../config/city.js';

// Curarse por la calle, que hasta ahora solo se podia en el escondite.
//
// Dos formas, a proposito distintas:
//   · CORAZONES: gratis, escondidos en callejones y sitios raros, y tardan en
//     volver a salir. Premian conocerse la ciudad, como los de siempre.
//   · MAQUINAS: en plena acera y siempre disponibles, pero cuestan dinero y
//     engordan. Para cuando no te queda tiempo de buscar un corazon.

const CORAZONES = 26;
const MAQUINAS = 34;

const VIDA_CORAZON = 25;
const REAPARECE = 95;           // segundos que tarda en volver un corazon
const ALCANCE_CORAZON = 22;     // se coge al pasarle por encima
const ALCANCE_MAQUINA = 40;     // a esta hay que acercarse y pulsar E

export const CONSUMICIONES = [
  { clave: 'refresco', nombre: 'Un refresco', precio: 3, vida: 10, grasa: 0.8 },
  { clave: 'bocata', nombre: 'Un bocadillo', precio: 7, vida: 25, grasa: 2 },
];

export class PickupSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.corazones = [];
    this.maquinas = [];
    this.cercaDeMaquina = null;

    this.sembrarCorazones();
    this.plantarMaquinas();
  }

  // ---------- sembrar ----------

  // Los corazones van donde no se ven desde el coche: callejones entre
  // edificios y rincones. Si estuvieran en mitad de la avenida no tendria
  // gracia encontrarlos.
  puntosDeCallejon() {
    const puntos = [];
    for (let ty = 2; ty < this.map.h - 2; ty++) {
      for (let tx = 2; tx < this.map.w - 2; tx++) {
        if (this.map.getTile(tx, ty) !== T.ALLEY) continue;
        if (this.map.isSolidTile(tx, ty)) continue;
        // tiene que caber una persona
        if (this.map.isSolidBox((tx + 0.5) * TILE, (ty + 0.5) * TILE, 10, 10)) continue;
        puntos.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
      }
    }
    return puntos;
  }

  sembrarCorazones() {
    const sitios = this.puntosDeCallejon();
    const elegidos = [];

    // repartidos: nada de tres corazones en el mismo callejon
    Phaser.Utils.Array.Shuffle(sitios);
    for (const p of sitios) {
      if (elegidos.length >= CORAZONES) break;
      if (elegidos.some((q) => Phaser.Math.Distance.Between(q.x, q.y, p.x, p.y) < 420)) continue;
      elegidos.push(p);
    }
    // si la ciudad tiene pocos callejones, se completa con aceras apartadas
    if (elegidos.length < CORAZONES) {
      for (const s of Phaser.Utils.Array.Shuffle(this.map.sidewalkSpots.slice())) {
        if (elegidos.length >= CORAZONES) break;
        if (elegidos.some((q) => Phaser.Math.Distance.Between(q.x, q.y, s.x, s.y) < 420)) continue;
        elegidos.push({ x: s.x, y: s.y });
      }
    }

    for (const p of elegidos) {
      const brillo = this.scene.add.image(p.x, p.y, 'lamp')
        .setDisplaySize(70, 70).setTint(0xd9384a)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.32).setDepth(3);
      const icono = this.scene.add.image(p.x, p.y, 'corazon').setDepth(p.y + 2);
      this.scene.tweens.add({
        targets: icono, y: p.y - 5, scale: { from: 0.92, to: 1.08 },
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
      this.corazones.push({ x: p.x, y: p.y, icono, brillo, espera: 0 });
    }
  }

  // Las maquinas van pegadas a la fachada, en la acera. Se busca una acera
  // que tenga un edificio al lado: asi no quedan plantadas en medio.
  plantarMaquinas() {
    const spots = Phaser.Utils.Array.Shuffle(this.map.sidewalkSpots.slice());
    for (const s of spots) {
      if (this.maquinas.length >= MAQUINAS) break;
      if (this.maquinas.some((m) => Phaser.Math.Distance.Between(m.x, m.y, s.x, s.y) < 300)) continue;

      // ¿hay pared pegada? se mira a los cuatro lados
      const lados = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const pared = lados.find(([dx, dy]) => this.map.isSolidTile(s.tx + dx, s.ty + dy));
      if (!pared) continue;

      const x = s.x + pared[0] * 9;
      const y = s.y + pared[1] * 9;
      const icono = this.scene.add.image(x, y, 'maquina').setDepth(y);
      const luz = this.scene.add.image(x, y, 'lamp')
        .setDisplaySize(54, 54).setTint(0x8fd0e0)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.18).setDepth(-890);
      this.maquinas.push({ x, y, icono, luz });
    }
  }

  // ---------- bucle ----------

  update(dt, player, enCoche) {
    for (const c of this.corazones) {
      if (c.espera > 0) {
        c.espera -= dt;
        if (c.espera <= 0) {
          c.icono.setVisible(true);
          c.brillo.setVisible(true);
        }
        continue;
      }
      if (enCoche) continue;   // a los corazones se llega andando
      if (Phaser.Math.Distance.Between(c.x, c.y, player.x, player.y) > ALCANCE_CORAZON) continue;
      this.cogerCorazon(c);
    }

    this.cercaDeMaquina = null;
    if (enCoche) return;
    for (const m of this.maquinas) {
      if (Phaser.Math.Distance.Between(m.x, m.y, player.x, player.y) < ALCANCE_MAQUINA) {
        this.cercaDeMaquina = m;
        break;
      }
    }
  }

  cogerCorazon(c) {
    if (GameState.health >= GameState.vidaMaxima) return;   // no se malgasta
    const curado = GameState.heal(VIDA_CORAZON);
    c.espera = REAPARECE;
    c.icono.setVisible(false);
    c.brillo.setVisible(false);
    Audio.pickup();
    EventBus.emit(EVT.NOTIFY, { text: `+${curado} de vida`, tone: 'money' });
  }

  // ---------- la maquina ----------

  // Se pulsa E al lado: refresco si vas medio bien, bocadillo si estas mal.
  usarMaquina() {
    const m = this.cercaDeMaquina;
    if (!m) return false;

    if (GameState.health >= GameState.vidaMaxima) {
      EventBus.emit(EVT.NOTIFY, { text: 'Estas entero, no te hace falta', tone: 'dim' });
      return true;
    }

    const falta = GameState.vidaMaxima - GameState.health;
    const quiere = falta > 15 ? CONSUMICIONES[1] : CONSUMICIONES[0];
    const compra = GameState.canAfford(quiere.precio) ? quiere : CONSUMICIONES[0];

    if (!GameState.canAfford(compra.precio)) {
      EventBus.emit(EVT.NOTIFY, { text: 'No te llega ni para un refresco', tone: 'danger' });
      return true;
    }

    GameState.spendMoney(compra.precio, 'comida');
    const curado = GameState.heal(compra.vida);
    const engorda = GameState.subirAtributo('grasa', compra.grasa);
    Audio.pickup();
    EventBus.emit(EVT.NOTIFY, {
      text: `${compra.nombre}: +${curado} de vida  ·  ${compra.precio} €`,
      tone: 'money',
    });
    return engorda;   // true = hay que redibujar al personaje
  }

  clear() {
    for (const c of this.corazones) { c.icono.destroy(); c.brillo.destroy(); }
    for (const m of this.maquinas) { m.icono.destroy(); m.luz.destroy(); }
    this.corazones = [];
    this.maquinas = [];
  }
}
