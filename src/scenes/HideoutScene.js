import { GameState } from '../core/GameState.js';
import { SaveSystem } from '../core/SaveSystem.js';
import { Audio } from '../core/Audio.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { COLORS, PLAYER } from '../config/balance.js';
import { texturaDelJugador } from '../world/personArt.js';

// Pablo lo quiere todo en Pricedown, sin excepciones
const FONT = 'Pricedown, Anton, Impact, sans-serif';
const TITULO = 'Pricedown, Anton, Impact, sans-serif';

// Interior del escondite: una habitacion pequeña con un punto de guardado,
// al estilo de los pisos francos de GTA.
export class HideoutScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HideoutScene', active: false });
  }

  // La misma habitacion vale para el escondite del principio y para cualquier
  // piso comprado: cambia el cartel y de que garaje se habla, no la sala.
  // Si no llega nada (por ejemplo al recargar la escena a pelo), se queda con
  // el escondite, que es como funcionaba antes.
  init(datos) {
    this.sitio = {
      clave: datos?.clave ?? 'escondite',
      nombre: datos?.nombre ?? 'TU ESCONDITE',
      plazas: datos?.plazas ?? 0,
      lamina: datos?.lamina ?? null,
    };
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.sala = { x: w / 2 - 300, y: h / 2 - 190, w: 600, h: 380 };
    Audio.menuOpen();

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x07080a);

    const s = this.sala;
    this.add.image(s.x - 6, s.y - 6, 'px').setOrigin(0, 0)
      .setDisplaySize(s.w + 12, s.h + 12).setTint(0x1a140e);

    // Si hay ilustracion de la habitacion manda ella, con los muebles ya
    // pintados dentro; si no, el suelo y los muebles de rectangulos de
    // siempre. Igual que los sprites y la portada: la imagen es opcional y
    // el juego funciona sin ella.
    // Los sitios donde se interactua (cama, guardado, puerta) NO se mueven:
    // la ilustracion se pide con los muebles en esos mismos sitios. Asi la
    // imagen no puede descolocar el juego, solo vestirlo.
    // Se prueban por orden y se usa la primera que exista: la del sitio
    // concreto (cada categoria de piso tiene la suya), la generica de piso, y
    // si no hay nada, el dibujo por codigo. Asi se pueden ir metiendo de una
    // en una sin que falte ninguna ni se rompa nada.
    const candidatas = this.sitio.clave === 'escondite'
      ? ['interior-escondite']
      : [this.sitio.lamina, 'interior-piso'];
    const laminaDe = candidatas.find((c) => c && this.textures.exists(c));
    const conLamina = !!laminaDe;

    if (conLamina) {
      this.add.image(s.x, s.y, laminaDe).setOrigin(0, 0).setDisplaySize(s.w, s.h);
    } else {
      this.add.image(s.x, s.y, 'px').setOrigin(0, 0)
        .setDisplaySize(s.w, s.h).setTint(0x2e2721);

      // tablas del suelo
      for (let i = 0; i < 14; i++) {
        this.add.image(s.x, s.y + i * 28, 'px').setOrigin(0, 0)
          .setDisplaySize(s.w, 1).setTint(0x272019).setAlpha(0.8);
      }
      this.muebles(s);
    }

    this.conLamina = conLamina;
    this.cama = { x: s.x + 90, y: s.y + 101 };
    this.add.text(this.cama.x, this.cama.y + 44, 'DORMIR', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    // luz de la bombilla. Con ilustracion se baja: el dibujo ya trae su
    // propia luz pintada y sumarle otra encima lo lavaba entero.
    this.add.image(s.x + s.w / 2, s.y + 120, 'lamp')
      .setDisplaySize(520, 520)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(conLamina ? 0.2 : 0.5);

    this.add.text(s.x + s.w / 2, s.y + 26, this.sitio.nombre.toUpperCase(), {
      fontFamily: TITULO, stroke: '#05060a', strokeThickness: 4, fontSize: '30px', color: '#c8965a',
    }).setOrigin(0.5);

    // el garaje, solo si el sitio tiene plazas (el escondite no tiene). El
    // mismo texto es la zona de E: sacar un coche guardado a la puerta.
    if (this.sitio.plazas > 0) {
      this.garaje = { x: s.x + s.w / 2, y: s.y + 50 };
      this.garajeTexto = this.add.text(this.garaje.x, this.garaje.y, this.textoGaraje(), {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
      }).setOrigin(0.5);
    } else {
      this.garaje = null;
    }

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
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.money,
    }).setOrigin(0.5);

    // puerta de salida
    this.puerta = { x: s.x + s.w / 2, y: s.y + s.h - 6 };
    this.add.image(this.puerta.x, this.puerta.y, 'px')
      .setDisplaySize(72, 12).setTint(0x6b4a2f);
    this.add.text(this.puerta.x, this.puerta.y + 22, 'SALIR', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    // el MISMO cuerpo que llevas por la calle, no el monigote de codigo
    this.jugador = this.add.image(
      s.x + s.w / 2, s.y + s.h - 70, texturaDelJugador(this, 0, GameState)
    );
    this.px = this.jugador.x;
    this.py = this.jugador.y;

    this.aviso = this.add.text(w / 2, h - 48, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.ink,
    }).setOrigin(0.5);

    this.add.text(w / 2, h - 24, 'WASD para moverte  ·  E sobre el icono', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
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
    this.cocheASacar = null;
    this.cameras.main.fadeIn(420, 0, 0, 0);
    // Curarse ya NO es automatico por entrar: hay que echarse en la cama.
    // Entrar y salir dejaba la vida a 100 gratis y sin enterarte.
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
    const enCama = Phaser.Math.Distance.Between(this.px, this.py, this.cama.x, this.cama.y) < 54;
    const enGaraje = this.garaje &&
      Phaser.Math.Distance.Between(this.px, this.py, this.garaje.x, this.garaje.y) < 50;

    // el mensaje de confirmacion aguanta unos segundos; antes lo pisaba el
    // texto de ayuda en el fotograma siguiente y no se llegaba a ver
    if (this.confirmacion > 0) {
      this.confirmacion -= dt;
    } else {
      this.aviso.setColor('#e6e1d4');
      this.aviso.setText(
        enGuardar ? 'E para guardar la partida'
          : enCama ? (GameState.health >= GameState.vidaMaxima ? 'E para dormir (pasan 6 horas)' : 'E para dormir y curarte')
            : enGaraje ? (GameState.cochesEn(this.sitio.clave).length > 0
              ? 'E para sacar un coche del garaje' : 'El garaje esta vacio')
              : enPuerta ? 'E para salir a la calle' : ''
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
      } else if (enCama) {
        // dormir siempre adelanta el reloj seis horas, curen o no: es lo que
        // pasa el tiempo de verdad, aunque ya estuvieras entero
        GameState.avanzarReloj(6 * 60);
        if (GameState.health >= GameState.vidaMaxima) {
          Audio.notes([392, 330, 262], 0.16, 'triangle', 0.1);
          this.cameras.main.flash(420, 20, 24, 30);
          this.aviso.setColor('#8a8578');
          this.aviso.setText('HAS DORMIDO. No te hacia falta curarte');
          this.confirmacion = 2.5;
        } else {
          GameState.heal(GameState.vidaMaxima);
          Audio.notes([392, 330, 262], 0.16, 'triangle', 0.1);
          this.cameras.main.flash(420, 20, 24, 30);
          this.aviso.setColor('#8fd694');
          this.aviso.setText('HAS DORMIDO. Salud al maximo');
          this.confirmacion = 2.5;
        }
      } else if (enGaraje) {
        this.sacarCoche();
      } else if (enPuerta) {
        this.salir();
      }
    }
  }

  textoGaraje() {
    const guardados = GameState.cochesEn(this.sitio.clave).length;
    return `GARAJE  ${guardados} / ${this.sitio.plazas}`;
  }

  // saca el coche mas antiguo del garaje: se sale a la calle como con la
  // puerta, y CityScene lo materializa en la puerta del piso (ver
  // EVT.HIDEOUT_EXIT y CityScene.sacarCocheDelGaraje)
  sacarCoche() {
    if (GameState.cochesEn(this.sitio.clave).length === 0) {
      this.aviso.setColor('#8a8578');
      this.aviso.setText('No hay coches guardados');
      this.confirmacion = 1.6;
      return;
    }
    this.cocheASacar = this.sitio.clave;
    this.salir();
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

    Audio.menuClose();
    this.cameras.main.fadeOut(380, 0, 0, 0);
    this.time.delayedCall(400, () => {
      // primero se devuelve la ciudad y al final se apaga esta escena:
      // al reves, las ordenes salen de una escena ya parada
      this.scene.setVisible(true, 'CityScene');
      this.scene.resume('CityScene');
      this.scene.setVisible(true, 'UIScene');
      this.scene.resume('UIScene');
      EventBus.emit(EVT.HIDEOUT_EXIT, { sacarCocheDe: this.cocheASacar || null });
      this.scene.stop();
    });
  }
}
