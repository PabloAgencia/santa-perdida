import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { COLORS, PLAYER, GIMNASIO } from '../config/balance.js';
import { texturaDelJugador } from '../world/personArt.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// EL GIMNASIO POR DENTRO (SISTEMA-PERSONAJE.txt, punto 4). La cuota ya se ha
// pagado en la puerta. Tres maquinas, cada una un minijuego de 15 segundos:
//   PESAS  musculo           ESPACIO cuando la marca pasa por la zona verde
//   CINTA  quema grasa, sube aguante      A y D (o las flechas) alternando
//   SACO   musculo y algo de punteria     ESPACIO cuando el aro llega al saco
// Todo pasa por GameState.entrenar, que corta en el tope del dia: pasado el
// tope se puede seguir, pero ya no sube nada, como en San Andreas.
//
// Los sitios de las maquinas NO se mueven: la lamina de IA (si la hay,
// interior-gimnasio) se pide con las maquinas justo en estos sitios.
const MAQUINAS = {
  pesas: { nombre: 'PESAS', fx: 0.2, fy: 0.42 },
  cinta: { nombre: 'CINTA', fx: 0.5, fy: 0.3 },
  saco: { nombre: 'SACO', fx: 0.8, fy: 0.42 },
};

export class GimnasioScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GimnasioScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.sala = { x: w / 2 - 320, y: h / 2 - 200, w: 640, h: 400 };
    const s = this.sala;
    Audio.menuOpen();

    this.add.image(0, 0, 'px').setOrigin(0, 0).setDisplaySize(w, h).setTint(0x07080a);
    this.add.image(s.x - 6, s.y - 6, 'px').setOrigin(0, 0)
      .setDisplaySize(s.w + 12, s.h + 12).setTint(0x1a1e24);

    if (this.textures.exists('interior-gimnasio')) {
      this.add.image(s.x, s.y, 'interior-gimnasio').setOrigin(0, 0).setDisplaySize(s.w, s.h);
    } else {
      this.dibujarSala(s);
    }

    this.add.text(s.x + s.w / 2, s.y + 24, 'GIMNASIO', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4, fontSize: '28px', color: '#e8a860',
    }).setOrigin(0.5);

    this.maquinas = Object.entries(MAQUINAS).map(([clave, m]) => {
      const x = s.x + s.w * m.fx;
      const y = s.y + s.h * m.fy;
      this.add.text(x, y + 58, m.nombre, {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
      }).setOrigin(0.5);
      return { clave, x, y };
    });

    this.puerta = { x: s.x + s.w / 2, y: s.y + s.h - 6 };
    this.add.image(this.puerta.x, this.puerta.y, 'px').setDisplaySize(72, 12).setTint(0x6b4a2f);
    this.add.text(this.puerta.x, this.puerta.y + 22, 'SALIR', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.jugador = this.add.image(this.puerta.x, this.puerta.y - 60, texturaDelJugador(this, 0, GameState))
      .setDepth(5);
    this.px = this.jugador.x;
    this.py = this.jugador.y;

    // lo que llevas hoy del tope, siempre a la vista
    this.hoyTexto = this.add.text(s.x + 14, s.y + s.h - 14, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '12px', color: COLORS.dim,
    }).setOrigin(0, 1);

    this.aviso = this.add.text(w / 2, h - 48, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.ink,
    }).setOrigin(0.5);
    this.add.text(w / 2, h - 24, 'WASD para moverte  ·  E en una maquina o en la puerta', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upA: 'UP', downA: 'DOWN', leftA: 'LEFT', rightA: 'RIGHT',
      usar: 'E', golpe: 'SPACE', salir: 'ESC',
    });
    this.input.keyboard.addCapture('SPACE,ESC');

    this.juego = null;
    this.ui = null;
    this.confirmacion = 0;
    this.saliendo = false;
    this.cameras.main.fadeIn(420, 0, 0, 0);
  }

  // sin lamina: el suelo de goma y las tres maquinas a rectangulos
  dibujarSala(s) {
    this.add.image(s.x, s.y, 'px').setOrigin(0, 0).setDisplaySize(s.w, s.h).setTint(0x26282c);
    for (let i = 0; i < 10; i++) {
      this.add.image(s.x + i * (s.w / 10), s.y, 'px').setOrigin(0, 0)
        .setDisplaySize(1, s.h).setTint(0x1e2024);
    }
    const en = (m) => ({ x: s.x + s.w * m.fx, y: s.y + s.h * m.fy });
    const p = en(MAQUINAS.pesas);
    this.add.image(p.x, p.y, 'px').setDisplaySize(40, 90).setTint(0x3a3f47);   // banco
    this.add.image(p.x, p.y - 34, 'px').setDisplaySize(96, 8).setTint(0x8a8f96); // barra
    for (const lado of [-1, 1]) {
      this.add.image(p.x + lado * 44, p.y - 34, 'px').setDisplaySize(12, 28).setTint(0x1b1d21);
    }
    const c = en(MAQUINAS.cinta);
    this.add.image(c.x, c.y, 'px').setDisplaySize(60, 120).setTint(0x1b1d21);
    this.add.image(c.x, c.y + 6, 'px').setDisplaySize(46, 96).setTint(0x3a3d42);
    this.add.image(c.x, c.y - 52, 'px').setDisplaySize(60, 14).setTint(0x5a6068);
    const k = en(MAQUINAS.saco);
    this.add.circle(k.x, k.y, 26, 0x6b2f2a);
    this.add.circle(k.x, k.y, 26).setStrokeStyle(3, 0x2a1a18);
    this.add.circle(k.x - 6, k.y - 6, 8, 0x8a3f38);
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const k = this.keys;
    this.actualizarHoy();

    if (this.juego) {
      this.actualizarJuego(dt);
      return;
    }

    let dx = 0;
    let dy = 0;
    if (k.left.isDown || k.leftA.isDown) dx -= 1;
    if (k.right.isDown || k.rightA.isDown) dx += 1;
    if (k.up.isDown || k.upA.isDown) dy -= 1;
    if (k.down.isDown || k.downA.isDown) dy += 1;
    const s = this.sala;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      this.px = Phaser.Math.Clamp(this.px + (dx / len) * PLAYER.walkSpeed * dt, s.x + 18, s.x + s.w - 18);
      this.py = Phaser.Math.Clamp(this.py + (dy / len) * PLAYER.walkSpeed * dt, s.y + 48, s.y + s.h - 18);
      this.jugador.setRotation(Math.atan2(dy, dx));
    }
    this.jugador.setPosition(this.px, this.py);

    const maquina = this.maquinas.find(
      (m) => Phaser.Math.Distance.Between(this.px, this.py, m.x, m.y) < 64
    );
    const enPuerta = Phaser.Math.Distance.Between(this.px, this.py, this.puerta.x, this.puerta.y) < 46;

    if (this.confirmacion > 0) {
      this.confirmacion -= dt;
    } else {
      this.aviso.setColor('#e6e1d4');
      this.aviso.setText(
        maquina ? `E para usar ${MAQUINAS[maquina.clave].nombre.toLowerCase()}`
          : enPuerta ? 'E para salir a la calle' : ''
      );
    }

    if (Phaser.Input.Keyboard.JustDown(k.usar)) {
      if (maquina) this.empezar(maquina);
      else if (enPuerta) this.salir();
    }
    if (Phaser.Input.Keyboard.JustDown(k.salir)) this.salir();
  }

  actualizarHoy() {
    const hoy = GameState.gimnasioHoy();
    const t = GIMNASIO.tope;
    const pct = (v, tope) => `${Math.round((v / tope) * 100)}%`;
    this.hoyTexto.setText(
      `HOY  musculo ${pct(hoy.musculo, t.musculo)} · aguante ${pct(hoy.aguante, t.aguante)} · grasa ${pct(hoy.grasa, t.grasa)}`
    );
  }

  // ---------- los minijuegos ----------

  empezar(maquina) {
    this.jugador.setPosition(maquina.x, maquina.y + 30);
    this.juego = {
      tipo: maquina.clave, maquina, tiempo: GIMNASIO.duracion,
      ganado: { musculo: 0, aguante: 0, grasa: 0, punteria: 0 },
      fase: 0, dentroYaContado: false, ultimaTecla: null, ritmo: 0, aro: 1,
    };
    const cx = this.scale.width / 2;
    const cy = this.sala.y + this.sala.h * 0.72;
    const ui = this.add.container(cx, cy).setDepth(20);
    ui.add(this.add.image(0, 0, 'px').setDisplaySize(420, 92).setTint(0x05060a).setAlpha(0.8));
    const ayuda = {
      pesas: 'ESPACIO cuando la marca este en lo verde',
      cinta: 'A y D alternando, a buen ritmo',
      saco: 'ESPACIO cuando el aro llegue al saco',
    }[maquina.clave];
    ui.add(this.add.text(0, -32, ayuda, {
      fontFamily: FONT, fontSize: '14px', color: COLORS.ink, stroke: '#05060a', strokeThickness: 2,
    }).setOrigin(0.5));
    this.ui = ui;
    this.ui.reloj = this.add.text(0, 30, '', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);
    ui.add(this.ui.reloj);

    if (maquina.clave === 'pesas') {
      ui.add(this.add.image(0, 0, 'px').setDisplaySize(300, 14).setTint(0x2a2d33));
      ui.add(this.add.image(105, 0, 'px').setDisplaySize(60, 14).setTint(0x4f9a58));
      this.ui.marca = this.add.image(-150, 0, 'px').setDisplaySize(6, 24).setTint(0xf2efe6);
      ui.add(this.ui.marca);
    } else if (maquina.clave === 'cinta') {
      ui.add(this.add.image(0, 0, 'px').setDisplaySize(300, 14).setTint(0x2a2d33));
      ui.add(this.add.image(60, 0, 'px').setDisplaySize(120, 14).setTint(0x4f9a58));
      this.ui.relleno = this.add.image(-150, 0, 'px').setOrigin(0, 0.5).setDisplaySize(1, 10).setTint(0xe8b54a);
      ui.add(this.ui.relleno);
    } else {
      // el aro que se cierra sobre el saco, en la propia sala
      this.ui.aro = this.add.circle(maquina.x, maquina.y, 80).setStrokeStyle(3, 0xe8b54a).setDepth(20);
    }
    Audio.newJob();
  }

  actualizarJuego(dt) {
    const j = this.juego;
    const k = this.keys;
    const G = GIMNASIO;
    j.tiempo -= dt;
    this.ui.reloj.setText(`${Math.ceil(j.tiempo)} s   ·   ESC para dejarlo`);

    if (j.tipo === 'pesas') {
      // la marca va y viene; cada vuelta es una repeticion posible
      j.fase += dt * 1.6;
      const x = Math.sin(j.fase * Math.PI) * 150;
      this.ui.marca.x = x;
      const dentro = x >= 75 && x <= 135;
      if (!dentro) j.dentroYaContado = false;
      if (Phaser.Input.Keyboard.JustDown(k.golpe)) {
        if (dentro && !j.dentroYaContado) {
          j.dentroYaContado = true;
          j.ganado.musculo += GameState.entrenar('musculo', G.pesas.musculoPorRep, G.tope.musculo);
          Audio.notes([392], 0.06);
          this.ui.marca.setTint(0x8fd694);
        } else {
          // demasiado rapido o fuera de sitio: no cuenta
          this.ui.marca.setTint(0xd9584a);
        }
      }
    } else if (j.tipo === 'cinta') {
      const izq = Phaser.Input.Keyboard.JustDown(k.left) || Phaser.Input.Keyboard.JustDown(k.leftA);
      const der = Phaser.Input.Keyboard.JustDown(k.right) || Phaser.Input.Keyboard.JustDown(k.rightA);
      const tecla = izq ? 'i' : der ? 'd' : null;
      if (tecla && tecla !== j.ultimaTecla) j.ritmo = Math.min(1, j.ritmo + 0.12);
      if (tecla) j.ultimaTecla = tecla;
      j.ritmo = Math.max(0, j.ritmo - dt * 0.45);
      this.ui.relleno.setDisplaySize(Math.max(1, j.ritmo * 300), 10);
      // solo cuenta el tiempo que se va en la zona verde (el buen ritmo)
      if (j.ritmo >= 0.5) {
        j.ganado.grasa += GameState.entrenar('grasa', G.cinta.grasaPorSegundo * dt, G.tope.grasa);
        j.ganado.aguante += GameState.entrenar('aguante', G.cinta.aguantePorSegundo * dt, G.tope.aguante);
      }
    } else {
      // el aro se va cerrando; al llegar al saco hay que golpear
      j.aro -= dt * 0.8;
      if (j.aro <= 0.15) j.aro = 1;
      this.ui.aro.setRadius(26 + j.aro * 60);
      if (Phaser.Input.Keyboard.JustDown(k.golpe)) {
        if (j.aro <= 0.3) {
          j.ganado.musculo += GameState.entrenar('musculo', G.saco.musculoPorGolpe, G.tope.musculo);
          j.ganado.punteria += GameState.entrenar('punteria', G.saco.punteriaPorGolpe, G.tope.punteria);
          Audio.crash(0.15);
          this.cameras.main.shake(80, 0.002);
        }
        j.aro = 1;
      }
    }

    if (j.tiempo <= 0 || Phaser.Input.Keyboard.JustDown(k.salir)) this.terminar();
  }

  terminar() {
    const j = this.juego;
    this.juego = null;
    if (this.ui.aro) this.ui.aro.destroy();
    this.ui.destroy();
    this.ui = null;

    const partes = [];
    const f = (v) => v.toFixed(1).replace('.', ',');
    if (j.ganado.musculo > 0) partes.push(`musculo +${f(j.ganado.musculo)}`);
    if (j.ganado.aguante > 0) partes.push(`aguante +${f(j.ganado.aguante)}`);
    if (j.ganado.grasa > 0) partes.push(`grasa -${f(j.ganado.grasa)}`);
    if (j.ganado.punteria > 0) partes.push(`punteria +${f(j.ganado.punteria)}`);

    const hoy = GameState.gimnasioHoy();
    const t = GIMNASIO.tope;
    const lleno = {
      pesas: hoy.musculo >= t.musculo,
      cinta: hoy.grasa >= t.grasa && hoy.aguante >= t.aguante,
      saco: hoy.musculo >= t.musculo,
    }[j.tipo];

    if (partes.length > 0) {
      this.aviso.setColor('#8fd694');
      this.aviso.setText(partes.join('  ·  '));
      Audio.notes([523.25, 659.25], 0.08);
    } else if (lleno) {
      this.aviso.setColor('#e8b54a');
      this.aviso.setText('Por hoy ya has entrenado bastante. Vuelve mañana');
    } else {
      this.aviso.setColor('#8a8578');
      this.aviso.setText('No ha contado ninguna. Otra vez, con mas ritmo');
    }
    this.confirmacion = 3;
    this.jugador.setTexture(texturaDelJugador(this, 0, GameState));
  }

  salir() {
    if (this.saliendo || this.juego) return;
    this.saliendo = true;
    Audio.menuClose();
    this.cameras.main.fadeOut(380, 0, 0, 0);
    this.time.delayedCall(400, () => {
      this.scene.setVisible(true, 'CityScene');
      this.scene.resume('CityScene');
      this.scene.setVisible(true, 'UIScene');
      this.scene.resume('UIScene');
      EventBus.emit(EVT.HIDEOUT_EXIT, {});
      this.scene.stop();
    });
  }
}
