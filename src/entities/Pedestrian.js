import { FASES } from '../world/personArt.js';
import { VIDA } from '../config/weapons.js';

export class Pedestrian {
  constructor(scene, map, x, y, skin, faction = null, pathfinder = null) {
    this.scene = scene;
    this.map = map;
    this.pathfinder = pathfinder;
    this.ruta = null;
    this.rutaIdx = 0;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.radius = 8;
    this.skin = skin;
    this.faction = faction;
    this.hostile = false;
    this.chaseTarget = null;
    this.attackCooldown = 0;
    this.enCoche = null;
    this.rencor = false;
    // uno de cada cuatro de banda lleva hierro; el resto, a puñetazos
    this.armado = !!faction && Math.random() < 0.25;
    this.recarga = 0;

    this.state = 'walking';
    this.target = null;
    this.stateTimer = 0;
    this.stuck = 0;
    this.vida = faction ? VIDA.pandillero : VIDA.peaton;
    this.vidaMax = this.vida;
    this.down = false;
    this.downTimer = 0;
    this.baseSpeed = 38 + Math.random() * 24;

    this.shadow = scene.add.image(x, y + 4, 'shadow').setScale(0.3).setAlpha(0.4);
    this.base = faction ? `gang-${faction}` : `ped-${skin}`;
    this.paso = 0;
    this.fase = 0;
    this.sprite = scene.add.image(x, y, `${this.base}-0`);
  }

  // Un golpe o un tiro. Devuelve 'muerto', 'tocado' o null si ya estaba en
  // el suelo. Al que sobrevive le da por huir, o por venir a por ti si es de
  // una banda que ya te tenia ganas.
  recibirDano(cantidad, desdeX, desdeY, deCerca = false) {
    if (this.down) return null;
    this.vida -= cantidad;
    this.marcarGolpe();

    // Un golpe de cerca aturde y empuja. Es lo que hace que puedas GANAR
    // una pelea: si sigues pegando, el otro no llega a devolvertela.
    if (deCerca) {
      this.attackCooldown = Math.max(this.attackCooldown || 0, 0.6);
      const ang = Math.atan2(this.y - desdeY, this.x - desdeX);
      const nx = this.x + Math.cos(ang) * 7;
      const ny = this.y + Math.sin(ang) * 7;
      if (!this.map.isSolidBox(nx, ny, this.radius, this.radius)) {
        this.x = nx;
        this.y = ny;
      }
    }

    if (this.vida <= 0) {
      this.knockDown(true);
      return 'muerto';
    }
    if (!this.hostile) {
      // De cada diez que reciben un golpe, siete salen corriendo y tres se
      // revuelven. Que TODOS huyeran quitaba tension, y que todos se
      // encararan convertia cualquier tonteria en una pelea de barrio.
      // Los de banda se revuelven mas: es su calle.
      const seRevuelve = Math.random() < (this.faction ? 0.55 : 0.3);
      if (seRevuelve) {
        this.rencor = true;
        this.hostile = true;
        this.chaseTarget = { x: desdeX, y: desdeY };
        // el que se encara viene con ganas, pero tarda en soltar el primero
        this.attackCooldown = 0.8;
      } else {
        this.flee(desdeX, desdeY, 4);
      }
    }
    return 'tocado';
  }

  // parpadeo rojo al encajar un golpe: sin esto no se sabe si le has dado
  marcarGolpe() {
    this.sprite.setTint(0xff8a7a);
    if (this.scene && this.scene.time) {
      this.scene.time.delayedCall(110, () => {
        if (!this.down && this.sprite && this.sprite.active) this.sprite.clearTint();
      });
    }
  }

  knockDown(fatal = false) {
    if (this.down) return;
    this.down = true;
    this.dead = fatal;
    this.state = 'down';
    this.downTimer = 0;
    this.hostile = false;
    this.chaseTarget = null;
    this.ruta = null;
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

  // Huir de algo. OJO: hay que BORRAR la ruta que llevaba calculada; si no,
  // el camino manda sobre el destino y el peaton "huye" hacia donde iba, pero
  // al doble de velocidad. Era justo lo que le pasaba debajo de los coches.
  flee(fromX, fromY, seconds = 2.6) {
    if (this.down || this.enCoche) return;
    this.state = 'fleeing';
    this.stateTimer = seconds;
    this.ruta = null;
    this.rutaIdx = 0;

    const escape = Math.atan2(this.y - fromY, this.x - fromX);
    // se busca una salida que NO sea calzada: la gente se aparta a la acera,
    // no corre calle abajo por delante del coche
    const opciones = [0, 0.6, -0.6, 1.2, -1.2, Math.PI / 2, -Math.PI / 2];
    for (const giro of opciones) {
      const a = escape + giro;
      const x = this.x + Math.cos(a) * 130;
      const y = this.y + Math.sin(a) * 130;
      if (this.map.isSolidBox(x, y, this.radius, this.radius)) continue;
      if (this.map.isRoadPoint(x, y)) continue;
      this.target = { x, y };
      return;
    }
    this.target = {
      x: this.x + Math.cos(escape) * 200,
      y: this.y + Math.sin(escape) * 200,
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
    this.trazarRuta();
  }

  // se calcula el camino rodeando edificios y cruzando por los pasos
  trazarRuta() {
    this.ruta = null;
    this.rutaIdx = 0;
    this.necesitaRuta = false;
    if (!this.pathfinder || !this.target) return;

    // si este fotograma ya se han calculado demasiados caminos, se espera al
    // siguiente en vez de tirar en linea recta
    if (this.pathfinder.presupuesto !== undefined && this.pathfinder.presupuesto <= 0) {
      this.necesitaRuta = true;
      return;
    }
    const camino = this.pathfinder.buscarPorPasos(this.x, this.y, this.target.x, this.target.y);
    if (camino && camino.length > 0) this.ruta = camino;
  }

  // el punto al que apunta ahora mismo: el siguiente tramo de la ruta
  get destinoInmediato() {
    if (this.ruta && this.rutaIdx < this.ruta.length) return this.ruta[this.rutaIdx];
    return this.target;
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

  // ---------- ir montado en un coche ----------

  sentarEn(v) {
    this.enCoche = v;
    this.x = v.x;
    this.y = v.y;
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);

    if (!this.cabeza) {
      this.cabeza = this.scene.add.image(v.x, v.y, 'px')
        .setDisplaySize(5, 5).setTint(0xd8b48c);
    }
    // al volante: un poco por delante del centro y hacia su lado
    const cos = Math.cos(v.angle);
    const sin = Math.sin(v.angle);
    const ox = v.stats.length * 0.08;
    const oy = -v.stats.width * 0.2;
    this.cabeza
      .setPosition(v.x + cos * ox - sin * oy, v.y + sin * ox + cos * oy)
      .setDepth(v.y + 0.5)
      .setVisible(true);
  }

  bajarDe(v) {
    this.enCoche = null;
    if (this.cabeza) this.cabeza.setVisible(false);
    const spot = v.findExitSpot();
    this.x = spot.x;
    this.y = spot.y;
    this.sprite.setVisible(true);
    this.shadow.setVisible(true);
    this.syncSprite();
  }

  // ---------- cruzar mirando ----------

  vieneUnCoche(vehicles) {
    if (!vehicles) return false;
    for (const v of vehicles) {
      const speed = v.speed;
      if (speed < 30) continue;
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 240) continue;
      const haciaMi = (dx * v.vx + dy * v.vy) / speed;
      if (haciaMi <= 0) continue;
      const lateral = Math.abs(-dx * v.vy + dy * v.vx) / speed;
      if (lateral > 44) continue;
      if (haciaMi / speed < 2.1) return true;
    }
    return false;
  }

  update(dt, spots, vehicles = null) {
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.enCoche) return;

    if (this.down) {
      this.downTimer += dt;
      this.syncSprite();
      return;
    }

    // los que te tienen ganas van a por ti en vez de pasear
    if (this.hostile && this.chaseTarget) {
      const dx = this.chaseTarget.x - this.x;
      const dy = this.chaseTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 14) {
        const speed = this.baseSpeed * 1.55;
        this.tryMove((dx / dist) * speed * dt, 0);
        this.tryMove(0, (dy / dist) * speed * dt);
        this.angle = Phaser.Math.Angle.RotateTo(this.angle, Math.atan2(dy, dx), 14 * dt);
        this.animar(speed, dt);
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
    if (this.necesitaRuta) this.trazarRuta();

    const meta = this.destinoInmediato;
    if (!meta) {
      this.target = null;
      this.syncSprite();
      return;
    }

    // al llegar a un tramo, se pasa al siguiente
    if (this.ruta && Math.hypot(meta.x - this.x, meta.y - this.y) < 14) {
      this.rutaIdx++;
      if (this.rutaIdx < this.ruta.length) {
        this.syncSprite();
        return;
      }
      this.ruta = null;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 16) {
      this.target = null;
      this.ruta = null;
      if (this.state === 'walking' && Math.random() < 0.35) {
        this.state = 'waiting';
        this.stateTimer = 0.8 + Math.random() * 2.2;
      }
      this.syncSprite();
      return;
    }

    // Mirar antes de cruzar: si esta en el bordillo a punto de pisar asfalto y
    // viene un coche, se espera. Huyendo no: ahi ya se corre sin mirar.
    if (this.state !== 'fleeing' &&
        !this.map.isRoadPoint(this.x, this.y) &&
        this.map.isRoadPoint(meta.x, meta.y) &&
        this.vieneUnCoche(vehicles)) {
      this.state = 'waiting';
      this.stateTimer = 0.45;
      this.syncSprite();
      return;
    }

    const speed = this.baseSpeed * (this.state === 'fleeing' ? 2.1 : 1);
    const hx = meta.x - this.x;
    const hy = meta.y - this.y;
    const hlen = Math.hypot(hx, hy) || 1;
    const stepX = (hx / hlen) * speed * dt;
    const stepY = (hy / hlen) * speed * dt;

    const movedX = this.tryMove(stepX, 0);
    const movedY = this.tryMove(0, stepY);

    if (!movedX && !movedY) {
      this.stuck += dt;
      if (this.stuck > 0.3 && this.ruta) {
        this.trazarRuta();
        this.stuck = 0;
      } else if (this.stuck > 0.7) {
        this.pickTarget(spots);
      }
    } else {
      this.stuck = 0;
      this.angle = Phaser.Math.Angle.RotateTo(this.angle, Math.atan2(stepY, stepX), 12 * dt);
      this.animar(speed, dt);
    }

    this.syncSprite();
  }

  animar(speed, dt) {
    this.paso += (speed / 42) * dt;
    const fase = Math.floor(this.paso) % FASES;
    if (fase !== this.fase) {
      this.fase = fase;
      this.sprite.setTexture(`${this.base}-${fase}`);
    }
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
    if (this.cabeza) this.cabeza.destroy();
    if (this.blood) this.blood.destroy();
  }
}
