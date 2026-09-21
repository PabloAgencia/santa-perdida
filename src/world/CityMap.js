import { T, CITY } from '../config/city.js';
import { TILE } from '../config/balance.js';

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

export class CityMap {
  constructor(cfg = CITY) {
    this.cfg = cfg;
    this.w = cfg.width;
    this.h = cfg.height;
    this.pixelWidth = this.w * TILE;
    this.pixelHeight = this.h * TILE;

    this.grid = new Uint8Array(this.w * this.h).fill(T.GRASS);
    this.solid = new Uint8Array(this.w * this.h);
    this.roadMask = new Uint8Array(this.w * this.h);
    // pasos de peatones: 1 = se cruza de norte a sur, 2 = de este a oeste
    this.crossMask = new Uint8Array(this.w * this.h);

    this.buildings = [];
    this.roadSpots = [];
    this.sidewalkSpots = [];
    this.hideout = null;

    // que barrio ocupa cada casilla, para saber de que banda es el territorio
    this.zoneGrid = new Uint8Array(this.w * this.h);
    this.zoneNames = [null];
    this.zoneIds = {};

    this.rng = mulberry32(cfg.seed);
  }

  // ---------- utilidades de rejilla ----------

  idx(tx, ty) { return ty * this.w + tx; }
  inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; }

  setTile(tx, ty, type) {
    if (this.inBounds(tx, ty)) this.grid[this.idx(tx, ty)] = type;
  }

  getTile(tx, ty) {
    return this.inBounds(tx, ty) ? this.grid[this.idx(tx, ty)] : T.WATER;
  }

  fillRect(tx, ty, w, h, type) {
    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) this.setTile(x, y, type);
    }
  }

  markSolidRect(tx, ty, w, h) {
    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) {
        if (this.inBounds(x, y)) this.solid[this.idx(x, y)] = 1;
      }
    }
  }

  zoneId(name) {
    if (!(name in this.zoneIds)) {
      this.zoneIds[name] = this.zoneNames.length;
      this.zoneNames.push(name);
    }
    return this.zoneIds[name];
  }

  // se pinta la manzana mas un margen, para que las calles de alrededor
  // tambien cuenten como territorio de esa banda
  paintZone(tx, ty, w, h, name, margin = 4) {
    const id = this.zoneId(name);
    for (let y = ty - margin; y < ty + h + margin; y++) {
      for (let x = tx - margin; x < tx + w + margin; x++) {
        if (this.inBounds(x, y)) this.zoneGrid[this.idx(x, y)] = id;
      }
    }
  }

  zoneAt(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (!this.inBounds(tx, ty)) return null;
    return this.zoneNames[this.zoneGrid[this.idx(tx, ty)]] || null;
  }

  randInt(min, max) {
    if (max < min) return min;
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  // ---------- consultas de colision ----------

  isSolidTile(tx, ty) {
    if (!this.inBounds(tx, ty)) return true;
    return this.solid[this.idx(tx, ty)] === 1;
  }

  isSolidPoint(px, py) {
    return this.isSolidTile(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  isSolidBox(px, py, halfW, halfH) {
    const x0 = Math.floor((px - halfW) / TILE);
    const x1 = Math.floor((px + halfW) / TILE);
    const y0 = Math.floor((py - halfH) / TILE);
    const y1 = Math.floor((py + halfH) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.isSolidTile(tx, ty)) return true;
      }
    }
    return false;
  }

  isRoadPoint(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (!this.inBounds(tx, ty)) return false;
    return this.roadMask[this.idx(tx, ty)] === 1;
  }

  isCrossTile(tx, ty) {
    if (!this.inBounds(tx, ty)) return false;
    return this.crossMask[this.idx(tx, ty)] !== 0;
  }

  isCrossPoint(px, py) {
    return this.isCrossTile(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  // ---------- generacion ----------

  generate() {
    const c = this.cfg;

    this.fillRect(0, 0, this.w, this.h, T.GRASS);
    this.fillRect(0, c.portTop, this.w, c.seaTop - c.portTop, T.SAND);
    this.fillRect(0, c.seaTop, this.w, this.h - c.seaTop, T.WATER);
    this.fillRect(0, c.seaTop - 2, this.w, 2, T.DOCK);

    this._carveRoads();
    this._paintSidewalks();
    this._markCrossings();
    this._buildBlocks();
    this._buildPort();
    this._placeLandmarks();
    this._computeSolids();
    this._collectSpots();

    return this;
  }

  _placeLandmarks() {
    this.landmarks = [];

    for (const L of this.cfg.landmarks) {
      // fuera los edificios que pisen el sitio
      this.buildings = this.buildings.filter(
        (b) =>
          !(b.tx < L.x + L.w && b.tx + b.w > L.x && b.ty < L.y + L.h && b.ty + b.h > L.y)
      );

      const lm = {
        ...L,
        px: (L.x + L.w / 2) * TILE,
        py: (L.y + L.h / 2) * TILE,
        pw: L.w * TILE,
        ph: L.h * TILE,
      };

      if (L.type === 'plaza') {
        this.fillRect(L.x, L.y, L.w, L.h, T.SIDEWALK);
        const mx = L.x + Math.floor(L.w / 2) - 1;
        const my = L.y + Math.floor(L.h / 2) - 1;
        this.markSolidRect(mx, my, 2, 2);
        lm.monument = { px: (mx + 1) * TILE, py: (my + 1) * TILE };
      } else if (L.type === 'torre') {
        this.fillRect(L.x, L.y, L.w, L.h, T.ALLEY);
        this.markSolidRect(L.x, L.y, L.w, L.h);
      } else if (L.type === 'faro') {
        this.fillRect(L.x, L.y, L.w, L.h, T.DOCK);
        const cx = L.x + Math.floor(L.w / 2);
        const cy = L.y + Math.floor(L.h / 2);
        this.markSolidRect(cx - 1, cy - 1, 3, 3);
        lm.tower = { px: cx * TILE, py: cy * TILE };
      } else if (L.type === 'grua') {
        this.fillRect(L.x, L.y, L.w, L.h, T.DOCK);
        // solo la base estorba; el brazo pasa por encima
        this.markSolidRect(L.x, L.y, 3, L.h);
        lm.base = { px: (L.x + 1.5) * TILE, py: (L.y + L.h / 2) * TILE };
      }

      this.landmarks.push(lm);
    }
  }

  _carveRoad(tx, ty, w, h, vertical) {
    // en los cruces no se pinta linea central, si no quedan rayas cruzadas
    const alreadyRoad = new Set();
    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) {
        if (!this.inBounds(x, y)) continue;
        const i = this.idx(x, y);
        if (this.roadMask[i] === 1) alreadyRoad.add(i);
      }
    }

    this.fillRect(tx, ty, w, h, T.ROAD);
    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) {
        if (this.inBounds(x, y)) this.roadMask[this.idx(x, y)] = 1;
      }
    }

    // las calles tienen ancho impar, asi que hay fila/columna central exacta
    if (vertical) {
      const cx = tx + Math.floor(w / 2);
      for (let y = ty; y < ty + h; y++) {
        if (this.inBounds(cx, y) && !alreadyRoad.has(this.idx(cx, y))) {
          this.setTile(cx, y, T.LINE_V);
        }
      }
    } else {
      const cy = ty + Math.floor(h / 2);
      for (let x = tx; x < tx + w; x++) {
        if (this.inBounds(x, cy) && !alreadyRoad.has(this.idx(x, cy))) {
          this.setTile(x, cy, T.LINE_H);
        }
      }
    }
  }

  _carveRoads() {
    const c = this.cfg;
    for (const r of c.roadsH) this._carveRoad(0, r.y, this.w, r.h, false);
    for (const r of c.roadsV) this._carveRoad(r.x, 0, r.w, c.portTop, true);

    const pr = c.portRoad;
    this._carveRoad(pr.x0, pr.y, pr.x1 - pr.x0, pr.h, false);

    const lastRing = c.roadsH[c.roadsH.length - 1];
    for (const link of c.portLinks) {
      const top = lastRing.y;
      const bottom = pr.y + pr.h;
      this._carveRoad(link.x, top, link.w, bottom - top, true);
    }
  }

  _paintSidewalks() {
    const pad = 2;
    const original = this.grid.slice();
    for (let ty = 0; ty < this.h; ty++) {
      for (let tx = 0; tx < this.w; tx++) {
        if (this.roadMask[this.idx(tx, ty)] === 1) continue;
        const here = original[this.idx(tx, ty)];
        if (here === T.WATER || here === T.DOCK) continue;

        let near = false;
        for (let dy = -pad; dy <= pad && !near; dy++) {
          for (let dx = -pad; dx <= pad; dx++) {
            const nx = tx + dx;
            const ny = ty + dy;
            if (!this.inBounds(nx, ny)) continue;
            if (this.roadMask[this.idx(nx, ny)] === 1) { near = true; break; }
          }
        }
        if (near) this.setTile(tx, ty, T.SIDEWALK);
      }
    }
  }

  // Pasos de peatones a las cuatro bocas de cada cruce, como en la calle de
  // verdad. El A* de los peatones solo les deja pisar asfalto aqui, asi que
  // dejan de cruzar en diagonal por mitad de la manzana.
  _markCrossings() {
    const c = this.cfg;
    const ANCHO = 2; // casillas de ancho del paso

    const hs = c.roadsH.map((r) => ({ start: r.y, size: r.h }));
    hs.push({ start: c.portRoad.y, size: c.portRoad.h });
    const vs = c.roadsV.map((r) => ({ start: r.x, size: r.w }));

    const marcar = (tx, ty, w, h, valor) => {
      for (let y = ty; y < ty + h; y++) {
        for (let x = tx; x < tx + w; x++) {
          if (!this.inBounds(x, y)) continue;
          const i = this.idx(x, y);
          if (this.roadMask[i] !== 1) continue;
          this.crossMask[i] = valor;
        }
      }
    };

    for (const h of hs) {
      for (const v of vs) {
        // a los dos lados del cruce, cruzando la calle horizontal (1)
        marcar(v.start - ANCHO, h.start, ANCHO, h.size, 1);
        marcar(v.start + v.size, h.start, ANCHO, h.size, 1);
        // arriba y abajo del cruce, cruzando la calle vertical (2)
        marcar(v.start, h.start - ANCHO, v.size, ANCHO, 2);
        marcar(v.start, h.start + h.size, v.size, ANCHO, 2);
      }
    }
  }

  _bands(ranges, limit) {
    const bands = [];
    for (let i = 0; i < ranges.length - 1; i++) {
      const start = ranges[i].start + ranges[i].size;
      const end = ranges[i + 1].start - 1;
      if (end - start >= 3) bands.push({ start, end });
    }
    return bands.filter((b) => b.end < limit);
  }

  _buildBlocks() {
    const c = this.cfg;
    const rowBands = this._bands(
      c.roadsH.map((r) => ({ start: r.y, size: r.h })),
      c.portTop
    );
    const colBands = this._bands(
      c.roadsV.map((r) => ({ start: r.x, size: r.w })),
      this.w
    );

    for (let r = 0; r < rowBands.length; r++) {
      for (let col = 0; col < colBands.length; col++) {
        const zoneName =
          (c.blockZones[r] && c.blockZones[r][col]) || 'centro';
        const band = {
          x: colBands[col].start,
          y: rowBands[r].start,
          w: colBands[col].end - colBands[col].start + 1,
          h: rowBands[r].end - rowBands[r].start + 1,
        };
        this.paintZone(band.x, band.y, band.w, band.h, zoneName);

        const rect = {
          x: band.x + 2,
          y: band.y + 2,
          x2: colBands[col].end - 2,
          y2: rowBands[r].end - 2,
        };
        const made = this._fillBlock(rect, zoneName);
        if (
          c.hideout.blockRow === r &&
          c.hideout.blockCol === col &&
          made.length > 0
        ) {
          this.hideout = made[0];
          this.hideout.isHideout = true;
          this.hideout.color = 0x6b4a2f;
        }
      }
    }
  }

  // reparte un tramo entero en trozos, sin dejar hueco muerto al final:
  // antes las manzanas salian con una sola fila de edificios y media manzana
  // vacia, y todas se parecian
  _splitSpan(start, end, minSize, maxSize, gap = 1) {
    const total = end - start + 1;
    if (total < minSize) return [];

    const preferred = (minSize + maxSize) / 2 + gap;
    let n = Math.max(1, Math.round(total / preferred));
    while (n > 1 && (total - (n - 1) * gap) / n < minSize) n--;

    const usable = total - (n - 1) * gap;
    const base = Math.floor(usable / n);
    let extra = usable - base * n;

    const parts = [];
    let cursor = start;
    for (let i = 0; i < n; i++) {
      const size = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
      parts.push({ start: cursor, size });
      cursor += size + gap;
    }

    // mover los cortes para que no quede una cuadricula perfecta
    for (let i = 0; i < parts.length - 1; i++) {
      const delta = this.randInt(-1, 1);
      if (delta === 0) continue;
      const a = parts[i];
      const b = parts[i + 1];
      if (a.size + delta >= minSize && b.size - delta >= minSize) {
        a.size += delta;
        b.start += delta;
        b.size -= delta;
      }
    }

    // juntar de vez en cuando dos trozos para que salga algun edificio grande
    for (let i = parts.length - 2; i >= 0; i--) {
      const joined = parts[i].size + gap + parts[i + 1].size;
      if (this.rng() < 0.18 && joined <= maxSize * 1.7) {
        parts[i].size = joined;
        parts.splice(i + 1, 1);
      }
    }

    return parts;
  }

  _fillBlock(rect, zoneName) {
    const zone = this.cfg.zones[zoneName];
    const made = [];
    const rows = this._splitSpan(rect.y, rect.y2, zone.minSize, zone.maxSize);

    for (const row of rows) {
      const cols = this._splitSpan(rect.x, rect.x2, zone.minSize, zone.maxSize);
      for (const col of cols) {
        if (this.rng() > 0.1) {
          made.push(this._addBuilding(col.start, row.start, col.size, row.size, zoneName));
        } else {
          this.fillRect(col.start, row.start, col.size, row.size, T.ALLEY);
        }
      }
    }
    return made;
  }

  _addBuilding(tx, ty, w, h, zoneName) {
    const zone = this.cfg.zones[zoneName];
    const b = {
      tx, ty, w, h,
      zone: zoneName,
      color: this.pick(zone.palette),
      px: (tx + w / 2) * TILE,
      py: (ty + h / 2) * TILE,
      pw: w * TILE,
      ph: h * TILE,
      isHideout: false,
    };
    this.fillRect(tx, ty, w, h, T.ALLEY);
    this.buildings.push(b);
    return b;
  }

  _buildPort() {
    const c = this.cfg;
    const pr = c.portRoad;
    this.paintZone(0, c.portTop, this.w, c.seaTop - c.portTop, 'puerto', 0);
    // naves entre la ronda sur y la calle del puerto
    this._fillBlock({ x: 12, y: c.portTop, x2: pr.x1 - 4, y2: pr.y - 3 }, 'puerto');
    // la explanada entre la calle del puerto y los muelles se deja libre:
    // sirve de zona abierta para conducir y aparcar
  }

  _computeSolids() {
    for (let ty = 0; ty < this.h; ty++) {
      for (let tx = 0; tx < this.w; tx++) {
        if (this.getTile(tx, ty) === T.WATER) this.solid[this.idx(tx, ty)] = 1;
      }
    }
    for (const b of this.buildings) this.markSolidRect(b.tx, b.ty, b.w, b.h);
  }

  _collectSpots() {
    for (let ty = 2; ty < this.h - 2; ty += 2) {
      for (let tx = 2; tx < this.w - 2; tx += 2) {
        const i = this.idx(tx, ty);
        if (this.roadMask[i] === 1) {
          if (this._clearAround(tx, ty, 1)) {
            this.roadSpots.push({ tx, ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
          }
        } else if (this.getTile(tx, ty) === T.SIDEWALK && !this.isSolidTile(tx, ty)) {
          this.sidewalkSpots.push({ tx, ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
        }
      }
    }
  }

  _clearAround(tx, ty, r) {
    for (let y = ty - r; y <= ty + r; y++) {
      for (let x = tx - r; x <= tx + r; x++) {
        if (this.isSolidTile(x, y)) return false;
      }
    }
    return true;
  }

  // ---------- salida para Phaser ----------

  getTileData2D() {
    const rows = [];
    for (let ty = 0; ty < this.h; ty++) {
      const row = new Array(this.w);
      for (let tx = 0; tx < this.w; tx++) row[tx] = this.grid[this.idx(tx, ty)];
      rows.push(row);
    }
    return rows;
  }
}
