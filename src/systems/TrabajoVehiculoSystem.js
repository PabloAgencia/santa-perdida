import { EventBus, EVT } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';
import { TILE } from '../config/balance.js';

const REACH = 40;

// TAXISTA Y AMBULANCIA: el mismo patron que el reparto de siempre
// (JobSystem) — recoge en un punto, lleva a otro dentro de un tiempo,
// cobra — pero solo esta disponible conduciendo el vehiculo que toca. La
// tecla J, en CityScene, decide cual de los dos (o el reparto generico)
// ofrecer segun que conduzcas en ese momento.
//
// Cada carrera completada cuenta para la mejora permanente de ese trabajo
// (ver GameState.sumarTrabajo/nivelTrabajo).
export class TrabajoVehiculoSystem {
  constructor(scene, map, cfg) {
    this.scene = scene;
    this.map = map;
    this.tipo = cfg.tipo;               // 'taxista' | 'ambulancia'
    this.vehiculo = cfg.vehiculo;       // 'taxi' | 'ambulancia'
    this.nombre = cfg.nombre;
    this.pagoBase = cfg.pagoBase;
    this.pagoPorTile = cfg.pagoPorTile;
    this.tiempoPorTile = cfg.tiempoPorTile;
    this.bonusATiempo = cfg.bonusATiempo;
    this.carrera = null;

    this.ring = scene.add.image(0, 0, 'ring').setVisible(false).setDepth(5).setAlpha(0.9);
    scene.tweens.add({
      targets: this.ring, scale: { from: 0.85, to: 1.15 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
  }

  // solo se puede ofrecer o llevar a cabo conduciendo el vehiculo tematico
  disponible(drivingVehicle) {
    return !!drivingVehicle && drivingVehicle.type === this.vehiculo;
  }

  get target() {
    if (!this.carrera) return null;
    return this.carrera.state === 'pickup' ? this.carrera.pickup : this.carrera.dropoff;
  }

  pickSpotFar(from, minTiles) {
    const spots = this.map.sidewalkSpots;
    if (spots.length === 0) return null;
    const minPx = minTiles * TILE;
    for (let attempt = 0; attempt < 220; attempt++) {
      const s = spots[Math.floor(Math.random() * spots.length)];
      if (!from) return s;
      if (Phaser.Math.Distance.Between(from.x, from.y, s.x, s.y) >= minPx) return s;
    }
    return spots[Math.floor(Math.random() * spots.length)];
  }

  ofrecer(playerPos) {
    if (this.carrera) return null;
    const pickup = this.pickSpotFar(playerPos, 6);
    if (!pickup) return null;
    const dropoff = this.pickSpotFar(pickup, 20);
    if (!dropoff) return null;

    const tiles = Math.round(
      Phaser.Math.Distance.Between(pickup.x, pickup.y, dropoff.x, dropoff.y) / TILE
    );

    this.carrera = {
      state: 'pickup',
      pickup: { x: pickup.x, y: pickup.y },
      dropoff: { x: dropoff.x, y: dropoff.y },
      tiles,
      pay: Math.round(this.pagoBase + tiles * this.pagoPorTile),
      limit: Math.round(tiles * this.tiempoPorTile),
      elapsed: 0,
    };
    this.refreshMarker();
    EventBus.emit(EVT.NOTIFY, {
      text: `${this.nombre}: ve a recoger. Paga ${this.carrera.pay} €`, tone: 'objective',
    });
    return this.carrera;
  }

  refreshMarker() {
    const t = this.target;
    if (!t) { this.ring.setVisible(false); return; }
    this.ring.setPosition(t.x, t.y).setVisible(true);
  }

  update(dt, player, drivingVehicle) {
    if (!this.carrera) return;

    // si te bajas del vehiculo tematico a mitad, la carrera se cancela sin
    // pago: no tiene sentido llevar al pasajero a pie
    if (!this.disponible(drivingVehicle)) {
      this.cancelar();
      return;
    }

    if (this.carrera.state === 'carrying') this.carrera.elapsed += dt;

    const t = this.target;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);

    if (this.carrera.state === 'pickup' && dist < REACH) {
      this.carrera.state = 'carrying';
      this.carrera.elapsed = 0;
      this.refreshMarker();
      EventBus.emit(EVT.NOTIFY, { text: 'Recogido. Llevalo al punto marcado.', tone: 'objective' });
      return;
    }

    if (this.carrera.state === 'carrying' && dist < REACH) this.finish();
  }

  cancelar() {
    if (!this.carrera) return;
    this.carrera = null;
    this.ring.setVisible(false);
  }

  finish() {
    const carrera = this.carrera;
    const onTime = carrera.elapsed <= carrera.limit;
    const bonus = onTime ? this.bonusATiempo : 0;
    const total = carrera.pay + bonus;

    GameState.addMoney(total, this.tipo);
    const resultado = GameState.sumarTrabajo(this.tipo);

    this.carrera = null;
    this.ring.setVisible(false);

    EventBus.emit(EVT.NOTIFY, {
      text: onTime ? `Entregado a tiempo. +${total} € (${bonus} de prima)` : `Entregado tarde. +${total} €`,
      tone: 'money',
    });
    if (resultado.subioNivel) {
      EventBus.emit(EVT.BIG_MESSAGE, {
        title: `${this.nombre.toUpperCase()} NIVEL ${resultado.nivel}`, subtitle: 'mejora permanente',
      });
    }
  }

  remainingTime() {
    if (!this.carrera || this.carrera.state !== 'carrying') return null;
    return Math.max(0, this.carrera.limit - this.carrera.elapsed);
  }

  objectiveText() {
    if (!this.carrera) return `J para ${this.nombre.toLowerCase()}`;
    return this.carrera.state === 'pickup' ? 'Ve a recoger' : `Llevalo (${this.carrera.pay} €)`;
  }
}
