import { VEHICLES } from '../config/vehicles.js';
import { CITY } from '../config/city.js';
import { TILE } from '../config/balance.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';

// EL MERCADO DE COCHES POR BARRIOS. La grua del puerto (GruaSystem) ya
// compraba coches, pero solo en un sitio y solo tres modelos concretos a la
// vez. Esto es aparte: unos desguaces repartidos por otros barrios que
// compran CUALQUIER coche, a un precio que sube y baja solo con el tiempo
// segun como ande la demanda de esa zona. La libreta (tecla L) dice donde
// pagan mejor ahora mismo, para decidir adonde llevarlo antes de vender.

const ZONAS = ['residencial', 'comercial', 'industrial', 'conflictivo'];
const SEPARACION = 1700;
const ALCANCE = 70;
const PAGO_MIN_FRACCION = 0.12;
const PAGO_MAX_FRACCION = 0.34;   // un pelin peor que la grua: es la via facil, no la mejor paga
const REFRESCO_ENTRE = [100, 170];  // segundos entre subidas/bajadas de demanda de cada desguace

export class MercadoSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.puntos = [];
    this.cerca = null;
    this.abrir();
  }

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

    for (const zona of ZONAS) {
      const b = candidatos.find(
        (c) => c.zone === zona &&
          !this.puntos.some((p) => Phaser.Math.Distance.Between(p.x, p.y, c.px, c.py) < SEPARACION) &&
          this.puertaDe(c)
      );
      if (!b) continue;
      const puerta = this.puertaDe(b);

      this.puntos.push({
        x: puerta.x, y: puerta.y, edificio: b, zona,
        nombre: CITY.zones[zona]?.label || zona,
        demanda: 0.8 + Math.random() * 0.5,
        refresco: Phaser.Math.Between(REFRESCO_ENTRE[0], REFRESCO_ENTRE[1]),
      });
      if (ocupados) ocupados.add(b);
      this.pintar(puerta);
    }
  }

  pintar(p) {
    const aro = this.scene.add.image(p.x, p.y, 'ring')
      .setDisplaySize(58, 58).setTint(0xc87f4a).setDepth(6);
    this.scene.tweens.add({
      targets: aro, scale: { from: 0.85, to: 1.1 },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.scene.add.text(p.x, p.y - 32, 'DESGUACE', {
      fontFamily: 'Pricedown, Anton, Impact, sans-serif',
      fontSize: '12px', color: '#e0a878', stroke: '#05060a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);
  }

  update(dt, player, drivingVehicle) {
    for (const p of this.puntos) {
      p.refresco -= dt;
      if (p.refresco <= 0) {
        p.demanda = 0.65 + Math.random() * 0.8;
        p.refresco = Phaser.Math.Between(REFRESCO_ENTRE[0], REFRESCO_ENTRE[1]);
      }
    }

    this.cerca = null;
    if (!drivingVehicle) return;
    for (const p of this.puntos) {
      if (Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) < ALCANCE) {
        this.cerca = p;
        return;
      }
    }
  }

  // cuanto pagaria este desguace AHORA por este coche
  estimar(punto, vehicle) {
    const stats = VEHICLES[vehicle.type];
    const estado = Phaser.Math.Clamp(vehicle.hp / stats.maxHp, 0, 1);
    const fraccion = PAGO_MIN_FRACCION + (PAGO_MAX_FRACCION - PAGO_MIN_FRACCION) * estado;
    return Math.round(stats.price * fraccion * punto.demanda);
  }

  vender(vehicle) {
    if (!this.cerca) return null;
    const pago = this.estimar(this.cerca, vehicle);
    GameState.addMoney(pago, 'desguace');
    EventBus.emit(EVT.NOTIFY, { text: `Vendido en el desguace · ${pago} €`, tone: 'money' });
    return { pago, nombre: VEHICLES[vehicle.type].name };
  }

  // para la libreta (tecla L): cada punto, su etiqueta de demanda y la
  // distancia en casillas desde donde esta ahora el jugador, el mejor primero
  resumen(playerX, playerY) {
    const etiqueta = (d) => d >= 1.25 ? 'MUY BUENA' : d >= 1.05 ? 'BUENA' : d >= 0.85 ? 'NORMAL' : 'FLOJA';
    return this.puntos
      .map((p) => ({
        zona: p.nombre,
        etiqueta: etiqueta(p.demanda),
        demanda: p.demanda,
        tiles: Math.round(Phaser.Math.Distance.Between(playerX, playerY, p.x, p.y) / TILE),
      }))
      .sort((a, b) => b.demanda - a.demanda);
  }
}
