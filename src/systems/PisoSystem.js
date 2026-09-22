import { TILE } from '../config/balance.js';
import { PISOS, clavePiso } from '../config/pisos.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';

// LOS PISOS FRANCOS EN LA CALLE: donde esta cada uno, su cartel con el precio
// y comprarlo. Lo que cuesta y cuantos coches caben esta en config/pisos.js;
// lo que pasa cuando entras, en HideoutScene.
//
// DIFERENCIA IMPORTANTE CON LA ARMERIA, aunque se parezcan mucho:
//   La armeria se reparte AL AZAR en cada carga. A una tienda eso le da
//   igual. A un piso no: lo has pagado, y si el reparto cambia, el piso que
//   compraste aparece en otro sitio o deja de existir. Por eso aqui la
//   eleccion es DETERMINISTA: el mismo edificio siempre, el mas centrado de
//   su barrio que tenga una puerta valida.

const DESCUBRE = 340;       // a esta distancia te enteras de que existe
const ALCANCE = 62;

export class PisoSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.pisos = [];
    this.cerca = null;
    this.colocar();
  }

  // Un edificio vale si tiene un lado libre que da a la acera. Calcado de
  // ShopSystem a proposito: si algun dia se cambia el criterio, que se vea
  // que son dos sitios y no uno disfrazado.
  puertaDe(b) {
    for (const dist of [26, 36, 48]) {
      const lados = [
        { x: b.px, y: b.py + b.ph / 2 + dist },
        { x: b.px, y: b.py - b.ph / 2 - dist },
        { x: b.px + b.pw / 2 + dist, y: b.py },
        { x: b.px - b.pw / 2 - dist, y: b.py },
      ];
      for (const c of lados) {
        if (this.map.isSolidBox(c.x, c.y, 14, 14)) continue;
        if (this.map.isRoadPoint(c.x, c.y)) continue;
        return c;
      }
    }
    return null;
  }

  colocar() {
    for (const zona of Object.keys(PISOS)) {
      const candidatos = this.map.buildings.filter(
        (b) => b.zone === zona && !b.isHideout && b.pw >= TILE * 2 && b.ph >= TILE * 2
      );
      if (candidatos.length === 0) continue;

      // el centro del barrio, para coger el edificio mas metido dentro y no
      // uno pegado al borde que parezca de la zona de al lado
      let cx = 0;
      let cy = 0;
      for (const b of candidatos) { cx += b.px; cy += b.py; }
      cx /= candidatos.length;
      cy /= candidatos.length;

      // orden fijo: primero por cercania al centro y, si empatan, por
      // coordenada. El desempate importa, que sin el dos edificios a la
      // misma distancia podrian salir en distinto orden en otra carga.
      candidatos.sort((a, b) => {
        const da = Phaser.Math.Distance.Between(a.px, a.py, cx, cy);
        const db = Phaser.Math.Distance.Between(b.px, b.py, cx, cy);
        return da - db || a.px - b.px || a.py - b.py;
      });

      for (const b of candidatos) {
        const puerta = this.puertaDe(b);
        if (!puerta) continue;
        const datos = PISOS[zona];
        const piso = {
          zona,
          clave: clavePiso(zona),
          x: puerta.x,
          y: puerta.y,
          edificio: b,
          ...datos,
        };
        this.pisos.push(piso);
        this.pintar(piso);
        break;
      }
    }
  }

  pintar(piso) {
    const suyo = GameState.esDueno(piso.clave);
    const color = suyo ? 0xe8b54a : 0x7fa8d0;

    piso.aro = this.scene.add.image(piso.x, piso.y, 'ring')
      .setDisplaySize(62, 62).setTint(color).setDepth(6);
    this.scene.tweens.add({
      targets: piso.aro, scale: { from: 0.85, to: 1.1 },
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    piso.cartel = this.scene.add.text(piso.x, piso.y - 34, this.textoCartel(piso), {
      fontFamily: 'Pricedown, Anton, Impact, sans-serif',
      fontSize: '13px', color: suyo ? '#e8b54a' : '#bcd6ee',
      stroke: '#05060a', strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setDepth(6);
  }

  textoCartel(piso) {
    if (GameState.esDueno(piso.clave)) return 'TU PISO';
    return `SE VENDE\n${piso.precio} $`;
  }

  // se llama al comprar: el cartel y el aro cambian de color en el sitio
  refrescar(piso) {
    const suyo = GameState.esDueno(piso.clave);
    piso.aro.setTint(suyo ? 0xe8b54a : 0x7fa8d0);
    piso.cartel.setText(this.textoCartel(piso));
    piso.cartel.setColor(suyo ? '#e8b54a' : '#bcd6ee');
  }

  // Devuelve que ha pasado, para que quien llame decida el aviso. Aqui no se
  // pinta texto en pantalla: este sistema sabe de pisos, no de la interfaz.
  comprar(piso) {
    if (GameState.esDueno(piso.clave)) return 'ya-es-tuyo';
    if (!GameState.canAfford(piso.precio)) return 'sin-dinero';

    GameState.comprarPropiedad(piso.clave, {
      tipo: 'piso', precio: piso.precio, plazas: piso.plazas,
    });
    this.refrescar(piso);
    return 'comprado';
  }

  update(player, enCoche) {
    this.cerca = null;
    for (const p of this.pisos) {
      const d = Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y);

      if (d < DESCUBRE && GameState.descubrir(p.clave)) {
        EventBus.emit(EVT.NOTIFY, { text: `Nuevo sitio: ${p.nombre}`, tone: 'objective' });
        EventBus.emit(EVT.STATS_CHANGED, { descubierto: p.clave });
      }
      if (!enCoche && d < ALCANCE) this.cerca = p;
    }
  }
}
