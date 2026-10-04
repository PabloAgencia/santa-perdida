import { Audio } from '../core/Audio.js';
import { Mesa, texto } from './comun.js';

// LA TRAGAPERRAS: tres rodillos, como las de San Andreas. Cada rodillo es
// independiente y cada figura sale con su peso (de 20). La tabla esta
// calculada para devolver el 93,1% de lo que se mete (lo normal en una
// maquina de casino), medido sumando las 6^3 combinaciones con sus pesos,
// no a ojo. Si se toca un peso o un premio, hay que volver a medirlo.
export const PESOS_RODILLO = { siete: 1, bar: 2, campana: 3, limon: 5, cereza: 3, nada: 6 };
export const TRES_IGUALES = { siete: 100, bar: 30, campana: 16, cereza: 12, limon: 8 };

// lo que devuelve una tirada, en veces la apuesta (apuesta incluida)
export function premioTragaperras(a, b, c) {
  if (a === b && b === c && TRES_IGUALES[a]) return TRES_IGUALES[a];
  const cerezas = [a, b, c].filter((x) => x === 'cereza').length;
  if (cerezas === 2) return 6;
  if (cerezas === 1) return 1;
  return 0;
}

const TIRA = Object.entries(PESOS_RODILLO).flatMap(([s, n]) => Array(n).fill(s));
const figura = () => TIRA[Math.floor(Math.random() * TIRA.length)];

export class Tragaperras extends Mesa {
  constructor(scene) {
    super(scene, { titulo: 'TRAGAPERRAS', tapete: 0x4a1a2a, apuestaMax: 1000, ancho: 760 });
    const { cx, cy } = this;
    this.rodillos = [-1, 0, 1].map((k) => {
      const x = cx + k * 130;
      this.add(this.scene.add.image(x, cy - 40, 'px').setDisplaySize(116, 150).setTint(0xf7f4ec));
      this.add(this.scene.add.rectangle(x, cy - 40, 116, 150).setStrokeStyle(3, 0x3a2414));
      const cont = this.add(this.scene.add.container(x, cy - 40));
      return { x, cont, valor: 'siete' };
    });
    this.add(this.scene.add.image(cx, cy - 40, 'px').setDisplaySize(410, 3).setTint(0xd9384a).setAlpha(0.6));
    const lineas = [
      '7 7 7 ........ x100     BAR BAR BAR ... x30',
      'CAMPANAS ..... x16     CEREZAS x3 .... x12',
      'LIMONES ...... x8      DOS CEREZAS ... x6',
      'UNA CEREZA: te devuelve la apuesta',
    ];
    lineas.forEach((l, i) => this.add(texto(scene, cx, cy + 62 + i * 20, l, 13, '#e8c860')));
    this.bTirar = this.boton(cx + 250, cy + this.alto / 2 - 42, 170, 44, 'TIRAR', () => this.tirar(), { tecla: 'ENTER' });
    this.rodillos.forEach((r) => this.pintarFigura(r, ['siete', 'bar', 'cereza'][this.rodillos.indexOf(r)]));
    this.girando = false;
    this.decir('Elige la apuesta y tira de la palanca');
  }

  pintarFigura(r, s) {
    r.valor = s;
    r.cont.removeAll(true);
    const sc = this.scene;
    const add = (o) => r.cont.add(o);
    if (s === 'siete') {
      add(sc.add.text(0, 0, '7', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '84px', color: '#c8202a', stroke: '#5a0a10', strokeThickness: 6 }).setOrigin(0.5));
    } else if (s === 'bar') {
      add(sc.add.image(0, 0, 'px').setDisplaySize(90, 40).setTint(0x15181d));
      add(sc.add.text(0, 0, 'BAR', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '28px', color: '#e8c860' }).setOrigin(0.5));
    } else if (s === 'campana') {
      add(sc.add.triangle(0, -6, -30, 26, 30, 26, 0, -30, 0xe8b54a));
      add(sc.add.circle(0, -18, 18, 0xe8b54a));
      add(sc.add.circle(0, 28, 7, 0xa8761a));
    } else if (s === 'limon') {
      add(sc.add.ellipse(0, 0, 76, 52, 0xf2d84a));
      add(sc.add.ellipse(-10, -8, 26, 14, 0xfff2a0));
    } else if (s === 'cereza') {
      add(sc.add.image(4, -22, 'px').setDisplaySize(4, 40).setTint(0x3d7a3f).setRotation(0.4));
      add(sc.add.image(-6, -22, 'px').setDisplaySize(4, 40).setTint(0x3d7a3f).setRotation(-0.4));
      add(sc.add.circle(-16, 14, 18, 0xc8202a));
      add(sc.add.circle(16, 14, 18, 0xc8202a));
      add(sc.add.circle(-21, 8, 5, 0xff8a8a));
    } else {
      add(sc.add.text(0, 0, '-', { fontFamily: 'Arial, sans-serif', fontSize: '40px', color: '#c8c0a8' }).setOrigin(0.5));
    }
  }

  tirar() {
    if (this.girando) return;
    if (!this.cobrarApuesta()) return;
    this.girando = true;
    this.bloqueaApuesta = true;
    this.bTirar.setActivo(false);
    this.refrescar();
    const final = [figura(), figura(), figura()];
    this.enJuego = { cuanto: this.apuesta, final };
    this.decir('');
    // cada rodillo da vueltas y se para uno detras de otro
    this.rodillos.forEach((r, i) => {
      const vueltas = 8 + i * 6;
      let n = 0;
      this.scene.time.addEvent({
        delay: 60, repeat: vueltas,
        callback: () => {
          if (this.cerrada) return;
          n++;
          const ult = n > vueltas;
          this.pintarFigura(r, ult ? final[i] : TIRA[Math.floor(Math.random() * TIRA.length)]);
          if (ult) {
            Audio.notes([440 + i * 110], 0.05);
            if (i === 2) this.resolver();
          }
        },
      });
    });
  }

  resolver() {
    const a = this.enJuego;
    if (!a) return;
    const x = premioTragaperras(...a.final);
    const pago = a.cuanto * x;
    this.pagar(pago);
    if (x > 1) {
      Audio.notes([523.25, 659.25, 783.99, 1046.5], 0.08);
      this.decir(`¡Premio! +${pago - a.cuanto} €`, '#8fd694');
    } else if (x === 1) {
      this.decir('Una cereza: recuperas la apuesta', '#e6e1d4');
    } else {
      this.decir(`Nada. -${a.cuanto} €`, '#d9584a');
    }
    this.enJuego = null;
    this.girando = false;
    this.bloqueaApuesta = false;
    this.bTirar.setActivo(true);
    this.refrescar();
  }

  cerrar() {
    if (this.enJuego) this.resolver();
    super.cerrar();
  }
}
