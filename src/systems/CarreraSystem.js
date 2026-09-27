import { VEHICLE_KEYS, VEHICLES } from '../config/vehicles.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { etiquetaFlotante } from '../world/etiquetas.js';

// CARRERAS CONTRARRELOJ. Punto 17 (lo que quedaba de "TRABAJOS") y punto 16
// ("desafios cronometrados con medalla"): son la misma cosa, asi que van
// juntas. Nada de pasajero ni de fugitivo, solo llegar rapido de un sitio a
// otro por una ruta de casillas reales, marcada con la propia red de calles
// (RoadNetwork) que ya usa el trafico: no hay que inventar ni un circuito a
// mano, se generan solos siguiendo cruces de verdad.

const N_CARRERAS = 4;
const CHECKPOINTS = 6;
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

const PREMIO = { oro: 600, plata: 300, bronce: 150, ninguna: 60 };

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

      const { puntos, distancia } = this.generarRuta(n);
      if (puntos.length < CHECKPOINTS) continue;

      const id = `carrera-${Math.round(n.x)}-${Math.round(n.y)}`;
      const tOro = distancia / (VEL_MEDIA * RITMO_ORO);
      const tPlata = distancia / (VEL_MEDIA * RITMO_PLATA);
      const tBronce = distancia / (VEL_MEDIA * RITMO_BRONCE);
      this.carreras.push({ id, x: n.x, y: n.y, puntos, distancia, tOro, tPlata, tBronce });
      this.pintar(n);
    }
  }

  // sigue la red de calles desde el cruce inicial, un tramo detras de otro
  // (igual que un coche de trafico eligiendo salida en cada cruce)
  generarRuta(nodoInicial) {
    let edge = this.net.edgeMasCercano(nodoInicial.x, nodoInicial.y) || this.net.randomEdge();
    const puntos = [];
    let distancia = 0;
    let prev = nodoInicial;
    for (let i = 0; i < CHECKPOINTS; i++) {
      const p = this.net.exitPoint(edge);
      distancia += Phaser.Math.Distance.Between(prev.x, prev.y, p.x, p.y);
      puntos.push(p);
      prev = p;
      const siguiente = this.net.nextEdge(edge);
      if (!siguiente) break;
      edge = siguiente;
    }
    return { puntos, distancia };
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

  empezar(carrera) {
    this.activa = { def: carrera, checkpoint: 0, tiempo: 0, puntos: carrera.puntos };
    this.colocarMarcas();
    EventBus.emit(EVT.BIG_MESSAGE, {
      title: 'CARRERA',
      subtitle: `${CHECKPOINTS} puntos de control · sin pasajero, solo tu contra el reloj`,
      color: '#e8b54a',
    });
  }

  completar() {
    const { def, tiempo } = this.activa;
    const medalla = tiempo <= def.tOro ? 'oro' : tiempo <= def.tPlata ? 'plata' : tiempo <= def.tBronce ? 'bronce' : 'ninguna';
    const pago = PREMIO[medalla];

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
    this.activa = null;

    EventBus.emit(EVT.BIG_MESSAGE, {
      title: medalla === 'ninguna' ? 'SIN MEDALLA' : `MEDALLA DE ${medalla.toUpperCase()}`,
      subtitle: `${tiempo.toFixed(1)} s · +${pago} €`,
      color: medalla === 'oro' ? '#e8b54a' : medalla === 'plata' ? '#c9c3b4' : medalla === 'bronce' ? '#c8965a' : '#8a8578',
    });
  }

  abortar() {
    if (!this.activa) return;
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
      texto: `Punto de control ${this.activa.checkpoint + 1}/${this.activa.puntos.length} · ${this.activa.tiempo.toFixed(1)} s`,
      restante: null,
      objetivo: this.activa.puntos[this.activa.checkpoint],
      pasoActual: this.activa.checkpoint + 1,
      pasos: this.activa.puntos.length,
    };
  }
}
