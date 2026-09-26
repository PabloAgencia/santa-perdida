import { VEHICLES } from '../config/vehicles.js';
import { repartirPorBarrios } from '../world/puertas.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';

// EL CONCESIONARIO. Ya no es una fila de coches aparcados en la acera con un
// cartel cada uno (Pablo: "deberia poder entrarse, como un piso"): ahora es
// un edificio con puerta, igual que un piso o el escondite. Dentro
// (ConcesionarioScene) se ve la gama entera y se compra andando hasta el
// que se quiera. Lo que se compra sale a la puerta al salir (ver
// CityScene.onHideoutExit / entregarCocheComprado).

const DESCUBRE = 340;
const ALCANCE = 62;

export class ConcesionarioSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.puerta = null;
    this.cerca = false;
    this.colocar();
  }

  colocar() {
    const sitios = repartirPorBarrios(this.map, {
      cuantos: 1, separacion: 99999, minTile: 3, ocupados: this.scene.edificiosOcupados,
    });
    if (sitios.length === 0) return;
    this.puerta = sitios[0];

    this.aro = this.scene.add.image(this.puerta.x, this.puerta.y, 'ring')
      .setDisplaySize(62, 62).setTint(0x7fa8d0).setDepth(6);
    this.scene.tweens.add({
      targets: this.aro, scale: { from: 0.85, to: 1.1 },
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.scene.add.text(this.puerta.x, this.puerta.y - 34, 'CONCESIONARIO', {
      fontFamily: 'Pricedown, Anton, Impact, sans-serif', fontSize: '13px',
      color: '#bcd6ee', stroke: '#05060a', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(6);
  }

  update(player) {
    this.cerca = false;
    if (!this.puerta) return;
    const d = Phaser.Math.Distance.Between(this.puerta.x, this.puerta.y, player.x, player.y);

    if (d < DESCUBRE && GameState.descubrir('concesionario')) {
      EventBus.emit(EVT.NOTIFY, { text: 'Nuevo sitio: Concesionario', tone: 'objective' });
      EventBus.emit(EVT.STATS_CHANGED, { descubierto: 'concesionario' });
    }
    if (d < ALCANCE) this.cerca = true;
  }

  // Cobra y apunta el modelo como comprado alguna vez (para la pantalla de
  // progreso). Devuelve null si no llega el dinero: el aviso lo decide
  // quien llama (ConcesionarioScene), igual que en LocalSystem y PisoSystem.
  comprar(tipo) {
    if (!GameState.canAfford(VEHICLES[tipo].price)) return null;
    GameState.spendMoney(VEHICLES[tipo].price, 'concesionario');

    if (!GameState.flags.cochesComprados) GameState.flags.cochesComprados = {};
    GameState.flags.cochesComprados[tipo] = true;

    return { tipo, precio: VEHICLES[tipo].price, color: 0 };
  }
}
