import { Audio } from '../core/Audio.js';
import { Mesa, texto, nuevaBaraja, dibujarCarta } from './comun.js';

// VIDEOPOKER "JOTAS O MAS" (Jacks or Better), el de las maquinas de San
// Andreas y de cualquier casino: cinco cartas, eliges cuales te quedas, se
// cambian las demas una sola vez, y se cobra segun la jugada final. Tabla
// 9/6, la clasica (devuelve el 99,5% jugando perfecto). El premio es lo que
// devuelve la maquina, apuesta incluida: la pareja de jotas devuelve justo
// lo apostado.
export const TABLA_POKER = [
  { clave: 'escalera-real', nombre: 'ESCALERA REAL', paga: 250 },
  { clave: 'escalera-color', nombre: 'ESCALERA DE COLOR', paga: 50 },
  { clave: 'poker', nombre: 'POKER', paga: 25 },
  { clave: 'full', nombre: 'FULL', paga: 9 },
  { clave: 'color', nombre: 'COLOR', paga: 6 },
  { clave: 'escalera', nombre: 'ESCALERA', paga: 4 },
  { clave: 'trio', nombre: 'TRIO', paga: 3 },
  { clave: 'doble-pareja', nombre: 'DOBLE PAREJA', paga: 2 },
  { clave: 'jotas', nombre: 'PAREJA DE J O MAS', paga: 1 },
];

// que jugada es una mano de cinco cartas (null si ninguna que pague)
export function jugadaPoker(cartas) {
  const vs = cartas.map((c) => c.v).sort((a, b) => a - b);
  const color = cartas.every((c) => c.palo === cartas[0].palo);
  const unicos = [...new Set(vs)];
  let escalera = unicos.length === 5 && vs[4] - vs[0] === 4;
  // la escalera baja: A-2-3-4-5
  if (!escalera && unicos.length === 5 && vs[4] === 14 && vs[3] === 5) escalera = true;
  const cuentas = {};
  for (const v of vs) cuentas[v] = (cuentas[v] || 0) + 1;
  const grupos = Object.values(cuentas).sort((a, b) => b - a);

  if (escalera && color && vs[0] === 10) return 'escalera-real';
  if (escalera && color) return 'escalera-color';
  if (grupos[0] === 4) return 'poker';
  if (grupos[0] === 3 && grupos[1] === 2) return 'full';
  if (color) return 'color';
  if (escalera) return 'escalera';
  if (grupos[0] === 3) return 'trio';
  if (grupos[0] === 2 && grupos[1] === 2) return 'doble-pareja';
  if (grupos[0] === 2) {
    const pareja = Number(Object.keys(cuentas).find((v) => cuentas[v] === 2));
    if (pareja >= 11) return 'jotas';
  }
  return null;
}

export class VideoPoker extends Mesa {
  constructor(scene) {
    super(scene, { titulo: 'VIDEOPOKER · JOTAS O MAS', tapete: 0x1a2a5a, apuestaMax: 1000 });
    const { cx, cy } = this;
    // la tabla de premios, arriba
    this.filasTabla = TABLA_POKER.map((f, i) => {
      const col = i < 5 ? 0 : 1;
      const fila = i < 5 ? i : i - 5;
      const x = cx - 300 + col * 330;
      const y = cy - 190 + fila * 22;
      const n = this.add(texto(scene, x, y, f.nombre, 14, '#e8c860', 0));
      const p = this.add(texto(scene, x + 270, y, `x${f.paga}`, 14, '#e8c860', 1));
      return { clave: f.clave, n, p };
    });
    this.cartas = [];
    this.guardadas = [false, false, false, false, false];
    this.dibujos = [];
    this.marcas = [];
    this.estado = 'apostando';
    this.bRepartir = this.boton(cx + 290, cy + this.alto / 2 - 42, 190, 44, 'REPARTIR', () => this.accion(), { tecla: 'ENTER' });
    this.add(texto(scene, cx, cy + 110, 'Toca una carta (o 1-5) para quedartela, y CAMBIAR', 14, '#c8c0a8'));
    this.pintar();
    this.decir('Elige la apuesta y reparte');
  }

  xCarta(i) {
    return this.cx + (i - 2) * 96;
  }

  pintar() {
    for (const d of this.dibujos) d.destroy();
    for (const m of this.marcas) m.destroy();
    this.dibujos = [];
    this.marcas = [];
    for (let i = 0; i < 5; i++) {
      const x = this.xCarta(i);
      const y = this.cy + 20;
      const c = this.cartas[i];
      const d = dibujarCarta(this.scene, x, y, c, !c, 1.25);
      this.add(d);
      this.dibujos.push(d);
      // tocar la carta = quedartela
      const zona = this.scene.add.zone(x, y, 76, 104).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.alternar(i));
      this.add(zona);
      this.dibujos.push(zona);
      if (this.guardadas[i]) {
        const m = this.add(texto(this.scene, x, y - 70, 'TE LA QUEDAS', 13, '#8fd694'));
        this.marcas.push(m);
      }
    }
  }

  alternar(i) {
    if (this.estado !== 'eligiendo') return;
    this.guardadas[i] = !this.guardadas[i];
    Audio.menuMove();
    this.pintar();
  }

  accion() {
    if (this.estado === 'apostando') this.repartir();
    else if (this.estado === 'eligiendo') this.cambiar();
  }

  repartir() {
    if (!this.cobrarApuesta()) return;
    this.enJuego = this.apuesta;
    this.baraja = nuevaBaraja(1);
    this.cartas = [0, 1, 2, 3, 4].map(() => this.baraja.pop());
    this.guardadas = [false, false, false, false, false];
    this.estado = 'eligiendo';
    this.bloqueaApuesta = true;
    this.bRepartir.setTexto('CAMBIAR');
    this.resaltar(jugadaPoker(this.cartas));
    this.pintar();
    this.refrescar();
    Audio.notes([523.25], 0.05);
    this.decir('Quedate las que quieras y CAMBIA el resto');
  }

  cambiar() {
    for (let i = 0; i < 5; i++) if (!this.guardadas[i]) this.cartas[i] = this.baraja.pop();
    this.guardadas = [false, false, false, false, false];
    this.pintar();
    const j = jugadaPoker(this.cartas);
    this.resaltar(j);
    const fila = TABLA_POKER.find((f) => f.clave === j);
    if (fila) {
      const pago = this.enJuego * fila.paga;
      this.pagar(pago);
      Audio.notes([523.25, 659.25, 783.99], 0.08);
      this.decir(fila.paga === 1 ? `${fila.nombre}: recuperas la apuesta` : `${fila.nombre}: ¡+${pago - this.enJuego} €!`,
        fila.paga === 1 ? '#e6e1d4' : '#8fd694');
    } else {
      Audio.notes([330, 262], 0.1, 'triangle', 0.08);
      this.decir(`Nada. Pierdes ${this.enJuego} €`, '#d9584a');
    }
    this.estado = 'apostando';
    this.enJuego = 0;
    this.bloqueaApuesta = false;
    this.bRepartir.setTexto('REPARTIR');
    this.refrescar();
  }

  resaltar(clave) {
    for (const f of this.filasTabla) {
      const si = f.clave === clave;
      f.n.setColor(si ? '#f2efe6' : '#e8c860').setScale(si ? 1.12 : 1);
      f.p.setColor(si ? '#f2efe6' : '#e8c860');
    }
  }

  update(dt) {
    super.update(dt);
    if (this.cerrada) return;
    ['uno', 'dos', 'tres', 'cuatro', 'cinco'].forEach((k, i) => { if (this.pulsada(k)) this.alternar(i); });
  }

  // levantarse con la mano a medias: se cambia con lo que tengas guardado
  cerrar() {
    if (this.estado === 'eligiendo') {
      for (let i = 0; i < 5; i++) if (!this.guardadas[i]) this.cartas[i] = this.baraja.pop();
      const fila = TABLA_POKER.find((f) => f.clave === jugadaPoker(this.cartas));
      if (fila) this.pagar(this.enJuego * fila.paga);
      this.estado = 'apostando';
    }
    super.cerrar();
  }
}
