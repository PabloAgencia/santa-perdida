import { Vehicle } from '../entities/Vehicle.js';
import { VEHICLE_KEYS, VEHICLES } from '../config/vehicles.js';
import { steerTo, forwardBlocked, peopleAhead, paredDelante } from './driving.js';
import { LINEA_PARADA } from './TrafficLights.js';
import { EventBus, EVT } from '../core/EventBus.js';

const MAX_CARS = 14;
const SPAWN_MIN = 760;
const SPAWN_MAX = 1500;
const DESPAWN = 2100;
const ARRIVE = 52;

// uno de cada veinte conduce como si la calle fuera suya
const TEMERARIOS = 0.05;

// desatasco
const PARADO = 22;          // px/s por debajo de lo cual se considera clavado
const PACIENCIA = 2.0;      // s clavado antes de maniobrar
const MANIOBRA = 1.1;       // s de marcha atras
const INTENTOS_MAX = 3;     // tras esto, si no se le ve, se recicla

export class TrafficSystem {
  constructor(scene, map, network, lights = null) {
    this.scene = scene;
    this.map = map;
    this.net = network;
    this.lights = lights;
    this.cars = [];
  }

  update(dt, focusX, focusY, people) {
    this.cull(focusX, focusY);
    this.topUp(focusX, focusY);

    for (let i = this.cars.length - 1; i >= 0; i--) {
      this.driveCar(this.cars[i], dt, people, focusX, focusY, i);
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
    if (car.conductor) car.conductor.destroy();
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
      vehicle.encendido = true;
      this.scene.vehicles.push(vehicle);

      const temerario = Math.random() < TEMERARIOS;
      vehicle.temerario = temerario;

      this.cars.push({
        vehicle,
        edge,
        temerario,
        atasco: 0,
        maniobra: 0,
        giro: 1,
        intentos: 0,
        // cada coche lleva a alguien dentro: se ve al volante y sale si se lo roban
        conductor: this.scene.npcs ? this.scene.npcs.crearConductor(vehicle) : null,
        siguiente: this.net.nextEdge(edge),
        fuera: 0,
        // El trafico de fondo va tranquilo: no es una carrera, y a esa
        // velocidad el jugador siempre puede adelantar, que es lo que da
        // sensacion de ir rapido.
        limit: vehicle.stats.maxSpeed * (temerario ? 0.7 : 0.42 + Math.random() * 0.16),
      });
    }
  }

  // ---------- conduccion ----------

  driveCar(car, dt, people, fx, fy, indice) {
    const v = car.vehicle;
    if (car.conductor) car.conductor.sentarEn(v);

    if (!car.siguiente) car.siguiente = this.net.nextEdge(car.edge);

    const target = this.net.exitPoint(car.edge);
    if (Phaser.Math.Distance.Between(v.x, v.y, target.x, target.y) < ARRIVE) {
      // la siguiente ya estaba decidida desde lejos: es lo que permite
      // apuntar a ella y trazar la curva en vez de girar de golpe
      car.edge = car.siguiente || this.net.nextEdge(car.edge);
      if (!car.edge) return;
      car.siguiente = this.net.nextEdge(car.edge);
      car.intentos = 0;
    }

    // --- maniobra de desatasco en curso ---
    // OJO: el contador de atasco NO puede reiniciarse con el movimiento de la
    // propia maniobra. Antes pasaba eso: daba marcha atras, la velocidad
    // subia, el contador se ponia a cero, volvia a empotrarse y asi para
    // siempre. Por eso se veian tres coches clavados en un cruce.
    if (car.maniobra > 0) {
      car.maniobra -= dt;
      v.update(dt, {
        throttle: false, brake: true,
        left: car.giro > 0, right: car.giro < 0, handbrake: false,
      });
      if (car.maniobra <= 0) {
        car.edge = this.net.nextEdge(car.edge) || this.net.randomEdge();
        car.siguiente = this.net.nextEdge(car.edge);
        car.atasco = 0;
        car.intentos++;
        // si lleva tres intentos y nadie le esta mirando, se recicla
        if (car.intentos >= INTENTOS_MAX &&
            Phaser.Math.Distance.Between(v.x, v.y, fx, fy) > 900) {
          this.removeCar(indice);
        }
      }
      return;
    }

    const goal = this.puntoDelCarril(car, v);

    // LOS COCHES VAN POR LA CALLE. Si uno acaba en un callejon o en una
    // acera (por un empujon o por una mala trazada), se le da un margen para
    // volver al carril; si sigue fuera, se retira cuando nadie mira.
    car.fuera = this.map.isRoadPoint(v.x, v.y) ? 0 : car.fuera + dt;
    if (car.fuera > 3.5 && Phaser.Math.Distance.Between(v.x, v.y, fx, fy) > 700) {
      this.removeCar(indice);
      return;
    }

    // --- prioridad en el cruce ---
    // El semaforo solo manda cuando hay alguien mas disputando el cruce. Si la
    // calle esta vacia se pasa sin parar: con la espera fija, la ciudad entera
    // se arrastraba a 21 km/h.
    const nodo = this.net.nodes[car.edge.to];
    const alCruce = Phaser.Math.Distance.Between(v.x, v.y, nodo.x, nodo.y);
    let esperando = false;
    if (this.lights && !car.temerario) {
      const antesDeLaLinea = alCruce > LINEA_PARADA - 40 && alCruce < LINEA_PARADA + 90;
      if (antesDeLaLinea && this.hayQuienDispute(car, nodo)) {
        const luz = this.lights.estadoEn(car.edge.to, Math.abs(car.edge.dx) > 0.5);
        esperando = luz !== 'verde';
      }
    }

    const cocheDelante = forwardBlocked(v, this.scene.vehicles);
    // y si lo que hay delante es una pared, se frena aunque no haya nadie
    const muro = paredDelante(v, this.map);

    // Un peaton cruzando es para levantar el pie, no para clavarse: frenar en
    // seco atascaba la ciudad en cadena. El temerario ni eso.
    const genteDelante = car.temerario ? false : peopleAhead(v, people || []);
    let limite = genteDelante ? car.limit * 0.25 : car.limit;
    if (esperando) limite = 0;

    // --- contador de atasco ---
    // Cuenta TAMBIEN cuando el que te tapa es otro coche: si no, tres coches
    // esperandose unos a otros en un cruce no se mueven nunca (cada uno cree
    // que el de delante va a arrancar). Con un coche delante se tiene mas
    // paciencia, que puede ser una cola normal.
    const clavado = v.speed < PARADO && !esperando;
    car.atasco = clavado
      ? car.atasco + dt * (cocheDelante ? 0.55 : 1)
      : Math.max(0, car.atasco - dt * 0.5);

    if (car.atasco > PACIENCIA) {
      car.maniobra = MANIOBRA;
      car.giro = Math.random() < 0.5 ? 1 : -1;
      car.atasco = 0;
      return;
    }

    if (car.fuera > 0.4) limite = Math.min(limite, v.stats.maxSpeed * 0.25);
    v.update(dt, steerTo(v, goal.x, goal.y, muro ? limite * 0.3 : limite, cocheDelante || esperando || muro));
  }

  // ¿hay otro coche entrando en el mismo cruce por otra calle?
  hayQuienDispute(car, nodo) {
    const miEje = Math.abs(car.edge.dx) > 0.5;
    for (const otro of this.cars) {
      if (otro === car || !otro.edge) continue;
      if (Math.abs(otro.edge.dx) > 0.5 === miEje) continue;
      const d = Phaser.Math.Distance.Between(otro.vehicle.x, otro.vehicle.y, nodo.x, nodo.y);
      if (d < LINEA_PARADA + 70) return true;
    }
    // la policia y el jugador tambien cuentan: no te metes debajo de ellos
    for (const v of this.scene.vehicles) {
      if (v.ai && !v.police) continue;
      if (v === car.vehicle) continue;
      if (v.speed < 20) continue;
      if (Phaser.Math.Distance.Between(v.x, v.y, nodo.x, nodo.y) < LINEA_PARADA + 40) return true;
    }
    return false;
  }

  // el temerario que atropella acelera y se va
  huirTrasAtropello(vehicle) {
    const car = this.cars.find((c) => c.vehicle === vehicle);
    if (!car || !car.temerario) return;
    car.limit = vehicle.stats.maxSpeed * 0.95;
    EventBus.emit(EVT.NOTIFY, { text: 'Se lo ha llevado por delante y ha acelerado', tone: 'danger' });
  }

  // proyecta el coche sobre su carril y devuelve un punto por delante
  // EL PUNTO DE MIRA, que es lo que de verdad decide como conduce un coche.
  //
  // Antes miraba solo dentro de SU calle: al llegar al cruce apuntaba al
  // final de la recta y tenia que girar 90 grados de golpe, asi que cortaba
  // la esquina y se subia a la acera o se empotraba contra el edificio.
  // Ahora, cuando la vista se sale de la calle actual, lo que sobra se
  // proyecta sobre la SIGUIENTE: el coche empieza a girar antes de llegar y
  // traza la curva entera, que es lo que hacen los coches de los GTA.
  puntoDelCarril(car, v) {
    const e = car.edge;
    const a = this.net.entryPoint(e);
    const b = this.net.exitPoint(e);
    const largo = Math.hypot(b.x - a.x, b.y - a.y) || 1;

    let t = ((v.x - a.x) * (b.x - a.x) + (v.y - a.y) * (b.y - a.y)) / (largo * largo);
    t = Phaser.Math.Clamp(t, 0, 1);

    // cuanto mas rapido va, mas lejos mira: si no, hace eses
    const vista = Phaser.Math.Clamp(80 + v.speed * 0.6, 80, 260);
    const sobra = (t + vista / largo) - 1;

    if (sobra <= 0) {
      const t2 = t + vista / largo;
      return { x: a.x + (b.x - a.x) * t2, y: a.y + (b.y - a.y) * t2 };
    }

    const sig = car.siguiente;
    if (!sig) return { x: b.x, y: b.y };

    const c = this.net.entryPoint(sig);
    const d = this.net.exitPoint(sig);
    const largo2 = Math.hypot(d.x - c.x, d.y - c.y) || 1;
    const t3 = Math.min(1, (sobra * largo) / largo2);
    return { x: c.x + (d.x - c.x) * t3, y: c.y + (d.y - c.y) * t3 };
  }
  // el jugador le roba el coche a alguien: el conductor se baja
  soltarConductor(vehicle, player) {
    const car = this.cars.find((c) => c.vehicle === vehicle);
    if (!car || !car.conductor) return null;
    const cond = car.conductor;
    car.conductor = null;
    return cond;
  }

  clear() {
    for (let i = this.cars.length - 1; i >= 0; i--) this.removeCar(i);
  }
}
