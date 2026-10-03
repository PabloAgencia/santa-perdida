import { CityMap } from '../world/CityMap.js';
import { CITY } from '../config/city.js';
import { CIUDAD_GRANDE } from '../config/ciudadGrande.js';
import { TILE, PLAYER, CAMERA, SAVE } from '../config/balance.js';
import { VEHICLE_KEYS, VEHICLES, ENGINES } from '../config/vehicles.js';
import { Player } from '../entities/Player.js';
import { Vehicle } from '../entities/Vehicle.js';
import { JobSystem } from '../systems/JobSystem.js';
import { resolveVehicleCollisions } from '../systems/VehicleCollisions.js';
import { RoadNetwork } from '../world/RoadNetwork.js';
import { TrafficSystem } from '../systems/TrafficSystem.js';
import { TrafficLights } from '../systems/TrafficLights.js';
import { NPCSystem } from '../systems/NPCSystem.js';
import { PoliceSystem } from '../systems/PoliceSystem.js';
import { FactionSystem } from '../systems/FactionSystem.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { PickupSystem } from '../systems/PickupSystem.js';
import { ColeccionablesSystem } from '../systems/ColeccionablesSystem.js';
import { BajoMundoSystem, PRECIO_BUEN_RATO } from '../systems/BajoMundoSystem.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { PisoSystem } from '../systems/PisoSystem.js';
import { LocalSystem } from '../systems/LocalSystem.js';
import { ArmasConfiscadasSystem } from '../systems/ArmasConfiscadasSystem.js';
import { ConcesionarioSystem } from '../systems/ConcesionarioSystem.js';
import { NegocioSystem } from '../systems/NegocioSystem.js';
import { GruaSystem } from '../systems/GruaSystem.js';
import { GuerraTerritorioSystem } from '../systems/GuerraTerritorioSystem.js';
import { TrabajoVehiculoSystem } from '../systems/TrabajoVehiculoSystem.js';
import { JusticieroSystem } from '../systems/JusticieroSystem.js';
import { FACTIONS } from '../config/factions.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { ARMAS } from '../config/weapons.js';
import { ENTRENAR } from '../config/balance.js';
import { GameState } from '../core/GameState.js';
import { SaveSystem } from '../core/SaveSystem.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';
import { PintarCiudad } from '../world/PintarCiudad.js';
import { DanoVehiculos } from '../systems/DanoVehiculos.js';
import { DiaNocheSystem } from '../systems/DiaNocheSystem.js';
import { EncuentroSystem } from '../systems/EncuentroSystem.js';
import { MercadoSystem } from '../systems/MercadoSystem.js';
import { CarreraSystem } from '../systems/CarreraSystem.js';

const IDLE_INPUT = {
  throttle: false, brake: false, left: false, right: false, handbrake: false,
};

// a partir de este precio un coche lleva alarma (punto 18): Bastion y Vela
// GT la llevan, el resto de la gama comprable no
const UMBRAL_ALARMA = 5000;

export class CityScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CityScene', active: false });
  }

  create() {
    // CITY es la ciudad de antes (cuadricula); CIUDAD_GRANDE la nueva
    this.map = new CityMap(CIUDAD_GRANDE).generate();
    this.vehicles = [];
    this.drivingVehicle = null;
    this.autosaveTimer = 0;
    this.hudTimer = 0;
    this.puenteando = null;
    this.jobCooldown = 0;
    this.camAhead = new Phaser.Math.Vector2(0, 0);
    this.respawning = false;

    this.drawGround();
    this.drawCrosswalks();
    this.drawBuildings();
    this.drawLandmarks();

    const loaded = SaveSystem.load();

    this.player = new Player(this, this.map, 0, 0);
    this.jobs = new JobSystem(this, this.map);
    this.net = new RoadNetwork(CITY, this.map);
    // el orden importa: el trafico pide conductores a los NPC al crearse
    this.npcs = new NPCSystem(this, this.map);
    this.lights = new TrafficLights(this, this.net);
    this.traffic = new TrafficSystem(this, this.map, this.net, this.lights);
    this.police = new PoliceSystem(this, this.map, this.net);
    this.factions = new FactionSystem(this, this.map);
    this.missions = new MissionSystem(this, this.map, this.net);
    this.pickups = new PickupSystem(this, this.map);
    this.coleccionables = new ColeccionablesSystem(this, this.map);
    this.bajoMundo = new BajoMundoSystem(this, this.map);

    // Los que "son tuyos" y tienen que salir SIEMPRE en el mismo edificio
    // entre cargas (piso, negocio, guerra de territorio) van primero, y cada
    // uno registra el suyo en `edificiosOcupados`. Los que se reparten al
    // azar en cada carga (armeria, locales, concesionario) van despues y
    // evitan lo ya ocupado: asi nunca hay dos carteles en el mismo sitio,
    // y lo determinista sigue siendolo (lo aleatorio es lo unico que cede).
    this.edificiosOcupados = new Set();
    this.pisos = new PisoSystem(this, this.map);
    this.negocios = new NegocioSystem(this, this.map);
    this.guerra = new GuerraTerritorioSystem(this, this.map);

    this.shops = new ShopSystem(this, this.map);
    this.locales = new LocalSystem(this, this.map);
    this.armasConf = new ArmasConfiscadasSystem(this);
    this.concesionario = new ConcesionarioSystem(this, this.map);
    this.grua = new GruaSystem(this, this.map);
    this.mercado = new MercadoSystem(this, this.map);
    this.carreras = new CarreraSystem(this, this.map, this.net);
    this.taxista = new TrabajoVehiculoSystem(this, this.map, {
      tipo: 'taxista', vehiculo: 'taxi', nombre: 'Taxista',
      pagoBase: 55, pagoPorTile: 1.1, tiempoPorTile: 0.32, bonusATiempo: 70,
    });
    this.ambulanciaJob = new TrabajoVehiculoSystem(this, this.map, {
      tipo: 'ambulancia', vehiculo: 'ambulancia', nombre: 'Ambulancia',
      pagoBase: 70, pagoPorTile: 1.3, tiempoPorTile: 0.36, bonusATiempo: 90,
    });
    this.justiciero = new JusticieroSystem(this, this.map, this.net);
    this.diaNoche = new DiaNocheSystem();
    this.encuentros = new EncuentroSystem(this, this.map);
    this.combat = new CombatSystem(this);
    this.danos = new DanoVehiculos(this);
    this.hurtCooldown = 0;
    this.buildMinimapTexture();

    if (loaded && GameState.vehicles.length > 0) {
      for (const v of GameState.vehicles) {
        // F4: una partida guardada con el mapa de antes podia dejar el coche
        // dentro de una pared (el mapa ha cambiado varias veces): se le busca
        // sitio libre en la calle mas cercana
        let { x, y } = v;
        if (this.map.isSolidBox(x, y, 20, 24)) {
          const libre = this.map.roadSpots
            .filter((s) => !this.map.isSolidBox(s.x, s.y, 34, 34))
            .sort((p, q) => Phaser.Math.Distance.Between(p.x, p.y, x, y)
              - Phaser.Math.Distance.Between(q.x, q.y, x, y))[0];
          if (libre) { x = libre.x; y = libre.y; }
        }
        this.vehicles.push(
          new Vehicle(this, this.map, v.type, x, y, v.angle, {
            id: v.id, hp: v.hp, color: v.color, deTuyo: v.deTuyo,
          })
        );
      }
      // lo mismo para ti: si el guardado te dejo dentro de algo solido
      let px = GameState.player.x;
      let py = GameState.player.y;
      if (this.map.isSolidBox(px, py, 8, 8)) {
        const libre = this.findStartSpot({ x: px, y: py });
        px = libre.x;
        py = libre.y;
      }
      this.player.setPosition(px, py);
    } else {
      this.spawnDefaultVehicles();
      const start = this.findStartSpot();
      this.player.setPosition(start.x, start.y);
    }

    if (loaded && GameState.inVehicleId) {
      const v = this.vehicles.find((x) => x.id === GameState.inVehicleId);
      if (v) this.enterVehicle(v);
    }

    // No se empieza con nada encima: la ciudad es tuya y tu decides. Los
    // encargos se piden con J y las misiones se cogen en sus marcadores.
    if (loaded && GameState.job) this.jobs.restore(GameState.job);

    this.drawStreetLights();
    this.drawStreetProps();
    this.drawHideoutMarker();
    this.setupCamera();
    this.setupInput();
    this.setupEvents();

    this.scene.launch('UIScene');

    // La primera vez que se juega una partida de cero, antes de nada:
    // HISTORIA-SANTA-PERDIDA.txt. `loaded` ya dice si esto viene de un
    // guardado (`SaveSystem.load()` de arriba) o de `GameState.reset()`.
    if (!loaded && !GameState.flags.prologoVisto) this.abrirPrologo();
  }

  abrirPrologo() {
    this.captureState();
    this.scene.pause();
    this.scene.pause('UIScene');
    this.scene.launch('PrologoScene');
  }

  // Sin `desde`, el de siempre: el escondite del principio. Con `desde`
  // (donde acabaste, al morir o al detenerte), el edificio mas cercano de
  // entre el escondite y los pisos que ya son tuyos, para que comprar un
  // piso cerca de donde sueles liarla sirva de algo.
  findStartSpot(desde = null) {
    const h = this.map.hideout;
    const candidatos = [];
    if (h) candidatos.push({ x: h.px, y: h.py, ph: h.ph });
    if (this.pisos) {
      for (const p of this.pisos.pisos) {
        if (GameState.esDueno(p.clave)) candidatos.push({ x: p.edificio.px, y: p.edificio.py });
      }
    }
    if (candidatos.length === 0) return { x: this.map.pixelWidth / 2, y: this.map.pixelHeight / 2 };

    let objetivo = candidatos[0];
    if (desde) {
      let bestD = Infinity;
      for (const c of candidatos) {
        const d = Phaser.Math.Distance.Between(c.x, c.y, desde.x, desde.y);
        if (d < bestD) { bestD = d; objetivo = c; }
      }
    }

    let best = null;
    let bestDist = Infinity;
    for (const s of this.map.sidewalkSpots) {
      const d = Phaser.Math.Distance.Between(s.x, s.y, objetivo.x, objetivo.y);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best || { x: objetivo.x, y: objetivo.y + (objetivo.ph || 0) };
  }

  spawnDefaultVehicles() {
    const spots = Phaser.Utils.Array.Shuffle(this.map.roadSpots.slice());
    const wanted = 18;
    let placed = 0;

    for (const s0 of spots) {
      if (placed >= wanted) break;
      const type = VEHICLE_KEYS[placed % VEHICLE_KEYS.length];
      // en su carril y mirando hacia donde va la calle, sea en el angulo
      // que sea (antes solo habia calles horizontales o verticales)
      const edge = this.net.edgeMasCercano(s0.x, s0.y);
      if (!edge) continue;
      const pr = this.net.progreso(edge, s0.x, s0.y);
      const s = this.net.pointAlong(edge, Phaser.Math.Clamp(pr.t, 0.25, 0.75));
      const angle = edge.angle;

      if (this.map.isSolidBox(s.x, s.y, 34, 34)) continue;
      if (this.vehicles.some((v) => Phaser.Math.Distance.Between(v.x, v.y, s.x, s.y) < 160)) continue;

      const paletteSize = VEHICLES[type].palette.length;
      this.vehicles.push(
        new Vehicle(this, this.map, type, s.x, s.y, angle, {
          color: (placed * 3) % paletteSize,
        })
      );
      placed++;
    }
  }

  // ---------- camara e input ----------

  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.map.pixelWidth, this.map.pixelHeight);
    cam.startFollow(this.player.sprite, true, CAMERA.followLerp, CAMERA.followLerp);
    cam.setZoom(CAMERA.zoomFoot);
    cam.setBackgroundColor(0x0b0d10);
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upArrow: 'UP', downArrow: 'DOWN', leftArrow: 'LEFT', rightArrow: 'RIGHT',
      run: 'SHIFT', enter: 'E', handbrake: 'SPACE', save: 'K', newJob: 'J',
      mapa: 'M', mute: 'N', pausa: 'ESC', progreso: 'P', libreta: 'L',
      atacar: 'F', objetivo: 'Q', arma: 'TAB',
    });
    this.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT,W,A,S,D,E,K,J,M,N,P,L,SHIFT,ESC,F,Q,TAB');

    // el raton tambien pega, y al volante tambien dispara
    this.input.on('pointerdown', (p) => {
      if (p.leftButtonDown() && this.scene.isActive()) {
        // el clic dispara hacia donde apunta el raton (en coordenadas del mundo)
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        this.atacarAhora({ x: w.x, y: w.y });
      }
    });

    // los navegadores no dejan sonar nada hasta que el jugador toca algo
    const wake = () => {
      Audio.start();
      Audio.resume();
    };
    this.input.keyboard.once('keydown', wake);
    this.input.once('pointerdown', wake);
  }

  setupEvents() {
    this.onBeforeSave = () => this.captureState();
    this.onCrash = ({ vehicle, impact }) => {
      // Solo tiembla la pantalla si el golpe es TUYO o te pilla al lado.
      // Antes temblaba por cualquier choque del trafico al otro lado de la
      // ciudad, y sonaba igual de fuerte estuviera donde estuviera.
      const mio = vehicle === this.drivingVehicle;
      const dist = Phaser.Math.Distance.Between(vehicle.x, vehicle.y, this.player.x, this.player.y);
      const cerca = Math.max(0, 1 - dist / 700);

      if (mio) {
        GameState.bumpStat('crashes', 1);
        this.cameras.main.shake(150, Math.min(0.007, impact * 0.000022));
        Audio.crash(impact / 360);
      } else if (cerca > 0) {
        Audio.crash((impact / 360) * cerca * 0.5);
      }

      if (vehicle === this.drivingVehicle && impact > 210) {
        GameState.damage((impact - 210) * 0.05, 'choque');
      }
      // embestir a una patrulla te sube el nivel de busca
      if (
        vehicle.police &&
        this.drivingVehicle &&
        impact > 120 &&
        Phaser.Math.Distance.Between(
          vehicle.x, vehicle.y, this.drivingVehicle.x, this.drivingVehicle.y
        ) < 130
      ) {
        this.police.report(this.player.x, this.player.y, 1);
      }
    };
    this.onJobDone = () => {
      this.jobCooldown = 3;
      Audio.delivered();
    };
    this.onJobStage = () => Audio.pickup();
    this.onJobStarted = () => Audio.newJob();

    this.onPedHit = ({ pedestrian, speed, fatal, culpaDelJugador }) => {
      this.npcs.scare(pedestrian.x, pedestrian.y, fatal ? 420 : 300);

      // un atropello del trafico asusta a la gente, pero no es asunto tuyo
      if (!culpaDelJugador) return;

      // Un atropello mortal PONE la busca en 1, no la suma: antes sumaba (con
      // report(), igual que embestir una patrulla) y cargarte a cuatro
      // peatones de una tacada disparaba a 6 estrellas de golpe, mientras que
      // uno solo ya daba 2. Ahora es el mismo criterio que un tiro delante de
      // testigos (`reportarCrimen`, ver CombatSystem): un atropello no es mas
      // grave que eso. Uno que no mata no avisa a nadie.
      if (fatal) this.police.denunciar(pedestrian.x, pedestrian.y, 1);
      Audio.crash(Math.min(0.7, speed / 400));
      this.cameras.main.shake(fatal ? 180 : 110, fatal ? 0.005 : 0.003);
      EventBus.emit(EVT.NOTIFY, {
        text: fatal ? 'Te lo has llevado por delante' : 'Has atropellado a alguien',
        tone: 'danger',
      });
      if (pedestrian.faction) this.factions.onMemberHurt(pedestrian.faction);
    };
    this.onHideoutExit = (datos) => {
      // se sale a la puerta por la que se entro (el escondite o el piso que
      // fuera), no siempre a la del escondite
      const puerta = this.interiorDoor || this.hideoutDoor;
      if (puerta) this.player.setPosition(puerta.x, puerta.y);
      this.player.setVisible(true);
      // por si el cuerpo cambio dentro (el gimnasio sube musculo o quema
      // grasa): no hace nada si el tramo sigue siendo el mismo
      this.player.actualizarCuerpo();
      this.hurtCooldown = 1.5;
      this.cameras.main.startFollow(
        this.player.sprite, true, CAMERA.followLerp, CAMERA.followLerp
      );
      this.cameras.main.fadeIn(420, 0, 0, 0);
      if (datos && datos.sacarCocheDe) this.sacarCocheDelGaraje(datos.sacarCocheDe, puerta);
      if (datos && datos.cocheComprado) this.entregarCocheComprado(datos.cocheComprado, puerta);
    };
    this.onDead = () => {
      // sale despedido hacia atras y un poco a un lado, no siempre igual
      this.player.iniciarRagdoll(this.player.angle + Math.PI + (Math.random() - 0.5) * 0.8);
      this.respawn('muerto');
    };
    this.onBusted = () => this.respawn('busted');

    EventBus.on(EVT.PED_HIT, this.onPedHit);
    EventBus.on(EVT.HIDEOUT_EXIT, this.onHideoutExit);
    EventBus.on(EVT.PLAYER_DEAD, this.onDead);
    EventBus.on(EVT.PLAYER_BUSTED, this.onBusted);

    EventBus.on(EVT.BEFORE_SAVE, this.onBeforeSave);
    EventBus.on(EVT.VEHICLE_CRASHED, this.onCrash);
    EventBus.on(EVT.JOB_DONE, this.onJobDone);
    EventBus.on(EVT.JOB_STAGE, this.onJobStage);
    EventBus.on(EVT.JOB_STARTED, this.onJobStarted);

    this.events.once('shutdown', () => {
      EventBus.off(EVT.BEFORE_SAVE, this.onBeforeSave);
      EventBus.off(EVT.VEHICLE_CRASHED, this.onCrash);
      EventBus.off(EVT.JOB_DONE, this.onJobDone);
      EventBus.off(EVT.JOB_STAGE, this.onJobStage);
      EventBus.off(EVT.JOB_STARTED, this.onJobStarted);
      EventBus.off(EVT.PED_HIT, this.onPedHit);
      EventBus.off(EVT.HIDEOUT_EXIT, this.onHideoutExit);
      EventBus.off(EVT.PLAYER_DEAD, this.onDead);
      EventBus.off(EVT.PLAYER_BUSTED, this.onBusted);
      if (this.danos) this.danos.limpiar();
    });
  }

  captureState() {
    GameState.player = {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      angle: +this.player.angle.toFixed(3),
    };
    GameState.inVehicleId = this.drivingVehicle ? this.drivingVehicle.id : null;
    // el trafico se genera solo al vuelo, no tiene sentido guardarlo; los
    // aparcados por LocalSystem (ambulancia, patrulla de la comisaria)
    // tampoco, que ese sistema los recrea siempre igual al cargar (si se
    // guardaran, se duplicarian cada carga)
    GameState.vehicles = this.vehicles
      .filter((v) => !v.ai && !v.deLocal)
      .map((v) => v.serialize());
  }

  // ---------- entrar y salir del coche ----------

  nearestVehicle() {
    let best = null;
    let bestDist = PLAYER.enterRange;
    for (const v of this.vehicles) {
      // un chasis quemado no se conduce: es chatarra en mitad de la calle
      if (v.quemado) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, v.x, v.y);
      if (d < bestDist) {
        bestDist = d;
        best = v;
      }
    }
    return best;
  }

  // Decide si se entra sin mas (coche ocupado: se saca a quien lleve dentro,
  // o coche ya tuyo) o si hace falta puentearlo primero (punto 18: "robar
  // coches con su gracia, barra de puenteo", a lo Chinatown Wars).
  intentarEntrarEnVehiculo(v) {
    const ocupado = v.ai || v.police;
    if (ocupado || v.deTuyo || v.puenteado) {
      this.enterVehicle(v);
      return;
    }
    this.empezarPuenteo(v);
  }

  // Los caros llevan alarma: saltar la puenteas igual, pero suena y sube la
  // busca en el acto. Cuanto mas caro, mas tarda en arrancar.
  empezarPuenteo(v) {
    const caro = v.stats.price >= UMBRAL_ALARMA;
    this.puenteando = { vehicle: v, tiempo: 0, duracion: caro ? 2.6 : 1.6 };

    const barW = 46;
    this.puenteoBarraFondo = this.add.image(v.x, v.y - 34, 'px')
      .setDisplaySize(barW, 7).setTint(0x05060a).setAlpha(0.75).setDepth(9999);
    this.puenteoBarra = this.add.image(v.x - barW / 2, v.y - 34, 'px')
      .setOrigin(0, 0.5).setDisplaySize(1, 5).setTint(0xe8b54a).setDepth(9999);
    EventBus.emit(EVT.NOTIFY, { text: 'Puenteando el coche...', tone: 'dim' });
  }

  updatePuenteo(dt) {
    const p = this.puenteando;
    // si el coche desaparece de debajo (lo destroza otra cosa, se lo lleva
    // la grua de otro sistema...) se corta sin mas
    if (!this.vehicles.includes(p.vehicle) || p.vehicle.quemado) {
      this.cancelarPuenteo();
      return;
    }
    // moverte lo cancela: no estas ya pendiente del coche
    const k = this.keys;
    if (k.left.isDown || k.right.isDown || k.up.isDown || k.down.isDown ||
        k.leftArrow.isDown || k.rightArrow.isDown || k.upArrow.isDown || k.downArrow.isDown) {
      this.cancelarPuenteo();
      return;
    }

    p.tiempo += dt;
    const barW = 46;
    // el coche se puede desplazar si otro le da un golpe mientras puenteas:
    // la barra le sigue para no quedarse flotando en el sitio equivocado
    this.puenteoBarraFondo.setPosition(p.vehicle.x, p.vehicle.y - 34);
    this.puenteoBarra.setPosition(p.vehicle.x - barW / 2, p.vehicle.y - 34);
    this.puenteoBarra.setDisplaySize(Math.max(1, barW * (p.tiempo / p.duracion)), 5);

    if (p.tiempo >= p.duracion) {
      const v = p.vehicle;
      const caro = v.stats.price >= UMBRAL_ALARMA;
      this.puenteoBarraFondo.destroy();
      this.puenteoBarra.destroy();
      this.puenteando = null;
      v.puenteado = true;
      if (caro) this.dispararAlarma();
      this.enterVehicle(v);
    }
  }

  cancelarPuenteo() {
    if (!this.puenteando) return;
    this.puenteoBarraFondo.destroy();
    this.puenteoBarra.destroy();
    this.puenteando = null;
  }

  dispararAlarma() {
    Audio.notes([880, 587, 880, 587, 880], 0.08, 'square', 0.16);
    GameState.raiseWanted(1);
    EventBus.emit(EVT.NOTIFY, { text: 'La alarma ha saltado', tone: 'danger' });
  }

  enterVehicle(v) {
    // si el coche llevaba a alguien dentro, se baja: unos huyen y otros se
    // encaran, como en un robo de coche de verdad
    if (v.police && this.police) {
      // la patrulla tiene su propio camino: sus agentes no existen mientras
      // van dentro, hay que crearlos al bajarlos
      this.police.robarPatrulla(v);
    } else if (v.ai && this.traffic) {
      const cond = this.traffic.soltarConductor(v);
      if (cond) this.npcs.expulsarConductor(cond, v, this.player);
    }

    this.drivingVehicle = v;
    v.occupied = true;
    v.encendido = true;
    this.player.setVisible(false);
    this.player.setPosition(v.x, v.y);
    EventBus.emit(EVT.VEHICLE_ENTERED, { vehicle: v });
    EventBus.emit(EVT.NOTIFY, { text: `${v.stats.name}`, tone: 'dim' });
  }

  exitVehicle() {
    const v = this.drivingVehicle;
    if (!v) return;
    // si te bajas con la pasajera del bajo mundo a medio camino, se acabo:
    // no se queda esperando en un coche sin nadie al volante
    this.bajoMundo.cancelar();
    const spot = v.findExitSpot();
    v.occupied = false;
    v.encendido = false;
    v.frenando = false;
    v.syncSprite();
    this.drivingVehicle = null;
    this.player.setPosition(spot.x, spot.y);
    this.player.setVisible(true);
    this.cameras.main.setFollowOffset(0, 0);
    EventBus.emit(EVT.VEHICLE_EXITED, { vehicle: v });
  }

  // ---------- bucle ----------

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const k = this.keys;
    GameState.avanzarCooldownVenta(dt);
    if (GameState.avanzarPerdidaBusca(dt)) {
      EventBus.emit(EVT.NOTIFY, { text: 'Te has librado de la policia', tone: 'money' });
    }

    // acabas de morir: el mundo se congela un instante mientras el cuerpo
    // cae y se desmadeja, y la pantalla se funde a negro encima (ver respawn)
    if (this.player.ragdoll) {
      this.player.actualizarRagdoll(dt);
      return;
    }

    // puenteando un coche que no es tuyo: quieto ahi hasta que arranque
    // (o se cancela solo si intentas moverte, ver updatePuenteo)
    if (this.puenteando) {
      this.updatePuenteo(dt);
      return;
    }

    const left = k.left.isDown || k.leftArrow.isDown;
    const right = k.right.isDown || k.rightArrow.isDown;
    const up = k.up.isDown || k.upArrow.isDown;
    const down = k.down.isDown || k.downArrow.isDown;

    if (Phaser.Input.Keyboard.JustDown(k.enter)) {
      // en coche: primero se prueba a meterlo en el garaje de tu piso o a
      // entregarlo en la grua; solo si ninguno aplica el E te baja como siempre
      if (this.drivingVehicle) {
        if (
          !this.entrarEnPisoCerca() && !this.entregarEnGruaCerca() &&
          !this.venderEnDesguaceCerca() && !this.empezarCarreraCerca() &&
          !this.pasarBuenRatoCerca()
        ) this.exitVehicle();
      } else if (
        !this.missions.intentarEmpezar(this.player.x, this.player.y) &&
        !this.encuentros.intentarHablar(this.player.x, this.player.y) &&
        !this.enterHideout() &&
        !this.entrarEnPisoCerca() &&
        !this.entrarEnLaArmeria() &&
        !this.armasConf.usar() &&
        !this.usarLocalCerca() &&
        !this.usarNegocioCerca() &&
        !this.iniciarGuerraCerca() &&
        !this.entrarEnConcesionarioCerca() &&
        !this.usarMaquinaCerca()
      ) {
        const v = this.nearestVehicle();
        if (v) this.intentarEntrarEnVehiculo(v);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(k.pausa)) {
      this.abrirPausa();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(k.save)) {
      SaveSystem.save();
      EventBus.emit(EVT.NOTIFY, { text: 'Partida guardada', tone: 'dim' });
    }

    // ---- pelea ----
    if (!this.drivingVehicle) {
      if (Phaser.Input.Keyboard.JustDown(k.atacar)) this.atacarAhora();
      // cambiar de objetivo vale a pie y al volante
      if (Phaser.Input.Keyboard.JustDown(k.objetivo)) {
        this.combat.siguienteObjetivo(this.drivingVehicle || this.player);
      }
      if (Phaser.Input.Keyboard.JustDown(k.arma)) this.combat.cambiarArma(1);
    }

    if (Phaser.Input.Keyboard.JustDown(k.mapa)) {
      this.abrirMapa();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(k.progreso)) {
      this.abrirProgreso();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(k.libreta)) {
      this.abrirLibreta();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(k.mute)) {
      const muted = Audio.toggleMute();
      EventBus.emit(EVT.NOTIFY, {
        text: muted ? 'Sonido apagado' : 'Sonido encendido',
        tone: 'dim',
      });
    }

    if (this.drivingVehicle) {
      this.drivingVehicle.update(dt, {
        throttle: up,
        brake: down,
        left,
        right,
        handbrake: k.handbrake.isDown,
        // cuanto mejor conduces, mejor agarra el coche
        pericia: GameState.atributo('volante') / 100,
        // la mejora del taxista: 3% de velocidad extra por nivel, siempre
        atajos: GameState.nivelTrabajo('taxista') * 0.03,
      });
      const metros = (this.drivingVehicle.speed * dt) / 10;
      GameState.bumpStat('metersDriven', metros);
      GameState.subirAtributo('volante', metros * ENTRENAR.volantePorMetro);
    } else {
      this.player.update(dt, { left, right, up, down, run: k.run.isDown });
    }

    this.diaNoche.update(dt);
    this.lights.update(dt, this.player.x, this.player.y);

    // Para el trafico tu tambien eres un peaton cuando vas a pie: antes no
    // estabas en esta lista y ningun coche levantaba el pie por ti.
    const gente = this.drivingVehicle
      ? this.npcs.people
      : this.npcs.people.concat(this.player);
    this.traffic.update(dt, this.player.x, this.player.y, gente);

    // los aparcados solo gastan calculo mientras alguien los mueve
    for (const v of this.vehicles) {
      if (v === this.drivingVehicle || v.ai) continue;
      if (v.speed < 2) {
        v.vx = 0;
        v.vy = 0;
        // el parado con la barra de vida a la vista la repinta para que se esconda a su hora
        if (v.vidaBarra.visible) v.syncSprite();
        continue;
      }
      v.update(dt, IDLE_INPUT);
    }

    resolveVehicleCollisions(this.vehicles);
    this.npcs.update(
      dt, this.player.x, this.player.y, this.vehicles, this.player,
      !this.drivingVehicle, this.drivingVehicle
    );
    this.police.update(dt, this.player, this.drivingVehicle);
    this.factions.update(dt, this.player.x, this.player.y);
    this.missions.update(dt, this.player, this.drivingVehicle);
    this.encuentros.update(dt, this.player, !!this.drivingVehicle);
    this.resolvePlayerVsVehicles();
    this.updateLamps();
    this.checkPlayerHarm(dt);
    this.pickups.update(dt, this.player, !!this.drivingVehicle);
    this.coleccionables.update(this.player, !!this.drivingVehicle);
    this.bajoMundo.update(dt, this.drivingVehicle);
    this.shops.update(this.player, !!this.drivingVehicle);
    this.pisos.update(this.player, !!this.drivingVehicle);
    this.locales.update(this.player, !!this.drivingVehicle);
    if (!this.drivingVehicle) this.concesionario.update(this.player);
    this.negocios.update(dt, this.player);
    this.grua.update(this.player, this.drivingVehicle);
    this.mercado.update(dt, this.player, this.drivingVehicle);
    this.carreras.update(dt, this.player, this.drivingVehicle);
    this.guerra.update(dt, this.player, !!this.drivingVehicle);
    this.combat.update(dt, this.player, !this.drivingVehicle, this.drivingVehicle);
    this.danos.update(dt, this.vehicles, this.player, this.drivingVehicle);
    this.encanonar();

    // el coche te revienta debajo: te suelta en la calle
    if (this.drivingVehicle && this.drivingVehicle.quemado) this.exitVehicle();

    if (this.drivingVehicle) {
      const v = this.drivingVehicle;
      this.player.setPosition(v.x, v.y);
      Audio.engine(true, v.speed / v.stats.maxSpeed, up, ENGINES[v.stats.sonido || v.stats.clase]);
      Audio.skid(Math.max(0, (v.lateral - 45) / 190));
    } else {
      Audio.engine(false, 0, false);
      Audio.skid(0);
    }

    Audio.siren(this.police.nivelSirena(this.player.x, this.player.y));

    this.jobs.update(dt, this.player.x, this.player.y);
    this.armasConf.update(dt, this.player, !!this.drivingVehicle);
    this.taxista.update(dt, this.player, this.drivingVehicle);
    this.ambulanciaJob.update(dt, this.player, this.drivingVehicle);
    this.justiciero.update(dt, this.player);

    // J ofrece un trabajo: cual, segun lo que conduzcas ahora mismo (taxi,
    // ambulancia o patrulla), y si no, el reparto generico de siempre. Solo
    // uno activo a la vez.
    const hayTrabajoActivo = this.jobs.active || this.taxista.carrera ||
      this.ambulanciaJob.carrera || !!this.justiciero.fugitivo;
    if (!hayTrabajoActivo && Phaser.Input.Keyboard.JustDown(k.newJob)) {
      if (this.taxista.disponible(this.drivingVehicle)) {
        this.taxista.ofrecer({ x: this.player.x, y: this.player.y });
      } else if (this.ambulanciaJob.disponible(this.drivingVehicle)) {
        this.ambulanciaJob.ofrecer({ x: this.player.x, y: this.player.y });
      } else if (this.justiciero.disponible(this.drivingVehicle)) {
        this.justiciero.ofrecer({ x: this.player.x, y: this.player.y });
      } else {
        this.jobs.offerNew({ x: this.player.x, y: this.player.y });
      }
    }

    this.updateCamera(dt);
    this.actualizarCapas();

    this.autosaveTimer += delta;
    if (this.autosaveTimer >= SAVE.autosaveMs) {
      this.autosaveTimer = 0;
      SaveSystem.save();
    }

    this.hudTimer += delta;
    if (this.hudTimer >= 90) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  // a pie no se puede atravesar un coche: te empuja fuera
  resolvePlayerVsVehicles() {
    if (this.drivingVehicle) return;
    const r = this.player.radius;

    for (const v of this.vehicles) {
      if (Phaser.Math.Distance.Between(v.x, v.y, this.player.x, this.player.y) > v.stats.length) {
        continue;
      }
      for (const c of v.getCircles()) {
        const dx = this.player.x - c.x;
        const dy = this.player.y - c.y;
        const d = Math.hypot(dx, dy);
        const overlap = c.r + r - d;
        if (overlap <= 0) continue;

        const nx = d > 0.001 ? dx / d : 1;
        const ny = d > 0.001 ? dy / d : 0;
        const px = this.player.x + nx * overlap;
        const py = this.player.y + ny * overlap;

        // si detras hay pared, salir por el eje que quede libre
        if (!this.map.isSolidBox(px, py, r, r)) {
          this.player.setPosition(px, py);
        } else if (!this.map.isSolidBox(px, this.player.y, r, r)) {
          this.player.setPosition(px, this.player.y);
        } else if (!this.map.isSolidBox(this.player.x, py, r, r)) {
          this.player.setPosition(this.player.x, py);
        }
      }
    }
  }

  // farolas: se las lleva por delante el que va rapido, y frenan a quien pasa
  updateLamps() {
    const cerca = [];
    for (const lamp of this.lamps) {
      if (Phaser.Math.Distance.Between(lamp.x, lamp.y, this.player.x, this.player.y) > 1000) {
        continue;
      }
      cerca.push(lamp);
    }

    for (const lamp of cerca) {
      if (!lamp.alive) continue;

      for (const v of this.vehicles) {
        if (v.speed < 35) continue;
        if (Phaser.Math.Distance.Between(v.x, v.y, lamp.x, lamp.y) > v.stats.length) continue;

        let toca = false;
        for (const c of v.getCircles()) {
          if (Math.hypot(c.x - lamp.x, c.y - lamp.y) < c.r + lamp.radius) {
            toca = true;
            break;
          }
        }
        if (!toca) continue;

        if (v.speed > 80) {
          // la farola se rompe y cae, y el coche apenas lo nota
          if (lamp.romper(v.x, v.y)) {
            v.vx *= 0.92;
            v.vy *= 0.92;
            v.hp = Math.max(0, v.hp - 1.5);
            Audio.crash(0.25);
            if (v === this.drivingVehicle) this.cameras.main.shake(90, 0.0015);
          }
        } else {
          // muy despacio no la tiras: te roza y ya
          const a = Math.atan2(v.y - lamp.y, v.x - lamp.x);
          v.vx += Math.cos(a) * 25;
          v.vy += Math.sin(a) * 25;
        }
      }
    }

    // a pie tampoco se atraviesa el poste
    if (!this.drivingVehicle) {
      for (const lamp of cerca) {
        const dx = this.player.x - lamp.x;
        const dy = this.player.y - lamp.y;
        const d = Math.hypot(dx, dy);
        const solape = lamp.radius + this.player.radius - d;
        if (solape <= 0) continue;
        const nx = d > 0.001 ? dx / d : 1;
        const ny = d > 0.001 ? dy / d : 0;
        this.player.setPosition(
          this.player.x + nx * solape,
          this.player.y + ny * solape
        );
      }
    }
  }

  checkPlayerHarm(dt) {
    if (this.hurtCooldown > 0) this.hurtCooldown -= dt;
    if (this.drivingVehicle || this.hurtCooldown > 0 || GameState.health <= 0) return;

    for (const v of this.vehicles) {
      if (v.speed < 55) continue;
      if (Phaser.Math.Distance.Between(v.x, v.y, this.player.x, this.player.y) > v.stats.length) {
        continue;
      }
      for (const c of v.getCircles()) {
        if (Math.hypot(this.player.x - c.x, this.player.y - c.y) < c.r + this.player.radius) {
          this.hurtCooldown = 0.9;
          const a = Math.atan2(this.player.y - v.y, this.player.x - v.x);
          this.player.setPosition(
            this.player.x + Math.cos(a) * 24,
            this.player.y + Math.sin(a) * 24
          );
          this.cameras.main.shake(120, 0.004);
          Audio.crash(0.45);
          GameState.damage(v.speed * 0.14, 'atropello');
          return;
        }
      }
    }
  }

  respawn(reason) {
    if (this.respawning) return;
    this.respawning = true;
    this.missions.abortar(reason === 'busted' ? 'Te han detenido' : 'Has muerto');
    if (this.guerra && this.guerra.activo) this.guerra.cancelar();

    // se llevan una parte, nunca todo: quedarte a cero no deja jugar
    const fee = Math.min(300, Math.round(GameState.money * 0.25));
    const busted = reason === 'busted';

    Audio.engine(false, 0, false);
    Audio.skid(0);
    this.cameras.main.fadeOut(420, 0, 0, 0);

    EventBus.emit(EVT.BIG_MESSAGE, {
      title: busted ? 'TE HAN DETENIDO' : 'ESTAS MUERTO',
      subtitle: busted
        ? `Sales de comisaria sin armas. Fianza: ${fee} €`
        : `Despiertas en el hospital sin armas. Te cobran ${fee} €`,
    });

    this.time.delayedCall(1500, () => {
      if (fee > 0) GameState.spendMoney(fee, reason);
      GameState.setWanted(0);
      GameState.heal(GameState.vidaMaxima);
      GameState.blindaje = 0;   // el chaleco se queda donde te caiste
      this.police.clearAll();

      if (this.drivingVehicle) {
        this.drivingVehicle.occupied = false;
        this.drivingVehicle = null;
        this.cameras.main.setFollowOffset(0, 0);
      }
      // B4: te despiertas en la comisaria (detenido) o en el hospital
      // (muerto), y sin armas: se quedan en un aro rojo ahi al lado
      const sitio = this.sitioDeDespertar(busted);
      const spot = sitio ? sitio.spot : this.findStartSpot({ x: this.player.x, y: this.player.y });
      if (sitio) this.armasConf.confiscar(busted ? 'busted' : 'muerto', sitio.marca);
      this.player.terminarRagdoll();
      this.player.setVisible(true);

      this.player.setPosition(spot.x, spot.y);
      this.hurtCooldown = 2;
      this.cameras.main.startFollow(
        this.player.sprite, true, CAMERA.followLerp, CAMERA.followLerp
      );
      this.cameras.main.fadeIn(600, 0, 0, 0);
      this.respawning = false;
    });
  }

  // El local mas cercano del tipo que toca (comisaria / hospital): donde
  // despiertas y, a unos pasos, el aro para recuperar las armas.
  sitioDeDespertar(busted) {
    const clave = busted ? 'comisaria' : 'hospital';
    const lista = this.locales.locales.filter((l) => l.cfg.clave === clave);
    if (lista.length === 0) return null;
    let local = lista[0];
    let mejor = Infinity;
    for (const l of lista) {
      const d = Phaser.Math.Distance.Between(l.x, l.y, this.player.x, this.player.y);
      if (d < mejor) { mejor = d; local = l; }
    }
    // el aro, apartado de la puerta hacia fuera del edificio y en suelo libre
    const base = Math.atan2(local.y - local.edificio.py, local.x - local.edificio.px);
    let marca = { x: local.x, y: local.y };
    for (const giro of [0, 0.8, -0.8, 1.6, -1.6, Math.PI]) {
      const x = local.x + Math.cos(base + giro) * 78;
      const y = local.y + Math.sin(base + giro) * 78;
      if (this.map.isSolidBox(x, y, 16, 16) || this.map.isRoadPoint(x, y)) continue;
      marca = { x, y };
      break;
    }
    return { spot: { x: local.x, y: local.y }, marca };
  }

  // marcador giratorio en la puerta del escondite, como los de GTA
  drawHideoutMarker() {
    const h = this.map.hideout;
    if (!h) return;

    // La puerta se pone en el lado que da a la calle y en sitio LIBRE. Antes
    // se plantaba 26 px por debajo a ciegas y caia dentro del edificio de al
    // lado: al salir del escondite aparecias encajado en una pared.
    const candidatos = [];
    for (const dist of [24, 34, 46, 60]) {
      candidatos.push(
        { x: h.px, y: h.py + h.ph / 2 + dist },
        { x: h.px, y: h.py - h.ph / 2 - dist },
        { x: h.px + h.pw / 2 + dist, y: h.py },
        { x: h.px - h.pw / 2 - dist, y: h.py }
      );
    }

    let mejor = null;
    for (const c of candidatos) {
      if (this.map.isSolidBox(c.x, c.y, 14, 14)) continue;
      // mejor aun si mira a la calle
      if (this.map.isRoadPoint(c.x, c.y)) continue;
      mejor = c;
      break;
    }
    if (!mejor) {
      mejor = candidatos.find((c) => !this.map.isSolidBox(c.x, c.y, 14, 14)) || candidatos[0];
    }

    this.hideoutDoor = mejor;

    const aro = this.add.image(this.hideoutDoor.x, this.hideoutDoor.y, 'ring')
      .setDisplaySize(64, 64).setTint(0xe8b54a).setDepth(6);
    this.tweens.add({
      targets: aro, scale: { from: 0.85, to: 1.1 },
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.add.image(this.hideoutDoor.x, this.hideoutDoor.y, 'px')
      .setDisplaySize(16, 20).setTint(0xe8b54a).setAlpha(0.8).setDepth(6);
  }

  atacarAhora(clic = null) {
    // al volante se dispara por la ventanilla, y solo con una mano
    if (this.drivingVehicle) {
      this.combat.dispararDesdeCoche(this.drivingVehicle, clic);
      return;
    }
    this.combat.atacar(this.player, this.player.running, clic);
  }

  // EL BRAZO SIGUE AL OBJETIVO. Con un arma de fuego y alguien fijado, el
  // personaje le encañona aunque este andando hacia otro lado. Con los puños
  // o el bate no: ahi el brazo solo sale al pegar.
  encanonar() {
    const obj = this.combat.objetivo;
    const arma = ARMAS[GameState.armaActual] || ARMAS.puno;

    if (!obj || obj.down || arma.cuerpo || this.drivingVehicle) {
      this.player.apuntarA(null);
      return;
    }
    this.player.apuntarA(
      Math.atan2(obj.y - this.player.y, obj.x - this.player.x),
      !!arma.dosManos
    );
  }

  // la armeria: E en la puerta y se abre el mostrador con la ciudad congelada
  entrarEnLaArmeria() {
    if (!this.shops || !this.shops.cerca) return false;
    if (GameState.wanted > 0) {
      EventBus.emit(EVT.NOTIFY, { text: 'Con la policia detras no te abren', tone: 'danger' });
      return true;
    }
    Audio.engine(false, 0, false);
    this.captureState();
    this.scene.pause();
    this.scene.pause('UIScene');
    this.scene.launch('ShopScene');
    return true;
  }

  // hospital, taller de pintura y sitios de comida: E en la puerta (o dentro
  // del coche, en el taller) y LocalSystem resuelve que pasa. La comisaria
  // no tiene accion (accion: 'ninguna'), asi que no consume el E.
  usarLocalCerca() {
    const local = this.locales && this.locales.cerca;
    if (!local || local.cfg.accion === 'ninguna') return false;

    // El gimnasio no es un efecto instantaneo como curar o comer: se entra,
    // como en un piso o el concesionario. La cuota se cobra en la puerta.
    if (local.cfg.accion === 'gimnasio') {
      if (GameState.wanted > 0) {
        EventBus.emit(EVT.NOTIFY, { text: 'Con la policia detras no puedes entrar', tone: 'danger' });
        return true;
      }
      if (!GameState.canAfford(local.cfg.precio)) {
        EventBus.emit(EVT.NOTIFY, {
          text: `${local.cfg.nombre}: ${local.cfg.precio} €. No te llega`, tone: 'danger',
        });
        return true;
      }
      GameState.spendMoney(local.cfg.precio, 'gimnasio');
      this.interiorDoor = { x: local.x, y: local.y, edificio: local.edificio };
      this.abrirInterior({}, 'GimnasioScene');
      return true;
    }

    // EL CLUB: misma mecanica que el gimnasio (se paga en la puerta, se
    // entra de verdad). Con la policia detras tampoco se puede entrar: no
    // tendria sentido colarte en El Terciopelo con dos coches patrulla
    // parados en la puerta.
    if (local.cfg.accion === 'club') {
      if (GameState.wanted > 0) {
        EventBus.emit(EVT.NOTIFY, { text: 'Con la policia detras no te dejan pasar', tone: 'danger' });
        return true;
      }
      if (!GameState.canAfford(local.cfg.precio)) {
        EventBus.emit(EVT.NOTIFY, {
          text: `${local.cfg.nombre}: ${local.cfg.precio} €. No te llega`, tone: 'danger',
        });
        return true;
      }
      GameState.spendMoney(local.cfg.precio, 'club');
      this.interiorDoor = { x: local.x, y: local.y, edificio: local.edificio };
      this.abrirInterior({}, 'ClubScene');
      return true;
    }

    const resultado = this.locales.usar(local, this.drivingVehicle);
    if (resultado) EventBus.emit(EVT.NOTIFY, { text: resultado.texto, tone: resultado.tono });
    return true;
  }

  // el negocio: si no es tuyo, E lo compra; si ya es tuyo, E cobra la caja
  // (salvo que este bajo ataque de banda, ver NegocioSystem)
  usarNegocioCerca() {
    if (!this.negocios || !this.negocios.cerca) return false;
    const n = this.negocios.cerca;

    if (!GameState.esDueno(n.clave)) {
      const que = this.negocios.comprar(n);
      if (que === 'sin-dinero') {
        EventBus.emit(EVT.NOTIFY, {
          text: `${n.cfg.nombre}: ${n.cfg.precio} €. No te llega`, tone: 'danger',
        });
      } else if (que === 'comprado') {
        Audio.notes([392, 523.25, 659.25], 0.1);
        EventBus.emit(EVT.BIG_MESSAGE, { title: 'YA ES TUYO', subtitle: n.cfg.nombre });
        EventBus.emit(EVT.NOTIFY, { text: `${n.cfg.nombre} comprado`, tone: 'money' });
      }
      return true;
    }

    const resultado = this.negocios.cobrar(n);
    if (resultado) EventBus.emit(EVT.NOTIFY, { text: resultado.texto, tone: resultado.tono });
    return true;
  }

  // guerra por el territorio: E en el punto de una banda y empiezan las oleadas
  iniciarGuerraCerca() {
    if (!this.guerra || !this.guerra.cerca) return false;
    if (GameState.wanted > 0) {
      EventBus.emit(EVT.NOTIFY, { text: 'Con la policia detras no es buen momento', tone: 'danger' });
      return true;
    }
    this.guerra.iniciar(this.guerra.cerca);
    return true;
  }

  // el concesionario: E en la puerta y se entra, como un piso. Lo que se
  // compra dentro (ConcesionarioScene) sale a esta misma puerta al salir.
  entrarEnConcesionarioCerca() {
    if (!this.concesionario || !this.concesionario.cerca) return false;

    if (GameState.wanted > 0) {
      EventBus.emit(EVT.NOTIFY, { text: 'Con la policia detras no puedes entrar', tone: 'danger' });
      return true;
    }
    this.interiorDoor = { x: this.concesionario.puerta.x, y: this.concesionario.puerta.y, edificio: this.concesionario.puerta.edificio };
    this.abrirInterior({}, 'ConcesionarioScene');
    return true;
  }

  // la maquina de refrescos de la acera: E al lado y a beber
  usarMaquinaCerca() {
    if (!this.pickups.cercaDeMaquina) return false;
    const engorda = this.pickups.usarMaquina();
    if (engorda) this.player.actualizarCuerpo();
    return true;
  }

  // "PASAR UN BUEN RATO" (BajoMundoSystem, HISTORIA-SANTA-PERDIDA.txt): dos
  // pasos, como pidio Pablo. Primero se recoge en la calle (sube al coche,
  // no se ve nada raro, solo desaparece de la acera); despues hay que
  // llevarla a uno de los sitios privados marcados en la ciudad, y alli es
  // donde se cobra de verdad, poco a poco mientras pasan los segundos
  // (`BajoMundoSystem.tickSesion`). Con la policia detras no vale ninguno de
  // los dos pasos.
  pasarBuenRatoCerca() {
    if (this.bajoMundo.sesion) return true;   // ya en marcha, el E no hace nada mas

    if (this.bajoMundo.sitioCerca) {
      if (GameState.wanted > 0) {
        EventBus.emit(EVT.NOTIFY, { text: 'No hay tiempo para eso ahora', tone: 'danger' });
        return true;
      }
      const resultado = this.bajoMundo.empezar();
      if (resultado) EventBus.emit(EVT.NOTIFY, { text: resultado.texto, tone: resultado.tono });
      return true;
    }

    if (this.bajoMundo.cerca) {
      if (GameState.wanted > 0) {
        EventBus.emit(EVT.NOTIFY, { text: 'No hay tiempo para eso ahora', tone: 'danger' });
        return true;
      }
      const resultado = this.bajoMundo.recoger();
      if (resultado) EventBus.emit(EVT.NOTIFY, { text: resultado.texto, tone: resultado.tono });
      return true;
    }

    return false;
  }

  // el mapa entero: se congela la ciudad y se abre encima, como la pausa
  abrirMapa() {
    this.captureState();
    this.scene.pause();
    this.scene.pause('UIScene');
    this.scene.launch('MapaScene');
  }

  // el "100%" al estilo San Andreas: P congela la ciudad y enseña cuanto
  // falta
  abrirProgreso() {
    this.captureState();
    this.scene.pause();
    this.scene.pause('UIScene');
    this.scene.launch('ProgresoScene');
  }

  // la libreta del mercado: L congela la ciudad y dice donde pagan mejor
  // los coches ahora mismo, en los desguaces (MercadoSystem)
  abrirLibreta() {
    this.captureState();
    this.scene.pause();
    this.scene.pause('UIScene');
    this.scene.launch('MercadoScene', { filas: this.mercado.resumen(this.player.x, this.player.y) });
  }

  // menu de pausa: la ciudad se congela y se abre por encima
  abrirPausa() {
    this.captureState();
    Audio.engine(false, 0, false);
    Audio.skid(0);
    Audio.siren(0);
    this.scene.pause();
    this.scene.pause('UIScene');
    this.scene.launch('PauseScene');
  }

  // entrar al escondite: se pausa la ciudad y se abre el interior
  enterHideout() {
    if (!this.hideoutDoor) return false;
    const d = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.hideoutDoor.x, this.hideoutDoor.y
    );
    if (d > 60) return false;

    if (GameState.wanted > 0) {
      EventBus.emit(EVT.NOTIFY, { text: 'Con la policia detras no puedes entrar', tone: 'danger' });
      return true;
    }

    // se recuerda por donde se entro, para salir a la misma puerta y no
    // aparecer siempre en el escondite aunque hubieras entrado a otro sitio.
    // `edificio` es para sacar coches del garaje sin que caigan en la pared.
    this.interiorDoor = { x: this.hideoutDoor.x, y: this.hideoutDoor.y, edificio: this.map.hideout };
    this.abrirInterior({ clave: 'escondite', nombre: 'TU ESCONDITE', plazas: 0 });
    return true;
  }

  // TU PISO COMPRADO: E en la puerta. Si todavia no es tuyo, E lo compra.
  // Si vas EN COCHE, E no compra ni entra: mete el coche en el garaje.
  entrarEnPisoCerca() {
    if (!this.pisos || !this.pisos.cerca) return false;
    const piso = this.pisos.cerca;

    if (this.drivingVehicle) return this.guardarCocheEnGaraje(piso);

    if (!GameState.esDueno(piso.clave)) {
      const que = this.pisos.comprar(piso);
      if (que === 'sin-dinero') {
        EventBus.emit(EVT.NOTIFY, {
          text: `${piso.nombre}: ${piso.precio} $. No te llega`, tone: 'danger',
        });
      } else if (que === 'comprado') {
        Audio.notes([392, 523.25, 659.25], 0.1);
        EventBus.emit(EVT.BIG_MESSAGE, { title: 'YA ES TUYO', subtitle: piso.nombre });
        EventBus.emit(EVT.NOTIFY, {
          text: `${piso.nombre} comprado. Garaje para ${piso.plazas}`, tone: 'money',
        });
      }
      return true;
    }

    if (GameState.wanted > 0) {
      EventBus.emit(EVT.NOTIFY, { text: 'Con la policia detras no puedes entrar', tone: 'danger' });
      return true;
    }
    this.interiorDoor = { x: piso.x, y: piso.y, edificio: piso.edificio };
    this.abrirInterior({
      clave: piso.clave, nombre: piso.nombre, plazas: piso.plazas, lamina: piso.lamina,
    });
    return true;
  }

  // meter el coche en el garaje: E en la puerta de TU piso yendo dentro de el
  guardarCocheEnGaraje(piso) {
    if (!GameState.esDueno(piso.clave)) return false;
    const v = this.drivingVehicle;

    if (GameState.plazasLibres(piso.clave) <= 0) {
      EventBus.emit(EVT.NOTIFY, { text: `${piso.nombre}: el garaje esta lleno`, tone: 'danger' });
      return true;
    }

    GameState.guardarCoche(piso.clave, { tipo: v.type, color: v.color, hp: Math.round(v.hp) });
    const spot = v.findExitSpot();
    const i = this.vehicles.indexOf(v);
    if (i >= 0) this.vehicles.splice(i, 1);
    v.destroy();
    this.drivingVehicle = null;
    this.player.setPosition(spot.x, spot.y);
    this.player.setVisible(true);
    this.cameras.main.setFollowOffset(0, 0);

    Audio.notes([392, 523.25], 0.09);
    EventBus.emit(EVT.NOTIFY, { text: `Guardado en el garaje · ${piso.nombre}`, tone: 'money' });
    return true;
  }

  // import/export: E en coche junto a la grua del puerto, con un modelo que
  // piden ahora mismo. Se lo lleva la grua (el coche desaparece, como el
  // piso vendido) y paga segun lo entero que llegue.
  entregarEnGruaCerca() {
    if (!this.grua || !this.grua.cerca) return false;
    if (!GameState.puedeVenderCoche()) {
      EventBus.emit(EVT.NOTIFY, {
        text: `Espera ${Math.ceil(GameState.cooldownVentaCoche)} s antes de traer otro coche`,
        tone: 'dim',
      });
      return true;
    }
    const v = this.drivingVehicle;
    const resultado = this.grua.entregar(v);
    if (!resultado) return false;

    const spot = v.findExitSpot();
    const i = this.vehicles.indexOf(v);
    if (i >= 0) this.vehicles.splice(i, 1);
    v.destroy();
    this.drivingVehicle = null;
    this.player.setPosition(spot.x, spot.y);
    this.player.setVisible(true);
    this.cameras.main.setFollowOffset(0, 0);

    Audio.notes([392, 523.25, 659.25, 783.99], 0.09);
    EventBus.emit(EVT.NOTIFY, {
      text: `${resultado.nombre} entregado · ${resultado.pago} €`, tone: 'money',
    });
    return true;
  }

  // el desguace del mercado (MercadoSystem): igual que la grua, pero
  // acepta cualquier modelo y paga segun la demanda de ese barrio ahora
  venderEnDesguaceCerca() {
    if (!this.mercado || !this.mercado.cerca) return false;
    if (!GameState.puedeVenderCoche()) {
      EventBus.emit(EVT.NOTIFY, {
        text: `Espera ${Math.ceil(GameState.cooldownVentaCoche)} s antes de vender otro coche`,
        tone: 'dim',
      });
      return true;
    }
    const v = this.drivingVehicle;
    const resultado = this.mercado.vender(v);
    if (!resultado) return false;

    const spot = v.findExitSpot();
    const i = this.vehicles.indexOf(v);
    if (i >= 0) this.vehicles.splice(i, 1);
    v.destroy();
    this.drivingVehicle = null;
    this.player.setPosition(spot.x, spot.y);
    this.player.setVisible(true);
    this.cameras.main.setFollowOffset(0, 0);

    Audio.notes([392, 523.25, 659.25, 783.99], 0.09);
    return true;
  }

  // el punto de salida de una carrera (CarreraSystem): E en coche, y solo si
  // no hay ya otro trabajo o mision en marcha, para no liarla con el HUD
  empezarCarreraCerca() {
    if (!this.carreras || !this.carreras.cerca || this.carreras.activa) return false;
    if (this.missions.activa || this.jobs.active || this.taxista.carrera ||
        this.ambulanciaJob.carrera || this.justiciero.fugitivo) return false;
    this.carreras.empezar(this.carreras.cerca);
    return true;
  }

  // sacar un coche del garaje a la puerta del piso, al salir de HideoutScene
  // con `sacarCocheDe` (ver HideoutScene.sacarCoche). La puerta en si cae
  // pegada a la pared (zona solida): se desplaza hacia la calle, igual que
  // LocalSystem.aparcar con la ambulancia.
  sacarCocheDelGaraje(clave, puerta) {
    if (!puerta) return;
    const b = puerta.edificio;
    const lado = b ? Math.atan2(puerta.y - b.py, puerta.x - b.px) : 0;
    const x = puerta.x + Math.cos(lado) * 46;
    const y = puerta.y + Math.sin(lado) * 46;

    if (
      this.map.isSolidBox(x, y, 34, 34) ||
      this.vehicles.some((v) => Phaser.Math.Distance.Between(v.x, v.y, x, y) < 70)
    ) {
      EventBus.emit(EVT.NOTIFY, {
        text: 'La puerta esta ocupada, aparta algo y prueba otra vez', tone: 'danger',
      });
      return;
    }
    const coche = GameState.sacarCoche(clave, 0);
    if (!coche) return;
    if (!VEHICLES[coche.tipo]) {
      // una partida vieja puede traer un tipo que ya no existe: se avisa y
      // se pierde ese coche en vez de reventar al crearlo
      EventBus.emit(EVT.NOTIFY, { text: 'Ese coche ya no se puede sacar', tone: 'danger' });
      return;
    }
    const v = new Vehicle(this, this.map, coche.tipo, x, y, lado + Math.PI / 2, {
      hp: coche.hp, color: coche.color, deTuyo: true,
    });
    this.vehicles.push(v);
    EventBus.emit(EVT.NOTIFY, { text: `${v.stats.name} · sacado del garaje`, tone: 'money' });
  }

  // el coche recien comprado en ConcesionarioScene, esperando en la puerta
  // del concesionario (ya esta pagado: aqui solo se materializa, `deTuyo`
  // para que no haga falta puentearlo)
  entregarCocheComprado(compra, puerta) {
    if (!puerta) return;
    const b = puerta.edificio;
    const lado = b ? Math.atan2(puerta.y - b.py, puerta.x - b.px) : 0;
    const x = puerta.x + Math.cos(lado) * 46;
    const y = puerta.y + Math.sin(lado) * 46;

    if (
      this.map.isSolidBox(x, y, 34, 34) ||
      this.vehicles.some((v) => Phaser.Math.Distance.Between(v.x, v.y, x, y) < 70)
    ) {
      EventBus.emit(EVT.NOTIFY, {
        text: 'La puerta esta ocupada, aparta algo y prueba otra vez', tone: 'danger',
      });
      return;
    }
    const v = new Vehicle(this, this.map, compra.tipo, x, y, lado + Math.PI / 2, {
      color: compra.color, deTuyo: true,
    });
    this.vehicles.push(v);
    EventBus.emit(EVT.BIG_MESSAGE, { title: 'TUYO', subtitle: v.stats.name });
    EventBus.emit(EVT.NOTIFY, { text: `${v.stats.name} te espera en la puerta`, tone: 'money' });
  }

  // El paso a cualquier interior: congelar la ciudad, fundir a negro y
  // levantar la escena de dentro. Antes esto vivia dentro de enterHideout;
  // se saco aqui al haber mas de un sitio donde entrar.
  abrirInterior(datos, sceneKey = 'HideoutScene') {
    Audio.engine(false, 0, false);
    Audio.skid(0);
    this.captureState();
    this.cameras.main.fadeOut(360, 0, 0, 0);
    this.time.delayedCall(380, () => {
      this.scene.pause();
      this.scene.setVisible(false);
      this.scene.pause('UIScene');
      this.scene.setVisible(false, 'UIScene');
      this.scene.launch(sceneKey, datos);
      this.cameras.main.fadeIn(1, 0, 0, 0);
    });
  }

  updateCamera(dt) {
    const cam = this.cameras.main;

    // Seguro: si por lo que sea la camara se queda suelta (volver del
    // escondite, reaparecer, una pausa rara), se vuelve a enganchar sola.
    if (cam._follow !== this.player.sprite) {
      cam.startFollow(this.player.sprite, true, CAMERA.followLerp, CAMERA.followLerp);
    }
    const driving = !!this.drivingVehicle;
    const targetZoom = driving ? CAMERA.zoomDrive : CAMERA.zoomFoot;
    cam.setZoom(Phaser.Math.Linear(cam.zoom, targetZoom, CAMERA.zoomLerp * 60 * dt));

    // mirar un poco hacia donde vas: da tiempo de reaccion al conducir rapido
    let aheadX = 0;
    let aheadY = 0;
    if (driving) {
      aheadX = Phaser.Math.Clamp(this.drivingVehicle.vx * 0.22, -190, 190);
      aheadY = Phaser.Math.Clamp(this.drivingVehicle.vy * 0.22, -190, 190);
    }
    this.camAhead.x = Phaser.Math.Linear(this.camAhead.x, aheadX, 2.2 * dt);
    this.camAhead.y = Phaser.Math.Linear(this.camAhead.y, aheadY, 2.2 * dt);
    cam.setFollowOffset(-this.camAhead.x, -this.camAhead.y);
  }

  // cual de los cuatro trabajos manda en el HUD: el que este en marcha, o si
  // ninguno lo esta, el que conduzcas ahora mismo (taxi, ambulancia,
  // patrulla), o si no, el reparto de siempre
  trabajoActual() {
    if (this.encuentros.activo) {
      return {
        objective: this.encuentros.objectiveText(), remaining: this.encuentros.remainingTime(),
        target: this.encuentros.target,
      };
    }
    if (this.jobs.active) {
      return { objective: this.jobs.objectiveText(), remaining: this.jobs.remainingTime(), target: this.jobs.target };
    }
    if (this.taxista.carrera) {
      return { objective: this.taxista.objectiveText(), remaining: this.taxista.remainingTime(), target: this.taxista.target };
    }
    if (this.ambulanciaJob.carrera) {
      return {
        objective: this.ambulanciaJob.objectiveText(), remaining: this.ambulanciaJob.remainingTime(),
        target: this.ambulanciaJob.target,
      };
    }
    if (this.justiciero.fugitivo) {
      return {
        objective: this.justiciero.objectiveText(), remaining: null,
        target: { x: this.justiciero.fugitivo.vehicle.x, y: this.justiciero.fugitivo.vehicle.y },
      };
    }
    if (this.taxista.disponible(this.drivingVehicle)) return { objective: this.taxista.objectiveText(), remaining: null, target: null };
    if (this.ambulanciaJob.disponible(this.drivingVehicle)) {
      return { objective: this.ambulanciaJob.objectiveText(), remaining: null, target: null };
    }
    if (this.justiciero.disponible(this.drivingVehicle)) {
      return { objective: this.justiciero.objectiveText(), remaining: null, target: null };
    }
    return { objective: this.jobs.objectiveText(), remaining: this.jobs.remainingTime(), target: this.jobs.target };
  }

  emitHud() {
    const trabajo = this.trabajoActual();
    EventBus.emit(EVT.HUD_TICK, {
      money: GameState.money,
      objective: trabajo.objective,
      remaining: trabajo.remaining,
      driving: !!this.drivingVehicle,
      speed: this.drivingVehicle ? this.drivingVehicle.speedKmh : 0,
      vehicleName: this.drivingVehicle ? this.drivingVehicle.stats.name : '',
      hp: this.drivingVehicle ? this.drivingVehicle.hp / this.drivingVehicle.stats.maxHp : 1,
      target: trabajo.target,
      // el angulo es para la flecha del mapa: si vas en coche, manda el coche
      player: {
        x: this.player.x, y: this.player.y,
        angle: this.drivingVehicle ? this.drivingVehicle.angle : this.player.angle,
      },
      deliveries: GameState.stats.deliveries,
      wanted: GameState.wanted,
      perdiendoBusca: GameState.perdiendoBusca > 0,
      health: GameState.health,
      healthMax: GameState.vidaMaxima,
      blindaje: GameState.blindaje,
      tiendaCerca: !!(this.shops && this.shops.cerca),
      armasConfCerca: !!(this.armasConf && this.armasConf.cerca),
      localCerca: this.locales && this.locales.cerca ? this.locales.cerca.cfg : null,
      concesionarioCerca: !!(this.concesionario && this.concesionario.cerca),
      guerraCerca: this.guerra && this.guerra.cerca ? FACTIONS[this.guerra.cerca.faction].name : null,
      guerraActiva: this.guerra && this.guerra.activo
        ? { faccion: FACTIONS[this.guerra.activo.faction].short, oleada: this.guerra.activo.oleada }
        : null,
      gruaCerca: this.grua && this.grua.cerca
        ? {
          nombre: VEHICLES[this.drivingVehicle.type].name,
          pago: this.grua.estimarPago(this.drivingVehicle),
          cooldown: GameState.puedeVenderCoche() ? 0 : Math.ceil(GameState.cooldownVentaCoche),
        }
        : null,
      desguaceCerca: this.mercado && this.mercado.cerca
        ? {
          pago: this.mercado.estimar(this.mercado.cerca, this.drivingVehicle),
          cooldown: GameState.puedeVenderCoche() ? 0 : Math.ceil(GameState.cooldownVentaCoche),
        }
        : null,
      carreraCerca: !!(
        this.carreras && this.carreras.cerca && !this.carreras.activa &&
        !this.missions.activa && !this.jobs.active && !this.taxista.carrera &&
        !this.ambulanciaJob.carrera && !this.justiciero.fugitivo
      ),
      negocioCerca: this.negocios && this.negocios.cerca
        ? {
          nombre: this.negocios.cerca.cfg.nombre,
          precio: this.negocios.cerca.cfg.precio,
          esTuyo: GameState.esDueno(this.negocios.cerca.clave),
          enAtaque: !!this.negocios.cerca.ataque,
          caja: Math.round(GameState.caja(this.negocios.cerca.clave)),
        }
        : null,
      aliento: this.drivingVehicle ? 1 : this.player.alientoRatio,
      maquinaCerca: !!this.pickups.cercaDeMaquina && !this.drivingVehicle,
      trabajadoraCerca: this.drivingVehicle && this.bajoMundo.cerca ? { precio: PRECIO_BUEN_RATO } : null,
      sitioPrivadoCerca: this.drivingVehicle && this.bajoMundo.sitioCerca,
      pasandoElRato: !!this.bajoMundo.sesion,
      arma: this.drivingVehicle ? null : {
        clave: GameState.armaActual,
        nombre: ARMAS[GameState.armaActual].nombre,
        balas: GameState.municion(),
      },
      chasing: this.police.chasing,
      territory: this.factions.currentInfo(),
      mission: this.missions.estado() || this.carreras.estado(),
      siguiente: this.carreras.siguientePunto(),
      police: this.police.units.map((u) => ({ x: u.vehicle.x, y: u.vehicle.y })),
      contactos: this.missions.puntos().concat(this.encuentros.puntos()),
      diaNoche: this.diaNoche.velo(),
    });
  }
}

// EL PINTADO DE LA CIUDAD VIVE EN OTRO FICHERO (world/PintarCiudad.js): eran
// 575 lineas que solo dibujan y no tienen nada que ver con el bucle del juego.
// Se pegan aqui al prototipo, asi que dentro de esos metodos `this` es esta
// misma escena y se llaman igual que siempre: this.drawGround(), etc.
//
// OJO al tocar: si se añade un metodo alli con el mismo nombre que uno de
// aqui, este Object.assign lo PISA. Por eso va al final del fichero, para que
// se vea, y por eso alli dentro no hay nada que no sea pintar.
Object.assign(CityScene.prototype, PintarCiudad);
