import { VEHICLES, VEHICLE_KEYS } from '../config/vehicles.js';
import { GameState } from '../core/GameState.js';

// LA GRUA DEL PUERTO: import/export. El puerto y la grua ya estaban
// dibujados (world/CityMap.js, world/PintarCiudad.js, landmark tipo
// 'grua'); esto es solo el mecanismo que faltaba encima.
//
// Pide unos pocos modelos a la vez (el cartel los enseña). Traes uno de
// esos modelos EN COCHE y paga segun lo bien que lo hayas cuidado: el pago
// es una FRACCION del precio de venta del coche (config/vehicles.js), nunca
// el precio entero — si no, comprar un coche en el concesionario y traerlo
// aqui de vuelta saldria gratis.

const CUANTOS_ENCARGOS = 3;
const PAGO_MIN_FRACCION = 0.14;   // un coche hecho polvo, aun asi paga algo
const PAGO_MAX_FRACCION = 0.42;   // como nuevo, lo mejor que se puede sacar
const ALCANCE = 140;              // el landmark es grande, no hace falta pegarse

export class GruaSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.base = map.landmarks.find((l) => l.type === 'grua') || null;
    this.pedidos = [];
    this.cerca = false;

    if (!this.base) return;
    this.generarPedidos();
    this.pintar();
  }

  generarPedidos() {
    this.pedidos = Phaser.Utils.Array.Shuffle(VEHICLE_KEYS.slice()).slice(0, CUANTOS_ENCARGOS);
  }

  pintar() {
    const nombres = this.pedidos.map((t) => VEHICLES[t].name).join('\n');
    this.cartel = this.scene.add.text(
      this.base.px, this.base.py - this.base.ph / 2 - 8, `SE COMPRAN\n${nombres}`, {
        fontFamily: 'Pricedown, Anton, Impact, sans-serif', fontSize: '12px',
        color: '#c8965a', stroke: '#05060a', strokeThickness: 3, align: 'center',
      }
    ).setOrigin(0.5, 1).setDepth(6);
  }

  refrescar() {
    const nombres = this.pedidos.map((t) => VEHICLES[t].name).join('\n');
    this.cartel.setText(`SE COMPRAN\n${nombres}`);
  }

  update(player, drivingVehicle) {
    if (!this.base) { this.cerca = false; return; }
    const d = Phaser.Math.Distance.Between(this.base.px, this.base.py, player.x, player.y);
    this.cerca = !!drivingVehicle && d < ALCANCE && this.pedidos.includes(drivingVehicle.type);
  }

  // cuanto pagaria AHORA MISMO por ese coche, este o no en la lista (para
  // el aviso de "E para entregar..." del HUD, sin tener que entregarlo)
  estimarPago(vehicle) {
    const stats = VEHICLES[vehicle.type];
    const estado = Phaser.Math.Clamp(vehicle.hp / stats.maxHp, 0, 1);
    const fraccion = PAGO_MIN_FRACCION + (PAGO_MAX_FRACCION - PAGO_MIN_FRACCION) * estado;
    return Math.round(stats.price * fraccion);
  }

  // Cobra y renueva el encargo. Devuelve null si ese modelo no era de los
  // pedidos (quien llama deberia haberlo comprobado ya con `cerca`).
  entregar(vehicle) {
    if (!this.pedidos.includes(vehicle.type)) return null;
    const pago = this.estimarPago(vehicle);
    GameState.addMoney(pago, 'importexport');

    this.pedidos = this.pedidos.filter((t) => t !== vehicle.type);
    this.pedidos.push(this.siguienteModelo());
    this.refrescar();

    return { pago, nombre: VEHICLES[vehicle.type].name };
  }

  // uno nuevo que no repita lo que ya se pide
  siguienteModelo() {
    const libres = VEHICLE_KEYS.filter((t) => !this.pedidos.includes(t));
    const opciones = libres.length > 0 ? libres : VEHICLE_KEYS;
    return opciones[Math.floor(Math.random() * opciones.length)];
  }
}
