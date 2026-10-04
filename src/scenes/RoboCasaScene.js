import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { COLORS, PLAYER } from '../config/balance.js';
import { ROBO } from '../config/robos.js';
import { texturaDelJugador } from '../world/personArt.js';
import { FisicaInterior } from '../world/interior.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// UNA CASA POR DENTRO, DE NOCHE (los robos, config/robos.js).
//
// A oscuras, con la linterna. La barra de arriba es el ruido: andar suma un
// poco, correr mucho, darte contra un mueble de golpe; agachado (C) no suma
// nada. Si se llena, el de la casa se despierta, sale corriendo y llama a la
// policia: al salir tienes 2 estrellas, y la casa ya no se puede volver a
// robar esa noche.
//
// Se coge UNA cosa cada vez (E al lado) y se saca en brazos por la puerta;
// fuera hay que llevarla a la furgoneta (RoboSystem). Con algo en brazos no
// se corre y, si pesa, se va mas despacio.
//
// Mientras estas dentro el reloj sigue corriendo (la ciudad esta en pausa,
// asi que lo adelanta esta escena): la noche no se para por entrar.

// Dos casas distintas. Paredes y muebles chocan; `sitios` es donde puede
// estar cada cosa robable (se reparten al azar entre los que haya).
const CASAS = [
  {
    nombre: 'piso',
    paredes: [
      [384, 0, 12, 80], [384, 150, 12, 130], [384, 350, 12, 50],   // salon | resto
      [396, 204, 244, 12],                                          // dormitorio | cocina
    ],
    muebles: [
      { t: 'sofa', x: 150, y: 310, w: 150, h: 42 },
      { t: 'mesa', x: 150, y: 240, w: 74, h: 32 },
      { t: 'mueble', x: 150, y: 28, w: 170, h: 26 },
      { t: 'mueble', x: 310, y: 28, w: 70, h: 26 },
      { t: 'estanteria', x: 24, y: 150, w: 26, h: 120 },
      { t: 'mesa', x: 260, y: 150, w: 64, h: 32 },
      { t: 'cama', x: 565, y: 80, w: 76, h: 104 },
      { t: 'armario', x: 440, y: 24, w: 70, h: 30 },
      { t: 'mueble', x: 505, y: 24, w: 26, h: 26 },
      { t: 'mueble', x: 600, y: 186, w: 64, h: 22 },
      { t: 'encimera', x: 622, y: 300, w: 30, h: 160 },
      { t: 'mesa', x: 500, y: 320, w: 74, h: 52 },
    ],
    cama: { x: 565, y: 72 },
    sitios: [[150, 32], [310, 32], [30, 150], [260, 150], [505, 26], [600, 186], [622, 262], [500, 320]],
  },
  {
    nombre: 'casa',
    paredes: [
      [0, 184, 250, 12], [380, 184, 260, 12],                       // dormitorios | abajo
      [314, 0, 12, 184],                                            // entre los dos de arriba
    ],
    muebles: [
      { t: 'cama', x: 80, y: 80, w: 76, h: 104 },
      { t: 'armario', x: 250, y: 24, w: 70, h: 30 },
      { t: 'mueble', x: 150, y: 24, w: 26, h: 26 },
      { t: 'mesa', x: 520, y: 34, w: 96, h: 32 },
      { t: 'estanteria', x: 616, y: 110, w: 26, h: 120 },
      { t: 'mueble', x: 400, y: 26, w: 66, h: 26 },
      { t: 'sofa', x: 160, y: 334, w: 150, h: 42 },
      { t: 'mueble', x: 160, y: 226, w: 150, h: 24 },
      { t: 'encimera', x: 560, y: 380, w: 160, h: 28 },
      { t: 'mesa', x: 500, y: 290, w: 84, h: 52 },
      { t: 'mueble', x: 30, y: 300, w: 26, h: 70 },
    ],
    cama: { x: 80, y: 72 },
    sitios: [[150, 26], [520, 34], [610, 110], [400, 28], [160, 228], [530, 380], [500, 290], [30, 300]],
  },
];

const ALCANCE_COGER = 40;

export class RoboCasaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RoboCasaScene', active: false });
  }

  // datos.casa = la casa de RoboSystem (con sus `objetos`); datos.sitio =
  // cuantas cosas caben aun en la furgoneta
  create(datos) {
    this.casa = datos.casa;
    const w = this.scale.width;
    const h = this.scale.height;
    this.sala = { x: w / 2 - 320, y: h / 2 - 200, w: 640, h: 400 };
    const s = this.sala;
    // la distribucion sale del edificio: la misma casa es siempre igual
    if (this.casa.plano === undefined) this.casa.plano = (this.casa.edificio.tx + this.casa.edificio.ty) % CASAS.length;
    const plano = CASAS[this.casa.plano];

    this.add.image(0, 0, 'px').setOrigin(0, 0).setDisplaySize(w, h).setTint(0x05060a);
    this.add.image(s.x - 8, s.y - 8, 'px').setOrigin(0, 0).setDisplaySize(s.w + 16, s.h + 16).setTint(0x3a3226);
    this.add.image(s.x, s.y, 'px').setOrigin(0, 0).setDisplaySize(s.w, s.h).setTint(0x8a7a62);
    for (let y = 16; y < s.h; y += 16) this.rect(s.x + s.w / 2, s.y + y, s.w, 1, 0x6a5a44, 0.6, 0);

    this.fisica = new FisicaInterior(this);
    for (const [x, y, pw, ph] of plano.paredes) {
      this.rect(s.x + x + pw / 2, s.y + y + ph / 2, pw, ph, 0x3a3226, 1, 1);
      this.fisica.rect(s.x + x + pw / 2, s.y + y + ph / 2, pw, ph);
    }
    for (const m of plano.muebles) {
      this.dibujarMueble(s.x + m.x, s.y + m.y, m);
      this.fisica.rect(s.x + m.x, s.y + m.y, m.w - 4, m.h - 4);
    }

    // el de la casa, dormido. Si ya se desperto otra noche... no: cada noche
    // es otro robo. Si ya se desperto ESTA noche, la casa ni se abre.
    this.vecino = this.add.image(s.x + plano.cama.x, s.y + plano.cama.y, 'ped-6-0')
      .setRotation(Math.PI / 2).setDepth(s.y + plano.cama.y + 5).setScale(0.95);
    this.zzz = this.add.text(this.vecino.x + 16, this.vecino.y - 20, 'z', {
      fontFamily: FONT, fontSize: '14px', color: '#c8d0e8',
    }).setDepth(2100);
    this.tweens.add({ targets: this.zzz, y: this.zzz.y - 10, alpha: { from: 1, to: 0 }, duration: 1400, repeat: -1 });

    // LAS COSAS: cada una en un sitio, brillando un poco para verlas a oscuras
    const sitios = Phaser.Utils.Array.Shuffle([...plano.sitios]);
    this.objetos = this.casa.objetos.map((o, i) => {
      const [x, y] = sitios[i % sitios.length];
      const px = s.x + x;
      const py = s.y + y;
      const brillo = this.add.circle(px, py, Math.max(o.w, o.h) * 0.8, 0xfff2c0, 0.18).setDepth(2950);
      this.tweens.add({ targets: brillo, alpha: { from: 0.06, to: 0.3 }, duration: 900 + i * 90, yoyo: true, repeat: -1 });
      const img = this.rect(px, py, o.w, o.h, o.color, 1, 2960);
      return { o, x: px, y: py, img, brillo };
    });

    // LA OSCURIDAD: un velo encima de todo y la linterna alrededor tuya
    this.add.image(s.x, s.y, 'px').setOrigin(0, 0).setDisplaySize(s.w, s.h)
      .setTint(0x0a1028).setAlpha(0.66).setDepth(2900);
    this.linterna = this.add.circle(0, 0, 78, 0xfff6d8, 0.16).setDepth(2901).setBlendMode(Phaser.BlendModes.ADD);

    this.puerta = { x: s.x + s.w / 2, y: s.y + s.h - 6 };
    this.rect(this.puerta.x, this.puerta.y + 2, 70, 12, 0x15181d, 1, 2970);
    this.add.text(this.puerta.x, this.puerta.y + 22, 'SALIR', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5).setDepth(3000);

    this.jugador = this.add.image(this.puerta.x, this.puerta.y - 50, texturaDelJugador(this, 0, GameState))
      .setRotation(-Math.PI / 2).setDepth(2980);
    this.enBrazos = this.rect(0, 0, 18, 12, 0xf2efe6, 1, 2990).setVisible(false);
    this.px = this.jugador.x;
    this.py = this.jugador.y;

    // LA BARRA DE RUIDO, arriba
    this.add.text(s.x, s.y - 30, 'RUIDO', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '14px', color: '#c8c0a8',
    }).setOrigin(0, 0.5).setDepth(3000);
    this.rect(s.x + 60 + 120, s.y - 30, 240, 12, 0x15181d, 1, 3000);
    this.barra = this.add.image(s.x + 60, s.y - 30, 'px').setOrigin(0, 0.5).setDisplaySize(1, 8)
      .setTint(0x8fd694).setDepth(3001);
    this.reloj = this.add.text(s.x + s.w, s.y - 30, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: '#c8d0e8',
    }).setOrigin(1, 0.5).setDepth(3000);

    this.aviso = this.add.text(w / 2, h - 48, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.ink,
    }).setOrigin(0.5).setDepth(3000);
    this.add.text(w / 2, h - 24, 'WASD moverte  ·  C agacharte (sin ruido)  ·  SHIFT correr (mucho ruido)  ·  E coger / salir', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5).setDepth(3000);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upA: 'UP', downA: 'DOWN', leftA: 'LEFT', rightA: 'RIGHT',
      usar: 'E', salir: 'ESC', correr: 'SHIFT', agachar: 'C',
    });

    this.ruido = 0;
    this.cargando = null;
    this.delito = 0;
    this.sitio = datos.sitio;
    this.choqueT = 0;
    this.confirmacion = 0;
    this.saliendo = false;
    this.cameras.main.fadeIn(420, 0, 0, 0);
    this.decir('Sin hacer ruido...', '#c8d0e8');
  }

  rect(x, y, w, h, color, alpha = 1, depth = 0) {
    return this.add.image(x, y, 'px').setDisplaySize(w, h).setTint(color).setAlpha(alpha).setDepth(depth);
  }

  dibujarMueble(x, y, m) {
    const z = 2;
    this.rect(x + 4, y + 5, m.w, m.h, 0x05060a, 0.3, z - 0.5);
    if (m.t === 'cama') {
      this.rect(x, y, m.w, m.h, 0x5a3a24, 1, z);
      this.rect(x, y + 8, m.w - 8, m.h - 22, 0x4a5a8a, 1, z + 0.1);
      this.rect(x, y - m.h / 2 + 12, m.w - 14, 14, 0xe8e4d8, 1, z + 0.2);
    } else if (m.t === 'sofa') {
      this.rect(x, y, m.w, m.h, 0x5a2a2a, 1, z);
      this.rect(x, y - m.h / 2 + 6, m.w, 12, 0x4a2222, 1, z + 0.1);
      for (let i = -1; i <= 1; i++) this.rect(x + i * (m.w / 3), y + 4, m.w / 3 - 6, m.h - 18, 0x6a3434, 1, z + 0.2);
    } else if (m.t === 'encimera') {
      this.rect(x, y, m.w, m.h, 0x9aa2a8, 1, z);
      this.rect(x, y, m.w - 6, m.h - 6, 0xc8ccc8, 1, z + 0.1);
    } else if (m.t === 'estanteria' || m.t === 'armario') {
      this.rect(x, y, m.w, m.h, 0x4a3220, 1, z);
      this.rect(x, y, m.w - 6, m.h - 6, 0x5a3e28, 1, z + 0.1);
    } else {
      // mesa / mueble
      this.rect(x, y, m.w, m.h, 0x6a4a2e, 1, z);
      this.rect(x, y, m.w - 6, m.h - 6, 0x7a5636, 1, z + 0.1);
    }
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const k = this.keys;
    const s = this.sala;
    // la noche sigue, al ritmo del robo (config/robos.js, ritmoReloj)
    GameState.avanzarReloj(dt * 2 * ROBO.ritmoReloj);
    const m = GameState.minutoDelDia;
    this.reloj.setText(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`);

    let dx = 0;
    let dy = 0;
    if (k.left.isDown || k.leftA.isDown) dx -= 1;
    if (k.right.isDown || k.rightA.isDown) dx += 1;
    if (k.up.isDown || k.upA.isDown) dy -= 1;
    if (k.down.isDown || k.downA.isDown) dy += 1;
    const agachado = k.agachar.isDown;
    const corriendo = k.correr.isDown && !agachado && !this.cargando;
    const R = ROBO.ruido;

    if (dx || dy) {
      let vel = PLAYER.walkSpeed * (corriendo ? 1.7 : agachado ? 0.5 : 1);
      if (this.cargando) vel *= this.cargando.pesado ? 0.55 : 0.75;
      const len = Math.hypot(dx, dy);
      const mx = (dx / len) * vel * dt;
      const my = (dy / len) * vel * dt;
      const mov = this.fisica.mover(this.px, this.py, mx, my);
      // te has dado contra algo (querias moverte y no te has movido en ese
      // eje): un golpe, y suena
      const chocado = (mx && Math.abs(mov.x - this.px) < Math.abs(mx) * 0.5) ||
        (my && Math.abs(mov.y - this.py) < Math.abs(my) * 0.5);
      this.choqueT -= dt;
      if (chocado && corriendo && this.choqueT <= 0) {
        this.ruido += R.choque;
        this.choqueT = 0.6;
        Audio.crash(0.08);
      }
      this.px = Phaser.Math.Clamp(mov.x, s.x + 12, s.x + s.w - 12);
      this.py = Phaser.Math.Clamp(mov.y, s.y + 12, s.y + s.h - 12);
      this.jugador.setRotation(Math.atan2(dy, dx));
      this.ruido += (agachado ? R.agachado : corriendo ? R.corriendo : this.cargando ? R.cargando : R.andando) * dt;
      if (agachado) this.ruido -= R.baja * 0.5 * dt;
    } else {
      this.ruido -= R.baja * dt;
    }
    this.ruido = Phaser.Math.Clamp(this.ruido, 0, 100);
    this.jugador.setPosition(this.px, this.py).setScale(agachado ? 0.85 : 1);
    this.linterna.setPosition(this.px, this.py);
    this.enBrazos.setPosition(this.px, this.py - 14).setVisible(!!this.cargando);
    this.pintarBarra();

    if (this.ruido >= 100 && !this.casa.despierto) this.despertar();
    if (this.huida) this.moverVecino(dt);

    const objeto = !this.cargando && this.objetoCerca();
    const enPuerta = Phaser.Math.Distance.Between(this.px, this.py, this.puerta.x, this.puerta.y) < 46;
    if (this.confirmacion > 0) this.confirmacion -= dt;
    else {
      this.aviso.setColor('#e6e1d4');
      this.aviso.setText(
        objeto ? `E para coger: ${objeto.o.nombre} · ${objeto.o.valor} €`
          : enPuerta ? (this.cargando ? `E para sacar ${this.cargando.nombre.toLowerCase()}` : 'E para salir')
            : this.cargando ? 'A la puerta, y despacio' : ''
      );
    }
    if (Phaser.Input.Keyboard.JustDown(k.usar)) {
      if (objeto) this.coger(objeto);
      else if (enPuerta) this.salir();
    }
    if (Phaser.Input.Keyboard.JustDown(k.salir)) this.salir();
  }

  pintarBarra() {
    const r = this.ruido / 100;
    this.barra.setDisplaySize(Math.max(1, 240 * r), 8);
    this.barra.setTint(r < 0.5 ? 0x8fd694 : r < 0.8 ? 0xe8b54a : 0xd9384a);
  }

  objetoCerca() {
    let mejor = null;
    let dMejor = ALCANCE_COGER;
    for (const ob of this.objetos) {
      if (ob.cogido) continue;
      const d = Phaser.Math.Distance.Between(this.px, this.py, ob.x, ob.y);
      if (d < dMejor) { mejor = ob; dMejor = d; }
    }
    return mejor;
  }

  coger(ob) {
    if (this.sitio <= 0) {
      this.decir('No cabe nada mas en la furgoneta', '#8a8578');
      return;
    }
    ob.cogido = true;
    ob.img.destroy();
    ob.brillo.destroy();
    this.cargando = ob.o;
    // fuera de la lista de la casa: si vuelves a entrar, ya no esta
    const i = this.casa.objetos.indexOf(ob.o);
    if (i >= 0) this.casa.objetos.splice(i, 1);
    this.enBrazos.setTint(ob.o.color).setDisplaySize(Math.min(22, ob.o.w), Math.min(14, ob.o.h + 4));
    Audio.notes([523.25], 0.04);
    this.decir(`${ob.o.nombre}${ob.o.pesado ? ' (pesa: vas mas lento)' : ''}. Ahora, a la puerta`, '#8fd694');
  }

  // LLENASTE LA BARRA: se despierta, grita y sale corriendo a llamar
  despertar() {
    this.casa.despierto = true;
    this.delito = 2;
    this.tweens.killTweensOf(this.zzz);
    this.zzz.destroy();
    Audio.notes([660, 520, 660], 0.09, 'square', 0.12);
    this.decir('¡¿QUIEN ANDA AHI?! El vecino va a llamar a la policia', '#d9584a');
    this.confirmacion = 3;
    this.vecino.setRotation(0);
    this.huida = { t: 0 };
  }

  // se levanta y sale por la puerta, rodeando muebles y paredes
  moverVecino(dt) {
    const v = this.vecino;
    if (!v.visible) return;
    this.huida.t += dt;
    if (this.huida.t < 0.6) return;   // el respingo
    const p = this.fisica.pasoHacia(this.sala, this.puerta, v.x, v.y);
    const a = Math.atan2(p.y - v.y, p.x - v.x);
    const paso = PLAYER.walkSpeed * 1.6 * dt;
    v.setPosition(v.x + Math.cos(a) * paso, v.y + Math.sin(a) * paso).setRotation(a).setDepth(2985);
    if (Phaser.Math.Distance.Between(v.x, v.y, this.puerta.x, this.puerta.y) < 12) v.setVisible(false);
  }

  decir(t, color) {
    this.aviso.setColor(color);
    this.aviso.setText(t);
    this.confirmacion = 2;
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
      EventBus.emit(EVT.HIDEOUT_EXIT, {
        delito: this.delito,
        robo: { casa: this.casa, cargando: this.cargando },
      });
      this.scene.stop();
    });
  }
}
