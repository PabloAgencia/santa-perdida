import { COLORS } from '../config/balance.js';
import { Audio } from '../core/Audio.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

const COLOR_ETIQUETA = {
  'MUY BUENA': '#8fd694',
  BUENA: '#c8dc8a',
  NORMAL: '#c9c3b4',
  FLOJA: '#d9584a',
};

// LA LIBRETA DEL MERCADO. Tecla L: dice donde pagan mejor los coches ahora
// mismo, para decidir adonde llevar el que llevas antes de venderlo. No
// vende nada desde aqui: eso se hace en persona, en el desguace (MercadoSystem).
export class MercadoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MercadoScene', active: false });
  }

  init(datos) {
    this.filas = datos?.filas ?? [];
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    Audio.menuOpen();

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.93);

    this.add.text(w / 2, h / 2 - 190, 'LIBRETA DEL DESGUACE', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 6,
      fontSize: '26px', color: '#e8b54a',
    }).setOrigin(0.5);

    this.add.text(w / 2, h / 2 - 150, 'donde pagan mejor los coches ahora mismo', {
      fontFamily: FONT, fontSize: '14px', color: COLORS.dim,
    }).setOrigin(0.5);

    const anchoFila = 460;
    const y0 = h / 2 - 90;
    if (this.filas.length === 0) {
      this.add.text(w / 2, y0 + 20, 'No hay desguaces descubiertos todavia', {
        fontFamily: FONT, fontSize: '15px', color: COLORS.dim,
      }).setOrigin(0.5);
    } else {
      this.filas.forEach((f, i) => this.fila(w / 2, y0 + i * 46, anchoFila, f));
    }

    this.add.text(w / 2, y0 + this.filas.length * 46 + 30, 'L o ESC para cerrar', {
      fontFamily: FONT, fontSize: '15px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.teclas = this.input.keyboard.addKeys({ libreta: 'L', salir: 'ESC' });
    this.input.keyboard.addCapture('L,ESC');
  }

  fila(cx, y, ancho, f) {
    this.add.text(cx - ancho / 2, y, f.zona, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '17px', color: COLORS.ink,
    }).setOrigin(0, 0.5);

    this.add.text(cx + ancho / 2, y, f.etiqueta, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '17px', color: COLOR_ETIQUETA[f.etiqueta] || COLORS.dim,
    }).setOrigin(1, 0.5);

    this.add.text(cx + 30, y, `${f.tiles} m`, {
      fontFamily: FONT, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0, 0.5);
  }

  cerrar() {
    Audio.menuClose();
    this.scene.stop();
    this.scene.resume('UIScene');
    this.scene.resume('CityScene');
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.teclas.libreta) ||
        Phaser.Input.Keyboard.JustDown(this.teclas.salir)) {
      this.cerrar();
    }
  }
}
