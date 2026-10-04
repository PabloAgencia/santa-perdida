import { Audio } from '../core/Audio.js';
import { Mesa, texto, ORO } from './comun.js';

// RULETA EUROPEA: un solo cero, 37 casillas, en el orden real de la rueda.
// Una apuesta por tirada, de las de siempre:
//   ROJO / NEGRO, PAR / IMPAR, 1-18 / 19-36 ........ pagan 1 a 1
//   DOCENA (1-12, 13-24, 25-36) .................... paga 2 a 1
//   PLENO a un numero .............................. paga 35 a 1
// El cero pierde todas las apuestas menos el pleno al cero: esa es la
// ventaja de la casa (2,7%), la misma que en un casino de verdad.
export const ORDEN_RUEDA = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
export const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const APUESTAS_RULETA = {
  rojo: { nombre: 'ROJO', paga: 1, gana: (n) => ROJOS.has(n) },
  negro: { nombre: 'NEGRO', paga: 1, gana: (n) => n > 0 && !ROJOS.has(n) },
  par: { nombre: 'PAR', paga: 1, gana: (n) => n > 0 && n % 2 === 0 },
  impar: { nombre: 'IMPAR', paga: 1, gana: (n) => n % 2 === 1 },
  falta: { nombre: '1-18', paga: 1, gana: (n) => n >= 1 && n <= 18 },
  pasa: { nombre: '19-36', paga: 1, gana: (n) => n >= 19 },
  d1: { nombre: '1ª DOCENA', paga: 2, gana: (n) => n >= 1 && n <= 12 },
  d2: { nombre: '2ª DOCENA', paga: 2, gana: (n) => n >= 13 && n <= 24 },
  d3: { nombre: '3ª DOCENA', paga: 2, gana: (n) => n >= 25 },
  pleno: { nombre: 'PLENO', paga: 35, gana: (n, elegido) => n === elegido },
};

const colorDe = (n) => (n === 0 ? 0x1f8a46 : ROJOS.has(n) ? 0xc8202a : 0x15181d);

export class Ruleta extends Mesa {
  constructor(scene) {
    super(scene, { titulo: 'RULETA', tapete: 0x1a4a30, apuestaMax: 5000 });
    const { cx, cy } = this;
    this.eleccion = 'rojo';
    this.numero = 17;
    this.girando = false;

    // LA RUEDA: 37 casillas en su orden, que gira entera
    this.rx = cx - 230;
    this.ry = cy - 10;
    this.R = 150;
    this.rueda = this.scene.add.container(this.rx, this.ry);
    this.add(this.scene.add.circle(this.rx, this.ry, this.R + 14, 0x3a2414));
    this.add(this.scene.add.circle(this.rx, this.ry, this.R + 6, ORO));
    this.add(this.rueda);
    const g = this.scene.add.graphics();
    const paso = (Math.PI * 2) / 37;
    ORDEN_RUEDA.forEach((n, i) => {
      const a0 = -Math.PI / 2 + i * paso - paso / 2;
      g.fillStyle(colorDe(n), 1);
      g.beginPath();
      g.slice(0, 0, this.R, a0, a0 + paso, false);
      g.fillPath();
    });
    g.lineStyle(1, ORO, 0.6);
    g.strokeCircle(0, 0, this.R);
    g.fillStyle(0x3a2414, 1);
    g.fillCircle(0, 0, this.R * 0.55);
    g.lineStyle(3, ORO, 1);
    g.strokeCircle(0, 0, this.R * 0.55);
    this.rueda.add(g);
    ORDEN_RUEDA.forEach((n, i) => {
      const a = -Math.PI / 2 + i * paso;
      const t = this.scene.add.text(Math.cos(a) * this.R * 0.8, Math.sin(a) * this.R * 0.8, `${n}`, {
        fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: '11px', color: '#f2efe6',
      }).setOrigin(0.5).setRotation(a + Math.PI / 2);
      this.rueda.add(t);
    });
    // la flecha de arriba, que es la que marca
    this.add(this.scene.add.triangle(this.rx, this.ry - this.R - 18, 0, 0, 16, 0, 8, 16, 0xf2efe6));
    this.bola = this.add(this.scene.add.circle(this.rx, this.ry - this.R * 0.92, 5, 0xf7f4ec));
    this.resultadoTxt = this.add(texto(this.scene, this.rx, this.ry, '', 34));

    // EL PAÑO: los botones de apuesta, a la derecha
    const x0 = cx + 30;
    const y0 = cy - 170;
    const claves = ['rojo', 'negro', 'par', 'impar', 'falta', 'pasa', 'd1', 'd2', 'd3'];
    this.bApuestas = {};
    claves.forEach((k, i) => {
      const col = i % 3;
      const fila = Math.floor(i / 3);
      const color = k === 'rojo' ? 0x8a1a20 : k === 'negro' ? 0x15181d : 0x1f5a3a;
      this.bApuestas[k] = this.boton(x0 + col * 128 + 60, y0 + fila * 54, 120, 44, APUESTAS_RULETA[k].nombre,
        () => this.elegir(k), { color, size: 15 });
    });
    // el pleno, con su numero
    const yp = y0 + 3 * 54 + 10;
    this.bApuestas.pleno = this.boton(x0 + 60, yp, 120, 44, 'PLENO', () => this.elegir('pleno'), { color: 0x1f5a3a, size: 15 });
    this.boton(x0 + 160, yp, 44, 44, '-', () => this.cambiarNumero(-1), { size: 20 });
    this.numeroTxt = this.add(texto(this.scene, x0 + 222, yp, '', 24));
    this.boton(x0 + 284, yp, 44, 44, '+', () => this.cambiarNumero(1), { size: 20 });
    this.add(texto(this.scene, x0 + 192, yp + 34, 'paga 35 a 1  ·  docena 2 a 1  ·  el resto 1 a 1', 12, '#c8c0a8'));

    this.bGirar = this.boton(cx + 290, cy + this.alto / 2 - 42, 170, 44, 'GIRAR', () => this.girar(), { tecla: 'ENTER' });
    this.angulo = 0;
    this.pintarEleccion();
    this.decir('Elige a que apuestas y dale a GIRAR');
  }

  elegir(k) {
    if (this.girando) return;
    this.eleccion = k;
    this.pintarEleccion();
  }

  cambiarNumero(p) {
    if (this.girando) return;
    this.numero = (this.numero + p + 37) % 37;
    this.eleccion = 'pleno';
    this.pintarEleccion();
  }

  pintarEleccion() {
    for (const [k, b] of Object.entries(this.bApuestas)) {
      b.marco.setStrokeStyle(k === this.eleccion ? 4 : 2, k === this.eleccion ? 0xf2efe6 : ORO, k === this.eleccion ? 1 : 0.6);
    }
    this.numeroTxt.setText(`${this.numero}`);
  }

  textoApuesta() {
    return this.eleccion === 'pleno' ? `PLENO AL ${this.numero}` : APUESTAS_RULETA[this.eleccion].nombre;
  }

  girar() {
    if (this.girando) return;
    if (!this.cobrarApuesta()) return;
    this.girando = true;
    this.enJuego = { tipo: this.eleccion, numero: this.numero, cuanto: this.apuesta };
    this.bloqueaApuesta = true;
    this.bGirar.setActivo(false);
    this.resultadoTxt.setText('');
    this.decir(`${this.apuesta} € al ${this.textoApuesta()}... no va mas`, '#e8c860');

    const sale = Phaser.Math.Between(0, 36);
    this.enJuego.sale = sale;
    const i = ORDEN_RUEDA.indexOf(sale);
    const paso = 360 / 37;
    // la casilla i queda bajo la flecha cuando la rueda ha girado -i
    // casillas (en grados, salvo vueltas enteras). Se dan 4 o 5 vueltas y se
    // para en el primer angulo bueno.
    const destino = -i * paso;
    const desde = this.angulo;
    const base = desde - (4 + Math.floor(Math.random() * 2)) * 360;
    const hasta = base - ((((base - destino) % 360) + 360) % 360);
    this.tw = this.scene.tweens.addCounter({
      from: desde, to: hasta, duration: 3800, ease: 'Cubic.out',
      onUpdate: (tw) => {
        this.angulo = tw.getValue();
        this.rueda.setAngle(this.angulo);
        // la bola va al reves y se frena antes
        const k = tw.progress;
        const ab = -Math.PI / 2 - (1 - k) * (1 - k) * 22;
        const rb = this.R * (0.92 - 0.12 * Math.min(1, k * 1.6));
        this.bola.setPosition(this.rx + Math.cos(ab) * rb, this.ry + Math.sin(ab) * rb);
        if (Math.random() < 0.25 * (1 - k)) Audio.notes([1200 + Math.random() * 300], 0.01, 'square', 0.02);
      },
      onComplete: () => this.resolver(sale),
    });
  }

  resolver(n) {
    if (this.cerrada) return;
    const a = this.enJuego;
    const regla = APUESTAS_RULETA[a.tipo];
    const gana = regla.gana(n, a.numero);
    const color = n === 0 ? 'VERDE' : ROJOS.has(n) ? 'ROJO' : 'NEGRO';
    this.resultadoTxt.setText(`${n}`).setColor(n === 0 ? '#8fd694' : ROJOS.has(n) ? '#ff6a6a' : '#f2efe6');
    if (gana) {
      const pago = a.cuanto * (regla.paga + 1);
      this.pagar(pago);
      Audio.notes([523.25, 659.25, 783.99], 0.08);
      this.decir(`${n} ${color}. ¡Ganas ${pago - a.cuanto} €!`, '#8fd694');
    } else {
      Audio.notes([330, 262], 0.1, 'triangle', 0.08);
      this.decir(`${n} ${color}. Pierdes ${a.cuanto} €`, '#d9584a');
    }
    this.enJuego = null;
    this.girando = false;
    this.bloqueaApuesta = false;
    this.bGirar.setActivo(true);
    this.refrescar();
  }

  // levantarse con la bola rodando: la tirada se resuelve igual
  cerrar() {
    if (this.girando && this.enJuego) {
      if (this.tw) this.tw.stop();
      const a = this.enJuego;
      const regla = APUESTAS_RULETA[a.tipo];
      if (regla.gana(a.sale, a.numero)) this.pagar(a.cuanto * (regla.paga + 1));
      this.enJuego = null;
    }
    super.cerrar();
  }
}
