import { COLORS } from '../config/balance.js';
import { GameState } from '../core/GameState.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// El mapa entero, el que se abre con M. La ciudad se queda congelada detras.
// Aqui no hay zoom ni scroll: de un vistazo tienes que saber donde estas, por
// donde queda tu casa y donde hay una armeria.
export class MapaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapaScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const city = this.scene.get('CityScene');
    this.city = city;

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.93);

    // el mapa, lo mas grande que quepa dejando sitio al titulo y la leyenda
    const margen = 74;
    const escala = Math.min((w - margen * 2) / city.map.w, (h - margen * 2) / city.map.h);
    this.ancho = city.map.w * escala;
    this.alto = city.map.h * escala;
    this.x0 = (w - this.ancho) / 2;
    this.y0 = (h - this.alto) / 2 + 10;

    this.add.image(this.x0 - 4, this.y0 - 4, 'px').setOrigin(0, 0)
      .setDisplaySize(this.ancho + 8, this.alto + 8).setTint(0x1b1f25);
    this.add.image(this.x0, this.y0, 'minimap').setOrigin(0, 0)
      .setDisplaySize(this.ancho, this.alto);

    this.add.text(w / 2, this.y0 - 46, 'SANTA PERDIDA', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 6,
      fontSize: '40px', color: '#e8b54a',
    }).setOrigin(0.5, 0);

    this.pintarMarcas();

    this.add.text(w / 2, this.y0 + this.alto + 14, 'M o ESC para cerrar', {
      fontFamily: FONT, fontSize: '15px', color: COLORS.dim,
    }).setOrigin(0.5, 0);

    this.teclas = this.input.keyboard.addKeys({ mapa: 'M', salir: 'ESC' });
    this.input.keyboard.addCapture('M,ESC');
  }

  punto(x, y) {
    return {
      x: this.x0 + (x / this.city.map.pixelWidth) * this.ancho,
      y: this.y0 + (y / this.city.map.pixelHeight) * this.alto,
    };
  }

  // un punto con su nombre al lado, que es lo que hace util un mapa
  marca(x, y, color, texto, tam = 10) {
    const p = this.punto(x, y);
    this.add.image(p.x, p.y, 'px').setDisplaySize(tam, tam).setTint(color);
    if (texto) {
      this.add.text(p.x + tam, p.y - 7, texto, {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
        fontSize: '13px', color: '#d8d3c4',
      });
    }
    return p;
  }

  pintarMarcas() {
    const city = this.city;

    if (city.hideoutDoor) {
      this.marca(city.hideoutDoor.x, city.hideoutDoor.y, 0xe8b54a, 'Tu escondite', 12);
    }
    for (const t of city.shops ? city.shops.tiendas : []) {
      this.marca(t.x, t.y, 0x7fd08a, 'Armeria');
    }
    // los contactos que dan trabajo, para saber a quien ir a ver
    const contactos = city.missions ? city.missions.puntos() : [];
    for (const c of contactos) this.marca(c.x, c.y, c.color || 0xffffff, 'Trabajo');

    const destino = city.missions && city.missions.objetivo;
    if (destino) this.marca(destino.x, destino.y, 0xd9584a, 'Adonde vas', 12);

    // y tu, con una flecha que mira hacia donde estabas mirando
    const p = this.punto(city.player.x, city.player.y);
    const ang = city.drivingVehicle ? city.drivingVehicle.angle : city.player.angle;
    this.add.image(p.x, p.y, 'arrow')
      .setDisplaySize(20, 20).setTint(0xf2efe6).setRotation(ang + Math.PI / 2);

    const zona = city.map.zoneAt(city.player.x, city.player.y);
    const nombre = zona ? (city.map.cfg.zones[zona] || {}).label || zona : '';
    this.add.text(this.x0, this.y0 + this.alto + 14, `Estas en ${nombre}`, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '15px', color: COLORS.objective,
    });
    this.add.text(this.x0 + this.ancho, this.y0 + this.alto + 14, `${GameState.money} €`, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '15px', color: COLORS.money,
    }).setOrigin(1, 0);
  }

  cerrar() {
    this.scene.stop();
    this.scene.resume('UIScene');
    this.scene.resume('CityScene');
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.teclas.mapa) ||
        Phaser.Input.Keyboard.JustDown(this.teclas.salir)) {
      this.cerrar();
    }
  }
}
