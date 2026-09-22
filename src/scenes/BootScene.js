import { T } from '../config/city.js';
import { TILE } from '../config/balance.js';
import { VEHICLES, GLASS } from '../config/vehicles.js';
import { shade } from '../core/color.js';
import { FACTIONS } from '../config/factions.js';
import { makeWalkFrames } from '../world/personArt.js';
import { ROPA, LIENZO, CUERPO, anchoDelCuerpo } from '../config/aspecto.js';
import { VERSION } from '../config/version.js';

// la version, en una pieza que valga para pegar a una direccion
const SELLO = VERSION.replace(/[^0-9a-z]/gi, '');

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

  // Las imagenes preparadas (sprites/listos) se cargan DESPUES de dibujar
  // todo y sustituyen al dibujo. Antes se pedian a mitad de la carga inicial
  // y el juego arrancaba sin esperarlas: cargaban las primeras y las ultimas
  // se quedaban fuera, asi que unos coches salian con foto y otros no.
  init() {
    // LAS LISTAS SE PIDEN SIN CACHE, Y CON LA VERSION PEGADA.
    //
    // Esto costo una tarde entera: Pablo no veia la portada y yo la veia. La
    // lista de arte es un fichero diminuto que el navegador se guarda, y si
    // la guardo cuando la portada todavia no existia, se queda con la lista
    // vacia y el juego no pide la imagen NUNCA, por muchas veces que
    // recargues. Con `?v=` cambiando en cada version y `no-cache`, una lista
    // vieja no puede sobrevivir a una actualizacion.
    const sinCache = { cache: 'no-cache' };
    this.listaSprites = fetch(`sprites/listos/lista.json?v=${SELLO}`, sinCache)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    // arte suelto que no es un sprite del juego (la portada del menu). Va
    // aparte porque no pasa por preparar-sprites.py: es una ilustracion
    // entera, no una figura recortada sobre magenta.
    this.listaArte = fetch(`arte/lista.json?v=${SELLO}`, sinCache)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
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
    this.cargarImagenes();
  }

  cargarImagenes() {
    Promise.all([this.listaSprites, this.listaArte]).then(([lista, arte]) => {
      for (const nombre of lista || []) {
        const clave = nombre.replace(/\.png$/i, '');
        // la imagen manda: se quita el dibujo para que entre en su sitio
        if (this.textures.exists(clave)) this.textures.remove(clave);
        this.load.image(clave, `sprites/listos/${nombre}`);
      }
      for (const nombre of arte || []) {
        const clave = nombre.replace(/\.(png|jpg|jpeg|webp)$/i, '');
        if (this.textures.exists(clave)) this.textures.remove(clave);
        // la version pegada tambien aqui: si mañana cambia la portada, el
        // navegador no puede servir la de ayer
        this.load.image(clave, `arte/${nombre}?v=${SELLO}`);
      }
      // sin nada que bajar, el cargador no llega a emitir 'complete' nunca y
      // el juego se quedaba clavado en la pantalla negra
      if (this.load.list.size === 0) {
        this.scene.start('MenuScene');
        return;
      }
      this.load.once('complete', () => this.scene.start('MenuScene'));
      this.load.on('loaderror', (f) => console.warn('sprite que falla:', f.key));
      this.load.start();
    });
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
        // si la imagen preparada ya esta cargada, esa manda
        if (this.textures.exists(`veh-${key}-${i}`)) return;
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

  // El cuerpo del jugador cambia durante la partida (engorda, se pone cachas),
  // asi que su aspecto vive en config/aspecto.js y Player lo redibuja cuando
  // hace falta. Esto es solo el de arranque.
  makePlayer() {
    const ropa = ROPA.calle;
    this.dibujar('player', {
      chaqueta: ropa.chaqueta,
      piel: ropa.piel,
      pelo: ropa.pelo,
      detalle: ropa.detalle,
      ancho: anchoDelCuerpo(25, 20),
      largo: CUERPO.largo,
    }, LIENZO);
  }

  // Los iconos de la esquina: el arma que llevas en la mano, el corazon de la
  // salud y el escudo del chaleco. Se dibujan grandes (40 px) y con borde
  // oscuro para que se lean encima de cualquier calle.
  // Los iconos dibujados aqui son el respaldo: si hay imagen cargada con esa
  // misma clave, se deja la imagen y no se dibuja nada.
  iconoAMano(clave, dibujar) {
    if (this.textures.exists(clave)) return;
    dibujar();
  }

  makeIconosDeHud() {
    const ACERO = 0x9aa3ad;
    const OSCURO = 0x14161a;
    const MADERA = 0xa9793f;
    const PIEL = 0xd8b48c;

    // el puño: visto de lado, con los nudillos marcados
    if (!this.textures.exists('icono-puno')) {
      const puno = this.g();
      puno.fillStyle(OSCURO, 1);
      puno.fillRoundedRect(7, 9, 26, 22, 6);
      puno.fillStyle(PIEL, 1);
      puno.fillRoundedRect(9, 11, 22, 18, 5);
      puno.fillStyle(0xb8916b, 1);
      for (let i = 0; i < 4; i++) puno.fillRect(11 + i * 5, 12, 3, 6);
      puno.fillStyle(PIEL, 1);
      puno.fillRoundedRect(26, 15, 8, 11, 3);   // el pulgar
      puno.generateTexture('icono-puno', 40, 40);
      puno.destroy();
    }

    // El puño americano: el mismo puño pero con cuatro anillas de metal en
    // los nudillos. Se distingue del puño a pelo de un vistazo, que es lo
    // unico que tiene que conseguir un icono de 40 px.
    if (!this.textures.exists('icono-americano')) {
      const am = this.g();
      am.fillStyle(OSCURO, 1);
      am.fillRoundedRect(7, 9, 26, 22, 6);
      am.fillStyle(PIEL, 1);
      am.fillRoundedRect(9, 11, 22, 18, 5);
      // la barra de metal que cruza los nudillos
      am.fillStyle(0x6e7480, 1);
      am.fillRoundedRect(9, 10, 22, 9, 3);
      am.fillStyle(0xb9c0cc, 1);
      for (let i = 0; i < 4; i++) am.fillCircle(12.5 + i * 5.4, 14.5, 2.6);
      am.fillStyle(0x8a919c, 1);
      for (let i = 0; i < 4; i++) am.fillCircle(12.5 + i * 5.4, 15.4, 1.5);
      am.fillStyle(PIEL, 1);
      am.fillRoundedRect(26, 17, 8, 10, 3);   // el pulgar
      am.generateTexture('icono-americano', 40, 40);
      am.destroy();
    }

    // el bate, en diagonal: tumbado se perdia en la esquina del icono
    if (!this.textures.exists('icono-bate')) {
      const bate = this.g();
      bate.translateCanvas(20, 20);
      bate.rotateCanvas(-Math.PI / 4);
      bate.fillStyle(OSCURO, 1);
      bate.fillRoundedRect(-17, -6, 34, 12, 5);
      bate.fillStyle(MADERA, 1);
      bate.fillRoundedRect(-4, -4, 20, 8, 4);    // la pala
      bate.fillStyle(0x6b4a28, 1);
      bate.fillRoundedRect(-15, -3, 12, 6, 3);   // el mango
      bate.fillStyle(0xc99a5e, 1);
      bate.fillRect(2, -2, 12, 2);               // brillo de la madera
      bate.generateTexture('icono-bate', 40, 40);
      bate.destroy();
    }

    // La pistola mira a la derecha, con la empuñadura inclinada hacia atras:
    // de perfil plano parecia un martillo.
    if (!this.textures.exists('icono-pistola')) {
      const pis = this.g();
      pis.fillStyle(OSCURO, 1);
      pis.fillRect(4, 12, 32, 11);                       // contorno de la corredera
      pis.fillTriangle(10, 21, 23, 21, 17, 36);          // contorno de la culata
      pis.fillStyle(ACERO, 1);
      pis.fillRect(6, 14, 28, 5);                        // corredera
      pis.fillStyle(0x6f7681, 1);
      pis.fillRect(6, 19, 21, 3);                        // armazon
      pis.fillStyle(0x4a5058, 1);
      pis.fillTriangle(12, 22, 21, 22, 16, 34);          // cachas
      pis.fillStyle(0x2a2f36, 1);
      pis.fillRect(13, 24, 6, 8);                        // textura de las cachas
      pis.fillStyle(OSCURO, 1);
      pis.fillRect(21, 21, 3, 5);                        // guardamonte
      pis.fillStyle(0xc8ced6, 1);
      pis.fillRect(31, 14, 3, 2);                        // punto de mira
      pis.generateTexture('icono-pistola', 40, 40);
      pis.destroy();
    }

    if (!this.textures.exists('icono-escopeta')) {
      const esc = this.g();
      esc.fillStyle(OSCURO, 1);
      esc.fillRect(3, 15, 34, 8);
      esc.fillRect(9, 21, 8, 12);
      esc.fillStyle(ACERO, 1);
      esc.fillRect(4, 16, 32, 4);               // los dos cañones
      esc.fillStyle(0x3a4047, 1);
      esc.fillRect(4, 20, 24, 2);
      esc.fillStyle(MADERA, 1);
      esc.fillRect(10, 22, 6, 10);              // culata de madera
      esc.fillRect(24, 19, 9, 4);
      esc.generateTexture('icono-escopeta', 40, 40);
      esc.destroy();
    }

    // el corazon de la barra de salud
    if (!this.textures.exists('hud-corazon')) {
      const cor = this.g();
      const corazon = (g, cx, cy, r, color) => {
      g.fillStyle(color, 1);
      g.fillCircle(cx - r * 0.45, cy - r * 0.25, r * 0.55);
      g.fillCircle(cx + r * 0.45, cy - r * 0.25, r * 0.55);
      g.fillTriangle(cx - r, cy, cx + r, cy, cx, cy + r * 1.05);
      };
      corazon(cor, 11, 10, 9.5, 0x3a0d10);
      corazon(cor, 11, 10, 7.6, 0xd9384a);
      corazon(cor, 10, 9, 3.4, 0xf49aa4);
      cor.generateTexture('hud-corazon', 22, 22);
      cor.destroy();
    }

    // el rifle de asalto: cargador curvo y cañon largo
    if (!this.textures.exists('icono-rifle')) {
      const rif = this.g();
      rif.fillStyle(OSCURO, 1);
      rif.fillRect(2, 14, 36, 8);
      rif.fillRect(12, 21, 8, 9);                // cargador
      rif.fillRect(24, 21, 7, 11);               // empuñadura
      rif.fillStyle(ACERO, 1);
      rif.fillRect(4, 15, 33, 4);
      rif.fillStyle(0x4a5058, 1);
      rif.fillRect(13, 22, 6, 8);
      rif.fillRect(25, 22, 5, 9);
      rif.fillStyle(0x2a2f36, 1);
      rif.fillRect(30, 13, 6, 3);                // culata
      rif.fillStyle(0xc8ced6, 1);
      rif.fillRect(3, 13, 3, 2);                 // punto de mira
      rif.generateTexture('icono-rifle', 40, 40);
      rif.destroy();
    }

    // el de mira: cañon larguisimo y visor encima
    if (!this.textures.exists('icono-sniper')) {
      const sni = this.g();
      sni.fillStyle(OSCURO, 1);
      sni.fillRect(1, 16, 38, 7);
      sni.fillRect(22, 22, 7, 12);               // empuñadura
      sni.fillRect(11, 9, 16, 6);                // visor
      sni.fillStyle(ACERO, 1);
      sni.fillRect(2, 17, 36, 3);
      sni.fillStyle(0x6f7681, 1);
      sni.fillRect(13, 10, 12, 4);
      sni.fillStyle(0x3a4047, 1);
      sni.fillRect(23, 23, 5, 10);
      sni.fillRect(29, 15, 9, 5);                // culata
      sni.fillStyle(0xc8ced6, 1);
      sni.fillRect(11, 11, 2, 2);                // lente
      sni.generateTexture('icono-sniper', 40, 40);
      sni.destroy();
    }

    // la estrella de la busca, de cinco puntas como las de siempre
    const est = this.g();
    const puntas = (g, cx, cy, fuera, dentro, color) => {
      const p = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? fuera : dentro;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        p.push(new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      g.fillStyle(color, 1);
      g.fillPoints(p, true);
    };
    puntas(est, 13, 13, 12.5, 5.4, 0x14161a);
    puntas(est, 13, 13, 10.5, 4.4, 0xffffff);
    est.generateTexture('estrella', 26, 26);
    est.destroy();

    // el escudo del chaleco
    if (!this.textures.exists('hud-escudo')) {
      const esd = this.g();
      esd.fillStyle(0x23272d, 1);
      esd.fillRoundedRect(2, 2, 18, 14, 3);
      esd.fillTriangle(2, 14, 20, 14, 11, 21);
      esd.fillStyle(0xbfc6d0, 1);
      esd.fillRoundedRect(4, 4, 14, 11, 2);
      esd.fillTriangle(4, 13, 18, 13, 11, 18);
      esd.fillStyle(0x7d848d, 1);
      esd.fillRect(10, 5, 2, 11);
      esd.generateTexture('hud-escudo', 22, 22);
      esd.destroy();
    }
  }

  makePedestrians() {
    const jackets = [
      0x4a5a6b, 0x6b5a3d, 0x5d4a5a, 0x3f5a48, 0x7a4a3d, 0x39414f,
      0x6d6a5c, 0x8a7a4a, 0x4f3f3a, 0x5a6b5e, 0x7d6b7a, 0x2f3a45,
    ];
    const skins = [0xc9a882, 0x8c6a4a, 0xd8b48c, 0xa07b55, 0x6f5136, 0xe0c19c];
    const hairs = [0x241c14, 0x3d2a18, 0x6b6257, 0x14100c, 0x8a7a5c, 0x4a2c1e];

    jackets.forEach((chaqueta, i) => {
      this.dibujar(`ped-${i}`, {
        chaqueta,
        piel: skins[i % skins.length],
        pelo: hairs[(i * 2 + 1) % hairs.length],
        ancho: 12 + (i % 3),
        largo: 13 + (i % 2),
      });
    });
  }

  // Si ya hay una imagen cargada con esa clave, se respeta y no se dibuja.
  dibujar(base, opciones) {
    if (this.textures.exists(`${base}-0`)) return;
    makeWalkFrames(this, base, opciones);
  }

  makeOfficer() {
    this.dibujar('officer', {
      chaqueta: 0x2b3a52,
      piel: 0xc9a882,
      pelo: 0x1b2436,
      detalle: 0xd8d3c4,
      ancho: 13,
      largo: 14,
    });

    // el de asalto: todo negro, casco en vez de pelo y mas ancho por el peto
    this.dibujar('swat', {
      chaqueta: 0x23262b,
      piel: 0x9b7a58,
      pelo: 0x14161a,
      detalle: 0x4a525c,
      ancho: 15,
      largo: 15,
    });
  }

  makeGangs() {
    for (const f of Object.values(FACTIONS)) {
      this.dibujar(`gang-${f.key}`, {
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

    // corazon de salud, de los que se cogen por la calle
    const cor = this.g();
    const dibujarCorazon = (g, cx, cy, r, color, alpha) => {
      g.fillStyle(color, alpha);
      g.fillCircle(cx - r * 0.45, cy - r * 0.25, r * 0.55);
      g.fillCircle(cx + r * 0.45, cy - r * 0.25, r * 0.55);
      g.fillTriangle(cx - r, cy, cx + r, cy, cx, cy + r * 1.05);
    };
    dibujarCorazon(cor, 14, 12, 10, 0x6e1512, 1);      // borde oscuro
    dibujarCorazon(cor, 14, 12, 8.4, 0xd9384a, 1);     // cuerpo
    dibujarCorazon(cor, 13, 11, 4.2, 0xf27a86, 0.85);  // brillo
    cor.generateTexture('corazon', 28, 28);
    cor.destroy();

    // maquina de refrescos: alta, con su cristal y su luz
    const maq = this.g();
    maq.fillStyle(0x1b1f25, 1);
    maq.fillRoundedRect(0, 0, 14, 20, 2);
    maq.fillStyle(0x2f6b7a, 1);
    maq.fillRect(2, 3, 10, 12);
    maq.fillStyle(0x8fd0e0, 0.75);
    maq.fillRect(3, 4, 4, 10);
    maq.fillStyle(0xe8b54a, 1);
    maq.fillRect(3, 16, 8, 2);
    maq.generateTexture('maquina', 14, 20);
    maq.destroy();

    // arma tirada en el suelo
    const arm = this.g();
    arm.fillStyle(0x1b1f25, 1);
    arm.fillRect(1, 5, 14, 4);
    arm.fillRect(3, 8, 4, 5);
    arm.fillStyle(0x4a4f57, 1);
    arm.fillRect(2, 6, 11, 2);
    arm.generateTexture('arma-suelo', 16, 14);
    arm.destroy();

    this.makeIconosDeHud();

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
