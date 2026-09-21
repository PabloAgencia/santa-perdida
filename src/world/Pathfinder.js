import { TILE } from '../config/balance.js';

// Busca camino por casillas transitables (A*). Los peatones lo usan para
// rodear los edificios en vez de empotrarse contra la pared e ir probando.
//
// Se limita el numero de casillas exploradas: si un destino esta lejisimos o
// encerrado, corta y devuelve null en vez de comerse el fotograma.

// Monticulo binario minimo por f. Lo justo para el A*: meter y sacar el mejor.
class Heap {
  constructor() {
    this.datos = [];
  }

  get size() {
    return this.datos.length;
  }

  push(nodo) {
    const d = this.datos;
    d.push(nodo);
    let i = d.length - 1;
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (d[padre].f <= d[i].f) break;
      [d[padre], d[i]] = [d[i], d[padre]];
      i = padre;
    }
  }

  pop() {
    const d = this.datos;
    const top = d[0];
    const ultimo = d.pop();
    if (d.length > 0) {
      d[0] = ultimo;
      let i = 0;
      for (;;) {
        const izq = i * 2 + 1;
        const der = izq + 1;
        let menor = i;
        if (izq < d.length && d[izq].f < d[menor].f) menor = izq;
        if (der < d.length && d[der].f < d[menor].f) menor = der;
        if (menor === i) break;
        [d[menor], d[i]] = [d[i], d[menor]];
        i = menor;
      }
    }
    return top;
  }
}

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

  // Primero se busca un camino que solo pise la calzada por los pasos de
  // peatones. Si no hay forma (destino en mitad de una explanada, por
  // ejemplo), se repite dejando cruzar por donde sea, que es peor pero es
  // mejor que quedarse plantado.
  // presupuesto de busquedas por fotograma, para que veinte peatones pidiendo
  // camino a la vez no se coman el frame
  nuevoFotograma(maximo = 4) {
    this.presupuesto = maximo;
  }

  buscarPorPasos(desdeX, desdeY, hastaX, hastaY) {
    if (this.presupuesto !== undefined) {
      if (this.presupuesto <= 0) return null;
      this.presupuesto--;
    }
    const porPasos = this.buscar(desdeX, desdeY, hastaX, hastaY, 1100, true);
    if (porPasos) return porPasos;
    return this.buscar(desdeX, desdeY, hastaX, hastaY, 1100, false);
  }

  buscar(desdeX, desdeY, hastaX, hastaY, maxNodos = 1400, soloPasos = false) {
    const sx = Math.floor(desdeX / TILE);
    const sy = Math.floor(desdeY / TILE);
    const gx = Math.floor(hastaX / TILE);
    const gy = Math.floor(hastaY / TILE);

    if (sx === gx && sy === gy) return [];
    if (!this.transitable(gx, gy)) return null;

    // el que arranca dentro de la calzada tiene que poder salir de ella
    const salidaDeApuro = this.map.roadMask[sy * this.w + sx] === 1;

    const idx = (x, y) => y * this.w + x;
    // Monticulo binario: buscar el menor recorriendo la lista costaba O(n) por
    // paso, y al obligar a cruzar por los pasos de cebra la lista se dispara.
    // Con la lista lineal el navegador se quedaba clavado.
    const abiertos = new Heap();
    abiertos.push({ x: sx, y: sy, g: 0, f: 0, padre: null });
    const mejor = new Map([[idx(sx, sy), 0]]);
    const cerrados = new Set();
    let explorados = 0;

    const heur = (x, y) => Math.abs(x - gx) + Math.abs(y - gy);

    while (abiertos.size > 0 && explorados < maxNodos) {
      const actual = abiertos.pop();
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

        // pisar asfalto sale caro: la gente va por la acera y solo cruza
        // cuando no queda otra, en vez de caminar por mitad de la calzada
        const asfalto = this.map.roadMask[nk] === 1;
        const paso = asfalto && this.map.crossMask[nk] !== 0;

        // A la calzada solo se entra por el paso de peatones. La excepcion es
        // el que YA esta en mitad de la calle: a ese hay que dejarle salir.
        if (soloPasos && asfalto && !paso && !salidaDeApuro) continue;
        // y por el paso se cruza recto, nunca en diagonal
        if (paso && dx !== 0 && dy !== 0) continue;

        const g = actual.g + coste * (paso ? 1.15 : asfalto ? 9 : 1);
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
      // los tramos que pisan la calzada NO se suavizan: asi el paso de cebra
      // se cruza recto y no de esquina a esquina
      if (this.map.isRoadPoint(x, y)) return false;
    }
    return true;
  }
}
