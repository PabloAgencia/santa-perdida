import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { COLORS, PLAYER } from '../config/balance.js';
import { ARMAS } from '../config/weapons.js';
import { INTERIORES } from '../config/interiores.js';
import { servir } from '../systems/LocalSystem.js';
import { texturaDelJugador } from '../world/personArt.js';
import { FisicaInterior } from '../world/interior.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// TIENDA 24H, POLLOS CLUCK, BAR Y HOSPITAL POR DENTRO (APUNTES H1).
//
// Una sola escena para los cuatro: la sala de cada uno (muebles, quien
// atiende, clientes) vive en config/interiores.js. Todo se dibuja por codigo,
// igual que el resto de la ciudad: no hay laminas de IA de estas salas, y asi
// cada mueble que se ve es exactamente el rectangulo que choca.
//
// Lo que se hacia antes en la acera (curarse, comer, el botiquin, la copa)
// se hace ahora en el mostrador, y pasa por la misma funcion
// (LocalSystem.servir), asi que precios y efectos no cambian.
//
// LO QUE TIENE LOGICA DENTRO, como en la calle:
//   · si tumbas al que atiende, nadie te cobra: el mostrador se queda solo
//   · pegar a alguien delante de todos es un delito: al salir, la policia
//     ya esta avisada (1 estrella)
//   · en la tienda, con un arma de fuego en la mano, E en el mostrador es un
//     ATRACO: el dependiente levanta las manos y suelta la caja a tandas
//     mientras sigas delante; los clientes salen corriendo. Al salir, 2
//     estrellas (el dependiente da el aviso). La misma tienda no tiene caja
//     otra vez hasta pasados 5 minutos de juego.

const ROBO_TANDAS = 4;
const ROBO_CADA = 0.6;      // segundos entre tanda y tanda
const ROBO_ALCANCE = 70;
const ROBO_ESPERA = 300000; // ms de juego hasta que la caja vuelve a tener

export class LocalScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LocalScene', active: false });
  }

  // datos.local = el local de LocalSystem por el que se ha entrado
  create(datos) {
    this.local = datos.local;
    this.cfg = INTERIORES[this.local.cfg.clave];
    const cfg = this.cfg;
    const w = this.scale.width;
    const h = this.scale.height;
    this.sala = { x: w / 2 - 320, y: h / 2 - 200, w: 640, h: 400 };
    const s = this.sala;
    Audio.menuOpen();

    this.add.image(0, 0, 'px').setOrigin(0, 0).setDisplaySize(w, h).setTint(0x07080a);
    this.add.image(s.x - 10, s.y - 10, 'px').setOrigin(0, 0)
      .setDisplaySize(s.w + 20, s.h + 20).setTint(cfg.pared);
    this.dibujarSuelo(s, cfg.suelo);

    this.add.text(s.x + s.w / 2, s.y - 30, cfg.titulo, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4, fontSize: '26px', color: cfg.colorTitulo,
    }).setOrigin(0.5);

    this.fisica = new FisicaInterior(this);
    for (const m of cfg.muebles) {
      this.dibujarMueble(s.x + m.x, s.y + m.y, m);
      if (m.solido !== false) this.fisica.rect(s.x + m.x, s.y + m.y, m.w - 4, m.h - 4);
    }

    // la luz del techo: un velo muy suave del color del local
    this.add.image(s.x, s.y, 'px').setOrigin(0, 0).setDisplaySize(s.w, s.h)
      .setTint(cfg.luz).setAlpha(0.06).setDepth(2000);

    // quien atiende
    const d = cfg.dependiente;
    this.dependiente = this.add.image(s.x + d.x, s.y + d.y, `${d.ped}-0`).setDepth(s.y + d.y)
      .setRotation(Math.PI / 2);
    this.cuerpoDependiente = this.fisica.gente(this.dependiente);
    this.mostrador = { x: s.x + cfg.mostrador.x, y: s.y + cfg.mostrador.y };

    // la clientela: quieta, sentada, tumbada o paseando entre dos puntos
    this.clientes = cfg.gente.map((g, i) => {
      const x = s.x + g.x;
      const y = s.y + g.y;
      // sentado o tumbado: por encima de su silla o su cama, que estan en
      // la misma y
      const spr = this.add.image(x, y, `${g.ped}-0`).setDepth(y + (g.tumbado || g.sentado ? 2 : 0));
      if (g.sentado) {
        spr.setScale(0.92);
        // mirando a su mesa (o a la barra, en el bar): la mas cercana
        const mesas = cfg.muebles.filter((m) => ['mesa', 'barra', 'sillas'].includes(m.tipo));
        let cerca = null;
        for (const m of mesas) {
          if (!cerca || Math.hypot(m.x - g.x, m.y - g.y) < Math.hypot(cerca.x - g.x, cerca.y - g.y)) cerca = m;
        }
        // en las sillas de espera se sienta mirando a recepcion
        if (cerca && cerca.tipo === 'sillas') spr.setRotation(-Math.PI / 2);
        else if (cerca) spr.setRotation(Math.atan2(cerca.y - g.y, cerca.x - g.x));
      }
      if (g.tumbado) spr.setRotation(Math.PI / 2).setScale(0.9);
      const c = {
        spr, ped: g.ped, x0: x, y0: y,
        hasta: g.hasta ? { x: s.x + g.hasta.x, y: s.y + g.hasta.y } : null,
        t: i * 1.3, fase: 0, fotoT: 0, caido: false, huyendo: false, fuera: false,
      };
      // los tumbados en una cama no se pueden pegar ni chocan (estan encima
      // de la cama, que ya es maciza)
      if (!g.tumbado) c.cuerpo = this.fisica.gente(spr, () => { c.caido = true; });
      return c;
    });

    this.puerta = { x: s.x + s.w / 2, y: s.y + s.h - 6 };
    this.add.image(this.puerta.x, this.puerta.y + 2, 'px').setDisplaySize(76, 14).setTint(0x15181d);
    this.add.image(this.puerta.x, this.puerta.y + 2, 'px').setDisplaySize(68, 6).setTint(0xc8a465).setAlpha(0.6);
    this.add.text(this.puerta.x, this.puerta.y + 24, 'SALIR', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.jugador = this.add.image(this.puerta.x, this.puerta.y - 60, texturaDelJugador(this, 0, GameState))
      .setDepth(s.y + s.h).setRotation(-Math.PI / 2);
    this.px = this.jugador.x;
    this.py = this.jugador.y;

    this.aviso = this.add.text(w / 2, h - 48, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.ink,
    }).setOrigin(0.5).setDepth(3000);
    this.add.text(w / 2, h - 24, 'WASD para moverte  ·  E en el mostrador o en la puerta  ·  F para pegar', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5).setDepth(3000);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upA: 'UP', downA: 'DOWN', leftA: 'LEFT', rightA: 'RIGHT',
      usar: 'E', salir: 'ESC', atacar: 'F',
    });
    this.input.on('pointerdown', (p) => { if (p.leftButtonDown()) this.pegar(); });

    this.delito = 0;       // estrellas que te esperan fuera al salir
    this.robo = null;      // el atraco en marcha
    this.confirmacion = 0;
    this.saliendo = false;
    this.cameras.main.fadeIn(420, 0, 0, 0);
  }

  // ---- DIBUJO ---------------------------------------------------------

  rect(x, y, w, h, color, alpha = 1, depth = 0) {
    return this.add.image(x, y, 'px').setDisplaySize(w, h).setTint(color).setAlpha(alpha).setDepth(depth);
  }

  dibujarSuelo(s, suelo) {
    this.add.image(s.x, s.y, 'px').setOrigin(0, 0).setDisplaySize(s.w, s.h).setTint(suelo.color);
    const oscuro = Phaser.Display.Color.ValueToColor(suelo.color).darken(12).color;
    if (suelo.dibujo === 'baldosa') {
      for (let x = 40; x < s.w; x += 40) this.rect(s.x + x, s.y + s.h / 2, 1, s.h, oscuro, 0.7);
      for (let y = 40; y < s.h; y += 40) this.rect(s.x + s.w / 2, s.y + y, s.w, 1, oscuro, 0.7);
    } else if (suelo.dibujo === 'madera') {
      for (let y = 18; y < s.h; y += 18) {
        this.rect(s.x + s.w / 2, s.y + y, s.w, 1, oscuro, 0.8);
        // las juntas de las tablas, salteadas fila a fila
        for (let x = (y / 18) % 2 ? 60 : 130; x < s.w; x += 140) {
          this.rect(s.x + x, s.y + y - 9, 1, 18, oscuro, 0.6);
        }
      }
    } else if (suelo.dibujo === 'linoleo') {
      // la linea de colores que lleva a urgencias, como en los hospitales
      this.rect(s.x + s.w / 2, s.y + 250, s.w, 6, 0x5a8fd0, 0.35);
      this.rect(s.x + s.w / 2, s.y + 258, s.w, 6, 0xe8625a, 0.3);
    }
    // el zocalo: las paredes se leen como paredes, no como el borde de un dibujo
    this.rect(s.x + s.w / 2, s.y + 3, s.w, 6, 0x05060a, 0.35);
    this.rect(s.x + 3, s.y + s.h / 2, 6, s.h, 0x05060a, 0.3);
    this.rect(s.x + s.w - 3, s.y + s.h / 2, 6, s.h, 0x05060a, 0.3);
  }

  dibujarMueble(x, y, m) {
    const { w, h } = m;
    const z = y;
    const sombra = () => this.rect(x + 4, y + 5, w, h, 0x05060a, 0.3, z - 1);
    switch (m.tipo) {
      case 'estanteria': {
        sombra();
        this.rect(x, y, w, h, m.color || 0x4a4e56, 1, z);
        this.rect(x, y, w - 6, 2, 0x2a2d33, 1, z + 0.1);
        // los productos: tiras de colores a los dos lados del lineal
        const colores = [0xd9384a, 0xe8b54a, 0x5a8fd0, 0x8fd694, 0xf2efe6, 0xc060a0, 0xe0a050];
        const horizontal = w >= h;
        const largo = horizontal ? w : h;
        for (let i = 0, p = 6; p < largo - 6; i++) {
          const ancho = 6 + ((i * 7) % 6);
          const c = colores[(i * 3 + Math.round(x)) % colores.length];
          if (horizontal) {
            const px = x - w / 2 + p + ancho / 2;
            this.rect(px, y - h / 4, ancho - 1, h / 2 - 4, c, 0.95, z + 0.2);
            this.rect(px, y + h / 4, ancho - 1, h / 2 - 4, colores[(i * 5 + 2) % colores.length], 0.95, z + 0.2);
          } else {
            const py = y - h / 2 + p + ancho / 2;
            this.rect(x, py, w - 6, ancho - 1, c, 0.95, z + 0.2);
          }
          p += ancho;
        }
        break;
      }
      case 'nevera': {
        sombra();
        this.rect(x, y, w, h, 0xdfe6ea, 1, z);
        this.rect(x, y + 2, w - 8, h - 10, 0x9fd8f0, 0.85, z + 0.1);
        for (let i = 0; i < 6; i++) {
          this.rect(x - w / 2 + 9 + i * ((w - 14) / 6), y + 2, 6, h - 16,
            [0xd9384a, 0x8fd694, 0xe8b54a][i % 3], 0.8, z + 0.2);
        }
        this.rect(x, y + h / 2 - 3, w, 4, 0x8a959c, 1, z + 0.3);
        break;
      }
      case 'mostrador': case 'barra': {
        sombra();
        const base = m.color || (m.tipo === 'barra' ? 0x5a3420 : 0x7a6a58);
        this.rect(x, y, w, h, Phaser.Display.Color.ValueToColor(base).darken(25).color, 1, z);
        this.rect(x, y - 2, w - 4, h - 8, base, 1, z + 0.1);
        this.rect(x, y - h / 2 + 3, w - 4, 2, 0xffffff, 0.18, z + 0.2);
        break;
      }
      case 'caja':
        this.rect(x, y, w, h, 0x2a2d33, 1, z + 5);
        this.rect(x, y - 2, w - 6, h / 2 - 2, 0x8fd694, 0.8, z + 5.1);
        break;
      case 'cocina': {
        sombra();
        this.rect(x, y, w, h, 0x9aa2a8, 1, z);
        // freidoras (cuadros de aceite) y planchas, en fila
        for (let px = x - w / 2 + 40; px < x + w / 2 - 20; px += 70) {
          this.rect(px, y, 46, h - 14, 0x3a3d42, 1, z + 0.1);
          this.rect(px, y, 38, h - 22, 0xc8962a, 0.85, z + 0.2);
        }
        break;
      }
      case 'mesa': {
        sombra();
        if (m.redonda) {
          this.add.circle(x, y, w / 2, 0x4a2e1c).setDepth(z);
          this.add.circle(x, y, w / 2 - 4, 0x7a5232).setDepth(z + 0.1);
        } else {
          this.rect(x, y, w, h, 0xd8d2c4, 1, z);
          this.rect(x, y, w - 6, h - 6, 0xe8e4d8, 1, z + 0.1);
        }
        // sillas alrededor, solo dibujo (te sientas, no chocas con ellas)
        const sillas = m.redonda
          ? [[0, -w / 2 - 8], [0, w / 2 + 8], [-w / 2 - 8, 0], [w / 2 + 8, 0]]
          : [[-w / 4, -h / 2 - 8], [w / 4, -h / 2 - 8], [-w / 4, h / 2 + 8], [w / 4, h / 2 + 8]];
        for (const [dx, dy] of sillas) this.rect(x + dx, y + dy, 14, 12, 0x3a2a20, 1, z - 0.5);
        break;
      }
      case 'botellero': {
        this.rect(x, y, w, h, 0x2a1a12, 1, z);
        for (let py = y - h / 2 + 6; py < y + h / 2 - 4; py += 9) {
          this.rect(x, py, w - 6, 6, [0x6a8a3a, 0x8a3a2a, 0xd8c070, 0x3a5a7a][Math.round(py) % 4], 0.9, z + 0.1);
        }
        break;
      }
      case 'billar': {
        sombra();
        this.rect(x, y, w, h, 0x4a2a18, 1, z);
        this.rect(x, y, w - 14, h - 14, 0x2f7a46, 1, z + 0.1);
        for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 1], [0, 1], [1, 1]]) {
          this.add.circle(x + dx * (w / 2 - 8), y + dy * (h / 2 - 8), 4, 0x05060a).setDepth(z + 0.2);
        }
        const bolas = [0xf2efe6, 0xd9384a, 0xe8b54a, 0x5a8fd0, 0x2a2a2a, 0x8fd694];
        bolas.forEach((c, i) => this.add.circle(x - 20 + (i % 3) * 9, y - 8 + Math.floor(i / 3) * 9, 3.5, c).setDepth(z + 0.3));
        this.rect(x + 30, y + 14, 60, 2, 0xd8c070, 1, z + 0.3).setRotation(-0.3);
        break;
      }
      case 'maquina': {
        sombra();
        this.rect(x, y, w, h, 0x2a2d33, 1, z);
        this.rect(x, y - 4, w - 6, h - 16, m.color || 0x5a8fd0, 0.9, z + 0.1);
        this.rect(x, y + h / 2 - 6, w - 10, 4, 0xf2efe6, 0.7, z + 0.2);
        break;
      }
      case 'cama': {
        sombra();
        this.rect(x, y, w, h, 0xb8c0c4, 1, z);
        this.rect(x, y + 6, w - 6, h - 18, 0xf2f4f2, 1, z + 0.1);
        this.rect(x, y - h / 2 + 10, w - 10, 12, 0xffffff, 1, z + 0.2);
        // la cortina de al lado
        this.rect(x + w / 2 + 10, y, 3, h + 10, 0x8fb8c8, 0.8, z + 0.3);
        break;
      }
      case 'sillas': {
        sombra();
        this.rect(x, y, w, h, 0x3a4a5a, 1, z);
        for (let px = x - w / 2 + 12; px < x + w / 2; px += 26) {
          this.rect(px, y, 20, h - 6, 0x5a8fd0, 1, z + 0.1);
        }
        break;
      }
      case 'planta':
        this.add.circle(x + 3, y + 4, w / 2, 0x05060a, 0.3).setDepth(z - 1);
        this.add.circle(x, y, w / 2, 0x6a4a32).setDepth(z);
        this.add.circle(x - 3, y - 3, w / 2 - 3, 0x3d7a3f).setDepth(z + 0.1);
        this.add.circle(x + 4, y + 2, w / 3, 0x4a8f4d).setDepth(z + 0.2);
        break;
      case 'taburete':
        this.add.circle(x, y, w / 2, 0x2a1a12).setDepth(z - 0.5);
        this.add.circle(x, y, w / 2 - 3, 0x8a3a2a).setDepth(z - 0.4);
        break;
      case 'alfombra':
        this.rect(x, y, w, h, m.color || 0x3a3a3a, 0.9, -1);
        break;
      case 'diana':
        this.add.circle(x, y, w / 2, 0x1a1a1a).setDepth(z);
        this.add.circle(x, y, w / 2 - 4, 0xd9384a).setDepth(z + 0.1);
        this.add.circle(x, y, w / 4, 0xf2efe6).setDepth(z + 0.2);
        this.add.circle(x, y, 2, 0x1a1a1a).setDepth(z + 0.3);
        break;
      case 'cartel': {
        this.rect(x, y, w, h, 0x15181d, 0.95, z);
        this.rect(x, y + h / 2 - 1, w, 2, m.color, 1, z + 0.1);
        this.add.text(x, y, m.texto, {
          fontFamily: FONT, fontSize: `${Math.max(13, Math.round(h * 0.62))}px`,
          color: '#' + m.color.toString(16).padStart(6, '0'),
        }).setOrigin(0.5).setDepth(z + 0.2);
        break;
      }
      default:
        this.rect(x, y, w, h, 0x4a4e56, 1, z);
    }
  }

  // ---- LOGICA -----------------------------------------------------------

  armaDeFuego() {
    const arma = ARMAS[GameState.armaActual];
    return arma && !arma.cuerpo ? arma : null;
  }

  cajaVacia() {
    const ciudad = this.scene.get('CityScene');
    return this.local.robadaHasta && ciudad && ciudad.time.now < this.local.robadaHasta;
  }

  atiendeAlguien() {
    return !this.cuerpoDependiente.caido;
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const k = this.keys;
    const s = this.sala;
    this.fisica.update(dt);
    if (Phaser.Input.Keyboard.JustDown(k.atacar)) this.pegar();

    this.moverClientes(dt);

    let dx = 0;
    let dy = 0;
    if (k.left.isDown || k.leftA.isDown) dx -= 1;
    if (k.right.isDown || k.rightA.isDown) dx += 1;
    if (k.up.isDown || k.upA.isDown) dy -= 1;
    if (k.down.isDown || k.downA.isDown) dy += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      const m = this.fisica.mover(
        this.px, this.py, (dx / len) * PLAYER.walkSpeed * dt, (dy / len) * PLAYER.walkSpeed * dt
      );
      this.px = Phaser.Math.Clamp(m.x, s.x + 14, s.x + s.w - 14);
      this.py = Phaser.Math.Clamp(m.y, s.y + 14, s.y + s.h - 14);
      this.jugador.setRotation(Math.atan2(dy, dx));
    }
    this.jugador.setPosition(this.px, this.py);
    this.jugador.setDepth(this.py + 0.5);

    if (this.robo) this.seguirRobo(dt);

    const enMostrador = Phaser.Math.Distance.Between(this.px, this.py, this.mostrador.x, this.mostrador.y) < 46;
    const enPuerta = Phaser.Math.Distance.Between(this.px, this.py, this.puerta.x, this.puerta.y) < 46;

    if (this.confirmacion > 0) {
      this.confirmacion -= dt;
    } else if (!this.robo) {
      this.aviso.setColor('#e6e1d4');
      this.aviso.setText(enMostrador ? this.textoMostrador() : enPuerta ? 'E para salir a la calle' : '');
    }

    if (Phaser.Input.Keyboard.JustDown(k.usar)) {
      if (enMostrador) this.atender();
      else if (enPuerta) this.salir();
    }
    if (Phaser.Input.Keyboard.JustDown(k.salir)) this.salir();
  }

  // E compra SIEMPRE, lleves lo que lleves en la mano: entrar con la pistola
  // equipada a por un botiquin no puede acabar en atraco sin querer. Para
  // atracar hay que encañonar al dependiente (clic o F con el arma de fuego,
  // junto al mostrador), como en San Andreas, donde se apunta al de la caja.
  textoMostrador() {
    if (!this.atiendeAlguien()) return 'No hay nadie para atenderte';
    const compra = `${this.cfg.textoE} · ${this.local.cfg.precio} €`;
    if (this.cfg.sePuedeAtracar && this.armaDeFuego()) return `${compra}   ·   clic: ENCAÑONARLE`;
    return compra;
  }

  atender() {
    if (this.robo) return;
    if (!this.atiendeAlguien()) {
      this.decir('No hay nadie para atenderte', '#8a8578');
      return;
    }
    const r = servir(this.local.cfg);
    if (!r) return;
    this.decir(r.texto, r.tono === 'money' ? '#8fd694' : r.tono === 'danger' ? '#d9584a' : '#8a8578');
  }

  decir(texto, color) {
    this.aviso.setColor(color);
    this.aviso.setText(texto);
    this.confirmacion = 1.8;
  }

  // EL ATRACO. El dependiente levanta las manos y va soltando la caja; si te
  // alejas del mostrador antes de acabar, se acaba ahi (te llevas lo que
  // llevaras). Los clientes salen corriendo por la puerta.
  empezarRobo() {
    if (this.cajaVacia()) {
      this.decir('La caja esta vacia: ya la has limpiado hace poco', '#8a8578');
      return;
    }
    const ciudad = this.scene.get('CityScene');
    if (ciudad) this.local.robadaHasta = ciudad.time.now + ROBO_ESPERA;
    const total = Phaser.Math.Between(120, 380);
    this.robo = { t: 0, tandas: 0, porTanda: Math.round(total / ROBO_TANDAS), llevado: 0 };
    this.delito = Math.max(this.delito, 2);
    GameState.bumpStat('atracos', 1);
    Audio.crash(0.3);
    // manos arriba: se queda mirando al jugador y "encoge"
    this.dependiente.setRotation(Math.atan2(this.py - this.dependiente.y, this.px - this.dependiente.x));
    this.tweens.add({ targets: this.dependiente, scale: 0.86, duration: 160, yoyo: false });
    this.aviso.setColor('#d9584a');
    this.aviso.setText('¡LA CAJA! ¡RAPIDO!');
    for (const c of this.clientes) {
      if (!c.caido && c.cuerpo) c.huyendo = true;
    }
  }

  seguirRobo(dt) {
    const r = this.robo;
    const lejos = Phaser.Math.Distance.Between(this.px, this.py, this.mostrador.x, this.mostrador.y) > ROBO_ALCANCE;
    if (lejos || !this.atiendeAlguien()) {
      this.acabarRobo(lejos ? 'Te has ido antes de tiempo' : null);
      return;
    }
    r.t += dt;
    if (r.t < ROBO_CADA) return;
    r.t = 0;
    r.tandas++;
    GameState.addMoney(r.porTanda, 'atraco');
    r.llevado += r.porTanda;
    Audio.notes([659.25], 0.05);
    // un fajo que salta del mostrador hacia ti
    const fajo = this.rect(this.dependiente.x, this.dependiente.y, 10, 6, 0x8fd694, 1, 2500);
    this.tweens.add({
      targets: fajo, x: this.px, y: this.py, duration: 260, ease: 'Sine.in',
      onComplete: () => fajo.destroy(),
    });
    this.aviso.setColor('#8fd694');
    this.aviso.setText(`+${r.llevado} €`);
    if (r.tandas >= ROBO_TANDAS) this.acabarRobo(null);
  }

  acabarRobo(motivo) {
    const llevado = this.robo.llevado;
    this.robo = null;
    this.decir(
      motivo ? `${motivo} · +${llevado} €` : `¡Atraco! +${llevado} €  ·  ya han llamado a la policia`,
      '#d9584a'
    );
    this.confirmacion = 3;
  }

  // los que pasean, los que se van corriendo y los que estan quietos
  moverClientes(dt) {
    for (const c of this.clientes) {
      if (c.caido || c.fuera) continue;
      let destino = null;
      let vel = 0;
      if (c.huyendo) {
        destino = Phaser.Math.Distance.Between(c.spr.x, c.spr.y, this.puerta.x, this.puerta.y) < 20
          ? this.puerta : this.fisica.pasoHacia(this.sala, this.puerta, c.spr.x, c.spr.y);
        vel = PLAYER.walkSpeed * 1.5;
      } else if (c.hasta) {
        c.t += dt * 0.35;
        const ida = Math.sin(c.t) * 0.5 + 0.5;
        destino = { x: c.x0 + (c.hasta.x - c.x0) * ida, y: c.y0 + (c.hasta.y - c.y0) * ida };
        vel = 9999; // sigue la curva tal cual
      }
      if (!destino) continue;
      const spr = c.spr;
      const ang = Math.atan2(destino.y - spr.y, destino.x - spr.x);
      const dist = Math.hypot(destino.x - spr.x, destino.y - spr.y);
      if (dist < 0.5) continue;
      const paso = Math.min(dist, vel * dt);
      spr.setPosition(spr.x + Math.cos(ang) * paso, spr.y + Math.sin(ang) * paso);
      spr.setRotation(ang).setDepth(spr.y);
      c.fotoT += dt;
      if (c.fotoT > (c.huyendo ? 0.12 : 0.22)) {
        c.fotoT = 0;
        c.fase = (c.fase + 1) % 4;
        spr.setTexture(`${c.ped}-${c.fase}`);
      }
      if (c.huyendo && Phaser.Math.Distance.Between(spr.x, spr.y, this.puerta.x, this.puerta.y) < 14) {
        c.fuera = true;
        spr.setVisible(false);
        if (c.cuerpo) c.cuerpo.caido = true; // ya no esta: no choca ni se le pega
      }
    }
  }

  // F o clic: un puñetazo. Si tumbas a alguien delante de todos, al salir
  // la policia ya lo sabe.
  pegar() {
    if (this.saliendo || this.robo) return false;
    // con un arma de fuego, junto al mostrador de la tienda y con alguien
    // detras: no es un puñetazo, es un atraco
    const enMostrador = Phaser.Math.Distance.Between(this.px, this.py, this.mostrador.x, this.mostrador.y) < 46;
    if (this.cfg.sePuedeAtracar && this.armaDeFuego() && enMostrador && this.atiendeAlguien()) {
      this.empezarRobo();
      return true;
    }
    const antes = this.fisica.cuerpos.filter((c) => c.caido).length;
    const dado = this.fisica.atacar(this.px, this.py, this.jugador.rotation);
    this.tweens.add({ targets: this.jugador, scale: { from: 1.18, to: 1 }, duration: 120, ease: 'Sine.out' });
    if (dado) {
      const tumbados = this.fisica.cuerpos.filter((c) => c.caido).length;
      if (tumbados > antes) {
        this.delito = Math.max(this.delito, 1);
        // los demas se asustan y se van
        for (const c of this.clientes) if (!c.caido && c.cuerpo) c.huyendo = true;
      }
    }
    return dado;
  }

  salir() {
    if (this.saliendo) return;
    this.saliendo = true;
    Audio.menuClose();
    this.cameras.main.fadeOut(380, 0, 0, 0);
    this.time.delayedCall(400, () => {
      this.scene.setVisible(true, 'CityScene');
      this.scene.resume('CityScene');
      this.scene.setVisible(true, 'UIScene');
      this.scene.resume('UIScene');
      EventBus.emit(EVT.HIDEOUT_EXIT, { delito: this.delito });
      this.scene.stop();
    });
  }
}
