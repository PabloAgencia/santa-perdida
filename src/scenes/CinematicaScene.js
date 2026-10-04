import { Audio } from '../core/Audio.js';
import { PERSONAJES, COLOR_BANDA, sinTildes } from '../config/personajes.js';
import { GameState } from '../core/GameState.js';
import { texturaRetrato } from '../world/retratos.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';
const TEXTO = 'Georgia, "Times New Roman", serif';

// LAS CINEMATICAS (config/cinematicas.js): el prologo y lo que te cuentan
// antes de cada encargo, con aire de videojuego y no un cartel de texto.
//
//   · franjas negras arriba y abajo, como en el cine (y en los GTA)
//   · el decorado detras, con un movimiento lento de camara
//   · el retrato de quien habla, su nombre en la placa de su banda
//   · el texto se escribe letra a letra, con "pitidos" en el tono de cada
//     personaje (no hay voces grabadas: es lo que hacian los juegos de antes)
//
// ENTER, ESPACIO o clic: si la frase se esta escribiendo, se termina de
// golpe; si ya esta, la siguiente. ESC se salta la cinematica entera.
//
// Se lanza con CityScene.verCinematica(planos, alAcabar): la ciudad se queda
// en pausa debajo y al acabar se llama a `alAcabar`.
//
// Decorados y retratos: si hay imagen de IA (`cine-<fondo>`, `retrato-<id>`)
// manda ella; si no, se dibujan aqui por codigo. Asi la cinematica funciona
// hoy y mejora sola el dia que se generen las imagenes.

const W = 1280;
const H = 720;
const FRANJA = 78;
const LETRAS_POR_SEGUNDO = 48;

export class CinematicaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CinematicaScene', active: false });
  }

  create(datos) {
    this.planos = datos.planos || [];
    this.alAcabar = datos.alAcabar || null;
    this.indice = -1;
    this.fondoActual = null;
    this.capaFondo = null;
    this.acabando = false;

    this.add.image(0, 0, 'px').setOrigin(0, 0).setDisplaySize(W, H).setTint(0x05060a);
    this.raizFondo = this.add.container(0, 0).setDepth(0);

    // las franjas de cine
    this.add.image(0, 0, 'px').setOrigin(0, 0).setDisplaySize(W, FRANJA).setTint(0x000000).setDepth(50);
    this.add.image(0, H - FRANJA, 'px').setOrigin(0, 0).setDisplaySize(W, FRANJA).setTint(0x000000).setDepth(50);

    // la caja de dialogo: degradado oscuro sobre la franja de abajo
    this.sombraTexto = this.add.image(0, H - FRANJA - 150, 'px').setOrigin(0, 0)
      .setDisplaySize(W, 150).setTint(0x000000).setAlpha(0.55).setDepth(40);
    this.retrato = this.add.image(150, H - FRANJA - 20, 'px').setOrigin(0.5, 1).setDepth(60).setVisible(false);
    this.marcoRetrato = this.add.rectangle(150, H - FRANJA - 130, 196, 220).setStrokeStyle(3, 0xd4af37).setDepth(61).setVisible(false);
    this.placa = this.add.image(150, H - FRANJA - 14, 'px').setDisplaySize(210, 28).setDepth(62).setVisible(false);
    this.nombre = this.add.text(150, H - FRANJA - 14, '', {
      fontFamily: FONT, fontSize: '18px', color: '#f2efe6', stroke: '#05060a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(63);
    // el nombre de verdad, debajo del mote (Pablo: "que tengan su nombre")
    this.nombreReal = this.add.text(150, H - FRANJA + 14, '', {
      fontFamily: TEXTO, fontStyle: 'italic', fontSize: '16px', color: '#e8c860',
    }).setOrigin(0.5).setDepth(63);
    this.texto = this.add.text(290, H - FRANJA - 128, '', {
      fontFamily: TEXTO, fontSize: '25px', color: '#f2efe6', lineSpacing: 6,
      stroke: '#05060a', strokeThickness: 3, wordWrap: { width: W - 340 },
    }).setDepth(64);
    this.cartel = this.add.text(W / 2, H / 2 - 20, '', {
      fontFamily: FONT, fontSize: '84px', color: '#e8b54a', stroke: '#05060a', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(64);
    this.subCartel = this.add.text(W / 2, H / 2 + 52, '', {
      fontFamily: TEXTO, fontStyle: 'italic', fontSize: '26px', color: '#e6e1d4', stroke: '#05060a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(64);
    this.ayuda = this.add.text(W - 24, H - FRANJA / 2, 'ENTER seguir  ·  ESC saltar', {
      fontFamily: FONT, fontSize: '14px', color: '#8a8578',
    }).setOrigin(1, 0.5).setDepth(64);
    this.flecha = this.add.triangle(W - 60, H - FRANJA - 26, 0, 0, 16, 0, 8, 10, 0xe8b54a).setDepth(64).setVisible(false);
    this.tweens.add({ targets: this.flecha, y: this.flecha.y + 5, duration: 420, yoyo: true, repeat: -1 });

    this.teclas = this.input.keyboard.addKeys({ entrar: 'ENTER', espacio: 'SPACE', saltar: 'ESC', e: 'E' });
    this.input.keyboard.addCapture('ENTER,SPACE,ESC');
    this.input.on('pointerdown', () => this.avanzar());

    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.siguiente();
  }

  // ---- PLANOS ---------------------------------------------------------------

  siguiente() {
    this.indice++;
    if (this.indice >= this.planos.length) {
      this.acabar();
      return;
    }
    const p = this.planos[this.indice];
    if (p.fondo && p.fondo !== this.fondoActual) this.ponerFondo(p.fondo);
    // si la cinematica empieza sin decorado, el primero que aparezca en ella
    // (o la ciudad): nunca un fondo negro
    if (!this.fondoActual) this.ponerFondo((this.planos.find((q) => q.fondo) || {}).fondo || 'ciudad');

    this.cartel.setText('');
    this.subCartel.setText('');
    this.flecha.setVisible(false);

    if (p.titulo) {
      // EL CARTEL: sin caja de dialogo ni retrato
      this.mostrarDialogo(false);
      this.texto.setText('');
      this.cartel.setText(p.titulo).setAlpha(0).setScale(1.1);
      this.subCartel.setText(p.sub || '').setAlpha(0);
      this.tweens.add({ targets: this.cartel, alpha: 1, scale: 1, duration: 900, ease: 'Cubic.out' });
      this.tweens.add({ targets: this.subCartel, alpha: 1, duration: 900, delay: 500 });
      Audio.notes([196, 261.6, 329.6, 392], 0.22, 'triangle', 0.09);
      this.escribiendo = null;
      this.time.delayedCall(900, () => this.flecha.setVisible(true));
      return;
    }

    const quien = p.quien ? PERSONAJES[p.quien] : null;
    this.mostrarDialogo(true, quien, p.quien);
    // el narrador, en cursiva y centrado; los personajes, al lado del retrato
    if (quien) {
      this.texto.setPosition(290, H - FRANJA - 128).setFontStyle('normal').setOrigin(0, 0)
        .setWordWrapWidth(W - 340).setAlign('left');
    } else {
      this.texto.setPosition(W / 2, H - FRANJA - 120).setFontStyle('italic').setOrigin(0.5, 0)
        .setWordWrapWidth(W - 260).setAlign('center');
    }
    this.escribiendo = { completo: p.texto, letras: 0, t: 0, voz: quien ? quien.voz : null };
    this.texto.setText('');
  }

  mostrarDialogo(si, quien = null, id = null) {
    this.sombraTexto.setVisible(si);
    const conCara = si && !!quien;
    this.retrato.setVisible(conCara);
    this.marcoRetrato.setVisible(conCara);
    this.placa.setVisible(conCara);
    this.nombre.setText(conCara ? sinTildes(quien.alias).toUpperCase() : '');
    // si el mote ya es su nombre (Marina), no se repite
    this.nombreReal.setText(conCara && quien.alias !== quien.nombre.split(' ')[0] ? quien.nombre : '');
    // apuntado como conocido: sale en la pantalla de PERSONAJES (PauseScene)
    if (conCara) {
      GameState.flags.conocidos = GameState.flags.conocidos || {};
      GameState.flags.conocidos[id] = true;
    }
    if (!conCara) return;
    const clave = texturaRetrato(this, id);
    this.retrato.setTexture(clave).setDisplaySize(190, 214);
    this.placa.setTint(COLOR_BANDA[quien.banda] || 0x3a3d42);
    this.marcoRetrato.setStrokeStyle(3, COLOR_BANDA[quien.banda] || 0xd4af37);
    // una entrada suave cada vez que cambia quien habla
    if (this.ultimoQuien !== id) {
      this.retrato.setAlpha(0).setY(H - FRANJA - 10);
      this.tweens.add({ targets: this.retrato, alpha: 1, y: H - FRANJA - 20, duration: 220, ease: 'Sine.out' });
    }
    this.ultimoQuien = id;
  }

  avanzar() {
    if (this.acabando) return;
    if (this.escribiendo && this.escribiendo.letras < this.escribiendo.completo.length) {
      // terminar la frase de golpe
      this.escribiendo.letras = this.escribiendo.completo.length;
      this.texto.setText(this.escribiendo.completo);
      this.flecha.setVisible(true);
      return;
    }
    Audio.menuMove();
    this.siguiente();
  }

  acabar() {
    if (this.acabando) return;
    this.acabando = true;
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.time.delayedCall(470, () => {
      const alAcabar = this.alAcabar;
      this.scene.stop();
      if (alAcabar) alAcabar();
    });
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const k = this.teclas;
    if (Phaser.Input.Keyboard.JustDown(k.saltar)) { this.acabar(); return; }
    if (Phaser.Input.Keyboard.JustDown(k.entrar) || Phaser.Input.Keyboard.JustDown(k.espacio) ||
        Phaser.Input.Keyboard.JustDown(k.e)) this.avanzar();

    const e = this.escribiendo;
    if (e && e.letras < e.completo.length) {
      e.t += dt * LETRAS_POR_SEGUNDO;
      const antes = Math.floor(e.letras);
      e.letras = Math.min(e.completo.length, e.t);
      const ahora = Math.floor(e.letras);
      if (ahora !== antes) {
        this.texto.setText(e.completo.slice(0, ahora));
        // un pitido cada pocas letras, en el tono de quien habla (el
        // narrador no pita: va en silencio, como una voz en off)
        if (e.voz && ahora % 3 === 0 && /[a-zñáéíóúü]/i.test(e.completo[ahora - 1])) {
          Audio.notes([e.voz * (0.92 + Math.random() * 0.16)], 0.035, 'square', 0.025);
        }
      }
      if (e.letras >= e.completo.length) this.flecha.setVisible(true);
    }
  }

  // ---- DECORADOS ------------------------------------------------------------

  ponerFondo(clave) {
    this.fondoActual = clave;
    const viejo = this.capaFondo;
    const capa = this.add.container(0, 0);
    this.raizFondo.add(capa);
    if (this.textures.exists(`cine-${clave}`)) {
      capa.add(this.add.image(W / 2, H / 2, `cine-${clave}`).setDisplaySize(W * 1.08, H * 1.08));
    } else {
      const dibujar = DECORADOS[clave] || DECORADOS.ciudad;
      dibujar(this, capa);
    }
    // la camara se mueve despacio sobre el decorado (un "Ken Burns")
    capa.setAlpha(0);
    this.tweens.add({ targets: capa, alpha: 1, duration: 600 });
    capa.setScale(1.06).setPosition(-W * 0.03, -H * 0.03);
    this.tweens.add({ targets: capa, x: -W * 0.01, y: -H * 0.02, scale: 1.04, duration: 14000, ease: 'Sine.inOut' });
    if (viejo) this.tweens.add({ targets: viejo, alpha: 0, duration: 600, onComplete: () => viejo.destroy() });
    this.capaFondo = capa;
  }
}

// ---- LOS DECORADOS POR CODIGO ----------------------------------------------
// Cada uno pinta una escena de 1280x720 en `capa`. Formas sencillas con luz y
// sombra; la imagen de IA (`cine-<clave>`) los sustituye el dia que exista.

function rect(s, capa, x, y, w, h, color, alpha = 1) {
  const r = s.add.image(x, y, 'px').setOrigin(0, 0).setDisplaySize(w, h).setTint(color).setAlpha(alpha);
  capa.add(r);
  return r;
}

function luz(s, capa, x, y, tam, color, alpha) {
  const l = s.add.image(x, y, 'lamp').setDisplaySize(tam, tam).setTint(color).setAlpha(alpha)
    .setBlendMode(Phaser.BlendModes.ADD);
  capa.add(l);
  return l;
}

// el cielo en franjas, de arriba a abajo
function cielo(s, capa, colores, alto = H) {
  const n = colores.length;
  for (let i = 0; i < n; i++) rect(s, capa, 0, (alto / n) * i, W, alto / n + 1, colores[i]);
}

// semilla fija: el decorado sale siempre igual
function rng(semilla) {
  let x = semilla;
  return () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff;
  };
}

export const DECORADOS = {
  // la ciudad de noche desde el mar: skyline con ventanas, faro y reflejos
  ciudad(s, capa) {
    const r = rng(7);
    cielo(s, capa, [0x0a0e1e, 0x101632, 0x182042, 0x24284e, 0x3a2e4e], 430);
    for (let i = 0; i < 90; i++) rect(s, capa, r() * W, r() * 300, 2, 2, 0xf2efe6, 0.3 + r() * 0.5);
    capa.add(s.add.circle(1010, 130, 38, 0xe8e4d0, 0.9));
    luz(s, capa, 1010, 130, 260, 0xc8d0f0, 0.25);
    // el monte detras
    const g = s.add.graphics();
    g.fillStyle(0x141a2a, 1).fillTriangle(-50, 430, 300, 250, 650, 430).fillTriangle(500, 430, 820, 290, 1200, 430);
    capa.add(g);
    // los edificios
    let x = 40;
    while (x < W - 40) {
      const w = 40 + r() * 70;
      const h = 70 + r() * (x > 420 && x < 820 ? 230 : 120);
      const top = 470 - h;
      rect(s, capa, x, top, w, h, 0x0e1220);
      for (let wy = top + 10; wy < 460; wy += 16) {
        for (let wx = x + 7; wx < x + w - 8; wx += 13) {
          if (r() < 0.32) rect(s, capa, wx, wy, 6, 8, r() < 0.8 ? 0xe8c060 : 0x9fd8f0, 0.85);
        }
      }
      x += w + 4 + r() * 10;
    }
    // el faro
    rect(s, capa, 1150, 330, 18, 140, 0xd8d2c4);
    rect(s, capa, 1146, 318, 26, 16, 0xa8342a);
    luz(s, capa, 1159, 324, 300, 0xfff2c0, 0.5);
    // el mar y los reflejos
    rect(s, capa, 0, 470, W, H - 470, 0x0a1426);
    for (let i = 0; i < 140; i++) {
      const rx = r() * W;
      rect(s, capa, rx, 480 + r() * 200, 10 + r() * 30, 2, r() < 0.7 ? 0xe8c060 : 0x6b7cb8, 0.25 + r() * 0.3);
    }
  },

  // la carretera de la costa al amanecer, el autobus parado
  carretera(s, capa) {
    const r = rng(11);
    cielo(s, capa, [0x2a2a4a, 0x4a3a5a, 0x8a5a5a, 0xd88a5a, 0xf2b86a], 380);
    capa.add(s.add.circle(900, 380, 70, 0xffd890, 0.95));
    luz(s, capa, 900, 380, 600, 0xffb060, 0.45);
    rect(s, capa, 0, 380, W, 340, 0x1a1e2a);
    // el mar a la derecha, la carretera a la izquierda
    rect(s, capa, 640, 380, 640, 120, 0x2a3a5a);
    for (let i = 0; i < 60; i++) rect(s, capa, 640 + r() * 640, 390 + r() * 100, 20 + r() * 40, 2, 0xffc080, 0.4);
    const g = s.add.graphics();
    g.fillStyle(0x24262c, 1).fillTriangle(560, 380, 720, 380, 1300, 720).fillTriangle(560, 380, 1300, 720, -200, 720);
    g.fillStyle(0xe8c040, 0.8);
    for (let i = 0; i < 6; i++) {
      const k = i / 6;
      g.fillRect(640 + k * 40 - 2, 400 + k * k * 320, 4 + k * 8, 10 + k * 30);
    }
    capa.add(g);
    // el autobus, de espaldas, alejandose
    rect(s, capa, 300, 470, 220, 150, 0x8a9aa8);
    rect(s, capa, 310, 485, 200, 60, 0x2a3a4a);
    rect(s, capa, 300, 600, 220, 20, 0x3a3d42);
    luz(s, capa, 320, 595, 90, 0xff4a3a, 0.7);
    luz(s, capa, 500, 595, 90, 0xff4a3a, 0.7);
    // la señal de la ciudad
    rect(s, capa, 980, 470, 8, 120, 0x5a5e66);
    rect(s, capa, 900, 440, 170, 50, 0x1f6a3a);
    const t = s.add.text(985, 465, 'SANTA PERDIDA', { fontFamily: FONT, fontSize: '22px', color: '#f2efe6' }).setOrigin(0.5);
    capa.add(t);
  },

  // el muelle de noche: contenedores, la grua, farolas y el agua
  muelle(s, capa) {
    const r = rng(23);
    cielo(s, capa, [0x0a0e1a, 0x121a2c, 0x1a2438, 0x24304a], 360);
    for (let i = 0; i < 50; i++) rect(s, capa, r() * W, r() * 250, 2, 2, 0xf2efe6, 0.3 + r() * 0.4);
    // la grua del puerto
    rect(s, capa, 940, 120, 22, 250, 0xa8862a);
    rect(s, capa, 700, 120, 420, 18, 0xa8862a);
    for (let x = 712; x < 1110; x += 24) rect(s, capa, x, 124, 3, 10, 0x6a5418);   // la celosia
    rect(s, capa, 930, 96, 42, 24, 0x5a5e66);                                        // la cabina
    rect(s, capa, 760, 138, 3, 110, 0x3a3d42);
    rect(s, capa, 740, 248, 44, 30, 0x5a5e66);
    luz(s, capa, 1110, 122, 120, 0xff4a3a, 0.7);
    // el agua
    rect(s, capa, 0, 360, W, 90, 0x0c1a2a);
    for (let i = 0; i < 70; i++) rect(s, capa, r() * W, 365 + r() * 80, 14 + r() * 30, 2, 0xe8c060, 0.25);
    // el muelle (tablas) y los contenedores
    rect(s, capa, 0, 450, W, H - 450, 0x2a2620);
    for (let y = 460; y < H; y += 22) rect(s, capa, 0, y, W, 2, 0x1a1612, 0.8);
    const colores = [0xa8342a, 0x2f5a7a, 0x3a7a4a, 0xc8862a, 0x5a5e66];
    for (let i = 0; i < 6; i++) {
      const cx = 30 + i * 135;
      const alto = 2 + Math.floor(r() * 2);
      for (let j = 0; j < alto; j++) {
        const c = colores[Math.floor(r() * colores.length)];
        rect(s, capa, cx, 450 - (j + 1) * 62, 126, 60, c);
        for (let l = 8; l < 120; l += 12) rect(s, capa, cx + l, 450 - (j + 1) * 62 + 4, 3, 52, 0x000000, 0.18);
      }
    }
    // farolas del muelle
    for (const fx of [160, 620, 1080]) {
      rect(s, capa, fx, 300, 6, 160, 0x2a2e35);
      rect(s, capa, fx - 10, 296, 26, 6, 0x2a2e35);
      luz(s, capa, fx + 3, 304, 360, 0xffd890, 0.55);
    }
    // bolardos y cuerdas
    for (const bx of [300, 760]) {
      rect(s, capa, bx, 520, 26, 36, 0x15181d);
      rect(s, capa, bx - 4, 516, 34, 8, 0x24262c);
    }
  },

  // el barrio alto: bloques viejos, ropa tendida, pintadas, un cubo ardiendo
  barrio(s, capa) {
    const r = rng(31);
    cielo(s, capa, [0x1a1424, 0x2a1a2a, 0x4a2a2a, 0x6a3a2a], 300);
    // los bloques
    const bloques = [[0, 110, 330], [300, 160, 280], [560, 90, 300], [870, 140, 260], [1100, 120, 200]];
    for (const [bx, top, w] of bloques) {
      rect(s, capa, bx, top, w, 400 - top, 0x3a2e2a);
      rect(s, capa, bx - 4, top, w + 8, 8, 0x2a201c);   // la cornisa
      for (let wy = top + 20; wy < 370; wy += 34) {
        for (let wx = bx + 16; wx < bx + w - 24; wx += 40) {
          const enc = r() < 0.22;
          rect(s, capa, wx, wy, 20, 22, enc ? 0xe8b060 : 0x1a1412, enc ? 0.85 : 1);
          if (r() < 0.25) rect(s, capa, wx - 4, wy + 22, 28, 4, 0x24201c); // balcon
        }
      }
    }
    // cuerdas con ropa tendida entre bloques
    for (const [x0, y0] of [[300, 230], [560, 200], [870, 260]]) {
      rect(s, capa, x0 - 30, y0, 90, 2, 0x8a8578);
      for (let i = 0; i < 4; i++) {
        rect(s, capa, x0 - 24 + i * 22, y0 + 2, 14, 18, [0xd9384a, 0x5a8fd0, 0xe8e4d8, 0xe8b54a][i]);
      }
    }
    // la calle y el muro con pintadas
    rect(s, capa, 0, 460, W, 260, 0x24201e);
    rect(s, capa, 0, 400, W, 64, 0x4a3e38);
    const pintadas = [['ROMPIENTE', '#d97a3f', 120], ['EL BARRIO NO SE VENDE', '#e8e4d8', 560], ['CHISPA', '#d9384a', 1040]];
    for (const [t, c, x] of pintadas) {
      const p = s.add.text(x, 432, t, { fontFamily: FONT, fontSize: '30px', color: c }).setOrigin(0.5).setAlpha(0.8).setRotation(-0.04);
      capa.add(p);
    }
    // el bidon ardiendo
    rect(s, capa, 820, 410, 54, 76, 0x3a3d42);
    rect(s, capa, 820, 424, 54, 4, 0x24262c);
    luz(s, capa, 847, 404, 420, 0xff8a3a, 0.75);
    luz(s, capa, 847, 396, 130, 0xffd890, 0.9);
    for (let i = 0; i < 4; i++) rect(s, capa, 828 + i * 10, 388 - r() * 20, 8, 22, 0xffb040, 0.85);
  },

  // el despacho de la Doña: ventanal con la ciudad, cortinas, escritorio
  despacho(s, capa) {
    const r = rng(41);
    rect(s, capa, 0, 0, W, H, 0x2a1e2a);
    // papel pintado a rayas
    for (let x = 0; x < W; x += 40) rect(s, capa, x, 0, 18, H, 0x342434, 0.8);
    // el ventanal, con la ciudad de noche y el puerto al fondo
    rect(s, capa, 340, 70, 600, 380, 0x101632);
    for (let i = 0; i < 40; i++) {
      const bx = 350 + r() * 560;
      const h = 40 + r() * 140;
      rect(s, capa, bx, 450 - h, 24 + r() * 30, h, 0x0a0e1e);
      for (let k = 0; k < 6; k++) rect(s, capa, bx + 4 + r() * 20, 450 - h + r() * h, 4, 5, 0xe8c060, 0.8);
    }
    luz(s, capa, 860, 410, 200, 0xa8862a, 0.4);   // la grua del puerto, a lo lejos
    rect(s, capa, 636, 70, 8, 380, 0x4a3a2a);
    rect(s, capa, 340, 256, 600, 8, 0x4a3a2a);
    rect(s, capa, 330, 60, 620, 12, 0x6a5232);
    // cortinas
    rect(s, capa, 250, 40, 110, 440, 0x5a1a2a);
    rect(s, capa, 920, 40, 110, 440, 0x5a1a2a);
    for (let x = 0; x < 110; x += 22) {
      rect(s, capa, 250 + x, 40, 6, 440, 0x3a0e1a, 0.6);
      rect(s, capa, 920 + x, 40, 6, 440, 0x3a0e1a, 0.6);
    }
    // el escritorio y lo de encima
    rect(s, capa, 140, 500, 1000, 40, 0x4a2e1c);
    rect(s, capa, 140, 540, 1000, 180, 0x3a2416);
    rect(s, capa, 140, 500, 1000, 6, 0x6a4a2e);
    rect(s, capa, 900, 470, 70, 30, 0x1a1412);     // carpeta
    rect(s, capa, 380, 460, 14, 40, 0xd4af37);     // lampara
    rect(s, capa, 350, 440, 74, 26, 0x2f5a3a);
    luz(s, capa, 387, 470, 420, 0xffd890, 0.6);
    rect(s, capa, 600, 476, 40, 24, 0xe8e4dc);     // la taza de cafe
    rect(s, capa, 640, 482, 10, 10, 0xe8e4dc);
  },
};
