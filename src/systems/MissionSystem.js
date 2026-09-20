import { MISSIONS } from '../config/missions.js';
import { FACTIONS, ZONE_OWNER } from '../config/factions.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Vehicle } from '../entities/Vehicle.js';
import { VEHICLE_KEYS, VEHICLES } from '../config/vehicles.js';
import { steerTo } from './driving.js';

const ALCANCE = 42;

// Ejecuta las misiones de config/missions.js paso a paso. El sistema no sabe
// nada de ninguna mision concreta: solo sabe ejecutar tipos de paso.
export class MissionSystem {
  constructor(scene, map, network) {
    this.scene = scene;
    this.map = map;
    this.net = network;
    this.activa = null;
    this.objetivo = null;
    this.blanco = null;

    this.aro = scene.add.image(0, 0, 'ring').setVisible(false).setDepth(5);
    scene.tweens.add({
      targets: this.aro, scale: { from: 0.85, to: 1.15 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    this.crearDadores();
  }

  // ---------- quien da las misiones ----------

  crearDadores() {
    this.dadores = [];
    for (const key of Object.keys(FACTIONS)) {
      const punto = this.puntoFijoEnZona(FACTIONS[key].zones[0]);
      if (!punto) continue;

      const f = FACTIONS[key];
      const aro = this.scene.add.image(punto.x, punto.y, 'ring')
        .setDisplaySize(58, 58).setTint(f.accent).setDepth(5);
      this.scene.tweens.add({
        targets: aro, alpha: { from: 0.45, to: 1 },
        duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
      this.scene.add.text(punto.x, punto.y + 34, f.short, {
        fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#b9b2a0',
      }).setOrigin(0.5).setAlpha(0.75).setDepth(5);

      this.dadores.push({ faccion: key, x: punto.x, y: punto.y, aro });
    }
  }

  // El que da la mision necesita un sitio FIJO (siempre el mismo, para poder
  // aprendertelo). Los objetivos, en cambio, tienen que salir sorteados y
  // lejos de donde estas: antes devolvia siempre el mismo punto y el objetivo
  // caia encima del propio dador, asi que la mision se cumplia sola.
  puntoFijoEnZona(zona) {
    const spots = this.map.sidewalkSpots.filter((s) => this.map.zoneAt(s.x, s.y) === zona);
    if (spots.length === 0) return null;
    return spots[Math.floor(spots.length / 2)];
  }

  puntoEnZona(zona, lejosDe = null, minDist = 420) {
    const spots = this.map.sidewalkSpots.filter((s) => this.map.zoneAt(s.x, s.y) === zona);
    if (spots.length === 0) return null;

    const lejanos = lejosDe
      ? spots.filter(
          (s) => Phaser.Math.Distance.Between(s.x, s.y, lejosDe.x, lejosDe.y) > minDist
        )
      : spots;
    const pool = lejanos.length > 0 ? lejanos : spots;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  dadorCerca(x, y) {
    return this.dadores.find(
      (d) => Phaser.Math.Distance.Between(d.x, d.y, x, y) < 58
    );
  }

  // ---------- empezar ----------

  disponiblesDe(faccion) {
    const hechas = GameState.flags.misiones || {};
    return MISSIONS.filter(
      (m) =>
        m.faccion === faccion &&
        !hechas[m.id] &&
        GameState.factionRep(faccion) >= m.minRep
    );
  }

  intentarEmpezar(x, y) {
    if (this.activa) return false;
    const dador = this.dadorCerca(x, y);
    if (!dador) return false;

    const lista = this.disponiblesDe(dador.faccion);
    if (lista.length === 0) {
      EventBus.emit(EVT.NOTIFY, {
        text: `${FACTIONS[dador.faccion].short}: hoy no hay nada para ti`,
        tone: 'dim',
      });
      return true;
    }

    this.empezar(lista[0]);
    return true;
  }

  empezar(def) {
    this.activa = {
      def,
      paso: 0,
      tiempo: 0,
      llevaCarga: false,
    };
    EventBus.emit(EVT.BIG_MESSAGE, {
      title: def.nombre.toUpperCase(),
      subtitle: def.intro,
      color: '#e8b54a',
    });
    EventBus.emit(EVT.MISSION_START, { mision: def });
    this.prepararPaso();
  }

  // ---------- pasos ----------

  get pasoActual() {
    return this.activa ? this.activa.def.pasos[this.activa.paso] : null;
  }

  prepararPaso() {
    const paso = this.pasoActual;
    if (!paso) return;

    this.activa.tiempo = paso.limite || 0;
    this.limpiarBlanco();

    if (paso.tipo === 'romper' || paso.tipo === 'seguir') {
      this.crearBlanco(paso);
      this.objetivo = null;
    } else if (paso.tipo === 'perder' || paso.tipo === 'aguantar') {
      this.objetivo = null;
    } else {
      const desde = { x: this.scene.player.x, y: this.scene.player.y };
      const punto =
        this.puntoEnZona(paso.zona, desde) || this.puntoEnZona('centro', desde);
      this.objetivo = punto ? { x: punto.x, y: punto.y } : null;
    }

    this.aro.setVisible(!!this.objetivo);
    if (this.objetivo) this.aro.setPosition(this.objetivo.x, this.objetivo.y).setDisplaySize(64, 64);

    if (paso.tipo === 'perder') GameState.raiseWanted(2);
    if (paso.tipo === 'aguantar') GameState.raiseWanted(1);

    EventBus.emit(EVT.NOTIFY, { text: paso.texto, tone: 'objective' });
  }

  crearBlanco(paso) {
    const spots = this.map.roadSpots;
    const cerca = spots
      .filter((s) => Phaser.Math.Distance.Between(s.x, s.y, this.scene.player.x, this.scene.player.y) < 900)
      .filter((s) => !this.map.isSolidBox(s.x, s.y, 34, 34));
    const punto = cerca[Math.floor(Math.random() * cerca.length)] || spots[0];

    const tipo = VEHICLE_KEYS[Math.floor(Math.random() * VEHICLE_KEYS.length)];
    const v = new Vehicle(this.scene, this.map, tipo, punto.x, punto.y, 0, {
      color: Math.floor(Math.random() * VEHICLES[tipo].palette.length),
    });
    v.ai = true;
    v.esBlanco = true;
    this.scene.vehicles.push(v);

    this.blanco = { vehicle: v, edge: this.net.randomEdge(), huyendo: paso.tipo === 'seguir' };
    this.aro.setVisible(true);
  }

  limpiarBlanco() {
    if (!this.blanco) return;
    const lista = this.scene.vehicles;
    const i = lista.indexOf(this.blanco.vehicle);
    if (i >= 0) lista.splice(i, 1);
    this.blanco.vehicle.destroy();
    this.blanco = null;
  }

  // ---------- bucle ----------

  update(dt, player, playerVehicle) {
    if (!this.activa) return;

    const paso = this.pasoActual;
    if (!paso) return;

    if (paso.limite) {
      this.activa.tiempo -= dt;
      if (this.activa.tiempo <= 0) {
        // en "aguantar" el reloj juega a tu favor: llegar a cero es superarlo
        if (paso.tipo === 'aguantar') this.siguientePaso();
        else this.fallar('Se te acabo el tiempo');
        return;
      }
    }

    if (this.blanco) this.moverBlanco(dt);

    switch (paso.tipo) {
      case 'ir':
      case 'recoger':
      case 'entregar':
        if (this.enObjetivo(player)) this.siguientePaso();
        break;

      case 'conducir':
        if (!playerVehicle) break;
        if (this.enObjetivo(player)) this.siguientePaso();
        break;

      case 'perder':
        if (GameState.wanted === 0) this.siguientePaso();
        break;

      case 'aguantar':
        // el limite es la propia cuenta atras: si aguantas, el paso se cumple
        break;

      case 'romper':
        if (!this.blanco) { this.siguientePaso(); break; }
        this.aro.setPosition(this.blanco.vehicle.x, this.blanco.vehicle.y).setVisible(true);
        if (this.blanco.vehicle.hp <= 0) this.siguientePaso();
        break;

      case 'seguir': {
        if (!this.blanco) { this.siguientePaso(); break; }
        this.aro.setPosition(this.blanco.vehicle.x, this.blanco.vehicle.y).setVisible(true);
        const d = Phaser.Math.Distance.Between(
          this.blanco.vehicle.x, this.blanco.vehicle.y, player.x, player.y
        );
        if (d > 620) this.fallar('Le has perdido');
        break;
      }
    }
  }

  moverBlanco(dt) {
    const b = this.blanco;
    const v = b.vehicle;
    if (!b.huyendo) {
      v.update(dt, { throttle: false, brake: false, left: false, right: false, handbrake: false });
      return;
    }
    const meta = this.net.exitPoint(b.edge);
    if (Phaser.Math.Distance.Between(v.x, v.y, meta.x, meta.y) < 52) {
      b.edge = this.net.nextEdge(b.edge) || this.net.randomEdge();
    }
    const destino = this.net.exitPoint(b.edge);
    v.update(dt, steerTo(v, destino.x, destino.y, v.stats.maxSpeed * 0.72, false));
  }

  enObjetivo(player) {
    if (!this.objetivo) return false;
    return (
      Phaser.Math.Distance.Between(player.x, player.y, this.objetivo.x, this.objetivo.y) < ALCANCE
    );
  }

  siguientePaso() {
    const paso = this.pasoActual;
    if (paso && paso.tipo === 'recoger') this.activa.llevaCarga = true;

    this.activa.paso++;
    if (this.activa.paso >= this.activa.def.pasos.length) {
      this.completar();
      return;
    }
    this.prepararPaso();
  }

  completar() {
    const def = this.activa.def;
    GameState.addMoney(def.pago, `mision ${def.id}`);
    GameState.changeFaction(def.faccion, def.rep);
    GameState.addReputation(3);
    if (!GameState.flags.misiones) GameState.flags.misiones = {};
    GameState.flags.misiones[def.id] = true;

    this.limpiarBlanco();
    this.aro.setVisible(false);
    this.activa = null;
    this.objetivo = null;

    EventBus.emit(EVT.BIG_MESSAGE, {
      title: 'MISION CUMPLIDA',
      subtitle: `+${def.pago} €  ·  ${FACTIONS[def.faccion].short} +${def.rep}`,
      color: '#8fd694',
    });
    EventBus.emit(EVT.MISSION_END, { mision: def, ok: true });
  }

  fallar(motivo) {
    const def = this.activa.def;
    this.limpiarBlanco();
    this.aro.setVisible(false);
    this.activa = null;
    this.objetivo = null;

    GameState.changeFaction(def.faccion, -4);
    EventBus.emit(EVT.BIG_MESSAGE, {
      title: 'MISION FALLIDA',
      subtitle: motivo,
      color: '#d9584a',
    });
    EventBus.emit(EVT.MISSION_END, { mision: def, ok: false, motivo });
  }

  abortar(motivo) {
    if (this.activa) this.fallar(motivo);
  }

  // ---------- para el HUD ----------

  estado() {
    if (!this.activa) return null;
    const paso = this.pasoActual;
    return {
      nombre: this.activa.def.nombre,
      texto: paso ? paso.texto : '',
      restante: paso && paso.limite ? Math.max(0, this.activa.tiempo) : null,
      objetivo: this.objetivo || (this.blanco ? { x: this.blanco.vehicle.x, y: this.blanco.vehicle.y } : null),
      pasoActual: this.activa.paso + 1,
      pasos: this.activa.def.pasos.length,
    };
  }
}
