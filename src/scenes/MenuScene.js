import { SaveSystem } from '../core/SaveSystem.js';
import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { COLORS } from '../config/balance.js';

const FONT = 'Consolas, "Courier New", monospace';
const TITULO = 'Anton, Impact, sans-serif';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.haySave = SaveSystem.hasSave();

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x07080a);

    this.skyline(w, h);

    // el titulo tiene que leerse limpio por encima del perfil de la ciudad
    this.add.image(0, h * 0.5, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h * 0.5).setTint(0x000000).setAlpha(0.62);
    for (let i = 0; i < 9; i++) {
      this.add.image(w / 2, h * 0.31, 'px')
        .setDisplaySize(w, 190 - i * 18)
        .setTint(0x05060a)
        .setAlpha(0.14);
    }

    const titulo = this.add.text(w / 2, h * 0.3, 'S A N T A   P E R D I D A', {
      fontFamily: TITULO, fontSize: '76px', color: '#e8b54a',
    }).setOrigin(0.5).setAlpha(0);

    this.add.text(w / 2, h * 0.3 + 52, 'aqui nadie pregunta de donde vienes', {
      fontFamily: FONT, fontSize: '16px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.tweens.add({ targets: titulo, alpha: 1, duration: 1100, ease: 'Sine.out' });
    this.tweens.add({
      targets: titulo, y: h * 0.3 - 6,
      duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    this.opciones = [
      { label: 'NUEVA PARTIDA', accion: () => this.empezar(true) },
      { label: 'CONTINUAR', accion: () => this.empezar(false), requiereSave: true },
      { label: 'CONTROLES', accion: () => this.verControles() },
    ];

    this.indice = this.haySave ? 1 : 0;
    this.items = this.opciones.map((op, i) => {
      const activo = !op.requiereSave || this.haySave;
      return this.add.text(w / 2, h * 0.56 + i * 44, op.label, {
        fontFamily: TITULO, fontSize: '30px',
        color: activo ? COLORS.ink : '#4a463e',
      }).setOrigin(0.5).setInteractive({ useHandCursor: activo })
        .on('pointerover', () => { if (activo) { this.indice = i; this.pintar(); } })
        .on('pointerdown', () => { if (activo) this.elegir(); });
    });

    this.cursor = this.add.text(0, 0, '>', {
      fontFamily: FONT, fontSize: '24px', color: '#e8b54a',
    }).setOrigin(0.5);

    this.ayuda = this.add.text(w / 2, h - 34, 'Flechas o raton para elegir  ·  ENTER para entrar', {
      fontFamily: FONT, fontSize: '14px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.pintar();

    const teclas = this.input.keyboard.addKeys({
      arriba: 'UP', abajo: 'DOWN', w: 'W', s: 'S', entrar: 'ENTER', espacio: 'SPACE',
    });
    this.teclas = teclas;
    this.input.keyboard.addCapture('UP,DOWN,W,S,ENTER,SPACE');

    const despertar = () => { Audio.start(); Audio.resume(); };
    this.input.keyboard.once('keydown', despertar);
    this.input.once('pointerdown', despertar);
  }

  // perfil de ciudad dibujado con rectangulos, para que el menu no sea un vacio
  skyline(w, h) {
    let x = -20;
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    while (x < w + 40) {
      const ancho = 30 + rnd() * 70;
      const alto = 90 + rnd() * 240;
      const tono = 0x14171d + Math.floor(rnd() * 3) * 0x040406;
      this.add.image(x, h * 0.62, 'px').setOrigin(0, 1)
        .setDisplaySize(ancho, alto).setTint(tono);

      const filas = Math.floor(alto / 26);
      const cols = Math.floor(ancho / 18);
      for (let f = 0; f < filas; f++) {
        for (let c = 0; c < cols; c++) {
          if (rnd() > 0.33) continue;
          this.add.image(x + 9 + c * 18, h * 0.62 - 16 - f * 26, 'px')
            .setDisplaySize(6, 8).setTint(0xe8c479).setAlpha(0.25 + rnd() * 0.5);
        }
      }
      x += ancho + 4;
    }
  }

  pintar() {
    this.items.forEach((item, i) => {
      const activo = !this.opciones[i].requiereSave || this.haySave;
      const elegido = i === this.indice;
      item.setColor(!activo ? '#4a463e' : elegido ? '#e8b54a' : COLORS.ink);
      item.setScale(elegido ? 1.06 : 1);
    });
    const sel = this.items[this.indice];
    this.cursor.setPosition(sel.x - sel.width / 2 - 26, sel.y);
  }

  mover(paso) {
    for (let i = 0; i < this.opciones.length; i++) {
      this.indice = (this.indice + paso + this.opciones.length) % this.opciones.length;
      const op = this.opciones[this.indice];
      if (!op.requiereSave || this.haySave) break;
    }
    this.pintar();
    Audio.notes([440], 0.05, 'triangle', 0.06);
  }

  elegir() {
    const op = this.opciones[this.indice];
    if (op.requiereSave && !this.haySave) return;
    Audio.notes([523.25, 659.25], 0.08, 'triangle', 0.09);
    op.accion();
  }

  verControles() {
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
      return;
    }
    const w = this.scale.width;
    const h = this.scale.height;
    const texto = [
      'WASD / flechas    moverte y conducir',
      'SHIFT             correr',
      'E                 subir o bajar del coche',
      'E junto al piso   descansar y guardar',
      'ESPACIO           freno de mano',
      'J                 pedir otro encargo',
      'K                 guardar',
      'M                 sonido',
    ].join('\n');

    this.panel = this.add.container(w / 2, h / 2);
    const fondo = this.add.image(0, 0, 'px')
      .setDisplaySize(560, 260).setTint(0x0d1014).setAlpha(0.95);
    const cuerpo = this.add.text(0, 0, texto, {
      fontFamily: FONT, fontSize: '16px', color: COLORS.ink, align: 'left', lineSpacing: 8,
    }).setOrigin(0.5);
    this.panel.add([fondo, cuerpo]);
  }

  empezar(nueva) {
    if (nueva) {
      SaveSystem.clear();
      GameState.reset();
    }
    this.cameras.main.fadeOut(420, 0, 0, 0);
    this.time.delayedCall(450, () => {
      this.scene.start('CityScene');
    });
  }

  update() {
    const k = this.teclas;
    if (Phaser.Input.Keyboard.JustDown(k.arriba) || Phaser.Input.Keyboard.JustDown(k.w)) {
      this.mover(-1);
    }
    if (Phaser.Input.Keyboard.JustDown(k.abajo) || Phaser.Input.Keyboard.JustDown(k.s)) {
      this.mover(1);
    }
    if (Phaser.Input.Keyboard.JustDown(k.entrar) || Phaser.Input.Keyboard.JustDown(k.espacio)) {
      this.elegir();
    }
  }
}
