import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';

// LO QUE COMPARTEN LAS MESAS DEL CASINO (APUNTES H2): el panel que se abre
// encima de la sala, los botones, el selector de apuesta y las cartas.
// Cada juego (blackjack.js, ruleta.js...) es una clase que hereda de Mesa y
// solo escribe sus reglas y su dibujo.
//
// El dinero va SIEMPRE por GameState (la fuente unica): la apuesta se cobra
// al empezar la jugada y el premio se paga entero al acabar (apuesta
// incluida), asi que salir a mitad de una mano nunca regala ni quita nada
// raro: lo apostado ya no esta en el bolsillo.

export const FONT = 'Pricedown, Anton, Impact, sans-serif';
// los palos de la baraja no estan en Pricedown
export const FONT_PALOS = 'Arial, Helvetica, sans-serif';
export const ORO = 0xd4af37;
export const PROFUNDIDAD = 5000;

export const FICHAS = [10, 50, 100, 500, 1000, 5000];

export function texto(scene, x, y, str, size = 16, color = '#f2efe6', origen = 0.5) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#05060a', strokeThickness: Math.max(2, size / 6),
    align: 'center',
  }).setOrigin(origen, 0.5);
}

// Un boton de verdad: se pulsa con el raton y, si se le da `tecla`, tambien
// con el teclado (la Mesa lo atiende en su update).
export function boton(scene, x, y, w, h, etiqueta, alPulsar, { color = 0x2a1a12, borde = ORO, tecla = null, size = 16 } = {}) {
  const fondo = scene.add.image(x, y, 'px').setDisplaySize(w, h).setTint(color);
  const marco = scene.add.rectangle(x, y, w, h).setStrokeStyle(2, borde, 0.9);
  const txt = texto(scene, x, y, tecla ? `${etiqueta}  [${tecla}]` : etiqueta, size);
  const b = {
    fondo, marco, txt, tecla, activo: true, partes: [fondo, marco, txt],
    pulsar: () => { if (b.activo && b.visible !== false) { Audio.menuSelect(); alPulsar(); } },
    setActivo(v) {
      b.activo = v;
      fondo.setAlpha(v ? 1 : 0.35);
      txt.setAlpha(v ? 1 : 0.4);
      marco.setAlpha(v ? 0.9 : 0.25);
      return b;
    },
    setVisible(v) {
      b.visible = v;
      for (const p of b.partes) p.setVisible(v);
      return b;
    },
    setTexto(t) { txt.setText(tecla ? `${t}  [${tecla}]` : t); return b; },
  };
  fondo.setInteractive({ useHandCursor: true })
    .on('pointerdown', (p, lx, ly, ev) => { if (ev) ev.stopPropagation(); b.pulsar(); })
    .on('pointerover', () => { if (b.activo) fondo.setTint(Phaser.Display.Color.ValueToColor(color).lighten(18).color); })
    .on('pointerout', () => fondo.setTint(color));
  return b;
}

// LA BARAJA: de 52, con tantos mazos como se pida (el blackjack de casino
// va con seis). Valor 2-14 (el as es 14; el blackjack lo trata aparte).
const PALOS = [
  { s: '♠', rojo: false }, { s: '♥', rojo: true }, { s: '♦', rojo: true }, { s: '♣', rojo: false },
];
const NOMBRES = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function nuevaBaraja(mazos = 1) {
  const cartas = [];
  for (let m = 0; m < mazos; m++) {
    for (const palo of PALOS) {
      for (let v = 2; v <= 14; v++) cartas.push({ v, palo: palo.s, rojo: palo.rojo, nombre: NOMBRES[v] || `${v}` });
    }
  }
  Phaser.Utils.Array.Shuffle(cartas);
  return cartas;
}

// Una carta dibujada: blanca con su valor y su palo, o boca abajo.
export function dibujarCarta(scene, x, y, c, tapada = false, escala = 1) {
  const w = 58 * escala;
  const h = 82 * escala;
  const cont = scene.add.container(x, y).setDepth(PROFUNDIDAD + 10);
  cont.add(scene.add.image(3, 4, 'px').setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.4));
  if (tapada) {
    cont.add(scene.add.image(0, 0, 'px').setDisplaySize(w, h).setTint(0xf2efe6));
    cont.add(scene.add.image(0, 0, 'px').setDisplaySize(w - 8, h - 8).setTint(0x8a2a2a));
    cont.add(scene.add.rectangle(0, 0, w - 16, h - 16).setStrokeStyle(2, ORO, 0.8));
    return cont;
  }
  cont.add(scene.add.image(0, 0, 'px').setDisplaySize(w, h).setTint(0xf7f4ec));
  cont.add(scene.add.rectangle(0, 0, w, h).setStrokeStyle(1, 0x8a8578, 0.8));
  const color = c.rojo ? '#c8202a' : '#15181d';
  cont.add(scene.add.text(-w / 2 + 6, -h / 2 + 4, c.nombre, {
    fontFamily: FONT_PALOS, fontStyle: 'bold', fontSize: `${Math.round(17 * escala)}px`, color,
  }));
  cont.add(scene.add.text(0, 6 * escala, c.palo, {
    fontFamily: FONT_PALOS, fontSize: `${Math.round(34 * escala)}px`, color,
  }).setOrigin(0.5));
  return cont;
}

// EL PANEL DE UNA MESA. Oscurece la sala, pone el tapete, el titulo, lo que
// llevas en el bolsillo, una linea para los avisos y el selector de apuesta.
export class Mesa {
  constructor(scene, { titulo, tapete = 0x1f5a3a, ancho = 900, alto = 540, apuestaMax = 5000 }) {
    this.scene = scene;
    this.objetos = [];
    this.botones = [];
    this.cerrada = false;
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.cx = w / 2;
    this.cy = h / 2;
    this.ancho = ancho;
    this.alto = alto;
    this.apuestaMax = apuestaMax;

    this.capa = scene.add.container(0, 0).setDepth(PROFUNDIDAD);
    this.add(scene.add.image(0, 0, 'px').setOrigin(0, 0).setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.78)
      .setInteractive());   // tapa los clics a la sala
    this.add(scene.add.image(this.cx, this.cy, 'px').setDisplaySize(ancho + 16, alto + 16).setTint(0x3a2414));
    this.add(scene.add.image(this.cx, this.cy, 'px').setDisplaySize(ancho, alto).setTint(tapete));
    this.add(scene.add.rectangle(this.cx, this.cy, ancho - 20, alto - 20).setStrokeStyle(2, ORO, 0.5));
    this.add(texto(scene, this.cx, this.cy - alto / 2 + 28, titulo, 30, '#e8c860'));

    this.dineroTxt = this.add(texto(scene, this.cx - ancho / 2 + 24, this.cy - alto / 2 + 28, '', 18, '#8fd694', 0));
    this.add(texto(scene, this.cx + ancho / 2 - 24, this.cy - alto / 2 + 28, 'ESC levantarse', 14, '#c8c0a8', 1));
    this.avisoTxt = this.add(texto(scene, this.cx, this.cy + alto / 2 - 96, '', 20));

    // la apuesta: - y + cambian de ficha, abajo a la izquierda
    this.apuesta = Math.min(FICHAS[1], this.maximo());
    const ay = this.cy + alto / 2 - 42;
    const ax = this.cx - ancho / 2 + 150;
    this.boton(ax - 92, ay, 44, 40, '-', () => this.cambiarApuesta(-1), { tecla: null, size: 22 });
    this.apuestaTxt = this.add(texto(scene, ax, ay, '', 20, '#f2efe6'));
    this.boton(ax + 92, ay, 44, 40, '+', () => this.cambiarApuesta(1), { tecla: null, size: 22 });
    this.add(texto(scene, ax, ay - 30, 'APUESTA  ·  FLECHAS IZQ/DER', 12, '#c8c0a8'));
    this.bloqueaApuesta = false;

    this.teclas = scene.input.keyboard.addKeys({
      izq: 'LEFT', der: 'RIGHT', esc: 'ESC',
      uno: 'ONE', dos: 'TWO', tres: 'THREE', cuatro: 'FOUR', cinco: 'FIVE', seis: 'SIX',
      a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', h: 'H', p: 'P', r: 'R', s: 'S', t: 'T', espacio: 'SPACE', enter: 'ENTER',
    }, false);
    this.refrescar();
  }

  add(o) {
    this.capa.add(o);
    this.objetos.push(o);
    return o;
  }

  boton(x, y, w, h, etiqueta, alPulsar, opciones) {
    const b = boton(this.scene, x, y, w, h, etiqueta, alPulsar, opciones);
    for (const p of b.partes) this.add(p);
    this.botones.push(b);
    return b;
  }

  // la apuesta mas alta que se puede hacer ahora: el tope de la mesa o lo
  // que lleves encima, lo que sea menos
  maximo() {
    return Math.min(this.apuestaMax, GameState.money);
  }

  cambiarApuesta(paso) {
    if (this.bloqueaApuesta) return;
    const fichas = FICHAS.filter((f) => f <= this.apuestaMax);
    let i = fichas.indexOf(this.apuesta);
    if (i < 0) i = 0;
    i = Phaser.Math.Clamp(i + paso, 0, fichas.length - 1);
    this.apuesta = fichas[i];
    Audio.menuMove();
    this.refrescar();
  }

  // cobra la apuesta; false si no llega
  cobrarApuesta(cuanto = this.apuesta) {
    if (cuanto <= 0 || !GameState.canAfford(cuanto)) {
      this.decir('No te llega para esa apuesta', '#d9584a');
      return false;
    }
    GameState.spendMoney(cuanto, 'casino');
    GameState.bumpStat('apuestas', 1);
    this.refrescar();
    return true;
  }

  // paga un premio (la apuesta va incluida en `total`)
  pagar(total) {
    if (total <= 0) return;
    GameState.addMoney(total, 'casino');
    GameState.bumpStat('ganadoCasino', total);
    this.refrescar();
  }

  decir(t, color = '#f2efe6') {
    this.avisoTxt.setText(t).setColor(color);
  }

  refrescar() {
    this.dineroTxt.setText(`${GameState.money.toLocaleString('es-ES')} €`);
    this.apuestaTxt.setText(`${this.apuesta.toLocaleString('es-ES')} €`);
    this.apuestaTxt.setAlpha(this.bloqueaApuesta ? 0.45 : 1);
  }

  pulsada(nombre) {
    return Phaser.Input.Keyboard.JustDown(this.teclas[nombre]);
  }

  // Cada juego llama a super.update(dt) y luego hace lo suyo.
  update() {
    if (this.cerrada) return;
    if (this.pulsada('izq')) this.cambiarApuesta(-1);
    if (this.pulsada('der')) this.cambiarApuesta(1);
    for (const b of this.botones) {
      if (b.tecla && this.teclas[b.tecla.toLowerCase()] && this.pulsada(b.tecla.toLowerCase())) b.pulsar();
    }
    if (this.pulsada('esc')) this.cerrar();
  }

  // Levantarse de la mesa. Si un juego tiene una jugada a medias, la
  // resuelve antes (ver cada juego): lo apostado no se devuelve.
  cerrar() {
    if (this.cerrada) return;
    this.cerrada = true;
    // las teclas NO se quitan: Phaser devuelve la misma tecla a quien la
    // pida, y quitarlas aqui dejaria a la sala sin ESC ni WASD
    this.capa.destroy(true);
    if (this.alCerrar) this.alCerrar();
  }
}
