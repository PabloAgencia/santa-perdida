import { Pedestrian } from '../entities/Pedestrian.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';
import { ZONE_OWNER } from '../config/factions.js';
import { Pathfinder } from '../world/Pathfinder.js';

const GANG_CHANCE = 0.38;
const HOSTILE_RANGE = 330;
const ATTACK_RANGE = 22;
const ATTACK_DAMAGE = 7;
const ESPERA_ENTRE_GOLPES = 0.62;   // entre TODOS los que te rodean

// Uno de cada cuatro de banda lleva pistola. Dispara peor que la policia y
// con menos alcance: la calle no es un cuerpo de seguridad.
const TIRO_BANDA = {
  alcance: 240,
  dano: 7,
  cadencia: 1.5,
  dispersion: 9,
  seQuedanA: 120,
};

const MAX_PEDS = 20;
const TOPE_DURO = 34;       // vivos + cuerpos, para no crecer sin fin
const SPAWN_MIN = 260;
const SPAWN_MAX = 900;
const DESPAWN = 1500;
const SKINS = 12;
const DOWN_LIFETIME = 22;

// de cada cuatro conductores a los que les robas el coche, uno se encara
const CONDUCTOR_BRAVO = 0.25;

export class NPCSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.people = [];
    this.pathfinder = new Pathfinder(map);
  }

  get vivos() {
    let n = 0;
    for (const p of this.people) if (!p.down) n++;
    return n;
  }

  update(dt, focusX, focusY, vehicles, player = null, onFoot = false, playerVehicle = null) {
    this.pathfinder.nuevoFotograma(3);
    this.cull(focusX, focusY);
    this.topUp(focusX, focusY);
    this.updateHostility(focusX, focusY, onFoot);

    for (const p of this.people) {
      p.update(dt, this.map.sidewalkSpots, vehicles);
    }

    this.checkVehicles(vehicles, playerVehicle);
    if (player && onFoot) this.checkAttacks(player, dt);
  }

  updateHostility(px, py, onFoot) {
    for (const p of this.people) {
      if (p.down) continue;

      // al que le has robado el coche te sigue teniendo ganas aunque no sea
      // de ninguna banda
      if (p.rencor) {
        const lejos = Phaser.Math.Distance.Between(p.x, p.y, px, py) > 420;
        p.hostile = onFoot && !lejos;
        p.chaseTarget = p.hostile ? { x: px, y: py } : null;
        if (lejos) p.rencor = false;
        continue;
      }

      if (!p.faction) continue;
      const enemigo = GameState.isHostile(p.faction);
      const cerca = Phaser.Math.Distance.Between(p.x, p.y, px, py) < HOSTILE_RANGE;
      p.hostile = enemigo && cerca && onFoot;
      // el que dispara se planta y no se te echa encima (lo marca checkAttacks)
      p.chaseTarget = p.hostile && !p.plantado ? { x: px, y: py } : null;
    }
  }

  checkAttacks(player, dt) {
    this.turnoGolpe = Math.max(0, (this.turnoGolpe || 0) - dt);
    for (const p of this.people) {
      if (!p.hostile || p.down) continue;

      // el que lleva hierro dispara de lejos; el resto tiene que llegar hasta ti
      if (p.armado) {
        p.recarga -= dt;
        const dist = Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y);
        const combat = this.scene.combat;
        if (dist < TIRO_BANDA.alcance && combat && combat.veA(p, player, TIRO_BANDA.alcance)) {
          if (p.recarga <= 0) {
            p.recarga = TIRO_BANDA.cadencia * (0.75 + Math.random() * 0.6);
            combat.disparoDeNPC(p, player, TIRO_BANDA.dano, TIRO_BANDA.alcance, TIRO_BANDA.dispersion);
          }
          // planta cara en vez de pegarse a ti
          p.plantado = dist < TIRO_BANDA.seQuedanA;
          if (p.plantado) p.chaseTarget = null;
          continue;
        }
      }

      p.plantado = false;
      if (p.attackCooldown > 0) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) > ATTACK_RANGE) continue;
      // Por muchos que te rodeen, solo entra un golpe cada poco: si pegan
      // los cuatro a la vez no hay pelea que ganar, y en los GTA de toda la
      // vida el corro espera su turno.
      if (this.turnoGolpe > 0) continue;
      this.turnoGolpe = ESPERA_ENTRE_GOLPES;
      p.attackCooldown = 1.35;
      GameState.damage(ATTACK_DAMAGE, 'paliza');
      EventBus.emit(EVT.NOTIFY, { text: 'Te estan dando', tone: 'danger' });
    }
  }

  cull(fx, fy) {
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      const far = Phaser.Math.Distance.Between(p.x, p.y, fx, fy) > DESPAWN;
      const gone = p.down && p.downTimer > (p.dead ? DOWN_LIFETIME * 3 : DOWN_LIFETIME);
      if (far || gone) {
        p.destroy();
        this.people.splice(i, 1);
      }
    }
  }

  topUp(fx, fy) {
    const spots = this.map.sidewalkSpots;
    if (spots.length === 0) return;

    const aquiZone = this.map.zoneAt(fx, fy);
    const aqui = aquiZone ? ZONE_OWNER[aquiZone] : null;

    let attempts = 0;
    // los cuerpos tirados NO ocupan sitio de gente viva: si no, tras unos
    // atropellos la calle se quedaba desierta
    while (this.vivos < MAX_PEDS && this.people.length < TOPE_DURO && attempts < 80) {
      attempts++;
      const s = spots[Math.floor(Math.random() * spots.length)];
      const d = Phaser.Math.Distance.Between(s.x, s.y, fx, fy);
      if (d < SPAWN_MIN || d > SPAWN_MAX) continue;
      if (this.people.some((p) => Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) < 40)) continue;

      const zone = this.map.zoneAt(s.x, s.y);
      const owner = zone ? ZONE_OWNER[zone] : null;

      // en cada barrio mandan los suyos: los puntos de otro territorio
      // se descartan casi siempre
      if (owner !== aqui && Math.random() < 0.7) continue;
      const faction = owner && Math.random() < GANG_CHANCE ? owner : null;
      const skin = Math.floor(Math.random() * SKINS);
      this.people.push(
        new Pedestrian(this.scene, this.map, s.x, s.y, skin, faction, this.pathfinder)
      );
    }
  }

  // ---------- conductores ----------

  // uno al volante de cada coche del trafico. No entra en la lista de gente:
  // si no, su propio coche le veria como un peaton al que atropellar.
  crearConductor(vehicle) {
    const skin = Math.floor(Math.random() * SKINS);
    const cond = new Pedestrian(this.scene, this.map, vehicle.x, vehicle.y, skin, null, this.pathfinder);
    cond.sentarEn(vehicle);
    return cond;
  }

  // le han robado el coche: se baja y, o sale corriendo, o se encara
  expulsarConductor(cond, vehicle, player) {
    if (!cond) return;
    cond.bajarDe(vehicle);
    this.people.push(cond);

    if (Math.random() < CONDUCTOR_BRAVO) {
      cond.rencor = true;
      cond.hostile = true;
      cond.chaseTarget = { x: player.x, y: player.y };
      EventBus.emit(EVT.NOTIFY, { text: 'El conductor se te encara', tone: 'danger' });
    } else {
      cond.flee(vehicle.x, vehicle.y, 6);
      EventBus.emit(EVT.NOTIFY, { text: 'El conductor sale corriendo', tone: 'dim' });
    }
  }

  checkVehicles(vehicles, playerVehicle = null) {
    for (const v of vehicles) {
      const speed = v.speed;
      if (speed < 45) continue;
      const circles = v.getCircles();

      for (const p of this.people) {
        if (p.down || p.enCoche) continue;
        const dist = Phaser.Math.Distance.Between(p.x, p.y, v.x, v.y);
        if (dist > v.stats.length) continue;

        let hit = false;
        for (const c of circles) {
          if (Math.hypot(p.x - c.x, p.y - c.y) < c.r + p.radius) {
            hit = true;
            break;
          }
        }

        if (hit && speed > 70) {
          const mortal = speed > 155;
          p.knockDown(mortal);
          // quien lo hizo importa: antes, un coche del trafico atropellaba a
          // alguien y el marron se lo comia el jugador
          EventBus.emit(EVT.PED_HIT, {
            pedestrian: p, vehicle: v, speed, fatal: mortal,
            culpaDelJugador: v === playerVehicle,
          });
          // el temerario ni frena ni mira: acelera y se va
          if (v.temerario && this.scene.traffic) this.scene.traffic.huirTrasAtropello(v);
        } else if (!hit) {
          p.flee(v.x, v.y, 2.2);
        }
      }
    }
  }

  scare(x, y, radius = 260) {
    for (const p of this.people) {
      if (Phaser.Math.Distance.Between(p.x, p.y, x, y) < radius) p.flee(x, y, 3);
    }
  }

  clear() {
    for (const p of this.people) p.destroy();
    this.people = [];
  }
}
