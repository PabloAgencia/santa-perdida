import { Vehicle } from '../entities/Vehicle.js';
import { VEHICLE_KEYS, VEHICLES } from '../config/vehicles.js';
import { steerTo } from './driving.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';

// JUSTICIERO: conduciendo una patrulla, J saca a un fugitivo huyendo por la
// red de calles (mismo patron que MissionSystem usa con sus "blancos", pero
// aparte para no acoplar los dos sistemas). Le das caza embistiendolo hasta
// que se para o revienta; si te lo pierdes de vista, se acaba sin pago.
const PAGO = 280;
const GRACIA = 3;             // segundos de cortesia al empezar
const RADIO_PIERDE = 750;
const SPAWN_MIN = 350;
const SPAWN_MAX = 900;

export class JusticieroSystem {
  constructor(scene, map, net) {
    this.scene = scene;
    this.map = map;
    this.net = net;
    this.fugitivo = null;

    this.aro = scene.add.image(0, 0, 'ring').setVisible(false).setDepth(5).setAlpha(0.9).setTint(0xd9584a);
    scene.tweens.add({
      targets: this.aro, scale: { from: 0.85, to: 1.15 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
  }

  disponible(drivingVehicle) {
    return !!drivingVehicle && drivingVehicle.type === 'patrulla';
  }

  ofrecer(playerPos) {
    if (this.fugitivo) return null;

    let mejor = null;
    let mejorDist = Infinity;
    for (let i = 0; i < 60; i++) {
      const edge = this.net.randomEdge();
      const p = this.net.pointAlong(edge, 0.2 + Math.random() * 0.6);
      const d = Phaser.Math.Distance.Between(p.x, p.y, playerPos.x, playerPos.y);
      if (d < SPAWN_MIN || d > SPAWN_MAX) continue;
      if (this.map.isSolidBox(p.x, p.y, 34, 34)) continue;
      if (d < mejorDist) { mejorDist = d; mejor = { p, edge }; }
    }
    if (!mejor) return null;

    const tipo = VEHICLE_KEYS[Math.floor(Math.random() * VEHICLE_KEYS.length)];
    const v = new Vehicle(this.scene, this.map, tipo, mejor.p.x, mejor.p.y, mejor.edge.angle, {
      color: Math.floor(Math.random() * VEHICLES[tipo].palette.length),
    });
    v.ai = true;
    v.esBlanco = true;
    v.encendido = true;
    this.scene.vehicles.push(v);

    this.fugitivo = { vehicle: v, edge: this.net.randomEdge(), gracia: GRACIA };
    this.aro.setVisible(true);
    EventBus.emit(EVT.NOTIFY, { text: 'Fugitivo localizado. Dale alcance.', tone: 'objective' });
    return this.fugitivo;
  }

  update(dt, player) {
    if (!this.fugitivo) return;
    const f = this.fugitivo;
    const v = f.vehicle;

    this.moverFugitivo(dt);
    this.aro.setPosition(v.x, v.y);

    if (f.gracia > 0) { f.gracia -= dt; return; }

    if (v.hp <= 0 || v.quemado) { this.detenido(); return; }

    if (Phaser.Math.Distance.Between(v.x, v.y, player.x, player.y) > RADIO_PIERDE) this.perdido();
  }

  moverFugitivo(dt) {
    const f = this.fugitivo;
    const v = f.vehicle;
    if (v.quemado) return;

    const meta = this.net.exitPoint(f.edge);
    if (Phaser.Math.Distance.Between(v.x, v.y, meta.x, meta.y) < 52) {
      f.edge = this.net.nextEdge(f.edge) || this.net.randomEdge();
    }
    const destino = this.net.exitPoint(f.edge);
    v.update(dt, steerTo(v, destino.x, destino.y, v.stats.maxSpeed * 0.72, false));
  }

  // hp a 0 significa que DanoVehiculos ya lo esta quemando (o lo quemara en
  // el fotograma siguiente): el chasis se queda de monumento en la calle,
  // igual que con cualquier otro coche reventado. Solo se suelta la
  // referencia, nunca se destruye el vehiculo a mano.
  detenido() {
    GameState.addMoney(PAGO, 'justiciero');
    const resultado = GameState.sumarTrabajo('justiciero');
    EventBus.emit(EVT.NOTIFY, { text: `Fugitivo detenido · +${PAGO} €`, tone: 'money' });
    if (resultado.subioNivel) {
      EventBus.emit(EVT.BIG_MESSAGE, {
        title: `JUSTICIERO NIVEL ${resultado.nivel}`, subtitle: 'mejora permanente',
      });
    }
    this.fugitivo = null;
    this.aro.setVisible(false);
  }

  // aqui si desaparece de verdad: sigue sano, simplemente ya no pinta nada
  perdido() {
    EventBus.emit(EVT.NOTIFY, { text: 'Le has perdido la pista', tone: 'dim' });
    const lista = this.scene.vehicles;
    const i = lista.indexOf(this.fugitivo.vehicle);
    if (i >= 0) lista.splice(i, 1);
    this.fugitivo.vehicle.destroy();
    this.fugitivo = null;
    this.aro.setVisible(false);
  }

  objectiveText() {
    return this.fugitivo ? 'Dale alcance al fugitivo' : 'J para buscar un fugitivo';
  }
}
