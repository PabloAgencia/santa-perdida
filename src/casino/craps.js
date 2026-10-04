import { Audio } from '../core/Audio.js';
import { Mesa, texto } from './comun.js';

// CRAPS, la apuesta de LINEA DE PASE, que es la de toda la vida:
//   · primera tirada: 7 u 11 ganas; 2, 3 o 12 pierdes ("craps")
//   · cualquier otro numero pasa a ser el PUNTO, y se sigue tirando:
//     si sale el punto antes que un 7 ganas, si sale el 7 antes, pierdes
//   · paga 1 a 1 (ventaja de la casa: 1,4%, como en un casino de verdad)
// La apuesta se pone solo antes de la primera tirada.
export function resolverTirada(punto, suma) {
  if (punto === null) {
    if (suma === 7 || suma === 11) return 'gana';
    if (suma === 2 || suma === 3 || suma === 12) return 'pierde';
    return 'punto';
  }
  if (suma === punto) return 'gana';
  if (suma === 7) return 'pierde';
  return 'sigue';
}

const PUNTOS_DADO = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

export class Craps extends Mesa {
  constructor(scene) {
    super(scene, { titulo: 'CRAPS', tapete: 0x1f4a6a, apuestaMax: 5000 });
    const { cx, cy } = this;
    this.add(texto(scene, cx, cy - 190, 'LINEA DE PASE  ·  7 u 11 GANA  ·  2, 3, 12 PIERDE  ·  SI NO, EL PUNTO ANTES QUE EL 7', 14, '#e8c860'));
    this.puntoTxt = this.add(texto(scene, cx, cy - 140, '', 26));
    this.sumaTxt = this.add(texto(scene, cx, cy + 80, '', 30));
    this.dados = [this.crearDado(cx - 60, cy - 20), this.crearDado(cx + 60, cy - 20)];
    this.pintarDado(this.dados[0], 6);
    this.pintarDado(this.dados[1], 1);
    this.bTirar = this.boton(cx + 290, cy + this.alto / 2 - 42, 170, 44, 'TIRAR', () => this.tirar(), { tecla: 'ENTER' });
    this.punto = null;
    this.enJuego = 0;
    this.rodando = false;
    this.pintarPunto();
    this.decir('Elige la apuesta y tira los dados');
  }

  crearDado(x, y) {
    const cont = this.scene.add.container(x, y);
    cont.add(this.scene.add.image(4, 5, 'px').setDisplaySize(76, 76).setTint(0x05060a).setAlpha(0.4));
    cont.add(this.scene.add.image(0, 0, 'px').setDisplaySize(76, 76).setTint(0xf7f4ec));
    cont.puntos = [];
    this.add(cont);
    return cont;
  }

  pintarDado(d, n) {
    for (const p of d.puntos) p.destroy();
    d.puntos = PUNTOS_DADO[n].map(([px, py]) => {
      const c = this.scene.add.circle(px * 20, py * 20, 7, 0x15181d);
      d.add(c);
      return c;
    });
  }

  pintarPunto() {
    this.puntoTxt.setText(this.punto === null ? 'PRIMERA TIRADA' : `EL PUNTO ES ${this.punto}`);
    this.puntoTxt.setColor(this.punto === null ? '#c8c0a8' : '#e8c860');
  }

  tirar() {
    if (this.rodando) return;
    if (this.punto === null) {
      if (!this.cobrarApuesta()) return;
      this.enJuego = this.apuesta;
      this.bloqueaApuesta = true;
      this.refrescar();
    }
    this.rodando = true;
    this.bTirar.setActivo(false);
    const a = Phaser.Math.Between(1, 6);
    const b = Phaser.Math.Between(1, 6);
    // se agitan un rato y caen
    let n = 0;
    const ev = this.scene.time.addEvent({
      delay: 70, repeat: 10,
      callback: () => {
        if (this.cerrada) return;
        n++;
        const ult = n > 10;
        this.pintarDado(this.dados[0], ult ? a : Phaser.Math.Between(1, 6));
        this.pintarDado(this.dados[1], ult ? b : Phaser.Math.Between(1, 6));
        this.dados.forEach((d, i) => d.setAngle(ult ? (i ? 8 : -6) : Phaser.Math.Between(-30, 30)));
        Audio.notes([200 + Math.random() * 120], 0.02, 'square', 0.03);
        if (ult) this.resolver(a + b);
      },
    });
    this.ev = ev;
  }

  resolver(suma) {
    this.rodando = false;
    this.bTirar.setActivo(true);
    this.sumaTxt.setText(`${suma}`);
    const r = resolverTirada(this.punto, suma);
    if (r === 'punto') {
      this.punto = suma;
      this.decir(`Sale ${suma}: es el punto. Ahora tiene que salir antes que el 7`, '#e8c860');
    } else if (r === 'sigue') {
      this.decir(`Sale ${suma}. Sigue tirando: buscas el ${this.punto}`, '#e6e1d4');
    } else if (r === 'gana') {
      this.pagar(this.enJuego * 2);
      Audio.notes([523.25, 659.25, 783.99], 0.08);
      this.decir(`¡Sale ${suma}! Ganas ${this.enJuego} €`, '#8fd694');
      this.terminarRonda();
    } else {
      Audio.notes([330, 262], 0.1, 'triangle', 0.08);
      this.decir(suma === 7 && this.punto !== null ? `Siete. Pierdes ${this.enJuego} €` : `Craps (${suma}). Pierdes ${this.enJuego} €`, '#d9584a');
      this.terminarRonda();
    }
    this.pintarPunto();
  }

  terminarRonda() {
    this.punto = null;
    this.enJuego = 0;
    this.bloqueaApuesta = false;
    this.refrescar();
  }

  // levantarse con un punto en juego: se sigue tirando solo hasta resolverlo
  // (en la linea de pase la apuesta no se puede retirar)
  cerrar() {
    if (this.ev) this.ev.remove(false);
    if (this.enJuego > 0) {
      let punto = this.punto;
      for (let i = 0; i < 1000; i++) {
        const suma = Phaser.Math.Between(1, 6) + Phaser.Math.Between(1, 6);
        const r = resolverTirada(punto, suma);
        if (r === 'punto') { punto = suma; continue; }
        if (r === 'gana') { this.pagar(this.enJuego * 2); break; }
        if (r === 'pierde') break;
      }
      this.enJuego = 0;
    }
    super.cerrar();
  }
}
