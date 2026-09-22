import { Vehicle } from '../entities/Vehicle.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { steerTo, forwardBlocked, paredDelante } from './driving.js';
import { Officer } from '../entities/Officer.js';

export const ESTADO = {
  PATRULLA: 'patrulla',
  INVESTIGANDO: 'investigando',
  PERSIGUIENDO: 'persiguiendo',
  BUSCANDO: 'buscando',
  PERDIDO: 'perdido',
  VOLVIENDO: 'volviendo',
  BLOQUEO: 'bloqueo',
};

// Numeros pensados para que HAYA forma de escapar. Antes, huyendo en un
// utilitario, solo se escapaba 1 de cada 8 veces: te veian casi desde fuera
// de la pantalla, eran cinco coches mas rapidos que el tuyo y hacian falta
// casi veinte segundos sin que te vieran para bajar un nivel.
// LOS SEIS NIVELES DE BUSCA, EN UNA SOLA TABLA.
//
// Antes eran tres niveles y los numeros estaban sueltos por el fichero
// (`wanted >= 3` aqui, una constante VISION alla). Para cambiar como se porta
// la policia en un nivel habia que ir a buscarlos uno a uno, y era imposible
// ver de un vistazo si la escalada tenia sentido.
//
// Ahora sube de verdad: en 1 te siguen y ya esta, en 2 sacan el arma, en 3
// te cortan la calle, en 4 sale el furgon de asalto, y en 5 y 6 son mas, ven
// mas lejos, corren mas y cuesta el triple quitartelos de encima.
//
//   coches      patrullas a la vez
//   vision      a cuantos pixeles te ven
//   velocidad   parte de la punta del coche que usan persiguiendo
//   disparan    si los agentes que bajan abren fuego. Quien lo decide de
//               verdad es `desdeBusca` en Officer.js (cada clase de agente
//               tiene el suyo); aqui esta para poder leer la escalada de un
//               vistazo. Y de 2 a 6 ademas disparan mas seguido y fallan
//               menos: eso tambien vive en Officer.js.
//   controles   cortes de calle por delante
//   furgon      el furgon de asalto con cuatro dentro
//   despegar    segundos SIN QUE TE VEAN para bajar un nivel
const BUSCA = [
  { coches: 0, vision: 0, velocidad: 0, disparan: false, controles: false, furgon: false, despegar: 0 },
  { coches: 1, vision: 250, velocidad: 0.68, disparan: false, controles: false, furgon: false, despegar: 4 },
  { coches: 2, vision: 300, velocidad: 0.76, disparan: true, controles: false, furgon: false, despegar: 5 },
  { coches: 3, vision: 345, velocidad: 0.83, disparan: true, controles: true, furgon: false, despegar: 6.5 },
  { coches: 4, vision: 390, velocidad: 0.89, disparan: true, controles: true, furgon: true, despegar: 8.5 },
  { coches: 5, vision: 440, velocidad: 0.95, disparan: true, controles: true, furgon: true, despegar: 11 },
  { coches: 6, vision: 500, velocidad: 1.0, disparan: true, controles: true, furgon: true, despegar: 14 },
];

// lo que toque segun la busca de ahora mismo
function nivel() {
  return BUSCA[Phaser.Math.Clamp(GameState.wanted, 0, BUSCA.length - 1)];
}

const VISION_PERSIGUIENDO = 400;
const SPAWN_MIN = 700;
const SPAWN_MAX = 1500;
const DESPAWN = 2400;
const DISTANCIA_QUE_TE_PIERDEN = 620;
const DETENCION_DIST = 48;
const TIEMPO_PARA_DETENER = 3.6;
const BAJARSE_DIST = 180;

// El furgon de asalto: solo con la busca al maximo, y trae cuatro dentro.
// Se le ve venir (es lento) y despliega al llegar, como en San Andreas.
const FURGON_CADA = 30;
const FURGON_MAX = 2;
const SWAT_POR_FURGON = 4;
const FURGON_DESPLIEGA_A = 240;

export class PoliceSystem {
  constructor(scene, map, network) {
    this.scene = scene;
    this.map = map;
    this.net = network;
    this.units = [];
    this.sinVer = 0;
    this.bustCooldown = 0;
    // ultima posicion CONOCIDA, no la real: solo se actualiza cuando alguien
    // te ve o alguien da el aviso. Sin esto las patrullas nuevas aparecian
    // sabiendo donde estas y no habia forma de escapar.
    this.lastKnown = null;
    this.roadblockTimer = 0;
  }

  get chasing() {
    return this.units.some((u) => u.state === ESTADO.PERSIGUIENDO);
  }

  // Un delito gordo pone la busca EN un nivel, no suma. Sumando, cargarse a
  // alguien de un tiro daba tres estrellas de golpe (dos por el muerto y una
  // por el ruido), que es una barbaridad para lo que ha pasado.
  reportarCrimen(x, y, nivelMinimo) {
    this.lastKnown = { x, y };
    if (GameState.wanted < nivelMinimo) GameState.setWanted(nivelMinimo);
    for (const u of this.units) {
      if (u.state === ESTADO.PATRULLA || u.state === ESTADO.VOLVIENDO) {
        u.state = ESTADO.INVESTIGANDO;
        u.lastSeen = { x, y };
        u.timer = 14;
      }
    }
  }

  report(x, y, raise = 1) {
    GameState.raiseWanted(raise);
    this.lastKnown = { x, y };
    for (const u of this.units) {
      if (u.state === ESTADO.PATRULLA || u.state === ESTADO.VOLVIENDO) {
        u.state = ESTADO.INVESTIGANDO;
        u.lastSeen = { x, y };
        u.timer = 14;
      }
    }
  }

  update(dt, player, playerVehicle) {
    if (this.bustCooldown > 0) this.bustCooldown -= dt;

    this.cull(player);
    this.topUp(player);

    // Si les sacas medio barrio, te pierden aunque tecnicamente te "vean" al
    // fondo de una recta. Es lo que hace que huir sirva de algo.
    let masCerca = Infinity;
    for (const u of this.units) {
      masCerca = Math.min(
        masCerca,
        Phaser.Math.Distance.Between(u.vehicle.x, u.vehicle.y, player.x, player.y)
      );
    }
    const lesHasSacadoDistancia = masCerca > DISTANCIA_QUE_TE_PIERDEN;

    let algunoVe = false;
    for (const u of this.units) {
      const ve = this.canSee(u, player) && !lesHasSacadoDistancia;
      if (ve) {
        algunoVe = true;
        this.lastKnown = { x: player.x, y: player.y };
      }
      // una patrulla robada ya no la conduce la unidad: la conduces tu. Sus
      // agentes, en cambio, siguen a lo suyo (que es ir a por ti), y la luz
      // sigue parpadeando, que la llevas puesta.
      if (!u.robada) this.runUnit(u, dt, player, ve, playerVehicle);
      this.updateOfficers(u, dt, player, playerVehicle, ve);
      this.updateSiren(u, dt);
    }

    if (GameState.wanted > 0) {
      this.sinVer = algunoVe ? 0 : this.sinVer + dt;
      // cuanto mas alta la busca, mas cuesta despegarselos
      if (this.sinVer >= nivel().despegar) {
        this.sinVer = 0;
        GameState.setWanted(GameState.wanted - 1);
      }
    } else {
      this.sinVer = 0;
      this.lastKnown = null;
    }

    // Los cortes de calle y el furgon ya no van atados a "wanted >= 3": lo
    // dice la tabla. Los cortes entran en 3 y el furgon en 4, y ademas los
    // dos vienen MAS SEGUIDOS cuanto mas alta es la busca.
    const n = nivel();
    this.roadblockTimer -= dt;
    if (n.controles && this.roadblockTimer <= 0) {
      this.roadblockTimer = Math.max(9, 28 - GameState.wanted * 3.5);
      this.spawnRoadblock(player, playerVehicle);
    }

    this.furgonTimer = (this.furgonTimer || 0) - dt;
    if (n.furgon && this.furgonTimer <= 0) {
      this.furgonTimer = Math.max(14, FURGON_CADA - (GameState.wanted - 4) * 6);
      this.spawnFurgon(player);
    }

    this.checkArrest(player, playerVehicle, dt);
  }

  // a nivel 3 te cortan la calle por delante
  spawnRoadblock(player, playerVehicle) {
    if (this.units.filter((u) => u.roadblock).length >= 4) return;

    const heading = playerVehicle
      ? Math.atan2(playerVehicle.vy, playerVehicle.vx)
      : player.angle;
    const ahead = {
      x: player.x + Math.cos(heading) * 820,
      y: player.y + Math.sin(heading) * 820,
    };

    let node = null;
    let best = Infinity;
    for (const n of this.net.nodes) {
      const d = Phaser.Math.Distance.Between(n.x, n.y, ahead.x, ahead.y);
      if (d < best) {
        best = d;
        node = n;
      }
    }
    if (!node || best > 620) return;
    if (Phaser.Math.Distance.Between(node.x, node.y, player.x, player.y) < 450) return;

    // elegir la calle que mejor se alinea con hacia donde va el jugador
    let edge = null;
    let bestDot = -2;
    for (const id of node.out) {
      const e = this.net.edges[id];
      const dot = e.dx * Math.cos(heading) + e.dy * Math.sin(heading);
      if (dot > bestDot) {
        bestDot = dot;
        edge = e;
      }
    }
    if (!edge) return;

    const across = edge.angle + Math.PI / 2;
    for (const off of [-34, 34]) {
      const x = node.x + edge.rx * off;
      const y = node.y + edge.ry * off;
      if (this.map.isSolidBox(x, y, 30, 30)) continue;

      const vehicle = new Vehicle(this.scene, this.map, 'patrulla', x, y, across, { color: 0 });
      vehicle.ai = true;
      vehicle.police = true;
      vehicle.encendido = true;
      this.scene.vehicles.push(vehicle);

      const siren = this.scene.add.image(x, y, 'siren').setVisible(false).setDepth(9999);
      this.units.push({
        vehicle, siren, sirenTimer: 0,
        state: ESTADO.BLOQUEO,
        lastSeen: null, timer: 40, edge: null,
        officers: [], plazas: 2, flanco: 0,
        roadblock: true,
      });
    }

    EventBus.emit(EVT.NOTIFY, { text: 'Control policial delante', tone: 'danger' });
  }

  // El furgon aparece lejos y de frente, no a tu espalda: la gracia es
  // verlo llegar y decidir si aguantas o te largas.
  spawnFurgon(player) {
    if (this.units.filter((u) => u.furgon).length >= FURGON_MAX) return;

    let mejor = null;
    let mejorDist = Infinity;
    for (let i = 0; i < 60; i++) {
      const edge = this.net.randomEdge();
      const p = this.net.pointAlong(edge, 0.2 + Math.random() * 0.6);
      const d = Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y);
      if (d < 900 || d > 1600) continue;
      if (this.map.isSolidBox(p.x, p.y, 40, 40)) continue;
      if (d < mejorDist) {
        mejorDist = d;
        mejor = { p, edge };
      }
    }
    if (!mejor) return;

    const { p, edge } = mejor;
    const vehicle = new Vehicle(this.scene, this.map, 'furgon', p.x, p.y, edge.angle, { color: 0 });
    vehicle.ai = true;
    vehicle.police = true;
    vehicle.encendido = true;
    this.scene.vehicles.push(vehicle);

    const siren = this.scene.add.image(p.x, p.y, 'siren').setVisible(false).setDepth(9999);
    this.units.push({
      vehicle, siren, sirenTimer: 0,
      state: ESTADO.PERSIGUIENDO,
      lastSeen: { x: player.x, y: player.y },
      timer: 60, edge,
      officers: [], plazas: SWAT_POR_FURGON,
      clase: 'asalto',
      furgon: true,
      flanco: 0,
    });

    EventBus.emit(EVT.NOTIFY, { text: 'Viene un furgon de asalto', tone: 'danger' });
  }

  // ---------- vista ----------

  canSee(unit, player) {
    if (GameState.wanted === 0) return false;
    const v = unit.vehicle;
    const range = unit.state === ESTADO.PERSIGUIENDO ? VISION_PERSIGUIENDO : nivel().vision;
    const dist = Phaser.Math.Distance.Between(v.x, v.y, player.x, player.y);
    if (dist > range) return false;
    return this.lineOfSight(v.x, v.y, player.x, player.y);
  }

  lineOfSight(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(dist / 24);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.map.isSolidPoint(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  // ---------- maquina de estados ----------

  // si vas a pie y la patrulla ya te tiene cerca, el agente se baja a por ti
  // En un coche patrulla caben DOS, y cuando se bajan ese coche ya no da
  // mas gente: antes podia parir agentes sin fin, uno detras de otro, y
  // acababas rodeado por diez salidos del mismo sitio.
  updateOfficers(u, dt, player, playerVehicle, ve) {
    const v = u.vehicle;

    for (let i = u.officers.length - 1; i >= 0; i--) {
      const o = u.officers[i];
      const dist = o.update(dt, player.x, player.y);
      if (o.down) continue;   // el que cae se queda tirado en la calle

      // Si te subes a un coche o escapas lejos, vuelve al suyo y su plaza
      // queda libre otra vez.
      //
      // PERO NO SI LE HAS ROBADO EL COCHE: no tienen a donde volver. Aqui
      // estaba el fallo de "robo la patrulla y no sale nadie": subirse al
      // coche cuenta como `playerVehicle`, asi que los dos agentes que
      // acababan de bajar se destruian en el fotograma siguiente. Salian de
      // verdad, pero no daba tiempo ni a verlos.
      const seVuelven = u.robada
        ? (dist > 900 || GameState.wanted === 0)
        : (playerVehicle || dist > 520 || GameState.wanted === 0);

      if (seVuelven) {
        o.destroy();
        u.officers.splice(i, 1);
        u.plazas++;
      }
    }

    if (u.plazas <= 0) return;

    // El furgon no espera a nada: llega, frena y suelta a los cuatro. Da
    // igual que vayas en coche, que es justo cuando hace falta.
    if (u.furgon) {
      const d = Phaser.Math.Distance.Between(v.x, v.y, player.x, player.y);
      if (d < FURGON_DESPLIEGA_A && v.speed < 120) {
        this.bajarDelCoche(u, SWAT_POR_FURGON, 'Furgon de asalto: se despliegan');
      }
      return;
    }

    if (playerVehicle || u.roadblock) return;
    if (u.state !== ESTADO.PERSIGUIENDO || !ve) return;
    if (v.speed > 55) return;

    const dist = Phaser.Math.Distance.Between(v.x, v.y, player.x, player.y);

    // Si el coche esta clavado porque tu estas donde el no puede entrar (una
    // acera, un callejon), se bajan aunque estes lejos. Antes te quedabas a
    // 200 px mirandoles sin que pasara nada.
    u.quieto = v.speed < 22 ? (u.quieto || 0) + dt : 0;
    const noTeAlcanza = u.quieto > 1.2 && dist < 340;

    if (dist < 30) return;
    if (dist > BAJARSE_DIST && !noTeAlcanza) return;

    this.bajarDelCoche(u, u.plazas, 'Se han bajado del coche');
  }

  // LE ROBAS LA PATRULLA A LA POLICIA. Los que iban dentro salen de golpe y
  // se quedan en la calle yendo a por ti.
  //
  // Esto hacia falta porque los agentes NO existen mientras van en el coche:
  // la unidad guarda cuantas plazas lleva ocupadas y solo crea el sprite al
  // bajarse. Sin esto, le robabas el coche a la policia y no salia nadie: el
  // coche se quedaba vacio de la nada.
  robarPatrulla(vehicle) {
    const u = this.units.find((x) => x.vehicle === vehicle);
    if (!u || u.robada) return false;
    u.robada = true;

    // los que iban dentro salen a la calle
    if (u.plazas > 0) this.bajarDelCoche(u, u.plazas, null);

    // el coche deja de ser suyo: ni lo conducen ni les pita la sirena
    u.vehicle.ai = false;
    u.vehicle.police = false;
    u.siren.setVisible(false);
    u.sinSirena = true;

    GameState.raiseWanted(1);
    EventBus.emit(EVT.NOTIFY, { text: 'Has robado un coche patrulla', tone: 'danger' });
    return true;
  }

  // Retira la unidad pero DEJA EL COCHE, que lo estas conduciendo tu.
  retirarSinCoche(i) {
    const u = this.units[i];
    for (const o of u.officers) o.destroy();
    u.siren.destroy();
    this.units.splice(i, 1);
  }

  // Bajan de golpe los que queden dentro, cada uno por su lado del coche.
  bajarDelCoche(u, cuantos, aviso) {
    const v = u.vehicle;
    const n = Math.min(cuantos, u.plazas);
    for (let i = 0; i < n; i++) {
      const spot = v.findExitSpot();
      // cada uno sale por su lado, pero si ese lado es pared salen por la
      // puerta sin mas: si no, acababan de pie encima de un edificio
      const lado = i % 2 === 0 ? 1 : -1;
      const sep = 14 * lado * Math.floor(i / 2 + 1);
      let px = spot.x + Math.cos(v.angle + Math.PI / 2) * sep;
      let py = spot.y + Math.sin(v.angle + Math.PI / 2) * sep;
      if (this.map.isSolidBox(px, py, 12, 12)) {
        px = spot.x;
        py = spot.y;
      }
      const o = new Officer(this.scene, this.map, px, py, u.clase || 'patrulla');
      u.officers.push(o);
      u.plazas--;
    }
    u.quieto = 0;
    v.vx = 0;
    v.vy = 0;
    if (aviso) EventBus.emit(EVT.NOTIFY, { text: aviso, tone: 'danger' });
  }
  runUnit(u, dt, player, ve, playerVehicle) {
    const v = u.vehicle;
    u.timer -= dt;

    // El furgon no busca ni duda: si ha salido es porque ya saben donde
    // estas, y va a por ti hasta llegar. Es lo que cambia en alerta maxima.
    if (u.furgon && u.officers.length === 0) {
      u.state = ESTADO.PERSIGUIENDO;
      u.lastSeen = { x: player.x, y: player.y };
    }

    switch (u.state) {
      case ESTADO.PATRULLA:
      case ESTADO.VOLVIENDO:
        if (ve) this.startChase(u, player);
        break;

      case ESTADO.INVESTIGANDO:
        if (ve) {
          this.startChase(u, player);
        } else if (
          u.lastSeen &&
          Phaser.Math.Distance.Between(v.x, v.y, u.lastSeen.x, u.lastSeen.y) < 90
        ) {
          u.state = ESTADO.BUSCANDO;
          u.timer = 10;
        } else if (u.timer <= 0) {
          u.state = ESTADO.PERDIDO;
          u.timer = 1.5;
        }
        break;

      case ESTADO.PERSIGUIENDO:
        if (ve) {
          u.lastSeen = { x: player.x, y: player.y };
          u.timer = 3;
        } else if (u.timer <= 0) {
          u.state = ESTADO.BUSCANDO;
          u.timer = 9;
        }
        break;

      case ESTADO.BUSCANDO:
        if (ve) {
          this.startChase(u, player);
        } else if (u.timer <= 0) {
          u.state = ESTADO.PERDIDO;
          u.timer = 1.5;
        } else if (
          u.lastSeen &&
          Phaser.Math.Distance.Between(v.x, v.y, u.lastSeen.x, u.lastSeen.y) < 70
        ) {
          // dar vueltas por la zona
          const a = Math.random() * Math.PI * 2;
          u.lastSeen = {
            x: u.lastSeen.x + Math.cos(a) * 320,
            y: u.lastSeen.y + Math.sin(a) * 320,
          };
        }
        break;

      case ESTADO.BLOQUEO:
        if (ve && Phaser.Math.Distance.Between(v.x, v.y, player.x, player.y) < 230) {
          u.roadblock = false;
          this.startChase(u, player);
        }
        break;

      case ESTADO.PERDIDO:
        if (u.timer <= 0) {
          u.state = ESTADO.VOLVIENDO;
          u.edge = this.net.randomEdge();
        }
        break;
    }

    if (u.officers.length > 0) {
      // con gente fuera, el coche se queda parado
      u.vehicle.vx = 0;
      u.vehicle.vy = 0;
      u.vehicle.syncSprite();
      return;
    }
    this.driveUnit(u, dt, player, playerVehicle);
  }

  startChase(u, player) {
    if (u.state !== ESTADO.PERSIGUIENDO) {
      u.state = ESTADO.PERSIGUIENDO;
      EventBus.emit(EVT.NOTIFY, { text: '¡Te han visto!', tone: 'danger' });
    }
    u.lastSeen = { x: player.x, y: player.y };
    u.timer = 3;
  }

  driveUnit(u, dt, player, playerVehicle) {
    const v = u.vehicle;
    let goal = null;
    let limit = v.stats.maxSpeed * 0.5;

    if (u.state === ESTADO.PERSIGUIENDO) {
      goal = u.lastSeen || { x: player.x, y: player.y };
      // cuanto mas alta la busca, mas caña le meten (tabla BUSCA)
      limit = v.stats.maxSpeed * nivel().velocidad;

      // no van todos al mismo punto: cada unidad ataca por un lado y, si
      // huyes en coche, apuntan a donde VAS a estar, no a donde estas
      const dist = Phaser.Math.Distance.Between(v.x, v.y, goal.x, goal.y);
      if (playerVehicle && dist > 220) {
        goal = {
          x: goal.x + playerVehicle.vx * 0.38,
          y: goal.y + playerVehicle.vy * 0.38,
        };
      } else if (dist > 90) {
        const lado = u.flanco * (Math.PI * 2) / 3;
        const radio = 70;
        goal = {
          x: goal.x + Math.cos(lado) * radio,
          y: goal.y + Math.sin(lado) * radio,
        };
      }
    } else if (u.state === ESTADO.INVESTIGANDO || u.state === ESTADO.BUSCANDO) {
      goal = u.lastSeen;
      limit = v.stats.maxSpeed * (u.state === ESTADO.INVESTIGANDO ? 0.85 : 0.6);
    } else if (u.state === ESTADO.PERDIDO || u.state === ESTADO.BLOQUEO) {
      // ojo: frenar con el coche ya parado lo mete marcha atras
      const frenando = v.speed > 12;
      v.update(dt, {
        throttle: false, brake: frenando, left: false, right: false, handbrake: frenando,
      });
      if (!frenando) {
        v.vx = 0;
        v.vy = 0;
      }
      return;
    }

    if (!goal) {
      if (!u.edge) u.edge = this.net.randomEdge();
      const target = this.net.exitPoint(u.edge);
      if (Phaser.Math.Distance.Between(v.x, v.y, target.x, target.y) < 52) {
        u.edge = this.net.nextEdge(u.edge) || this.net.randomEdge();
      }
      goal = this.net.exitPoint(u.edge);
    }

    // --- MANIOBRA DE DESATASCO EN CURSO ---
    if (u.maniobra > 0) {
      u.maniobra -= dt;
      v.update(dt, {
        throttle: false, brake: true,
        left: u.giro > 0, right: u.giro < 0, handbrake: false,
      });
      return;
    }

    // LA PATRULLA YA NO VA A CIEGAS.
    //
    // Antes apuntaba EN LINEA RECTA al jugador sin mirar lo que tenia
    // delante: con un edificio en medio se quedaba empujando la pared hasta
    // que te ibas, y eso es lo que Pablo veia. El trafico si miraba; la
    // policia no. Ahora, con muro delante, busca por donde rodear.
    if (paredDelante(v, this.map)) goal = this.rodear(v, goal);

    // Y si aun asi se queda clavado (esquina mala, dos patrullas trabadas),
    // da marcha atras un momento, igual que el trafico.
    const persiguiendo = u.state === ESTADO.PERSIGUIENDO
      || u.state === ESTADO.INVESTIGANDO || u.state === ESTADO.BUSCANDO;
    if (persiguiendo && v.speed < 24) {
      u.atasco = (u.atasco || 0) + dt;
      if (u.atasco > 1.6) {
        u.maniobra = 0.9;
        u.giro = Math.random() < 0.5 ? 1 : -1;
        u.atasco = 0;
        return;
      }
    } else {
      u.atasco = Math.max(0, (u.atasco || 0) - dt * 0.6);
    }

    // persiguiendo no frena por el coche de delante: embiste
    const blocked =
      u.state === ESTADO.PERSIGUIENDO ? false : forwardBlocked(v, this.scene.vehicles);

    v.update(dt, steerTo(v, goal.x, goal.y, limit, blocked));
  }

  // Por donde rodear un edificio. Se gira el objetivo a un lado y al otro,
  // cada vez mas abierto, y se coge el primer rumbo que tenga el camino
  // despejado. Si ninguno lo esta, se deja el objetivo original: mejor
  // empujar la pared que quedarse quieto para siempre.
  rodear(v, goal) {
    const base = Math.atan2(goal.y - v.y, goal.x - v.x);
    const dist = Math.min(240, Phaser.Math.Distance.Between(v.x, v.y, goal.x, goal.y));
    if (dist < 40) return goal;

    for (const giro of [0.55, -0.55, 0.95, -0.95, 1.5, -1.5, 2.2, -2.2]) {
      const a = base + giro;
      let libre = true;
      for (let d = 30; d <= dist; d += 30) {
        if (this.map.isSolidPoint(v.x + Math.cos(a) * d, v.y + Math.sin(a) * d)) {
          libre = false;
          break;
        }
      }
      if (libre) return { x: v.x + Math.cos(a) * dist, y: v.y + Math.sin(a) * dist };
    }
    return goal;
  }

  // ---------- detencion ----------

  // No se detiene al instante: hay que tenerte encima un rato, y avisa antes.
  // Antes te arrestaban en el fotograma en que bajabas del coche.
  checkArrest(player, playerVehicle, dt) {
    if (GameState.wanted === 0 || playerVehicle || this.bustCooldown > 0) {
      this.cerco = 0;
      this.avisado = false;
      return;
    }

    let encima = false;
    for (const u of this.units) {
      // el agente a pie detiene mas de cerca que el coche
      if (u.officers.length > 0) {
        const alguno = u.officers.some(
          (o) => !o.down && Phaser.Math.Distance.Between(o.x, o.y, player.x, player.y) < 34
        );
        if (alguno) {
          encima = true;
          break;
        }
        continue;
      }
      if (u.state !== ESTADO.PERSIGUIENDO) continue;
      const v = u.vehicle;
      if (v.speed > 90) continue;
      if (Phaser.Math.Distance.Between(v.x, v.y, player.x, player.y) < DETENCION_DIST) {
        encima = true;
        break;
      }
    }

    if (!encima) {
      this.cerco = 0;
      this.avisado = false;
      return;
    }

    if (!this.avisado) {
      this.avisado = true;
      EventBus.emit(EVT.NOTIFY, { text: '¡Alto! Te tienen rodeado, corre', tone: 'danger' });
    }

    this.cerco = (this.cerco || 0) + dt;
    if (this.cerco >= TIEMPO_PARA_DETENER) {
      this.cerco = 0;
      this.avisado = false;
      this.bustCooldown = 8;
      EventBus.emit(EVT.PLAYER_BUSTED, {});
    }
  }

  // ---------- altas y bajas ----------

  wantedUnits() {
    return nivel().coches;
  }

  cull(player) {
    const max = this.wantedUnits();
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const lejos =
        Phaser.Math.Distance.Between(u.vehicle.x, u.vehicle.y, player.x, player.y) > DESPAWN;
      // el furgon se va cuando baja la busca, pero no mientras sus hombres
      // sigan fuera: desaparecerles el coche debajo queda fatal
      const sinGenteFuera = u.officers.every((o) => o.down);
      const caducado =
        (u.roadblock && (u.timer <= 0 || GameState.wanted < 3)) ||
        (u.furgon && GameState.wanted < 3 && sinGenteFuera);
      const sobra =
        !u.roadblock && !u.furgon &&
        this.units.filter((x) => !x.roadblock && !x.furgon).length > max &&
        u.state !== ESTADO.PERSIGUIENDO;

      // SI LE HAS ROBADO EL COCHE. No se puede destruir el vehiculo, que lo
      // conduces tu, y TAMPOCO se puede retirar la unidad de golpe: sus
      // agentes estan en la calle y alguien tiene que moverlos y dejar que el
      // combate los fije. Antes se retiraba entera y los destruia a los dos
      // en el fotograma siguiente, asi que robabas una patrulla y no salia
      // nadie. La unidad se queda, sin coche, hasta que no quede ninguno.
      if (u.vehicle.occupied) {
        if (!u.robada) this.robarPatrulla(u.vehicle);
        if (u.officers.every((o) => o.down)) this.retirarSinCoche(i);
        continue;
      }
      if (lejos || sobra || caducado) this.removeUnit(i);
    }
  }

  // (habia aqui un `soltarUnidad` que deshacia la unidad entera al robarle el
  //  coche. Destruia a los agentes que acababan de bajarse, asi que robar una
  //  patrulla no enseñaba a nadie. Lo hacen ahora `robarPatrulla` y
  //  `retirarSinCoche`, que dejan a los agentes en la calle.)

  removeUnit(i) {
    const u = this.units[i];
    const list = this.scene.vehicles;
    const at = list.indexOf(u.vehicle);
    if (at >= 0) list.splice(at, 1);
    for (const o of u.officers) o.destroy();
    u.siren.destroy();
    u.vehicle.destroy();
    this.units.splice(i, 1);
  }

  topUp(player) {
    let attempts = 0;
    const normales = () => this.units.filter((u) => !u.roadblock && !u.furgon).length;
    while (normales() < this.wantedUnits() && attempts < 50) {
      attempts++;
      const edge = this.net.randomEdge();
      const p = this.net.pointAlong(edge, 0.2 + Math.random() * 0.6);
      const dist = Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y);
      if (dist < SPAWN_MIN || dist > SPAWN_MAX) continue;
      if (this.map.isSolidBox(p.x, p.y, 34, 34)) continue;
      if (this.scene.vehicles.some((v) => Phaser.Math.Distance.Between(v.x, v.y, p.x, p.y) < 140)) {
        continue;
      }

      const vehicle = new Vehicle(this.scene, this.map, 'patrulla', p.x, p.y, edge.angle, {
        color: Math.random() < 0.75 ? 0 : 1,
      });
      vehicle.ai = true;
      vehicle.police = true;
      vehicle.encendido = true;
      this.scene.vehicles.push(vehicle);

      const siren = this.scene.add.image(p.x, p.y, 'siren').setVisible(false).setDepth(9999);

      this.units.push({
        vehicle,
        siren,
        sirenTimer: 0,
        state: GameState.wanted > 0 && this.lastKnown ? ESTADO.INVESTIGANDO : ESTADO.PATRULLA,
        lastSeen: GameState.wanted > 0 && this.lastKnown ? { ...this.lastKnown } : null,
        timer: 14,
        edge,
        officers: [],
        plazas: 2,          // en el coche caben dos, y solo dos
        flanco: this.units.length % 3,
      });
    }
  }

  updateSiren(u, dt) {
    // el coche robado ya no lleva sirena: es tuyo
    if (u.sinSirena) return;
    const activo =
      u.state === ESTADO.PERSIGUIENDO ||
      u.state === ESTADO.INVESTIGANDO ||
      u.state === ESTADO.BUSCANDO ||
      u.state === ESTADO.BLOQUEO;

    if (!activo) {
      u.siren.setVisible(false);
      return;
    }

    u.sirenTimer += dt;
    const azul = Math.floor(u.sirenTimer * 5) % 2 === 0;
    u.siren
      .setVisible(true)
      .setPosition(u.vehicle.x, u.vehicle.y)
      .setDepth(u.vehicle.y + 1)
      .setTint(azul ? 0x4a8fe8 : 0xe8524a)
      .setAlpha(0.75);
  }

  // cuanto se oye la sirena desde donde esta el jugador (0 = nada)
  nivelSirena(x, y) {
    let mejor = 0;
    for (const u of this.units) {
      if (!u.siren.visible) continue;
      const d = Phaser.Math.Distance.Between(u.vehicle.x, u.vehicle.y, x, y);
      mejor = Math.max(mejor, 1 - d / 950);
    }
    return Phaser.Math.Clamp(mejor, 0, 1);
  }

  clearAll() {
    for (let i = this.units.length - 1; i >= 0; i--) this.removeUnit(i);
    this.sinVer = 0;
    this.lastKnown = null;
  }
}
