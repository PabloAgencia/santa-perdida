import { EventBus, EVT } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';
import { ECONOMY, TILE } from '../config/balance.js';

const REACH = 36;

// Trabajo de reparto repetible: el suelo economico del juego.
// Las misiones con guion de la fase 3 iran en MissionSystem, aparte de esto.

export class JobSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.job = null;

    this.ring = scene.add.image(0, 0, 'ring').setVisible(false).setDepth(5).setAlpha(0.9);
    this.crate = scene.add.image(0, 0, 'crate').setVisible(false).setDepth(6);
    scene.tweens.add({
      targets: this.ring,
      scale: { from: 0.85, to: 1.15 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  get active() {
    return this.job !== null;
  }

  get target() {
    if (!this.job) return null;
    return this.job.state === 'pickup' ? this.job.pickup : this.job.dropoff;
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

  offerNew(playerPos) {
    const pickup = this.pickSpotFar(playerPos, 12);
    if (!pickup) return null;
    const dropoff = this.pickSpotFar(pickup, 45);
    if (!dropoff) return null;

    const tiles = Math.round(
      Phaser.Math.Distance.Between(pickup.x, pickup.y, dropoff.x, dropoff.y) / TILE
    );

    this.job = {
      state: 'pickup',
      pickup: { x: pickup.x, y: pickup.y },
      dropoff: { x: dropoff.x, y: dropoff.y },
      tiles,
      pay: Math.round(ECONOMY.deliveryBase + tiles * ECONOMY.deliveryPerTile),
      // la mejora del repartidor: mas tiempo para entregar, 5% por nivel
      limit: Math.round(tiles * ECONOMY.deliveryTimePerTile * (1 + GameState.nivelTrabajo('reparto') * 0.05)),
      elapsed: 0,
    };
    GameState.setJob(this.job);
    this.refreshMarkers();
    EventBus.emit(EVT.JOB_STARTED, this.job);
    EventBus.emit(EVT.NOTIFY, {
      text: `Encargo nuevo: recoge el paquete. Paga ${this.job.pay} €`,
      tone: 'objective',
    });
    return this.job;
  }

  restore(saved) {
    if (!saved || !saved.pickup || !saved.dropoff) return false;
    this.job = saved;
    GameState.setJob(this.job);
    this.refreshMarkers();
    return true;
  }

  refreshMarkers() {
    const t = this.target;
    if (!t) {
      this.ring.setVisible(false);
      this.crate.setVisible(false);
      return;
    }
    this.ring.setPosition(t.x, t.y).setVisible(true);
    if (this.job.state === 'pickup') {
      this.crate.setPosition(t.x, t.y).setVisible(true);
    } else {
      this.crate.setVisible(false);
    }
  }

  update(dt, x, y) {
    if (!this.job) return;

    if (this.job.state === 'carrying') this.job.elapsed += dt;

    const t = this.target;
    const dist = Phaser.Math.Distance.Between(x, y, t.x, t.y);

    if (this.job.state === 'pickup' && dist < REACH) {
      this.job.state = 'carrying';
      this.job.elapsed = 0;
      this.refreshMarkers();
      EventBus.emit(EVT.JOB_STAGE, this.job);
      EventBus.emit(EVT.NOTIFY, {
        text: 'Paquete recogido. Llevalo al punto marcado.',
        tone: 'objective',
      });
      return;
    }

    if (this.job.state === 'carrying' && dist < REACH) {
      this.finish();
    }
  }

  finish() {
    const job = this.job;
    const onTime = job.elapsed <= job.limit;
    const bonus = onTime ? ECONOMY.deliveryTimeBonus : 0;
    const total = job.pay + bonus;

    GameState.addMoney(total, 'reparto');
    GameState.bumpStat('deliveries', 1);
    GameState.addReputation(1);
    const resultado = GameState.sumarTrabajo('reparto');

    this.job = null;
    GameState.clearJob();
    this.ring.setVisible(false);
    this.crate.setVisible(false);

    EventBus.emit(EVT.JOB_DONE, { pay: job.pay, bonus, total, onTime });
    if (resultado.subioNivel) {
      EventBus.emit(EVT.BIG_MESSAGE, {
        title: `REPARTIDOR NIVEL ${resultado.nivel}`, subtitle: 'mejora permanente',
      });
    }
    EventBus.emit(EVT.NOTIFY, {
      text: onTime
        ? `Entregado a tiempo. +${total} € (${bonus} de prima)`
        : `Entregado tarde. +${total} €`,
      tone: 'money',
    });
  }

  remainingTime() {
    if (!this.job || this.job.state !== 'carrying') return null;
    return Math.max(0, this.job.limit - this.job.elapsed);
  }

  objectiveText() {
    if (!this.job) return 'Busca un encargo';
    return this.job.state === 'pickup'
      ? 'Recoge el paquete'
      : `Entrega el paquete (${this.job.pay} €)`;
  }
}
