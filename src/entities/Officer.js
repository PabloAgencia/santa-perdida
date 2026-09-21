import { FASES } from '../world/personArt.js';
import { VIDA } from '../config/weapons.js';
import { GameState } from '../core/GameState.js';

const RADIO = 9;

// Con una estrella te quieren detener y van a por ti; a partir de dos sacan
// el arma. Asi la primera estrella se puede jugar corriendo, y tener tres
// significa algo distinto a tener una.
const TIRO = {
  desdeBusca: 2,
  alcance: 290,
  dano: 8,
  cadencia: 1.5,       // segundos entre tiros
  dispersion: 9,       // grados: fallan bastante mas que tu
  masSiCorres: 6,      // y mucho mas si no te quedas quieto
  seQuedanA: 140,      // si estan a menos, no se acercan mas: paran y disparan
};

// Agente a pie. Sale del coche cuando vas andando y te persigue para
// detenerte; si te subes a un coche, vuelve corriendo al suyo.
export class Officer {
  constructor(scene, map, x, y) {
    this.scene = scene;
    this.map = map;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.radius = RADIO;
    this.speed = 112 + Math.random() * 22;
    this.stuck = 0;
    this.vida = VIDA.policia;
    this.down = false;
    this.recarga = 1.3;   // margen para reaccionar al verles bajar del coche

    this.shadow = scene.add.image(x, y + 4, 'shadow').setScale(0.32).setAlpha(0.45);
    this.paso = 0;
    this.fase = 0;
    this.sprite = scene.add.image(x, y, 'officer-0');
  }

  // Los agentes aguantan mas que un peaton, y cuando caen se quedan en el
  // suelo: quien se lo cargue, que sepa lo que ha hecho.
  recibirDano(cantidad) {
    if (this.down) return null;
    this.vida -= cantidad;
    this.sprite.setTint(0xff8a7a);
    if (this.scene && this.scene.time) {
      this.scene.time.delayedCall(110, () => {
        if (!this.down && this.sprite && this.sprite.active) this.sprite.clearTint();
      });
    }
    if (this.vida > 0) return 'tocado';

    this.down = true;
    this.sprite.setTint(0x6e3a34);
    this.sprite.setRotation(this.angle + Math.PI / 2);
    this.shadow.setAlpha(0.15);
    return 'muerto';
  }

  // Dispara si le toca: solo con dos estrellas o mas, con el jugador a tiro y
  // sin pared en medio. Devuelve true si ademas debe quedarse quieto.
  intentarDisparar(dt, objetivo, dist) {
    this.recarga -= dt;
    if (GameState.wanted < TIRO.desdeBusca) return false;
    if (dist > TIRO.alcance) return false;

    const combat = this.scene.combat;
    if (!combat || !combat.veA(this, objetivo, TIRO.alcance)) return false;

    if (this.recarga <= 0) {
      this.recarga = TIRO.cadencia * (0.8 + Math.random() * 0.5);
      // a un blanco que corre se le falla: quedarse quieto a cubierto y correr
      // tienen que ser decisiones distintas
      const corriendo = this.scene.player && this.scene.player.running;
      const desvio = TIRO.dispersion + (corriendo ? TIRO.masSiCorres : 0);
      combat.disparoDeNPC(this, objetivo, TIRO.dano, TIRO.alcance, desvio);
    }
    return dist < TIRO.seQuedanA;
  }

  update(dt, tx, ty) {
    if (this.down) return Infinity;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      this.sync();
      return dist;
    }

    if (this.intentarDisparar(dt, { x: tx, y: ty }, dist)) {
      // plantado y encarado, disparando: no se te echa encima
      this.angle = Phaser.Math.Angle.RotateTo(this.angle, Math.atan2(dy, dx), 12 * dt);
      this.sync();
      return dist;
    }

    const paso = this.speed * dt;
    const movX = this.tryMove((dx / dist) * paso, 0);
    const movY = this.tryMove(0, (dy / dist) * paso);

    // si se atasca contra una esquina, la bordea
    if (!movX && !movY) {
      this.stuck += dt;
      const rodeo = this.stuck * 6;
      this.tryMove(Math.cos(rodeo) * paso, Math.sin(rodeo) * paso);
    } else {
      this.stuck = 0;
    }

    this.angle = Phaser.Math.Angle.RotateTo(this.angle, Math.atan2(dy, dx), 12 * dt);
    this.paso += (this.speed / 44) * dt;
    const fase = Math.floor(this.paso) % FASES;
    if (fase !== this.fase) {
      this.fase = fase;
      this.sprite.setTexture(`officer-${fase}`);
    }
    this.sync();
    return dist;
  }

  tryMove(dx, dy) {
    if (dx === 0 && dy === 0) return false;
    const nx = this.x + dx;
    const ny = this.y + dy;
    if (this.map.isSolidBox(nx, ny, this.radius, this.radius)) return false;
    this.x = nx;
    this.y = ny;
    return true;
  }

  sync() {
    this.sprite.setPosition(this.x, this.y).setRotation(this.angle).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 4).setDepth(this.y - 1);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
