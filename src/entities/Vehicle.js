import { VEHICLES } from '../config/vehicles.js';
import { DRIVING } from '../config/balance.js';
import { EventBus, EVT } from '../core/EventBus.js';

let nextId = 1;

export class Vehicle {
  constructor(scene, map, type, x, y, angle = 0, opts = {}) {
    this.scene = scene;
    this.map = map;
    this.type = type;
    this.stats = VEHICLES[type];
    this.id = opts.id ?? `v${nextId++}`;

    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = 0;
    this.vy = 0;
    this.hp = opts.hp ?? this.stats.maxHp;
    this.lateral = 0;
    this.crashCooldown = 0;
    this.occupied = false;
    // un coche aparcado y vacio no lleva los faros puestos
    this.encendido = opts.encendido ?? false;
    this.frenando = false;
    this.color = opts.color ?? Math.floor(Math.random() * this.stats.palette.length);
    this.mass = (this.stats.length * this.stats.width) / 900;

    this.shadow = scene.add.image(x + 3, y + 4, 'shadow')
      .setDisplaySize(this.stats.length * 1.05, this.stats.width * 1.15)
      .setAlpha(0.4);

    // los faros van por delante del morro y giran con el coche
    this.beam = scene.add.image(x, y, 'beam')
      .setOrigin(0.5, 0)
      .setDisplaySize(this.stats.width * 5.5, this.stats.length * 4.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.85)
      .setVisible(false);

    // pilotos de freno: se encienden al pisar el freno, como en los GTA
    this.stopLights = scene.add.image(x, y, 'px')
      .setDisplaySize(4, this.stats.width * 0.72)
      .setTint(0xff3b28)
      .setAlpha(0.9)
      .setVisible(false);

    this.sprite = scene.add.image(x, y, `veh-${type}-${this.color}`);

    this.buildProbes();
    this.syncSprite();
  }

  // puntos de prueba repartidos por los dos costados: con solo las esquinas,
  // un vehiculo largo podria atravesar un muro estrecho sin tocarlo
  buildProbes() {
    const hl = (this.stats.length / 2) * 0.94;
    const hw = (this.stats.width / 2) * 0.88;
    const n = Math.max(2, Math.ceil(this.stats.length / 22));
    this.probes = [];
    for (let i = 0; i <= n; i++) {
      const along = -hl + 2 * hl * (i / n);
      this.probes.push({ x: along, y: -hw }, { x: along, y: hw });
    }
  }

  // dos circulos aproximan el rectangulo del coche mucho mejor que uno solo,
  // y salen mucho mas baratos que una colision de cajas giradas
  getCircles() {
    const off = this.stats.length * 0.24;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const r = this.stats.width * 0.58;
    return [
      { x: this.x + cos * off, y: this.y + sin * off, r },
      { x: this.x - cos * off, y: this.y - sin * off, r },
    ];
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  get speedKmh() {
    return Math.round(this.speed / 3.2);
  }

  get wrecked() {
    return this.hp <= 0;
  }

  hitsWorld(px, py, ang) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    for (const p of this.probes) {
      const wx = px + p.x * c - p.y * s;
      const wy = py + p.x * s + p.y * c;
      if (this.map.isSolidPoint(wx, wy)) return true;
    }
    return false;
  }

  update(dt, input) {
    const s = this.stats;
    if (this.crashCooldown > 0) this.crashCooldown -= dt;

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    let vf = this.vx * cos + this.vy * sin;
    let vr = -this.vx * sin + this.vy * cos;

    const power = this.wrecked ? 0.35 : 1;
    const topSpeed = s.maxSpeed * power;

    this.frenando = !!input.brake && vf > 1;

    if (input.throttle) {
      // El empuje cae segun te acercas al tope. Antes la aceleracion era
      // plana y todos los coches llegaban a su maxima en un segundo: daba
      // igual conducir una furgoneta que un deportivo.
      const falta = Phaser.Math.Clamp(1 - Math.abs(vf) / topSpeed, 0, 1);
      vf += s.accel * power * (0.18 + 0.82 * Math.pow(falta, 0.7)) * dt;
    } else if (input.brake) {
      if (vf > 1) vf = Math.max(0, vf - s.brake * dt);
      else vf = Math.max(-s.reverseSpeed * power, vf - s.accel * 0.7 * dt);
    } else {
      const drag = DRIVING.rollingDrag * dt;
      vf = vf > 0 ? Math.max(0, vf - drag) : Math.min(0, vf + drag);
    }
    vf = Phaser.Math.Clamp(vf, -s.reverseSpeed * power, topSpeed);

    // no se gira parado, y a tope de velocidad el volante pesa un poco mas.
    // El coche coge el volante enseguida: es lo que hace que se sienta agil.
    // Se coge el volante antes: con el umbral alto, un coche saliendo de un
    // cruce despacio no podia girar y se iba derecho contra la acera.
    const grip = Math.min(1, Math.abs(vf) / (s.maxSpeed * 0.1));
    const heavy = 1 - 0.22 * Math.min(1, Math.abs(vf) / s.maxSpeed);
    const dir = vf < 0 ? -1 : 1;
    // cuanto mejor conduce el que va al volante, mejor toma las curvas
    const pericia = input.pericia || 0;
    const steer = s.turnRate * (1 + pericia * 0.1) * grip * heavy * dir;

    let newAngle = this.angle;
    if (input.left) newAngle -= steer * dt;
    if (input.right) newAngle += steer * dt;
    if (newAngle !== this.angle && !this.hitsWorld(this.x, this.y, newAngle)) {
      this.angle = newAngle;
    }

    // menos retencion lateral = mas agarre y menos derrape
    const agarre = s.lateralRetention * (1 - pericia * 0.07);
    const retention = input.handbrake ? DRIVING.handbrakeRetention : agarre;
    vr *= Math.pow(retention, dt * 60);
    this.lateral = Math.abs(vr);
    if (input.handbrake && vf > 0) vf = Math.max(0, vf - s.brake * 0.55 * dt);

    const nc = Math.cos(this.angle);
    const ns = Math.sin(this.angle);
    this.vx = nc * vf - ns * vr;
    this.vy = ns * vf + nc * vr;

    this.moveAndCollide(dt);
    this.syncSprite();
  }

  moveAndCollide(dt) {
    const dx = this.vx * dt;
    const dy = this.vy * dt;
    let impact = 0;

    if (!this.hitsWorld(this.x + dx, this.y, this.angle)) {
      this.x += dx;
    } else {
      impact = Math.max(impact, Math.abs(this.vx));
      this.vx *= -0.18;
    }

    if (!this.hitsWorld(this.x, this.y + dy, this.angle)) {
      this.y += dy;
    } else {
      impact = Math.max(impact, Math.abs(this.vy));
      this.vy *= -0.18;
    }

    if (impact > DRIVING.crashMinSpeed && this.crashCooldown <= 0) {
      this.crashCooldown = 0.35;
      const damage = impact * DRIVING.crashDamagePerSpeed;
      this.hp = Math.max(0, this.hp - damage);
      this.vx *= 1 - DRIVING.crashSpeedLoss;
      this.vy *= 1 - DRIVING.crashSpeedLoss;
      EventBus.emit(EVT.VEHICLE_CRASHED, {
        vehicle: this,
        impact,
        damage,
        hp: this.hp,
      });
    }
  }

  syncSprite() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const nose = this.stats.length * 0.42;

    // solo lleva luces el que esta en marcha o con alguien dentro
    const luces = this.occupied || this.encendido;
    this.beam.setVisible(luces);
    if (luces) {
      this.beam.setPosition(this.x + cos * nose, this.y + sin * nose);
      this.beam.setRotation(this.angle - Math.PI / 2);
      this.beam.setDepth(this.y - 4);
    }

    this.stopLights.setVisible(luces && this.frenando);
    if (luces && this.frenando) {
      const cola = -this.stats.length * 0.46;
      this.stopLights
        .setPosition(this.x + cos * cola, this.y + sin * cola)
        .setRotation(this.angle)
        .setDepth(this.y + 0.2);
    }

    this.sprite.setPosition(this.x, this.y);
    this.sprite.setRotation(this.angle);
    this.sprite.setDepth(this.y);
    this.shadow.setPosition(this.x + 3, this.y + 4);
    this.shadow.setRotation(this.angle);
    this.shadow.setDepth(this.y - 1);

    const wear = 1 - 0.45 * (1 - this.hp / this.stats.maxHp);
    const tint = Phaser.Display.Color.GetColor(255 * wear, 255 * wear, 255 * wear);
    this.sprite.setTint(tint);
  }

  // punto despejado al costado para bajarse
  findExitSpot() {
    const side = this.stats.width * 0.75 + 12;
    const offsets = [Math.PI / 2, -Math.PI / 2, Math.PI, 0];
    for (const off of offsets) {
      const a = this.angle + off;
      const x = this.x + Math.cos(a) * side;
      const y = this.y + Math.sin(a) * side;
      if (!this.map.isSolidBox(x, y, 10, 10)) return { x, y };
    }
    return { x: this.x, y: this.y };
  }

  // empujon recibido de otro vehiculo, ya resuelto por VehicleCollisions
  push(dx, dy, impulseX, impulseY, impact) {
    if (!this.hitsWorld(this.x + dx, this.y + dy, this.angle)) {
      this.x += dx;
      this.y += dy;
    }
    this.vx += impulseX;
    this.vy += impulseY;
    this.syncSprite();

    if (impact > DRIVING.crashMinSpeed && this.crashCooldown <= 0) {
      this.crashCooldown = 0.35;
      this.hp = Math.max(0, this.hp - impact * DRIVING.crashDamagePerSpeed * 0.7);
      EventBus.emit(EVT.VEHICLE_CRASHED, {
        vehicle: this,
        impact,
        damage: impact * DRIVING.crashDamagePerSpeed * 0.7,
        hp: this.hp,
      });
    }
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      x: Math.round(this.x),
      y: Math.round(this.y),
      angle: +this.angle.toFixed(3),
      hp: Math.round(this.hp),
      color: this.color,
    };
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.beam.destroy();
    this.stopLights.destroy();
  }
}
