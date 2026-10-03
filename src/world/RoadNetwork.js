import { CITY } from '../config/city.js';
import { TILE } from '../config/balance.js';

export const LANE_OFFSET = 36;

// Red de carriles: nodos en los cruces y tramos dirigidos entre ellos.
// Se circula por la derecha, asi que cada tramo lleva su carril desplazado
// hacia ese lado. Con esto el trafico y la policia pueden conducir sin
// necesidad de calcular rutas: al llegar a un cruce eligen salida.

export class RoadNetwork {
  constructor(cfg = CITY, map = null) {
    this.cfg = cfg;
    this.nodes = [];
    this.edges = [];
    if (map && map.graph) this.desdeGrafo(map.graph);
    else this.build();
    this.indexar();
  }

  // LOS TRAMOS POR CUBOS. Con la ciudad grande hay miles de tramos, y
  // "sortear uno cualquiera y ver si cae cerca del jugador" ya casi nunca
  // acierta (el trafico se quedaba vacio). Cada tramo se apunta en los cubos
  // de 512 px que pisa su recorrido.
  indexar() {
    this.CUBO = 512;
    this.cubos = new Map();
    for (const e of this.edges) {
      const a = this.entryPoint(e);
      const b = this.exitPoint(e);
      const pasos = Math.max(1, Math.ceil(e.length / (this.CUBO / 2)));
      const vistos = new Set();
      for (let i = 0; i <= pasos; i++) {
        const x = a.x + (b.x - a.x) * (i / pasos);
        const y = a.y + (b.y - a.y) * (i / pasos);
        const k = `${Math.floor(x / this.CUBO)},${Math.floor(y / this.CUBO)}`;
        if (vistos.has(k)) continue;
        vistos.add(k);
        if (!this.cubos.has(k)) this.cubos.set(k, []);
        this.cubos.get(k).push(e);
      }
    }
  }

  // los tramos que pasan a menos de `radio` px (por cubos: aproximado)
  edgesCerca(x, y, radio) {
    const r = Math.ceil(radio / this.CUBO);
    const cx = Math.floor(x / this.CUBO);
    const cy = Math.floor(y / this.CUBO);
    const out = new Set();
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        for (const e of this.cubos.get(`${cx + dx},${cy + dy}`) || []) out.add(e);
      }
    }
    return [...out];
  }

  // Un tramo al azar cuyo centro quede entre `min` y `max` px de (x, y), para
  // hacer aparecer coches fuera de la vista pero no en la otra punta. Si no
  // hay ninguno, uno cualquiera (como antes).
  edgeCerca(x, y, min, max) {
    const lista = this.edgesCerca(x, y, max).filter((e) => {
      const p = this.pointAlong(e, 0.5);
      const d = Math.hypot(p.x - x, p.y - y);
      return d >= min && d <= max;
    });
    if (lista.length === 0) return this.randomEdge();
    return lista[Math.floor(Math.random() * lista.length)];
  }

  // LA CIUDAD GRANDE: el grafo ya viene hecho del generador (casillas con
  // decimales). Cada tramo da dos carriles, uno por sentido.
  desdeGrafo(graph) {
    for (const n of graph.nodos) {
      this.nodes.push({
        id: this.nodes.length, tx: Math.floor(n.x), ty: Math.floor(n.y),
        x: n.x * TILE, y: n.y * TILE, out: [],
      });
    }
    for (const t of graph.tramos) {
      this.addEdge(t.a, t.b);
      this.addEdge(t.b, t.a);
    }
  }

  build() {
    const c = this.cfg;
    const mid = (start, size) => start + (size >> 1);

    const lastRing = c.roadsH[c.roadsH.length - 1];
    const northY = mid(c.roadsH[0].y, c.roadsH[0].h);
    const southY = mid(lastRing.y, lastRing.h);
    const portY = mid(c.portRoad.y, c.portRoad.h);
    const westX = mid(c.roadsV[0].x, c.roadsV[0].w);
    const eastX = mid(c.roadsV[c.roadsV.length - 1].x, c.roadsV[c.roadsV.length - 1].w);
    const linkX = c.portLinks.map((l) => mid(l.x, l.w));

    const corridors = [];
    for (const r of c.roadsH) {
      corridors.push({ axis: 'h', c: mid(r.y, r.h), a: westX, b: eastX });
    }
    for (const r of c.roadsV) {
      const x = mid(r.x, r.w);
      const reachesPort = linkX.includes(x);
      corridors.push({ axis: 'v', c: x, a: northY, b: reachesPort ? portY : southY });
    }
    corridors.push({ axis: 'h', c: portY, a: Math.min(...linkX), b: Math.max(...linkX) });

    const key = (tx, ty) => `${tx},${ty}`;
    const index = new Map();

    const nodeAt = (tx, ty) => {
      const k = key(tx, ty);
      if (index.has(k)) return index.get(k);
      const id = this.nodes.length;
      this.nodes.push({ id, tx, ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, out: [] });
      index.set(k, id);
      return id;
    };

    const hs = corridors.filter((k) => k.axis === 'h');
    const vs = corridors.filter((k) => k.axis === 'v');

    for (const h of hs) {
      const crossings = [];
      for (const v of vs) {
        if (v.c < h.a || v.c > h.b) continue;
        if (h.c < v.a || h.c > v.b) continue;
        crossings.push(v.c);
      }
      crossings.sort((p, q) => p - q);
      h.nodes = crossings.map((x) => nodeAt(x, h.c));
    }

    for (const v of vs) {
      const crossings = [];
      for (const h of hs) {
        if (v.c < h.a || v.c > h.b) continue;
        if (h.c < v.a || h.c > v.b) continue;
        crossings.push(h.c);
      }
      crossings.sort((p, q) => p - q);
      v.nodes = crossings.map((y) => nodeAt(v.c, y));
    }

    for (const corridor of corridors) {
      const list = corridor.nodes || [];
      for (let i = 0; i < list.length - 1; i++) {
        this.addEdge(list[i], list[i + 1]);
        this.addEdge(list[i + 1], list[i]);
      }
    }
  }

  addEdge(fromId, toId) {
    const from = this.nodes[fromId];
    const to = this.nodes[toId];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;

    const edge = {
      id: this.edges.length,
      from: fromId,
      to: toId,
      dx: dx / len,
      dy: dy / len,
      length: len,
    };
    // el carril va a la derecha del sentido de la marcha
    edge.rx = -edge.dy;
    edge.ry = edge.dx;
    edge.angle = Math.atan2(edge.dy, edge.dx);

    this.edges.push(edge);
    from.out.push(edge.id);
  }

  // punto de entrada al carril del final de un tramo
  exitPoint(edge) {
    const to = this.nodes[edge.to];
    return {
      x: to.x + edge.rx * LANE_OFFSET,
      y: to.y + edge.ry * LANE_OFFSET,
    };
  }

  entryPoint(edge) {
    const from = this.nodes[edge.from];
    return {
      x: from.x + edge.rx * LANE_OFFSET,
      y: from.y + edge.ry * LANE_OFFSET,
    };
  }

  // CUANTO LLEVA RECORRIDO DE SU TRAMO Y CUANTO SE HA SALIDO DEL CARRIL.
  // `t` va de 0 (entrada) a 1 (salida) y SE PASA DE 1 si el coche ya dejo
  // atras el tramo. `lateral` son los pixeles que tiene el coche separados
  // de la linea de su carril.
  //
  // Esto existe porque antes el cambio de calle se decidia por la distancia
  // a un punto fijo: si el coche se salia del carril, nunca se acercaba lo
  // bastante a ese punto, no cambiaba de calle nunca y se quedaba dando
  // vueltas. Con la proyeccion da igual lo lejos que este de lado: en
  // cuanto pasa de largo, se le da la siguiente calle.
  progreso(edge, x, y) {
    const a = this.entryPoint(edge);
    const b = this.exitPoint(edge);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    const largo = Math.sqrt(l2);
    return {
      t: ((x - a.x) * dx + (y - a.y) * dy) / l2,
      lateral: Math.abs((x - a.x) * -dy + (y - a.y) * dx) / largo,
      largo,
    };
  }

  // El tramo que mejor le pega a un coche perdido: el que tiene mas cerca y
  // que ademas va hacia donde el coche mira, para no mandarlo a contramano.
  edgeMasCercano(x, y, dirX = 0, dirY = 0) {
    let mejor = null;
    let mejorCoste = Infinity;
    // primero los de alrededor; si no hay ninguno (lejos de toda calle),
    // todos, como antes
    let lista = this.cubos ? this.edgesCerca(x, y, 600) : this.edges;
    if (lista.length === 0) lista = this.edges;
    for (const e of lista) {
      const p = this.progreso(e, x, y);
      if (p.t < -0.1 || p.t > 1.1) continue;
      // un tramo que va al reves de como mira el coche se penaliza fuerte
      const alineado = dirX * e.dx + dirY * e.dy;
      const coste = p.lateral + (alineado < 0 ? 400 : 0);
      if (coste < mejorCoste) { mejorCoste = coste; mejor = e; }
    }
    return mejor;
  }

  pointAlong(edge, t) {
    const a = this.entryPoint(edge);
    const b = this.exitPoint(edge);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  // Siguiente tramo al llegar a un cruce, evitando dar media vuelta. Se
  // prefiere SEGUIR RECTO: sorteando a partes iguales, un coche giraba en casi
  // todos los cruces y el trafico parecia que iba dando tumbos.
  nextEdge(edge) {
    const out = this.nodes[edge.to].out;
    if (out.length === 0) return null;
    const options = out.filter((id) => this.edges[id].to !== edge.from);
    const pool = options.length > 0 ? options : out;

    let total = 0;
    const pesos = pool.map((id) => {
      const e = this.edges[id];
      const recto = e.dx * edge.dx + e.dy * edge.dy;   // 1 seguir, 0 girar
      let peso = recto > 0.7 ? 6 : 1;
      // una calle sin salida solo se coge de vez en cuando: hay que dar la
      // vuelta al fondo y eso atasca
      if (this.nodes[e.to].out.length === 1) peso *= 0.05;
      total += peso;
      return peso;
    });

    let dado = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      dado -= pesos[i];
      if (dado <= 0) return this.edges[pool[i]];
    }
    return this.edges[pool[pool.length - 1]];
  }

  randomEdge() {
    return this.edges[Math.floor(Math.random() * this.edges.length)];
  }
}
