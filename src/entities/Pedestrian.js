export class Pedestrian {
  constructor(scene, map, x, y, skin, faction = null) {
    this.scene = scene;
    this.map = map;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.radius = 8;
    this.skin = skin;
    this.faction = faction;
    this.hostile = false;
    this.chaseTarget = null;
    this.attackCooldown = 0;

    this.state = 'walking';
    this.target = null;
    this.stateTimer = 0;
    this.stuck = 0;
    this.down = false;
    this.downTimer = 0;
    this.baseSpeed = 38 + Math.random() * 24;

    this.shadow = scene.add.image(x, y + 4, 'shadow').setScale(0.3).setAlpha(0.4);
    this.sprite = scene.add.image(x, y, faction ? `gang-${faction}` : `ped-${skin}`);
  }

  knockDown(fatal = false) {
    if (this.down) return;
    this.down = true;
    this.dead = fatal;
    this.state = 'down';
    this.downTimer = 0;
    this.hostile = false;
    this.chaseTarget = null;
    this.sprite.setTint(fatal ? 0x6e3a34 : 0x9a5a52);
    this.sprite.setRotation(this.angle + Math.PI / 2);
    this.shadow.setAlpha(0.15);

    if (fatal) {
      const charco = this.scene.add.image(this.x, this.y, 'px')
        .setDisplaySize(26 + Math.random() * 14, 18 + Math.random() * 10)
        .setTint(0x5e1f1a)
        .setAlpha(0.72)
        .setDepth(this.y - 6);
      this.scene.tweens.add({ targets: charco, scaleX: 1.35, scaleY: 1.35, duration: 2200 });
      this.blood = charco;
    }
  }

  flee(fromX, fromY, seconds = 2.6) {
    if (this.down) return;
    this.state = 'fleeing';
    this.stateTimer = seconds;
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.target = {
      x: this.x + Math.cos(a) * 260,
      y: this.y + Math.sin(a) * 260,
    };
  }

  pickTarget(spots) {
    let best = null;
    let fallback = null;

    for (let tries = 0; tries < 26; tries++) {
      const s = spots[Math.floor(Math.random() * spots.length)];
      if (!s) break;
      const d = Phaser.Math.Distance.Between(this.x, this.y, s.x, s.y);
      if (d < 70 || d > 420) continue;
      if (!fallback) fallback = s;
      // la gente no cruza en diagonal media ciudad: se descartan los
      // destinos cuyo camino recto va casi todo por el asfalto
      if (this.roadFraction(s) <= 0.3) {
        best = s;
        break;
      }
    }

    this.target = best || fallback;
    this.stuck = 0;
  }

  roadFraction(target) {
    const steps = 8;
    let onRoad = 0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = this.x + (target.x - this.x) * t;
      const y = this.y + (target.y - this.y) * t;
      if (this.map.isRoadPoint(x, y)) onRoad++;
    }
    return onRoad / steps;
  }

  update(dt, spots) {
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (this.down) {
      this.downTimer += dt;
      this.syncSprite();
      return;
    }

    // los de banda que te tienen ganas van a por ti en vez de pasear
    if (this.hostile && this.chaseTarget) {
      const dx = this.chaseTarget.x - this.x;
      const dy = this.chaseTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 14) {
        const speed = this.baseSpeed * 1.55;
        this.tryMove((dx / dist) * speed * dt, 0);
        this.tryMove(0, (dy / dist) * speed * dt);
        this.angle = Phaser.Math.Angle.RotateTo(this.angle, Math.atan2(dy, dx), 14 * dt);
      }
      this.syncSprite();
      return;
    }

    if (this.state === 'fleeing') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'walking';
        this.target = null;
      }
    } else if (this.state === 'waiting') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.state = 'walking';
      this.syncSprite();
      return;
    }

    if (!this.target) this.pickTarget(spots);
    if (!this.target) {
      this.syncSprite();
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 16) {
      this.target = null;
      if (this.state === 'walking' && Math.random() < 0.35) {
        this.state = 'waiting';
        this.stateTimer = 0.8 + Math.random() * 2.2;
      }
      this.syncSprite();
      return;
    }

    const speed = this.baseSpeed * (this.state === 'fleeing' ? 2.1 : 1);
    const stepX = (dx / dist) * speed * dt;
    const stepY = (dy / dist) * speed * dt;

    const movedX = this.tryMove(stepX, 0);
    const movedY = this.tryMove(0, stepY);

    if (!movedX && !movedY) {
      this.stuck += dt;
      if (this.stuck > 0.5) this.pickTarget(spots);
    } else {
      this.stuck = 0;
      this.angle = Phaser.Math.Angle.RotateTo(this.angle, Math.atan2(stepY, stepX), 12 * dt);
    }

    this.syncSprite();
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

  syncSprite() {
    this.sprite.setPosition(this.x, this.y);
    if (!this.down) this.sprite.setRotation(this.angle);
    this.sprite.setDepth(this.down ? this.y - 2 : this.y);
    this.shadow.setPosition(this.x, this.y + 4);
    this.shadow.setDepth(this.y - 3);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    if (this.blood) this.blood.destroy();
  }
}
