import { TILE } from '../config/balance.js';

// Busca camino por casillas transitables (A*). Los peatones lo usan para
// rodear los edificios en vez de empotrarse contra la pared e ir probando.
//
// Se limita el numero de casillas exploradas: si un destino esta lejisimos o
// encerrado, corta y devuelve null en vez de comerse el fotograma.

const VECINOS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.4], [1, -1, 1.4], [-1, 1, 1.4], [-1, -1, 1.4],
];

export class Pathfinder {
  constructor(map) {
    this.map = map;
    this.w = map.w;
    this.h = map.h;
  }

  transitable(tx, ty) {
    return !this.map.isSolidTile(tx, ty);
  }

  // en diagonal no se puede colar por la esquina de dos muros
  diagonalValida(tx, ty, dx, dy) {
    if (dx === 0 || dy === 0) return true;
    return this.transitable(tx + dx, ty) && this.transitable(tx, ty + dy);
  }

  buscar(desdeX, desdeY, hastaX, hastaY, maxNodos = 1400) {
    const sx = Math.floor(desdeX / TILE);
    const sy = Math.floor(desdeY / TILE);
    const gx = Math.floor(hastaX / TILE);
    const gy = Math.floor(hastaY / TILE);

    if (sx === gx && sy === gy) return [];
    if (!this.transitable(gx, gy)) return null;

    const idx = (x, y) => y * this.w + x;
    const abiertos = [{ x: sx, y: sy, g: 0, f: 0, padre: null }];
    const mejor = new Map([[idx(sx, sy), 0]]);
    const cerrados = new Set();
    let explorados = 0;

    const heur = (x, y) => Math.abs(x - gx) + Math.abs(y - gy);

    while (abiertos.length > 0 && explorados < maxNodos) {
      // el de menor f; la lista es corta, no compensa un monticulo
      let mejorI = 0;
      for (let i = 1; i < abiertos.length; i++) {
        if (abiertos[i].f < abiertos[mejorI].f) mejorI = i;
      }
      const actual = abiertos.splice(mejorI, 1)[0];
      const clave = idx(actual.x, actual.y);
      if (cerrados.has(clave)) continue;
      cerrados.add(clave);
      explorados++;

      if (actual.x === gx && actual.y === gy) return this.reconstruir(actual);

      for (const [dx, dy, coste] of VECINOS) {
        const nx = actual.x + dx;
        const ny = actual.y + dy;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
        if (!this.transitable(nx, ny)) continue;
        if (!this.diagonalValida(actual.x, actual.y, dx, dy)) continue;

        const nk = idx(nx, ny);
        if (cerrados.has(nk)) continue;

        const g = actual.g + coste;
        if (mejor.has(nk) && mejor.get(nk) <= g) continue;
        mejor.set(nk, g);
        abiertos.push({ x: nx, y: ny, g, f: g + heur(nx, ny), padre: actual });
      }
    }

    return null;
  }

  reconstruir(nodo) {
    const camino = [];
    let n = nodo;
    while (n) {
      camino.push({ x: (n.x + 0.5) * TILE, y: (n.y + 0.5) * TILE });
      n = n.padre;
    }
    camino.reverse();
    camino.shift();
    return this.suavizar(camino);
  }

  // quita los puntos intermedios que se pueden saltar en linea recta:
  // sin esto el peaton anda en zigzag de casilla en casilla
  suavizar(camino) {
    if (camino.length < 3) return camino;
    const salida = [camino[0]];
    let ancla = 0;

    for (let i = 2; i < camino.length; i++) {
      if (!this.visible(camino[ancla], camino[i])) {
        salida.push(camino[i - 1]);
        ancla = i - 1;
      }
    }
    salida.push(camino[camino.length - 1]);
    return salida;
  }

  visible(a, b) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const pasos = Math.ceil(dist / 10);
    for (let i = 1; i < pasos; i++) {
      const t = i / pasos;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      if (this.map.isSolidBox(x, y, 9, 9)) return false;
    }
    return true;
  }
}
