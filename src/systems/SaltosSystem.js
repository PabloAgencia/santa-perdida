import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';

// LOS SALTOS UNICOS (19-nov-2026), los de San Andreas: rampas repartidas por
// las avenidas mas largas. Si entras derecho y rapido, el coche vuela: camara
// lenta, el coche crece (sube) y su sombra se separa, y al caer, si es la
// primera vez que lo clavas, "SALTO UNICO" y dinero. Si caes encima de algo,
// te llevas el golpe.
//
// Mientras vuela, el coche no choca con nada ni se gira (Vehicle.enElAire).

const CUANTOS = 10;
const PREMIO = 500;
const VEL_MINIMA = 0.62;     // fraccion de la velocidad maxima del coche
const ALINEADO = 0.45;       // radianes de tolerancia con la rampa

export class SaltosSystem {
  constructor(scene, net) {
    this.scene = scene;
    this.net = net;
    this.rampas = [];
    this.salto = null;
    this.colocar();
  }

  get camaraLenta() { return !!this.salto; }

  colocar() {
    const m = this.scene.map;
    // las avenidas mas largas, de una en una y separadas entre si; orden fijo
    // (por longitud y luego por id) para que las rampas esten siempre en el
    // mismo sitio y lo de "ya lo clave" se guarde bien
    const largos = this.net.edges
      .filter((e) => e.length > 520)
      .sort((a, b) => b.length - a.length || a.id - b.id);
    for (const e of largos) {
      if (this.rampas.length >= CUANTOS) break;
      const from = this.net.nodes[e.from];
      const x = from.x + e.dx * e.length * 0.3;
      const y = from.y + e.dy * e.length * 0.3;
      // tiene que caer en calzada, con calzada delante para aterrizar
      if (!m.isRoadPoint(x, y) || !m.isRoadPoint(x + e.dx * 260, y + e.dy * 260)) continue;
      if (this.rampas.some((r) => Math.hypot(r.x - x, r.y - y) < 1500)) continue;
      const r = { id: `salto-${this.rampas.length}`, x, y, angulo: e.angle };
      this.rampas.push(r);
      this.pintar(r);
    }
  }

  pintar(r) {
    const s = this.scene;
    const c = s.add.container(r.x, r.y).setRotation(r.angulo).setDepth(-850);
    c.add(s.add.rectangle(0, 0, 38, 34, 0x3a3f46));
    for (let i = -2; i <= 2; i++) c.add(s.add.rectangle(-8 + i * 6, 0, 3, 30, i % 2 ? 0xe8c040 : 0x15181d));
    // la flecha: por donde se entra
    c.add(s.add.triangle(14, 0, 0, -10, 0, 10, 12, 0, 0xe8c040));
    r.dibujo = c;
    if ((GameState.flags.saltos || {})[r.id]) c.setAlpha(0.6);
  }

  update(dt, v) {
    if (this.salto) { this.volar(dt); return; }
    if (!v || v.quemado) return;
    const vmax = v.stats.maxSpeed;
    if (v.speed < vmax * VEL_MINIMA) return;
    for (const r of this.rampas) {
      if (Math.abs(v.x - r.x) > 30 || Math.abs(v.y - r.y) > 30) continue;
      if (Math.hypot(v.x - r.x, v.y - r.y) > 24) continue;
      const rumbo = Math.atan2(v.vy, v.vx);
      if (Math.abs(Phaser.Math.Angle.Wrap(rumbo - r.angulo)) > ALINEADO) continue;
      this.despegar(v, r);
      return;
    }
  }

  despegar(v, r) {
    const fuerza = Math.min(1, v.speed / v.stats.maxSpeed);
    this.salto = { v, r, t: 0, dura: 0.85 + fuerza * 0.55, zoom: this.scene.cameras.main.zoom };
    v.enElAire = true;
    Audio.crash(0.25);
    this.scene.cameras.main.zoomTo(this.salto.zoom * 0.82, 260);
  }

  volar(dt) {
    const s = this.salto;
    const v = s.v;
    // el tiempo del salto va en tiempo REAL de juego, aunque el mundo vaya lento
    s.t += dt;
    const k = Math.min(1, s.t / s.dura);
    const alto = Math.sin(Math.PI * k);
    v.sprite.setScale(1 + 0.5 * alto);
    v.alturaSalto = alto;
    v.sprite.setDepth(v.y + 2000 * alto);
    if (k < 1) return;

    // aterrizaje
    v.enElAire = false;
    v.alturaSalto = 0;
    v.sprite.setScale(1);
    this.salto = null;
    this.scene.cameras.main.zoomTo(s.zoom, 300);
    const m = this.scene.map;
    if (m.isSolidBox(v.x, v.y, 12, 12)) {
      // caer encima de algo: golpe y fuera al primer hueco libre
      const libre = this.huecoCerca(v.x, v.y);
      v.x = libre.x; v.y = libre.y;
      v.hp = Math.max(0, v.hp - v.stats.maxHp * 0.35);
      v.vx *= 0.2; v.vy *= 0.2;
      Audio.crash(0.8);
      this.scene.cameras.main.shake(260, 0.008);
      EventBus.emit(EVT.NOTIFY, { text: 'Mal aterrizaje', tone: 'danger' });
      return;
    }
    Audio.crash(0.5);
    this.scene.cameras.main.shake(160, 0.004);
    GameState.flags.saltos = GameState.flags.saltos || {};
    if (!GameState.flags.saltos[s.r.id]) {
      GameState.flags.saltos[s.r.id] = true;
      s.r.dibujo.setAlpha(0.6);
      const hechos = Object.keys(GameState.flags.saltos).length;
      GameState.addMoney(PREMIO, 'salto unico');
      EventBus.emit(EVT.BIG_MESSAGE, {
        title: 'SALTO UNICO', subtitle: `${hechos} de ${this.rampas.length}  ·  +${PREMIO} €`, color: '#e8b54a',
      });
    } else {
      EventBus.emit(EVT.NOTIFY, { text: 'Buen salto', tone: 'money' });
    }
  }

  huecoCerca(x, y) {
    const m = this.scene.map;
    for (let r = 20; r < 400; r += 16) {
      for (let a = 0; a < Math.PI * 2; a += 0.4) {
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (!m.isSolidBox(px, py, 16, 16)) return { x: px, y: py };
      }
    }
    return { x, y };
  }
}
