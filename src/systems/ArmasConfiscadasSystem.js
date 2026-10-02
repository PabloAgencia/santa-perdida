import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';
import { etiquetaFlotante } from '../world/etiquetas.js';

// B4: SI TE DETIENEN O TE MATAN, PIERDES LAS ARMAS.
//
// Como en San Andreas: se quedan en un sitio del mapa (la comisaria si te
// detienen, el hospital si te matan) marcado con un aro rojo y se recuperan
// pagando. Decisiones de Pablo (3-oct-2026): 500 € fijos, y se pierden para
// siempre si no vas a por ellas en 10 minutos de JUEGO (se cuenta el tiempo
// que estas jugando, no el reloj de pared).
//
// Vive en GameState.flags.confiscadas, que ya se guarda con la partida:
//   { armas: { clave: balas | null }, restante: segundos, tipo, x, y }

const PRECIO = 500;
const PLAZO = 600;          // segundos de juego
const ALCANCE = 56;

export class ArmasConfiscadasSystem {
  constructor(scene) {
    this.scene = scene;
    this.cerca = false;
    this.marca = null;
    this.pintar();
  }

  get datos() {
    return GameState.flags.confiscadas || null;
  }

  // Quita las armas (todas menos los puños) y las deja en `punto`. Si ya
  // habia unas esperando, se suman y el plazo vuelve a empezar.
  confiscar(tipo, punto) {
    const llevadas = { ...GameState.armas };
    delete llevadas.puno;
    const previo = this.datos;
    if (Object.keys(llevadas).length === 0 && !previo) return false;

    const armas = previo ? { ...previo.armas } : {};
    for (const [clave, balas] of Object.entries(llevadas)) {
      if (balas === null) armas[clave] = null;
      else armas[clave] = (armas[clave] || 0) + balas;
    }
    GameState.flags.confiscadas = { armas, restante: PLAZO, tipo, x: punto.x, y: punto.y };
    GameState.armas = { puno: null };
    GameState.armaActual = 'puno';
    this.pintar();
    EventBus.emit(EVT.NOTIFY, {
      text: `Te han quitado las armas. Recuperalas en ${tipo === 'busted' ? 'la comisaria' : 'el hospital'} · ${PRECIO} €`,
      tone: 'danger',
    });
    return true;
  }

  pintar() {
    this.quitarMarca();
    const d = this.datos;
    if (!d) return;
    const aro = this.scene.add.image(d.x, d.y, 'ring')
      .setDisplaySize(58, 58).setTint(0xd9584a).setDepth(6);
    this.scene.tweens.add({
      targets: aro, scale: { from: 0.85, to: 1.1 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    const etiqueta = etiquetaFlotante(this.scene, d.x, d.y - 32, `TUS ARMAS · ${PRECIO} €`, 0xd9584a);
    this.marca = { aro, etiqueta };
  }

  quitarMarca() {
    if (!this.marca) return;
    this.scene.tweens.killTweensOf(this.marca.aro);
    this.marca.aro.destroy();
    const e = this.marca.etiqueta;
    e.texto.destroy();
    e.placa.destroy();
    e.raya.destroy();
    this.marca = null;
  }

  update(dt, player, enCoche) {
    const d = this.datos;
    this.cerca = false;
    if (!d) return;
    d.restante -= dt;
    if (d.restante <= 0) {
      delete GameState.flags.confiscadas;
      this.quitarMarca();
      EventBus.emit(EVT.NOTIFY, { text: 'Has perdido tus armas para siempre', tone: 'danger' });
      return;
    }
    if (enCoche) return;
    this.cerca = Math.hypot(player.x - d.x, player.y - d.y) < ALCANCE;
  }

  // E junto al aro: pagar y recuperarlas
  usar() {
    const d = this.datos;
    if (!d || !this.cerca) return false;
    if (!GameState.canAfford(PRECIO)) {
      EventBus.emit(EVT.NOTIFY, { text: `Tus armas: ${PRECIO} €. No te llega`, tone: 'danger' });
      return true;
    }
    GameState.spendMoney(PRECIO, 'armas');
    for (const [clave, balas] of Object.entries(d.armas)) {
      if (balas === null) GameState.armas[clave] = null;
      else GameState.armas[clave] = (GameState.armas[clave] || 0) + balas;
    }
    delete GameState.flags.confiscadas;
    this.quitarMarca();
    this.cerca = false;
    Audio.pickup();
    EventBus.emit(EVT.NOTIFY, { text: 'Recuperas tus armas', tone: 'money' });
    return true;
  }
}
