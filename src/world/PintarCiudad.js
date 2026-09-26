import { CITY, T } from '../config/city.js';
import { TILE } from '../config/balance.js';
import { FACTIONS, ZONE_OWNER } from '../config/factions.js';
import { shade } from '../core/color.js';
import { StreetLamp } from '../entities/StreetLamp.js';
import { LANE_OFFSET } from './RoadNetwork.js';

// lado de la zona de dibujo, en pixeles
const ZONA_DIBUJO = 2048;

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

  // enciende solo las zonas que se ven, con un margen de una zona
  actualizarCapas() {
    if (!this.capas) return;
    const v = this.cameras.main.worldView;
    const x0 = Math.floor(v.x / ZONA_DIBUJO) - 1;
    const x1 = Math.floor(v.right / ZONA_DIBUJO) + 1;
    const y0 = Math.floor(v.y / ZONA_DIBUJO) - 1;
    const y1 = Math.floor(v.bottom / ZONA_DIBUJO) + 1;
    for (const g of this.capas.values()) {
      g.setVisible(g.zonaX >= x0 && g.zonaX <= x1 && g.zonaY >= y0 && g.zonaY <= y1);
    }
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
  },

  // los pasos de peatones se pintan donde el mapa dice que estan, asi que lo
  // que ves es exactamente por donde cruza la gente
  // Los pasos de peatones se pintan donde el mapa dice que estan, asi que lo
  // que ves es exactamente por donde cruza la gente. Van en dos BLITTERS (uno
  // por orientacion): con la ciudad grande eran casi cuatro mil imagenes
  // sueltas, y un blitter pinta miles de copias de la misma textura como si
  // fuera un solo objeto.
  drawCrosswalks() {
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
        this.add.image(b.px, b.py, claveTecho)
          .setDisplaySize(b.pw, b.ph).setDepth(-1200);
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
      if (L.type === 'plaza') {
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
        const light = this.add.circle(L.px, L.py, 9, 0xff4a3a).setDepth(-1180);
        this.tweens.add({
          targets: light, alpha: { from: 1, to: 0.15 },
          duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
      } else if (L.type === 'faro') {
        const glow = this.add.circle(L.tower.px, L.tower.py, 120, 0xe8d08a, 0.13).setDepth(-1230);
        this.tweens.add({
          targets: glow, scale: { from: 0.75, to: 1.25 }, alpha: { from: 0.2, to: 0.05 },
          duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
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

        const campoW = L.pw - 192;
        const campoH = L.ph - 192;
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
      }

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
    let turno = 0;
    for (const e of this.net.edges) {
      if (e.from > e.to) continue;
      for (const t of [0.3, 0.72]) {
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
          puntos.push({ x, y, haciaCalle });
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
