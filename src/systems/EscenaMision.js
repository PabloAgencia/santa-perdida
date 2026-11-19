import { Vehicle } from '../entities/Vehicle.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';
import { steerTo } from './driving.js';

// LAS ESCENAS DE ACCION DE LAS MISIONES (19-nov-2026, Pablo: "ritmo y
// dificultad como en un GTA, y que algunas misiones sean totalmente
// espectaculares").
//
// Antes un paso era solo "llega aqui" o "aguanta X segundos" con una estrella
// encima: aguantar no tenia enemigos. Ahora cualquier paso de config/missions.js
// puede traer, ademas de lo suyo:
//
//   oleadas: { faccion, porOleada, total }
//       pandilleros armados que salen a tu alrededor y van a por ti. La
//       siguiente oleada llega al quedar uno o a los 16 s. `faccion` es solo
//       la ropa que llevan (son hostiles da igual tu reputacion).
//   persecutores: N  (o { n, dano })
//       coches que te persiguen, te embisten y te disparan por la ventanilla.
//       Se paran si les revientas el coche.
//   explosiones: S
//       cada S segundos prende un coche cerca de ti y revienta a los 2,5 s
//       (cocteles, coches bomba). El fuego avisa: aparta.
//   busca: N
//       la policia entra con N estrellas al empezar el paso.
//   titular: 'TEXTO'
//       un cartel grande al empezar el paso, para los momentos gordos.
//
// Todo lo que crea una escena se limpia al cambiar de paso, al fallar o al
// cumplir: los que quedan vivos dejan de ir a por ti y los coches lejanos
// desaparecen.

const PERSIGUE_DISPARA = 300;     // px: a esta distancia disparan por la ventanilla
const PERSIGUE_CADENCIA = 1.1;   // segundos entre tiro y tiro de cada coche
const OLEADA_MAX_ESPERA = 16;     // segundos: la siguiente oleada llega igual
const COCHES_ESCENA = ['senador', 'sierra', 'bastion', 'ranchera', 'mulero'];

export class EscenaMision {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.e = null;
  }

  montar(paso) {
    this.limpiar();
    const e = {
      paso,
      enemigos: [],
      persecutores: [],
      chatarra: [],
      oleada: 0,
      tOleada: 0,
      tExplosion: paso.explosiones ? paso.explosiones * 0.5 : 0,
    };
    this.e = e;

    if (paso.titular) {
      EventBus.emit(EVT.BIG_MESSAGE, { title: paso.titular, subtitle: paso.texto, color: '#d9584a' });
      this.scene.cameras.main.shake(260, 0.004);
    }
    if (paso.busca && GameState.wanted < paso.busca) GameState.setWanted(paso.busca);
    if (paso.oleadas) this.siguienteOleada();
    const nPers = typeof paso.persecutores === 'number' ? paso.persecutores
      : (paso.persecutores ? paso.persecutores.n : 0);
    const nEscolta = paso.escolta || 0;
    for (let i = 0; i < nPers + nEscolta; i++) this.crearPersecutor(i);
    if (nPers + nEscolta > 0) {
      EventBus.emit(EVT.NOTIFY, {
        text: nEscolta ? 'Lleva escolta: van a ir a por ti' : 'Te siguen. Y van armados',
        tone: 'danger',
      });
    }
  }

  // ---------- oleadas a pie ----------

  siguienteOleada() {
    const e = this.e;
    const o = e.paso.oleadas;
    if (e.oleada >= (o.total || 3)) return;
    e.oleada++;
    e.tOleada = 0;
    const p = this.scene.player;
    const n = o.porOleada || 3;
    for (let i = 0; i < n; i++) {
      const sitio = this.sitioCerca(p.x, p.y, 210, 330);
      if (!sitio) continue;
      // 'fuera' = gente del Consorcio: ropa de calle, sin colores de banda
      const enemigo = this.scene.npcs.crearPandillero(sitio.x, sitio.y, o.faccion === 'fuera' ? null : (o.faccion || 'amarres'));
      // la misma marca que la guerra por el territorio: hostil mientras dure,
      // da igual la reputacion que tengas con su banda
      enemigo.guerraTerritorio = true;
      enemigo.deMision = true;
      e.enemigos.push(enemigo);
    }
    EventBus.emit(EVT.NOTIFY, {
      text: (o.total || 3) > 1 ? `Vienen mas · oleada ${e.oleada} de ${o.total || 3}` : 'Vienen a por ti',
      tone: 'danger',
    });
    Audio.notes([196, 185, 174.6], 0.12, 'sawtooth', 0.06);
  }

  // un punto libre (ni pared, ni agua, ni edificio) a cierta distancia
  sitioCerca(x, y, min, max) {
    for (let t = 0; t < 24; t++) {
      const a = Math.random() * Math.PI * 2;
      const d = min + Math.random() * (max - min);
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d;
      if (this.map.isSolidBox(px, py, 12, 12)) continue;
      return { x: px, y: py };
    }
    return null;
  }

  // ---------- coches que te persiguen ----------

  crearPersecutor(i) {
    const p = this.scene.drivingVehicle || this.scene.player;
    const spots = this.map.roadSpots.filter((s) => {
      const d = Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y);
      return d > 320 && d < 620 && !this.map.isSolidBox(s.x, s.y, 30, 30);
    });
    const s = spots[Math.floor(Math.random() * spots.length)];
    if (!s) return;
    const tipo = COCHES_ESCENA[i % COCHES_ESCENA.length];
    const v = new Vehicle(this.scene, this.map, tipo, s.x, s.y,
      Math.atan2(p.y - s.y, p.x - s.x), { color: 0, gasolina: 1 });
    v.ai = true;
    v.encendido = true;
    v.deEscena = true;
    // un poco mas duros que un coche de la calle: tienen que durar la escena
    v.hp = v.stats.maxHp * 1.4;
    v.sprite.setTint(0x9a9aa0);
    this.scene.vehicles.push(v);
    const dano = (this.e.paso.persecutores && this.e.paso.persecutores.dano) || 5;
    this.e.persecutores.push({ v, recarga: 1 + Math.random(), dano });
  }

  moverPersecutor(q, dt) {
    const v = q.v;
    const obj = this.scene.drivingVehicle || this.scene.player;
    if (v.hp <= 0 || v.quemado) {
      v.update(dt, { throttle: false, brake: true, left: false, right: false, handbrake: false });
      return;
    }
    // apuntan un poco por delante de donde vas, como quien te quiere cerrar
    const lead = this.scene.drivingVehicle ? 0.35 : 0;
    const tx = obj.x + (obj.vx || 0) * lead;
    const ty = obj.y + (obj.vy || 0) * lead;
    const d = Phaser.Math.Distance.Between(v.x, v.y, obj.x, obj.y);
    // si vas a pie no te pasan por encima una y otra vez: frenan cerca y se
    // quedan disparando (en coche si te embisten, como en los GTA)
    if (!this.scene.drivingVehicle && d < 170) {
      v.update(dt, { throttle: false, brake: true, left: false, right: false, handbrake: false });
    } else {
      v.update(dt, steerTo(v, tx, ty, v.stats.maxSpeed * 0.95, false));
    }

    q.recarga -= dt;
    const combat = this.scene.combat;
    if (q.recarga <= 0 && d < PERSIGUE_DISPARA && combat && combat.veA(v, obj, PERSIGUE_DISPARA)) {
      q.recarga = PERSIGUE_CADENCIA * (0.8 + Math.random() * 0.5);
      combat.disparoDeNPC({ x: v.x, y: v.y }, obj, q.dano, PERSIGUE_DISPARA, 11, 'subfusil');
    }
  }

  // ---------- coches que revientan ----------

  prenderCoche() {
    const p = this.scene.player;
    const sitio = this.sitioCerca(p.x, p.y, 110, 240);
    if (!sitio) return;
    const tipo = COCHES_ESCENA[Math.floor(Math.random() * COCHES_ESCENA.length)];
    const v = new Vehicle(this.scene, this.map, tipo, sitio.x, sitio.y, Math.random() * Math.PI * 2, { hp: 0 });
    v.deEscena = true;
    // ya ardiendo y a 2,5 s de reventar (DanoVehiculos revienta a los 6)
    v.ardiendo = 3.5;
    this.scene.vehicles.push(v);
    this.e.chatarra.push(v);
  }

  // ---------- bucle ----------

  update(dt) {
    const e = this.e;
    if (!e) return;
    const paso = e.paso;

    if (paso.oleadas) {
      e.enemigos = e.enemigos.filter((p) => !p.down);
      e.tOleada += dt;
      if (e.oleada < (paso.oleadas.total || 3) && (e.enemigos.length <= 1 || e.tOleada > OLEADA_MAX_ESPERA)) {
        this.siguienteOleada();
      }
    }

    for (const q of e.persecutores) this.moverPersecutor(q, dt);

    if (paso.explosiones) {
      e.tExplosion -= dt;
      if (e.tExplosion <= 0) {
        e.tExplosion = paso.explosiones * (0.75 + Math.random() * 0.5);
        if (e.chatarra.filter((v) => !v.quemado).length < 3) this.prenderCoche();
      }
    }
  }

  // lo que se añade al rotulo de la mision: oleada y cuantos quedan
  resumen() {
    const e = this.e;
    if (!e) return '';
    const partes = [];
    if (e.paso.oleadas) {
      const vivos = e.enemigos.filter((p) => !p.down).length;
      partes.push(`oleada ${e.oleada}/${e.paso.oleadas.total || 3}${vivos ? ' · quedan ' + vivos : ''}`);
    }
    const coches = e.persecutores.filter((q) => q.v.hp > 0).length;
    if (coches) partes.push(`${coches} ${coches === 1 ? 'coche' : 'coches'} detras`);
    return partes.length ? '  ·  ' + partes.join('  ·  ') : '';
  }

  // ¿quedan enemigos a pie vivos? (para los pasos que piden limpiar la zona)
  enemigosVivos() {
    return this.e ? this.e.enemigos.filter((p) => !p.down).length : 0;
  }

  limpiar() {
    const e = this.e;
    if (!e) return;
    for (const p of e.enemigos) {
      if (p.down) continue;
      p.guerraTerritorio = false;
      p.hostile = false;
      p.chaseTarget = null;
    }
    const jugador = this.scene.drivingVehicle || this.scene.player;
    const quitar = new Set();
    for (const v of e.persecutores.map((q) => q.v).concat(e.chatarra)) {
      v.ai = false;
      const lejos = Phaser.Math.Distance.Between(v.x, v.y, jugador.x, jugador.y) > 700;
      if (lejos && v !== this.scene.drivingVehicle) quitar.add(v);
    }
    const lista = this.scene.vehicles;
    for (const v of quitar) {
      const i = lista.indexOf(v);
      if (i >= 0) lista.splice(i, 1);
      v.destroy();
    }
    this.e = null;
  }
}
