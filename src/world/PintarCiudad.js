import { CITY, T } from '../config/city.js';
import { TILE } from '../config/balance.js';
import { FACTIONS, ZONE_OWNER } from '../config/factions.js';
import { shade } from '../core/color.js';
import { StreetLamp } from '../entities/StreetLamp.js';
import { LANE_OFFSET } from './RoadNetwork.js';

// lado de la zona de dibujo, en pixeles
const ZONA_DIBUJO = 2048;
// las calles horneadas van en zonas mas pequeñas: cada imagen son 4 MB de
// memoria de video y solo se tienen las de alrededor de la camara
const ZONA_CALLE = 1024;

// Sorteo atado a la posicion del edificio: la ciudad sale siempre igual, pero
// cada edificio tiene sus propios detalles. Se ha venido con el pintado porque
// en CityScene ya no quedaba ni un uso.
function buildingRng(tx, ty) {
  let a = (Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663)) >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// TODO EL PINTADO DE LA CIUDAD: el suelo, los pasos de cebra, los edificios,
// los hitos, los props de calle, las farolas y el minimapa.
//
// Estaba dentro de CityScene, que habia llegado a 1.318 lineas. Esto son 570
// de ellas y no tienen nada que ver con el bucle del juego, el input ni los
// coches: solo dibujan. Sacarlo deja la escena en la mitad y hace que buscar
// algo del mundo no sea escarbar entre la logica de juego.
//
// SE PEGA AL PROTOTIPO DE LA ESCENA con Object.assign, asi que dentro de
// estos metodos `this` ES la escena, igual que antes. Se hizo asi a proposito:
// convertirlo en una clase con `this.scene` por dentro obligaba a reescribir
// cientos de referencias a mano en un fichero enorme, y eso se rompe seguro.
// Aqui no se ha tocado ni una linea de los cuerpos.
export const PintarCiudad = {
  // LAS CAPAS DE DIBUJO, troceadas por zonas.
  //
  // Todo lo que no se mueve (edificios, arboles, bancos) se pinta en capas
  // en vez de en miles de sprites. Pero una capa de dibujo se vuelve a
  // rasterizar ENTERA en cada fotograma, asi que con la ciudad grande una
  // sola capa con ocho mil rectangulos hundia el juego a 21 fps aunque solo
  // se viera una esquina.
  //
  // Por eso hay una capa por zona de 2.048 px y profundidad, y cada
  // fotograma solo se dejan encendidas las que pisa la camara. Lo que no se
  // ve, no se dibuja.
  // Las profundidades se agrupan en CUATRO: sombras, cuerpo del edificio,
  // detalles y cosas de la acera. Cada profundidad distinta es una capa mas
  // que rasterizar, y como los edificios no se solapan entre si, dentro de
  // cada grupo basta con respetar el orden en que se pintan.
  cuboDe(depth) {
    // las calles de la ciudad grande, por debajo de todo lo demas: primero
    // el fondo (acera, arcen, agua bajo el puente) y luego el asfalto
    if (depth <= -1960) return -1960;
    if (depth <= -1930) return -1930;
    if (depth <= -1240) return -1250;
    if (depth <= -1195) return -1200;
    if (depth <= -1000) return -1150;
    return -875;
  },

  capaDibujo(depth, x, y) {
    if (!this.capas) this.capas = new Map();
    const cubo = this.cuboDe(depth);
    const rx = Math.floor(x / ZONA_DIBUJO);
    const ry = Math.floor(y / ZONA_DIBUJO);
    const clave = `${cubo}|${rx}|${ry}`;
    let g = this.capas.get(clave);
    if (!g) {
      g = this.add.graphics().setDepth(cubo);
      g.zonaX = rx;
      g.zonaY = ry;
      this.capas.set(clave, g);
    }
    return g;
  },

  // LAS IMAGENES SUELTAS POR ZONAS (farolas, semaforos, tejados). Phaser no
  // descarta por su cuenta lo que queda fuera de la camara: con la ciudad
  // grande pintaba trece mil imagenes de farola en cada fotograma. Metidas en
  // una Layer por zona, apagar la zona las apaga todas de una vez.
  capaObjetos(depth, x, y) {
    if (!this.capasObj) this.capasObj = new Map();
    const rx = Math.floor(x / ZONA_DIBUJO);
    const ry = Math.floor(y / ZONA_DIBUJO);
    const clave = `${depth}|${rx}|${ry}`;
    let l = this.capasObj.get(clave);
    if (!l) {
      l = this.add.layer().setDepth(depth);
      l.zonaX = rx;
      l.zonaY = ry;
      this.capasObj.set(clave, l);
    }
    return l;
  },

  // LAS CALLES HORNEADAS. Un dibujo (Graphics) se vuelve a teselar entero
  // en cada fotograma, y las calles lisas son miles de poligonos: el casco
  // viejo pasaba de 11 a 26 ms por fotograma. Asi que las calles se dibujan
  // en Graphics que NO estan en pantalla, una por pasada y por zona de 1.024
  // px, y solo cuando la camara se acerca a una zona se "hornean" en una
  // imagen (RenderTexture) que se pinta como una sola textura. Al alejarse,
  // la imagen se borra para no comerse la memoria de video.
  capaCalle(pasada, x, y) {
    if (!this.callesG) this.callesG = new Map();
    const Z = ZONA_CALLE;
    const clave = `${pasada}|${Math.floor(x / Z)}|${Math.floor(y / Z)}`;
    let g = this.callesG.get(clave);
    if (!g) {
      g = this.make.graphics({ x: 0, y: 0 }, false);
      this.callesG.set(clave, g);
    }
    return g;
  },

  hornearZonaCalle(zx, zy) {
    const Z = ZONA_CALLE;
    // 2 px de solape con las vecinas por cada lado: con el suavizado de la
    // textura, el borde exacto dejaba una raya fina entre zona y zona
    const S = 2;
    const ox = zx * Z - S;
    const oy = zy * Z - S;
    const rt = this.add.renderTexture(ox, oy, Z + S * 2, Z + S * 2).setOrigin(0, 0).setDepth(-1940);
    // la zona y sus ocho vecinas: un trozo de calle asignado a la de al lado
    // puede asomar dentro de esta, y la imagen recorta lo que se sale
    for (const pasada of ['terreno', 'fondo', 'bordillo', 'asfalto', 'marcas']) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const g = this.callesG.get(`${pasada}|${zx + dx}|${zy + dy}`);
          if (g) rt.draw(g, -ox, -oy);
        }
      }
    }
    return rt;
  },

  actualizarCalles() {
    if (!this.callesG) return;
    if (!this.callesRT) this.callesRT = new Map();
    const v = this.cameras.main.worldView;
    const Z = ZONA_CALLE;
    // se hornea con margen, antes de que la zona entre en pantalla, y COMO
    // MUCHO UNA por fotograma (cada una cuesta unos 35 ms: tres de golpe al
    // cruzar una esquina eran un tiron). Primero la que tiene la camara
    // encima, luego las demas.
    const M = 560;
    const x0 = Math.floor((v.x - M) / Z); const x1 = Math.floor((v.right + M) / Z);
    const y0 = Math.floor((v.y - M) / Z); const y1 = Math.floor((v.bottom + M) / Z);
    const clave = `${x0},${x1},${y0},${y1}`;
    if (clave === this.callesEncendidas && this.callesCompletas) return;
    this.callesEncendidas = clave;
    const faltan = [];
    for (let zy = y0; zy <= y1; zy++) {
      for (let zx = x0; zx <= x1; zx++) if (!this.callesRT.has(`${zx},${zy}`)) faltan.push([zx, zy]);
    }
    const cx = v.centerX / Z; const cy = v.centerY / Z;
    faltan.sort((a, b) => Math.hypot(a[0] + 0.5 - cx, a[1] + 0.5 - cy) - Math.hypot(b[0] + 0.5 - cx, b[1] + 0.5 - cy));
    // al arrancar (o tras un salto largo, que deja la camara en un sitio sin
    // nada horneado) se hacen las que se ven de una vez: ahi hay fundido
    const deGolpe = !faltan.length ? 0 : faltan.filter(([zx, zy]) => {
      const vx0 = Math.floor(v.x / Z); const vx1 = Math.floor(v.right / Z);
      const vy0 = Math.floor(v.y / Z); const vy1 = Math.floor(v.bottom / Z);
      return zx >= vx0 && zx <= vx1 && zy >= vy0 && zy <= vy1;
    }).length;
    const cuantas = deGolpe >= 2 ? deGolpe : 1;
    for (const [zx, zy] of faltan.slice(0, cuantas)) {
      this.callesRT.set(`${zx},${zy}`, this.hornearZonaCalle(zx, zy));
    }
    this.callesCompletas = faltan.length <= cuantas;
    // las que quedan a mas de una zona de lo que se ve, fuera
    for (const [k, rt] of this.callesRT) {
      const [zx, zy] = k.split(',').map(Number);
      if (zx < x0 - 1 || zx > x1 + 1 || zy < y0 - 1 || zy > y1 + 1) {
        rt.destroy();
        this.callesRT.delete(k);
      }
    }
  },

  // enciende solo las zonas que pisa lo que se ve, mas un margen corto (no
  // una zona entera a cada lado: eran 35 capas encendidas a la vez)
  actualizarCapas() {
    this.actualizarCalles();
    if (!this.capas && !this.capasObj) return;
    const v = this.cameras.main.worldView;
    const M = 320;
    const x0 = Math.floor((v.x - M) / ZONA_DIBUJO);
    const x1 = Math.floor((v.right + M) / ZONA_DIBUJO);
    const y0 = Math.floor((v.y - M) / ZONA_DIBUJO);
    const y1 = Math.floor((v.bottom + M) / ZONA_DIBUJO);
    const clave = `${x0},${x1},${y0},${y1}`;
    if (clave === this.zonasEncendidas) return;
    this.zonasEncendidas = clave;
    const ver = (g) => g.setVisible(g.zonaX >= x0 && g.zonaX <= x1 && g.zonaY >= y0 && g.zonaY <= y1);
    if (this.capas) for (const g of this.capas.values()) ver(g);
    if (this.capasObj) for (const l of this.capasObj.values()) ver(l);
  },

  pintarRect(x, y, w, h, tint, depth, alpha = 1) {
    const g = this.capaDibujo(depth, x, y);
    g.fillStyle(tint, alpha);
    g.fillRect(x - w / 2, y - h / 2, w, h);
  },

  pintarCirculo(x, y, r, tint, depth, alpha = 1) {
    const g = this.capaDibujo(depth, x, y);
    g.fillStyle(tint, alpha);
    g.fillCircle(x, y, r);
  },
  drawGround() {
    const tilemap = this.make.tilemap({
      data: this.map.getTileData2D(),
      tileWidth: TILE,
      tileHeight: TILE,
    });
    const tileset = tilemap.addTilesetImage('tiles');
    this.ground = tilemap.createLayer(0, tileset, 0, 0);
    this.ground.setDepth(-2000);
    if (this.map.graph) this.pintarCallesVector();
  },

  // LAS CALLES DIBUJADAS, NO EN CASILLAS. La rejilla sigue mandando para
  // chocar y para los peatones, pero vista en casillas una calle en diagonal
  // es una escalera. Encima del suelo se pinta cada tramo como una banda lisa:
  // primero el fondo (la acera en la ciudad, el arcen del color del terreno
  // en el campo y el monte, el agua debajo de un puente), luego el asfalto y
  // el bordillo. Los cruces y las curvas se redondean con un circulo en cada
  // nodo. Los tramos largos se trocean para que cada trozo caiga en la capa
  // de su zona (si no, al apagar una zona desapareceria media calle).
  // EL TERRENO DE LA CIUDAD GRANDE, horneado con las calles (va en la
  // primera pasada, por debajo del asfalto):
  //   - la sierra con relieve (sombra al sur de cada borde, luz al norte),
  //     pinos y peñascos
  //   - espuma donde el agua toca tierra
  //   - sombrillas y toallas en la arena, menos en el puerto y el poligono
  //   - los campos de cultivo de las afueras, a surcos
  pintarTerreno() {
    const m = this.map;
    const rnd = buildingRng(7, 11);
    const capa = (x, y) => this.capaCalle('terreno', x, y);
    const esRoca = (tx, ty) => m.inBounds(tx, ty) && m.getTile(tx, ty) === T.ROCK;
    const cercaDeCalle = (tx, ty) => {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (m.inBounds(tx + dx, ty + dy) && m.roadMask[m.idx(tx + dx, ty + dy)]) return true;
      }
      return false;
    };
    const COLORES = [0xd9584a, 0x4a8fd9, 0xe8b54a, 0x49b39c, 0xe6e1d4];
    for (let ty = 0; ty < m.h; ty++) {
      for (let tx = 0; tx < m.w; tx++) {
        const tile = m.getTile(tx, ty);
        const x = tx * TILE; const y = ty * TILE;
        if (tile === T.ROCK) {
          const g = capa(x, y);
          if (!esRoca(tx, ty + 1)) { g.fillStyle(0x1c1814, 0.75); g.fillRect(x, y + TILE - 10, TILE, 10); }
          if (!esRoca(tx, ty - 1)) { g.fillStyle(0x5e5244, 0.8); g.fillRect(x, y, TILE, 4); }
          if (!esRoca(tx + 1, ty)) { g.fillStyle(0x231e19, 0.5); g.fillRect(x + TILE - 5, y, 5, TILE); }
          const r = rnd();
          if (cercaDeCalle(tx, ty)) continue;
          if (r < 0.24) {
            const rad = 9 + rnd() * 7;
            const cx = x + 16 + (rnd() - 0.5) * 10; const cy = y + 16 + (rnd() - 0.5) * 10;
            g.fillStyle(0x05060a, 0.35); g.fillCircle(cx + 4, cy + 5, rad);
            g.fillStyle(0x1f2e1e, 1); g.fillCircle(cx, cy, rad);
            g.fillStyle(0x2f4630, 1); g.fillCircle(cx - 2, cy - 2, rad * 0.55);
          } else if (r < 0.31) {
            const rad = 5 + rnd() * 7;
            const cx = x + 16 + (rnd() - 0.5) * 12; const cy = y + 16 + (rnd() - 0.5) * 12;
            g.fillStyle(0x05060a, 0.3); g.fillCircle(cx + 3, cy + 4, rad);
            g.fillStyle(0x5b5246, 1); g.fillCircle(cx, cy, rad);
            g.fillStyle(0x70665a, 1); g.fillCircle(cx - rad * 0.3, cy - rad * 0.3, rad * 0.45);
          } else if (r < 0.42) {
            g.fillStyle(rnd() < 0.5 ? 0x463d33 : 0x2e2822, 0.8);
            g.fillRect(x + rnd() * 16, y + rnd() * 16, 8 + rnd() * 10, 4 + rnd() * 6);
          }
        } else if (tile === T.WATER) {
          if (m.puenteMask && m.puenteMask[m.idx(tx, ty)]) continue;
          const tierra = (dx, dy) => m.inBounds(tx + dx, ty + dy)
            && m.getTile(tx + dx, ty + dy) !== T.WATER && !m.roadMask[m.idx(tx + dx, ty + dy)];
          const g = capa(x, y);
          g.fillStyle(0x6f9aac, 0.45);
          if (tierra(0, -1)) g.fillRect(x, y, TILE, 5);
          if (tierra(0, 1)) g.fillRect(x, y + TILE - 5, TILE, 5);
          if (tierra(-1, 0)) g.fillRect(x, y, 5, TILE);
          if (tierra(1, 0)) g.fillRect(x + TILE - 5, y, 5, TILE);
        } else if (tile === T.SAND) {
          const zona = m.zoneNames[m.zoneGrid[m.idx(tx, ty)]];
          if (zona === 'puerto' || zona === 'industrial') continue;
          if (rnd() > 0.035) continue;
          const g = capa(x, y);
          const cx = x + 16; const cy = y + 16;
          // la toalla, y encima la sombrilla con su sombra y sus gajos
          g.fillStyle(COLORES[Math.floor(rnd() * COLORES.length)], 0.9);
          g.fillRect(cx + 4, cy - 2, 9, 18);
          g.fillStyle(0x05060a, 0.3); g.fillCircle(cx + 5, cy + 6, 13);
          g.fillStyle(COLORES[Math.floor(rnd() * COLORES.length)], 1); g.fillCircle(cx, cy, 13);
          g.fillStyle(0xf2efe6, 1);
          for (let k = 0; k < 4; k++) {
            const a0 = (k / 4) * Math.PI * 2;
            g.slice(cx, cy, 13, a0, a0 + Math.PI / 4, false);
            g.fillPath();
          }
          g.fillStyle(0x2a2e35, 1); g.fillCircle(cx, cy, 2);
        }
      }
    }
    // los campos de cultivo, a surcos (troceados en cuadros de 512 px para
    // que cada trozo caiga en su zona)
    const TIPOS = [[0x4f4a2a, 0x3f3b21], [0x3e5226, 0x2f401c], [0x5e4a2e, 0x4b3a24]];
    for (const c of m.campos || []) {
      const [base, surco] = TIPOS[c.tipo];
      const x = c.x * TILE; const y = c.y * TILE; const w = c.w * TILE; const h = c.h * TILE;
      for (let yy = y; yy < y + h; yy += 512) {
        for (let xx = x; xx < x + w; xx += 512) {
          const ww = Math.min(512, x + w - xx); const hh = Math.min(512, y + h - yy);
          const g = capa(xx + ww / 2, yy + hh / 2);
          g.fillStyle(base, 1); g.fillRect(xx, yy, ww, hh);
          g.fillStyle(surco, 1);
          if (c.vertical) for (let k = xx + 4; k < xx + ww; k += 12) g.fillRect(k, yy, 4, hh);
          else for (let k = yy + 4; k < yy + hh; k += 12) g.fillRect(xx, k, ww, 4);
        }
      }
    }
  },

  pintarCallesVector() {
    this.pintarTerreno();
    const { nodos, tramos } = this.map.graph;
    const m = this.map;
    const COLOR = {
      acera: 0x3c3f46, asfalto: 0x25272d, bordillo: 0x4b4f58,
      [T.GRASS]: 0x2f3a2c, [T.SAND]: 0x5a5142, [T.WATER]: 0x16303d, [T.ROCK]: 0x3b342c,
      puente: 0x3a3c42, baranda: 0x6a6e78,
    };
    // cada pasada va en su propio dibujo, y al hornear la zona se pintan por
    // orden: todos los fondos, todos los bordillos, todo el asfalto
    const PASADA = { [-1960]: 'fondo', [-1931]: 'bordillo', [-1930]: 'asfalto' };
    const banda = (depth, ax, ay, bx, by, radio, color) => {
      const largo = Math.hypot(bx - ax, by - ay);
      const n = Math.max(1, Math.ceil(largo / 480));
      const ux = (bx - ax) / (largo || 1);
      const uy = (by - ay) / (largo || 1);
      const px = -uy * radio;
      const py = ux * radio;
      for (let i = 0; i < n; i++) {
        const x0 = ax + (bx - ax) * (i / n); const y0 = ay + (by - ay) * (i / n);
        const x1 = ax + (bx - ax) * ((i + 1) / n); const y1 = ay + (by - ay) * ((i + 1) / n);
        const g = this.capaCalle(PASADA[depth], (x0 + x1) / 2, (y0 + y1) / 2);
        g.fillStyle(color, 1);
        g.fillPoints([
          { x: x0 + px, y: y0 + py }, { x: x1 + px, y: y1 + py },
          { x: x1 - px, y: y1 - py }, { x: x0 - px, y: y0 - py },
        ], true);
      }
    };
    const circulo = (depth, x, y, r, color) => {
      const g = this.capaCalle(PASADA[depth], x, y);
      g.fillStyle(color, 1);
      g.fillCircle(x, y, r);
    };
    // que hay a los lados de un tramo: se mira a 3,5 casillas del eje
    const fondoDe = (t, A, B) => {
      const mx = (A.x + B.x) / 2; const my = (A.y + B.y) / 2;
      const dx = B.x - A.x; const dy = B.y - A.y;
      const l = Math.hypot(dx, dy) || 1;
      const i = m.idx(Math.floor(mx), Math.floor(my));
      if (m.puenteMask && m.puenteMask[i]) return 'puente';
      for (const lado of [1, -1]) {
        const sx = Math.floor(mx - (dy / l) * 3.6 * lado);
        const sy = Math.floor(my + (dx / l) * 3.6 * lado);
        if (!m.inBounds(sx, sy)) continue;
        const tile = m.getTile(sx, sy);
        if (tile === T.SIDEWALK) return 'acera';
        if (m.roadMask[m.idx(sx, sy)]) continue;
        if (COLOR[tile] !== undefined) return tile;
      }
      return 'acera';
    };

    const fondoNodo = new Map();
    for (const t of tramos) {
      const A = nodos[t.a]; const B = nodos[t.b];
      const ax = A.x * TILE; const ay = A.y * TILE;
      const bx = B.x * TILE; const by = B.y * TILE;
      const mitad = (t.ancho / 2) * TILE;
      const fondo = fondoDe(t, A, B);
      t.fondo = fondo;
      if (fondo === 'acera') {
        banda(-1960, ax, ay, bx, by, mitad + 2.5 * TILE, COLOR.acera);
      } else if (fondo === 'puente') {
        banda(-1960, ax, ay, bx, by, mitad + 1.2 * TILE, COLOR[T.WATER]);
        banda(-1960, ax, ay, bx, by, mitad + 0.35 * TILE, COLOR.baranda);
      } else {
        banda(-1960, ax, ay, bx, by, mitad + 1.0 * TILE, COLOR[fondo]);
      }
      for (const id of [t.a, t.b]) {
        const prev = fondoNodo.get(id);
        if (prev !== 'acera') fondoNodo.set(id, fondo === 'puente' ? prev || 'puente' : fondo);
      }
    }
    // los nodos: el redondeo de cruces, curvas y fondos de saco. El radio
    // del mayor tramo que llega.
    const radioNodo = new Map();
    for (const t of tramos) {
      for (const id of [t.a, t.b]) radioNodo.set(id, Math.max(radioNodo.get(id) || 0, (t.ancho / 2) * TILE));
    }
    for (const n of nodos) {
      const r = radioNodo.get(n.id);
      if (!r) continue;
      const fondo = fondoNodo.get(n.id);
      if (fondo === 'acera') circulo(-1960, n.x * TILE, n.y * TILE, r + 2.5 * TILE, COLOR.acera);
      else if (fondo !== 'puente' && COLOR[fondo] !== undefined) circulo(-1960, n.x * TILE, n.y * TILE, r + 1.0 * TILE, COLOR[fondo]);
    }

    // el bordillo y el asfalto van en la MISMA capa, asi que primero todos
    // los bordillos y despues todo el asfalto: si no, el bordillo de una
    // calle se pintaba por encima del asfalto de la otra en cada cruce
    for (const pasada of ['bordillo', 'asfalto']) {
      for (const t of tramos) {
        const A = nodos[t.a]; const B = nodos[t.b];
        const mitad = (t.ancho / 2) * TILE;
        if (pasada === 'bordillo') {
          if (t.fondo === 'acera') banda(-1931, A.x * TILE, A.y * TILE, B.x * TILE, B.y * TILE, mitad + 3, COLOR.bordillo);
        } else {
          banda(-1930, A.x * TILE, A.y * TILE, B.x * TILE, B.y * TILE, mitad,
            t.fondo === 'puente' ? COLOR.puente : COLOR.asfalto);
        }
      }
      for (const n of nodos) {
        const r = radioNodo.get(n.id);
        if (!r) continue;
        const fondo = fondoNodo.get(n.id);
        if (pasada === 'bordillo') {
          if (fondo === 'acera') circulo(-1931, n.x * TILE, n.y * TILE, r + 3, COLOR.bordillo);
        } else {
          circulo(-1930, n.x * TILE, n.y * TILE, r, fondo === 'puente' ? COLOR.puente : COLOR.asfalto);
        }
      }
    }
  },

  // los pasos de peatones se pintan donde el mapa dice que estan, asi que lo
  // que ves es exactamente por donde cruza la gente
  // Los pasos de peatones se pintan donde el mapa dice que estan, asi que lo
  // que ves es exactamente por donde cruza la gente. Van en dos BLITTERS (uno
  // por orientacion): con la ciudad grande eran casi cuatro mil imagenes
  // sueltas, y un blitter pinta miles de copias de la misma textura como si
  // fuera un solo objeto.
  drawCrosswalks() {
    if (this.map.graph) return this.pintarMarcasGrandes();
    const m = this.map;
    const bh = this.add.blitter(0, 0, 'cebra-h').setDepth(-1900);
    const bv = this.add.blitter(0, 0, 'cebra-v').setDepth(-1900);
    const anchoH = this.textures.get('cebra-h').getSourceImage().width;
    const altoH = this.textures.get('cebra-h').getSourceImage().height;
    const anchoV = this.textures.get('cebra-v').getSourceImage().width;
    const altoV = this.textures.get('cebra-v').getSourceImage().height;

    for (let ty = 0; ty < m.h; ty++) {
      for (let tx = 0; tx < m.w; tx++) {
        const tipo = m.crossMask[m.idx(tx, ty)];
        if (!tipo) continue;
        const cx = (tx + 0.5) * TILE;
        const cy = (ty + 0.5) * TILE;
        const bob = tipo === 1
          ? bh.create(cx - anchoH / 2, cy - altoH / 2)
          : bv.create(cx - anchoV / 2, cy - altoV / 2);
        bob.alpha = 0.42;
      }
    }
  },

  // LA CIUDAD GRANDE: las calles van en cualquier angulo, asi que la linea
  // central y las cebras ya no pueden ser casillas (LINE_H/LINE_V, cebra-h y
  // cebra-v). Se pintan en las capas de dibujo por zonas, como los
  // edificios: rectangulos girados con fillPoints.
  pintarMarcasGrandes() {
    const { nodos, tramos } = this.map.graph;
    const rect = (cx, cy, ux, uy, largo, ancho, color, alpha) => {
      const g = this.capaCalle('marcas', cx, cy);
      const lx = ux * largo / 2; const ly = uy * largo / 2;
      const ax = -uy * ancho / 2; const ay = ux * ancho / 2;
      g.fillStyle(color, alpha);
      g.fillPoints([
        { x: cx - lx - ax, y: cy - ly - ay }, { x: cx + lx - ax, y: cy + ly - ay },
        { x: cx + lx + ax, y: cy + ly + ay }, { x: cx - lx + ax, y: cy - ly + ay },
      ], true);
    };

    // la linea central, a trazos, sin meterse en los cruces
    const TRAZO = 18;
    const HUECO = 16;
    for (const t of tramos) {
      const A = nodos[t.a]; const B = nodos[t.b];
      const ax = A.x * TILE; const ay = A.y * TILE;
      const dx = B.x * TILE - ax; const dy = B.y * TILE - ay;
      const largo = Math.hypot(dx, dy);
      if (largo < 1) continue;
      const ux = dx / largo; const uy = dy / largo;
      const libre = (n) => (n.grado >= 3 || n.grado === 1 ? (t.ancho / 2 + 2.5) * TILE : 0);
      const d0 = libre(A);
      const d1 = largo - libre(B);
      for (let d = d0; d + TRAZO <= d1; d += TRAZO + HUECO) {
        const m = d + TRAZO / 2;
        rect(ax + ux * m, ay + uy * m, ux, uy, TRAZO, 2, 0x9a8c4a, 0.85);
      }
    }

    // las cebras: franjas en el sentido de la marcha, repartidas de lado a
    // lado de la calzada
    for (const c of this.map.cebras) {
      const ux = Math.cos(c.ang); const uy = Math.sin(c.ang);
      const ancho = c.ancho * TILE;
      for (let s = -ancho / 2 + 10; s <= ancho / 2 - 10; s += 16) {
        rect(c.x * TILE - uy * s, c.y * TILE + ux * s, ux, uy, 52, 8, 0xd8d4c8, 0.42);
      }
    }
  },

  // TODA la ciudad se pinta en un puñado de capas de dibujo, no en miles de
  // sprites. Cada edificio son una docena de rectangulos (sombra, paredes,
  // tejado, ventanas, portal...) y con 313 edificios eso eran casi cuatro mil
  // objetos en la escena, solo para cosas que NO se mueven nunca. Agrupados
  // por profundidad son doce objetos y se dibujan de una pasada.
  drawBuildings() {
    const block = (x, y, w, h, tint, depth, alpha = 1) =>
      this.pintarRect(x, y, w, h, tint, depth, alpha);

    for (const b of this.map.buildings) {
      const rnd = buildingRng(b.tx, b.ty);

      // ALTURA: se ven las paredes del lado sur y del este, como si la camara
      // mirase desde arriba pero un poco desde el noroeste. Sin esto los
      // edificios eran cajas planas y la ciudad no tenia relieve.
      const ALTURAS = {
        centro: 30, comercial: 18, residencial: 11,
        conflictivo: 13, industrial: 15, puerto: 13,
      };
      const alto = (ALTURAS[b.zone] || 12) + Math.round(rnd() * 5);

      // sombra propia: el sol entra siempre desde arriba a la izquierda,
      // asi toda la ciudad comparte la misma luz
      const drop = alto + 5;
      block(b.px + drop, b.py + drop, b.pw + 2, b.ph + 2, 0x05060a, -1250, 0.5);

      // pared sur y pared este, mas oscuras que el tejado
      const paredS = shade(b.color, 0.44);
      const paredE = shade(b.color, 0.56);
      block(b.px + alto / 2, b.py + b.ph / 2 + alto / 2, b.pw, alto, paredS, -1210);
      block(b.px + b.pw / 2 + alto / 2, b.py + alto / 2, alto, b.ph, paredE, -1211);

      // lineas verticales en la pared: le dan textura de fachada
      const huecos = Math.max(2, Math.floor(b.pw / 26));
      for (let i = 1; i < huecos; i++) {
        block(
          b.px - b.pw / 2 + (i * b.pw) / huecos + alto / 2,
          b.py + b.ph / 2 + alto / 2,
          2, alto, shade(b.color, 0.3), -1209, 0.7
        );
      }

      // EL TEJADO. Si hay imagen preparada para el barrio, se usa esa (una
      // sola imagen por edificio, que eso si lo aguanta la ciudad grande);
      // si no, el rectangulo de color de siempre.
      const claveTecho = `techo-${b.zone}`;
      if (this.textures.exists(claveTecho)) {
        this.capaObjetos(-1199, b.px, b.py).add(this.add.image(b.px, b.py, claveTecho)
          .setDisplaySize(b.pw, b.ph).setDepth(-1200));
        b.conFoto = true;
      } else {
        block(b.px, b.py, b.pw, b.ph, b.color, -1200);
      }

      block(b.px, b.py - b.ph / 2 + 2, b.pw - 4, 4, shade(b.color, 1.45), -1190);
      block(b.px - b.pw / 2 + 2, b.py, 4, b.ph - 4, shade(b.color, 1.3), -1190);
      block(b.px, b.py + b.ph / 2 - 2, b.pw - 4, 4, shade(b.color, 0.62), -1190);
      block(b.px + b.pw / 2 - 2, b.py, 4, b.ph - 4, shade(b.color, 0.7), -1190);

      if (!b.conFoto && b.pw > 64 && b.ph > 64) {
        const inset = 16 + Math.round(rnd() * 14);
        block(
          b.px, b.py, b.pw - inset, b.ph - inset,
          shade(b.color, 0.86 + rnd() * 0.4), -1180, 0.75
        );
      }

      // los adornos pintados a mano solo si el tejado no trae foto: encima
      // de una imagen de verdad quedan como parches
      if (!b.conFoto) this.decorarPorBarrio(b, block, rnd);

      // ventanas por la fachada, para que se lea como edificio y no como caja
      if (!b.conFoto && b.pw >= 96 && b.ph >= 96) {
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
            fontFamily: 'Pricedown, Anton, sans-serif', stroke: '#05060a', strokeThickness: 2,
            fontSize: '13px',
            color: '#e8c9a0',
          })
          .setOrigin(0.5)
          .setDepth(-1030);
      }
    }
  },

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
        // Con mas contraste que antes: en un mapa pequeño lo unico que
        // importa es distinguir de un vistazo por donde se puede conducir.
        if (this.map.roadMask[this.map.idx(tx, ty)] === 1) c = [126, 132, 142];
        else if (tile === T.WATER) c = [26, 58, 78];
        else if (tile === T.ROCK) c = [70, 62, 52];
        else if (this.map.isSolidTile(tx, ty)) c = [58, 54, 50];
        else if (tile === T.SIDEWALK) c = [86, 90, 98];
        else c = [40, 45, 48];

        // Territorio de banda teñido encima, como el mapa de zonas del SA,
        // pero SOLO sobre las manzanas: tiñendo tambien el asfalto no habia
        // forma de ver por donde se iba.
        const esCalle = this.map.roadMask[this.map.idx(tx, ty)] === 1 || tile === T.SIDEWALK;
        const zone = this.map.zoneNames[this.map.zoneGrid[this.map.idx(tx, ty)]];
        const owner = esCalle ? null : zone ? ZONE_OWNER[zone] : null;
        if (owner) {
          const col = FACTIONS[owner].color;
          const mix = 0.34;
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
  },

  drawLandmarks() {
    const block = (x, y, w, h, tint, depth, alpha = 1) =>
      this.add
        .image(x, y, 'px')
        .setDisplaySize(w, h)
        .setTint(tint)
        .setAlpha(alpha)
        .setDepth(depth);

    for (const L of this.map.landmarks) {
      const conLamina = this.pintarLaminaLandmark(L);
      if (conLamina) {
        // la lamina de IA ya esta puesta: el dibujo por codigo sobra
      } else if (L.type === 'plaza') {
        // Antes era un circulo azul plano que parecia una piscina. Ahora es
        // una plaza empedrada con una fuente y una estatua en medio.
        this.add.circle(L.monument.px, L.monument.py, 108, 0x474b52).setDepth(-1222);
        this.add.circle(L.monument.px, L.monument.py, 108)
          .setStrokeStyle(4, 0x5c6169, 0.8).setDepth(-1221);
        this.add.circle(L.monument.px, L.monument.py, 84, 0x3f444b).setDepth(-1220);

        // cuatro parterres alrededor de la fuente
        for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
          const gx = L.monument.px + Math.cos(a) * 96;
          const gy = L.monument.py + Math.sin(a) * 70;
          this.add.circle(gx + 4, gy + 5, 20, 0x05060a, 0.4).setDepth(-1219);
          this.add.circle(gx, gy, 19, 0x2c3a29).setDepth(-1218);
          this.add.circle(gx - 4, gy - 4, 11, 0x3a4c35).setDepth(-1217);
        }

        // pilon de la fuente: el agua es solo el centro, no toda la plaza
        this.add.circle(L.monument.px + 4, L.monument.py + 6, 50, 0x05060a, 0.45).setDepth(-1216);
        this.add.circle(L.monument.px, L.monument.py, 48, 0x6b6a62).setDepth(-1215);
        this.add.circle(L.monument.px, L.monument.py, 41, 0x1e4450).setDepth(-1214);
        this.add.circle(L.monument.px, L.monument.py, 41, 0x4a8fa8, 0.3).setDepth(-1213);

        // estatua con su sombra larga, para que se lea que es alta
        block(L.monument.px + 9, L.monument.py + 12, 20, 34, 0x05060a, -1208, 0.5);
        block(L.monument.px, L.monument.py, 24, 24, 0x5a5b60, -1206);
        block(L.monument.px, L.monument.py - 4, 15, 26, 0x7a766a, -1205);
        block(L.monument.px, L.monument.py - 12, 9, 12, 0xc8a955, -1204);
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
      } else if (L.type === 'faro') {
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
      } else if (L.type === 'playa') {
        const norte = L.py - L.ph / 2;
        const sur = L.py + L.ph / 2;

        // palmeras pegadas al paseo, del lado de la ciudad
        const np = Math.max(2, Math.floor(L.pw / 340));
        for (let i = 0; i < np; i++) {
          const px = L.px - L.pw / 2 + (i + 0.5) * (L.pw / np);
          const py = norte + 16;
          block(px + 3, py + 20, 6, 24, 0x05060a, -1196, 0.4);
          block(px, py + 10, 6, 28, 0x6b5238, -1195);
          this.add.circle(px - 7, py - 6, 13, 0x3d7a3f).setDepth(-1194);
          this.add.circle(px + 8, py - 8, 13, 0x4a8f4d).setDepth(-1194);
          this.add.circle(px, py - 16, 13, 0x3d7a3f).setDepth(-1194);
        }

        // sombrillas de colores pegadas al agua
        const n = Math.max(3, Math.floor(L.pw / 220));
        for (let i = 0; i < n; i++) {
          const sx = L.px - L.pw / 2 + (i + 0.5) * (L.pw / n);
          const sy = sur - 26 + (i % 2 === 0 ? -14 : 14);
          const color = [0xd9584a, 0xe8b54a, 0x4a8fd0, 0x6bb374][i % 4];
          block(sx + 4, sy + 6, 46, 18, 0x05060a, -1200, 0.35);
          block(sx, sy + 10, 5, 24, 0x6b5a45, -1199);
          this.add.circle(sx, sy, 22, color).setDepth(-1198);
          this.add.circle(sx, sy, 22).setStrokeStyle(2, 0x05060a, 0.5).setDepth(-1197);
        }
      } else if (L.type === 'estadio') {
        block(L.px + 10, L.py + 12, L.pw + 10, L.ph + 10, 0x05060a, -1215, 0.4);
        block(L.px, L.py, L.pw, L.ph, 0x2e323a, -1210);   // las gradas

        const campoW = L.pw - L.borde * 64;
        const campoH = L.ph - L.borde * 64;
        block(L.px, L.py, campoW, campoH, 0x2f5a34, -1200);        // el cesped
        this.add.rectangle(L.px, L.py, campoW - 20, campoH - 20)
          .setStrokeStyle(2, 0xe8e4d8, 0.7).setDepth(-1198);
        block(L.px, L.py, 3, campoH - 20, 0xe8e4d8, -1197, 0.7);   // linea de medio campo
        this.add.circle(L.px, L.py, 34).setStrokeStyle(2, 0xe8e4d8, 0.7).setDepth(-1197);

        // cuatro torres de luz, una por esquina, parpadeando
        for (const [ex, ey] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const lx = L.px + ex * (L.pw / 2 - 20);
          const ly = L.py + ey * (L.ph / 2 - 20);
          block(lx, ly, 8, 40, 0x3a3f47, -1205);
          const luz = this.add.circle(lx, ly - 24, 10, 0xf2efc0, 0.9).setDepth(-1204);
          this.tweens.add({
            targets: luz, alpha: { from: 0.9, to: 0.5 },
            duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
          });
        }
      } else if (L.type === 'mercado') {
        const p = L.pabellon;
        block(p.px + 10, p.py + 12, p.pw + 10, p.ph + 10, 0x05060a, -1215, 0.4);
        block(p.px, p.py, p.pw, p.ph, 0x5a4c3a, -1210);   // el pabellon

        // el tejado en dientes de sierra, como los mercados y naves de
        // verdad: franjas alternas para que se lea el techo desde arriba
        const franjas = 5;
        const anchoFranja = p.pw / franjas;
        for (let i = 0; i < franjas; i++) {
          const fx = p.px - p.pw / 2 + (i + 0.5) * anchoFranja;
          block(
            fx, p.py - p.ph / 2 + 14, anchoFranja - 6, 24,
            i % 2 === 0 ? 0x8a7452 : 0x7a6446, -1205
          );
        }

        // puestos con toldo de colores, en fila junto a la entrada (sur)
        const colores = [0xd9584a, 0xe8b54a, 0x4a8fd0, 0x6bb374, 0xc86ab0];
        const filaY = p.py + p.ph / 2 + 30;
        for (let i = 0; i < colores.length; i++) {
          const px2 = p.px - p.pw / 2 + (i + 0.5) * (p.pw / colores.length);
          block(px2 + 3, filaY + 5, 34, 12, 0x05060a, -1200, 0.35);
          block(px2, filaY, 34, 10, colores[i], -1199);
          block(px2, filaY - 8, 40, 6, colores[i], -1198);
        }
      } else if (L.type === 'carcel') {
        block(L.px + 10, L.py + 12, L.pw + 10, L.ph + 10, 0x05060a, -1215, 0.4);
        block(L.px, L.py, L.pw, L.ph, 0x4a4d52, -1210);              // el muro
        block(L.px, L.py, L.pw - 40, L.ph - 40, 0x35383d, -1205);    // el patio
        block(L.px, L.py, L.pw - 100, L.ph - 60, 0x54585f, -1200);   // las celdas

        // ventanitas en rejilla, para que se lea que es una carcel
        const filas = 3;
        const cols = 6;
        const edW = L.pw - 100;
        const edH = L.ph - 60;
        for (let f = 0; f < filas; f++) {
          for (let c = 0; c < cols; c++) {
            const vx = L.px - edW / 2 + 20 + c * ((edW - 40) / (cols - 1));
            const vy = L.py - edH / 2 + 16 + f * ((edH - 32) / (filas - 1));
            block(vx, vy, 8, 8, 0x1a1c20, -1199);
          }
        }

        // torres de vigilancia en las esquinas, con foco parpadeante
        for (const [ex, ey] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const tx = L.px + ex * (L.pw / 2 - 16);
          const ty = L.py + ey * (L.ph / 2 - 16);
          block(tx, ty, 20, 20, 0x2a2d32, -1206);
          const foco = this.add.circle(tx, ty, 7, 0xf2efc0, 0.9).setDepth(-1204);
          this.tweens.add({
            targets: foco, alpha: { from: 0.9, to: 0.3 },
            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
          });
        }
      } else if (L.type === 'casino') {
        const p = L.fachada;
        block(p.px + 10, p.py + 12, p.pw + 10, p.ph + 10, 0x05060a, -1215, 0.4);
        block(p.px, p.py, p.pw, p.ph, 0x2a1f38, -1210);           // fachada morada
        block(p.px, p.py, p.pw - 60, p.ph - 60, 0x3a2a4a, -1205);

        // el cartel grande, arriba
        block(p.px, p.py - p.ph / 2 - 20, 150, 26, 0x1a1420, -1206);
        block(p.px, p.py - p.ph / 2 - 20, 138, 16, 0xc86ab0, -1205, 0.85);

        // luces de neon parpadeantes, dos filas (arriba y abajo de la
        // fachada), cada una a su ritmo para que no titilen a la vez
        const colores = [0xd9584a, 0xe8b54a, 0x4a8fd0, 0x6bb374, 0xc86ab0, 0xf2e2ae];
        const nLuces = 7;
        for (const fila of [-1, 1]) {
          const ly = p.py + fila * (p.ph / 2 - 12);
          for (let i = 0; i < nLuces; i++) {
            const lx = p.px - p.pw / 2 + 20 + i * ((p.pw - 40) / (nLuces - 1));
            const luz = this.add.circle(lx, ly, 6, colores[i % colores.length], 0.9).setDepth(-1204);
            this.tweens.add({
              targets: luz, alpha: { from: 0.35, to: 1 },
              duration: 500 + ((i * 80) % 600), yoyo: true, repeat: -1, ease: 'Sine.inOut',
            });
          }
        }
      } else if (L.type === 'aparcamiento') {
        block(L.px, L.py, L.pw, L.ph, 0x3a3d42, -1215);   // el asfalto

        const filas = 4;
        const plazasPorFila = 8;
        const colores = [0xd9584a, 0xe8b54a, 0x4a8fd0, 0x6bb374, 0xc86ab0, 0x9aa3ad];
        for (let f = 0; f < filas; f++) {
          const fy = L.py - L.ph / 2 + 60 + f * ((L.ph - 120) / (filas - 1));
          for (let c = 0; c < plazasPorFila; c++) {
            const cx = L.px - L.pw / 2 + 40 + c * ((L.pw - 80) / (plazasPorFila - 1));
            block(cx, fy, 3, 40, 0xc8c4b8, -1210, 0.5);   // raya de la plaza
            // no todas las plazas tienen coche, para que no parezca lleno
            if ((f + c) % 3 !== 0) {
              const color = colores[(f * plazasPorFila + c) % colores.length];
              block(cx + 10, fy, 24, 34, 0x05060a, -1206, 0.3);
              block(cx + 9, fy, 22, 32, color, -1205);
            }
          }
        }

        // el letrero grande de la "P"
        block(L.px, L.py - L.ph / 2 - 20, 40, 40, 0x1a2a4a, -1206);
        this.add.text(L.px, L.py - L.ph / 2 - 20, 'P', {
          fontFamily: 'Pricedown, Anton, Impact, sans-serif', fontSize: '28px', color: '#f2efe6',
        }).setOrigin(0.5).setDepth(-1205);
      } else if (L.type === 'poligono') {
        block(L.px, L.py, L.pw, L.ph, 0x3a3a35, -1215);   // el patio, tierra y asfalto

        // contenedores apilados, en pilas de 1 a 3 (determinista por columna)
        const colores = [0xb0582a, 0x4a7a8f, 0xc84a3a, 0x5a8f4a, 0xd0a52a];
        const columnas = 5;
        for (let c = 0; c < columnas; c++) {
          const cx = L.px - L.pw / 2 + 60 + c * ((L.pw - 120) / (columnas - 1));
          const alturaPila = 1 + ((c * 37) % 3);
          for (let piso = 0; piso < alturaPila; piso++) {
            const cy = L.py + L.ph / 2 - 60 - piso * 22;
            const color = colores[(c + piso) % colores.length];
            block(cx + 3, cy + 4, 50, 22, 0x05060a, -1210, 0.3);
            block(cx, cy, 48, 20, color, -1209 - piso);
          }
        }

        // la grua de carga, un simple portico en H
        const gx = L.px;
        const gy = L.py - L.ph / 2 + 44;
        block(gx - 60, gy, 10, 60, 0x3a3f47, -1206);
        block(gx + 60, gy, 10, 60, 0x3a3f47, -1206);
        block(gx, gy - 30, 130, 10, 0x4a5058, -1205);
      } else if (L.type === 'aeropuerto') {
        const pista = L.pista;
        block(pista.px, pista.py, pista.pw, 160, 0x2a2d33, -1215);   // el asfalto

        // linea central discontinua
        const n = Math.max(2, Math.floor(pista.pw / 60));
        for (let i = 0; i < n; i++) {
          const lx = pista.px - pista.pw / 2 + 30 + i * (pista.pw / n);
          block(lx, pista.py, 30, 4, 0xe8e4d8, -1210, 0.7);
        }

        const term = L.terminal;
        block(term.px + 8, term.py + 10, term.pw + 8, term.ph + 8, 0x05060a, -1216, 0.4);
        block(term.px, term.py, term.pw, term.ph, 0xc8c4b8, -1210);

        // la torre de control, con luz roja parpadeante en lo alto
        const torreX = term.px + term.pw / 2 - 10;
        const torreY = term.py - 20;
        block(torreX, torreY, 16, 40, 0x9aa3ad, -1205);
        const luzTorre = this.add.circle(torreX, torreY - 24, 6, 0xff4a3a).setDepth(-1204);
        this.tweens.add({
          targets: luzTorre, alpha: { from: 1, to: 0.15 },
          duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
      } else if (L.type === 'monte') {
        const cx = L.cima.px;
        const cy = L.cima.py;
        const radio = Math.min(L.pw, L.ph) / 2;

        // terrazas concentricas, de la base (verde oscuro) a la cima (roca)
        const capas = [
          { r: radio, color: 0x3d4a2f },
          { r: radio * 0.75, color: 0x4a5a38 },
          { r: radio * 0.5, color: 0x5a6a42 },
          { r: radio * 0.28, color: 0x8a8272 },
        ];
        for (const capa of capas) {
          this.add.ellipse(cx, cy, capa.r * 2, capa.r * 1.3, capa.color).setDepth(-1215);
        }

        // el camino en zigzag, de la base (sur) a la cima. Los extremos
        // (i=0 e i=tramos) van centrados; los del medio alternan de lado.
        const tramos = 5;
        const puntos = [];
        for (let i = 0; i <= tramos; i++) {
          const t = i / tramos;
          const factor = i === 0 || i === tramos ? 0 : (i % 2 === 0 ? 1 : -1);
          puntos.push({
            x: cx + factor * radio * 0.5 * (1 - t * 0.6),
            y: cy + radio * 1.3 * (0.5 - t),
          });
        }
        for (let i = 0; i < puntos.length - 1; i++) {
          const a = puntos[i];
          const b = puntos[i + 1];
          const largo = Math.hypot(b.x - a.x, b.y - a.y);
          const angulo = Math.atan2(b.y - a.y, b.x - a.x);
          this.add.image((a.x + b.x) / 2, (a.y + b.y) / 2, 'px')
            .setDisplaySize(largo + 4, 14).setTint(0x5a4c3a).setDepth(-1205)
            .setRotation(angulo);
        }

        // el mirador, en la cima
        block(cx, cy - radio * 0.15, 50, 30, 0x6b6257, -1200);
        block(cx, cy - radio * 0.15 - 18, 50, 6, 0x3a352e, -1199);
      } else if (L.type === 'isla') {
        const p = L.isla;
        const norteY = L.py - L.ph / 2;
        const puenteLargo = p.py - 64 - norteY;
        const puenteY = norteY + puenteLargo / 2;
        const puenteAncho = 100;

        // el puente: tablones y baranda a los dos lados
        block(L.px, puenteY, puenteAncho, puenteLargo, 0x6b5a45, -1210);
        block(L.px - puenteAncho / 2, puenteY, 6, puenteLargo, 0x3a352e, -1209);
        block(L.px + puenteAncho / 2, puenteY, 6, puenteLargo, 0x3a352e, -1209);

        // la isla: arena, una palmera y un cobertizo de pescador
        block(p.px, p.py, 140, 60, 0xd9c896, -1210, 0.6);
        block(p.px - 22, p.py + 4, 10, 30, 0x6b5238, -1206);
        this.add.circle(p.px - 28, p.py - 16, 12, 0x3d7a3f).setDepth(-1204);
        this.add.circle(p.px - 14, p.py - 18, 12, 0x4a8f4d).setDepth(-1204);
        block(p.px + 18, p.py, 34, 24, 0x8a7452, -1205);
        block(p.px + 18, p.py - 16, 40, 8, 0x5a4a38, -1204);
      } else if (L.type === 'tunel') {
        // no se toca la calle: solo se oscurece por encima (los coches y
        // el jugador se siguen viendo, mas apagados, como si estuvieran
        // dentro) y se pintan las dos bocas en los extremos
        const t2 = L.tramo;
        block(t2.px, t2.py, t2.pw - 50, t2.ph, 0x0a0b0d, -1150, 0.55);
        for (const lado of [-1, 1]) {
          const bx = t2.px + lado * (t2.pw / 2 - 25);
          block(bx, t2.py, 50, t2.ph + 16, 0x1a1c20, -1140);
          block(bx, t2.py, 34, t2.ph, 0x05060a, -1139);
        }
      }

      this.efectosVivos(L);

      this.add
        .text(L.px, L.py + L.ph / 2 + 22, L.label.toUpperCase(), {
          fontFamily: 'Pricedown, Anton, sans-serif', stroke: '#05060a', strokeThickness: 2,
          fontSize: '15px',
          color: '#b9b2a0',
        })
        .setOrigin(0.5, 0)
        .setAlpha(0.55)
        .setDepth(-900);
    }
  },

  // LA LAMINA DE IA DE UN LANDMARK, si existe (arte/landmark-<tipo>.jpg, o
  // en dos mitades -a y -b para los muy alargados, que la IA no saca tan
  // anchos sin deformarlos). Se estira sobre la huella exacta del landmark,
  // asi que lo solido del dibujo cae donde es solido en el juego.
  //
  // Las casillas de calle que cruzan la huella (la calle del puerto por la
  // playa, el aerodromo y el monte; la bajada al puerto por el aerodromo)
  // NO se tapan: la lamina se recorta alrededor y por ahi se ve la calle de
  // verdad por la que van los coches. Se agrupan las filas con la misma
  // forma de calle y se pinta un recorte por cada tramo sin calle.
  pintarLaminaLandmark(L) {
    if (L.type === 'tunel') return false;   // el tunel ES la calle
    const unica = `landmark-${L.type}`;
    const mitadA = `landmark-${L.type}-a`;
    const mitadB = `landmark-${L.type}-b`;
    let trozos;
    if (this.textures.exists(unica)) {
      trozos = [{ clave: unica, x0: 0, x1: L.w }];
    } else if (this.textures.exists(mitadA) && this.textures.exists(mitadB)) {
      trozos = [{ clave: mitadA, x0: 0, x1: L.w / 2 }, { clave: mitadB, x0: L.w / 2, x1: L.w }];
    } else {
      return false;
    }

    const map = this.map;
    const esCalle = (c, r) => {
      const x = L.x + c;
      const y = L.y + r;
      return map.inBounds(x, y) && map.roadMask[map.idx(x, y)] === 1;
    };

    for (const t of trozos) {
      const c0 = Math.floor(t.x0);
      const c1 = Math.ceil(t.x1);
      const frame = this.textures.get(t.clave).get();
      const escX = frame.realWidth / (t.x1 - t.x0);
      const escY = frame.realHeight / L.h;
      const cx = (L.x + (t.x0 + t.x1) / 2) * TILE;

      // filas seguidas con la misma forma de calle forman una franja
      let r = 0;
      while (r < L.h) {
        const forma = (fila) => {
          let s = '';
          for (let c = c0; c < c1; c++) s += esCalle(c, fila) ? '1' : '0';
          return s;
        };
        const patron = forma(r);
        let r2 = r + 1;
        while (r2 < L.h && forma(r2) === patron) r2++;

        // cada tramo seguido sin calle dentro de la franja, un recorte. Donde
        // el recorte linda con calle se mete 2 px: el filtrado de la textura
        // coge el pixel de al lado y dejaba una raya del color de la franja
        // recortada justo en el bordillo.
        const MARGEN = 2;
        const hayCalle = (ca, cb, ra, rb) => {
          for (let rr = ra; rr < rb; rr++) {
            for (let cc = ca; cc < cb; cc++) if (esCalle(cc, rr)) return true;
          }
          return false;
        };
        let c = c0;
        while (c < c1) {
          if (patron[c - c0] === '1') { c++; continue; }
          let fin = c;
          while (fin < c1 && patron[fin - c0] === '0') fin++;
          const desde = Math.max(c, t.x0);
          const hasta = Math.min(fin, t.x1);
          if (hasta > desde) {
            const arriba = r > 0 && hayCalle(c, fin, r - 1, r) ? MARGEN : 0;
            const abajo = r2 < L.h && hayCalle(c, fin, r2, r2 + 1) ? MARGEN : 0;
            const izq = c > 0 && hayCalle(c - 1, c, r, r2) ? MARGEN : 0;
            const der = fin < L.w && hayCalle(fin, fin + 1, r, r2) ? MARGEN : 0;
            this.add.image(cx, L.py, t.clave)
              .setDisplaySize((t.x1 - t.x0) * TILE, L.ph)
              .setCrop(
                (desde - t.x0) * escX + izq, r * escY + arriba,
                (hasta - desde) * escX - izq - der, (r2 - r) * escY - arriba - abajo
              )
              .setDepth(-1215);
          }
          c = fin;
        }
        r = r2;
      }
    }
    return true;
  },

  // lo que se mueve encima del landmark, haya lamina o no: la luz roja de
  // la antena de la torre y el haz del faro, los dos en el centro exacto
  // (las laminas piden la antena y la linterna ahi mismo)
  efectosVivos(L) {
    if (L.type === 'torre') {
      const luz = this.add.circle(L.px, L.py, 9, 0xff4a3a).setDepth(-1180);
      this.tweens.add({
        targets: luz, alpha: { from: 1, to: 0.15 },
        duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    } else if (L.type === 'faro') {
      const haz = this.add.circle(L.tower.px, L.tower.py, 120, 0xe8d08a, 0.13).setDepth(-1230);
      this.tweens.add({
        targets: haz, scale: { from: 0.75, to: 1.25 }, alpha: { from: 0.2, to: 0.05 },
        duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }
  },

  // Cada barrio construye distinto. Es lo que le da caracter a la ciudad:
  // no es el mismo bloque pintado de otro color, es otra clase de edificio.
  decorarPorBarrio(b, block, rnd) {
    const techo = shade(b.color, 1.15 + rnd() * 0.3);
    const oscuro = shade(b.color, 0.5);

    const trasto = (ox, oy, w, h, tint) => {
      block(b.px + ox + 2, b.py + oy + 2, w, h, 0x05060a, -1175, 0.4);
      block(b.px + ox, b.py + oy, w, h, tint, -1170);
    };

    switch (b.zone) {
      case 'residencial': {
        // tejado a dos aguas: dos franjas y una cumbrera en medio
        const horizontal = b.pw >= b.ph;
        if (horizontal) {
          block(b.px, b.py - b.ph * 0.25, b.pw - 12, b.ph * 0.44, techo, -1179, 0.9);
          block(b.px, b.py, b.pw - 12, 3, shade(b.color, 1.7), -1177);
        } else {
          block(b.px - b.pw * 0.25, b.py, b.pw * 0.44, b.ph - 12, techo, -1179, 0.9);
          block(b.px, b.py, 3, b.ph - 12, shade(b.color, 1.7), -1177);
        }
        // chimenea
        const cx = (rnd() - 0.5) * (b.pw - 40);
        trasto(cx, (rnd() - 0.5) * (b.ph - 40), 12, 12, 0x6b5142);
        break;
      }

      case 'comercial': {
        // toldo a rayas hacia la calle y cartel en la azotea
        const rayas = 7;
        const anchoToldo = Math.min(b.pw - 20, 96);
        for (let i = 0; i < rayas; i++) {
          block(
            b.px - anchoToldo / 2 + (i + 0.5) * (anchoToldo / rayas),
            b.py + b.ph / 2 - 12,
            anchoToldo / rayas - 1, 16,
            i % 2 ? 0xb8483c : 0xe0d6c2,
            -1177, 0.9
          );
        }
        block(b.px, b.py - b.ph * 0.28, Math.min(b.pw - 26, 84), 16, 0x1d2027, -1176);
        block(b.px, b.py - b.ph * 0.28, Math.min(b.pw - 34, 74), 9, 0xe8b54a, -1175, 0.75);
        break;
      }

      case 'centro': {
        // azotea tecnica: climatizadores en fila y helipuerto en los grandes
        const n = 2 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) {
          trasto(
            -b.pw * 0.3 + i * 22, (rnd() - 0.5) * (b.ph - 44),
            14, 11, 0x7a7d84
          );
        }
        if (b.pw > 150 && b.ph > 150) {
          this.pintarCirculo(b.px, b.py, 26, shade(b.color, 0.55), -1174);
          this.add.circle(b.px, b.py, 20).setStrokeStyle(3, 0xe0d6c2, 0.7).setDepth(-1173);
        }
        break;
      }

      case 'industrial': {
        // cubierta de chapa y porton de carga
        for (let i = 0; i * 14 < b.ph - 20; i++) {
          block(b.px, b.py - b.ph / 2 + 12 + i * 14, b.pw - 14, 2, oscuro, -1177, 0.5);
        }
        block(b.px, b.py + b.ph / 2 - 10, Math.min(b.pw * 0.45, 70), 14, 0x2a2e35, -1176);
        block(b.px, b.py + b.ph / 2 - 10, Math.min(b.pw * 0.4, 62), 8, 0x585d66, -1175);
        trasto((rnd() - 0.5) * (b.pw - 40), -b.ph * 0.28, 18, 18, 0x6b6257);
        break;
      }

      case 'conflictivo': {
        // ventanas tapiadas y pintadas en la pared
        const n = 2 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) {
          const ox = (rnd() - 0.5) * (b.pw - 30);
          const oy = (rnd() - 0.5) * (b.ph - 30);
          block(b.px + ox, b.py + oy, 13, 4, 0x4a3f33, -1174);
          block(b.px + ox, b.py + oy, 4, 13, 0x4a3f33, -1174);
        }
        const gx = (rnd() - 0.5) * (b.pw - 40);
        block(b.px + gx, b.py + b.ph / 2 - 8, 26, 9, 0x8a4a2f, -1173, 0.55);
        trasto((rnd() - 0.5) * (b.pw - 34), (rnd() - 0.5) * (b.ph - 34), 15, 15, 0x55504a);
        break;
      }

      case 'puerto': {
        // contenedores apilados en la cubierta
        const colores = [0xa8442f, 0x2f6b7a, 0x8a7a2f, 0x3f6b45];
        const n = 2 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) {
          const w = 26 + rnd() * 14;
          const ox = (rnd() - 0.5) * (b.pw - w - 14);
          const oy = (rnd() - 0.5) * (b.ph - 24);
          trasto(ox, oy, w, 15, colores[Math.floor(rnd() * colores.length)]);
        }
        break;
      }

      default: {
        const size = 9 + Math.round(rnd() * 13);
        if (size + 14 <= Math.min(b.pw, b.ph)) {
          trasto(
            (rnd() - 0.5) * (b.pw - size - 16),
            (rnd() - 0.5) * (b.ph - size - 16),
            size, size, 0x6b6257
          );
        }
      }
    }
  },

  // Mobiliario de calle. No estorba el paso (si fuese solido los peatones se
  // quedarian encerrados en las aceras), pero rompe la uniformidad del suelo.
  drawStreetProps() {
    let puestos = 0;
    for (const spot of this.map.sidewalkSpots) {
      const rnd = buildingRng(spot.tx * 3 + 11, spot.ty * 7 + 5);
      if (rnd() > 0.13) continue;

      const x = spot.x + (rnd() - 0.5) * 14;
      const y = spot.y + (rnd() - 0.5) * 14;
      const tipo = rnd();
      const img = (ox, oy, w, h, tint, depth, alpha = 1) =>
        this.pintarRect(x + ox, y + oy, w, h, tint, depth, alpha);

      if (tipo < 0.42) {
        // arbol: sombra, copa y tronco asomando
        this.pintarCirculo(x + 4, y + 5, 15, 0x05060a, -880, 0.4);
        img(0, 0, 6, 6, 0x4a3a28, -876);
        this.pintarCirculo(x, y, 14, 0x2c3a29, -875);
        this.pintarCirculo(x - 3, y - 3, 8, 0x3a4c35, -874);
      } else if (tipo < 0.62) {
        // papelera
        img(2, 3, 11, 11, 0x05060a, -876, 0.35);
        img(0, 0, 10, 10, 0x3a3f45, -875);
        img(0, -1, 8, 3, 0x22262c, -874);
      } else if (tipo < 0.82) {
        // banco
        const vertical = rnd() > 0.5;
        const w = vertical ? 8 : 30;
        const h = vertical ? 30 : 8;
        img(2, 3, w, h, 0x05060a, -876, 0.35);
        img(0, 0, w, h, 0x5a4634, -875);
        img(0, 0, vertical ? 3 : w - 6, vertical ? h - 6 : 3, 0x6d5741, -874);
      } else {
        // boca de riego
        img(2, 3, 7, 9, 0x05060a, -876, 0.35);
        img(0, 0, 6, 8, 0xa8442f, -875);
        img(0, -3, 8, 2, 0x8a3526, -874);
      }
      puestos++;
    }
    return puestos;
  },

  drawStreetLights() {
    // las farolas van en la ACERA, al borde de la calzada. La calle mide 5
    // casillas (160 px), asi que el poste se planta algo mas alla del borde.
    const BORDE = 104;
    const puntos = [];

    // Dos por tramo y alternando la acera, en vez de tres a cada lado. Antes
    // eran 310 farolas identicas y alineadas: conduciendo se veian veinte a
    // la vez, como los dientes de un peine.
    // Con la ciudad grande los tramos van de cruce a cruce o son trocitos
    // de curva: se reparten por DISTANCIA (una cada ~330 px de calle) y nunca
    // dos a menos de 240 px, en vez de dos fijas por tramo.
    let turno = 0;
    const SEP = 330;
    const cubos = new Map();
    const hayCerca = (x, y) => {
      const cx = Math.floor(x / 256); const cy = Math.floor(y / 256);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        for (const p of cubos.get(`${cx + dx},${cy + dy}`) || []) if (Math.hypot(p.x - x, p.y - y) < 240) return true;
      }
      return false;
    };
    const apuntar = (p) => {
      const k = `${Math.floor(p.x / 256)},${Math.floor(p.y / 256)}`;
      if (!cubos.has(k)) cubos.set(k, []);
      cubos.get(k).push(p);
    };
    for (const e of this.net.edges) {
      if (e.from > e.to) continue;
      const n = Math.max(1, Math.round(e.length / SEP));
      const ts = this.map.graph
        ? Array.from({ length: n }, (_, i) => (i + 0.5) / n)
        : [0.3, 0.72];
      for (const t of ts) {
        const lane = this.net.pointAlong(e, t);
        // pointAlong da el punto del CARRIL; hay que volver al eje de la calle
        const cx = lane.x - e.rx * LANE_OFFSET;
        const cy = lane.y - e.ry * LANE_OFFSET;
        const preferido = turno++ % 2 === 0 ? -1 : 1;
        for (const lado of [preferido, -preferido]) {
          const x = cx + e.rx * BORDE * lado;
          const y = cy + e.ry * BORDE * lado;
          if (this.map.isRoadPoint(x, y)) continue;
          if (this.map.isSolidPoint(x, y)) continue;
          // ni el poste ni la punta del brazo pueden quedar sobre la calzada:
          // ahi es donde estorbaban a los coches
          const haciaCalle = Math.atan2(-e.ry * lado, -e.rx * lado);
          const puntaX = x + Math.cos(haciaCalle) * 17;
          const puntaY = y + Math.sin(haciaCalle) * 17;
          if (this.map.isRoadPoint(puntaX, puntaY)) continue;
          if (hayCerca(x, y)) break;
          const p = { x, y, haciaCalle };
          apuntar(p);
          puntos.push(p);
          break; // una por posicion: si cabe en la acera preferida, ahi se queda
        }
      }
    }

    // un poco de variedad en el charco de luz, que no parezcan clonadas
    this.lamps = puntos.map(
      (p) => new StreetLamp(this, p.x, p.y, p.haciaCalle, 0.82 + Math.random() * 0.42)
    );
  },
};
