import { CITY } from '../config/city.js';
import { TILE } from '../config/balance.js';

export const LANE_OFFSET = 36;

// Red de carriles: nodos en los cruces y tramos dirigidos entre ellos.
// Se circula por la derecha, asi que cada tramo lleva su carril desplazado
// hacia ese lado. Con esto el trafico y la policia pueden conducir sin
// necesidad de calcular rutas: al llegar a un cruce eligen salida.

export class RoadNetwork {
  constructor(cfg = CITY) {
    this.cfg = cfg;
    this.nodes = [];
    this.edges = [];
    this.build();
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
      const peso = recto > 0.7 ? 6 : 1;
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
