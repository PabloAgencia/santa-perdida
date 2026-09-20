import { CityMap } from '../world/CityMap.js';
import { CITY } from '../config/city.js';
import { TILE, PLAYER, CAMERA, SAVE } from '../config/balance.js';
import { VEHICLE_KEYS, VEHICLES, ENGINES } from '../config/vehicles.js';
import { Player } from '../entities/Player.js';
import { Vehicle } from '../entities/Vehicle.js';
import { JobSystem } from '../systems/JobSystem.js';
import { resolveVehicleCollisions } from '../systems/VehicleCollisions.js';
import { RoadNetwork, LANE_OFFSET } from '../world/RoadNetwork.js';
import { TrafficSystem } from '../systems/TrafficSystem.js';
import { NPCSystem } from '../systems/NPCSystem.js';
import { PoliceSystem } from '../systems/PoliceSystem.js';
import { StreetLamp } from '../entities/StreetLamp.js';
import { FactionSystem } from '../systems/FactionSystem.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { T } from '../config/city.js';
import { FACTIONS, ZONE_OWNER } from '../config/factions.js';
import { GameState } from '../core/GameState.js';
import { SaveSystem } from '../core/SaveSystem.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { shade } from '../core/color.js';
import { Audio } from '../core/Audio.js';

const IDLE_INPUT = {
  throttle: false, brake: false, left: false, right: false, handbrake: false,
};

// sorteo atado a la posicion del edificio: la ciudad sale siempre igual,
// pero cada edificio tiene sus propios detalles
function buildingRng(tx, ty) {
  let a = (Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663)) >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
    this.drawBuildings();
    this.drawLandmarks();

    const loaded = SaveSystem.load();

    this.player = new Player(this, this.map, 0, 0);
    this.jobs = new JobSystem(this, this.map);
    this.net = new RoadNetwork(CITY);
    this.traffic = new TrafficSystem(this, this.map, this.net);
    this.npcs = new NPCSystem(this, this.map);
    this.police = new PoliceSystem(this, this.map, this.net);
    this.factions = new FactionSystem(this, this.map);
    this.missions = new MissionSystem(this, this.map, this.net);
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

    if (loaded && GameState.job) this.jobs.restore(GameState.job);
    if (!this.jobs.active) this.jobs.offerNew({ x: this.player.x, y: this.player.y });

    this.drawStreetLights();
    this.drawHideoutMarker();
    this.setupCamera();
    this.setupInput();
    this.setupEvents();

    this.scene.launch('UIScene');
  }

  // ---------- mundo ----------

  drawGround() {
    const tilemap = this.make.tilemap({
      data: this.map.getTileData2D(),
      tileWidth: TILE,
      tileHeight: TILE,
    });
    const tileset = tilemap.addTilesetImage('tiles');
    this.ground = tilemap.createLayer(0, tileset, 0, 0);
    this.ground.setDepth(-2000);
  }

  drawBuildings() {
    for (const b of this.map.buildings) {
      const rnd = buildingRng(b.tx, b.ty);
      const block = (x, y, w, h, tint, depth, alpha = 1) =>
        this.add
          .image(x, y, 'px')
          .setDisplaySize(w, h)
          .setTint(tint)
          .setAlpha(alpha)
          .setDepth(depth);

      // sombra propia: el sol entra siempre desde arriba a la izquierda,
      // asi toda la ciudad comparte la misma luz
      const drop = 5 + Math.round(rnd() * 5);
      block(b.px + drop, b.py + drop, b.pw + 2, b.ph + 2, 0x05060a, -1250, 0.5);

      block(b.px, b.py, b.pw, b.ph, b.color, -1200);

      block(b.px, b.py - b.ph / 2 + 2, b.pw - 4, 4, shade(b.color, 1.45), -1190);
      block(b.px - b.pw / 2 + 2, b.py, 4, b.ph - 4, shade(b.color, 1.3), -1190);
      block(b.px, b.py + b.ph / 2 - 2, b.pw - 4, 4, shade(b.color, 0.62), -1190);
      block(b.px + b.pw / 2 - 2, b.py, 4, b.ph - 4, shade(b.color, 0.7), -1190);

      if (b.pw > 64 && b.ph > 64) {
        const inset = 16 + Math.round(rnd() * 14);
        block(
          b.px, b.py, b.pw - inset, b.ph - inset,
          shade(b.color, 0.86 + rnd() * 0.4), -1180, 0.75
        );
      }

      // trastos de azotea: deposito, claraboya, caja de escalera
      const props = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < props; i++) {
        const size = 9 + Math.round(rnd() * 13);
        if (size + 14 > Math.min(b.pw, b.ph)) continue;
        const ox = (rnd() - 0.5) * (b.pw - size - 16);
        const oy = (rnd() - 0.5) * (b.ph - size - 16);
        const kind = rnd();
        const tint =
          kind < 0.34 ? 0x6b6257 : kind < 0.67 ? shade(b.color, 1.6) : shade(b.color, 0.5);
        block(b.px + ox + 2, b.py + oy + 2, size, size, 0x05060a, -1175, 0.4);
        block(b.px + ox, b.py + oy, size, size, tint, -1170);
      }

      // ventanas por la fachada, para que se lea como edificio y no como caja
      if (b.pw >= 96 && b.ph >= 96) {
        const paso = 24;
        const luz = shade(b.color, 1.9);
        const apagada = shade(b.color, 0.45);
        const fila = (x0, y0, dx, dy, n) => {
          for (let k = 0; k < n; k++) {
            const encendida = rnd() < 0.38;
            block(
              x0 + dx * k, y0 + dy * k,
              dx ? 9 : 5, dy ? 9 : 5,
              encendida ? luz : apagada,
              -1178, encendida ? 0.85 : 0.6
            );
          }
        };
        const nx = Math.floor((b.pw - 30) / paso);
        const ny = Math.floor((b.ph - 30) / paso);
        const x0 = b.px - (nx - 1) * paso * 0.5;
        const y0 = b.py - (ny - 1) * paso * 0.5;
        fila(x0, b.py - b.ph / 2 + 9, paso, 0, nx);
        fila(x0, b.py + b.ph / 2 - 9, paso, 0, nx);
        fila(b.px - b.pw / 2 + 9, y0, 0, paso, ny);
        fila(b.px + b.pw / 2 - 9, y0, 0, paso, ny);
      }

      // portal, en el lado que da a la calle
      const lados = [
        { x: b.px, y: b.py - b.ph / 2 - 20, w: 16, h: 7, ox: 0, oy: -b.ph / 2 + 3 },
        { x: b.px, y: b.py + b.ph / 2 + 20, w: 16, h: 7, ox: 0, oy: b.ph / 2 - 3 },
        { x: b.px - b.pw / 2 - 20, y: b.py, w: 7, h: 16, ox: -b.pw / 2 + 3, oy: 0 },
        { x: b.px + b.pw / 2 + 20, y: b.py, w: 7, h: 16, ox: b.pw / 2 - 3, oy: 0 },
      ];
      for (const l of lados) {
        if (!this.map.isRoadPoint(l.x, l.y)) continue;
        block(b.px + l.ox, b.py + l.oy, l.w, l.h, 0x15181d, -1176);
        block(b.px + l.ox, b.py + l.oy, l.w - 4, l.h - 3, 0xc8a465, -1175, 0.65);
        break;
      }

      if (b.isHideout) {
        this.add
          .image(b.px, b.py, 'px')
          .setDisplaySize(b.pw - 10, b.ph - 10)
          .setTint(0x8a5c33)
          .setAlpha(0.5)
          .setDepth(-1040);
        this.add
          .text(b.px, b.py, 'ESCONDITE', {
            fontFamily: 'Consolas, monospace',
            fontSize: '13px',
            color: '#e8c9a0',
          })
          .setOrigin(0.5)
          .setDepth(-1030);
      }
    }
  }

  buildMinimapTexture() {
    if (this.textures.exists('minimap')) this.textures.remove('minimap');

    const w = this.map.w;
    const h = this.map.h;
    const tex = this.textures.createCanvas('minimap', w, h);
    const ctx = tex.getContext();
    const img = ctx.createImageData(w, h);

    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const i = (ty * w + tx) * 4;
        const tile = this.map.getTile(tx, ty);
        let c;
        if (this.map.roadMask[this.map.idx(tx, ty)] === 1) c = [64, 68, 76];
        else if (tile === T.WATER) c = [20, 46, 60];
        else if (this.map.isSolidTile(tx, ty)) c = [104, 99, 90];
        else if (tile === T.SIDEWALK) c = [48, 51, 57];
        else c = [32, 37, 40];

        // territorio de banda teñido encima, como el mapa de zonas del SA
        const zone = this.map.zoneNames[this.map.zoneGrid[this.map.idx(tx, ty)]];
        const owner = zone ? ZONE_OWNER[zone] : null;
        if (owner) {
          const col = FACTIONS[owner].color;
          const mix = 0.3;
          c = [
            c[0] * (1 - mix) + ((col >> 16) & 255) * mix,
            c[1] * (1 - mix) + ((col >> 8) & 255) * mix,
            c[2] * (1 - mix) + (col & 255) * mix,
          ];
        }

        img.data[i] = c[0];
        img.data[i + 1] = c[1];
        img.data[i + 2] = c[2];
        img.data[i + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    tex.refresh();
  }

  drawLandmarks() {
    const block = (x, y, w, h, tint, depth, alpha = 1) =>
      this.add
        .image(x, y, 'px')
        .setDisplaySize(w, h)
        .setTint(tint)
        .setAlpha(alpha)
        .setDepth(depth);

    for (const L of this.map.landmarks) {
      if (L.type === 'plaza') {
        this.add.circle(L.monument.px, L.monument.py, 86, 0x2f3a3f).setDepth(-1220);
        this.add.circle(L.monument.px, L.monument.py, 74, 0x1e4450).setDepth(-1215);
        this.add.circle(L.monument.px, L.monument.py, 74, 0x2f6b7a, 0.35).setDepth(-1214);
        block(L.monument.px + 5, L.monument.py + 5, 60, 60, 0x05060a, -1210, 0.5);
        block(L.monument.px, L.monument.py, 52, 52, 0x4a4b52, -1205);
        block(L.monument.px, L.monument.py, 30, 30, 0x6d6a5e, -1204);
        block(L.monument.px, L.monument.py, 14, 14, 0xc8a955, -1203);
        for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          block(
            L.monument.px + Math.cos(a) * 150,
            L.monument.py + Math.sin(a) * 110,
            Math.abs(Math.cos(a)) > 0.5 ? 16 : 54,
            Math.abs(Math.cos(a)) > 0.5 ? 54 : 16,
            0x5a4c3a, -1205
          );
        }
      } else if (L.type === 'torre') {
        block(L.px + 16, L.py + 16, L.pw + 4, L.ph + 4, 0x05060a, -1260, 0.55);
        block(L.px, L.py, L.pw, L.ph, 0x272c39, -1200);
        block(L.px, L.py, L.pw - 46, L.ph - 46, 0x333a4a, -1195);
        block(L.px, L.py, L.pw - 96, L.ph - 96, 0x414a5e, -1190);
        block(L.px, L.py, L.pw - 140, L.ph - 140, 0x515b72, -1185);
        const light = this.add.circle(L.px, L.py, 9, 0xff4a3a).setDepth(-1180);
        this.tweens.add({
          targets: light, alpha: { from: 1, to: 0.15 },
          duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
      } else if (L.type === 'faro') {
        const glow = this.add.circle(L.tower.px, L.tower.py, 120, 0xe8d08a, 0.13).setDepth(-1230);
        this.tweens.add({
          targets: glow, scale: { from: 0.75, to: 1.25 }, alpha: { from: 0.2, to: 0.05 },
          duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
        this.add.circle(L.tower.px + 5, L.tower.py + 5, 46, 0x05060a, 0.5).setDepth(-1215);
        this.add.circle(L.tower.px, L.tower.py, 44, 0x6d6a63).setDepth(-1210);
        this.add.circle(L.tower.px, L.tower.py, 34, 0xd8d2c4).setDepth(-1205);
        this.add.circle(L.tower.px, L.tower.py, 24, 0xa8342a).setDepth(-1204);
        this.add.circle(L.tower.px, L.tower.py, 13, 0xf2e2ae).setDepth(-1203);
      } else if (L.type === 'grua') {
        const armY = L.base.py;
        block(L.px + 10, armY + 12, L.pw - 90, 22, 0x05060a, -1220, 0.45);
        block(L.base.px, armY, 78, 104, 0x5a4a2c, -1200);
        block(L.base.px, armY, 54, 78, 0x7a6438, -1195);
        block(L.px + 40, armY - 34, L.pw - 120, 20, 0xb89a3e, -1190);
        block(L.px + L.pw / 2 - 30, armY - 34, 44, 44, 0x4a4238, -1188);
        block(L.px + L.pw / 2 - 30, armY + 24, 8, 70, 0x3a352e, -1187);
        block(L.px + L.pw / 2 - 30, armY + 66, 26, 20, 0x6d6257, -1186);
      }

      this.add
        .text(L.px, L.py + L.ph / 2 + 22, L.label.toUpperCase(), {
          fontFamily: 'Consolas, monospace',
          fontSize: '15px',
          color: '#b9b2a0',
        })
        .setOrigin(0.5, 0)
        .setAlpha(0.55)
        .setDepth(-900);
    }
  }

  drawStreetLights() {
    // las farolas van en la ACERA, al borde de la calzada. La calle mide 5
    // casillas (160 px), asi que el poste se planta algo mas alla del borde.
    const BORDE = 94;
    const puntos = [];

    for (const e of this.net.edges) {
      if (e.from > e.to) continue;
      for (const t of [0.22, 0.5, 0.78]) {
        const lane = this.net.pointAlong(e, t);
        // pointAlong da el punto del CARRIL; hay que volver al eje de la calle
        const cx = lane.x - e.rx * LANE_OFFSET;
        const cy = lane.y - e.ry * LANE_OFFSET;
        for (const lado of [-1, 1]) {
          const x = cx + e.rx * BORDE * lado;
          const y = cy + e.ry * BORDE * lado;
          if (this.map.isRoadPoint(x, y)) continue;
          if (this.map.isSolidPoint(x, y)) continue;
          // el brazo apunta hacia el centro de la calle
          puntos.push({ x, y, haciaCalle: Math.atan2(-e.ry * lado, -e.rx * lado) });
        }
      }
    }

    this.lamps = puntos.map((p) => new StreetLamp(this, p.x, p.y, p.haciaCalle));
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
      mute: 'M',
    });
    this.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT,W,A,S,D,E,K,J,M,SHIFT');

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
      GameState.bumpStat('crashes', 1);
      this.cameras.main.shake(180, Math.min(0.012, impact * 0.00004));
      Audio.crash(impact / 320);

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

    this.onPedHit = ({ pedestrian, speed, fatal }) => {
      this.npcs.scare(pedestrian.x, pedestrian.y, fatal ? 420 : 300);
      this.police.report(pedestrian.x, pedestrian.y, fatal ? 2 : 1);
      Audio.crash(Math.min(0.7, speed / 400));
      this.cameras.main.shake(fatal ? 260 : 150, fatal ? 0.009 : 0.005);
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
      this.cameras.main.fadeIn(420, 0, 0, 0);
    };
    this.onDead = () => this.respawn('muerto');
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
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, v.x, v.y);
      if (d < bestDist) {
        bestDist = d;
        best = v;
      }
    }
    return best;
  }

  enterVehicle(v) {
    this.drivingVehicle = v;
    v.occupied = true;
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

    const left = k.left.isDown || k.leftArrow.isDown;
    const right = k.right.isDown || k.rightArrow.isDown;
    const up = k.up.isDown || k.upArrow.isDown;
    const down = k.down.isDown || k.downArrow.isDown;

    if (Phaser.Input.Keyboard.JustDown(k.enter)) {
      if (this.drivingVehicle) this.exitVehicle();
      else if (!this.missions.intentarEmpezar(this.player.x, this.player.y) && !this.enterHideout()) {
        const v = this.nearestVehicle();
        if (v) this.enterVehicle(v);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(k.save)) {
      SaveSystem.save();
      EventBus.emit(EVT.NOTIFY, { text: 'Partida guardada', tone: 'dim' });
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
      });
      GameState.bumpStat('metersDriven', (this.drivingVehicle.speed * dt) / 10);
    } else {
      this.player.update(dt, { left, right, up, down, run: k.run.isDown });
    }

    this.traffic.update(dt, this.player.x, this.player.y, this.npcs.people);

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
      dt, this.player.x, this.player.y, this.vehicles, this.player, !this.drivingVehicle
    );
    this.police.update(dt, this.player, this.drivingVehicle);
    this.factions.update(dt, this.player.x, this.player.y);
    this.missions.update(dt, this.player, this.drivingVehicle);
    this.resolvePlayerVsVehicles();
    this.updateLamps();
    this.checkPlayerHarm(dt);

    if (this.drivingVehicle) {
      const v = this.drivingVehicle;
      this.player.setPosition(v.x, v.y);
      Audio.engine(true, v.speed / v.stats.maxSpeed, up, ENGINES[v.stats.clase]);
      Audio.skid(Math.max(0, (v.lateral - 45) / 190));
    } else {
      Audio.engine(false, 0, false);
      Audio.skid(0);
    }

    this.jobs.update(dt, this.player.x, this.player.y);

    if (!this.jobs.active) {
      this.jobCooldown -= dt;
      if (this.jobCooldown <= 0 || Phaser.Input.Keyboard.JustDown(k.newJob)) {
        this.jobs.offerNew({ x: this.player.x, y: this.player.y });
      }
    }

    this.updateCamera(dt);

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
            if (v === this.drivingVehicle) this.cameras.main.shake(160, 0.006);
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
          this.cameras.main.shake(140, 0.008);
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
      GameState.heal(100);
      this.police.clearAll();

      if (this.drivingVehicle) {
        this.drivingVehicle.occupied = false;
        this.drivingVehicle = null;
        this.cameras.main.setFollowOffset(0, 0);
      }
      this.player.setVisible(true);

      const spot = this.findStartSpot();
      this.player.setPosition(spot.x, spot.y);
      this.hurtCooldown = 2;
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

    Audio.engine(false, 0, false);
    Audio.skid(0);
    this.captureState();
    this.cameras.main.fadeOut(360, 0, 0, 0);
    this.time.delayedCall(380, () => {
      this.scene.pause();
      this.scene.setVisible(false);
      this.scene.pause('UIScene');
      this.scene.setVisible(false, 'UIScene');
      this.scene.launch('HideoutScene');
      this.cameras.main.fadeIn(1, 0, 0, 0);
    });
    return true;
  }

  updateCamera(dt) {
    const cam = this.cameras.main;
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
      player: { x: this.player.x, y: this.player.y },
      deliveries: GameState.stats.deliveries,
      wanted: GameState.wanted,
      health: GameState.health,
      chasing: this.police.chasing,
      territory: this.factions.currentInfo(),
      mission: this.missions.estado(),
      police: this.police.units.map((u) => ({ x: u.vehicle.x, y: u.vehicle.y })),
    });
  }
}
