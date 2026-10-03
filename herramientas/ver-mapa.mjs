// Saca una imagen del mapa nuevo SIN abrir el juego, para verlo de un
// vistazo. Uso:   node herramientas/ver-mapa.mjs [salida.ppm] [px por casilla]
// Escribe un PPM (convertible a PNG con cualquier cosa) y cuenta lo que hay.

import { writeFileSync } from 'node:fs';
import { GeneradorCiudad } from '../src/world/GeneradorCiudad.js';
import { CIUDAD_GRANDE } from '../src/config/ciudadGrande.js';
import { T } from '../src/config/city.js';

const salida = process.argv[2] || 'mapa.ppm';
const ESC = Number(process.argv[3] || 2);

const t0 = Date.now();
const g = new GeneradorCiudad(CIUDAD_GRANDE).generar();
const ms = Date.now() - t0;

const COLOR = {
  [T.ROAD]: [58, 60, 66], [T.SIDEWALK]: [128, 126, 120], [T.GRASS]: [70, 96, 58],
  [T.SAND]: [200, 182, 130], [T.WATER]: [40, 78, 120], [T.DOCK]: [110, 90, 70],
  [T.ALLEY]: [92, 88, 84], [T.ROCK]: [104, 92, 78],
};
// un tinte por barrio en los edificios, para ver donde acaba cada uno
const TINTE = [
  [200, 150, 110], [190, 140, 120], [150, 130, 190], [120, 160, 90],
  [210, 170, 90], [120, 140, 200], [210, 110, 80], [130, 150, 120], [110, 170, 170], [140, 170, 100],
];

const W = g.w * ESC;
const H = g.h * ESC;
const px = Buffer.alloc(W * H * 3);
const pon = (x, y, c) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
};
const casilla = (tx, ty, c) => {
  for (let y = 0; y < ESC; y++) for (let x = 0; x < ESC; x++) pon(tx * ESC + x, ty * ESC + y, c);
};

for (let ty = 0; ty < g.h; ty++) {
  for (let tx = 0; tx < g.w; tx++) {
    const i = g.idx(tx, ty);
    let c = COLOR[g.grid[i]] || [255, 0, 255];
    if (g.puenteMask[i]) c = [150, 120, 90];
    if (g.crossMask[i]) c = [190, 190, 190];
    casilla(tx, ty, c);
  }
}
const distritos = CIUDAD_GRANDE.distritos.map((d) => d.nombre);
for (const b of g.edificios) {
  const c = TINTE[distritos.indexOf(b.distrito) % TINTE.length];
  for (let y = b.ty; y < b.ty + b.h; y++) {
    for (let x = b.tx; x < b.tx + b.w; x++) {
      const borde = y === b.ty || x === b.tx || y === b.ty + b.h - 1 || x === b.tx + b.w - 1;
      casilla(x, y, borde ? c.map((v) => v * 0.7) : c);
    }
  }
}
// los cruces, en rojo; los finales de calle, en amarillo
for (const n of g.nodos) {
  if (n.grado === 2) continue;
  const c = n.grado === 1 ? [240, 220, 60] : [230, 60, 50];
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) pon(Math.round(n.x * ESC) + x, Math.round(n.y * ESC) + y, c);
}

writeFileSync(salida, Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), px]));

// ---------- numeros ----------
let cortos = 0;
for (const t of g.tramos) {
  const A = g.nodos[t.a]; const B = g.nodos[t.b];
  if (Math.hypot(A.x - B.x, A.y - B.y) < 4) cortos++;
}
const grados = {};
for (const n of g.nodos) grados[n.grado] = (grados[n.grado] || 0) + 1;
console.log(JSON.stringify({
  ms, nodos: g.nodos.length, tramos: g.tramos.length, grados, cortos,
  edificios: g.edificios.length, cebras: g.cebras.length,
  porBarrio: Object.fromEntries(distritos.map((d) => [d, g.edificios.filter((b) => b.distrito === d).length])),
}));
