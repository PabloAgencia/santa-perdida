import { CityMap } from '../world/CityMap.js';
import { CITY } from '../config/city.js';
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
import { ShopSystem } from '../systems/ShopSystem.js';
import { PisoSystem } from '../systems/PisoSystem.js';
import { LocalSystem } from '../systems/LocalSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { ARMAS } from '../config/weapons.js';
import { ENTRENAR } from '../config/balance.js';
import { GameState } from '../core/GameState.js';
import { SaveSystem } from '../core/SaveSystem.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';
import { PintarCiudad } from '../world/PintarCiudad.js';
import { DanoVehiculos } from '../systems/DanoVehiculos.js';

const IDLE_INPUT = {
  throttle: false, brake: false, left: false, right: false, handbrake: false,
};

export class CityScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CityScene', active: false });
  }

  create() {
    this.map = new CityMap(CITY).generate();
    this.vehicles = [];
    this.drivingVehicle = null;
    this.autosaveTimer = 0;
    this.hudTimer = 0;
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
    this.net = new RoadNetwork(CITY);
    // el orden importa: el trafico pide conductores a los NPC al crearse
    this.npcs = new NPCSystem(this, this.map);
    this.lights = new TrafficLights(this, this.net);
    this.traffic = new TrafficSystem(this, this.map, this.net, this.lights);
    this.police = new PoliceSystem(this, this.map, this.net);
    this.factions = new FactionSystem(this, this.map);
    this.missions = new MissionSystem(this, this.map, this.net);
    this.pickups = new PickupSystem(this, this.map);
    this.shops = new ShopSystem(this, this.map);
    this.pisos = new PisoSystem(this, this.map);
    this.locales = new LocalSystem(this, this.map);
    this.combat = new CombatSystem(this);
    this.danos = new DanoVehiculos(this);
    this.hurtCooldown = 0;
    this.buildMinimapTexture();

    if (loaded && GameState.vehicles.length > 0) {
      for (const v of GameState.vehicles) {
        this.vehicles.push(
          new Vehicle(this, this.map, v.type, v.x, v.y, v.angle, {
            id: v.id, hp: v.hp, color: v.color,
          })
        );
      }
      this.player.setPosition(GameState.player.x, GameState.player.y);
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
  }

  findStartSpot() {
    const h = this.map.hideout;
    if (!h) return { x: this.map.pixelWidth / 2, y: this.map.pixelHeight / 2 };
    let best = null;
    let bestDist = Infinity;
    for (const s of this.map.sidewalkSpots) {
      const d = Phaser.Math.Distance.Between(s.x, s.y, h.px, h.py);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best || { x: h.px, y: h.py + h.ph };
  }

  spawnDefaultVehicles() {
    const spots = Phaser.Utils.Array.Shuffle(this.map.roadSpots.slice());
    const wanted = 18;
    let placed = 0;

    for (const s of spots) {
      if (placed >= wanted) break;
      const type = VEHICLE_KEYS[placed % VEHICLE_KEYS.length];
      const horizontal = this.map.isRoadPoint(s.x - TILE * 2, s.y) &&
        this.map.isRoadPoint(s.x + TILE * 2, s.y);
      const angle = horizontal ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);

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
      mapa: 'M', mute: 'N', pausa: 'ESC',
      atacar: 'F', objetivo: 'Q', arma: 'TAB',
    });
    this.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT,W,A,S,D,E,K,J,M,N,SHIFT,ESC,F,Q,TAB');

    // el raton tambien pega, y al volante tambien dispara
    this.input.on('pointerdown', (p) => {
      if (p.leftButtonDown() && this.scene.isActive()) this.atacarAhora();
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

      this.police.report(pedestrian.x, pedestrian.y, fatal ? 2 : 1);
      Audio.crash(Math.min(0.7, speed / 400));
      this.cameras.main.shake(fatal ? 180 : 110, fatal ? 0.005 : 0.003);
      EventBus.emit(EVT.NOTIFY, {
        text: fatal ? 'Te lo has llevado por delante' : 'Has atropellado a alguien',
        tone: 'danger',
      });
      if (pedestrian.faction) this.factions.onMemberHurt(pedestrian.faction);
    };
    this.onHideoutExit = () => {
      // se sale a la puerta, y se comprueba que el sitio este libre
      if (this.hideoutDoor) this.player.setPosition(this.hideoutDoor.x, this.hideoutDoor.y);
      this.player.setVisible(true);
      this.hurtCooldown = 1.5;
      this.cameras.main.startFollow(
        this.player.sprite, true, CAMERA.followLerp, CAMERA.followLerp
      );
      this.cameras.main.fadeIn(420, 0, 0, 0);
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
    // el trafico se genera solo al vuelo, no tiene sentido guardarlo
    GameState.vehicles = this.vehicles.filter((v) => !v.ai).map((v) => v.serialize());
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

    // acabas de morir: el mundo se congela un instante mientras el cuerpo
    // cae y se desmadeja, y la pantalla se funde a negro encima (ver respawn)
    if (this.player.ragdoll) {
      this.player.actualizarRagdoll(dt);
      return;
    }

    const left = k.left.isDown || k.leftArrow.isDown;
    const right = k.right.isDown || k.rightArrow.isDown;
    const up = k.up.isDown || k.upArrow.isDown;
    const down = k.down.isDown || k.downArrow.isDown;

    if (Phaser.Input.Keyboard.JustDown(k.enter)) {
      if (this.drivingVehicle) this.exitVehicle();
      else if (
        !this.missions.intentarEmpezar(this.player.x, this.player.y) &&
        !this.enterHideout() &&
        !this.entrarEnPisoCerca() &&
        !this.entrarEnLaArmeria() &&
        !this.usarLocalCerca() &&
        !this.usarMaquinaCerca()
      ) {
        const v = this.nearestVehicle();
        if (v) this.enterVehicle(v);
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
      });
      const metros = (this.drivingVehicle.speed * dt) / 10;
      GameState.bumpStat('metersDriven', metros);
      GameState.subirAtributo('volante', metros * ENTRENAR.volantePorMetro);
    } else {
      this.player.update(dt, { left, right, up, down, run: k.run.isDown });
    }

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
    this.resolvePlayerVsVehicles();
    this.updateLamps();
    this.checkPlayerHarm(dt);
    this.pickups.update(dt, this.player, !!this.drivingVehicle);
    this.shops.update(this.player, !!this.drivingVehicle);
    this.pisos.update(this.player, !!this.drivingVehicle);
    this.locales.update(this.player, !!this.drivingVehicle);
    this.combat.update(dt, this.player, !this.drivingVehicle, this.drivingVehicle);
    this.danos.update(dt, this.vehicles, this.player, this.drivingVehicle);
    this.encanonar();

    // el coche te revienta debajo: te suelta en la calle
    if (this.drivingVehicle && this.drivingVehicle.quemado) this.exitVehicle();

    if (this.drivingVehicle) {
      const v = this.drivingVehicle;
      this.player.setPosition(v.x, v.y);
      Audio.engine(true, v.speed / v.stats.maxSpeed, up, ENGINES[v.stats.clase]);
      Audio.skid(Math.max(0, (v.lateral - 45) / 190));
    } else {
      Audio.engine(false, 0, false);
      Audio.skid(0);
    }

    Audio.siren(this.police.nivelSirena(this.player.x, this.player.y));

    this.jobs.update(dt, this.player.x, this.player.y);

    if (!this.jobs.active && Phaser.Input.Keyboard.JustDown(k.newJob)) {
      this.jobs.offerNew({ x: this.player.x, y: this.player.y });
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

        if (v.speed > 120) {
          if (lamp.romper(v.x, v.y)) {
            v.vx *= 0.72;
            v.vy *= 0.72;
            v.hp = Math.max(0, v.hp - 6);
            Audio.crash(0.4);
            if (v === this.drivingVehicle) this.cameras.main.shake(130, 0.0035);
          }
        } else {
          // despacio no la tiras: rebotas
          const a = Math.atan2(v.y - lamp.y, v.x - lamp.x);
          v.vx += Math.cos(a) * 70;
          v.vy += Math.sin(a) * 70;
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

    // se llevan una parte, nunca todo: quedarte a cero no deja jugar
    const fee = Math.min(300, Math.round(GameState.money * 0.25));
    const busted = reason === 'busted';

    Audio.engine(false, 0, false);
    Audio.skid(0);
    this.cameras.main.fadeOut(420, 0, 0, 0);

    EventBus.emit(EVT.BIG_MESSAGE, {
      title: busted ? 'TE HAN DETENIDO' : 'ESTAS MUERTO',
      subtitle: busted
        ? `Sales limpio de comisaria. Fianza: ${fee} €`
        : `Despiertas en el hospital. Te cobran ${fee} €`,
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
      this.player.terminarRagdoll();
      this.player.setVisible(true);

      const spot = this.findStartSpot();
      this.player.setPosition(spot.x, spot.y);
      this.hurtCooldown = 2;
      this.cameras.main.startFollow(
        this.player.sprite, true, CAMERA.followLerp, CAMERA.followLerp
      );
      this.cameras.main.fadeIn(600, 0, 0, 0);
      this.respawning = false;
    });
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

  atacarAhora() {
    // al volante se dispara por la ventanilla, y solo con una mano
    if (this.drivingVehicle) {
      this.combat.dispararDesdeCoche(this.drivingVehicle);
      return;
    }
    this.combat.atacar(this.player, this.player.running);
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

    const resultado = this.locales.usar(local, this.drivingVehicle);
    if (resultado) EventBus.emit(EVT.NOTIFY, { text: resultado.texto, tone: resultado.tono });
    return true;
  }

  // la maquina de refrescos de la acera: E al lado y a beber
  usarMaquinaCerca() {
    if (!this.pickups.cercaDeMaquina) return false;
    const engorda = this.pickups.usarMaquina();
    if (engorda) this.player.actualizarCuerpo();
    return true;
  }

  // el mapa entero: se congela la ciudad y se abre encima, como la pausa
  abrirMapa() {
    this.captureState();
    this.scene.pause();
    this.scene.pause('UIScene');
    this.scene.launch('MapaScene');
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

    this.abrirInterior({ clave: 'escondite', nombre: 'TU ESCONDITE', plazas: 0 });
    return true;
  }

  // TU PISO COMPRADO: E en la puerta. Si todavia no es tuyo, E lo compra.
  entrarEnPisoCerca() {
    if (!this.pisos || !this.pisos.cerca) return false;
    const piso = this.pisos.cerca;

    if (!GameState.esDueno(piso.clave)) {
      const que = this.pisos.comprar(piso);
      if (que === 'sin-dinero') {
        EventBus.emit(EVT.NOTIFY, {
          text: `${piso.nombre}: ${piso.precio} $. No te llega`, tone: 'danger',
        });
      } else if (que === 'comprado') {
        Audio.notes([392, 523.25, 659.25], 0.1);
        EventBus.emit(EVT.BIG_MESSAGE, { text: 'YA ES TUYO', sub: piso.nombre });
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
    this.abrirInterior({
      clave: piso.clave, nombre: piso.nombre, plazas: piso.plazas, lamina: piso.lamina,
    });
    return true;
  }

  // El paso a cualquier interior: congelar la ciudad, fundir a negro y
  // levantar la escena de dentro. Antes esto vivia dentro de enterHideout;
  // se saco aqui al haber mas de un sitio donde entrar.
  abrirInterior(datos) {
    Audio.engine(false, 0, false);
    Audio.skid(0);
    this.captureState();
    this.cameras.main.fadeOut(360, 0, 0, 0);
    this.time.delayedCall(380, () => {
      this.scene.pause();
      this.scene.setVisible(false);
      this.scene.pause('UIScene');
      this.scene.setVisible(false, 'UIScene');
      this.scene.launch('HideoutScene', datos);
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

  emitHud() {
    EventBus.emit(EVT.HUD_TICK, {
      money: GameState.money,
      objective: this.jobs.objectiveText(),
      remaining: this.jobs.remainingTime(),
      driving: !!this.drivingVehicle,
      speed: this.drivingVehicle ? this.drivingVehicle.speedKmh : 0,
      vehicleName: this.drivingVehicle ? this.drivingVehicle.stats.name : '',
      hp: this.drivingVehicle ? this.drivingVehicle.hp / this.drivingVehicle.stats.maxHp : 1,
      target: this.jobs.target,
      // el angulo es para la flecha del mapa: si vas en coche, manda el coche
      player: {
        x: this.player.x, y: this.player.y,
        angle: this.drivingVehicle ? this.drivingVehicle.angle : this.player.angle,
      },
      deliveries: GameState.stats.deliveries,
      wanted: GameState.wanted,
      health: GameState.health,
      healthMax: GameState.vidaMaxima,
      blindaje: GameState.blindaje,
      tiendaCerca: !!(this.shops && this.shops.cerca),
      localCerca: this.locales && this.locales.cerca ? this.locales.cerca.cfg : null,
      aliento: this.drivingVehicle ? 1 : this.player.alientoRatio,
      maquinaCerca: !!this.pickups.cercaDeMaquina && !this.drivingVehicle,
      arma: this.drivingVehicle ? null : {
        clave: GameState.armaActual,
        nombre: ARMAS[GameState.armaActual].nombre,
        balas: GameState.municion(),
      },
      chasing: this.police.chasing,
      territory: this.factions.currentInfo(),
      mission: this.missions.estado(),
      police: this.police.units.map((u) => ({ x: u.vehicle.x, y: u.vehicle.y })),
      contactos: this.missions.puntos(),
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
