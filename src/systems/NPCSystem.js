import { Pedestrian } from '../entities/Pedestrian.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';
import { ZONE_OWNER } from '../config/factions.js';

const GANG_CHANCE = 0.38;
const HOSTILE_RANGE = 330;
const ATTACK_RANGE = 22;
const ATTACK_DAMAGE = 9;

const MAX_PEDS = 20;
const SPAWN_MIN = 260;
const SPAWN_MAX = 900;
const DESPAWN = 1500;
const SKINS = 4;
const DOWN_LIFETIME = 22;

export class NPCSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.people = [];
  }

  update(dt, focusX, focusY, vehicles, player = null, onFoot = false) {
    this.cull(focusX, focusY);
    this.topUp(focusX, focusY);
    this.updateHostility(focusX, focusY, onFoot);

    for (const p of this.people) {
      p.update(dt, this.map.sidewalkSpots);
    }

    this.checkVehicles(vehicles);
    if (player && onFoot) this.checkAttacks(player);
  }

  updateHostility(px, py, onFoot) {
    for (const p of this.people) {
      if (!p.faction || p.down) continue;
      const enemigo = GameState.isHostile(p.faction);
      const cerca = Phaser.Math.Distance.Between(p.x, p.y, px, py) < HOSTILE_RANGE;
      p.hostile = enemigo && cerca && onFoot;
      p.chaseTarget = p.hostile ? { x: px, y: py } : null;
    }
  }

  checkAttacks(player) {
    for (const p of this.people) {
      if (!p.hostile || p.down || p.attackCooldown > 0) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) > ATTACK_RANGE) continue;
      p.attackCooldown = 1.2;
      GameState.damage(ATTACK_DAMAGE, 'paliza');
      EventBus.emit(EVT.NOTIFY, { text: 'Te estan dando', tone: 'danger' });
    }
  }

  cull(fx, fy) {
    for (let i = this.people.length - 1; i >= 0; i--) {
      const p = this.people[i];
      const far = Phaser.Math.Distance.Between(p.x, p.y, fx, fy) > DESPAWN;
      const gone = p.down && p.downTimer > DOWN_LIFETIME;
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
    while (this.people.length < MAX_PEDS && attempts < 80) {
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
      this.people.push(new Pedestrian(this.scene, this.map, s.x, s.y, skin, faction));
    }
  }

  checkVehicles(vehicles) {
    for (const v of vehicles) {
      const speed = v.speed;
      if (speed < 45) continue;
      const circles = v.getCircles();

      for (const p of this.people) {
        if (p.down) continue;
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
          p.knockDown();
          EventBus.emit(EVT.PED_HIT, { pedestrian: p, vehicle: v, speed });
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
