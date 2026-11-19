import { MISSIONS } from '../config/missions.js';
import { FACTIONS, ZONE_OWNER } from '../config/factions.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Vehicle } from '../entities/Vehicle.js';
import { VEHICLE_KEYS, VEHICLES } from '../config/vehicles.js';
import { steerTo } from './driving.js';
import { etiquetaFlotante } from '../world/etiquetas.js';
import { CINEMATICAS, FONDO_BANDA, JEFE_BANDA } from '../config/cinematicas.js';
import { PERSONAJES, sinTildes } from '../config/personajes.js';
import { SaveSystem } from '../core/SaveSystem.js';
import { cumpleTodas } from '../core/condiciones.js';
import { EscenaMision } from './EscenaMision.js';

const ALCANCE = 42;
// el color del haz de quien da encargos sin ser de ninguna banda
const COLOR_NEUTRAL = 0xd8cfa8;

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

    this.escena = new EscenaMision(scene, map);
    this.reintento = null;
    this.crearDadores();
  }

  // ---------- quien da las misiones ----------

  // Un marcador por mision disponible, repartidos por la ciudad y con su haz
  // de luz, como los iconos de GTA. Se entra en el y se decide si aceptar.
  crearDadores() {
    this.dadores = [];
    this.refrescarDadores();
  }

  // Los encargos NO salen todos de golpe: cada banda te enseña UNO cada vez,
  // el siguiente aparece cuando cumples el anterior, y te avisa de que hay
  // gente nueva esperandote en el mapa.
  refrescarDadores() {
    const antes = new Set(this.dadores.map((d) => d.mision.id));
    for (const d of this.dadores) d.objetos.forEach((o) => o.destroy());
    this.dadores = [];

    // Las tres bandas, y ademas cada persona que da encargos por su cuenta
    // (`faccion: 'neutral'` + `dador`: El Duque, Puro, Remedios, Teresa...).
    // Cada uno enseña su primer encargo libre, en paralelo a los demas.
    const grupos = Object.keys(FACTIONS).map((key) => ({
      key, accent: FACTIONS[key].accent, zonas: FACTIONS[key].zones, libres: this.disponiblesDe(key),
    }));
    const neutrales = [...new Set(MISSIONS.filter((m) => m.faccion === 'neutral').map((m) => m.dador))];
    for (const quien of neutrales) {
      const libres = this.disponiblesDe('neutral', quien);
      if (libres.length) grupos.push({ key: 'neutral', accent: COLOR_NEUTRAL, zonas: [libres[0].zonaDador || 'centro'], libres });
    }

    for (const grupo of grupos) {
      const key = grupo.key;
      const f = { accent: grupo.accent, zones: grupo.zonas };
      const libres = grupo.libres;
      if (libres.length === 0) continue;

      libres.slice(0, 1).forEach((mision, i) => {
        const zona = f.zones[i % f.zones.length];
        const punto = this.puntoFijoEnZona(zona, mision.id);
        if (!punto) return;

        const objetos = [];
        // haz de luz: varios circulos que se estrechan, mas el resplandor
        for (let c = 0; c < 5; c++) {
          objetos.push(
            this.scene.add.circle(punto.x, punto.y, 30 - c * 5, f.accent, 0.1 + c * 0.03)
              .setDepth(4 + c)
          );
        }
        const halo = this.scene.add.image(punto.x, punto.y, 'lamp')
          .setDisplaySize(190, 190)
          .setTint(f.accent)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.8)
          .setDepth(3);
        objetos.push(halo);
        this.scene.tweens.add({
          targets: halo, alpha: { from: 0.45, to: 0.95 },
          duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });

        // El que da el encargo es UNA PERSONA de la banda, plantada ahi, no un
        // rombo flotando. Su sombra y un balanceo suave para que se vea vivo.
        objetos.push(
          this.scene.add.image(punto.x, punto.y + 4, 'shadow')
            .setScale(0.32).setAlpha(0.45).setDepth(punto.y - 3)
        );
        // el jefe en persona si ya tiene su sprite (`jefe-consul`...,
        // PROMPTS-PARA-GEMINI.txt); si no, uno de su banda
        // (si la mision la da otra persona, `dador`, su sprite y su nombre)
        const quienDa = mision.dador || JEFE_BANDA[key];
        const sprite = this.scene.textures.exists(`jefe-${quienDa}-0`) ? `jefe-${quienDa}-0`
          : (FACTIONS[key] ? `gang-${key}-0` : 'ped-3-0');
        const contacto = this.scene.add.image(punto.x, punto.y, sprite)
          .setDepth(punto.y);
        objetos.push(contacto);
        this.scene.tweens.add({
          targets: contacto, angle: { from: -7, to: 7 },
          duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });

        // rombo pequeño sobre su cabeza, para localizarlo de lejos
        const marca = this.scene.add.image(punto.x, punto.y - 24, 'px')
          .setDisplaySize(14, 14).setTint(f.accent).setRotation(Math.PI / 4).setDepth(10);
        objetos.push(marca);
        this.scene.tweens.add({
          targets: marca, y: punto.y - 30,
          duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });

        // EL NOMBRE DEL JEFE, no el de la banda: HISTORIA-SANTA-PERDIDA.txt.
        // Antes decia "AMARRES"/"ROMPIENTE"/"VERDIAL" (una sigla); ahora
        // dice el alias de quien de verdad te esta dando el encargo.
        const et = etiquetaFlotante(
          this.scene, punto.x, punto.y + 34, this.nombreDador(mision, key).toUpperCase(), f.accent, 14
        );
        objetos.push(et.texto, et.placa, et.raya);

        this.dadores.push({
          faccion: key, mision, x: punto.x, y: punto.y, objetos, color: f.accent,
        });
      });
    }

    // avisar solo de los que son nuevos de verdad
    for (const d of this.dadores) {
      if (antes.has(d.mision.id)) continue;
      if (antes.size === 0) continue;   // al empezar la partida no se avisa
      EventBus.emit(EVT.NOTIFY, {
        text: `${this.nombreDador(d.mision, d.faccion)} te espera para un trabajo nuevo`,
        tone: 'objective',
      });
    }
  }

  // quien da la mision: su `dador` (Sacau, Teresa, el Inspector...) o el
  // jefe de la banda. Sin tildes: las etiquetas van en la fuente del juego.
  nombreDador(mision, faccion) {
    const p = mision.dador && PERSONAJES[mision.dador];
    if (p) return sinTildes(p.alias);
    return sinTildes(FACTIONS[faccion] ? FACTIONS[faccion].jefe.alias : 'Alguien');
  }

  // para pintarlos en el minimapa
  puntos() {
    return this.dadores.map((d) => ({
      x: d.x, y: d.y, color: d.color,
    }));
  }

  // El que da la mision necesita un sitio FIJO (siempre el mismo, para poder
  // aprendertelo). Los objetivos, en cambio, tienen que salir sorteados y
  // lejos de donde estas: antes devolvia siempre el mismo punto y el objetivo
  // caia encima del propio dador, asi que la mision se cumplia sola.
  puntoFijoEnZona(zona, semilla = '') {
    const spots = this.map.sidewalkSpots.filter((s) => this.map.zoneAt(s.x, s.y) === zona);
    if (spots.length === 0) return null;
    let h = 7;
    for (let i = 0; i < semilla.length; i++) h = (h * 31 + semilla.charCodeAt(i)) >>> 0;
    return spots[h % spots.length];
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

  // Lo que pide una mision para salir:
  //   requiere        todas estas hechas
  //   requiereAlguna  al menos una de estas hecha
  //   decision        lo elegido en una cinematica ('marca' o '!marca', ver
  //                   CinematicaScene.cumple): los caminos del Acto 4
  //   medallas        cuantas medallas de la Santa Perdida hay que tener
  //   minRep          reputacion con su banda (las neutrales no la miran)
  disponiblesDe(faccion, dador = null) {
    const hechas = GameState.flags.misiones || {};
    return MISSIONS.filter(
      (m) =>
        m.faccion === faccion &&
        (!dador || m.dador === dador) &&
        !hechas[m.id] &&
        (m.requiere || []).every((id) => hechas[id]) &&
        (!m.requiereAlguna || m.requiereAlguna.some((id) => hechas[id])) &&
        cumpleTodas(m.decision) &&
        (!m.medallas || Object.keys(GameState.medallasRecogidas || {}).length >= m.medallas) &&
        (!FACTIONS[faccion] || GameState.factionRep(faccion) >= (m.minRep ?? -100))
    );
  }

  intentarEmpezar(x, y) {
    if (this.activa || this.hablando) return false;
    const dador = this.dadorCerca(x, y);
    if (!dador) return false;

    // PRIMERO SE HABLA (APUNTES G1): quien te da el encargo te lo cuenta en
    // una cinematica (config/cinematicas.js) y la mision arranca al acabar.
    // Antes la intro salia como un cartel de texto encima del juego.
    const def = dador.mision;
    if (this.scene.verCinematica) {
      this.hablando = true;
      this.scene.verCinematica(this.dialogoDe(def), () => {
        this.hablando = false;
        this.empezar(def);
      });
    } else {
      this.empezar(def);
    }
    return true;
  }

  // el dialogo de la mision; si no tiene uno escrito, su `intro` en boca
  // del jefe de la banda, en su decorado
  dialogoDe(def) {
    if (CINEMATICAS[def.id]) return CINEMATICAS[def.id];
    return [{ fondo: FONDO_BANDA[def.faccion], quien: JEFE_BANDA[def.faccion], texto: def.intro }];
  }

  // `desde` = el paso por el que se empieza (reintentar desde un punto de
  // control, como en los GTA: no hace falta repetir la mision entera)
  empezar(def, desde = 0) {
    for (const d of this.dadores) d.objetos.forEach((o) => o.setVisible(false));
    this.reintento = null;
    this.activa = {
      def,
      paso: desde,
      tiempo: 0,
      llevaCarga: def.pasos.slice(0, desde).some((p) => p.tipo === 'recoger'),
    };
    // el nombre de la mision, como en los GTA al acabar de hablar; lo que
    // hay que hacer ya lo dice el primer paso (prepararPaso)
    EventBus.emit(EVT.BIG_MESSAGE, {
      title: def.nombre.toUpperCase(),
      subtitle: this.nombreDador(def, def.faccion),
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
    if (paso.tipo === 'aguantar' && !paso.oleadas) GameState.raiseWanted(1);
    this.activa.cerca = 0;
    this.activa.avisoCerca = false;

    EventBus.emit(EVT.NOTIFY, { text: paso.texto, tone: 'objective' });
    // la accion del paso: oleadas, persecuciones, explosiones (EscenaMision)
    this.escena.montar(paso);
  }

  crearBlanco(paso) {
    const spots = this.map.roadSpots;
    const px = this.scene.player.x;
    const py = this.scene.player.y;

    // El coche tiene que nacer A LA VISTA. Antes salia en cualquier punto a
    // menos de 900 px, y como se pierde a los 700 podia fallar de salida.
    const cerca = spots
      .filter((s) => {
        const d = Phaser.Math.Distance.Between(s.x, s.y, px, py);
        return d > 180 && d < 380;
      })
      .filter((s) => !this.map.isSolidBox(s.x, s.y, 34, 34));
    const anchas = cerca.length > 0
      ? cerca
      : spots.filter((s) => Phaser.Math.Distance.Between(s.x, s.y, px, py) < 620);
    const punto = anchas[Math.floor(Math.random() * anchas.length)] || spots[0];

    // la calle en la que nace, para que arranque mirando hacia donde va y
    // huya por ella (antes salia mirando al este y con un tramo cualquiera
    // de la ciudad como destino)
    const calle = this.net.edgeMasCercano(punto.x, punto.y) || this.net.randomEdge();
    const tipo = VEHICLE_KEYS[Math.floor(Math.random() * VEHICLE_KEYS.length)];
    const v = new Vehicle(this.scene, this.map, tipo, punto.x, punto.y, calle.angle, {
      color: Math.floor(Math.random() * VEHICLES[tipo].palette.length),
    });
    v.ai = true;
    v.esBlanco = true;
    v.encendido = true;
    // `blindado: N` = aguanta N veces mas (el camion del Consorcio, el coche
    // de Maximo...); `huye: true` = en un 'romper' sale corriendo en vez de
    // esperarte aparcado
    if (paso.blindado) {
      v.hp = v.stats.maxHp * paso.blindado;
      v.sprite.setTint(0xb8b0a0);
    }
    this.scene.vehicles.push(v);

    this.blanco = {
      vehicle: v,
      edge: calle,
      huyendo: paso.tipo === 'seguir' || !!paso.huye,
      gracia: 4,
    };
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
    if (!this.activa) {
      this.avisarSiHayContactoCerca(player);
      return;
    }

    const paso = this.pasoActual;
    if (!paso) return;

    if (paso.limite) {
      this.activa.tiempo -= dt;
      if (this.activa.tiempo <= 0) {
        // En "aguantar" y en "seguir" el reloj juega a tu favor: llegar a cero
        // es superarlo. Antes 'seguir' no tenia NINGUNA forma de ganarse: te
        // pegabas al coche los 75 segundos y la mision fallaba igual.
        if (paso.tipo === 'aguantar' || paso.tipo === 'seguir') this.siguientePaso();
        else this.fallar('Se te acabo el tiempo');
        return;
      }
    }

    if (this.blanco) this.moverBlanco(dt);
    this.escena.update(dt);

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
        // unos segundos de cortesia al empezar, para llegar hasta el
        if (this.blanco.gracia > 0) { this.blanco.gracia -= dt; break; }
        const d = Phaser.Math.Distance.Between(
          this.blanco.vehicle.x, this.blanco.vehicle.y, player.x, player.y
        );
        if (d > 700) { this.fallar('Le has perdido'); break; }
        // `sigilo: true`: si te pegas demasiado, te ve (los seguimientos de
        // los GTA: ni muy lejos ni encima)
        if (paso.sigilo) {
          if (d < 120) {
            if (!this.activa.avisoCerca) {
              this.activa.avisoCerca = true;
              EventBus.emit(EVT.NOTIFY, { text: 'No te acerques tanto, que te ve', tone: 'danger' });
            }
            this.activa.cerca += dt;
            if (this.activa.cerca > 2.5) this.fallar('Te ha visto');
          } else {
            this.activa.cerca = Math.max(0, this.activa.cerca - dt * 0.5);
            if (d > 200) this.activa.avisoCerca = false;
          }
        }
        break;
      }
    }
  }

  // al ponerte a su lado te dice que puedes hablar con el, una sola vez
  avisarSiHayContactoCerca(player) {
    const cerca = this.dadorCerca(player.x, player.y);
    if (cerca === this.ultimoCerca) return;
    this.ultimoCerca = cerca;
    if (!cerca) return;
    EventBus.emit(EVT.NOTIFY, {
      text: `E para hablar con ${this.nombreDador(cerca.mision, cerca.faccion)}: ${cerca.mision.nombre}`,
      tone: 'objective',
    });
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

    this.escena.limpiar();
    this.activa.paso++;
    if (this.activa.paso >= this.activa.def.pasos.length) {
      this.completar();
      return;
    }
    this.prepararPaso();
  }

  completar() {
    const def = this.activa.def;
    this.escena.limpiar();
    GameState.addMoney(def.pago, `mision ${def.id}`);
    if (FACTIONS[def.faccion]) GameState.changeFaction(def.faccion, def.rep);
    GameState.addReputation(3);
    if (!GameState.flags.misiones) GameState.flags.misiones = {};
    GameState.flags.misiones[def.id] = true;

    this.limpiarBlanco();
    this.aro.setVisible(false);
    this.activa = null;
    this.objetivo = null;

    EventBus.emit(EVT.BIG_MESSAGE, {
      title: 'MISION CUMPLIDA',
      subtitle: FACTIONS[def.faccion] ? `+${def.pago} €  ·  ${FACTIONS[def.faccion].short} +${def.rep}` : `+${def.pago} €`,
      color: '#8fd694',
    });
    EventBus.emit(EVT.MISSION_END, { mision: def, ok: true });
    this.refrescarDadores();

    // EL CIERRE (CINEMATICAS['<id>:fin']): lo que pasa justo despues, con su
    // golpe de efecto o su eleccion. Sale un momento despues del cartel de
    // "MISION CUMPLIDA" y la partida se guarda al acabar, que una decision
    // no se pierda por cerrar el juego.
    const cierre = CINEMATICAS[`${def.id}:fin`];
    if (cierre && this.scene.verCinematica) {
      this.hablando = true;
      this.scene.time.delayedCall(2200, () => {
        this.scene.verCinematica(cierre, () => {
          // el final de la historia: el epilogo comun, que cambia segun el
          // camino y quien haya muerto (CINEMATICAS.epilogo)
          if (def.epilogo && CINEMATICAS.epilogo) {
            GameState.flags.historiaAcabada = true;
            this.scene.verCinematica(CINEMATICAS.epilogo, () => {
              this.hablando = false;
              this.refrescarDadores();
              SaveSystem.save();
            });
            return;
          }
          this.hablando = false;
          this.refrescarDadores();
          SaveSystem.save();
        });
      });
    }
  }

  fallar(motivo) {
    const def = this.activa.def;
    // REINTENTAR, como en los GTA: R durante 25 s y se vuelve a empezar desde
    // el ultimo punto de control (`checkpoint: true` en un paso) sin volver a
    // ver la charla
    let desde = 0;
    for (let i = this.activa.paso; i >= 0; i--) {
      if (def.pasos[i] && def.pasos[i].checkpoint) { desde = i; break; }
    }
    this.reintento = { def, desde, hasta: this.scene.time.now + 25000 };
    this.escena.limpiar();
    this.limpiarBlanco();
    this.aro.setVisible(false);
    this.activa = null;
    this.objetivo = null;

    if (FACTIONS[def.faccion]) GameState.changeFaction(def.faccion, -4);
    EventBus.emit(EVT.BIG_MESSAGE, {
      title: 'MISION FALLIDA',
      subtitle: `${motivo}  ·  R para reintentar`,
      color: '#d9584a',
    });
    EventBus.emit(EVT.MISSION_END, { mision: def, ok: false, motivo });
    this.refrescarDadores();
  }

  abortar(motivo) {
    if (this.activa) this.fallar(motivo);
  }

  // R tras fallar: se vuelve a empezar desde el punto de control
  reintentar() {
    const r = this.reintento;
    if (!r || this.activa || this.hablando || this.scene.time.now > r.hasta) return false;
    this.empezar(r.def, r.desde);
    if (r.desde > 0) EventBus.emit(EVT.NOTIFY, { text: 'Desde el ultimo punto de control', tone: 'objective' });
    return true;
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
