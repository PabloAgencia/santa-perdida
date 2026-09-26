import { TILE } from '../config/balance.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';

// La armeria. Siete locales repartidos por la ciudad, con su puerta a la calle
// y su marcador, como el escondite. Conseguir un hierro matando a alguien esta
// bien para el apuro, pero si no hay donde comprar, el dinero no sirve de nada
// y las balas se acaban.
//
// Aqui solo esta el sitio: lo que se vende y a que precio va en ShopScene.

const TIENDAS = 7;          // una por barrio, en una ciudad seis veces mayor
const SEPARACION = 1700;
const DESCUBRE = 340;       // a esta distancia te enteras de que existe
const ALCANCE = 62;

export class ShopSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.tiendas = [];
    this.cerca = null;
    this.abrir();
  }

  // Un edificio vale si tiene un lado libre que da a la acera. El escondite
  // queda descartado: bastante hace ya.
  puertaDe(b) {
    for (const dist of [26, 36, 48]) {
      const lados = [
        { x: b.px, y: b.py + b.ph / 2 + dist },
        { x: b.px, y: b.py - b.ph / 2 - dist },
        { x: b.px + b.pw / 2 + dist, y: b.py },
        { x: b.px - b.pw / 2 - dist, y: b.py },
      ];
      for (const c of lados) {
        if (this.map.isSolidBox(c.x, c.y, 14, 14)) continue;
        if (this.map.isRoadPoint(c.x, c.y)) continue;
        return c;
      }
    }
    return null;
  }

  abrir() {
    const ocupados = this.scene.edificiosOcupados;
    const candidatos = this.map.buildings.filter(
      (b) => !b.isHideout && b.pw >= TILE * 2 && b.ph >= TILE * 2 && (!ocupados || !ocupados.has(b))
    );
    Phaser.Utils.Array.Shuffle(candidatos);

    // Primero una por barrio y luego las que falten: si no, salian tres
    // seguidas en el centro y ninguna en media ciudad.
    const barriosPuestos = new Set();
    for (const pasada of [1, 2]) {
      for (const b of candidatos) {
        if (this.tiendas.length >= TIENDAS) break;
        if (pasada === 1 && barriosPuestos.has(b.zone)) continue;
        if (this.tiendas.some((t) => Phaser.Math.Distance.Between(t.x, t.y, b.px, b.py) < SEPARACION)) continue;
        const puerta = this.puertaDe(b);
        if (!puerta) continue;

        barriosPuestos.add(b.zone);
        const clave = `armeria-${Math.round(puerta.x)}-${Math.round(puerta.y)}`;
        this.tiendas.push({ x: puerta.x, y: puerta.y, edificio: b, clave, zona: b.zone });
        if (ocupados) ocupados.add(b);
        this.pintar(puerta);
      }
    }
  }

  pintar(p) {
    const aro = this.scene.add.image(p.x, p.y, 'ring')
      .setDisplaySize(62, 62).setTint(0x7fd08a).setDepth(6);
    this.scene.tweens.add({
      targets: aro, scale: { from: 0.85, to: 1.1 },
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.scene.add.text(p.x, p.y - 34, 'ARMERIA', {
      fontFamily: 'Pricedown, Anton, Impact, sans-serif',
      fontSize: '13px', color: '#9fe0a8', stroke: '#05060a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);
  }

  update(player, enCoche) {
    this.cerca = null;
    for (const t of this.tiendas) {
      const d = Phaser.Math.Distance.Between(t.x, t.y, player.x, player.y);

      // pasar por delante basta para que quede marcada en el mapa
      if (d < DESCUBRE && GameState.descubrir(t.clave)) {
        EventBus.emit(EVT.NOTIFY, { text: 'Nuevo sitio: armeria', tone: 'objective' });
        EventBus.emit(EVT.STATS_CHANGED, { descubierto: t.clave });
      }
      if (!enCoche && d < ALCANCE) this.cerca = t;
    }
  }
}
