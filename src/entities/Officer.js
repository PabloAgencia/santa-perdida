const RADIO = 9;

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
    this.speed = 132 + Math.random() * 26;
    this.stuck = 0;

    this.shadow = scene.add.image(x, y + 4, 'shadow').setScale(0.32).setAlpha(0.45);
    this.sprite = scene.add.image(x, y, 'officer');
  }

  update(dt, tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
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
