import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';
import { T } from '../config/city.js';
import { TILE } from '../config/balance.js';

// MEDALLAS DE LA SANTA PERDIDA, escondidas por la ciudad. En San Andreas son
// ostras y herraduras; aqui es la propia santa que le da nombre al juego:
// la superstición de la calle dice que quien lleva su medalla encima sale
// bien parado de la fuga. Cuarenta repartidas, la mitad de ellas en
// callejones y rincones de verdad (no a plena vista desde la acera), y no
// reaparecen nunca: son un premio por conocerse la ciudad entera, no un
// recurso mientras juegas. Sin marca en el mapa ni en el minimapa a
// proposito: si salieran ahi, encontrarlas no tendria ningun merito.

export const TOTAL_MEDALLAS = 40;
const TOTAL = TOTAL_MEDALLAS;
const SEPARACION = 380;   // px entre dos medallas, para que salgan repartidas
const ALCANCE = 26;

// cada 10 recogidas, un sobre de dinero y una frase de la superstición
// local. La ultima (las 40) es la gorda.
const HITOS = [
  { en: 10, premio: 400, frase: 'dicen que da suerte en la fuga' },
  { en: 20, premio: 600, frase: 'ya la mitad de la ciudad es tuya' },
  { en: 30, premio: 900, frase: 'ni los curas se las conocen todas' },
  { en: 40, premio: 1500, frase: 'la Santa Perdida entera, medalla a medalla' },
];

export class ColeccionablesSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.medallas = [];
    this.sembrar();
  }

  // Callejones y rincones de verdad, igual que los corazones del
  // PickupSystem: donde no se ve nada desde el coche. Recorrido en el orden
  // fijo de la rejilla (nada de barajar), para que el reparto salga siempre
  // igual entre partidas.
  puntosEscondidos() {
    const puntos = [];
    for (let ty = 2; ty < this.map.h - 2; ty++) {
      for (let tx = 2; tx < this.map.w - 2; tx++) {
        if (this.map.getTile(tx, ty) !== T.ALLEY) continue;
        if (this.map.isSolidTile(tx, ty)) continue;
        if (this.map.isSolidBox((tx + 0.5) * TILE, (ty + 0.5) * TILE, 10, 10)) continue;
        puntos.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
      }
    }
    return puntos;
  }

  // Reparto DETERMINISTA: primero los callejones (de verdad escondidas),
  // y si la ciudad no da para 40 con esa separacion, se completa con
  // aceras normales. Las dos listas salen siempre en el mismo orden (de la
  // rejilla del mapa, con semilla fija en CityMap.js), asi que la lista
  // final es identica cada vez: si se barajara con Math.random(), un
  // "recogida" guardado por indice (`GameState.medallasRecogidas`)
  // apuntaria a un sitio distinto la siguiente vez que se cargase la
  // partida.
  sembrar() {
    const fuentes = [...this.puntosEscondidos(), ...this.map.sidewalkSpots];
    const elegidos = [];
    for (const s of fuentes) {
      if (elegidos.length >= TOTAL) break;
      if (elegidos.some((p) => Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) < SEPARACION)) {
        continue;
      }
      elegidos.push(s);
    }

    const recogidas = GameState.medallasRecogidas;
    elegidos.forEach((p, i) => {
      if (recogidas[i]) return;   // esta partida ya la cogio: no se vuelve a plantar

      const brillo = this.scene.add.image(p.x, p.y, 'lamp')
        .setDisplaySize(40, 40).setTint(0xe8c563)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.2).setDepth(3);
      const icono = this.scene.add.image(p.x, p.y, 'icono-medalla')
        .setDisplaySize(20, 21).setDepth(p.y + 2);
      this.scene.tweens.add({
        targets: icono, y: p.y - 5, angle: { from: -8, to: 8 },
        duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
      this.medallas.push({ id: i, x: p.x, y: p.y, icono, brillo });
    });
  }

  update(player, enCoche) {
    if (enCoche) return;
    for (let i = this.medallas.length - 1; i >= 0; i--) {
      const m = this.medallas[i];
      if (Phaser.Math.Distance.Between(m.x, m.y, player.x, player.y) > ALCANCE) continue;
      this.coger(m);
      this.medallas.splice(i, 1);
    }
  }

  coger(m) {
    GameState.medallasRecogidas[m.id] = true;
    const total = Object.keys(GameState.medallasRecogidas).length;
    m.icono.destroy();
    m.brillo.destroy();
    Audio.pickup();
    EventBus.emit(EVT.NOTIFY, {
      text: `Medalla de la Santa Perdida · ${total}/${TOTAL}`, tone: 'objective',
    });

    const hito = HITOS.find((h) => h.en === total);
    if (!hito) return;
    GameState.addMoney(hito.premio, 'medallas');
    EventBus.emit(EVT.BIG_MESSAGE, {
      title: total === TOTAL ? 'LA SANTA ENTERA' : `${total} MEDALLAS`,
      subtitle: `+${hito.premio} € · ${hito.frase}`,
      color: '#e8c563',
    });
  }

  clear() {
    for (const m of this.medallas) { m.icono.destroy(); m.brillo.destroy(); }
    this.medallas = [];
  }
}
