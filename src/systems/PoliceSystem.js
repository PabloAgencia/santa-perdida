import { Vehicle } from '../entities/Vehicle.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { steerTo, forwardBlocked } from './driving.js';

export const ESTADO = {
  PATRULLA: 'patrulla',
  INVESTIGANDO: 'investigando',
  PERSIGUIENDO: 'persiguiendo',
  BUSCANDO: 'buscando',
  PERDIDO: 'perdido',
  VOLVIENDO: 'volviendo',
  BLOQUEO: 'bloqueo',
};

const UNIDADES_POR_BUSCA = [1, 2, 4, 6];
const VISION = 430;
const VISION_PERSIGUIENDO = 640;
const SPAWN_MIN = 700;
const SPAWN_MAX = 1500;
const DESPAWN = 2400;
const SIN_VER_PARA_BAJAR = 9;
const DETENCION_DIST = 52;
const TIEMPO_PARA_DETENER = 1.8;

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

    let algunoVe = false;
    for (const u of this.units) {
      const ve = this.canSee(u, player);
      if (ve) {
        algunoVe = true;
        this.lastKnown = { x: player.x, y: player.y };
      }
      this.runUnit(u, dt, player, ve);
      this.updateSiren(u, dt);
    }

    if (GameState.wanted > 0) {
      this.sinVer = algunoVe ? 0 : this.sinVer + dt;
      if (this.sinVer >= SIN_VER_PARA_BAJAR) {
        this.sinVer = 0;
        GameState.setWanted(GameState.wanted - 1);
      }
    } else {
      this.sinVer = 0;
      this.lastKnown = null;
    }

    this.roadblockTimer -= dt;
    if (GameState.wanted >= 3 && this.roadblockTimer <= 0) {
      this.roadblockTimer = 14;
      this.spawnRoadblock(player, playerVehicle);
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
      this.scene.vehicles.push(vehicle);

      const siren = this.scene.add.image(x, y, 'siren').setVisible(false).setDepth(9999);
      this.units.push({
        vehicle, siren, sirenTimer: 0,
        state: ESTADO.BLOQUEO,
        lastSeen: null, timer: 40, edge: null,
        roadblock: true,
      });
    }

    EventBus.emit(EVT.NOTIFY, { text: 'Control policial delante', tone: 'danger' });
  }

  // ---------- vista ----------

  canSee(unit, player) {
    if (GameState.wanted === 0) return false;
    const v = unit.vehicle;
    const range = unit.state === ESTADO.PERSIGUIENDO ? VISION_PERSIGUIENDO : VISION;
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

  runUnit(u, dt, player, ve) {
    const v = u.vehicle;
    u.timer -= dt;

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

    this.driveUnit(u, dt, player);
  }

  startChase(u, player) {
    if (u.state !== ESTADO.PERSIGUIENDO) {
      u.state = ESTADO.PERSIGUIENDO;
      EventBus.emit(EVT.NOTIFY, { text: '¡Te han visto!', tone: 'danger' });
    }
    u.lastSeen = { x: player.x, y: player.y };
    u.timer = 3;
  }

  driveUnit(u, dt, player) {
    const v = u.vehicle;
    let goal = null;
    let limit = v.stats.maxSpeed * 0.5;

    if (u.state === ESTADO.PERSIGUIENDO) {
      goal = u.lastSeen || { x: player.x, y: player.y };
      limit = v.stats.maxSpeed * 0.95;
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

    // persiguiendo no frena por el coche de delante: embiste
    const blocked =
      u.state === ESTADO.PERSIGUIENDO ? false : forwardBlocked(v, this.scene.vehicles);

    v.update(dt, steerTo(v, goal.x, goal.y, limit, blocked));
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
    return UNIDADES_POR_BUSCA[Phaser.Math.Clamp(GameState.wanted, 0, 3)];
  }

  cull(player) {
    const max = this.wantedUnits();
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const lejos =
        Phaser.Math.Distance.Between(u.vehicle.x, u.vehicle.y, player.x, player.y) > DESPAWN;
      const caducado = u.roadblock && (u.timer <= 0 || GameState.wanted < 3);
      const sobra =
        !u.roadblock &&
        this.units.filter((x) => !x.roadblock).length > max &&
        u.state !== ESTADO.PERSIGUIENDO;
      if (u.vehicle.occupied || lejos || sobra || caducado) this.removeUnit(i);
    }
  }

  removeUnit(i) {
    const u = this.units[i];
    const list = this.scene.vehicles;
    const at = list.indexOf(u.vehicle);
    if (at >= 0) list.splice(at, 1);
    u.siren.destroy();
    u.vehicle.destroy();
    this.units.splice(i, 1);
  }

  topUp(player) {
    let attempts = 0;
    while (this.units.length < this.wantedUnits() && attempts < 50) {
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
      });
    }
  }

  updateSiren(u, dt) {
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

  clearAll() {
    for (let i = this.units.length - 1; i >= 0; i--) this.removeUnit(i);
    this.sinVer = 0;
    this.lastKnown = null;
  }
}
