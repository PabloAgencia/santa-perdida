import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { COLORS } from '../config/balance.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { ARMAS } from '../config/weapons.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// El chaleco no es un arma, pero se compra en el mismo sitio y es lo que
// cambia mas la pelea: con 100 de blindaje aguantas el doble.
export const BLINDAJE = { precio: 400, cantidad: 100 };

// Lo que dice el de la tienda. No es un menu con voz: es un tio detras de un
// mostrador, y por eso habla antes de que compres, no despues.
const SALUDOS = [
  'Buenas. Mira lo que quieras, pero no toques.',
  'Vaya pintas traes. ¿Que necesitas?',
  'Si buscas problemas, aqui los vendemos.',
  'Llegas tarde, iba a cerrar. Dime.',
];
const COMPRAS = [
  'Buena eleccion. No me hagas salir en las noticias.',
  'Toma. Y no la uses aqui dentro.',
  'Marchando. Tu sabras lo que haces.',
  'Eso se paga y no se devuelve.',
];
const SIN_DINERO = [
  'Con esa cartera no sales de aqui con nada.',
  'Vuelve cuando tengas el dinero.',
  'Aqui no se fia, chaval.',
];
const LLENO = ['Ya llevas de sobra de eso.', 'No te cabe mas. Mira otra cosa.'];
const DESPEDIDA = 'Cierra al salir.';

// La armeria por dentro. Se entra desde la calle con E y la ciudad se queda
// congelada detras, como el escondite.
export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.sala = { x: w / 2 - 330, y: h / 2 - 250, w: 660, h: 500 };

    this.add.image(0, 0, 'px').setOrigin(0, 0).setDisplaySize(w, h).setTint(0x05060a);
    this.pintarLocal();

    this.indice = 0;
    this.items = [];
    this.montarLista();

    this.cursor = this.add.text(0, 0, '>', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '22px', color: '#7fd08a',
    }).setOrigin(0.5);

    this.decir(Phaser.Utils.Array.GetRandom(SALUDOS));
    this.pintar();

    this.teclas = this.input.keyboard.addKeys({
      arriba: 'UP', abajo: 'DOWN', w: 'W', s: 'S',
      entrar: 'ENTER', espacio: 'SPACE', salir: 'ESC', e: 'E',
    });
    this.input.keyboard.addCapture('UP,DOWN,W,S,ENTER,SPACE,ESC,E');
  }

  // ---------- el local ----------

  pintarLocal() {
    const s = this.sala;
    const caja = (x, y, an, al, color, alpha = 1) =>
      this.add.image(x, y, 'px').setOrigin(0, 0)
        .setDisplaySize(an, al).setTint(color).setAlpha(alpha);

    caja(s.x - 6, s.y - 6, s.w + 12, s.h + 12, 0x14161a);

    // Con ilustracion del local manda ella, que trae la pared, el suelo, las
    // armas colgadas y el mostrador ya pintados. Sin ella, los rectangulos de
    // siempre. Lo que NUNCA sale del dibujo es el tendero ni tu: esos dos se
    // mueven y hablan, asi que siguen siendo sprites por encima.
    const conLamina = this.textures.exists('interior-armeria');
    if (conLamina) {
      this.add.image(s.x, s.y, 'interior-armeria').setOrigin(0, 0).setDisplaySize(s.w, s.h);
    } else {
      caja(s.x, s.y, s.w, s.h, 0x2b2f36);
      // suelo de baldosa, mas claro por delante del mostrador
      caja(s.x, s.y + 210, s.w, s.h - 210, 0x353a42);
      for (let i = 0; i < 12; i++) {
        caja(s.x + i * 56, s.y + 210, 1, s.h - 210, 0x2a2e35, 0.7);
      }

      // la pared del fondo, con las armas colgadas
      caja(s.x + 26, s.y + 66, s.w - 52, 120, 0x20242a);
      const percha = ['icono-escopeta', 'icono-pistola', 'icono-bate', 'icono-pistola', 'icono-escopeta'];
      percha.forEach((clave, i) => {
        this.add.image(s.x + 86 + i * 122, s.y + 126, clave)
          .setDisplaySize(72, 72).setAlpha(0.92);
      });

      // el mostrador
      caja(s.x + 40, s.y + 214, s.w - 80, 26, 0x4a3a2a);
      caja(s.x + 40, s.y + 214, s.w - 80, 5, 0x6b563c);
    }

    this.add.text(s.x + s.w / 2, s.y + 20, 'ARMERIA EL CERROJO', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 5,
      fontSize: '34px', color: '#7fd08a',
    }).setOrigin(0.5, 0);

    // el dependiente, detras del mostrador
    this.tendero = this.add.image(s.x + 118, s.y + 190, 'ped-5-0')
      .setDisplaySize(42, 42).setRotation(Math.PI / 2);
    this.tweens.add({
      targets: this.tendero, y: s.y + 188,
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    // y tu, de este lado
    this.add.image(s.x + 118, s.y + 276, 'player-0')
      .setDisplaySize(42, 42).setRotation(-Math.PI / 2);

    // el bocadillo de lo que dice
    this.globoFondo = this.add.image(s.x + 150, s.y + 160, 'px')
      .setOrigin(0, 0).setDisplaySize(380, 44).setTint(0x05060a).setAlpha(0.72);
    this.globo = this.add.text(s.x + 162, s.y + 172, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '17px', color: '#e8e2d2', wordWrap: { width: 356 },
    }).setOrigin(0, 0.5);

    this.dinero = this.add.text(s.x + s.w - 30, s.y + 228, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4,
      fontSize: '22px', color: COLORS.money,
    }).setOrigin(1, 0);

    this.add.text(s.x + s.w / 2, s.y + s.h + 14, 'ENTER para comprar  ·  ESC para salir', {
      fontFamily: FONT, fontSize: '15px', color: COLORS.dim,
    }).setOrigin(0.5, 0);
  }

  decir(texto) {
    this.globo.setText(texto);
  }

  // ---------- el genero ----------

  // El catalogo se arma con lo que ya tienes: si llevas la pistola, lo que se
  // te ofrece son balas, no otra pistola.
  catalogo() {
    const lista = [];
    for (const clave of ['bate', 'pistola', 'escopeta', 'rifle', 'sniper']) {
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
    const s = this.sala;
    for (const it of this.items) {
      it.texto.destroy();
      it.coste.destroy();
      if (it.detalle) it.detalle.destroy();
    }
    this.items = [];

    this.lista = this.catalogo();
    this.lista.forEach((op, i) => {
      const y = s.y + 262 + i * 33;
      const texto = this.add.text(s.x + 210, y, op.nombre, {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 4,
        fontSize: '22px', color: COLORS.ink,
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
        .on('pointerover', () => { this.indice = i; this.pintar(); })
        .on('pointerdown', () => this.elegir());

      const coste = this.add.text(s.x + s.w - 30, y, op.salir ? '' : `${op.precio} €`, {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
        fontSize: '19px', color: COLORS.dim,
      }).setOrigin(1, 0.5);

      let detalle = null;
      if (op.detalle) {
        detalle = this.add.text(s.x + 212, y + 14, op.detalle, {
          fontFamily: FONT, fontSize: '12px', color: COLORS.dim,
        }).setOrigin(0, 0.5).setAlpha(0.85);
      }
      this.items.push({ texto, coste, detalle });
    });
    this.indice = Phaser.Math.Clamp(this.indice, 0, this.items.length - 1);
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
    this.cursor.setPosition(sel.texto.x - 20, sel.texto.y);
  }

  elegir() {
    const op = this.lista[this.indice];
    if (op.salir) return this.salir();

    if (op.lleno) {
      this.decir(Phaser.Utils.Array.GetRandom(LLENO));
      return;
    }
    if (!GameState.spendMoney(op.precio, 'armeria')) {
      this.decir(Phaser.Utils.Array.GetRandom(SIN_DINERO));
      return;
    }
    op.comprar();
    Audio.pickup();
    this.decir(Phaser.Utils.Array.GetRandom(COMPRAS));
    EventBus.emit(EVT.NOTIFY, { text: `${op.nombre} · ${op.precio} €`, tone: 'money' });
    this.montarLista();
    this.pintar();
  }

  salir() {
    this.decir(DESPEDIDA);
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
