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
    // Lo que el personaje ES, no lo que ha hecho. Van de 0 a 100 y cada una
    // cambia algo que se nota al jugar: no hay numeros de adorno.
    this.atributos = {
      grasa: 25,      // comer sube, correr baja. Mucha: lento pero aguantas
      musculo: 20,    // pegar y el gimnasio. Mas daño y mas vida maxima
      aguante: 30,    // cuanto puedes correr seguido
      volante: 15,    // conduciendo. El coche agarra mejor
      punteria: 0,    // disparando (cuando existan las armas)
      atractivo: 20,  // ropa, fisico y el coche que llevas
    };
    // Lo que llevas encima. Los puños no se pierden nunca; el resto se
    // compra. `null` de municion = no gasta (armas de cerca).
    this.armas = { puno: null };
    this.armaActual = 'puno';
    // el chaleco se gasta antes que la vida, y no se recupera solo
    this.blindaje = 0;
    this.flags = {};
  }

  // ---------- armas ----------

  tieneArma(clave) {
    return clave in this.armas;
  }

  darArma(clave, municion = 0) {
    if (!(clave in this.armas)) this.armas[clave] = municion > 0 ? 0 : null;
    if (municion > 0) this.armas[clave] = (this.armas[clave] || 0) + municion;
    EventBus.emit(EVT.STATS_CHANGED, { arma: clave });
    return this.armas[clave];
  }

  municion(clave = this.armaActual) {
    return this.armas[clave] ?? null;
  }

  // ¿se puede disparar? las de cerca siempre; las de fuego, si quedan balas
  puedeDisparar(clave = this.armaActual) {
    if (!this.tieneArma(clave)) return false;
    const balas = this.armas[clave];
    return balas === null || balas > 0;
  }

  gastarBala(clave = this.armaActual, cuantas = 1) {
    if (this.armas[clave] === null || this.armas[clave] === undefined) return;
    this.armas[clave] = Math.max(0, this.armas[clave] - cuantas);
  }

  // pasa a la siguiente arma que se lleve encima
  cambiarArma(orden, paso = 1) {
    const llevo = orden.filter((c) => this.tieneArma(c));
    if (llevo.length <= 1) return this.armaActual;
    const i = llevo.indexOf(this.armaActual);
    this.armaActual = llevo[(i + paso + llevo.length) % llevo.length];
    return this.armaActual;
  }

  // ---------- atributos ----------

  // el musculo da vida de mas: de 100 a 150 puntos
  get vidaMaxima() {
    return Math.round(100 + (this.atributos.musculo / 100) * 50);
  }

  atributo(clave) {
    return this.atributos[clave] ?? 0;
  }

  // Devuelve true si ha cambiado de decena, que es cuando hay que rehacer el
  // dibujo del personaje. Regenerar texturas en cada fotograma seria absurdo.
  subirAtributo(clave, cantidad) {
    if (!(clave in this.atributos) || cantidad === 0) return false;
    const antes = this.atributos[clave];
    const ahora = Phaser.Math.Clamp(antes + cantidad, 0, 100);
    if (ahora === antes) return false;
    this.atributos[clave] = ahora;

    if (clave === 'musculo' && this.health > this.vidaMaxima) {
      this.health = this.vidaMaxima;
    }
    const saltoDeTramo = Math.floor(antes / 10) !== Math.floor(ahora / 10);
    if (saltoDeTramo) {
      EventBus.emit(EVT.STATS_CHANGED, { atributo: clave, valor: ahora });
    }
    return saltoDeTramo;
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

  darBlindaje(cantidad) {
    this.blindaje = Phaser.Math.Clamp(this.blindaje + cantidad, 0, 100);
    return this.blindaje;
  }

  // El chaleco come el golpe primero. Si el golpe es mayor que lo que queda
  // de chaleco, el resto entra en la carne: asi un chaleco a punto de romperse
  // no te salva de una escopeta.
  damage(amount, cause = '') {
    if (amount <= 0 || this.health <= 0) return this.health;

    if (this.blindaje > 0) {
      const parado = Math.min(this.blindaje, amount);
      this.blindaje -= parado;
      amount -= parado;
      if (amount <= 0) {
        // el golpe se lo ha comido el chaleco: se avisa igual, pero se dice
        // cuanto ha parado para poder pintarlo distinto a una herida
        EventBus.emit(EVT.PLAYER_HURT, {
          health: this.health, amount: 0, blindajeParado: parado, cause,
        });
        return this.health;
      }
    }

    this.health = Math.max(0, this.health - amount);
    EventBus.emit(EVT.PLAYER_HURT, { health: this.health, amount, cause });
    if (this.health === 0) EventBus.emit(EVT.PLAYER_DEAD, { cause });
    return this.health;
  }

  // devuelve lo que se ha curado de verdad, para poder avisar de "ya estas entero"
  heal(amount) {
    const antes = this.health;
    this.health = Math.min(this.vidaMaxima, this.health + amount);
    EventBus.emit(EVT.PLAYER_HURT, { health: this.health, amount: 0, cause: 'cura' });
    return Math.round(this.health - antes);
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
      atributos: this.atributos,
      armas: this.armas,
      armaActual: this.armaActual,
      blindaje: this.blindaje,
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
    // partidas viejas no traen atributos: se quedan con los de inicio
    this.atributos = Object.assign(this.atributos, data.atributos ?? {});
    this.armas = data.armas ?? { puno: null };
    this.armaActual = data.armaActual ?? 'puno';
    this.blindaje = data.blindaje ?? 0;
    this.flags = data.flags ?? {};
    EventBus.emit(EVT.MONEY_CHANGED, { money: this.money, delta: 0, reason: 'load' });
    return true;
  }
}

export const GameState = new GameStateClass();
