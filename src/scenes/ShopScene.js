import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { COLORS } from '../config/balance.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { ARMAS } from '../config/weapons.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// El chaleco no es un arma, pero se compra en el mismo sitio y es lo que
// cambia mas la pelea: con 100 de blindaje aguantas el doble.
export const BLINDAJE = { precio: 400, cantidad: 100 };

// Mostrador de la armeria. Se abre al pulsar E en la puerta y la ciudad se
// queda congelada detras, igual que la pausa.
export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.74);
    this.add.image(w / 2, h / 2, 'px')
      .setDisplaySize(520, 400).setTint(0x0d1014).setAlpha(0.96);

    this.add.text(w / 2, h / 2 - 168, 'ARMERIA', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 6,
      fontSize: '44px', color: '#7fd08a',
    }).setOrigin(0.5);

    this.dinero = this.add.text(w / 2, h / 2 - 134, '', {
      fontFamily: FONT, fontSize: '18px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.indice = 0;
    this.items = [];
    this.montarLista();

    this.cursor = this.add.text(0, 0, '>', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '22px', color: '#7fd08a',
    }).setOrigin(0.5);

    this.add.text(w / 2, h / 2 + 172, 'ENTER para comprar  ·  ESC para salir', {
      fontFamily: FONT, fontSize: '14px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.pintar();

    this.teclas = this.input.keyboard.addKeys({
      arriba: 'UP', abajo: 'DOWN', w: 'W', s: 'S',
      entrar: 'ENTER', espacio: 'SPACE', salir: 'ESC', e: 'E',
    });
    this.input.keyboard.addCapture('UP,DOWN,W,S,ENTER,SPACE,ESC,E');
  }

  // El catalogo se arma con lo que ya tienes: si llevas la pistola, lo que se
  // te ofrece son balas, no otra pistola.
  catalogo() {
    const lista = [];
    for (const clave of ['bate', 'pistola', 'escopeta']) {
      const a = ARMAS[clave];
      if (!GameState.tieneArma(clave)) {
        lista.push({
          nombre: a.nombre, precio: a.precio,
          detalle: a.cuerpo ? 'de cerca' : `${a.municionPorCompra} balas dentro`,
          comprar: () => GameState.darArma(clave, a.municionPorCompra || 0),
        });
      } else if (!a.cuerpo) {
        const tiene = GameState.municion(clave) || 0;
        lista.push({
          nombre: `${a.nombre}: balas`, precio: a.precioMunicion,
          detalle: `llevas ${tiene} de ${a.municionMax}`,
          lleno: tiene >= a.municionMax,
          comprar: () => GameState.darArma(clave, a.municionPorCompra),
        });
      }
    }
    lista.push({
      nombre: 'Chaleco', precio: BLINDAJE.precio,
      detalle: `llevas ${Math.round(GameState.blindaje)} de 100`,
      lleno: GameState.blindaje >= 100,
      comprar: () => GameState.darBlindaje(BLINDAJE.cantidad),
    });
    lista.push({ nombre: 'Salir de la tienda', precio: 0, salir: true });
    return lista;
  }

  montarLista() {
    const w = this.scale.width;
    const h = this.scale.height;
    for (const it of this.items) { it.texto.destroy(); it.coste.destroy(); }
    this.items = [];

    this.lista = this.catalogo();
    this.lista.forEach((op, i) => {
      const y = h / 2 - 92 + i * 44;
      const texto = this.add.text(w / 2 - 210, y, op.nombre, {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 4,
        fontSize: '24px', color: COLORS.ink,
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
        .on('pointerover', () => { this.indice = i; this.pintar(); })
        .on('pointerdown', () => this.elegir());

      const coste = this.add.text(w / 2 + 210, y, op.salir ? '' : `${op.precio} €`, {
        fontFamily: FONT, fontSize: '20px', color: COLORS.dim,
      }).setOrigin(1, 0.5);

      if (op.detalle) {
        this.add.text(w / 2 - 210, y + 15, op.detalle, {
          fontFamily: FONT, fontSize: '12px', color: COLORS.dim,
        }).setOrigin(0, 0.5).setAlpha(0.8);
      }
      this.items.push({ texto, coste });
    });
    this.indice = Math.min(this.indice, this.items.length - 1);
  }

  pintar() {
    this.dinero.setText(`Llevas ${GameState.money} €`);
    this.items.forEach((it, i) => {
      const op = this.lista[i];
      const elegido = i === this.indice;
      const puede = op.salir || (GameState.canAfford(op.precio) && !op.lleno);
      it.texto.setColor(elegido ? '#7fd08a' : puede ? COLORS.ink : '#6a6a6a');
      it.coste.setColor(puede ? COLORS.dim : '#8a5050');
    });
    const sel = this.items[this.indice];
    this.cursor.setPosition(sel.texto.x - 22, sel.texto.y);
  }

  elegir() {
    const op = this.lista[this.indice];
    if (op.salir) return this.salir();

    if (op.lleno) {
      EventBus.emit(EVT.NOTIFY, { text: 'No te cabe mas', tone: 'dim' });
      return;
    }
    if (!GameState.spendMoney(op.precio, 'armeria')) {
      EventBus.emit(EVT.NOTIFY, { text: 'No te llega', tone: 'danger' });
      return;
    }
    op.comprar();
    Audio.pickup();
    EventBus.emit(EVT.NOTIFY, { text: `${op.nombre} · ${op.precio} €`, tone: 'money' });
    this.montarLista();
    this.pintar();
  }

  salir() {
    this.scene.stop();
    this.scene.resume('UIScene');
    this.scene.resume('CityScene');
  }

  update() {
    const t = this.teclas;
    if (Phaser.Input.Keyboard.JustDown(t.arriba) || Phaser.Input.Keyboard.JustDown(t.w)) {
      this.indice = (this.indice - 1 + this.items.length) % this.items.length;
      this.pintar();
    }
    if (Phaser.Input.Keyboard.JustDown(t.abajo) || Phaser.Input.Keyboard.JustDown(t.s)) {
      this.indice = (this.indice + 1) % this.items.length;
      this.pintar();
    }
    if (Phaser.Input.Keyboard.JustDown(t.entrar) || Phaser.Input.Keyboard.JustDown(t.espacio)) {
      this.elegir();
    }
    if (Phaser.Input.Keyboard.JustDown(t.salir) || Phaser.Input.Keyboard.JustDown(t.e)) {
      this.salir();
    }
  }
}
