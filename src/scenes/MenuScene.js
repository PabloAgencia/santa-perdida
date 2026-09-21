import { SaveSystem } from '../core/SaveSystem.js';
import { Cloud } from '../core/Cloud.js';
import { AccountUI } from '../core/AccountUI.js';
import { Audio } from '../core/Audio.js';
import { COLORS } from '../config/balance.js';

// Pablo lo quiere todo en Pricedown, sin excepciones
const FONT = 'Pricedown, Anton, Impact, sans-serif';
const TITULO = 'Pricedown, Anton, Impact, sans-serif';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    // la instancia se reutiliza: el panel de la vez anterior ya no existe
    this.panel = null;

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
      fontFamily: TITULO, stroke: '#05060a', strokeThickness: 10, fontSize: '76px', color: '#e8b54a',
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.3 + 52, 'aqui nadie pregunta de donde vienes', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.dim,
    }).setOrigin(0.5);

    // entra rapido: con 1,1 s de fundido el menu parecia vacio al abrirlo
    titulo.setAlpha(0.35);
    this.tweens.add({ targets: titulo, alpha: 1, duration: 420, ease: 'Sine.out' });
    this.tweens.add({
      targets: titulo, y: h * 0.3 - 6,
      duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    this.opciones = [
      // atajo directo a la partida que estabas jugando
      { label: this.etiquetaSeguir(), accion: () => this.seguirDirecto() },
      { label: 'TUS PARTIDAS', accion: () => this.irARanuras() },
      { label: this.etiquetaCuenta(), accion: () => this.verCuenta() },
      { label: 'CONTROLES', accion: () => this.verControles() },
    ];

    this.indice = 0;
    this.items = this.opciones.map((op, i) =>
      this.add.text(w / 2, h * 0.56 + i * 44, op.label, {
        fontFamily: TITULO, stroke: '#05060a', strokeThickness: 4, fontSize: '30px',
        color: COLORS.ink,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerover', () => { this.indice = i; this.pintar(); })
        .on('pointerdown', () => this.elegir())
    );

    this.cursor = this.add.text(0, 0, '>', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '24px', color: '#e8b54a',
    }).setOrigin(0.5);

    this.ayuda = this.add.text(w / 2, h - 34, 'Flechas o raton para elegir  ·  ENTER para entrar', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '14px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.pintar();

    this.teclas = this.input.keyboard.addKeys({
      arriba: 'UP', abajo: 'DOWN', w: 'W', s: 'S', entrar: 'ENTER', espacio: 'SPACE',
    });
    this.input.keyboard.addCapture('UP,DOWN,W,S,ENTER,SPACE');

    const despertar = () => { Audio.start(); Audio.resume(); };
    this.input.keyboard.once('keydown', despertar);
    this.input.once('pointerdown', despertar);

    this.mirarSiVieneDelCorreo();
  }

  // si el jugador llega desde el enlace de "se me ha olvidado la contraseña",
  // lo primero que ve es la pantalla para poner una nueva
  mirarSiVieneDelCorreo() {
    const vuelta = Cloud.recogerVueltaDelCorreo();
    if (!vuelta) return;

    this.input.keyboard.enabled = false;
    if (vuelta.ok) {
      AccountUI.pintarNuevaClave();
      AccountUI.alCerrar = () => {
        this.input.keyboard.enabled = true;
        this.opciones[2].label = this.etiquetaCuenta();
        this.items[2].setText(this.opciones[2].label);
        this.pintar();
      };
    } else {
      AccountUI.abrir(() => {
        this.input.keyboard.enabled = true;
      });
      AccountUI.aviso(vuelta.mensaje, 'mal');
    }
  }

  etiquetaSeguir() {
    return SaveSystem.hasSave() ? `SEGUIR LA PARTIDA ${SaveSystem.ranura}` : 'EMPEZAR A JUGAR';
  }

  etiquetaCuenta() {
    return Cloud.conectado ? 'MI CUENTA' : 'ENTRAR CON TU CORREO';
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
      const elegido = i === this.indice;
      item.setColor(elegido ? '#e8b54a' : COLORS.ink);
      item.setScale(elegido ? 1.06 : 1);
    });
    const sel = this.items[this.indice];
    this.cursor.setPosition(sel.x - sel.width / 2 - 26, sel.y);
  }

  mover(paso) {
    this.indice = (this.indice + paso + this.opciones.length) % this.opciones.length;
    this.pintar();
    Audio.notes([440], 0.05, 'triangle', 0.06);
  }

  elegir() {
    Audio.notes([523.25, 659.25], 0.08, 'triangle', 0.09);
    this.opciones[this.indice].accion();
  }

  // ---------- opciones ----------

  seguirDirecto() {
    if (!SaveSystem.hasSave()) {
      this.irARanuras();
      return;
    }
    SaveSystem.load();
    this.cameras.main.fadeOut(420, 0, 0, 0);
    this.time.delayedCall(450, () => this.scene.start('CityScene'));
  }

  irARanuras() {
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.start('SlotsScene'));
  }

  // la pantalla de cuenta es HTML por encima del juego, asi que mientras
  // este abierta se desconecta el teclado del menu
  verCuenta() {
    this.input.keyboard.enabled = false;
    AccountUI.abrir(() => {
      this.input.keyboard.enabled = true;
      this.opciones[0].label = this.etiquetaSeguir();
      this.opciones[2].label = this.etiquetaCuenta();
      this.items[0].setText(this.opciones[0].label);
      this.items[2].setText(this.opciones[2].label);
      this.pintar();
    });
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
      'E en un marcador  hablar o entrar',
      'ESPACIO           freno de mano',
      'J                 pedir otro encargo',
      'K                 guardar',
      'M                 sonido',
      'ESC               pausa',
    ].join('\n');

    this.panel = this.add.container(w / 2, h / 2);
    const fondo = this.add.image(0, 0, 'px')
      .setDisplaySize(560, 300).setTint(0x0d1014).setAlpha(0.95);
    const cuerpo = this.add.text(0, 0, texto, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.ink, align: 'left', lineSpacing: 8,
    }).setOrigin(0.5);
    this.panel.add([fondo, cuerpo]);
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
