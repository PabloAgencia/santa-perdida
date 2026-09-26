import { GameState } from '../core/GameState.js';

// EL RELOJ DEL MUNDO. Solo hace dos cosas: adelantar los minutos y decirle a
// UIScene de que color pintar el velo de encima de la pantalla. No toca nada
// mas (ni farolas, ni IA, ni precios): eso es cosa de otros sistemas si algun
// dia lo usan.

// cada segundo real son estos minutos de mundo: un dia completo (1440
// minutos) dura 12 minutos reales, parecido al ritmo de un GTA de toda vida
const MINUTOS_POR_SEGUNDO = 2;

// momentos del dia: la hora, el color de la luz (blanco = sin tinte) y
// cuanto oscurece (0 = de dia claro, mas alto = mas de noche). Entre dos
// puntos seguidos se interpola en linea recta; medianoche enlaza con las
// 24h para que el ciclo no de un salto.
const KEYFRAMES = [
  { hora: 0, color: 0x0b1330, alpha: 0.58 },
  { hora: 5, color: 0x0b1330, alpha: 0.58 },
  { hora: 6.5, color: 0xe8965a, alpha: 0.30 },
  { hora: 8, color: 0xffffff, alpha: 0 },
  { hora: 18, color: 0xffffff, alpha: 0 },
  { hora: 19.5, color: 0xe8965a, alpha: 0.30 },
  { hora: 21.5, color: 0x0b1330, alpha: 0.58 },
  { hora: 24, color: 0x0b1330, alpha: 0.58 },
];

export class DiaNocheSystem {
  update(dt) {
    GameState.avanzarReloj(dt * MINUTOS_POR_SEGUNDO);
  }

  // el color y el alfa del velo para la hora actual, y la hora en si para
  // pintar el relojito del HUD
  velo() {
    const hora = GameState.horaDelDia;
    let a = KEYFRAMES[0];
    let b = KEYFRAMES[1];
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (hora >= KEYFRAMES[i].hora && hora <= KEYFRAMES[i + 1].hora) {
        a = KEYFRAMES[i];
        b = KEYFRAMES[i + 1];
        break;
      }
    }
    const rango = b.hora - a.hora;
    const t = rango > 0 ? (hora - a.hora) / rango : 0;
    // se mezclan los canales a mano (el color ya es un numero 0xRRGGBB):
    // asi no depende de que forma tenga la API de color de Phaser
    const mezclar = (shift) => {
      const ca = (a.color >> shift) & 0xff;
      const cb = (b.color >> shift) & 0xff;
      return Math.round(ca + (cb - ca) * t);
    };
    const color = (mezclar(16) << 16) | (mezclar(8) << 8) | mezclar(0);
    return { color, alpha: a.alpha + (b.alpha - a.alpha) * t, hora };
  }
}
