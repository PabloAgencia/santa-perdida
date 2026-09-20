import { PLAYER } from '../config/balance.js';
import { FASES } from '../world/personArt.js';

export class Player {
  constructor(scene, map, x, y) {
    this.scene = scene;
    this.map = map;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.radius = PLAYER.radius;
    this.running = false;

    this.shadow = scene.add.image(x, y + 5, 'shadow').setScale(0.42).setAlpha(0.5);
    this.paso = 0;
    this.fase = 0;
    this.sprite = scene.add.image(x, y, 'player-0');
    this.sprite.setOrigin(0.5);
  }

  setVisible(v) {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.syncSprite();
  }

  update(dt, input) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    this.running = input.run && (dx !== 0 || dy !== 0);
    const speed = this.running ? PLAYER.runSpeed : PLAYER.walkSpeed;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx = (dx / len) * speed * dt;
      dy = (dy / len) * speed * dt;

      this.moveAxis(dx, 0);
      this.moveAxis(0, dy);

      const target = Math.atan2(dy, dx);
      this.angle = Phaser.Math.Angle.RotateTo(this.angle, target, 14 * dt);

      // el ciclo de paso corre con la velocidad: si andas despacio, anda despacio
      this.paso += (speed / 46) * dt;
      const fase = Math.floor(this.paso) % FASES;
      if (fase !== this.fase) {
        this.fase = fase;
        this.sprite.setTexture(`player-${fase}`);
      }
    } else if (this.fase !== 0) {
      this.fase = 0;
      this.paso = 0;
      this.sprite.setTexture('player-0');
    }

    this.syncSprite();
  }

  moveAxis(dx, dy) {
    if (dx === 0 && dy === 0) return;
    const nx = this.x + dx;
    const ny = this.y + dy;

    // Red de seguridad: si por lo que sea acabas DENTRO de un muro, se te deja
    // salir. Sin esto, al prohibir todo movimiento hacia zona solida te
    // quedabas bloqueado para siempre.
    if (this.map.isSolidBox(this.x, this.y, this.radius, this.radius)) {
      this.x = nx;
      this.y = ny;
      return;
    }

    if (!this.map.isSolidBox(nx, ny, this.radius, this.radius)) {
      this.x = nx;
      this.y = ny;
    }
  }

  syncSprite() {
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setRotation(this.angle);
    this.sprite.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 5);
    this.shadow.setDepth(this.y - 1);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
