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
        limit: vehicle.stats.maxSpeed * (0.52 + Math.random() * 0.2),
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

    // Apuntar al final del tramo hace que el coche corte por el centro de la
    // calle. Se apunta a un punto del carril un poco por delante, asi va
    // pegado a su lado como un coche de verdad.
    const goal = this.puntoDelCarril(car, v);

    // Un coche delante SI es para frenar. Un peaton cruzando es para levantar
    // el pie, no para clavarse: si no, la ciudad entera se atasca en cadena.
    const cocheDelante = forwardBlocked(v, this.scene.vehicles);
    const genteDelante = peopleAhead(v, people || []);
    const limite = genteDelante ? car.limit * 0.3 : car.limit;

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

    v.update(dt, steerTo(v, goal.x, goal.y, limite, cocheDelante));
  }

  // proyecta el coche sobre su carril y devuelve un punto por delante
  puntoDelCarril(car, v) {
    const e = car.edge;
    const a = this.net.entryPoint(e);
    const b = this.net.exitPoint(e);
    const largo = Math.hypot(b.x - a.x, b.y - a.y) || 1;

    let t = ((v.x - a.x) * (b.x - a.x) + (v.y - a.y) * (b.y - a.y)) / (largo * largo);
    t = Phaser.Math.Clamp(t, 0, 1);

    // cuanto mas rapido va, mas lejos mira: si no, hace eses
    const vista = Phaser.Math.Clamp(70 + v.speed * 0.55, 70, 230) / largo;
    const t2 = Math.min(1, t + vista);
    return { x: a.x + (b.x - a.x) * t2, y: a.y + (b.y - a.y) * t2 };
  }

  clear() {
    for (let i = this.cars.length - 1; i >= 0; i--) this.removeCar(i);
  }
}
