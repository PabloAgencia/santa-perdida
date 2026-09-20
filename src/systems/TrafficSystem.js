import { Vehicle } from '../entities/Vehicle.js';
import { VEHICLE_KEYS, VEHICLES } from '../config/vehicles.js';
import { steerTo, forwardBlocked, peopleAhead } from './driving.js';

const MAX_CARS = 14;
const SPAWN_MIN = 760;
const SPAWN_MAX = 1500;
const DESPAWN = 2100;
const ARRIVE = 52;

export class TrafficSystem {
  constructor(scene, map, network) {
    this.scene = scene;
    this.map = map;
    this.net = network;
    this.cars = [];
  }

  update(dt, focusX, focusY, people) {
    this.cull(focusX, focusY);
    this.topUp(focusX, focusY);

    for (const car of this.cars) {
      this.driveCar(car, dt, people);
    }
  }

  cull(fx, fy) {
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      const v = car.vehicle;
      // si el jugador se sube a uno, deja de ser trafico y pasa a ser suyo
      if (v.occupied || !car.edge) {
        v.ai = false;
        this.cars.splice(i, 1);
        continue;
      }
      if (Phaser.Math.Distance.Between(v.x, v.y, fx, fy) > DESPAWN) {
        this.removeCar(i);
      }
    }
  }

  removeCar(i) {
    const car = this.cars[i];
    const list = this.scene.vehicles;
    const at = list.indexOf(car.vehicle);
    if (at >= 0) list.splice(at, 1);
    car.vehicle.destroy();
    this.cars.splice(i, 1);
  }

  topUp(fx, fy) {
    let attempts = 0;
    while (this.cars.length < MAX_CARS && attempts < 40) {
      attempts++;
      const edge = this.net.randomEdge();
      const t = 0.15 + Math.random() * 0.7;
      const p = this.net.pointAlong(edge, t);
      const dist = Phaser.Math.Distance.Between(p.x, p.y, fx, fy);
      if (dist < SPAWN_MIN || dist > SPAWN_MAX) continue;
      if (this.map.isSolidBox(p.x, p.y, 34, 34)) continue;
      if (this.scene.vehicles.some((v) => Phaser.Math.Distance.Between(v.x, v.y, p.x, p.y) < 130)) {
        continue;
      }

      const type = VEHICLE_KEYS[Math.floor(Math.random() * VEHICLE_KEYS.length)];
      const color = Math.floor(Math.random() * VEHICLES[type].palette.length);
      const vehicle = new Vehicle(this.scene, this.map, type, p.x, p.y, edge.angle, { color });
      vehicle.ai = true;
      this.scene.vehicles.push(vehicle);

      this.cars.push({
        vehicle,
        edge,
        limit: vehicle.stats.maxSpeed * (0.42 + Math.random() * 0.18),
      });
    }
  }

  driveCar(car, dt, people) {
    const v = car.vehicle;
    const target = this.net.exitPoint(car.edge);

    if (Phaser.Math.Distance.Between(v.x, v.y, target.x, target.y) < ARRIVE) {
      car.edge = this.net.nextEdge(car.edge);
      if (!car.edge) return;
    }

    const goal = this.net.exitPoint(car.edge);
    const blocked =
      forwardBlocked(v, this.scene.vehicles) || peopleAhead(v, people || []);

    // Desatasco: si lleva un rato sin avanzar es que se ha quedado clavado
    // contra algo. Da marcha atras un momento y coge otra salida.
    car.atasco = v.speed < 22 ? (car.atasco || 0) + dt : 0;

    if (car.atasco > 2.2) {
      v.update(dt, {
        throttle: false, brake: true, left: true, right: false, handbrake: false,
      });
      if (car.atasco > 3.4) {
        car.atasco = 0;
        car.edge = this.net.nextEdge(car.edge) || this.net.randomEdge();
      }
      return;
    }

    v.update(dt, steerTo(v, goal.x, goal.y, car.limit, blocked));
  }

  clear() {
    for (let i = this.cars.length - 1; i >= 0; i--) this.removeCar(i);
  }
}
