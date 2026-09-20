import { GameState } from '../core/GameState.js';
import { SaveSystem } from '../core/SaveSystem.js';
import { Audio } from '../core/Audio.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { COLORS, PLAYER } from '../config/balance.js';

const FONT = 'Consolas, "Courier New", monospace';
const TITULO = 'Pricedown, Anton, Impact, sans-serif';

// Interior del escondite: una habitacion pequeña con un punto de guardado,
// al estilo de los pisos francos de GTA.
export class HideoutScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HideoutScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.sala = { x: w / 2 - 300, y: h / 2 - 190, w: 600, h: 380 };

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x07080a);

    const s = this.sala;
    this.add.image(s.x - 6, s.y - 6, 'px').setOrigin(0, 0)
      .setDisplaySize(s.w + 12, s.h + 12).setTint(0x1a140e);
    this.add.image(s.x, s.y, 'px').setOrigin(0, 0)
      .setDisplaySize(s.w, s.h).setTint(0x2e2721);

    // tablas del suelo
    for (let i = 0; i < 14; i++) {
      this.add.image(s.x, s.y + i * 28, 'px').setOrigin(0, 0)
        .setDisplaySize(s.w, 1).setTint(0x272019).setAlpha(0.8);
    }

    this.muebles(s);

    // luz de la bombilla
    this.add.image(s.x + s.w / 2, s.y + 120, 'lamp')
      .setDisplaySize(520, 520)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);

    this.add.text(s.x + s.w / 2, s.y + 26, 'TU ESCONDITE', {
      fontFamily: TITULO, fontSize: '30px', color: '#c8965a',
    }).setOrigin(0.5);

    // punto de guardado
    this.save = { x: s.x + s.w - 110, y: s.y + s.h - 110 };
    this.discoAro = this.add.image(this.save.x, this.save.y, 'ring')
      .setDisplaySize(76, 76).setTint(0x8fd694);
    this.tweens.add({
      targets: this.discoAro, scale: { from: 0.9, to: 1.15 },
      duration: 950, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.add.image(this.save.x, this.save.y, 'px')
      .setDisplaySize(26, 26).setTint(0x1d2a22);
    this.add.image(this.save.x, this.save.y, 'px')
      .setDisplaySize(18, 6).setTint(0x8fd694);
    this.add.text(this.save.x, this.save.y + 46, 'GUARDAR', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.money,
    }).setOrigin(0.5);

    // puerta de salida
    this.puerta = { x: s.x + s.w / 2, y: s.y + s.h - 6 };
    this.add.image(this.puerta.x, this.puerta.y, 'px')
      .setDisplaySize(72, 12).setTint(0x6b4a2f);
    this.add.text(this.puerta.x, this.puerta.y + 22, 'SALIR', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.jugador = this.add.image(s.x + s.w / 2, s.y + s.h - 70, 'player');
    this.px = this.jugador.x;
    this.py = this.jugador.y;

    this.aviso = this.add.text(w / 2, h - 48, '', {
      fontFamily: FONT, fontSize: '16px', color: COLORS.ink,
    }).setOrigin(0.5);

    this.add.text(w / 2, h - 24, 'WASD para moverte  ·  E sobre el icono', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upA: 'UP', downA: 'DOWN', leftA: 'LEFT', rightA: 'RIGHT', usar: 'E',
    });

    // OJO: Phaser reutiliza la misma instancia de escena al volver a entrar,
    // asi que todo lo que no se reinicie aqui se arrastra de la vez anterior.
    // El cerrojo `saliendo` se quedaba puesto y la segunda salida no iba.
    this.confirmacion = 0;
    this.saliendo = false;
    this.cameras.main.fadeIn(420, 0, 0, 0);
    GameState.heal(100);
  }

  muebles(s) {
    const mueble = (x, y, w, h, color) =>
      this.add.image(s.x + x, s.y + y, 'px').setOrigin(0, 0)
        .setDisplaySize(w, h).setTint(color);

    mueble(30, 70, 120, 62, 0x4a3b2c);      // cama
    mueble(38, 78, 104, 46, 0x6b5a45);
    mueble(30, 160, 54, 54, 0x3d3228);      // mesilla
    mueble(s.w - 170, 60, 140, 40, 0x3a3f46); // mesa
    mueble(s.w - 150, 68, 100, 24, 0x4d545c);
    mueble(210, 250, 170, 70, 0x40352a);    // sofa
    mueble(220, 258, 150, 54, 0x5a4a38);
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const k = this.keys;
    const s = this.sala;

    let dx = 0;
    let dy = 0;
    if (k.left.isDown || k.leftA.isDown) dx -= 1;
    if (k.right.isDown || k.rightA.isDown) dx += 1;
    if (k.up.isDown || k.upA.isDown) dy -= 1;
    if (k.down.isDown || k.downA.isDown) dy += 1;

    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      this.px += (dx / len) * PLAYER.walkSpeed * dt;
      this.py += (dy / len) * PLAYER.walkSpeed * dt;
      this.px = Phaser.Math.Clamp(this.px, s.x + 18, s.x + s.w - 18);
      this.py = Phaser.Math.Clamp(this.py, s.y + 48, s.y + s.h - 18);
      this.jugador.setRotation(Math.atan2(dy, dx));
    }
    this.jugador.setPosition(this.px, this.py);

    const enGuardar = Phaser.Math.Distance.Between(this.px, this.py, this.save.x, this.save.y) < 42;
    const enPuerta = Phaser.Math.Distance.Between(this.px, this.py, this.puerta.x, this.puerta.y) < 46;

    // el mensaje de confirmacion aguanta unos segundos; antes lo pisaba el
    // texto de ayuda en el fotograma siguiente y no se llegaba a ver
    if (this.confirmacion > 0) {
      this.confirmacion -= dt;
    } else {
      this.aviso.setColor('#e6e1d4');
      this.aviso.setText(
        enGuardar ? 'E para guardar la partida' : enPuerta ? 'E para salir a la calle' : ''
      );
    }

    if (Phaser.Input.Keyboard.JustDown(k.usar)) {
      if (enGuardar) {
        const ok = SaveSystem.save();
        Audio.notes([523.25, 659.25, 783.99], 0.09);
        this.aviso.setColor(ok ? '#8fd694' : '#d9584a');
        this.aviso.setText(ok ? 'PARTIDA GUARDADA' : 'No se ha podido guardar');
        this.confirmacion = 2.5;
        this.destello();
        EventBus.emit(EVT.NOTIFY, { text: 'Partida guardada en el escondite', tone: 'money' });
      } else if (enPuerta) {
        this.salir();
      }
    }
  }

  destello() {
    this.cameras.main.flash(260, 60, 90, 70);
    this.tweens.add({
      targets: this.discoAro,
      scale: { from: 1.5, to: 1 },
      duration: 420,
      ease: 'Back.out',
    });
  }

  salir() {
    if (this.saliendo) return;
    this.saliendo = true;

    this.cameras.main.fadeOut(380, 0, 0, 0);
    this.time.delayedCall(400, () => {
      // primero se devuelve la ciudad y al final se apaga esta escena:
      // al reves, las ordenes salen de una escena ya parada
      this.scene.setVisible(true, 'CityScene');
      this.scene.resume('CityScene');
      this.scene.setVisible(true, 'UIScene');
      this.scene.resume('UIScene');
      EventBus.emit(EVT.HIDEOUT_EXIT, {});
      this.scene.stop();
    });
  }
}
