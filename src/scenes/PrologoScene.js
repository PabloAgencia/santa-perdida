import { GameState } from '../core/GameState.js';
import { SaveSystem } from '../core/SaveSystem.js';
import { Audio } from '../core/Audio.js';
import { COLORS } from '../config/balance.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';
const TITULO = 'Pricedown, Anton, Impact, sans-serif';

// LA PRIMERA VEZ, Y SOLO LA PRIMERA VEZ, que se empieza una partida de cero:
// planta la premisa de HISTORIA-SANTA-PERDIDA.txt antes de soltar al
// jugador en la ciudad. Tres pantallas, se avanza con ENTER/ESPACIO/click,
// y la ultima es la escena de por que el jugador se llama "Cero" en boca de
// todo el mundo a partir de ahora. `GameState.flags.prologoVisto` hace que
// esto no se repita nunca mas en esa partida.
const PANTALLAS = [
  {
    titulo: 'SANTA PERDIDA',
    cuerpo:
      'Nadie recuerda el nombre de la santa que se hundio en la bocana la\n' +
      'noche antes de bendecir el pueblo. Desde entonces la ciudad reza sin\n' +
      'saber muy bien a quien.',
  },
  {
    titulo: 'TRES BANDAS',
    cuerpo:
      'Los Amarres mandan en el puerto. La Cuadrilla del Rompiente, en el\n' +
      'barrio que nadie mas quiso. Casa Verdial, en el dinero viejo del\n' +
      'centro. Ninguna de las tres pregunta de donde vienes, mientras\n' +
      'trabajes.',
  },
  {
    titulo: '¿COMO TE LLAMAS?',
    cuerpo:
      'El Consul te mira, esperando una respuesta que no llega.\n' +
      'Se encoge de hombros.\n\n' +
      '"Como quieras. Aqui todos empezamos en cero."\n\n' +
      'Desde hoy, aqui eres CERO.',
  },
];

export class PrologoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PrologoScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.indice = 0;

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.96);

    this.titulo = this.add.text(w / 2, h * 0.4, '', {
      fontFamily: TITULO, stroke: '#05060a', strokeThickness: 8,
      fontSize: '44px', color: '#e8b54a',
    }).setOrigin(0.5);

    this.cuerpo = this.add.text(w / 2, h * 0.4 + 60, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2,
      fontSize: '18px', color: COLORS.ink, align: 'center', lineSpacing: 10,
    }).setOrigin(0.5, 0);

    this.ayuda = this.add.text(w / 2, h - 44, 'ENTER o clic para continuar', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2,
      fontSize: '14px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.teclas = this.input.keyboard.addKeys({ entrar: 'ENTER', espacio: 'SPACE' });
    this.input.keyboard.addCapture('ENTER,SPACE');
    this.input.on('pointerdown', () => this.avanzar());

    this.pintar();
  }

  pintar() {
    const p = PANTALLAS[this.indice];
    this.titulo.setAlpha(0).setText(p.titulo);
    this.cuerpo.setAlpha(0).setText(p.cuerpo);
    this.tweens.add({
      targets: [this.titulo, this.cuerpo], alpha: 1, duration: 380, ease: 'Sine.out',
    });
    this.ayuda.setText(
      this.indice === PANTALLAS.length - 1 ? 'ENTER o clic para empezar' : 'ENTER o clic para continuar'
    );
    Audio.menuMove();
  }

  avanzar() {
    this.indice++;
    if (this.indice >= PANTALLAS.length) {
      this.cerrar();
      return;
    }
    this.pintar();
  }

  cerrar() {
    Audio.menuSelect();
    GameState.flags.prologoVisto = true;
    SaveSystem.save();
    this.scene.stop();
    this.scene.resume('UIScene');
    this.scene.resume('CityScene');
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.teclas.entrar) ||
        Phaser.Input.Keyboard.JustDown(this.teclas.espacio)) {
      this.avanzar();
    }
  }
}
