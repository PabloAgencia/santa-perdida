import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { COLORS, PLAYER } from '../config/balance.js';
import { texturaDelJugador } from '../world/personArt.js';
import { FisicaInterior } from '../world/interior.js';
import { Blackjack } from '../casino/blackjack.js';
import { Ruleta } from '../casino/ruleta.js';
import { Craps } from '../casino/craps.js';
import { VideoPoker } from '../casino/poker.js';
import { Caballos } from '../casino/caballos.js';
import { Tragaperras } from '../casino/tragaperras.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// EL CASINO FORTUNA POR DENTRO (APUNTES H2). Antes el casino era solo un
// negocio que se compraba en la acera: no habia ni un juego. Ahora se entra
// por su puerta y se anda por la sala entre las mesas; E en una mesa abre
// el juego (casino/*.js):
//   blackjack (dos mesas) · ruleta europea · craps · videopoker · caballos ·
//   tragaperras
// El despacho del fondo es el negocio de siempre (NegocioSystem): se compra
// el casino o se cobra su caja ahi, ya no en la puerta, para que el E de la
// puerta sea solo entrar.
//
// La sala es mas grande que la de los locales (1040x560) y se dibuja por
// codigo como ellos: cada mesa que se ve es el rectangulo que choca.

const W = 1040;
const H = 560;

// x, y = centro de la mesa (en px dentro de la sala). `e` = donde se pulsa
// E, siempre delante (abajo) de la mesa; el croupier va detras.
const MESAS = [
  { juego: 'blackjack', nombre: 'BLACKJACK', x: 190, y: 140, w: 170, h: 84, e: { x: 190, y: 246 }, croupier: 'ped-11' },
  { juego: 'blackjack', nombre: 'BLACKJACK', x: 190, y: 320, w: 170, h: 84, e: { x: 190, y: 426 }, croupier: 'ped-7' },
  { juego: 'ruleta', nombre: 'RULETA', x: 520, y: 150, w: 220, h: 96, e: { x: 520, y: 222 }, croupier: 'ped-10' },
  { juego: 'craps', nombre: 'CRAPS', x: 860, y: 150, w: 200, h: 90, e: { x: 860, y: 220 }, croupier: 'ped-8' },
  { juego: 'caballos', nombre: 'CABALLOS', x: 1010, y: 340, w: 26, h: 150, e: { x: 960, y: 340 }, pantalla: true },
];
// las filas de maquinas: un E sirve para toda la fila (te pones delante)
const MAQUINAS = [
  { juego: 'tragaperras', nombre: 'TRAGAPERRAS', x0: 330, x1: 470, y: 470, e: { y: 430 } },
  { juego: 'poker', nombre: 'VIDEOPOKER', x0: 600, x1: 740, y: 470, e: { y: 430 } },
];
const DESPACHO = { x: 690, y: 14, e: { x: 690, y: 52 } };

const JUEGOS = {
  blackjack: Blackjack, ruleta: Ruleta, craps: Craps, poker: VideoPoker, caballos: Caballos, tragaperras: Tragaperras,
};

export class CasinoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CasinoScene', active: false });
  }

  // datos.negocio = el negocio del casino (NegocioSystem), para el despacho
  create(datos) {
    this.negocio = datos && datos.negocio;
    const w = this.scale.width;
    const h = this.scale.height;
    this.sala = { x: (w - W) / 2, y: (h - H) / 2 - 10, w: W, h: H };
    const s = this.sala;
    Audio.menuOpen();

    this.add.image(0, 0, 'px').setOrigin(0, 0).setDisplaySize(w, h).setTint(0x07080a);
    this.add.image(s.x - 12, s.y - 12, 'px').setOrigin(0, 0).setDisplaySize(W + 24, H + 24).setTint(0x3a2414);
    this.add.image(s.x - 6, s.y - 6, 'px').setOrigin(0, 0).setDisplaySize(W + 12, H + 12).setTint(0xd4af37);
    this.dibujarMoqueta(s);

    this.fisica = new FisicaInterior(this);
    this.puntos = [];

    for (const m of MESAS) this.dibujarMesa(m);
    for (const f of MAQUINAS) this.dibujarFila(f);
    this.dibujarDespacho();
    this.dibujarAdornos();

    this.add.text(s.x + W / 2, s.y - 34, 'CASINO FORTUNA', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 5, fontSize: '30px', color: '#e8c860',
    }).setOrigin(0.5);

    this.ponerGente();

    this.puerta = { x: s.x + W / 2, y: s.y + H - 6 };
    this.add.image(this.puerta.x, this.puerta.y + 2, 'px').setDisplaySize(96, 14).setTint(0x15181d);
    this.add.image(this.puerta.x, this.puerta.y + 2, 'px').setDisplaySize(88, 6).setTint(0xd4af37).setAlpha(0.7);
    this.add.text(this.puerta.x, this.puerta.y + 22, 'SALIR', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.jugador = this.add.image(this.puerta.x, this.puerta.y - 60, texturaDelJugador(this, 0, GameState))
      .setRotation(-Math.PI / 2);
    this.px = this.jugador.x;
    this.py = this.jugador.y;

    this.aviso = this.add.text(w / 2, h - 30, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.ink,
    }).setOrigin(0.5).setDepth(3000);
    this.dinero = this.add.text(s.x + W, s.y - 34, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '18px', color: '#8fd694',
    }).setOrigin(1, 0.5).setDepth(3000);
    this.add.text(s.x, s.y - 34, 'WASD moverte · E jugar · F pegar', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0, 0.5).setDepth(3000);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upA: 'UP', downA: 'DOWN', leftA: 'LEFT', rightA: 'RIGHT',
      usar: 'E', salir: 'ESC', atacar: 'F',
    });
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE,ENTER,ESC');
    this.input.on('pointerdown', (p) => { if (p.leftButtonDown() && !this.mesa) this.pegar(); });

    this.mesa = null;
    this.delito = 0;
    this.confirmacion = 0;
    this.saliendo = false;
    this.cameras.main.fadeIn(420, 0, 0, 0);
  }

  // ---- DIBUJO ---------------------------------------------------------

  rect(x, y, w, h, color, alpha = 1, depth = 0) {
    return this.add.image(x, y, 'px').setDisplaySize(w, h).setTint(color).setAlpha(alpha).setDepth(depth);
  }

  dibujarMoqueta(s) {
    this.add.image(s.x, s.y, 'px').setOrigin(0, 0).setDisplaySize(W, H).setTint(0x6a1420);
    // el dibujo de rombos de las moquetas de casino
    for (let y = 20; y < H; y += 40) {
      for (let x = (y / 40) % 2 ? 20 : 40; x < W; x += 40) {
        this.rect(s.x + x, s.y + y, 9, 9, 0xb8862a, 0.35).setRotation(Math.PI / 4);
      }
    }
    // el pasillo dorado de la puerta a la ruleta
    this.rect(s.x + W / 2, s.y + 380, 90, 360, 0x3a0a12, 0.55);
    this.rect(s.x + W / 2 - 45, s.y + 380, 3, 360, 0xd4af37, 0.6);
    this.rect(s.x + W / 2 + 45, s.y + 380, 3, 360, 0xd4af37, 0.6);
  }

  dibujarMesa(m) {
    const s = this.sala;
    const x = s.x + m.x;
    const y = s.y + m.y;
    const z = y;
    // la sombra (la media luna del blackjack lleva la suya en el borde)
    if (m.juego !== 'blackjack') this.rect(x + 5, y + 6, m.w, m.h, 0x05060a, 0.35, z - 1);
    if (m.pantalla) {
      // las pantallas de las carreras, en la pared, y unas butacas delante
      this.rect(x, y, m.w, m.h, 0x15181d, 1, z);
      this.rect(x - 2, y, m.w - 8, m.h - 12, 0x2f7a46, 1, z + 0.1);
      for (let i = 0; i < 5; i++) this.rect(x - 2, y - 56 + i * 28, m.w - 12, 2, 0xf2efe6, 0.6, z + 0.2);
      for (const dy of [-50, 0, 50]) {
        this.rect(x - 90, y + dy, 26, 26, 0x2a1a12, 1, z);
        this.rect(x - 90, y + dy, 20, 20, 0x8a1a20, 1, z + 0.1);
        this.fisica.rect(x - 90, y + dy, 24, 24);
      }
    } else {
      // tapete verde con su borde de madera; el blackjack, en media luna
      const borde = 0x4a2a18;
      if (m.juego === 'blackjack') {
        // media luna: medio circulo achatado (la mitad de abajo), con el
        // borde de madera y el lado recto donde va el croupier
        const media = (r, color, dz) => {
          const g = this.add.graphics({ x, y }).setDepth(z + dz);
          g.fillStyle(color, 1);
          g.beginPath();
          g.slice(0, 0, r, 0, Math.PI, false);
          g.fillPath();
          g.setScale(1, (m.h * 2) / m.w);
        };
        media(m.w / 2 + 6, borde, 0);
        media(m.w / 2, 0x1f6a3a, 0.1);
        this.rect(x, y - 2, m.w + 12, 8, borde, 1, z + 0.3);
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (0.15 + i * 0.175);
          this.add.circle(x + Math.cos(a) * m.w * 0.36, y + Math.sin(a) * m.h * 0.62, 6, 0xd4af37, 0.35).setDepth(z + 0.4);
        }
        this.fisica.rect(x, y + m.h * 0.42, m.w - 10, m.h * 0.84);
      } else {
        this.rect(x, y, m.w + 12, m.h + 12, borde, 1, z);
        this.rect(x, y, m.w, m.h, 0x1f6a3a, 1, z + 0.1);
        this.rect(x, y, m.w - 14, m.h - 14, 0xf2efe6, 0.0, z + 0.2);
        if (m.juego === 'ruleta') {
          this.add.circle(x - m.w / 2 + 44, y, 34, 0x3a2414).setDepth(z + 0.3);
          this.add.circle(x - m.w / 2 + 44, y, 28, 0xc8202a).setDepth(z + 0.4);
          this.add.circle(x - m.w / 2 + 44, y, 14, 0xd4af37).setDepth(z + 0.5);
          for (let i = 0; i < 12; i++) {
            this.rect(x - 10 + (i % 6) * 22, y - 18 + Math.floor(i / 6) * 36, 18, 28, i % 2 ? 0xc8202a : 0x15181d, 0.9, z + 0.3);
          }
        } else {
          // craps: la pared de rebote y los dados en el centro
          this.rect(x, y - m.h / 2 + 4, m.w - 8, 6, 0x15181d, 0.6, z + 0.3);
          this.rect(x - 8, y, 12, 12, 0xf7f4ec, 1, z + 0.4);
          this.rect(x + 10, y + 4, 12, 12, 0xf7f4ec, 1, z + 0.4).setRotation(0.4);
          this.rect(x, y + 22, m.w - 40, 3, 0xf2efe6, 0.5, z + 0.3);
        }
        this.fisica.rect(x, y, m.w + 8, m.h + 8);
      }
      // el croupier, detras de la mesa
      const cy = y - (m.juego === 'blackjack' ? 6 : m.h / 2 + 16);
      const cr = this.add.image(x, cy, `${m.croupier}-0`).setDepth(z + 1).setRotation(Math.PI / 2);
      this.fisica.gente(cr);
    }
    this.add.text(x, y + (m.pantalla ? -m.h / 2 - 16 : m.juego === 'blackjack' ? -36 : m.h / 2 + 22),
      m.nombre, {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '13px', color: '#e8c860',
      }).setOrigin(0.5).setDepth(2000);
    this.puntos.push({ juego: m.juego, nombre: m.nombre, x: s.x + m.e.x, y: s.y + m.e.y });
  }

  dibujarFila(f) {
    const s = this.sala;
    const y = s.y + f.y;
    for (let x = f.x0; x <= f.x1; x += 35) {
      const px = s.x + x;
      this.rect(px + 3, y + 4, 30, 42, 0x05060a, 0.35, y - 1);
      this.rect(px, y, 30, 42, 0x2a2d33, 1, y);
      this.rect(px, y - 6, 24, 18, f.juego === 'poker' ? 0x1a2a5a : 0xd4af37, 1, y + 0.1);
      this.rect(px, y - 6, 18, 12, f.juego === 'poker' ? 0x5a8fd0 : 0xc8202a, 0.85, y + 0.2);
      this.rect(px, y + 12, 22, 4, 0xf2efe6, 0.6, y + 0.2);
      // el taburete de delante
      this.add.circle(px, y - 34, 7, 0x8a1a20).setDepth(y - 30);
    }
    const ancho = f.x1 - f.x0 + 32;
    this.fisica.rect(s.x + (f.x0 + f.x1) / 2, y, ancho, 40);
    this.add.text(s.x + (f.x0 + f.x1) / 2, y + 36, f.nombre, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '13px', color: '#e8c860',
    }).setOrigin(0.5).setDepth(2000);
    // un punto de E por maquina: vale cualquiera de la fila
    for (let x = f.x0; x <= f.x1; x += 35) {
      this.puntos.push({ juego: f.juego, nombre: f.nombre, x: s.x + x, y: s.y + f.e.y, radio: 30 });
    }
  }

  dibujarDespacho() {
    const s = this.sala;
    const x = s.x + DESPACHO.x;
    const y = s.y + DESPACHO.y;
    this.rect(x, y, 70, 16, 0x15181d, 1, y);
    this.rect(x, y, 60, 8, 0xd4af37, 0.7, y + 0.1);
    this.add.text(x, y + 22, 'DESPACHO', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '12px', color: '#e8c860',
    }).setOrigin(0.5).setDepth(2000);
    this.despacho = { x: s.x + DESPACHO.e.x, y: s.y + DESPACHO.e.y };
  }

  dibujarAdornos() {
    const s = this.sala;
    // columnas doradas y plantas, que tambien chocan
    for (const [x, y] of [[360, 270], [680, 270]]) {
      this.add.circle(s.x + x + 4, s.y + y + 5, 20, 0x05060a, 0.35).setDepth(s.y + y - 1);
      this.add.circle(s.x + x, s.y + y, 20, 0xb8862a).setDepth(s.y + y);
      this.add.circle(s.x + x - 5, s.y + y - 5, 9, 0xf2d878).setDepth(s.y + y + 0.1);
      this.fisica.rect(s.x + x, s.y + y, 32, 32);
    }
    for (const [x, y] of [[30, 520], [1010, 520], [30, 40]]) {
      this.add.circle(s.x + x, s.y + y, 15, 0x6a4a32).setDepth(s.y + y);
      this.add.circle(s.x + x - 3, s.y + y - 3, 12, 0x3d7a3f).setDepth(s.y + y + 0.1);
      this.fisica.rect(s.x + x, s.y + y, 24, 24);
    }
  }

  // la clientela: alrededor de las mesas, en las maquinas y paseando
  ponerGente() {
    const s = this.sala;
    const QUIETOS = [
      [125, 222, 'ped-1'], [255, 222, 'ped-4'], [125, 402, 'ped-9'],
      [470, 226, 'ped-3'], [575, 226, 'ped-5'], [905, 222, 'ped-2'], [815, 222, 'ped-6'],
      [365, 434, 'ped-0'], [435, 434, 'ped-11'], [670, 434, 'ped-4'], [920, 290, 'ped-9'],
    ];
    this.gente = [];
    for (const [x, y, ped] of QUIETOS) {
      const spr = this.add.image(s.x + x, s.y + y, `${ped}-0`).setDepth(s.y + y).setRotation(-Math.PI / 2);
      this.fisica.gente(spr);
    }
    const PASEOS = [
      { ped: 'ped-7', desde: [300, 300], hasta: [740, 300] },
      { ped: 'ped-10', desde: [880, 280], hasta: [880, 470] },
      { ped: 'ped-8', desde: [90, 470], hasta: [250, 470] },
    ];
    this.paseando = PASEOS.map((p, i) => {
      const spr = this.add.image(s.x + p.desde[0], s.y + p.desde[1], `${p.ped}-0`);
      const reg = { ...p, spr, t: i * 1.4, fase: 0, fotoT: 0, caido: false };
      this.fisica.gente(spr, () => { reg.caido = true; });
      return reg;
    });
  }

  // ---- LOGICA ---------------------------------------------------------

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.dinero.setText(`${GameState.money.toLocaleString('es-ES')} €`);
    if (this.mesa) {
      this.mesa.update(dt);
      return;
    }
    const k = this.keys;
    const s = this.sala;
    this.fisica.update(dt);
    if (Phaser.Input.Keyboard.JustDown(k.atacar)) this.pegar();

    for (const r of this.paseando) {
      if (r.caido) continue;
      r.t += dt * 0.3;
      const u = Math.sin(r.t) * 0.5 + 0.5;
      const nx = s.x + r.desde[0] + (r.hasta[0] - r.desde[0]) * u;
      const ny = s.y + r.desde[1] + (r.hasta[1] - r.desde[1]) * u;
      const a = Math.atan2(ny - r.spr.y, nx - r.spr.x);
      r.spr.setPosition(nx, ny).setRotation(a).setDepth(ny);
      r.fotoT += dt;
      if (r.fotoT > 0.22) {
        r.fotoT = 0;
        r.fase = (r.fase + 1) % 4;
        r.spr.setTexture(`${r.ped}-${r.fase}`);
      }
    }

    let dx = 0;
    let dy = 0;
    if (k.left.isDown || k.leftA.isDown) dx -= 1;
    if (k.right.isDown || k.rightA.isDown) dx += 1;
    if (k.up.isDown || k.upA.isDown) dy -= 1;
    if (k.down.isDown || k.downA.isDown) dy += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      const m = this.fisica.mover(this.px, this.py, (dx / len) * PLAYER.walkSpeed * dt, (dy / len) * PLAYER.walkSpeed * dt);
      this.px = Phaser.Math.Clamp(m.x, s.x + 14, s.x + W - 14);
      this.py = Phaser.Math.Clamp(m.y, s.y + 14, s.y + H - 14);
      this.jugador.setRotation(Math.atan2(dy, dx));
    }
    this.jugador.setPosition(this.px, this.py).setDepth(this.py + 0.5);

    const punto = this.puntoCerca();
    const enDespacho = this.negocio && Phaser.Math.Distance.Between(this.px, this.py, this.despacho.x, this.despacho.y) < 40;
    const enPuerta = Phaser.Math.Distance.Between(this.px, this.py, this.puerta.x, this.puerta.y) < 50;

    if (this.confirmacion > 0) {
      this.confirmacion -= dt;
    } else {
      this.aviso.setColor('#e6e1d4');
      this.aviso.setText(
        punto ? `E para jugar · ${punto.nombre}`
          : enDespacho ? this.textoDespacho()
            : enPuerta ? 'E para salir a la calle' : ''
      );
    }

    if (Phaser.Input.Keyboard.JustDown(k.usar)) {
      if (punto) this.abrirMesa(punto);
      else if (enDespacho) this.usarDespacho();
      else if (enPuerta) this.salir();
    }
    if (Phaser.Input.Keyboard.JustDown(k.salir)) this.salir();
  }

  puntoCerca() {
    let mejor = null;
    let dMejor = Infinity;
    for (const p of this.puntos) {
      const d = Phaser.Math.Distance.Between(this.px, this.py, p.x, p.y);
      if (d < (p.radio || 44) && d < dMejor) { mejor = p; dMejor = d; }
    }
    return mejor;
  }

  abrirMesa(p) {
    if (GameState.money < 10) {
      this.decir('Sin dinero no te sientan en ninguna mesa', '#d9584a');
      return;
    }
    const Juego = JUEGOS[p.juego];
    this.mesa = new Juego(this);
    this.mesa.alCerrar = () => {
      this.mesa = null;
      this.confirmacion = 0;
      // las pulsaciones de E, ESC o F hechas en la mesa no pasan a la sala
      // (un E de mas volveria a sentarte en el acto)
      for (const k of [this.keys.usar, this.keys.salir, this.keys.atacar]) Phaser.Input.Keyboard.JustDown(k);
    };
  }

  // EL DESPACHO: el negocio del casino, como en la acera antes
  textoDespacho() {
    const n = this.negocio;
    if (!GameState.esDueno(n.clave)) return `E para comprar el casino · ${n.cfg.precio.toLocaleString('es-ES')} €`;
    if (n.ataque) return 'Te estan atacando el casino: sal a defenderlo';
    const caja = Math.round(GameState.caja(n.clave));
    return caja > 0 ? `E para cobrar la caja del casino · ${caja} €` : 'La caja del casino esta vacia';
  }

  usarDespacho() {
    const ciudad = this.scene.get('CityScene');
    const sistema = ciudad && ciudad.negocios;
    if (!sistema) return;
    const n = this.negocio;
    if (!GameState.esDueno(n.clave)) {
      const que = sistema.comprar(n);
      if (que === 'sin-dinero') this.decir(`${n.cfg.nombre}: ${n.cfg.precio} €. No te llega`, '#d9584a');
      else if (que === 'comprado') {
        Audio.notes([392, 523.25, 659.25], 0.1);
        this.decir('El Casino Fortuna ya es tuyo', '#8fd694');
      }
      return;
    }
    const r = sistema.cobrar(n);
    if (r) this.decir(r.texto, r.tono === 'money' ? '#8fd694' : r.tono === 'danger' ? '#d9584a' : '#8a8578');
  }

  decir(t, color) {
    this.aviso.setColor(color);
    this.aviso.setText(t);
    this.confirmacion = 2;
  }

  // como en los locales: tumbar a alguien delante de todos se paga fuera
  pegar() {
    if (this.saliendo) return false;
    const antes = this.fisica.cuerpos.filter((c) => c.caido).length;
    const dado = this.fisica.atacar(this.px, this.py, this.jugador.rotation);
    this.tweens.add({ targets: this.jugador, scale: { from: 1.18, to: 1 }, duration: 120, ease: 'Sine.out' });
    if (dado && this.fisica.cuerpos.filter((c) => c.caido).length > antes) this.delito = Math.max(this.delito, 1);
    return dado;
  }

  salir() {
    if (this.saliendo || this.mesa) return;
    this.saliendo = true;
    Audio.menuClose();
    this.cameras.main.fadeOut(380, 0, 0, 0);
    this.time.delayedCall(400, () => {
      this.scene.setVisible(true, 'CityScene');
      this.scene.resume('CityScene');
      this.scene.setVisible(true, 'UIScene');
      this.scene.resume('UIScene');
      if (this.negocio) {
        const ciudad = this.scene.get('CityScene');
        if (ciudad && ciudad.negocios) ciudad.negocios.refrescar(this.negocio);
      }
      EventBus.emit(EVT.HIDEOUT_EXIT, { delito: this.delito });
      this.scene.stop();
    });
  }
}
