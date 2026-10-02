import { VEHICLE_KEYS, VEHICLES } from '../config/vehicles.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { etiquetaFlotante } from '../world/etiquetas.js';
import { Vehicle } from '../entities/Vehicle.js';
import { steerTo, forwardBlocked } from './driving.js';

// CARRERAS CONTRARRELOJ. Punto 17 (lo que quedaba de "TRABAJOS") y punto 16
// ("desafios cronometrados con medalla"): son la misma cosa, asi que van
// juntas. Nada de pasajero ni de fugitivo, solo llegar rapido de un sitio a
// otro por una ruta de casillas reales, marcada con la propia red de calles
// (RoadNetwork) que ya usa el trafico: no hay que inventar ni un circuito a
// mano, se generan solos siguiendo cruces de verdad.

const N_CARRERAS = 4;
// C6: CARRERAS LARGAS. Antes eran 6 tramos casi rectos ("5 puntos en recto y
// luego hacia arriba"). Ahora son entre 22 y 28 tramos que giran siempre que
// pueden, sin repetir cruce, y cada carrera sale siempre igual (se siembra
// con su cruce de salida, para que la medalla de una sea comparable).
const TRAMOS_MIN = 22;
const TRAMOS_MAX = 28;
const SEGUNDOS_POR_GIRO = 1.1;     // lo que cuesta cada curva sobre la media
const RIVALES = 3;
const TIPOS_RIVAL = ['chinchorro', 'velagt', 'taxi', 'bastion', 'centella'];
const SEPARACION = 2000;
const ALCANCE = 90;
const CHECKPOINT_ALCANCE = 50;

// El ritmo "normal" del trafico de este juego ya es 0,95 de la velocidad
// maxima del coche (TrafficSystem.car.limit): las medallas se miden contra
// una FRACCION de esa referencia, no contra un numero inventado. Girar en
// cada cruce baja mucho la media real, por eso las fracciones son bajas.
// MEDIDO, no estimado: se simulo un coche conduciendo solo (steerTo, la
// misma IA que usa el trafico) por rutas reales generadas con este mismo
// sistema. Con las rectas largas que favorece nextEdge(), un coche
// cualquiera hace de media el 85% de su propia velocidad maxima. Los tres
// cortes salen de ahi: cualquier coche saca bronce sin esfuerzo, uno normal
// saca plata conduciendo como el trafico, y el oro pide o un coche rapido o
// cortar mejor las curvas que la IA (que frena mucho antes de cada una).
const VEL_MEDIA = (VEHICLE_KEYS.reduce((s, k) => s + VEHICLES[k].maxSpeed, 0) / VEHICLE_KEYS.length) * 0.95;
const RITMO_ORO = 1.15;
const RITMO_PLATA = 0.75;
const RITMO_BRONCE = 0.55;

const PREMIO = { oro: 900, plata: 450, bronce: 220, ninguna: 90 };
const PREMIO_PUESTO = { 1: 300, 2: 140, 3: 60, 4: 0 };

// generador con semilla: la misma carrera sale igual en cada partida
function semilla(n) {
  let a = (Math.round(n.x) * 73856093) ^ (Math.round(n.y) * 19349663);
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class CarreraSystem {
  constructor(scene, map, net) {
    this.scene = scene;
    this.map = map;
    this.net = net;
    this.carreras = [];
    this.activa = null;
    this.cerca = null;
    this.aro = scene.add.image(0, 0, 'ring').setVisible(false).setDepth(5).setTint(0xe8b54a);
    scene.tweens.add({
      targets: this.aro, scale: { from: 0.85, to: 1.15 },
      duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.flecha = scene.add.image(0, 0, 'arrow').setVisible(false).setDepth(7)
      .setTint(0xf2d06b).setAlpha(0.9).setDisplaySize(30, 26);
    this.generar();
  }

  generar() {
    const nodos = Phaser.Utils.Array.Shuffle(this.net.nodes.slice());
    for (const n of nodos) {
      if (this.carreras.length >= N_CARRERAS) break;
      if (this.carreras.some((c) => Phaser.Math.Distance.Between(c.x, c.y, n.x, n.y) < SEPARACION)) continue;

      const ruta = this.generarRuta(n);
      if (!ruta) continue;
      const { puntos, edges, distancia, giros } = ruta;

      const id = `carrera-${Math.round(n.x)}-${Math.round(n.y)}`;
      const extra = giros * SEGUNDOS_POR_GIRO;
      const tOro = distancia / (VEL_MEDIA * RITMO_ORO) + extra;
      const tPlata = distancia / (VEL_MEDIA * RITMO_PLATA) + extra * 1.3;
      const tBronce = distancia / (VEL_MEDIA * RITMO_BRONCE) + extra * 1.7;
      this.carreras.push({ id, x: n.x, y: n.y, puntos, edges, distancia, giros, tOro, tPlata, tBronce });
      this.pintar(n);
    }
  }

  // Sigue la red de calles desde el cruce de salida, un tramo tras otro, con
  // preferencia por GIRAR y sin pasar dos veces por el mismo cruce. Si se
  // queda sin salida antes de TRAMOS_MIN, se prueba otra salida.
  generarRuta(nodoInicial) {
    const rnd = semilla(nodoInicial);
    for (let intento = 0; intento < 12; intento++) {
      const salidas = nodoInicial.out;
      if (!salidas || salidas.length === 0) return null;
      let edge = this.net.edges[salidas[Math.floor(rnd() * salidas.length)]];
      const objetivo = TRAMOS_MIN + Math.floor(rnd() * (TRAMOS_MAX - TRAMOS_MIN + 1));
      const visitados = new Set([edge.from]);
      const edges = [];
      const puntos = [];
      let distancia = 0;
      let giros = 0;

      while (edges.length < objetivo) {
        edges.push(edge);
        puntos.push(this.net.exitPoint(edge));
        distancia += edge.length;
        visitados.add(edge.to);

        const salidasNodo = this.net.nodes[edge.to].out
          .map((id) => this.net.edges[id])
          .filter((e) => e.to !== edge.from && !visitados.has(e.to));
        if (salidasNodo.length === 0) break;

        const pesos = salidasNodo.map((e) => {
          const recto = e.dx * edge.dx + e.dy * edge.dy;
          return recto > 0.7 ? 1 : 5;
        });
        const total = pesos.reduce((x, y) => x + y, 0);
        let dado = rnd() * total;
        let elegida = salidasNodo[salidasNodo.length - 1];
        for (let k = 0; k < salidasNodo.length; k++) {
          dado -= pesos[k];
          if (dado <= 0) { elegida = salidasNodo[k]; break; }
        }
        if (elegida.dx * edge.dx + elegida.dy * edge.dy < 0.7) giros++;
        edge = elegida;
      }
      if (edges.length >= TRAMOS_MIN) return { puntos, edges, distancia, giros };
    }
    return null;
  }

  pintar(n) {
    const aro = this.scene.add.image(n.x, n.y, 'ring')
      .setDisplaySize(60, 60).setTint(0xe8b54a).setDepth(6);
    this.scene.tweens.add({
      targets: aro, scale: { from: 0.85, to: 1.1 },
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    etiquetaFlotante(this.scene, n.x, n.y - 34, 'CARRERA', 0xe8b54a);
  }

  update(dt, player, drivingVehicle) {
    if (this.activa) {
      if (!drivingVehicle) { this.abortar(); return; }
      this.activa.tiempo += dt;
      this.moverRivales(dt);
      const punto = this.activa.puntos[this.activa.checkpoint];
      if (Phaser.Math.Distance.Between(player.x, player.y, punto.x, punto.y) < CHECKPOINT_ALCANCE) {
        this.activa.checkpoint++;
        if (this.activa.checkpoint >= this.activa.puntos.length) {
          this.completar();
        } else {
          this.colocarMarcas();
          EventBus.emit(EVT.NOTIFY, {
            text: `Punto de control ${this.activa.checkpoint}/${this.activa.puntos.length}`, tone: 'objective',
          });
        }
      }
      return;
    }

    this.cerca = null;
    if (!drivingVehicle) return;
    for (const c of this.carreras) {
      if (Phaser.Math.Distance.Between(c.x, c.y, player.x, player.y) < ALCANCE) {
        this.cerca = c;
        return;
      }
    }
  }

  // El aro en el punto de control que toca y, encima, una flecha que apunta
  // al SIGUIENTE, como las de San Andreas: asi se sabe hacia donde girar
  // antes de llegar. En el ultimo no hay flecha, es la meta.
  colocarMarcas() {
    const a = this.activa;
    const p = a.puntos[a.checkpoint];
    this.aro.setPosition(p.x, p.y).setVisible(true);
    const sig = a.puntos[a.checkpoint + 1];
    if (!sig) { this.flecha.setVisible(false); return; }
    const ang = Math.atan2(sig.y - p.y, sig.x - p.x);
    this.flecha.setPosition(p.x, p.y).setRotation(ang + Math.PI / 2).setVisible(true);
  }

  // el de despues del que toca, para el radar (null si el que toca es la meta)
  siguientePunto() {
    if (!this.activa) return null;
    return this.activa.puntos[this.activa.checkpoint + 1] || null;
  }

  // C6: AL ENTRAR EN UNA CARRERA, FADE A NEGRO. Mientras la pantalla esta
  // negra se coloca la parrilla: el jugador y tres rivales, cada uno en su
  // hueco, mirando por donde sale la ruta.
  empezar(carrera) {
    if (this.preparando) return;
    this.preparando = true;
    const cam = this.scene.cameras.main;
    cam.fadeOut(380, 0, 0, 0);
    this.scene.time.delayedCall(420, () => {
      this.activa = {
        def: carrera, checkpoint: 0, tiempo: 0, puntos: carrera.puntos,
        rivales: [], puesto: 1,
      };
      this.colocarParrilla(carrera);
      this.colocarMarcas();
      cam.fadeIn(420, 0, 0, 0);
      this.preparando = false;
      EventBus.emit(EVT.BIG_MESSAGE, {
        title: 'CARRERA',
        subtitle: `${carrera.puntos.length} puntos de control · tres rivales`,
        color: '#e8b54a',
      });
    });
  }

  colocarParrilla(carrera) {
    const e0 = carrera.edges[0];
    const a = this.net.entryPoint(e0);
    const ang = e0.angle;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    // delante-izquierda, delante-derecha, atras-izquierda, atras-derecha
    const huecos = [
      { along: 90, lat: -30 }, { along: 90, lat: 30 },
      { along: 30, lat: -30 }, { along: 30, lat: 30 },
    ];
    const pos = (h) => ({
      x: a.x + cos * h.along - sin * h.lat,
      y: a.y + sin * h.along + cos * h.lat,
    });

    // el jugador sale en el primer hueco, con su propio coche
    const mio = this.scene.drivingVehicle;
    const hMio = pos(huecos[0]);
    if (mio) {
      mio.x = hMio.x;
      mio.y = hMio.y;
      mio.angle = ang;
      mio.vx = 0;
      mio.vy = 0;
      mio.syncSprite();
      this.scene.player.setPosition(mio.x, mio.y);
    }

    const tipos = Phaser.Utils.Array.Shuffle(TIPOS_RIVAL.slice());
    for (let i = 0; i < RIVALES; i++) {
      const h = pos(huecos[i + 1]);
      const tipo = tipos[i % tipos.length];
      const color = Math.floor(Math.random() * VEHICLES[tipo].palette.length);
      const v = new Vehicle(this.scene, this.map, tipo, h.x, h.y, ang, { color });
      v.ai = true;
      v.encendido = true;
      v.deCarrera = true;
      this.scene.vehicles.push(v);
      this.activa.rivales.push({
        v, idx: 0, fin: false, tiempoFin: 0, parado: 0,
        // cada rival lleva su ritmo: ninguno es imbatible, pero tampoco regalan
        limite: v.stats.maxSpeed * (0.66 + Math.random() * 0.2),
      });
    }
  }

  // Los rivales siguen la ruta con el mismo punto de mira que el trafico
  // (TrafficSystem.puntoDelCarril): trazan las curvas en vez de ir a saltos.
  moverRivales(dt) {
    const a = this.activa;
    const trafico = this.scene.traffic;
    if (!a || !trafico) return;
    const edges = a.def.edges;
    for (const r of a.rivales) {
      const v = r.v;
      if (r.fin) {
        // ya ha llegado: sigue rodando despacio sin molestar
        v.update(dt, { throttle: false, brake: v.speed > 30, left: false, right: false, handbrake: false });
        continue;
      }
      const car = { edge: edges[r.idx], siguiente: edges[r.idx + 1] || null };
      const prog = this.net.progreso(car.edge, v.x, v.y);
      const meta = this.net.exitPoint(car.edge);
      const llegado = prog.t >= 1
        || Phaser.Math.Distance.Between(v.x, v.y, meta.x, meta.y) < 52;
      if (llegado) {
        r.idx++;
        if (r.idx >= edges.length) {
          r.fin = true;
          r.tiempoFin = a.tiempo;
        }
        continue;
      }

      const goal = trafico.puntoDelCarril(car, v);
      const bloqueado = forwardBlocked(v, this.scene.vehicles);
      // clavado: se le recoloca un poco mas adelante en su tramo
      r.parado = v.speed < 22 ? r.parado + dt : 0;
      if (r.parado > 2.2) {
        const t = Phaser.Math.Clamp(prog.t + 0.08, 0, 0.95);
        const p = this.net.pointAlong(car.edge, t);
        v.x = p.x;
        v.y = p.y;
        v.angle = car.edge.angle;
        v.vx = Math.cos(v.angle) * 40;
        v.vy = Math.sin(v.angle) * 40;
        r.parado = 0;
      }
      v.update(dt, steerTo(v, goal.x, goal.y, r.limite, bloqueado && v.speed > 40));
    }
    a.puesto = this.puestoActual();
  }

  // puesto en directo: cuantos le llevan ventaja a quien va conduciendo
  puestoActual() {
    const a = this.activa;
    if (!a) return 1;
    const edges = a.def.edges;
    const yo = a.checkpoint + (() => {
      const p = a.puntos[Math.min(a.checkpoint, a.puntos.length - 1)];
      const ant = a.puntos[a.checkpoint - 1] || this.net.entryPoint(edges[0]);
      const tot = Phaser.Math.Distance.Between(ant.x, ant.y, p.x, p.y) || 1;
      const falta = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, p.x, p.y);
      return Phaser.Math.Clamp(1 - falta / tot, 0, 1);
    })();
    let delante = 0;
    for (const r of a.rivales) {
      let m = 99;
      if (!r.fin) {
        const prog = this.net.progreso(edges[r.idx], r.v.x, r.v.y);
        m = r.idx + Phaser.Math.Clamp(prog.t, 0, 1);
      }
      if (m > yo) delante++;
    }
    return delante + 1;
  }

  quitarRivales(rivales) {
    const lista = this.scene.vehicles;
    for (const r of rivales) {
      const at = lista.indexOf(r.v);
      if (at >= 0) lista.splice(at, 1);
      r.v.destroy();
    }
  }

  completar() {
    const { def, tiempo } = this.activa;
    const puesto = this.puestoActual();
    const medalla = tiempo <= def.tOro ? 'oro' : tiempo <= def.tPlata ? 'plata' : tiempo <= def.tBronce ? 'bronce' : 'ninguna';
    const pago = PREMIO[medalla] + (PREMIO_PUESTO[puesto] || 0);

    if (!GameState.flags.carreras) GameState.flags.carreras = {};
    const mejorAntes = GameState.flags.carreras[def.id];
    const ORDEN = { ninguna: 0, bronce: 1, plata: 2, oro: 3 };
    if (!mejorAntes || ORDEN[medalla] > ORDEN[mejorAntes.medalla] ||
        (medalla === mejorAntes.medalla && tiempo < mejorAntes.tiempo)) {
      GameState.flags.carreras[def.id] = { medalla, tiempo };
    }

    GameState.addMoney(pago, 'carrera');
    this.aro.setVisible(false);
    this.flecha.setVisible(false);
    // los rivales siguen rodando unos segundos y luego se retiran
    const rivales = this.activa.rivales;
    for (const r of rivales) r.fin = true;
    this.activa = null;
    this.scene.time.delayedCall(3000, () => this.quitarRivales(rivales));

    EventBus.emit(EVT.BIG_MESSAGE, {
      title: medalla === 'ninguna' ? 'SIN MEDALLA' : `MEDALLA DE ${medalla.toUpperCase()}`,
      subtitle: `${puesto}º puesto · ${tiempo.toFixed(1)} s · +${pago} €`,
      color: medalla === 'oro' ? '#e8b54a' : medalla === 'plata' ? '#c9c3b4' : medalla === 'bronce' ? '#c8965a' : '#8a8578',
    });
  }

  abortar() {
    if (!this.activa) return;
    this.quitarRivales(this.activa.rivales);
    this.aro.setVisible(false);
    this.flecha.setVisible(false);
    this.activa = null;
    EventBus.emit(EVT.NOTIFY, { text: 'Carrera abandonada', tone: 'dim' });
  }

  // ---------- para el HUD: mismo formato que MissionSystem.estado() ----------

  estado() {
    if (!this.activa) return null;
    return {
      nombre: 'Carrera',
      texto: `${this.activa.puesto}º de ${RIVALES + 1} · punto ${this.activa.checkpoint + 1}/${this.activa.puntos.length} · ${this.activa.tiempo.toFixed(1)} s`,
      restante: null,
      objetivo: this.activa.puntos[this.activa.checkpoint],
      pasoActual: this.activa.checkpoint + 1,
      pasos: this.activa.puntos.length,
    };
  }
}
