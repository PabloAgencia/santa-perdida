import { VEHICLES, VEHICLE_KEYS } from '../config/vehicles.js';
import { Vehicle } from '../entities/Vehicle.js';
import { repartirPorBarrios } from '../world/puertas.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';

// EL CONCESIONARIO: un solar con los seis coches comprables en fila delante,
// cada uno con su cartel de precio. Cada coche es un Vehicle de verdad
// (`enVenta: true` los saca de `nearestVehicle()`, para que no se puedan
// robar sin pagar) que se "activa" al comprarlo en vez de crear uno nuevo:
// mas barato que tener dos representaciones del mismo coche.

const DESCUBRE = 340;
const ALCANCE = 60;
const SEPARACION_EN_FILA = 62;

export class ConcesionarioSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.coches = [];
    this.cerca = null;
    this.colocar();
  }

  colocar() {
    const sitios = repartirPorBarrios(this.map, { cuantos: 1, separacion: 99999, minTile: 3 });
    if (sitios.length === 0) return;
    const sitio = sitios[0];

    this.scene.add.text(sitio.x, sitio.y - 78, 'CONCESIONARIO', {
      fontFamily: 'Pricedown, Anton, Impact, sans-serif', fontSize: '15px',
      color: '#e8b54a', stroke: '#05060a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);

    // en fila, pegados a la puerta y perpendiculares a ella
    const lado = Math.atan2(sitio.y - sitio.edificio.py, sitio.x - sitio.edificio.px);
    const perp = lado + Math.PI / 2;
    const n = VEHICLE_KEYS.length;

    VEHICLE_KEYS.forEach((tipo, i) => {
      const offset = (i - (n - 1) / 2) * SEPARACION_EN_FILA;
      const x = sitio.x + Math.cos(lado) * 50 + Math.cos(perp) * offset;
      const y = sitio.y + Math.sin(lado) * 50 + Math.sin(perp) * offset;
      if (this.map.isSolidBox(x, y, 30, 30)) return;

      const v = new Vehicle(this.scene, this.map, tipo, x, y, lado + Math.PI / 2, { color: 0 });
      v.enVenta = true;
      this.scene.vehicles.push(v);

      const cartel = this.scene.add.text(
        x, y - 30, `${VEHICLES[tipo].name}\n${VEHICLES[tipo].price} €`, {
          fontFamily: 'Pricedown, Anton, Impact, sans-serif', fontSize: '11px',
          color: '#bcd6ee', stroke: '#05060a', strokeThickness: 3, align: 'center',
        }
      ).setOrigin(0.5).setDepth(6);

      this.coches.push({ vehicle: v, tipo, precio: VEHICLES[tipo].price, cartel, x, y });
    });
  }

  update(player) {
    this.cerca = null;
    for (const c of this.coches) {
      if (!c.vehicle) continue; // ya se compro: ya no es del concesionario
      const d = Phaser.Math.Distance.Between(c.x, c.y, player.x, player.y);

      if (d < DESCUBRE && GameState.descubrir('concesionario')) {
        EventBus.emit(EVT.NOTIFY, { text: 'Nuevo sitio: Concesionario', tone: 'objective' });
        EventBus.emit(EVT.STATS_CHANGED, { descubierto: 'concesionario' });
      }
      if (d < ALCANCE) this.cerca = c;
    }
  }

  // Devuelve el coche comprado, o null si no llegaba el dinero (el aviso lo
  // decide quien llama, igual que en LocalSystem y PisoSystem).
  comprar(c) {
    if (!GameState.canAfford(c.precio)) return null;
    GameState.spendMoney(c.precio, 'concesionario');

    // que modelos ha comprado alguna vez, para la pantalla de progreso: si
    // se vive en `vehicles` se pierde al vender/destruir el coche, y el
    // merito de haberlo comprado no deberia perderse con el
    if (!GameState.flags.cochesComprados) GameState.flags.cochesComprados = {};
    GameState.flags.cochesComprados[c.tipo] = true;

    c.vehicle.enVenta = false;
    c.vehicle.hp = c.vehicle.stats.maxHp;
    c.cartel.destroy();
    c.cartel = null;
    const comprado = c.vehicle;
    c.vehicle = null;
    return comprado;
  }
}
