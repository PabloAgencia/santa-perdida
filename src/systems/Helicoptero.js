import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';

// EL HELICOPTERO DE LA POLICIA (19-nov-2026), el de todos los GTA: sale con 4
// estrellas o mas. Vuela por encima de todo (no choca con nada), da vueltas a
// tu alrededor y te sigue con el FOCO. Mientras estes dentro del foco la
// policia sabe donde estas y no se pierde la busca; el foco va algo mas lento
// que un coche rapido, asi que a todo gas por calles anchas se le escapa.
// Con 5 estrellas, ademas, te disparan desde la puerta.
// Al bajar de 4 estrellas se va por donde ha venido.

const VELOCIDAD = 250;        // px/s del aparato
const VELOCIDAD_FOCO = 235;   // px/s del foco: un deportivo a fondo se le escapa
const RADIO_FOCO = 78;        // dentro de esto, te ven
const ORBITA = 150;
const ALTURA = 70;            // la sombra se dibuja desplazada: va alto

export class Helicoptero {
  constructor(scene) {
    this.scene = scene;
    this.activo = false;
    this.yendose = false;
  }

  crear(cerca) {
    const s = this.scene;
    const a = Math.random() * Math.PI * 2;
    this.x = cerca.x + Math.cos(a) * 900;
    this.y = cerca.y + Math.sin(a) * 900;
    this.foco = { x: cerca.x, y: cerca.y };
    this.angulo = 0;
    this.orbita = 0;
    this.recarga = 2;
    this.rotor = 0;

    this.sombra = s.add.ellipse(0, 0, 46, 22, 0x05060a, 0.35).setDepth(9000);
    this.luz = s.add.image(0, 0, 'lamp').setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xf2f4ff).setAlpha(0.55).setDisplaySize(RADIO_FOCO * 2.6, RADIO_FOCO * 2.6).setDepth(9001);
    this.cuerpo = s.add.container(0, 0).setDepth(9500);
    const g = s.add.graphics();
    // la cola, el cuerpo (azul y blanco, como las patrullas) y la cabina
    g.fillStyle(0x1a2a4a, 1).fillRect(-46, -3, 34, 6);
    g.fillStyle(0x1a2a4a, 1).fillRect(-50, -9, 6, 18);
    g.fillStyle(0x24406e, 1).fillEllipse(0, 0, 44, 24);
    g.fillStyle(0xf2efe6, 1).fillRect(-8, -12, 6, 24);
    g.fillStyle(0x9fd8f0, 0.9).fillEllipse(14, 0, 14, 16);
    this.palas = s.add.graphics();
    this.baliza = s.add.circle(-4, 0, 3, 0xd9384a);
    this.cuerpo.add([g, this.palas, this.baliza]);
    this.activo = true;
    this.yendose = false;
  }

  retirar() {
    if (!this.activo) return;
    this.yendose = true;
  }

  destruir() {
    if (!this.activo) return;
    for (const o of [this.sombra, this.luz, this.cuerpo]) o.destroy();
    this.activo = false;
    this.yendose = false;
  }

  // Devuelve true si el foco te esta viendo.
  update(dt, player, vehiculo) {
    const nivel = GameState.wanted;
    if (!this.activo) {
      if (nivel >= 4) this.crear(player);
      return false;
    }
    if (nivel < 4) this.retirar();

    const obj = vehiculo || player;
    // el aparato: o se va, o se acerca y da vueltas
    let tx, ty;
    if (this.yendose) {
      tx = this.x + Math.cos(this.angulo) * 1000;
      ty = this.y + Math.sin(this.angulo) * 1000;
      if (Phaser.Math.Distance.Between(this.x, this.y, obj.x, obj.y) > 1400) { this.destruir(); return false; }
    } else {
      this.orbita += dt * 0.6;
      tx = obj.x + Math.cos(this.orbita) * ORBITA;
      ty = obj.y + Math.sin(this.orbita) * ORBITA;
    }
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const paso = Math.min(d, VELOCIDAD * dt);
    this.x += (dx / d) * paso;
    this.y += (dy / d) * paso;
    if (d > 4) this.angulo = Phaser.Math.Angle.RotateTo(this.angulo, Math.atan2(dy, dx), 3 * dt);

    // el foco persigue al jugador a su ritmo
    const fx = obj.x - this.foco.x;
    const fy = obj.y - this.foco.y;
    const fd = Math.hypot(fx, fy) || 1;
    const fp = Math.min(fd, VELOCIDAD_FOCO * dt);
    if (!this.yendose) { this.foco.x += (fx / fd) * fp; this.foco.y += (fy / fd) * fp; }
    const teVe = !this.yendose && Phaser.Math.Distance.Between(this.foco.x, this.foco.y, obj.x, obj.y) < RADIO_FOCO;

    // dibujo
    this.rotor += dt * 28;
    this.palas.clear().lineStyle(3, 0x15181d, 0.85);
    for (let k = 0; k < 2; k++) {
      const a = this.rotor + k * Math.PI / 2;
      this.palas.lineBetween(Math.cos(a) * -30, Math.sin(a) * -30, Math.cos(a) * 30, Math.sin(a) * 30);
    }
    this.baliza.setFillStyle(Math.floor(this.rotor / 4) % 2 ? 0xd9384a : 0x4a8fd0);
    this.cuerpo.setPosition(this.x, this.y - ALTURA * 0.3).setRotation(this.angulo);
    this.sombra.setPosition(this.x + 26, this.y + ALTURA * 0.6).setRotation(this.angulo);
    this.luz.setPosition(this.foco.x, this.foco.y).setAlpha(this.yendose ? 0 : (teVe ? 0.7 : 0.45));

    // con 5 estrellas, tiros desde la puerta (solo si te tiene en el foco)
    if (nivel >= 5 && teVe && !this.yendose) {
      this.recarga -= dt;
      if (this.recarga <= 0 && this.scene.combat) {
        this.recarga = 1.3 + Math.random() * 0.8;
        this.scene.combat.disparoDeNPC({ x: this.x, y: this.y }, obj, 6, 700, 7, 'rifle');
        Audio.notes([110], 0.04, 'square', 0.03);
      }
    }
    return teVe;
  }
}
