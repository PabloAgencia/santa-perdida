import { Audio } from '../core/Audio.js';
import { Mesa, texto, ORO } from './comun.js';

// LAS CARRERAS DE CABALLOS (como "Inside Track" en las casas de apuestas de
// San Andreas, con nombres propios): seis caballos, cada carrera con sus
// cuotas. Se elige uno, se apuesta y se ve la carrera en la pantalla.
//
// Las cuotas NO son de adorno: salen de la probabilidad real de ganar de
// cada caballo en ESA carrera, menos un 15% para la casa (lo que se queda un
// hipodromo de verdad en la apuesta mutua). El ganador se sortea con esas
// mismas probabilidades antes de salir: el favorito gana mas a menudo, pero
// paga poco.
const NOMBRES = [
  'Tia Paca', 'El Notario', 'Ultima Copa', 'Viento Sur', 'Mala Suerte', 'Relampago Gris',
  'Doña Hipoteca', 'Sin Prisa', 'El Cuñado', 'Rayo de Lunes', 'Pura Sangria', 'Nunca Llega',
];
const COLORES = [0xd9384a, 0x5a8fd0, 0xe8b54a, 0x8fd694, 0xc060a0, 0xf2efe6];
const MARGEN_CASA = 0.85;
const DURACION = 8.5;  // segundos que tarda el ganador

export function nuevaCarrera() {
  const nombres = Phaser.Utils.Array.Shuffle([...NOMBRES]).slice(0, 6);
  const pesos = nombres.map(() => Math.pow(1 + Math.random() * 9, 1.4));
  const total = pesos.reduce((a, b) => a + b, 0);
  return nombres.map((nombre, i) => {
    const p = pesos[i] / total;
    return { nombre, p, cuota: Math.max(1, Math.floor((1 / p) * MARGEN_CASA - 1)), color: COLORES[i] };
  });
}

export function sortearGanador(caballos) {
  let r = Math.random();
  for (let i = 0; i < caballos.length; i++) {
    r -= caballos[i].p;
    if (r <= 0) return i;
  }
  return caballos.length - 1;
}

export class Caballos extends Mesa {
  constructor(scene) {
    super(scene, { titulo: 'CARRERAS DE CABALLOS', tapete: 0x2a3a24, apuestaMax: 5000 });
    const { cx, cy } = this;
    // la pista: seis calles en horizontal
    this.px0 = cx - 380;
    this.px1 = cx + 150;
    this.py0 = cy - 165;
    this.calle = 40;
    this.add(this.scene.add.image((this.px0 + this.px1) / 2 + 10, this.py0 + this.calle * 2.5, 'px')
      .setDisplaySize(this.px1 - this.px0 + 60, this.calle * 6 + 10).setTint(0x8a6a42));
    for (let i = 0; i <= 6; i++) {
      this.add(this.scene.add.image((this.px0 + this.px1) / 2 + 10, this.py0 - this.calle / 2 + i * this.calle, 'px')
        .setDisplaySize(this.px1 - this.px0 + 60, 2).setTint(0xf2efe6).setAlpha(0.5));
    }
    this.add(this.scene.add.image(this.px1 + 18, this.py0 + this.calle * 2.5, 'px')
      .setDisplaySize(6, this.calle * 6).setTint(0xf2efe6));
    this.add(texto(scene, this.px1 + 18, this.py0 - 38, 'META', 13, '#f2efe6'));

    this.bCaballos = [];
    this.figuras = [];
    for (let i = 0; i < 6; i++) {
      const y = this.py0 + i * this.calle;
      const f = this.crearCaballo(this.px0, y, COLORES[i]);
      this.figuras.push(f);
      this.bCaballos.push(this.boton(cx + 330, y, 200, 34, '', () => this.elegir(i), { color: 0x2a1a12, size: 13 }));
      // el color del jinete, para saber cual es en la pista
      this.add(this.scene.add.circle(cx + 218, y, 7, COLORES[i]).setStrokeStyle(2, 0x05060a));
    }
    this.bCorrer = this.boton(cx + 290, cy + this.alto / 2 - 42, 170, 44, 'APOSTAR', () => this.correr(), { tecla: 'ENTER' });
    this.elegido = 0;
    this.corriendo = false;
    this.preparar();
  }

  crearCaballo(x, y, color) {
    const c = this.scene.add.container(x, y);
    c.add(this.scene.add.ellipse(2, 6, 40, 12, 0x05060a, 0.35));
    c.add(this.scene.add.ellipse(0, 0, 36, 14, 0x5a3420));
    c.add(this.scene.add.ellipse(20, -3, 14, 8, 0x4a2a18));            // cabeza
    c.add(this.scene.add.circle(-2, -6, 6, color));                     // el jinete
    c.patas = [this.scene.add.image(-10, 8, 'px').setDisplaySize(3, 8).setTint(0x3a2414),
      this.scene.add.image(10, 8, 'px').setDisplaySize(3, 8).setTint(0x3a2414)];
    for (const p of c.patas) c.add(p);
    this.add(c);
    return c;
  }

  preparar() {
    this.caballos = nuevaCarrera();
    this.caballos.forEach((cab, i) => {
      this.bCaballos[i].setTexto(`${i + 1}. ${cab.nombre}  ${cab.cuota} a 1`);
      this.figuras[i].setPosition(this.px0, this.py0 + i * this.calle);
    });
    this.elegir(this.elegido);
    this.decir('Elige un caballo (1-6) y APUESTA. La cuota dice cuanto paga');
  }

  elegir(i) {
    if (this.corriendo) return;
    this.elegido = i;
    this.bCaballos.forEach((b, k) => b.marco.setStrokeStyle(k === i ? 4 : 2, k === i ? 0xf2efe6 : ORO, k === i ? 1 : 0.6));
  }

  correr() {
    if (this.corriendo) return;
    if (!this.cobrarApuesta()) return;
    this.corriendo = true;
    this.enJuego = { caballo: this.elegido, cuanto: this.apuesta };
    this.bloqueaApuesta = true;
    this.bCorrer.setActivo(false);
    this.refrescar();
    const ganador = sortearGanador(this.caballos);
    this.enJuego.ganador = ganador;
    // el tiempo de cada uno: el ganador el que menos; los demas, detras
    this.tiempos = this.caballos.map((_, i) => (i === ganador ? DURACION : DURACION + 0.25 + Math.random() * 1.8));
    this.ritmos = this.caballos.map(() => ({ k: 2 + Math.random() * 3, fase: Math.random() * 6 }));
    this.t = 0;
    Audio.notes([392, 523.25, 659.25, 783.99], 0.12);
    this.decir(`¡Salen! ${this.apuesta} € a ${this.caballos[this.elegido].nombre}`, '#e8c860');
  }

  update(dt) {
    super.update(dt);
    if (this.cerrada) return;
    ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'].forEach((k, i) => { if (this.pulsada(k)) this.elegir(i); });
    if (!this.corriendo) return;
    this.t += dt;
    const largo = this.px1 - this.px0;
    let todos = true;
    this.figuras.forEach((f, i) => {
      const u = Math.min(1, this.t / this.tiempos[i]);
      if (u < 1) todos = false;
      // avanza con tirones (acelera y se cansa) sin pasarse ni retroceder
      const r = this.ritmos[i];
      const tiron = 0.05 * Math.sin(u * Math.PI * r.k + r.fase) * Math.sin(u * Math.PI);
      f.x = this.px0 + largo * Phaser.Math.Clamp(u + tiron, 0, 1);
      f.y = this.py0 + i * this.calle + (u < 1 ? Math.sin(this.t * 18 + i) * 1.5 : 0);
      if (u < 1) {
        const paso = Math.sin(this.t * 20 + i) * 4;
        f.patas[0].x = -10 + paso;
        f.patas[1].x = 10 - paso;
      }
    });
    if (this.t >= DURACION && !this.anunciado) {
      this.anunciado = true;
      this.resolver();
    }
    if (todos) {
      this.corriendo = false;
      this.anunciado = false;
      this.bCorrer.setActivo(true);
      this.bloqueaApuesta = false;
      this.refrescar();
      this.scene.time.delayedCall(1800, () => { if (!this.cerrada && !this.corriendo) this.preparar(); });
    }
  }

  resolver() {
    const a = this.enJuego;
    const g = this.caballos[a.ganador];
    if (a.caballo === a.ganador) {
      const pago = a.cuanto * (g.cuota + 1);
      this.pagar(pago);
      Audio.notes([523.25, 659.25, 783.99, 1046.5], 0.09);
      this.decir(`¡Gana ${g.nombre}! Cobras ${pago} €`, '#8fd694');
    } else {
      Audio.notes([330, 262], 0.1, 'triangle', 0.08);
      this.decir(`Gana ${g.nombre} (${g.cuota} a 1). Pierdes ${a.cuanto} €`, '#d9584a');
    }
    this.enJuego = null;
  }

  // levantarse con la carrera en marcha: el resultado ya estaba sorteado
  cerrar() {
    if (this.enJuego) this.resolver();
    super.cerrar();
  }
}
