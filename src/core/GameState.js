import { EventBus, EVT } from './EventBus.js';
import { ECONOMY, SAVE } from '../config/balance.js';
import { FACTION_KEYS, REP } from '../config/factions.js';

// FUENTE UNICA DE VERDAD. Ningun otro modulo guarda copias de estos datos
// ni los escribe directamente: todo pasa por los metodos de aqui.

class GameStateClass {
  constructor() {
    this.reset();
  }

  reset() {
    this.version = SAVE.version;
    this.money = ECONOMY.startingMoney;
    this.reputation = 0;
    this.health = 100;
    this.wanted = 0;
    this.factions = {};
    for (const k of FACTION_KEYS) this.factions[k] = 0;
    this.player = { x: 0, y: 0, angle: 0 };
    this.inVehicleId = null;
    this.vehicles = [];
    this.job = null;
    this.stats = {
      deliveries: 0,
      crashes: 0,
      metersDriven: 0,
      earned: 0,
      spent: 0,
    };
    this.flags = {};
  }

  addMoney(amount, reason = '') {
    const value = Math.round(amount);
    if (value <= 0) return 0;
    this.money += value;
    this.stats.earned += value;
    EventBus.emit(EVT.MONEY_CHANGED, { money: this.money, delta: value, reason });
    return value;
  }

  spendMoney(amount, reason = '') {
    const value = Math.round(amount);
    if (value <= 0) return true;
    if (this.money < value) {
      EventBus.emit(EVT.MONEY_REJECTED, { money: this.money, needed: value, reason });
      return false;
    }
    this.money -= value;
    this.stats.spent += value;
    EventBus.emit(EVT.MONEY_CHANGED, { money: this.money, delta: -value, reason });
    return true;
  }

  canAfford(amount) {
    return this.money >= Math.round(amount);
  }

  damage(amount, cause = '') {
    if (amount <= 0 || this.health <= 0) return this.health;
    this.health = Math.max(0, this.health - amount);
    EventBus.emit(EVT.PLAYER_HURT, { health: this.health, amount, cause });
    if (this.health === 0) EventBus.emit(EVT.PLAYER_DEAD, { cause });
    return this.health;
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
    EventBus.emit(EVT.PLAYER_HURT, { health: this.health, amount: 0, cause: 'cura' });
  }

  setWanted(level) {
    const next = Phaser.Math.Clamp(Math.round(level), 0, 3);
    if (next === this.wanted) return this.wanted;
    this.wanted = next;
    EventBus.emit(EVT.WANTED_CHANGED, { wanted: this.wanted });
    return this.wanted;
  }

  raiseWanted(by = 1) {
    return this.setWanted(this.wanted + by);
  }

  changeFaction(key, delta) {
    if (!(key in this.factions)) return 0;
    const before = this.factions[key];
    this.factions[key] = Phaser.Math.Clamp(before + delta, REP.min, REP.max);
    if (this.factions[key] !== before) {
      EventBus.emit(EVT.FACTION_CHANGED, {
        faction: key,
        value: this.factions[key],
        delta: this.factions[key] - before,
      });
    }
    return this.factions[key];
  }

  factionRep(key) {
    return this.factions[key] ?? 0;
  }

  isHostile(key) {
    return this.factionRep(key) <= REP.hostileBelow;
  }

  addReputation(amount) {
    this.reputation = Math.max(0, this.reputation + amount);
    EventBus.emit(EVT.STATS_CHANGED, { reputation: this.reputation });
  }

  bumpStat(key, amount = 1) {
    if (!(key in this.stats)) this.stats[key] = 0;
    this.stats[key] += amount;
  }

  setJob(job) {
    this.job = job;
  }

  clearJob() {
    this.job = null;
  }

  serialize() {
    return {
      version: this.version,
      money: this.money,
      reputation: this.reputation,
      health: this.health,
      factions: this.factions,
      player: this.player,
      inVehicleId: this.inVehicleId,
      vehicles: this.vehicles,
      job: this.job,
      stats: this.stats,
      flags: this.flags,
      savedAt: Date.now(),
    };
  }

  load(data) {
    if (!data || data.version !== SAVE.version) return false;
    this.money = data.money ?? ECONOMY.startingMoney;
    this.reputation = data.reputation ?? 0;
    this.health = data.health ?? 100;
    this.wanted = 0;
    this.factions = Object.assign(this.factions, data.factions ?? {});
    this.player = data.player ?? { x: 0, y: 0, angle: 0 };
    this.inVehicleId = data.inVehicleId ?? null;
    this.vehicles = data.vehicles ?? [];
    this.job = data.job ?? null;
    this.stats = Object.assign(this.stats, data.stats ?? {});
    this.flags = data.flags ?? {};
    EventBus.emit(EVT.MONEY_CHANGED, { money: this.money, delta: 0, reason: 'load' });
    return true;
  }
}

export const GameState = new GameStateClass();
