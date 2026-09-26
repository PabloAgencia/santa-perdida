import { COLORS } from '../config/balance.js';
import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { MISSIONS } from '../config/missions.js';
import { ZONAS_CON_PISO, clavePiso } from '../config/pisos.js';
import { NEGOCIOS, claveNegocio } from '../config/negocios.js';
import { VEHICLE_KEYS } from '../config/vehicles.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// A partir de aqui las entregas (que son infinitas, sin tope natural)
// cuentan el 100% para el progreso. Numero a ojo, se ajusta sin tocar nada
// mas.
const TOPE_ENTREGAS = 20;

// EL "100%" DE SAN ANDREAS: una pantalla que dice de un vistazo que falta.
// Se abre con P, la ciudad se congela detras como con el mapa o la pausa.
// No guarda nada nuevo: solo lee lo que ya vive en GameState y lo resume.
export class ProgresoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ProgresoScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    Audio.engine(false, 0, false);
    Audio.skid(0);
    Audio.siren(0);
    Audio.menuOpen();

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.93);

    const categorias = this.calcular();
    const total = categorias.reduce((s, c) => s + c.fraccion, 0) / categorias.length;

    this.add.text(w / 2, h / 2 - 232, 'SANTA PERDIDA', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 5,
      fontSize: '20px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.add.text(w / 2, h / 2 - 188, `${Math.floor(total * 100)}%`, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 8,
      fontSize: '64px', color: '#e8b54a',
    }).setOrigin(0.5);

    this.add.text(w / 2, h / 2 - 124, 'COMPLETADO', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '15px', color: COLORS.dim,
    }).setOrigin(0.5);

    const anchoBarra = 420;
    const filaAlto = 48;
    const y0 = h / 2 - 54;
    categorias.forEach((c, i) => this.fila(w / 2, y0 + i * filaAlto, anchoBarra, c));

    this.add.text(w / 2, y0 + categorias.length * filaAlto + 26, 'P o ESC para cerrar', {
      fontFamily: FONT, fontSize: '15px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.teclas = this.input.keyboard.addKeys({ progreso: 'P', salir: 'ESC' });
    this.input.keyboard.addCapture('P,ESC');
  }

  fila(cx, y, ancho, c) {
    this.add.text(cx - ancho / 2, y - 12, c.nombre, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '14px', color: COLORS.ink,
    }).setOrigin(0, 0.5);

    this.add.text(cx + ancho / 2, y - 12, c.etiqueta, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '14px', color: c.fraccion >= 1 ? COLORS.money : COLORS.dim,
    }).setOrigin(1, 0.5);

    const bh = 8;
    const by = y + 10;
    this.add.image(cx - ancho / 2, by, 'px').setOrigin(0, 0.5)
      .setDisplaySize(ancho, bh).setTint(0x2a2d33);
    this.add.image(cx - ancho / 2, by, 'px').setOrigin(0, 0.5)
      .setDisplaySize(Math.max(2, ancho * c.fraccion), bh)
      .setTint(c.fraccion >= 1 ? 0x8fd694 : 0xe8b54a);
  }

  // Cinco categorias, cada una pesa lo mismo en el total. Solo lee
  // GameState: nada de esto vive en ningun sitio nuevo.
  calcular() {
    const misiones = MISSIONS.filter((m) => GameState.flags.misiones?.[m.id]).length;
    const pisos = ZONAS_CON_PISO.filter((z) => GameState.esDueno(clavePiso(z))).length;
    const negociosTotal = Object.keys(NEGOCIOS).length;
    const negocios = Object.keys(NEGOCIOS).filter((z) => GameState.esDueno(claveNegocio(z))).length;
    const coches = VEHICLE_KEYS.filter((t) => GameState.flags.cochesComprados?.[t]).length;
    const entregas = GameState.stats.deliveries || 0;

    return [
      { nombre: 'Misiones', etiqueta: `${misiones} / ${MISSIONS.length}`, fraccion: misiones / MISSIONS.length },
      { nombre: 'Pisos', etiqueta: `${pisos} / ${ZONAS_CON_PISO.length}`, fraccion: pisos / ZONAS_CON_PISO.length },
      { nombre: 'Negocios', etiqueta: `${negocios} / ${negociosTotal}`, fraccion: negocios / negociosTotal },
      { nombre: 'Coches', etiqueta: `${coches} / ${VEHICLE_KEYS.length}`, fraccion: coches / VEHICLE_KEYS.length },
      { nombre: 'Entregas', etiqueta: `${entregas} / ${TOPE_ENTREGAS}+`, fraccion: Math.min(entregas, TOPE_ENTREGAS) / TOPE_ENTREGAS },
    ];
  }

  cerrar() {
    Audio.menuClose();
    this.scene.stop();
    this.scene.resume('UIScene');
    this.scene.resume('CityScene');
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.teclas.progreso) ||
        Phaser.Input.Keyboard.JustDown(this.teclas.salir)) {
      this.cerrar();
    }
  }
}
