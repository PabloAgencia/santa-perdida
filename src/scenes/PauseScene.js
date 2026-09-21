import { SaveSystem } from '../core/SaveSystem.js';
import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { COLORS } from '../config/balance.js';
import { EventBus, EVT } from '../core/EventBus.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// Menu de pausa. Se abre con ESC mientras juegas y sirve para guardar, empezar
// de cero o volver al menu principal sin tener que recargar la pagina.
export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.72);

    this.add.image(w / 2, h / 2, 'px')
      .setDisplaySize(440, 340).setTint(0x0d1014).setAlpha(0.95);

    this.add.text(w / 2, h / 2 - 140, 'PAUSA', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 6,
      fontSize: '46px', color: '#e8b54a',
    }).setOrigin(0.5);

    this.opciones = [
      { label: 'SEGUIR JUGANDO', accion: () => this.reanudar() },
      { label: `GUARDAR EN LA ${SaveSystem.ranura}`, accion: () => this.guardar() },
      { label: 'CAMBIAR DE PARTIDA', accion: () => this.aLasRanuras() },
      { label: 'EMPEZAR DE CERO AQUI', accion: () => this.nueva() },
      { label: 'CONTROLES', accion: () => this.controles() },
      { label: 'VOLVER AL MENU', accion: () => this.alMenu() },
    ];

    this.indice = 0;
    this.items = this.opciones.map((op, i) =>
      this.add.text(w / 2, h / 2 - 72 + i * 42, op.label, {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 4,
        fontSize: '26px', color: COLORS.ink,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerover', () => { this.indice = i; this.pintar(); })
        .on('pointerdown', () => this.elegir())
    );

    this.cursor = this.add.text(0, 0, '>', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '22px', color: '#e8b54a',
    }).setOrigin(0.5);

    this.aviso = this.add.text(w / 2, h / 2 + 148, 'ESC para seguir jugando', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2,
      fontSize: '14px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.panel = null;
    this.confirmando = false;
    this.pintar();

    this.teclas = this.input.keyboard.addKeys({
      arriba: 'UP', abajo: 'DOWN', w: 'W', s: 'S',
      entrar: 'ENTER', espacio: 'SPACE', salir: 'ESC',
    });
    this.input.keyboard.addCapture('UP,DOWN,W,S,ENTER,SPACE,ESC');
  }

  pintar() {
    this.items.forEach((item, i) => {
      const elegido = i === this.indice;
      item.setColor(elegido ? '#e8b54a' : COLORS.ink);
      item.setScale(elegido ? 1.06 : 1);
    });
    const sel = this.items[this.indice];
    this.cursor.setPosition(sel.x - sel.width / 2 - 24, sel.y);
  }

  mover(paso) {
    this.indice = (this.indice + paso + this.opciones.length) % this.opciones.length;
    this.confirmando = false;
    this.items[3].setText('EMPEZAR DE CERO AQUI');
    this.pintar();
    Audio.notes([440], 0.05, 'triangle', 0.06);
  }

  elegir() {
    Audio.notes([523.25, 659.25], 0.08, 'triangle', 0.09);
    this.opciones[this.indice].accion();
  }

  // ---------- acciones ----------

  reanudar() {
    this.scene.resume('CityScene');
    this.scene.resume('UIScene');
    this.scene.stop();
  }

  guardar() {
    const ok = SaveSystem.save();
    this.aviso.setColor(ok ? '#8fd694' : '#d9584a');
    this.aviso.setText(ok ? 'PARTIDA GUARDADA' : 'No se ha podido guardar');
  }

  aLasRanuras() {
    SaveSystem.save();
    this.apagarSonido();
    this.scene.stop('UIScene');
    this.scene.stop('CityScene');
    this.scene.stop();
    this.scene.start('SlotsScene');
  }

  // pide confirmacion: borrar la partida sin querer seria una faena
  nueva() {
    if (!this.confirmando) {
      this.confirmando = true;
      this.items[3].setText(`¿SEGURO? BORRA LA PARTIDA ${SaveSystem.ranura}`);
      this.aviso.setColor(COLORS.danger);
      this.aviso.setText('Vuelve a pulsar para empezar de cero en esta ranura');
      this.pintar();
      return;
    }
    SaveSystem.clear();
    GameState.reset();
    this.apagarSonido();
    this.scene.stop('UIScene');
    this.scene.stop('CityScene');
    this.scene.stop();
    this.scene.start('CityScene');
  }

  controles() {
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
      return;
    }
    const texto = [
      'WASD / flechas    moverte y conducir',
      'SHIFT             correr',
      'E                 subir o bajar del coche',
      'E en un marcador  hablar o entrar',
      'ESPACIO           freno de mano',
      'J                 pedir otro encargo',
      'K                 guardar',
      'M                 sonido',
      'ESC               pausa',
    ].join('\n');

    this.panel = this.add.container(this.scale.width / 2, this.scale.height / 2);
    const fondo = this.add.image(0, 0, 'px')
      .setDisplaySize(560, 300).setTint(0x0d1014).setAlpha(0.98);
    const cuerpo = this.add.text(0, 0, texto, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2,
      fontSize: '16px', color: COLORS.ink, align: 'left', lineSpacing: 8,
    }).setOrigin(0.5);
    this.panel.add([fondo, cuerpo]);
  }

  alMenu() {
    SaveSystem.save();
    this.apagarSonido();
    EventBus.emit(EVT.NOTIFY, { text: '', tone: 'dim' });
    this.scene.stop('UIScene');
    this.scene.stop('CityScene');
    this.scene.stop();
    this.scene.start('MenuScene');
  }

  apagarSonido() {
    Audio.engine(false, 0, false);
    Audio.skid(0);
    Audio.siren(0);
  }

  update() {
    const k = this.teclas;
    if (this.panel) {
      // con el panel de controles abierto, cualquier tecla lo cierra
      if (Phaser.Input.Keyboard.JustDown(k.entrar) ||
          Phaser.Input.Keyboard.JustDown(k.espacio) ||
          Phaser.Input.Keyboard.JustDown(k.salir)) {
        this.controles();
      }
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(k.arriba) || Phaser.Input.Keyboard.JustDown(k.w)) {
      this.mover(-1);
    }
    if (Phaser.Input.Keyboard.JustDown(k.abajo) || Phaser.Input.Keyboard.JustDown(k.s)) {
      this.mover(1);
    }
    if (Phaser.Input.Keyboard.JustDown(k.entrar) || Phaser.Input.Keyboard.JustDown(k.espacio)) {
      this.elegir();
    }
    if (Phaser.Input.Keyboard.JustDown(k.salir)) this.reanudar();
  }
}
