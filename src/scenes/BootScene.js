import { T } from '../config/city.js';
import { TILE } from '../config/balance.js';
import { VEHICLES, GLASS } from '../config/vehicles.js';
import { shade } from '../core/color.js';
import { FACTIONS } from '../config/factions.js';
import { makeWalkFrames } from '../world/personArt.js';

// Todo el arte se dibuja por codigo. Asi no hay ficheros sueltos que se
// desparejen y toda la ciudad comparte la misma direccion artistica.

let seed = 1337;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.makePixel();
    this.makeTileset();
    this.makeVehicles();
    this.makePlayer();
    this.makePedestrians();
    this.makeOfficer();
    this.makeGangs();
    this.makeProps();
    this.scene.start('MenuScene');
  }

  g() {
    return this.make.graphics({ x: 0, y: 0, add: false });
  }

  makePixel() {
    const g = this.g();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('px', 1, 1);
    g.destroy();
  }

  speckle(g, ox, oy, color, count, alpha = 0.5) {
    g.fillStyle(color, alpha);
    for (let i = 0; i < count; i++) {
      const x = ox + Math.floor(rnd() * TILE);
      const y = oy + Math.floor(rnd() * TILE);
      g.fillRect(x, y, 1 + Math.floor(rnd() * 2), 1);
    }
  }

  makeTileset() {
    const count = 9;
    const g = this.g();
    seed = 1337;

    const base = (i, color) => {
      g.fillStyle(color, 1);
      g.fillRect(i * TILE, 0, TILE, TILE);
    };

    // 0 asfalto
    base(T.ROAD, 0x25272d);
    this.speckle(g, T.ROAD * TILE, 0, 0x2e3138, 26);

    // 1 asfalto con linea central horizontal
    base(T.LINE_H, 0x25272d);
    this.speckle(g, T.LINE_H * TILE, 0, 0x2e3138, 20);
    g.fillStyle(0x9a8c4a, 0.85);
    g.fillRect(T.LINE_H * TILE + 4, 15, 16, 2);

    // 2 asfalto con linea central vertical
    base(T.LINE_V, 0x25272d);
    this.speckle(g, T.LINE_V * TILE, 0, 0x2e3138, 20);
    g.fillStyle(0x9a8c4a, 0.85);
    g.fillRect(T.LINE_V * TILE + 15, 4, 2, 16);

    // 3 acera
    base(T.SIDEWALK, 0x3c3f46);
    g.lineStyle(1, 0x34373d, 0.9);
    g.strokeRect(T.SIDEWALK * TILE + 0.5, 0.5, TILE - 1, TILE - 1);
    g.strokeRect(T.SIDEWALK * TILE + 0.5, 0.5, TILE - 1, (TILE - 1) / 2);
    this.speckle(g, T.SIDEWALK * TILE, 0, 0x45484f, 14, 0.4);

    // 4 hierba seca
    base(T.GRASS, 0x2f3a2c);
    this.speckle(g, T.GRASS * TILE, 0, 0x3a4636, 30, 0.6);
    this.speckle(g, T.GRASS * TILE, 0, 0x27301f, 18, 0.5);

    // 5 arena
    base(T.SAND, 0x5a5142);
    this.speckle(g, T.SAND * TILE, 0, 0x665c4b, 26, 0.5);
    this.speckle(g, T.SAND * TILE, 0, 0x4d4537, 16, 0.5);

    // 6 agua
    base(T.WATER, 0x16303d);
    g.fillStyle(0x1d3d4d, 0.7);
    for (let i = 0; i < 4; i++) {
      const y = 4 + i * 8 + Math.floor(rnd() * 3);
      const x = T.WATER * TILE + Math.floor(rnd() * 12);
      g.fillRect(x, y, 10 + Math.floor(rnd() * 10), 1);
    }

    // 7 muelle de madera
    base(T.DOCK, 0x4a3f31);
    g.fillStyle(0x3c3328, 1);
    for (let i = 0; i < 4; i++) g.fillRect(T.DOCK * TILE, i * 8 + 7, TILE, 1);
    this.speckle(g, T.DOCK * TILE, 0, 0x554839, 14, 0.5);

    // 8 pavimento interior de manzana
    base(T.ALLEY, 0x33363c);
    this.speckle(g, T.ALLEY * TILE, 0, 0x3a3e45, 18, 0.5);

    g.generateTexture('tiles', count * TILE, TILE);
    g.destroy();
  }

  makeVehicles() {
    for (const [key, v] of Object.entries(VEHICLES)) {
      v.palette.forEach((bodyColor, i) => {
        const g = this.g();
        this.drawVehicle(g, v, bodyColor);
        g.generateTexture(`veh-${key}-${i}`, v.length, v.width);
        g.destroy();
      });
    }
  }

  drawVehicle(g, v, body) {
    const w = v.length;
    const h = v.width;
    const roof = shade(body, 0.58);
    const trim = shade(body, 1.25);

    const wheels = (positions) => {
      g.fillStyle(0x121418, 1);
      for (const p of positions) g.fillRect(w * p, 0, w * 0.16, h);
    };

    if (v.clase === 'moto') {
      g.fillStyle(0x121418, 1);
      g.fillRect(w * 0.04, h * 0.26, w * 0.18, h * 0.48);
      g.fillRect(w * 0.78, h * 0.26, w * 0.18, h * 0.48);
      g.fillStyle(body, 1);
      g.fillRoundedRect(w * 0.16, h * 0.22, w * 0.66, h * 0.56, 3);
      g.fillStyle(roof, 1);
      g.fillRoundedRect(w * 0.32, h * 0.06, w * 0.3, h * 0.88, 2);
      g.fillStyle(trim, 1);
      g.fillRect(w * 0.62, h * 0.3, w * 0.12, h * 0.4);
      g.fillStyle(0xe8d9b5, 1);
      g.fillRect(w * 0.93, h * 0.38, 2, h * 0.24);
      return;
    }

    if (v.clase === 'furgoneta') {
      wheels([0.1, 0.72]);
      g.fillStyle(body, 1);
      g.fillRoundedRect(0, h * 0.08, w, h * 0.84, 3);
      g.fillStyle(roof, 1);
      g.fillRect(w * 0.06, h * 0.14, w * 0.5, h * 0.72);
      g.fillStyle(shade(body, 0.8), 1);
      g.fillRect(w * 0.3, h * 0.14, w * 0.02, h * 0.72);
      g.fillStyle(GLASS, 0.92);
      g.fillRect(w * 0.84, h * 0.16, w * 0.1, h * 0.68);
      g.fillStyle(0xf2e4bd, 0.95);
      g.fillRect(w * 0.965, h * 0.14, w * 0.025, h * 0.18);
      g.fillRect(w * 0.965, h * 0.68, w * 0.025, h * 0.18);
      return;
    }

    if (v.clase === 'rapido') {
      wheels([0.12, 0.7]);
      g.fillStyle(body, 1);
      g.beginPath();
      g.moveTo(w, h * 0.5);
      g.lineTo(w * 0.82, h * 0.08);
      g.lineTo(w * 0.1, h * 0.12);
      g.lineTo(w * 0.02, h * 0.5);
      g.lineTo(w * 0.1, h * 0.88);
      g.lineTo(w * 0.82, h * 0.92);
      g.closePath();
      g.fillPath();
      g.fillStyle(roof, 1);
      g.fillRoundedRect(w * 0.28, h * 0.18, w * 0.4, h * 0.64, 3);
      g.fillStyle(GLASS, 0.92);
      g.fillRect(w * 0.66, h * 0.24, w * 0.08, h * 0.52);
      g.fillStyle(trim, 1);
      g.fillRect(w * 0.04, h * 0.06, w * 0.06, h * 0.88);
      g.fillStyle(0xf2e4bd, 0.95);
      g.fillRect(w * 0.92, h * 0.22, w * 0.04, h * 0.14);
      g.fillRect(w * 0.92, h * 0.64, w * 0.04, h * 0.14);
      return;
    }

    if (v.clase === 'policia') {
      wheels([0.13, 0.7]);
      g.fillStyle(body, 1);
      g.fillRoundedRect(w * 0.02, h * 0.09, w * 0.96, h * 0.82, 3);
      g.fillStyle(shade(body, body > 0x808080 ? 0.35 : 2.4), 1);
      g.fillRect(w * 0.3, h * 0.09, w * 0.26, h * 0.82);
      g.fillStyle(roof, 1);
      g.fillRoundedRect(w * 0.26, h * 0.16, w * 0.44, h * 0.68, 3);
      g.fillStyle(GLASS, 0.92);
      g.fillRect(w * 0.66, h * 0.2, w * 0.09, h * 0.6);
      g.fillRect(w * 0.23, h * 0.22, w * 0.06, h * 0.56);
      // barra de luces
      g.fillStyle(0x1b1e24, 1);
      g.fillRect(w * 0.44, h * 0.06, w * 0.09, h * 0.88);
      g.fillStyle(0xd94438, 1);
      g.fillRect(w * 0.45, h * 0.09, w * 0.07, h * 0.36);
      g.fillStyle(0x3f7fd9, 1);
      g.fillRect(w * 0.45, h * 0.55, w * 0.07, h * 0.36);
      g.fillStyle(0xf2e4bd, 0.95);
      g.fillRect(w * 0.96, h * 0.16, w * 0.025, h * 0.18);
      g.fillRect(w * 0.96, h * 0.66, w * 0.025, h * 0.18);
      return;
    }

    if (v.clase === 'resistente') {
      wheels([0.13, 0.71]);
      g.fillStyle(body, 1);
      g.fillRoundedRect(w * 0.02, h * 0.06, w * 0.96, h * 0.88, 2);
      g.fillStyle(shade(body, 0.75), 1);
      g.fillRect(w * 0.9, h * 0.02, w * 0.08, h * 0.96);
      g.fillStyle(roof, 1);
      g.fillRect(w * 0.24, h * 0.14, w * 0.46, h * 0.72);
      g.fillStyle(GLASS, 0.92);
      g.fillRect(w * 0.72, h * 0.18, w * 0.1, h * 0.64);
      g.fillRect(w * 0.2, h * 0.2, w * 0.05, h * 0.6);
      g.fillStyle(0xf2e4bd, 0.95);
      g.fillRect(w * 0.985, h * 0.16, w * 0.02, h * 0.18);
      g.fillRect(w * 0.985, h * 0.66, w * 0.02, h * 0.18);
      return;
    }

    // barato
    wheels([0.14, 0.68]);
    g.fillStyle(body, 1);
    g.fillRoundedRect(w * 0.03, h * 0.11, w * 0.94, h * 0.78, Math.min(5, h * 0.3));
    g.fillStyle(roof, 1);
    g.fillRoundedRect(w * 0.26, h * 0.16, w * 0.44, h * 0.68, 3);
    g.fillStyle(GLASS, 0.92);
    g.fillRect(w * 0.64, h * 0.22, w * 0.09, h * 0.56);
    g.fillRect(w * 0.23, h * 0.24, w * 0.06, h * 0.52);
    g.fillStyle(0xf2e4bd, 0.95);
    g.fillRect(w * 0.95, h * 0.18, w * 0.03, h * 0.16);
    g.fillRect(w * 0.95, h * 0.66, w * 0.03, h * 0.16);
    g.fillStyle(0x8c2b22, 0.9);
    g.fillRect(w * 0.02, h * 0.2, w * 0.025, h * 0.14);
    g.fillRect(w * 0.02, h * 0.66, w * 0.025, h * 0.14);
  }

  makePlayer() {
    makeWalkFrames(this, 'player', {
      chaqueta: 0xa8552f,
      piel: 0xd8b48c,
      pelo: 0x2b2118,
      detalle: 0x7d3d20,
      ancho: 15,
      largo: 16,
    }, 32);
  }

  makePedestrians() {
    const jackets = [
      0x4a5a6b, 0x6b5a3d, 0x5d4a5a, 0x3f5a48, 0x7a4a3d, 0x39414f,
      0x6d6a5c, 0x8a7a4a, 0x4f3f3a, 0x5a6b5e, 0x7d6b7a, 0x2f3a45,
    ];
    const skins = [0xc9a882, 0x8c6a4a, 0xd8b48c, 0xa07b55, 0x6f5136, 0xe0c19c];
    const hairs = [0x241c14, 0x3d2a18, 0x6b6257, 0x14100c, 0x8a7a5c, 0x4a2c1e];

    jackets.forEach((chaqueta, i) => {
      makeWalkFrames(this, `ped-${i}`, {
        chaqueta,
        piel: skins[i % skins.length],
        pelo: hairs[(i * 2 + 1) % hairs.length],
        ancho: 12 + (i % 3),
        largo: 13 + (i % 2),
      });
    });
  }

  makeOfficer() {
    makeWalkFrames(this, 'officer', {
      chaqueta: 0x2b3a52,
      piel: 0xc9a882,
      pelo: 0x1b2436,
      detalle: 0xd8d3c4,
      ancho: 13,
      largo: 14,
    });
  }

  makeGangs() {
    for (const f of Object.values(FACTIONS)) {
      makeWalkFrames(this, `gang-${f.key}`, {
        chaqueta: f.color,
        piel: 0xb08560,
        pelo: 0x1e1812,
        detalle: f.accent,
        ancho: 13,
        largo: 14,
      });
    }
  }

  makeProps() {
    // sombra ovalada
    const s = this.g();
    s.fillStyle(0x000000, 0.35);
    s.fillEllipse(16, 8, 30, 14);
    s.generateTexture('shadow', 32, 16);
    s.destroy();

    // caja de reparto
    const c = this.g();
    c.fillStyle(0x6b563a, 1);
    c.fillRoundedRect(0, 0, 18, 18, 2);
    c.fillStyle(0x846c4a, 1);
    c.fillRoundedRect(1, 1, 16, 16, 2);
    c.fillStyle(0x5a4830, 1);
    c.fillRect(0, 8, 18, 2);
    c.fillRect(8, 0, 2, 18);
    c.generateTexture('crate', 18, 18);
    c.destroy();

    // haz de luz: un cono degradado que se pega al morro del coche
    const beam = this.make.graphics({ x: 0, y: 0, add: false });
    const pasos = 26;
    for (let i = 0; i < pasos; i++) {
      const t = i / pasos;
      const ancho = 14 + t * 104;
      const alpha = 0.5 * (1 - t) * (1 - t);
      beam.fillStyle(0xffdc92, alpha);
      beam.fillRect(128 - ancho / 2, t * 190, ancho, 190 / pasos + 1);
    }
    beam.generateTexture('beam', 256, 200);
    beam.destroy();

    // farola: charco de luz. Muchos pasos y muy poca opacidad en cada uno,
    // si no se ven los anillos y parece niebla en vez de luz.
    const lamp = this.g();
    const capas = 48;
    for (let i = capas; i >= 1; i--) {
      const t = i / capas;
      lamp.fillStyle(0xffe6a8, 0.014 * (1 - t) * (1 - t) * 3.2);
      lamp.fillCircle(64, 64, t * 62);
    }
    lamp.fillStyle(0xfff3d0, 0.1);
    lamp.fillCircle(64, 64, 5);
    lamp.generateTexture('lamp', 128, 128);
    lamp.destroy();

    // paso de cebra: franjas paralelas a la marcha de los coches, como en la
    // calle. Una casilla entera, para poder sembrarlas por la rejilla.
    for (const [nombre, horizontal] of [['cebra-h', true], ['cebra-v', false]]) {
      const z = this.g();
      z.fillStyle(0xe8e4d8, 1);
      for (let i = 0; i < 2; i++) {
        if (horizontal) z.fillRect(0, 5 + i * 15, TILE, 8);
        else z.fillRect(5 + i * 15, 0, 8, TILE);
      }
      z.generateTexture(nombre, TILE, TILE);
      z.destroy();
    }

    // destello de la sirena
    const l = this.g();
    l.fillStyle(0xffffff, 0.9);
    l.fillCircle(16, 16, 7);
    l.fillStyle(0xffffff, 0.35);
    l.fillCircle(16, 16, 15);
    l.generateTexture('siren', 32, 32);
    l.destroy();

    // anillo de objetivo
    const r = this.g();
    r.lineStyle(3, 0xe8b54a, 1);
    r.strokeCircle(32, 32, 26);
    r.lineStyle(1, 0xe8b54a, 0.45);
    r.strokeCircle(32, 32, 20);
    r.generateTexture('ring', 64, 64);
    r.destroy();

    // flecha indicadora
    const a = this.g();
    a.fillStyle(0xe8b54a, 1);
    a.beginPath();
    a.moveTo(18, 2);
    a.lineTo(32, 26);
    a.lineTo(18, 19);
    a.lineTo(4, 26);
    a.closePath();
    a.fillPath();
    a.generateTexture('arrow', 36, 30);
    a.destroy();
  }
}
