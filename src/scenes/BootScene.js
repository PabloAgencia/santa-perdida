import { T } from '../config/city.js';
import { TILE } from '../config/balance.js';
import { VEHICLES, GLASS } from '../config/vehicles.js';
import { shade } from '../core/color.js';
import { FACTIONS } from '../config/factions.js';

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
    this.makeGangs();
    this.makeProps();
    this.scene.start('CityScene');
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
    const g = this.g();
    const s = 28;
    // contorno oscuro primero: el suelo es oscuro y sin borde no se lee
    g.fillStyle(0x0a0c10, 1);
    g.fillRoundedRect(4, 5, 19, 18, 6);
    g.fillStyle(0xa8552f, 1);
    g.fillRoundedRect(5, 6, 17, 16, 5);
    g.fillStyle(0xc16a3c, 1);
    g.fillRoundedRect(6, 8, 12, 12, 4);
    // cremallera y cuello, para que la chaqueta se lea como prenda
    g.fillStyle(0x7d3d20, 1);
    g.fillRect(6, 13, 12, 1.6);
    g.fillStyle(0x8a4526, 1);
    g.fillRect(15, 8, 3, 12);
    // hombros
    g.fillStyle(0x7d3d20, 1);
    g.fillRect(8, 5, 6, 2.4);
    g.fillRect(8, 20.6, 6, 2.4);
    g.fillStyle(0x0a0c10, 1);
    g.fillCircle(19, 14, 5.6);
    g.fillStyle(0xd8b48c, 1);
    g.fillCircle(19, 14, 4.4);
    g.fillStyle(0x2b2118, 1);
    g.fillCircle(17.4, 14, 3.4);
    g.generateTexture('player', s, s);
    g.destroy();
  }

  makePedestrians() {
    const jackets = [
      0x4a5a6b, 0x6b5a3d, 0x5d4a5a, 0x3f5a48, 0x7a4a3d, 0x39414f,
      0x6d6a5c, 0x8a7a4a, 0x4f3f3a, 0x5a6b5e, 0x7d6b7a, 0x2f3a45,
    ];
    const skins = [0xc9a882, 0x8c6a4a, 0xd8b48c, 0xa07b55, 0x6f5136, 0xe0c19c];
    const hairs = [0x241c14, 0x3d2a18, 0x6b6257, 0x14100c, 0x8a7a5c, 0x4a2c1e];

    jackets.forEach((jacket, i) => {
      const g = this.g();
      const s = 24;
      const skin = skins[i % skins.length];
      const hair = hairs[(i * 2 + 1) % hairs.length];
      const ancho = i % 3 === 0 ? 14 : i % 3 === 1 ? 13 : 12;

      g.fillStyle(0x0a0c10, 1);
      g.fillRoundedRect(4, 5, ancho + 2, 15, 5);
      g.fillStyle(jacket, 1);
      g.fillRoundedRect(5, 6, ancho, 13, 4);
      g.fillStyle(shade(jacket, 1.28), 1);
      g.fillRoundedRect(6, 8, ancho - 4, 9, 3);
      // los brazos marcan la silueta y hacen que se lea el sentido de la marcha
      g.fillStyle(shade(jacket, 0.72), 1);
      g.fillRect(8, 5, 4, 2);
      g.fillRect(8, 18, 4, 2);
      g.fillStyle(0x0a0c10, 1);
      g.fillCircle(16, 12, 4.6);
      g.fillStyle(skin, 1);
      g.fillCircle(16, 12, 3.6);
      g.fillStyle(hair, 1);
      g.fillCircle(14.8, 12, 2.9);
      g.generateTexture(`ped-${i}`, s, s);
      g.destroy();
    });
  }

  makeGangs() {
    for (const f of Object.values(FACTIONS)) {
      const g = this.g();
      const s = 24;
      g.fillStyle(0x0a0c10, 1);
      g.fillRoundedRect(4, 5, 15, 15, 5);
      g.fillStyle(f.color, 1);
      g.fillRoundedRect(5, 6, 13, 13, 4);
      g.fillStyle(f.accent, 1);
      g.fillRoundedRect(6, 8, 9, 9, 3);
      // panuelo del color de la banda, para reconocerles de un vistazo
      g.fillStyle(f.accent, 1);
      g.fillRect(12, 6, 3, 13);
      g.fillStyle(0x0a0c10, 1);
      g.fillCircle(16, 12, 4.6);
      g.fillStyle(0xb08560, 1);
      g.fillCircle(16, 12, 3.6);
      g.fillStyle(0x1e1812, 1);
      g.fillCircle(14.8, 12, 2.9);
      g.generateTexture(`gang-${f.key}`, s, s);
      g.destroy();
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
