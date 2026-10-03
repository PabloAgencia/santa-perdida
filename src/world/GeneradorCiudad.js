// EL GENERADOR DE LA CIUDAD GRANDE (PLAN-MAPA-GRANDE.txt).
//
// Antes la ciudad eran 13 calles horizontales y 14 verticales de punta a
// punta. Aqui las calles son un GRAFO: puntos y tramos en cualquier angulo,
// y cada barrio tiene su forma de trazarlas. Luego se estampan en la rejilla
// de casillas, que sigue mandando para colisiones, peatones y territorios.
//
// No usa Phaser: es JavaScript pelado para poder ejecutarlo en Node y sacar
// una imagen del mapa sin abrir el juego (herramientas/ver-mapa.mjs).
//
// Todo va en CASILLAS (con decimales). Todo sale de la semilla: la ciudad es
// siempre la misma.

import { T } from '../config/city.js';

// ---------- azar con semilla ----------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ruido suave de una dimension: unas cuantas ondas con fase y frecuencia al
// azar. Devuelve mas o menos entre -1 y 1. Para costas, orillas y bordes.
function ruido1D(rng, ondas = 4, base = 0.02) {
  const w = [];
  for (let i = 0; i < ondas; i++) {
    w.push({ f: base * (1 + i * 1.7) * (0.7 + rng() * 0.6), p: rng() * 6.283, a: 1 / (i + 1) });
  }
  const norma = w.reduce((s, o) => s + o.a, 0);
  return (x) => w.reduce((s, o) => s + Math.sin(x * o.f + o.p) * o.a, 0) / norma;
}

function ruido2D(rng, base = 0.03) {
  const w = [];
  for (let i = 0; i < 3; i++) {
    w.push({
      fx: base * (1 + i) * (0.6 + rng() * 0.8), fy: base * (1 + i) * (0.6 + rng() * 0.8),
      px: rng() * 6.283, py: rng() * 6.283, a: 1 / (i + 1),
    });
  }
  const norma = w.reduce((s, o) => s + o.a, 0);
  return (x, y) => w.reduce((s, o) => s + Math.sin(x * o.fx + o.px) * Math.cos(y * o.fy + o.py) * o.a, 0) / norma;
}

// ---------- geometria ----------

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// punto de corte de dos segmentos, como parametros (t en el primero, u en el
// segundo), o null si no se tocan
function corte(a, b, c, d) {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null;
  return { t, u };
}

// Catmull-Rom: una linea suave que pasa por los puntos de control, en
// trozos de `paso` casillas mas o menos. Para autovia, costa y monte.
function curvaSuave(puntos, paso = 5, cerrada = false) {
  const P = cerrada ? [puntos[puntos.length - 1], ...puntos, puntos[0], puntos[1]]
    : [puntos[0], ...puntos, puntos[puntos.length - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2];
    const largo = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(1, Math.round(largo / paso));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!cerrada) out.push(puntos[puntos.length - 1]);
  else out.push(out[0]);
  return out;
}

// ---------- el generador ----------

export class GeneradorCiudad {
  constructor(cfg) {
    this.cfg = cfg;
    this.w = cfg.width;
    this.h = cfg.height;
    this.rng = mulberry32(cfg.seed);
    const N = this.w * this.h;
    this.grid = new Uint8Array(N).fill(T.GRASS);
    this.tierra = new Uint8Array(N);     // 1 = suelo firme (ni mar, ni rio)
    this.roca = new Uint8Array(N);       // 1 = monte macizo
    this.distrito = new Uint8Array(N);   // indice en cfg.distritos + 1
    this.roadMask = new Uint8Array(N);
    this.puenteMask = new Uint8Array(N);
    this.crossMask = new Uint8Array(N);
    this.ocupado = new Uint8Array(N);    // edificios, landmarks, aceras
    this.nodos = [];
    this.tramos = [];
    this.edificios = [];
  }

  idx(x, y) { return y * this.w + x; }
  dentro(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  esTierra(x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    return this.dentro(tx, ty) && this.tierra[this.idx(tx, ty)] === 1;
  }

  distritoEn(x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (!this.dentro(tx, ty)) return null;
    const d = this.distrito[this.idx(tx, ty)];
    return d ? this.cfg.distritos[d - 1] : null;
  }

  generar() {
    this.terreno();
    this.repartirDistritos();
    this.trazarArterias();
    this.reservas = [];
    this.reservarSitiosGrandes();
    this.trazarBarrios();
    this.construirGrafo();
    this.estamparCalles();
    this.pintarAceras();
    this.marcarCebras();
    this.reservarLandmarks();
    this.levantarEdificios();
    this.afueras();
    return this;
  }

  // ---------- 1. el terreno: costa, rio y monte ----------

  terreno() {
    const c = this.cfg;
    const costaSur = ruido1D(this.rng, 5, 0.018);
    const costaEste = ruido1D(this.rng, 5, 0.02);
    const sierra = ruido1D(this.rng, 4, 0.025);
    const oeste = ruido1D(this.rng, 3, 0.03);

    // la bahia del puerto: un mordisco grande de mar en la costa sur
    const bahia = c.bahia;
    this.lineaCostaSur = (x) => {
      let y = c.costa.sur + costaSur(x) * c.costa.amplitud;
      const d = (x - bahia.x) / bahia.ancho;
      if (Math.abs(d) < 1) y -= bahia.fondo * (0.5 + 0.5 * Math.cos(d * Math.PI));
      return y;
    };
    this.lineaCostaEste = (y) => c.costa.este + costaEste(y) * c.costa.amplitud;
    this.lineaSierra = (x) => c.sierra.alto + sierra(x) * c.sierra.amplitud;
    this.lineaOeste = (y) => c.sierra.oeste + oeste(y) * 16;

    // el rio, como una curva suave con su ancho
    this.rio = curvaSuave(c.rio.puntos, 3);

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = this.idx(x, y);
        const mar = y > this.lineaCostaSur(x) || x > this.lineaCostaEste(y);
        if (mar) { this.grid[i] = T.WATER; continue; }
        this.tierra[i] = 1;
        // la arena: una franja en la orilla del mar
        if (y > this.lineaCostaSur(x) - c.costa.arena || x > this.lineaCostaEste(y) - c.costa.arena) {
          this.grid[i] = T.SAND;
        }
        if (y < this.lineaSierra(x) || x < this.lineaOeste(y)) {
          this.roca[i] = 1;
          this.grid[i] = T.ROCK;
        }
      }
    }

    // el rio corta la tierra (y la roca: baja del monte). De paso se apunta
    // que casillas quedan cerca del rio (para no confundir su agua con la
    // del mar) y por donde pasa en cada fila (para saber en que orilla cae
    // cada casilla sin recorrer el rio entero cada vez).
    this.cercaRio = new Uint8Array(this.w * this.h);
    this.rioX = new Float32Array(this.h).fill(NaN);
    for (let k = 0; k < this.rio.length - 1; k++) {
      const [ax, ay] = this.rio[k];
      const [bx, by] = this.rio[k + 1];
      const r = c.rio.ancho / 2;
      const R = r + 3;
      const x0 = Math.floor(Math.min(ax, bx) - R - 1);
      const x1 = Math.ceil(Math.max(ax, bx) + R + 1);
      const y0 = Math.floor(Math.min(ay, by) - R - 1);
      const y1 = Math.ceil(Math.max(ay, by) + R + 1);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!this.dentro(x, y)) continue;
          const d = distSeg(x + 0.5, y + 0.5, ax, ay, bx, by);
          if (d > R) continue;
          const i = this.idx(x, y);
          this.cercaRio[i] = 1;
          if (d > r) continue;
          this.tierra[i] = 0;
          this.roca[i] = 0;
          this.grid[i] = T.WATER;
        }
      }
      for (let y = Math.max(0, Math.ceil(Math.min(ay, by))); y <= Math.min(this.h - 1, Math.floor(Math.max(ay, by))); y++) {
        if (!Number.isNaN(this.rioX[y])) continue;
        const t = by === ay ? 0 : (y - ay) / (by - ay);
        this.rioX[y] = ax + (bx - ax) * t;
      }
    }
  }

  // ---------- 2. los barrios ----------
  //
  // Cada barrio tiene un centro; cada casilla es del centro mas cercano,
  // con un poco de ruido para que la frontera no sea una raya recta. El rio
  // hace de frontera natural: un barrio no salta de orilla.
  repartirDistritos() {
    const ds = this.cfg.distritos;
    const ruido = ruido2D(this.rng, 0.035);
    const orilla = (x) => {
      // en que lado del rio esta x a esta altura: -1 oeste, 1 este
      return x;
    };
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = this.idx(x, y);
        if (!this.tierra[i] || this.roca[i]) continue;
        const lado = this.ladoDelRio(x, y);
        let mejor = 0;
        let mejorD = Infinity;
        for (let k = 0; k < ds.length; k++) {
          const d = ds[k];
          if (d.lado && d.lado !== lado) continue;
          const dist = Math.hypot((x - d.x) / (d.peso || 1), (y - d.y) / (d.peso || 1))
            + ruido(x + k * 37, y - k * 53) * 14;
          if (dist < mejorD) { mejorD = dist; mejor = k + 1; }
        }
        this.distrito[i] = mejor;
      }
    }
    void orilla;
  }

  // -1 si queda al oeste del rio, 1 al este. El rio baja de norte a sur, asi
  // que basta con buscar su x a la misma altura.
  ladoDelRio(x, y) {
    const rx = this.rioX[Math.max(0, Math.min(this.h - 1, Math.floor(y)))];
    if (Number.isNaN(rx)) return 1;
    return x < rx ? -1 : 1;
  }

  // ---------- 3. las calles ----------

  // Cada calle se guarda como una lista de segmentos sueltos. Al final se
  // cortan entre si y salen los cruces solos.
  añadirLinea(puntos, tipo = 'calle') {
    for (let k = 0; k < puntos.length - 1; k++) {
      const a = { x: puntos[k][0], y: puntos[k][1] };
      const b = { x: puntos[k + 1][0], y: puntos[k + 1][1] };
      if (Math.hypot(b.x - a.x, b.y - a.y) < 0.5) continue;
      this.segmentos.push({ a, b, tipo });
    }
  }

  // Las grandes: autovia, costera, avenida diagonal, carretera del monte.
  // Estas cruzan el rio (y ahi salen los puentes) y el monte.
  trazarArterias() {
    this.segmentos = [];
    for (const art of this.cfg.arterias) {
      let puntos = art.puntos;
      if (art.costera) {
        // la costera sigue la orilla, metida tierra adentro
        puntos = [];
        for (let x = art.desde; x <= art.hasta; x += 12) {
          puntos.push([x, this.lineaCostaSur(x) - art.margen]);
        }
      }
      const curva = art.recta ? puntos : curvaSuave(puntos, 5, !!art.cerrada);
      this.añadirLinea(curva, art.tipo || 'arteria');
    }
    this.arterias = this.segmentos.slice();
  }

  // ¿Esta este punto demasiado cerca de una arteria? Las calles de barrio se
  // cortan ahi para no correr pegadas a ella en paralelo.
  pegadoAArteria(x, y, dx, dy, margen) {
    for (const s of this.arterias) {
      if (distSeg(x, y, s.a.x, s.a.y, s.b.x, s.b.y) > margen) continue;
      const sx = s.b.x - s.a.x;
      const sy = s.b.y - s.a.y;
      const l = Math.hypot(sx, sy) || 1;
      const coseno = Math.abs((sx * dx + sy * dy) / l);
      if (coseno > 0.8) return true;   // casi paralela: estorba
    }
    return false;
  }

  // ¿cae este punto dentro de un sitio reservado, ampliado `margen`?
  enReserva(x, y, margen) {
    for (const r of this.reservas) {
      if (x > r.x - margen && x < r.x + r.w + margen && y > r.y - margen && y < r.y + r.h + margen) return true;
    }
    return false;
  }

  // LOS SITIOS GRANDES (casino, estadio, carcel...) se reservan ANTES de
  // trazar las calles del barrio: no caben en una manzana normal. Cada uno
  // lleva una calle alrededor (a 4,5 casillas: 2 de acera y media calzada),
  // y las calles del barrio se cortan antes de llegar y luego se alargan
  // hasta esa calle, asi que el sitio queda como una manzana propia.
  reservarSitiosGrandes() {
    const ANILLO = 4.5;
    for (const L of this.cfg.landmarks || []) {
      if (L.costa) continue;
      const k = this.cfg.distritos.findIndex((x) => x.nombre === L.distrito);
      if (k < 0) continue;
      const d = this.cfg.distritos[k];
      const ox = d.x + (L.dx || 0);
      const oy = d.y + (L.dy || 0);
      const M = 6;   // margen que tiene que ser tierra del barrio
      const valeEn = (x, y) => {
        for (let yy = y - M; yy < y + L.h + M; yy += 1) {
          for (let xx = x - M; xx < x + L.w + M; xx += 1) {
            if (!this.dentro(xx, yy)) return false;
            const i = this.idx(xx, yy);
            if (!this.tierra[i] || this.roca[i] || this.distrito[i] !== k + 1) return false;
          }
        }
        for (const r of this.reservas) {
          if (x < r.x + r.w + 12 && x + L.w + 12 > r.x && y < r.y + r.h + 12 && y + L.h + 12 > r.y) return false;
        }
        for (const s of this.arterias) {
          const cx = x + L.w / 2;
          const cy = y + L.h / 2;
          // la arteria no puede pasar por el sitio ni por su calle de alrededor
          if (distSeg(cx, cy, s.a.x, s.a.y, s.b.x, s.b.y) < Math.hypot(L.w, L.h) / 2 + ANILLO + 4) return false;
        }
        return true;
      };
      let mejor = null;
      let mejorD = Infinity;
      for (let y = 2; y + L.h < this.h - 2; y += 2) {
        for (let x = 2; x + L.w < this.w - 2; x += 2) {
          const dist = Math.hypot(x + L.w / 2 - ox, y + L.h / 2 - oy);
          if (dist >= mejorD) continue;
          if (!valeEn(x, y)) continue;
          mejor = { x, y };
          mejorD = dist;
        }
      }
      if (!mejor) continue;
      const r = { ...L, x: mejor.x, y: mejor.y };
      this.reservas.push(r);
      // la calle de alrededor
      const x0 = r.x - ANILLO; const y0 = r.y - ANILLO;
      const x1 = r.x + r.w + ANILLO; const y1 = r.y + r.h + ANILLO;
      this.añadirLinea([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], d.rural ? 'carretera' : 'calle');
    }
  }

  // Las calles de cada barrio. Todos los trazados salen de lo mismo: una
  // rejilla girada y deformada, y cada barrio la gira, la tuerce y la
  // espacia a su manera. Cada linea se recorta a su barrio y a tierra firme.
  trazarBarrios() {
    const ds = this.cfg.distritos;
    for (let k = 0; k < ds.length; k++) {
      const d = ds[k];
      const t = d.trazado;
      if (!t) continue;
      const rngD = mulberry32(this.cfg.seed + k * 7919);
      const ondaA = ruido1D(rngD, 3, t.ondulacion || 0.0001);
      const ondaB = ruido1D(rngD, 3, t.ondulacion || 0.0001);

      // la caja del barrio
      let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
      for (let y = 0; y < this.h; y += 2) {
        for (let x = 0; x < this.w; x += 2) {
          if (this.distrito[this.idx(x, y)] !== k + 1) continue;
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
      }
      if (x0 === Infinity) continue;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 10;
      const ang = (t.angulo || 0) * Math.PI / 180;
      const ux = Math.cos(ang); const uy = Math.sin(ang);
      const vx = -uy; const vy = ux;

      // dos familias de lineas: a lo largo de u (separadas sv) y de v (su)
      const familias = [
        { dir: [ux, uy], perp: [vx, vy], sep: t.sepB, onda: ondaA },
        { dir: [vx, vy], perp: [ux, uy], sep: t.sepA, onda: ondaB },
      ];
      for (const fam of familias) {
        const desfase = rngD() * fam.sep;
        for (let o = -R + desfase; o <= R; o += fam.sep * (1 + ((rngD() - 0.5) * (t.irregular || 0)))) {
          // la linea: del centro, desplazada o, de -R a R a lo largo de dir
          const run = [];
          const corta = () => {
            if (run.length >= 2) this.añadirLinea(run.slice(), d.tipoCalle || 'calle');
            run.length = 0;
          };
          for (let s = -R; s <= R; s += 2) {
            // la deformacion: la linea se curva hacia los lados
            const curva = fam.onda(s + o * 3) * (t.curva || 0);
            const px = cx + fam.perp[0] * (o + curva) + fam.dir[0] * s;
            const py = cy + fam.perp[1] * (o + curva) + fam.dir[1] * s;
            const ok = this.esTierra(px, py) && !this.roca[this.idx(Math.floor(px), Math.floor(py))]
              && this.distrito[this.idx(Math.floor(px), Math.floor(py))] === k + 1
              && !this.pegadoAArteria(px, py, fam.dir[0], fam.dir[1], 9)
              && !this.enReserva(px, py, 7);
            if (ok) run.push([px, py]); else corta();
          }
          corta();
        }
      }
    }
  }

  // ---------- 4. el grafo: cortes, cruces y limpieza ----------

  construirGrafo() {
    const segs = this.segmentos;

    // a) cortar cada segmento por donde lo cruzan los demas, con una rejilla
    // de cubos para no comparar todos con todos
    const CUBO = 16;
    const cubos = new Map();
    segs.forEach((s, i) => {
      s.cortes = [0, 1];
      const bx0 = Math.floor(Math.min(s.a.x, s.b.x) / CUBO);
      const bx1 = Math.floor(Math.max(s.a.x, s.b.x) / CUBO);
      const by0 = Math.floor(Math.min(s.a.y, s.b.y) / CUBO);
      const by1 = Math.floor(Math.max(s.a.y, s.b.y) / CUBO);
      for (let by = by0; by <= by1; by++) {
        for (let bx = bx0; bx <= bx1; bx++) {
          const k = `${bx},${by}`;
          if (!cubos.has(k)) cubos.set(k, []);
          cubos.get(k).push(i);
        }
      }
    });
    const vistos = new Set();
    for (const lista of cubos.values()) {
      for (let p = 0; p < lista.length; p++) {
        for (let q = p + 1; q < lista.length; q++) {
          const i = lista[p]; const j = lista[q];
          const clave = i < j ? i * 1e6 + j : j * 1e6 + i;
          if (vistos.has(clave)) continue;
          vistos.add(clave);
          const r = corte(segs[i].a, segs[i].b, segs[j].a, segs[j].b);
          if (!r) continue;
          segs[i].cortes.push(r.t);
          segs[j].cortes.push(r.u);
        }
      }
    }

    // b) los nodos: cada punto de corte o de final, juntando los que caen
    // practicamente en el mismo sitio
    const nodos = [];
    const indice = new Map();
    const nodoEn = (x, y) => {
      const k = `${Math.round(x * 2)},${Math.round(y * 2)}`;
      if (indice.has(k)) return indice.get(k);
      const id = nodos.length;
      nodos.push({ id, x, y, vec: new Set() });
      indice.set(k, id);
      return id;
    };
    const tramos = new Map();
    const unir = (a, b, tipo) => {
      if (a === b) return;
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (tramos.has(k)) return;
      tramos.set(k, { a: Math.min(a, b), b: Math.max(a, b), tipo });
      nodos[a].vec.add(b);
      nodos[b].vec.add(a);
    };
    for (const s of segs) {
      const ts = [...new Set(s.cortes.map((t) => Math.round(t * 1e4) / 1e4))].sort((p, q) => p - q);
      let ant = null;
      for (const t of ts) {
        const id = nodoEn(s.a.x + (s.b.x - s.a.x) * t, s.a.y + (s.b.y - s.a.y) * t);
        if (ant !== null) unir(ant, id, s.tipo);
        ant = id;
      }
    }
    this.nodos = nodos;
    this.tramosMap = tramos;

    // c) juntar cruces demasiado pegados: dos cruces a menos de 5 casillas
    // no caben (el semaforo esta a 3 del centro). Solo se juntan nodos que
    // NO son un simple punto de curva (los de grado 2 se respetan).
    this.juntarNodos(4.5);
    // d) los callejones sin salida que dejan los bordes de barrio: se
    // alargan hasta la calle de delante, si la hay cerca y por tierra
    this.alargarSinSalida(16);
    this.juntarNodos(4.5);
    // e) quitar trozos sueltos que no conectan con la ciudad
    this.quedarseConLaRedPrincipal();
    // f) en los barrios con calles sin salida (residencial, casco), quitar
    // algunos tramos sin romper la red
    this.abrirSinSalidas();
    // g) calles que se solapan (pasan a menos de una calzada y no se cruzan
    // en un cruce): se quita la mas corta, y los muñones que queden
    this.quitarSolapes();
    this.podarMuñones(10);
    // h) los nodos de paso en linea recta sobran: se juntan sus tramos
    this.simplificarRectas();
    this.compactar();
  }

  tramoKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

  quitarTramo(a, b) {
    this.tramosMap.delete(this.tramoKey(a, b));
    this.nodos[a].vec.delete(b);
    this.nodos[b].vec.delete(a);
  }

  ponerTramo(a, b, tipo) {
    if (a === b || this.tramosMap.has(this.tramoKey(a, b))) return;
    this.tramosMap.set(this.tramoKey(a, b), { a: Math.min(a, b), b: Math.max(a, b), tipo });
    this.nodos[a].vec.add(b);
    this.nodos[b].vec.add(a);
  }

  tipoDe(a, b) { return this.tramosMap.get(this.tramoKey(a, b))?.tipo || 'calle'; }

  // un nodo absorbe a otro: los tramos del absorbido pasan al que queda
  absorber(queda, va) {
    const n = this.nodos[va];
    for (const v of [...n.vec]) {
      const tipo = this.tipoDe(va, v);
      this.quitarTramo(va, v);
      if (v !== queda) this.ponerTramo(queda, v, tipo);
    }
    n.muerto = true;
  }

  juntarNodos(radio) {
    const vivos = () => this.nodos.filter((n) => !n.muerto && n.vec.size > 0);
    let cambio = true;
    let vueltas = 0;
    while (cambio && vueltas++ < 6) {
      cambio = false;
      const CUBO = radio * 2;
      const cubos = new Map();
      for (const n of vivos()) {
        const k = `${Math.floor(n.x / CUBO)},${Math.floor(n.y / CUBO)}`;
        if (!cubos.has(k)) cubos.set(k, []);
        cubos.get(k).push(n);
      }
      for (const n of vivos()) {
        if (n.muerto) continue;
        const cx = Math.floor(n.x / CUBO);
        const cy = Math.floor(n.y / CUBO);
        for (let dy = -1; dy <= 1 && !n.muerto; dy++) {
          for (let dx = -1; dx <= 1 && !n.muerto; dx++) {
            for (const m of cubos.get(`${cx + dx},${cy + dy}`) || []) {
              if (m === n || m.muerto || n.muerto) continue;
              if (Math.hypot(m.x - n.x, m.y - n.y) > radio) continue;
              // dos puntos de curva seguidos de la misma calle no se tocan
              if (n.vec.size === 2 && m.vec.size === 2) continue;
              // el que tiene mas calles se queda, en el punto medio
              const [queda, va] = n.vec.size >= m.vec.size ? [n, m] : [m, n];
              queda.x = (queda.x * 2 + va.x) / 3;
              queda.y = (queda.y * 2 + va.y) / 3;
              this.absorber(queda.id, va.id);
              cambio = true;
            }
          }
        }
      }
    }
  }

  // Un final de calle (grado 1) mira hacia delante: si a menos de `largo`
  // casillas hay otra calle, y el camino es tierra firme, se une a ella.
  alargarSinSalida(largo) {
    // los tramos por cubos de 8 casillas, para no mirar la ciudad entera en
    // cada paso de cada calle sin salida
    const CUBO = 8;
    const cubos = new Map();
    const apuntar = (t) => {
      const A = this.nodos[t.a]; const B = this.nodos[t.b];
      const x0 = Math.floor(Math.min(A.x, B.x) / CUBO); const x1 = Math.floor(Math.max(A.x, B.x) / CUBO);
      const y0 = Math.floor(Math.min(A.y, B.y) / CUBO); const y1 = Math.floor(Math.max(A.y, B.y) / CUBO);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const k = `${x},${y}`;
        if (!cubos.has(k)) cubos.set(k, []);
        cubos.get(k).push(t);
      }
    };
    for (const t of this.tramosMap.values()) apuntar(t);
    const tramosCerca = (px, py) => {
      const out = [];
      const cx = Math.floor(px / CUBO); const cy = Math.floor(py / CUBO);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        for (const t of cubos.get(`${cx + dx},${cy + dy}`) || []) {
          if (this.tramosMap.get(this.tramoKey(t.a, t.b)) === t) out.push(t);
        }
      }
      return out;
    };
    for (const n of this.nodos) {
      if (n.muerto || n.vec.size !== 1) continue;
      const v = this.nodos[[...n.vec][0]];
      const dx = n.x - v.x;
      const dy = n.y - v.y;
      const l = Math.hypot(dx, dy) || 1;
      const ux = dx / l; const uy = dy / l;
      let mejor = null;
      for (let s = 1; s <= largo && !mejor; s += 0.5) {
        const px = n.x + ux * s;
        const py = n.y + uy * s;
        const tx = Math.floor(px); const ty = Math.floor(py);
        if (!this.dentro(tx, ty) || !this.tierra[this.idx(tx, ty)] || this.roca[this.idx(tx, ty)]) break;
        if (this.enReserva(px, py, 4)) break;
        for (const t of tramosCerca(px, py)) {
          if (t.a === n.id || t.b === n.id) continue;
          const A = this.nodos[t.a]; const B = this.nodos[t.b];
          if (distSeg(px, py, A.x, A.y, B.x, B.y) < 0.7) {
            // solo si la corta con angulo: rozandola en paralelo saldria una
            // mancha de asfalto el doble de ancha
            const tl = Math.hypot(B.x - A.x, B.y - A.y) || 1;
            const coseno = Math.abs(((B.x - A.x) * ux + (B.y - A.y) * uy) / tl);
            if (coseno < 0.85) mejor = { t, px, py };
            break;
          }
        }
      }
      if (!mejor) continue;
      // partir el tramo de llegada en el punto de contacto
      const { t, px, py } = mejor;
      const id = this.nodos.length;
      this.nodos.push({ id, x: px, y: py, vec: new Set() });
      const tipo = t.tipo;
      this.quitarTramo(t.a, t.b);
      this.ponerTramo(t.a, id, tipo);
      this.ponerTramo(id, t.b, tipo);
      this.ponerTramo(n.id, id, this.tipoDe(n.id, v.id));
      for (const k of [this.tramoKey(t.a, id), this.tramoKey(id, t.b), this.tramoKey(n.id, id)]) {
        const nuevo = this.tramosMap.get(k);
        if (nuevo) apuntar(nuevo);
      }
    }
  }

  componentes() {
    const comp = new Int32Array(this.nodos.length).fill(-1);
    const tamaños = [];
    for (const n of this.nodos) {
      if (n.muerto || n.vec.size === 0 || comp[n.id] !== -1) continue;
      const c = tamaños.length;
      let tam = 0;
      const pila = [n.id];
      comp[n.id] = c;
      while (pila.length) {
        const a = pila.pop();
        tam++;
        for (const b of this.nodos[a].vec) {
          if (comp[b] === -1) { comp[b] = c; pila.push(b); }
        }
      }
      tamaños.push(tam);
    }
    return { comp, tamaños };
  }

  quedarseConLaRedPrincipal() {
    const { comp, tamaños } = this.componentes();
    const grande = tamaños.indexOf(Math.max(...tamaños));
    for (const n of this.nodos) {
      if (n.muerto || comp[n.id] === grande) continue;
      for (const v of [...n.vec]) this.quitarTramo(n.id, v);
      n.muerto = true;
    }
  }

  // ¿sigue todo conectado si se quita el tramo a-b? (BFS de a hasta b)
  conectadoSin(a, b) {
    const visto = new Set([a]);
    const cola = [a];
    while (cola.length) {
      const x = cola.shift();
      if (x === b) return true;
      for (const y of this.nodos[x].vec) {
        if (x === a && y === b) continue;
        if (!visto.has(y)) { visto.add(y); cola.push(y); }
      }
      if (visto.size > 4000) return true;
    }
    return false;
  }

  abrirSinSalidas() {
    const rngQ = mulberry32(this.cfg.seed ^ 0xabcdef);
    for (const t of [...this.tramosMap.values()]) {
      if (t.tipo !== 'calle') continue;
      const A = this.nodos[t.a]; const B = this.nodos[t.b];
      const d = this.distritoEn((A.x + B.x) / 2, (A.y + B.y) / 2);
      const p = d?.trazado?.quitar || 0;
      if (!p || rngQ() > p) continue;
      if (A.vec.size < 3 && B.vec.size < 3) continue;   // no dejar islas de un tramo
      if (!this.conectadoSin(t.a, t.b)) continue;
      this.quitarTramo(t.a, t.b);
    }
    // los nodos que se han quedado solos
    for (const n of this.nodos) if (n.vec.size === 0) n.muerto = true;
  }

  quitarSolapes() {
    const distSegSeg = (a, b, c, d) => Math.min(
      distSeg(a.x, a.y, c.x, c.y, d.x, d.y), distSeg(b.x, b.y, c.x, c.y, d.x, d.y),
      distSeg(c.x, c.y, a.x, a.y, b.x, b.y), distSeg(d.x, d.y, a.x, a.y, b.x, b.y),
    );
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      const lista = [...this.tramosMap.values()];
      const CUBO = 20;
      const cubos = new Map();
      lista.forEach((t, i) => {
        const A = this.nodos[t.a]; const B = this.nodos[t.b];
        const k = `${Math.floor((A.x + B.x) / 2 / CUBO)},${Math.floor((A.y + B.y) / 2 / CUBO)}`;
        if (!cubos.has(k)) cubos.set(k, []);
        cubos.get(k).push(i);
      });
      let quitados = 0;
      for (let i = 0; i < lista.length; i++) {
        const t = lista[i];
        if (!this.tramosMap.has(this.tramoKey(t.a, t.b))) continue;
        const A = this.nodos[t.a]; const B = this.nodos[t.b];
        const cx = Math.floor((A.x + B.x) / 2 / CUBO);
        const cy = Math.floor((A.y + B.y) / 2 / CUBO);
        let rival = null;
        let local = null;
        for (let dy = -1; dy <= 1 && !rival; dy++) {
          for (let dx = -1; dx <= 1 && !rival; dx++) {
            for (const j of cubos.get(`${cx + dx},${cy + dy}`) || []) {
              const u = lista[j];
              if (u === t || !this.tramosMap.has(this.tramoKey(u.a, u.b))) continue;
              if (distSegSeg(A, B, this.nodos[u.a], this.nodos[u.b]) >= 5.5) continue;
              // los trozos de la MISMA calle (o de la que sale del mismo
              // cruce) estan cerca por fuerza: solo es solape si por la red
              // quedan lejos
              if (!local) local = this.cercaPorLaRed([t.a, t.b], 14);
              if (local.has(u.a) || local.has(u.b)) continue;
              rival = u;
              break;
            }
          }
        }
        if (!rival) continue;
        // se va el mas corto (las arterias, nunca)
        const largo = (x) => Math.hypot(this.nodos[x.a].x - this.nodos[x.b].x, this.nodos[x.a].y - this.nodos[x.b].y);
        let va = largo(t) <= largo(rival) ? t : rival;
        if (va.tipo !== 'calle') va = va === t ? rival : t;
        if (va.tipo !== 'calle') continue;
        if (!this.conectadoSin(va.a, va.b)) continue;
        this.quitarTramo(va.a, va.b);
        quitados++;
      }
      if (quitados === 0) break;
    }
    for (const n of this.nodos) if (n.vec.size === 0) n.muerto = true;
  }

  // los nodos a menos de `max` casillas de recorrido por la red
  cercaPorLaRed(desde, max) {
    const dist = new Map(desde.map((d) => [d, 0]));
    const cola = [...desde];
    while (cola.length) {
      const a = cola.shift();
      const da = dist.get(a);
      for (const b of this.nodos[a].vec) {
        const d = da + Math.hypot(this.nodos[a].x - this.nodos[b].x, this.nodos[a].y - this.nodos[b].y);
        if (d > max) continue;
        if (dist.has(b) && dist.get(b) <= d) continue;
        dist.set(b, d);
        cola.push(b);
      }
    }
    return dist;
  }

  // los finales de calle muy cortos (un muñon de 3 casillas que asoma de un
  // cruce) sobran: se quitan, y si eso deja otro muñon, tambien
  podarMuñones(largoMin) {
    let cambio = true;
    while (cambio) {
      cambio = false;
      for (const n of this.nodos) {
        if (n.muerto || n.vec.size !== 1) continue;
        const v = [...n.vec][0];
        const V = this.nodos[v];
        if (Math.hypot(V.x - n.x, V.y - n.y) >= largoMin) continue;
        if (this.tipoDe(n.id, v) !== 'calle') continue;
        this.quitarTramo(n.id, v);
        n.muerto = true;
        cambio = true;
      }
    }
  }

  // Un nodo de grado 2 en el que la calle casi no gira no hace falta: se
  // quita y sus dos tramos pasan a ser uno.
  simplificarRectas() {
    for (const n of this.nodos) {
      if (n.muerto || n.vec.size !== 2) continue;
      const [a, b] = [...n.vec];
      const A = this.nodos[a]; const B = this.nodos[b];
      const ax = n.x - A.x; const ay = n.y - A.y;
      const bx = B.x - n.x; const by = B.y - n.y;
      const coseno = (ax * bx + ay * by) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1);
      if (coseno < 0.9985) continue;   // gira mas de unos 3 grados: es curva
      if (this.tramosMap.has(this.tramoKey(a, b))) continue;
      const tipo = this.tipoDe(n.id, a);
      this.quitarTramo(n.id, a);
      this.quitarTramo(n.id, b);
      this.ponerTramo(a, b, tipo);
      n.muerto = true;
    }
  }

  // nodos y tramos en listas limpias, sin huecos de los que se han muerto
  compactar() {
    const nuevo = new Map();
    const nodos = [];
    for (const n of this.nodos) {
      if (n.muerto || n.vec.size === 0) continue;
      nuevo.set(n.id, nodos.length);
      nodos.push({ id: nodos.length, x: n.x, y: n.y, grado: n.vec.size });
    }
    const tramos = [];
    for (const t of this.tramosMap.values()) {
      if (!nuevo.has(t.a) || !nuevo.has(t.b)) continue;
      const tipo = t.tipo;
      tramos.push({ a: nuevo.get(t.a), b: nuevo.get(t.b), tipo, ancho: this.cfg.anchos[tipo] || 5 });
    }
    this.nodos = nodos;
    this.tramos = tramos;
    delete this.tramosMap;
  }

  // ---------- 5. estampar las calles en la rejilla ----------

  estamparCalles() {
    for (const t of this.tramos) {
      const A = this.nodos[t.a]; const B = this.nodos[t.b];
      const r = t.ancho / 2;
      const x0 = Math.floor(Math.min(A.x, B.x) - r - 1);
      const x1 = Math.ceil(Math.max(A.x, B.x) + r + 1);
      const y0 = Math.floor(Math.min(A.y, B.y) - r - 1);
      const y1 = Math.ceil(Math.max(A.y, B.y) + r + 1);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!this.dentro(x, y)) continue;
          if (distSeg(x + 0.5, y + 0.5, A.x, A.y, B.x, B.y) > r) continue;
          const i = this.idx(x, y);
          if (this.grid[i] === T.WATER) this.puenteMask[i] = 1;
          this.roadMask[i] = 1;
          this.grid[i] = T.ROAD;
          this.roca[i] = 0;
        }
      }
    }
  }

  // ---------- 6. aceras ----------
  //
  // Dos casillas a cada lado de la calle, salvo en el campo y el monte (alli
  // la carretera va sin acera, con su arcen de tierra) y sobre el agua.
  pintarAceras() {
    const pad = 2;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = this.idx(x, y);
        if (this.roadMask[i] || !this.tierra[i]) continue;
        const d = this.distritoEn(x, y);
        if (!d || d.rural) continue;
        let cerca = false;
        for (let dy = -pad; dy <= pad && !cerca; dy++) {
          for (let dx = -pad; dx <= pad; dx++) {
            const nx = x + dx; const ny = y + dy;
            if (this.dentro(nx, ny) && this.roadMask[this.idx(nx, ny)] && !this.puenteMask[this.idx(nx, ny)]) { cerca = true; break; }
          }
        }
        if (cerca) { this.grid[i] = T.SIDEWALK; this.roca[i] = 0; this.ocupado[i] = 1; }
      }
    }
  }

  // ---------- 7. pasos de cebra ----------
  //
  // En cada cruce de verdad (grado 3 o mas) y en barrio con acera, un paso
  // atravesado en cada boca, a 1,5 casillas del borde del cruce.
  marcarCebras() {
    this.cebras = [];
    for (const n of this.nodos) {
      if (n.grado < 3) continue;
      const d = this.distritoEn(n.x, n.y);
      if (!d || d.rural) continue;
      for (const t of this.tramos) {
        let otro = null;
        if (t.a === n.id) otro = this.nodos[t.b];
        else if (t.b === n.id) otro = this.nodos[t.a];
        if (!otro) continue;
        const dx = otro.x - n.x; const dy = otro.y - n.y;
        const l = Math.hypot(dx, dy);
        if (l < 9) continue;
        const ux = dx / l; const uy = dy / l;
        const dist = t.ancho / 2 + 2;
        const cx = n.x + ux * dist; const cy = n.y + uy * dist;
        this.cebras.push({ x: cx, y: cy, ang: Math.atan2(uy, ux), ancho: t.ancho });
        // la franja de la cebra en la rejilla, para los peatones
        for (let s = -t.ancho / 2; s <= t.ancho / 2; s += 0.5) {
          for (let f = -1; f <= 1; f += 0.5) {
            const px = cx - uy * s + ux * f;
            const py = cy + ux * s + uy * f;
            const tx = Math.floor(px); const ty = Math.floor(py);
            if (!this.dentro(tx, ty)) continue;
            const i = this.idx(tx, ty);
            if (this.roadMask[i]) this.crossMask[i] = 1;
          }
        }
      }
    }
  }

  // ---------- 10. las afueras: granjas y campos ----------
  //
  // En el campo no hay manzanas: alguna casa de labor pegada a la carretera
  // (cada 40 casillas de carretera, mas o menos) y campos de cultivo en lo
  // que queda libre. Los campos solo se dibujan; no estorban.
  afueras() {
    const rngA = mulberry32(this.cfg.seed + 777);
    this.campos = [];
    const libre = (x, y) => {
      if (!this.dentro(x, y)) return false;
      const i = this.idx(x, y);
      return this.tierra[i] && !this.roca[i] && !this.roadMask[i] && !this.ocupado[i] && this.grid[i] === T.GRASS;
    };
    const rectLibre = (x, y, w, h, margen) => {
      for (let yy = y - margen; yy < y + h + margen; yy++) {
        for (let xx = x - margen; xx < x + w + margen; xx++) if (!libre(xx, yy)) return false;
      }
      return true;
    };
    const marcar = (x, y, w, h, v) => {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.ocupado[this.idx(xx, yy)] = v;
    };
    // las casas de labor, a 6 casillas del eje de la carretera
    for (const t of this.tramos) {
      const A = this.nodos[t.a]; const B = this.nodos[t.b];
      const largo = Math.hypot(B.x - A.x, B.y - A.y);
      // un intento por cada 40 casillas de carretera; los trozos de curva son
      // mas cortos, asi que en ellos el intento sale con su parte de suerte
      const n = Math.max(1, Math.floor(largo / 40));
      const suerte = Math.min(1, largo / 40) * 0.55;
      for (let k = 0; k < n; k++) {
        if (rngA() > suerte) continue;
        const f = (k + 0.5) / n;
        const mx = A.x + (B.x - A.x) * f; const my = A.y + (B.y - A.y) * f;
        const d = this.distritoEn(mx, my);
        if (!d || !d.rural) continue;
        const ux = (B.x - A.x) / largo; const uy = (B.y - A.y) / largo;
        const lado = rngA() < 0.5 ? 1 : -1;
        const w = 4 + Math.floor(rngA() * 2); const h = 3 + Math.floor(rngA() * 2);
        const x = Math.round(mx - uy * 6 * lado - w / 2);
        const y = Math.round(my + ux * 6 * lado - h / 2);
        if (!rectLibre(x, y, w, h, 1)) continue;
        this.edificios.push({ tx: x, ty: y, w, h, zona: d.zona, distrito: d.nombre });
        marcar(x, y, w, h, 2);
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.grid[this.idx(xx, yy)] = T.ALLEY;
      }
    }
    // los campos: rectangulos en lo que queda, a 2 casillas de todo
    for (let y = 2; y < this.h - 16; y += 3) {
      for (let x = 2; x < this.w - 22; x += 3) {
        const d = this.distritoEn(x, y);
        if (!d || !d.rural || !libre(x, y)) continue;
        const w = 10 + Math.floor(rngA() * 12);
        const h = 8 + Math.floor(rngA() * 8);
        if (!rectLibre(x, y, w, h, 2)) continue;
        this.campos.push({ x, y, w, h, tipo: Math.floor(rngA() * 3), vertical: rngA() < 0.5 });
        marcar(x, y, w, h, 5);
      }
    }
  }

  // ---------- 8. los sitios especiales ----------
  //
  // Casino, estadio, carcel... Cada uno pide un barrio y un tamaño. Se busca
  // el hueco libre (sin calle, sin acera, sin roca) que este mas cerca del
  // centro de su barrio y que toque una calle, para que se pueda llegar. Los
  // de costa (grua, faro) piden en cambio tocar el agua. Si no cabe en
  // ningun sitio, no se pone: los sistemas que lo usan ya aguantan que falte.
  reservarLandmarks() {
    this.landmarks = [];
    const W = this.w;
    const H = this.h;
    // los grandes ya tienen sitio desde antes de las calles
    for (const r of this.reservas) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) this.ocupado[this.idx(x, y)] = 4;
      }
      this.landmarks.push({ type: r.type, label: r.label, x: r.x, y: r.y, w: r.w, h: r.h });
    }
    for (const L of this.cfg.landmarks || []) {
      if (!L.costa) continue;
      const d = this.cfg.distritos.find((x) => x.nombre === L.distrito);
      if (!d) continue;
      // los de costa se meten en el agua (muelle, espigon): ahi el agua vale
      const malo = (i) => (L.costa
        ? this.roca[i] || this.roadMask[i] || this.ocupado[i] || this.puenteMask[i]
        : !(this.tierra[i] && !this.roca[i] && !this.roadMask[i] && !this.ocupado[i] && this.grid[i] !== T.SAND));
      // tabla de sumas: cuantas casillas malas hay en cualquier rectangulo
      const S = new Int32Array((W + 1) * (H + 1));
      for (let y = 0; y < H; y++) {
        let fila = 0;
        for (let x = 0; x < W; x++) {
          fila += malo(this.idx(x, y)) ? 1 : 0;
          S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + fila;
        }
      }
      const malas = (x, y, w, h) => S[(y + h) * (W + 1) + x + w] - S[y * (W + 1) + x + w]
        - S[(y + h) * (W + 1) + x] + S[y * (W + 1) + x];
      const toca = (x, y, w, h) => {
        for (let yy = y - 2; yy < y + h + 2; yy++) {
          for (let xx = x - 2; xx < x + w + 2; xx++) {
            if (yy >= y && yy < y + h && xx >= x && xx < x + w) continue;
            if (!this.dentro(xx, yy)) continue;
            const i = this.idx(xx, yy);
            if (L.costa ? this.grid[i] === T.WATER && !this.puenteMask[i]
              : this.roadMask[i] || this.grid[i] === T.SIDEWALK) return true;
          }
        }
        return false;
      };
      let mejor = null;
      let mejorD = Infinity;
      for (let y = 1; y + L.h < H - 1; y += 2) {
        for (let x = 1; x + L.w < W - 1; x += 2) {
          const cx = x + L.w / 2;
          const cy = y + L.h / 2;
          if (!L.costa && this.distritoEn(cx, cy) !== d) continue;
          const dist = Math.hypot(cx - d.x - (L.dx || 0), cy - d.y - (L.dy || 0));
          if (dist >= mejorD) continue;
          if (malas(x, y, L.w, L.h) > 0) continue;
          if (L.costa ? !this.mitadEnElMar(x, y, L.w, L.h) : !toca(x, y, L.w, L.h)) continue;
          mejor = { x, y };
          mejorD = dist;
        }
      }
      if (!mejor) continue;
      for (let y = mejor.y; y < mejor.y + L.h; y++) {
        for (let x = mejor.x; x < mejor.x + L.w; x++) this.ocupado[this.idx(x, y)] = 4;
      }
      this.landmarks.push({ type: L.type, label: L.label, x: mejor.x, y: mejor.y, w: L.w, h: L.h });
    }
  }

  // entre un cuarto y tres cuartos de agua, y esa agua es MAR (no el rio)
  mitadEnElMar(x, y, w, h) {
    let agua = 0;
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const i = this.idx(xx, yy);
        if (this.tierra[i]) continue;
        if (this.cercaRio[i]) return false;
        agua++;
      }
    }
    const f = agua / (w * h);
    return f >= 0.25 && f <= 0.75;
  }

  // ---------- 8. edificios ----------
  //
  // Se recorre la tierra libre y se levantan rectangulos del tamaño del
  // barrio donde quepan, con una casilla de callejon alrededor. Los que no
  // tocan ninguna acera (patio de manzana) salen con menos probabilidad:
  // ahi queda patio, aparcamiento o jardin.
  levantarEdificios() {
    const rngE = mulberry32(this.cfg.seed + 424242);
    const libre = (x, y) => {
      if (!this.dentro(x, y)) return false;
      const i = this.idx(x, y);
      return this.tierra[i] && !this.roca[i] && !this.roadMask[i] && !this.ocupado[i]
        && this.grid[i] !== T.SAND;
    };
    const cabe = (x, y, w, h) => {
      for (let yy = y - 1; yy <= y + h; yy++) {
        for (let xx = x - 1; xx <= x + w; xx++) {
          const borde = yy === y - 1 || yy === y + h || xx === x - 1 || xx === x + w;
          if (borde) {
            if (this.dentro(xx, yy) && this.roadMask[this.idx(xx, yy)]) return false;
            if (this.dentro(xx, yy) && this.ocupado[this.idx(xx, yy)] === 2) return false;
            continue;
          }
          if (!libre(xx, yy)) return false;
        }
      }
      return true;
    };
    const tocaAcera = (x, y, w, h) => {
      for (let yy = y - 1; yy <= y + h; yy++) {
        for (let xx = x - 1; xx <= x + w; xx++) {
          if (this.dentro(xx, yy) && this.grid[this.idx(xx, yy)] === T.SIDEWALK) return true;
        }
      }
      return false;
    };

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!libre(x, y)) continue;
        const d = this.distritoEn(x, y);
        if (!d || d.rural) continue;
        const z = this.cfg.zones[d.zona];
        let hecho = false;
        for (let intento = 0; intento < 4 && !hecho; intento++) {
          const w = z.minSize + Math.floor(rngE() * (z.maxSize - z.minSize + 1)) - Math.floor(intento / 2);
          const h = z.minSize + Math.floor(rngE() * (z.maxSize - z.minSize + 1)) - Math.floor(intento / 2);
          if (w < z.minSize - 1 || h < z.minSize - 1) break;
          if (!cabe(x, y, w, h)) continue;
          const fachada = tocaAcera(x, y, w, h);
          if (!fachada && rngE() > (d.patio ?? 0.35)) {
            // patio: se deja libre y se marca para no volver a probar
            for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.ocupado[this.idx(xx, yy)] = 3;
            hecho = true;
            break;
          }
          this.edificios.push({ tx: x, ty: y, w, h, zona: d.zona, distrito: d.nombre });
          for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) {
              const i = this.idx(xx, yy);
              this.ocupado[i] = 2;
              this.grid[i] = T.ALLEY;
            }
          }
          hecho = true;
        }
      }
    }

    // lo que queda libre dentro de la ciudad: patio de cemento, o jardin en
    // los barrios de casas
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = this.idx(x, y);
        if (!this.tierra[i] || this.roca[i] || this.roadMask[i] || this.ocupado[i] === 1 || this.ocupado[i] === 2) continue;
        if (this.grid[i] === T.SAND) continue;
        const d = this.distritoEn(x, y);
        if (!d || d.rural) continue;
        this.grid[i] = d.zona === 'residencial' ? T.GRASS : T.ALLEY;
      }
    }
  }
}
