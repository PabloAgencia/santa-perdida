import { Audio } from '../core/Audio.js';

// FISICAS DE LOS INTERIORES (club, gimnasio, concesionario, pisos).
//
// Los interiores son escenas aparte, planas, sin el mapa de la ciudad: antes
// el jugador solo estaba encerrado dentro del rectangulo de la sala, asi que
// atravesaba la barra, los muebles y a la gente. Aqui hay lo minimo para que
// tengan cuerpo:
//
//   rectangulos   muebles y barras: el jugador (un circulo) no entra
//   cuerpos       la gente de dentro: tampoco se atraviesa, y SE PUEDE PEGAR
//
// Los rectangulos se ponen A OJO sobre la ilustracion de cada sala, un poco
// mas pequeños que el mueble para no dejar zonas de E inalcanzables.

const RADIO_JUGADOR = 9;
const RADIO_GENTE = 10;
const ALCANCE_GOLPE = 34;
const GOLPES_PARA_CAER = 3;

export class FisicaInterior {
  constructor(scene) {
    this.scene = scene;
    this.rects = [];
    this.cuerpos = [];
    this.recarga = 0;
  }

  // x,y = centro
  rect(x, y, w, h) {
    this.rects.push({ x: x - w / 2, y: y - h / 2, w, h });
  }

  // alguien de dentro: un sprite que puede estar quieto o moviendose solo.
  // `alCaer` deja a la escena parar lo que le movia (un paseo, un baile).
  gente(spr, alCaer = null) {
    const c = { spr, golpes: 0, caido: false, alCaer };
    this.cuerpos.push(c);
    return c;
  }

  choca(x, y, r) {
    for (const q of this.rects) {
      const cx = Phaser.Math.Clamp(x, q.x, q.x + q.w);
      const cy = Phaser.Math.Clamp(y, q.y, q.y + q.h);
      if (Math.hypot(x - cx, y - cy) < r) return true;
    }
    for (const c of this.cuerpos) {
      if (c.caido) continue;
      if (Math.hypot(x - c.spr.x, y - c.spr.y) < r + RADIO_GENTE - 3) return true;
    }
    return false;
  }

  // mueve eje a eje: si uno esta tapado, se desliza por el otro
  mover(px, py, dx, dy) {
    let x = px;
    let y = py;
    // si ya estas dentro de algo (te pusieron ahi al salir de un minijuego),
    // se te deja salir en vez de quedarte clavado
    if (this.choca(px, py, RADIO_JUGADOR)) return { x: px + dx, y: py + dy };
    if (dx && !this.choca(x + dx, y, RADIO_JUGADOR)) x += dx;
    if (dy && !this.choca(x, y + dy, RADIO_JUGADOR)) y += dy;
    return { x, y };
  }

  // Pega al mas cercano que tengas delante. Devuelve true si le dio a alguien.
  golpear(px, py, angulo) {
    let mejor = null;
    let mejorDist = ALCANCE_GOLPE;
    for (const c of this.cuerpos) {
      if (c.caido) continue;
      const d = Math.hypot(c.spr.x - px, c.spr.y - py);
      if (d > mejorDist) continue;
      const a = Math.atan2(c.spr.y - py, c.spr.x - px);
      if (Math.abs(Phaser.Math.Angle.Wrap(a - angulo)) > 1.3 && d > 18) continue;
      mejor = c;
      mejorDist = d;
    }
    if (!Audio.soltar('golpe', 0.6)) Audio.crash(0.18);
    if (!mejor) return false;

    const spr = mejor.spr;
    mejor.golpes++;
    spr.setTint(0xff8a7a);
    this.scene.time.delayedCall(120, () => {
      if (spr.active && !mejor.caido) spr.clearTint();
    });
    // un empujon para que se note, sin sacarlo de la sala
    const a = Math.atan2(spr.y - py, spr.x - px);
    const nx = spr.x + Math.cos(a) * 6;
    const ny = spr.y + Math.sin(a) * 6;
    if (!this.choca(nx, ny, RADIO_GENTE - 2)) spr.setPosition(nx, ny);

    if (mejor.golpes >= GOLPES_PARA_CAER) {
      mejor.caido = true;
      this.scene.tweens.killTweensOf(spr);
      if (mejor.alCaer) mejor.alCaer();
      spr.setTint(0x6e3a34);
      spr.setAngle(90);
      spr.setDepth(1);
    }
    return true;
  }

  // El jugador pega con F o clic izquierdo; el cooldown evita metralleta.
  atacar(px, py, angulo, dt = 0) {
    if (this.recarga > 0) return false;
    this.recarga = 0.34;
    return this.golpear(px, py, angulo);
  }

  update(dt) {
    if (this.recarga > 0) this.recarga -= dt;
  }

  // EL CAMINO HASTA UN PUNTO (la puerta, casi siempre) sin atravesar
  // muebles ni paredes. Una rejilla de 10 px sobre la sala y, desde el
  // destino, cuantos pasos hay hasta cada casilla libre. Quien huye baja
  // siempre a la casilla vecina con menos pasos, asi rodea lo que haya en
  // medio. Se calcula una vez por destino (lo usan LocalScene y
  // RoboCasaScene).
  pasoHacia(sala, destino, x, y) {
    const C = 10;
    const cols = Math.ceil(sala.w / C);
    const filas = Math.ceil(sala.h / C);
    const clave = `${Math.round(destino.x)},${Math.round(destino.y)}`;
    this.campos = this.campos || new Map();
    let dist = this.campos.get(clave);
    if (!dist) {
      dist = new Int32Array(cols * filas).fill(-1);
      const libre = (i, j) => {
        const px = sala.x + i * C + C / 2;
        const py = sala.y + j * C + C / 2;
        return !this.rects.some((q) => {
          const cx = Phaser.Math.Clamp(px, q.x, q.x + q.w);
          const cy = Phaser.Math.Clamp(py, q.y, q.y + q.h);
          return Math.hypot(px - cx, py - cy) < 8;
        });
      };
      const di0 = Phaser.Math.Clamp(Math.floor((destino.x - sala.x) / C), 0, cols - 1);
      const dj0 = Phaser.Math.Clamp(Math.floor((destino.y - sala.y) / C), 0, filas - 1);
      dist[dj0 * cols + di0] = 0;
      const cola = [[di0, dj0]];
      for (let k = 0; k < cola.length; k++) {
        const [i, j] = cola[k];
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + a;
          const nj = j + b;
          if (ni < 0 || nj < 0 || ni >= cols || nj >= filas) continue;
          if (dist[nj * cols + ni] >= 0 || !libre(ni, nj)) continue;
          dist[nj * cols + ni] = dist[j * cols + i] + 1;
          cola.push([ni, nj]);
        }
      }
      this.campos.set(clave, dist);
    }
    if (Math.hypot(destino.x - x, destino.y - y) < 20) return destino;
    const i = Phaser.Math.Clamp(Math.floor((x - sala.x) / C), 0, cols - 1);
    const j = Phaser.Math.Clamp(Math.floor((y - sala.y) / C), 0, filas - 1);
    let mejor = null;
    let mejorD = dist[j * cols + i] >= 0 ? dist[j * cols + i] : Infinity;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const ni = i + a;
      const nj = j + b;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= filas) continue;
      const d = dist[nj * cols + ni];
      if (d < 0) continue;
      // en diagonal solo si las dos rectas de al lado tambien estan libres
      if (a && b && (dist[j * cols + ni] < 0 || dist[nj * cols + i] < 0)) continue;
      if (d < mejorD) { mejorD = d; mejor = [ni, nj]; }
    }
    if (!mejor) return destino;
    return { x: sala.x + mejor[0] * C + C / 2, y: sala.y + mejor[1] * C + C / 2 };
  }
}
