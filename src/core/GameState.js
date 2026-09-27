import { EventBus, EVT } from './EventBus.js';
import { ECONOMY, SAVE, BUSCA_MAXIMA } from '../config/balance.js';
import { FACTION_KEYS, REP } from '../config/factions.js';
import { ROPA, EFECTO_BANDA_PROPIA, EFECTO_BANDA_RIVAL } from '../config/aspecto.js';

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
    // LA ROPA (punto 23 del plan). 'calle' es gratis y siempre esta puesta
    // de salida. El armario esta en cualquier piso (HideoutScene), que no
    // tiene una referencia al Player de verdad (vive en CityScene, otra
    // escena): por eso vive aqui y no en Player.js, igual que el blindaje.
    this.ropa = 'calle';
    this.ropaComprada = {};
    // Sitios que ya has visto de cerca. El mapa solo enseña lo descubierto:
    // una ciudad de la que lo sabes todo desde el minuto uno no invita a
    // recorrerla.
    this.descubiertos = {};
    // TODO LO QUE SE COMPRA Y SE QUEDA EN EL MUNDO: pisos ahora, locales
    // despues. Va en un solo sitio y con una sola forma a proposito. Si los
    // pisos se guardasen aqui y los negocios en su sistema, acabariamos con
    // dos maneras distintas de "ser dueño de algo" y dos maneras de
    // guardarlo, que es justo como se pudren estos proyectos.
    //   clave -> { tipo, precio, nivel, plazas, garaje: [], compradaEl }
    this.propiedades = {};
    this.flags = {};
    // el reloj del mundo, en minutos desde medianoche (0-1439). Empieza a
    // media mañana, como si la partida arrancara un dia cualquiera.
    this.minutoDelDia = 9 * 60;
    // que dia de partida es: sube cada vez que el reloj pasa de medianoche
    // (tambien durmiendo). Lo usa el tope diario del gimnasio.
    this.dia = 1;
    // segundos reales que quedan para poder vender OTRO coche (grua o
    // desguace, es la misma cosa: "cambiar un coche por dinero" da igual por
    // cual de los dos se haga). Sin esto, encadenar entregas sin descansar
    // era la forma mas rapida de hacerse rico del juego con diferencia,
    // muy por delante del reparto (que es "el suelo economico" a proposito).
    // NO se guarda en la partida: es un enfriamiento de sesion, no un dato.
    this.cooldownVentaCoche = 0;
    // TALLER DE PINTURA: segundos que quedan para que la busca se borre sola
    // (parpadeando en el HUD mientras tanto). Tampoco se guarda: es cosa de
    // la sesion, y si se recarga la partida a medias, se acabo el beneficio.
    this.perdiendoBusca = 0;
  }

  // ---------- vender coches (grua y desguace) ----------

  puedeVenderCoche() {
    return this.cooldownVentaCoche <= 0;
  }

  marcarVentaCoche(segundos) {
    this.cooldownVentaCoche = segundos;
  }

  // dt en segundos reales; lo llama CityScene cada fotograma, igual que
  // hurtCooldown o jobCooldown
  avanzarCooldownVenta(dt) {
    if (this.cooldownVentaCoche > 0) {
      this.cooldownVentaCoche = Math.max(0, this.cooldownVentaCoche - dt);
    }
  }

  // ---------- el reloj ----------

  // lo llama DiaNocheSystem cada fotograma (minutos de mundo, no de reloj de
  // pared) y HideoutScene de un salto al dormir (360 = seis horas)
  avanzarReloj(minutos) {
    const total = this.minutoDelDia + minutos;
    if (total >= 1440) this.dia += Math.floor(total / 1440);
    this.minutoDelDia = ((total % 1440) + 1440) % 1440;
  }

  // ---------- el gimnasio y su tope diario ----------
  //
  // Lo que se ha ganado HOY en el gimnasio, por atributo. Al cambiar de dia
  // se empieza de cero. Como en San Andreas: pasado el tope, "por hoy ya has
  // entrenado bastante".
  gimnasioHoy() {
    const g = this.flags.gimnasio;
    if (!g || g.dia !== this.dia) {
      this.flags.gimnasio = { dia: this.dia, musculo: 0, aguante: 0, grasa: 0, punteria: 0 };
    }
    return this.flags.gimnasio;
  }

  // Sube (o baja, la grasa) un atributo sin pasar del tope del dia.
  // Devuelve lo que se ha aplicado de verdad (0 si ya estaba el tope).
  entrenar(clave, cantidad, tope) {
    const hoy = this.gimnasioHoy();
    const queda = Math.max(0, tope - hoy[clave]);
    const aplica = Math.min(Math.abs(cantidad), queda);
    if (aplica <= 0) return 0;
    // lo que cambia DE VERDAD: con la grasa ya a 0 o el musculo a 100 no se
    // gasta tope ni se anuncia nada
    const antes = this.atributo(clave);
    this.subirAtributo(clave, Math.sign(cantidad) * aplica);
    const real = Math.abs(this.atributo(clave) - antes);
    hoy[clave] += real;
    return real;
  }

  // la hora en punto, de 0 a 24 con decimales (14.5 = las dos y media)
  get horaDelDia() {
    return this.minutoDelDia / 60;
  }

  // ---------- sitios ----------

  descubrir(clave) {
    if (this.descubiertos[clave]) return false;
    this.descubiertos[clave] = true;
    return true;
  }

  conoce(clave) {
    return !!this.descubiertos[clave];
  }

  // ---------- propiedades ----------

  esDueno(clave) {
    return clave in this.propiedades;
  }

  propiedad(clave) {
    return this.propiedades[clave] ?? null;
  }

  // todas las de un tipo, con su clave dentro para no tener que ir por pares
  propiedadesDe(tipo) {
    return Object.entries(this.propiedades)
      .filter(([, p]) => p.tipo === tipo)
      .map(([clave, p]) => ({ clave, ...p }));
  }

  // Compra. Devuelve false si ya era tuya o si no llega el dinero; el aviso
  // de "no te llega" lo lanza spendMoney, asi que aqui no hay que repetirlo.
  comprarPropiedad(clave, { tipo, precio, plazas = 0 }) {
    if (this.esDueno(clave)) return false;
    if (!this.spendMoney(precio, `propiedad:${clave}`)) return false;
    this.propiedades[clave] = {
      tipo, precio, plazas, nivel: 0, garaje: [], compradaEl: Date.now(),
    };
    EventBus.emit(EVT.PROPERTY_BOUGHT, { clave, tipo, precio });
    return true;
  }

  // ---------- el garaje de cada propiedad ----------

  plazasLibres(clave) {
    const p = this.propiedad(clave);
    if (!p) return 0;
    return Math.max(0, p.plazas - p.garaje.length);
  }

  // `coche` es un objeto plano con lo que haga falta para volver a montarlo
  // (tipo, color, vida...). Aqui no se mira que trae: el garaje guarda lo que
  // le den y quien lo saca sabe que hacer con ello.
  guardarCoche(clave, coche) {
    if (this.plazasLibres(clave) <= 0) return false;
    this.propiedades[clave].garaje.push(coche);
    EventBus.emit(EVT.GARAGE_STORED, { clave, coche });
    return true;
  }

  cochesEn(clave) {
    return this.propiedad(clave)?.garaje ?? [];
  }

  sacarCoche(clave, indice) {
    const p = this.propiedad(clave);
    if (!p || indice < 0 || indice >= p.garaje.length) return null;
    const [coche] = p.garaje.splice(indice, 1);
    EventBus.emit(EVT.GARAGE_TAKEN, { clave, coche });
    return coche;
  }

  // ---------- la caja de cada negocio ----------

  caja(clave) {
    return this.propiedad(clave)?.caja ?? 0;
  }

  acumularRenta(clave, cantidad, tope) {
    const p = this.propiedad(clave);
    if (!p) return 0;
    p.caja = Phaser.Math.Clamp((p.caja ?? 0) + cantidad, 0, tope);
    return p.caja;
  }

  cobrarRenta(clave) {
    const p = this.propiedad(clave);
    if (!p || !p.caja) return 0;
    const cobrado = Math.round(p.caja);
    p.caja = 0;
    if (cobrado > 0) this.addMoney(cobrado, `negocio:${clave}`);
    return cobrado;
  }

  // un ataque de banda que se sale con la suya: se lleva una fraccion de la
  // caja, no la cobra el jugador (no pasa por addMoney)
  robarCaja(clave, fraccion) {
    const p = this.propiedad(clave);
    if (!p || !p.caja) return 0;
    const robado = Math.round(p.caja * fraccion);
    p.caja = Math.max(0, p.caja - robado);
    return robado;
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

  // ---------- ropa ----------

  tieneRopa(clave) {
    return !!ROPA[clave] && (ROPA[clave].precio === 0 || !!this.ropaComprada[clave]);
  }

  // Se compra y se pone en el mismo paso: en el armario no tiene sentido
  // pagar por un traje y salir con el de calle puesto igualmente. Devuelve
  // un texto para el aviso (para acertar o para el "no te llega"), o null
  // si la clave no existe.
  comprarYPonerRopa(clave) {
    if (!ROPA[clave]) return null;
    const r = ROPA[clave];
    if (this.ropa === clave) return { texto: 'Ya la llevas puesta', tono: 'dim' };

    if (!this.tieneRopa(clave)) {
      if (!this.canAfford(r.precio)) {
        return { texto: `${r.nombre}: ${r.precio} €. No te llega`, tono: 'danger' };
      }
      this.spendMoney(r.precio, 'ropa');
      this.ropaComprada[clave] = true;
    }
    this.ponerRopa(clave);
    return { texto: `${r.nombre} puesta`, tono: 'money' };
  }

  // SOLO cambia lo que llevas puesto (no cobra ni comprueba el precio, para
  // eso esta comprarYPonerRopa): deshace el efecto de la ropa anterior y
  // aplica el de la nueva. "Efecto" es el atractivo Y el respeto de banda si
  // la lleva, y los dos son "mientras la llevas puesta", no un regalo de una
  // sola vez por haberla comprado — asi que se puede llamar directo, por
  // ejemplo al cargar una partida guardada.
  ponerRopa(clave) {
    if (!ROPA[clave] || clave === this.ropa) return false;
    this.aplicarEfectoRopa(this.ropa, -1);
    this.ropa = clave;
    this.aplicarEfectoRopa(this.ropa, 1);
    EventBus.emit(EVT.STATS_CHANGED, { ropa: clave });
    return true;
  }

  // signo +1 al ponerse la prenda, -1 al quitarsela (cambiar a otra)
  aplicarEfectoRopa(clave, signo) {
    const r = ROPA[clave];
    if (!r) return;
    if (r.atractivo) this.subirAtributo('atractivo', r.atractivo * signo);
    if (r.banda) {
      for (const key of FACTION_KEYS) {
        const delta = (key === r.banda ? EFECTO_BANDA_PROPIA : EFECTO_BANDA_RIVAL) * signo;
        this.changeFaction(key, delta);
      }
    }
  }

  // ---------- atributos ----------

  // el musculo da vida de mas: de 100 a 150 puntos, y la ambulancia suma
  // hasta 30 mas encima (ver nivelTrabajo)
  get vidaMaxima() {
    return Math.round(100 + (this.atributos.musculo / 100) * 50) + this.nivelTrabajo('ambulancia') * 6;
  }

  // ---------- trabajos secundarios: cada uno deja una mejora permanente ----------
  //
  // Reparto (JobSystem), taxista y ambulancia (TrabajoVehiculoSystem) y
  // justiciero (JusticieroSystem) suman aqui cada uno que completas. Cada 5
  // sube un nivel, hasta 5 (25 completados). QUE HACE CADA NIVEL, y donde
  // vive el efecto:
  //   reparto     mas tiempo para entregar         JobSystem.offerNew
  //   taxista     coches mas rapidos, siempre       Vehicle.update (input.atajos)
  //   ambulancia  mas vida maxima                   el getter de vidaMaxima
  //   justiciero  el chaleco aguanta mas (a lo San  el getter de blindajeMaximo,
  //               Andreas: nivel de Vigilante alto   unas lineas mas abajo
  //               = mas blindaje al equiparte)
  sumarTrabajo(tipo) {
    if (!this.flags.trabajos) this.flags.trabajos = {};
    this.flags.trabajos[tipo] = (this.flags.trabajos[tipo] || 0) + 1;
    const antes = this.nivelTrabajo(tipo, this.flags.trabajos[tipo] - 1);
    const ahora = this.nivelTrabajo(tipo);
    return { hechos: this.flags.trabajos[tipo], subioNivel: ahora > antes, nivel: ahora };
  }

  nivelTrabajo(tipo, hechosForzado = null) {
    const hechos = hechosForzado ?? (this.flags.trabajos?.[tipo] || 0);
    return Math.min(5, Math.floor(hechos / 5));
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

  // la mejora del justiciero, a lo San Andreas: el chaleco aguanta mas.
  // Base 100, +10 por nivel (hasta 150 en nivel 5).
  get blindajeMaximo() {
    return 100 + this.nivelTrabajo('justiciero') * 10;
  }

  darBlindaje(cantidad) {
    this.blindaje = Phaser.Math.Clamp(this.blindaje + cantidad, 0, this.blindajeMaximo);
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
    // SEIS ESTRELLAS, no tres. Lo que cambia en cada nivel (cuantas patrullas,
    // cuanto ven, si disparan, si cortan la calle, si sale el furgon y cuanto
    // cuesta despegarselos) esta en la tabla BUSCA de systems/PoliceSystem.js.
    const next = Phaser.Math.Clamp(Math.round(level), 0, BUSCA_MAXIMA);
    if (next === this.wanted) return this.wanted;
    // si estaba perdiendo la busca en el taller y ahora vuelve a SUBIR de
    // verdad (un delito nuevo), se acabo el beneficio: no se pierde gratis
    // encima de lo que acabas de hacer
    if (next > this.wanted && this.perdiendoBusca > 0) this.perdiendoBusca = 0;
    this.wanted = next;
    EventBus.emit(EVT.WANTED_CHANGED, { wanted: this.wanted });
    return this.wanted;
  }

  raiseWanted(by = 1) {
    return this.setWanted(this.wanted + by);
  }

  // Lo llama el taller de pintura al salir sin que te vean: la busca no se
  // borra en seco, tarda `segundos` (parpadeando en el HUD). Si en ese rato
  // cometes otro delito, `setWanted` de arriba corta esto solo.
  iniciarPerdidaBusca(segundos) {
    this.perdiendoBusca = segundos;
  }

  // dt en segundos reales; lo llama CityScene cada fotograma. Devuelve true
  // justo el fotograma en que termina de verdad (para el aviso y el sonido).
  avanzarPerdidaBusca(dt) {
    if (this.perdiendoBusca <= 0) return false;
    this.perdiendoBusca -= dt;
    if (this.perdiendoBusca <= 0) {
      this.perdiendoBusca = 0;
      this.setWanted(0);
      return true;
    }
    return false;
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
      ropa: this.ropa,
      ropaComprada: this.ropaComprada,
      descubiertos: this.descubiertos,
      propiedades: this.propiedades,
      flags: this.flags,
      minutoDelDia: this.minutoDelDia,
      dia: this.dia,
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
    // partidas de antes del armario: de calle, la de siempre, y sin nada
    // comprado todavia
    this.ropa = data.ropa ?? 'calle';
    this.ropaComprada = data.ropaComprada ?? {};
    this.descubiertos = data.descubiertos ?? {};
    // partidas de antes de que existieran las propiedades: sin nada comprado
    this.propiedades = data.propiedades ?? {};
    // y por si una partida vieja trae una propiedad a medio formar, que no
    // reviente el primero que llame a plazasLibres()
    for (const p of Object.values(this.propiedades)) {
      if (!Array.isArray(p.garaje)) p.garaje = [];
      if (typeof p.plazas !== 'number') p.plazas = 0;
    }
    this.flags = data.flags ?? {};
    // partidas de antes del reloj: arrancan a media mañana, como una nueva
    this.minutoDelDia = data.minutoDelDia ?? 9 * 60;
    this.dia = data.dia ?? 1;
    EventBus.emit(EVT.MONEY_CHANGED, { money: this.money, delta: 0, reason: 'load' });
    return true;
  }
}

export const GameState = new GameStateClass();
