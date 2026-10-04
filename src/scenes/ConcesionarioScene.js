import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { COLORS, PLAYER } from '../config/balance.js';
import { VEHICLE_KEYS, VEHICLES } from '../config/vehicles.js';
import { texturaDelJugador } from '../world/personArt.js';
import { FisicaInterior } from '../world/interior.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';
const TITULO = 'Pricedown, Anton, Impact, sans-serif';

// EL CONCESIONARIO POR DENTRO. Antes esto eran seis coches aparcados en la
// acera; ahora es un salon con la gama entera, como pidio Pablo: se entra
// como en un piso, se compra andando hasta el que se quiera, y lo que se
// compra sale a la puerta al salir (CityScene.onHideoutExit se encarga,
// con el mismo patron que ya usaba sacar el coche del garaje).
export class ConcesionarioScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ConcesionarioScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.sala = { x: w / 2 - 380, y: h / 2 - 180, w: 760, h: 340 };
    Audio.menuOpen();

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x07080a);

    const s = this.sala;
    this.add.image(s.x - 6, s.y - 6, 'px').setOrigin(0, 0)
      .setDisplaySize(s.w + 12, s.h + 12).setTint(0x1a1e24);

    // Igual que en los pisos: si hay ilustracion se usa, y si no, el suelo
    // por codigo de siempre. El juego funciona en los dos casos.
    const laminaDe = this.textures.exists('interior-concesionario') ? 'interior-concesionario' : null;
    if (laminaDe) {
      this.add.image(s.x, s.y, laminaDe).setOrigin(0, 0).setDisplaySize(s.w, s.h);
    } else {
      this.add.image(s.x, s.y, 'px').setOrigin(0, 0)
        .setDisplaySize(s.w, s.h).setTint(0x23262c);
      for (let i = 0; i < 12; i++) {
        this.add.image(s.x + i * (s.w / 12), s.y, 'px').setOrigin(0, 0)
          .setDisplaySize(1, s.h).setTint(0x2c3038).setAlpha(0.6);
      }
    }

    this.add.text(s.x + s.w / 2, s.y + 26, 'CONCESIONARIO', {
      fontFamily: TITULO, stroke: '#05060a', strokeThickness: 4, fontSize: '30px', color: '#bcd6ee',
    }).setOrigin(0.5);

    // todos los modelos del concesionario, cada uno con su plaza (se reparten
    // solos segun cuantos haya en VEHICLE_KEYS). En DOS filas de hasta ocho:
    // con los modelos del 4-oct ya eran quince y en una fila se montaban.
    const porFila = Math.min(8, Math.ceil(VEHICLE_KEYS.length / 2));
    this.bahias = VEHICLE_KEYS.map((tipo, i) => {
      const fila = Math.floor(i / porFila);
      const enFila = Math.min(porFila, VEHICLE_KEYS.length - fila * porFila);
      const col = i % porFila;
      const bx = s.x + (s.w / (enFila + 1)) * (col + 1);
      const by = s.y + (fila === 0 ? 112 : 236);
      this.add.image(bx, by, 'px').setDisplaySize(62, 86).setTint(0x15171b).setAlpha(0.7);
      // de pie (morro arriba) y a escala para que el camion quepa en su plaza
      const esc = Math.min(0.92, 76 / VEHICLES[tipo].length);
      this.add.image(bx, by, `veh-${tipo}-0`).setRotation(-Math.PI / 2).setScale(esc);
      this.add.text(bx, by + 52, VEHICLES[tipo].name.toUpperCase(), {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '12px', color: COLORS.ink,
      }).setOrigin(0.5);
      this.add.text(bx, by + 67, `${VEHICLES[tipo].price} €`, {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '13px', color: COLORS.money,
      }).setOrigin(0.5);
      return { tipo, x: bx, y: by };
    });

    // los coches de la sala no se atraviesan
    this.fisica = new FisicaInterior(this);
    for (const b of this.bahias) this.fisica.rect(b.x, b.y, 40, 70);

    // puerta de salida, abajo del todo, como en el escondite
    this.puerta = { x: s.x + s.w / 2, y: s.y + s.h - 6 };
    this.add.image(this.puerta.x, this.puerta.y, 'px')
      .setDisplaySize(72, 12).setTint(0x6b4a2f);
    this.add.text(this.puerta.x, this.puerta.y + 22, 'SALIR', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.jugador = this.add.image(
      this.puerta.x, this.puerta.y - 60, texturaDelJugador(this, 0, GameState)
    );
    this.px = this.jugador.x;
    this.py = this.jugador.y;

    this.aviso = this.add.text(w / 2, h - 48, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.ink,
    }).setOrigin(0.5);
    this.add.text(w / 2, h - 24, 'WASD para moverte  ·  E para comprar o salir', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upA: 'UP', downA: 'DOWN', leftA: 'LEFT', rightA: 'RIGHT', usar: 'E',
    });

    // solo se puede llevar UN coche comprado a la vez fuera: si ya tienes
    // uno esperando en la puerta, hay que salir primero para que quepa
    this.comprado = null;
    this.confirmacion = 0;
    this.saliendo = false;
    this.cameras.main.fadeIn(420, 0, 0, 0);
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
      const m = this.fisica.mover(
        this.px, this.py, (dx / len) * PLAYER.walkSpeed * dt, (dy / len) * PLAYER.walkSpeed * dt
      );
      this.px = m.x;
      this.py = m.y;
      this.px = Phaser.Math.Clamp(this.px, s.x + 18, s.x + s.w - 18);
      this.py = Phaser.Math.Clamp(this.py, s.y + 48, s.y + s.h - 18);
      this.jugador.setRotation(Math.atan2(dy, dx));
    }
    this.jugador.setPosition(this.px, this.py);

    // la MAS cercana: con dos filas las plazas estan juntas y la primera de
    // la lista a menos de 60 px podia ser la de al lado
    let bahia = null;
    let dBahia = 60;
    for (const b of this.bahias) {
      const d = Phaser.Math.Distance.Between(this.px, this.py, b.x, b.y);
      if (d < dBahia) { dBahia = d; bahia = b; }
    }
    const enPuerta = Phaser.Math.Distance.Between(this.px, this.py, this.puerta.x, this.puerta.y) < 46;

    if (this.confirmacion > 0) {
      this.confirmacion -= dt;
    } else {
      this.aviso.setColor('#e6e1d4');
      this.aviso.setText(
        bahia ? `E para comprar ${VEHICLES[bahia.tipo].name} · ${VEHICLES[bahia.tipo].price} €`
          : enPuerta ? 'E para salir a la calle' : ''
      );
    }

    if (Phaser.Input.Keyboard.JustDown(k.usar)) {
      if (bahia) {
        this.comprarBahia(bahia);
      } else if (enPuerta) {
        this.salir();
      }
    }
  }

  comprarBahia(bahia) {
    if (this.comprado) {
      this.aviso.setColor('#8a8578');
      this.aviso.setText('Ya tienes uno esperando en la puerta. Sal primero');
      this.confirmacion = 2;
      return;
    }
    const precio = VEHICLES[bahia.tipo].price;
    if (!GameState.canAfford(precio)) {
      this.aviso.setColor('#d9584a');
      this.aviso.setText(`${VEHICLES[bahia.tipo].name}: ${precio} €. No te llega`);
      this.confirmacion = 2;
      return;
    }
    const g = this.scene.get('CityScene');
    const compra = g.concesionario.comprar(bahia.tipo);
    if (!compra) return;

    this.comprado = compra;
    Audio.notes([392, 523.25, 659.25], 0.1);
    this.aviso.setColor('#8fd694');
    this.aviso.setText(`${VEHICLES[bahia.tipo].name} comprado · te espera en la puerta`);
    this.confirmacion = 2.4;
  }

  salir() {
    if (this.saliendo) return;
    this.saliendo = true;

    Audio.menuClose();
    this.cameras.main.fadeOut(380, 0, 0, 0);
    this.time.delayedCall(400, () => {
      this.scene.setVisible(true, 'CityScene');
      this.scene.resume('CityScene');
      this.scene.setVisible(true, 'UIScene');
      this.scene.resume('UIScene');
      EventBus.emit(EVT.HIDEOUT_EXIT, { cocheComprado: this.comprado });
      this.scene.stop();
    });
  }
}
