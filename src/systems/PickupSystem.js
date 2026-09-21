import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';
import { TILE } from '../config/balance.js';
import { T } from '../config/city.js';
import { ARMAS } from '../config/weapons.js';

// Curarse por la calle, que hasta ahora solo se podia en el escondite.
//
// Dos formas, a proposito distintas:
//   · CORAZONES: gratis, escondidos en callejones y sitios raros, y tardan en
//     volver a salir. Premian conocerse la ciudad, como los de siempre.
//   · MAQUINAS: en plena acera y siempre disponibles, pero cuestan dinero y
//     engordan. Para cuando no te queda tiempo de buscar un corazon.

// Pocos y lejos unos de otros. Si hay un corazon en cada esquina, buscarlo
// no vale nada y la vida deja de ser un recurso: son un premio por conocerse
// la ciudad, no una fuente de salud.
const CORAZONES = 9;
const SEPARACION_CORAZONES = 1100;
const MAQUINAS = 26;
const SEPARACION_MAQUINAS = 520;

const VIDA_CORAZON = 25;
const REAPARECE = 150;          // segundos que tarda en volver un corazon
const ALCANCE_CORAZON = 22;
const CHALECO_ESCONDIDO = 60;   // no llena el chaleco: para eso esta la tienda
const REAPARECE_CHALECO = 300;     // se coge al pasarle por encima
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
    this.sueltos = [];
    this.cercaDeMaquina = null;

    this.chalecos = [];
    this.sembrarCorazones();
    this.esconderChalecos();
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
      if (elegidos.some((q) => Phaser.Math.Distance.Between(q.x, q.y, p.x, p.y) < SEPARACION_CORAZONES)) continue;
      elegidos.push(p);
    }
    // si no caben tantos, se queda con los que caben: antes se rellenaba con
    // aceras normales y acababan a la vista desde la calle

    for (const p of elegidos) {
      // SIN foco ni marca: antes tenian un halo rojo que se veia desde la
      // otra punta de la calle, y encontrarlos no tenia ningun merito.
      const brillo = this.scene.add.image(p.x, p.y, 'lamp')
        .setDisplaySize(34, 34).setTint(0xd9384a)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.1).setDepth(3);
      const icono = this.scene.add.image(p.x, p.y, 'corazon').setDepth(p.y + 2);
      this.scene.tweens.add({
        targets: icono, y: p.y - 5, scale: { from: 0.92, to: 1.08 },
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
      this.corazones.push({ x: p.x, y: p.y, icono, brillo, espera: 0 });
    }
  }

  // DOS CHALECOS ESCONDIDOS, y siempre en el mismo sitio: uno al norte y
  // otro al sur de la ciudad, en un callejon. No salen en el mapa ni tienen
  // luz: o te los aprendes, o no existen. Es la unica forma de llevar
  // blindaje sin pagarlo en la armeria.
  esconderChalecos() {
    const sitios = this.puntosDeCallejon();
    if (sitios.length === 0) return;

    const alto = this.map.pixelHeight;
    const norte = sitios.filter((p) => p.y < alto * 0.45);
    const sur = sitios.filter((p) => p.y > alto * 0.55);
    const medio = (lista) => (lista.length ? lista[Math.floor(lista.length / 2)] : null);

    for (const p of [medio(norte), medio(sur)]) {
      if (!p) continue;
      const icono = this.scene.add.image(p.x, p.y, 'hud-escudo')
        .setDisplaySize(20, 20).setDepth(p.y + 2);
      this.scene.tweens.add({
        targets: icono, y: p.y - 4, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
      this.chalecos.push({ x: p.x, y: p.y, icono, espera: 0 });
    }
  }

  cogerChaleco(c) {
    if (GameState.blindaje >= 100) return;
    const antes = GameState.blindaje;
    GameState.darBlindaje(CHALECO_ESCONDIDO);
    c.espera = REAPARECE_CHALECO;
    c.icono.setVisible(false);
    Audio.pickup();
    EventBus.emit(EVT.NOTIFY, {
      text: `Chaleco: +${Math.round(GameState.blindaje - antes)}`, tone: 'objective',
    });
  }

  // Las maquinas van pegadas a la fachada, en la acera. Se busca una acera
  // que tenga un edificio al lado: asi no quedan plantadas en medio.
  plantarMaquinas() {
    const spots = Phaser.Utils.Array.Shuffle(this.map.sidewalkSpots.slice());
    for (const s of spots) {
      if (this.maquinas.length >= MAQUINAS) break;
      if (this.maquinas.some((m) => Phaser.Math.Distance.Between(m.x, m.y, s.x, s.y) < SEPARACION_MAQUINAS)) continue;

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

  // ---------- armas en el suelo ----------

  // Al que cae se le queda el hierro en la acera. Es la forma de conseguir
  // tu primera pistola sin pasar por una tienda, y la que usan todos los GTA.
  soltarArma(x, y, clave, balas) {
    const icono = this.scene.add.image(x, y, 'arma-suelo').setDepth(y + 1);
    const brillo = this.scene.add.image(x, y, 'lamp')
      .setDisplaySize(56, 56).setTint(0xe8b54a)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setDepth(3);
    this.scene.tweens.add({
      targets: [icono], scale: { from: 0.9, to: 1.1 },
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.sueltos.push({ x, y, clave, balas, icono, brillo, vida: 40 });
  }

  recogerArmas(dt, player, enCoche) {
    for (let i = this.sueltos.length - 1; i >= 0; i--) {
      const s = this.sueltos[i];
      s.vida -= dt;
      if (s.vida <= 0) {
        s.icono.destroy();
        s.brillo.destroy();
        this.sueltos.splice(i, 1);
        continue;
      }
      if (enCoche) continue;
      if (Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y) > 26) continue;

      GameState.darArma(s.clave, s.balas);
      GameState.armaActual = s.clave;
      Audio.pickup();
      EventBus.emit(EVT.NOTIFY, {
        text: `${ARMAS[s.clave].nombre} · ${s.balas} balas`, tone: 'objective',
      });
      s.icono.destroy();
      s.brillo.destroy();
      this.sueltos.splice(i, 1);
    }
  }

  // ---------- bucle ----------

  update(dt, player, enCoche) {
    this.recogerArmas(dt, player, enCoche);
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

    for (const c of this.chalecos) {
      if (c.espera > 0) {
        c.espera -= dt;
        if (c.espera <= 0) c.icono.setVisible(true);
        continue;
      }
      if (enCoche) continue;
      if (Phaser.Math.Distance.Between(c.x, c.y, player.x, player.y) > ALCANCE_CORAZON) continue;
      this.cogerChaleco(c);
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
    for (const s of this.sueltos) { s.icono.destroy(); s.brillo.destroy(); }
    for (const c of this.chalecos) c.icono.destroy();
    this.chalecos = [];
    this.sueltos = [];
    this.corazones = [];
    this.maquinas = [];
    this.sueltos = [];
  }
}
