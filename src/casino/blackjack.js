import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { Mesa, texto, nuevaBaraja, dibujarCarta } from './comun.js';

// BLACKJACK, con las reglas de un casino de verdad:
//   · seis barajas; se baraja de nuevo cuando quedan menos de 78 cartas
//   · la banca se planta en cualquier 17 (tambien en el 17 blando)
//   · blackjack natural paga 3 a 2; ganar una mano normal, 1 a 1; empate,
//     se devuelve la apuesta
//   · DOBLAR solo con las dos primeras cartas: dobla la apuesta, se pide una
//     carta y se planta solo
//   · no hay separar ni seguro: menos botones para lo mismo
export function valorMano(cartas) {
  let total = 0;
  let ases = 0;
  for (const c of cartas) {
    if (c.v === 14) { ases++; total += 11; } else total += Math.min(c.v, 10);
  }
  while (total > 21 && ases > 0) { total -= 10; ases--; }
  return total;
}

const esBlackjack = (cartas) => cartas.length === 2 && valorMano(cartas) === 21;

export class Blackjack extends Mesa {
  constructor(scene) {
    super(scene, { titulo: 'BLACKJACK', apuestaMax: 5000 });
    this.zapato = nuevaBaraja(6);
    this.cartasDibujadas = [];
    const { cx, cy } = this;
    this.add(texto(scene, cx, cy - 190, 'LA BANCA SE PLANTA EN 17  ·  BLACKJACK PAGA 3 A 2', 14, '#e8c860'));
    this.txtBanca = this.add(texto(scene, cx, cy - 158, '', 18));
    this.txtJugador = this.add(texto(scene, cx, cy + 128, '', 18));

    const by = cy + this.alto / 2 - 42;
    this.bRepartir = this.boton(cx + 60, by, 150, 44, 'REPARTIR', () => this.repartir(), { tecla: 'ENTER' });
    this.bPedir = this.boton(cx + 60, by, 130, 44, 'PEDIR', () => this.pedir(), { tecla: 'H' });
    this.bPlantarse = this.boton(cx + 210, by, 150, 44, 'PLANTARSE', () => this.plantarse(), { tecla: 'S' });
    this.bDoblar = this.boton(cx + 360, by, 130, 44, 'DOBLAR', () => this.doblar(), { tecla: 'D' });
    this.estado = 'apostando';
    this.ponerBotones();
    this.decir('Elige la apuesta y reparte');
  }

  sacar() {
    if (this.zapato.length < 78) {
      this.zapato = nuevaBaraja(6);
      this.decir('Se barajan las seis barajas otra vez', '#c8c0a8');
    }
    return this.zapato.pop();
  }

  ponerBotones() {
    const jugando = this.estado === 'jugando';
    this.bRepartir.setVisible(!jugando);
    this.bPedir.setVisible(jugando);
    this.bPlantarse.setVisible(jugando);
    this.bDoblar.setVisible(jugando);
    this.bDoblar.setActivo(jugando && this.jugador.length === 2 && GameState.canAfford(this.enJuego));
    this.bloqueaApuesta = jugando || this.estado === 'banca';
    this.refrescar();
  }

  limpiarCartas() {
    for (const c of this.cartasDibujadas) c.destroy();
    this.cartasDibujadas = [];
  }

  pintarManos(destaparBanca) {
    this.limpiarCartas();
    const { cx, cy } = this;
    const fila = (cartas, y, tapar) => {
      const paso = 66;
      const x0 = cx - ((cartas.length - 1) * paso) / 2;
      cartas.forEach((c, i) => {
        const d = dibujarCarta(this.scene, x0 + i * paso, y, c, tapar && i === 1);
        this.add(d);
        this.cartasDibujadas.push(d);
      });
    };
    fila(this.banca, cy - 90, !destaparBanca);
    fila(this.jugador, cy + 50, false);
    this.txtBanca.setText(destaparBanca ? `BANCA: ${valorMano(this.banca)}` : 'BANCA');
    this.txtJugador.setText(`TU MANO: ${valorMano(this.jugador)}`);
  }

  repartir() {
    if (this.estado === 'jugando' || this.estado === 'banca') return;
    if (!this.cobrarApuesta()) return;
    this.enJuego = this.apuesta;
    this.jugador = [this.sacar(), this.sacar()];
    this.banca = [this.sacar(), this.sacar()];
    this.estado = 'jugando';
    Audio.notes([523.25], 0.05);
    this.pintarManos(false);
    this.decir('PEDIR otra carta, PLANTARSE o DOBLAR');
    // un natural se resuelve en el acto (la banca mira si tambien tiene)
    if (esBlackjack(this.jugador) || esBlackjack(this.banca)) {
      this.acabar();
      return;
    }
    this.ponerBotones();
  }

  pedir() {
    if (this.estado !== 'jugando') return;
    this.jugador.push(this.sacar());
    Audio.notes([587.33], 0.04);
    this.pintarManos(false);
    const v = valorMano(this.jugador);
    if (v > 21) { this.acabar(); return; }
    if (v === 21) { this.plantarse(); return; }
    this.ponerBotones();
  }

  doblar() {
    if (this.estado !== 'jugando' || this.jugador.length !== 2) return;
    if (!this.cobrarApuesta(this.enJuego)) return;
    this.enJuego *= 2;
    this.jugador.push(this.sacar());
    this.pintarManos(false);
    if (valorMano(this.jugador) > 21) { this.acabar(); return; }
    this.plantarse();
  }

  // la banca juega sola, carta a carta para que se vea
  plantarse() {
    if (this.estado !== 'jugando') return;
    this.estado = 'banca';
    this.ponerBotones();
    this.pintarManos(true);
    const paso = () => {
      if (this.cerrada) return;
      if (valorMano(this.banca) < 17) {
        this.banca.push(this.sacar());
        Audio.notes([493.88], 0.04);
        this.pintarManos(true);
        this.scene.time.delayedCall(550, paso);
      } else {
        this.acabar();
      }
    };
    this.scene.time.delayedCall(500, paso);
  }

  acabar() {
    this.pintarManos(true);
    const j = valorMano(this.jugador);
    const b = valorMano(this.banca);
    const apuesta = this.enJuego;
    let pago = 0;
    let msg;
    if (j > 21) msg = 'Te pasas. Gana la banca';
    else if (esBlackjack(this.jugador) && !esBlackjack(this.banca)) {
      pago = apuesta + Math.floor(apuesta * 1.5);
      msg = `¡BLACKJACK! +${pago - apuesta} €`;
    } else if (esBlackjack(this.banca) && !esBlackjack(this.jugador)) msg = 'Blackjack de la banca';
    else if (b > 21) { pago = apuesta * 2; msg = `La banca se pasa. +${apuesta} €`; }
    else if (j > b) { pago = apuesta * 2; msg = `Ganas ${j} a ${b}. +${apuesta} €`; }
    else if (j === b) { pago = apuesta; msg = 'Empate: te devuelven la apuesta'; }
    else msg = `La banca gana ${b} a ${j}`;
    this.pagar(pago);
    if (pago > apuesta) Audio.notes([523.25, 659.25, 783.99], 0.08);
    else if (pago === 0) Audio.notes([330, 262], 0.1, 'triangle', 0.08);
    this.decir(msg, pago > apuesta ? '#8fd694' : pago === apuesta ? '#e6e1d4' : '#d9584a');
    this.estado = 'apostando';
    if (this.apuesta > this.maximo()) this.apuesta = Math.max(10, Math.min(this.apuesta, GameState.money));
    this.ponerBotones();
  }

  // levantarse con una mano a medias: se juega plantandose (lo apostado ya
  // esta en la mesa)
  cerrar() {
    if (this.estado === 'jugando' || this.estado === 'banca') {
      this.estado = 'banca';
      while (valorMano(this.banca) < 17) this.banca.push(this.sacar());
      this.acabar();
    }
    super.cerrar();
  }
}
