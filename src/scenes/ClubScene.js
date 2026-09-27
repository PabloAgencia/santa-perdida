import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { COLORS, PLAYER } from '../config/balance.js';
import { texturaDelJugador } from '../world/personArt.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// EL TERCIOPELO POR DENTRO (HISTORIA-SANTA-PERDIDA.txt, "EL BAJO MUNDO").
// La entrada ya se ha pagado en la puerta (CityScene.usarLocalCerca). Aqui
// dentro no hay minijuego como el gimnasio: es un sitio para pasear, ver
// gente y tomarse algo en la barra. Nada explicito en ningun momento: los
// personajes son los mismos sprites cenitales de siempre (coronilla,
// hombros, zapatos), igual de "tapados" que cualquier peaton de la calle.
//
// Las posiciones de la pista, la barra y los reservados son A OJO sobre
// interior-club.jpg (no medidas a pixel como el gimnasio): si algo no cae
// bien encima del dibujo real, se ajustan estos numeros antes que repetir
// la imagen.
const BARRA = { fx: 0.1, fy: 0.5 };
// las tres barras de striptease de verdad (medidas sobre interior-club.jpg):
// la del fondo junto al DJ, y las dos de la pista, izquierda y derecha
const PISTA = [
  { fx: 0.49, fy: 0.21 },
  { fx: 0.40, fy: 0.42 },
  { fx: 0.65, fy: 0.46 },
];
const RESERVADOS = [
  { fx: 0.86, fy: 0.22 },
  { fx: 0.86, fy: 0.48 },
  { fx: 0.86, fy: 0.74 },
];
// las cuatro trabajadoras (peaton-13 a 16 en PROMPTS-PARA-GEMINI.txt)
const TRABAJADORAS = ['ped-12', 'ped-13', 'ped-14', 'ped-15'];
const PRECIO_COPA = 15;
const CURA_COPA = 12;

export class ClubScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ClubScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.sala = { x: w / 2 - 320, y: h / 2 - 200, w: 640, h: 400 };
    const s = this.sala;
    Audio.menuOpen();

    this.add.image(0, 0, 'px').setOrigin(0, 0).setDisplaySize(w, h).setTint(0x07080a);
    this.add.image(s.x - 6, s.y - 6, 'px').setOrigin(0, 0)
      .setDisplaySize(s.w + 12, s.h + 12).setTint(0x1a1421);

    if (this.textures.exists('interior-club')) {
      this.add.image(s.x, s.y, 'interior-club').setOrigin(0, 0).setDisplaySize(s.w, s.h);
    } else {
      this.dibujarSala(s);
    }

    this.add.text(s.x + s.w / 2, s.y + 24, 'EL TERCIOPELO', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4, fontSize: '26px', color: '#e8a0c8',
    }).setOrigin(0.5);

    // LA BARRA: el camarero fijo, sin cartel encima (Pablo: "no hace falta
    // que ponga lo de la barra en la barra")
    const barra = { x: s.x + s.w * BARRA.fx, y: s.y + s.h * BARRA.fy };
    this.add.image(barra.x, barra.y, 'ped-15-0').setDepth(barra.y);
    this.barra = barra;

    // LAS TRES BARRAS DE STRIPTEASE: una bailarina fija en cada una, con
    // balanceo Y cambiando de fotograma (los 4 de siempre) para que
    // parezca que se mueve de verdad, no solo que se balancea quieta.
    this.bailando = PISTA.map((p, i) => {
      const x = s.x + s.w * p.fx;
      const y = s.y + s.h * p.fy;
      const clave = TRABAJADORAS[i % TRABAJADORAS.length];
      const spr = this.add.image(x, y, `${clave}-0`).setDepth(y);
      this.tweens.add({
        targets: spr, y: y - 4, angle: { from: -8, to: 8 },
        duration: 420 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
      this.animarBaile(spr, clave, 260 + i * 40);
      return spr;
    });

    // LOS RESERVADOS: cada uno con un cliente (peaton cualquiera de la
    // calle) Y una trabajadora al lado, haciendole compañia
    for (const [i, p] of RESERVADOS.entries()) {
      const x = s.x + s.w * p.fx;
      const y = s.y + s.h * p.fy;
      const cliente = ['ped-2', 'ped-5', 'ped-8'][i % 3];
      this.add.image(x - 10, y, `${cliente}-0`).setDepth(y).setScale(0.9);
      const trabajadora = TRABAJADORAS[(i + 1) % TRABAJADORAS.length];
      this.add.image(x + 10, y, `${trabajadora}-0`).setDepth(y + 1).setScale(0.9);
    }

    // MAS CLIENTELA SUELTA, de pie entre la pista y los reservados, para
    // que el club se sienta lleno de verdad y no medio vacio
    const SUELTOS = [
      { fx: 0.30, fy: 0.62 }, { fx: 0.55, fy: 0.66 }, { fx: 0.70, fy: 0.68 },
      { fx: 0.22, fy: 0.30 }, { fx: 0.30, fy: 0.78 },
    ];
    const CLAVES_SUELTOS = ['ped-1', 'ped-4', 'ped-9', 'ped-11', 'ped-6'];
    SUELTOS.forEach((p, i) => {
      const x = s.x + s.w * p.fx;
      const y = s.y + s.h * p.fy;
      this.add.image(x, y, `${CLAVES_SUELTOS[i]}-0`).setDepth(y).setScale(0.9);
    });

    // LAS QUE SE MUEVEN DE VERDAD por la sala, cada una en su propio
    // tramo: dos rondando la barra (de arriba abajo, la barra es vertical)
    // y dos cruzando la sala (de lado a lado, entre la pista, los
    // reservados y la puerta).
    const RUTAS = [
      { clave: 'ped-13', vertical: true, fija: 0.16, desde: 0.30, hasta: 0.60 },
      { clave: 'ped-12', vertical: true, fija: 0.20, desde: 0.55, hasta: 0.85 },
      { clave: 'ped-14', vertical: false, fija: 0.60, desde: 0.34, hasta: 0.58 },
      { clave: 'ped-15', vertical: false, fija: 0.86, desde: 0.60, hasta: 0.80 },
    ];
    this.paseando = RUTAS.map((r, i) => {
      const fijaPx = r.vertical ? s.x + s.w * r.fija : s.y + s.h * r.fija;
      const x0 = r.vertical ? fijaPx : s.x + s.w * r.desde;
      const y0 = r.vertical ? s.y + s.h * r.desde : fijaPx;
      const spr = this.add.image(x0, y0, `${r.clave}-0`).setDepth(1000 + i);
      return { ...r, spr, fijaPx, t: i * 1.7 };
    });

    this.puerta = { x: s.x + s.w / 2, y: s.y + s.h - 6 };
    this.add.image(this.puerta.x, this.puerta.y, 'px').setDisplaySize(72, 12).setTint(0x2a1a24);
    this.add.text(this.puerta.x, this.puerta.y + 22, 'SALIR', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.jugador = this.add.image(this.puerta.x, this.puerta.y - 60, texturaDelJugador(this, 0, GameState))
      .setDepth(5);
    this.px = this.jugador.x;
    this.py = this.jugador.y;

    this.aviso = this.add.text(w / 2, h - 48, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.ink,
    }).setOrigin(0.5);
    this.add.text(w / 2, h - 24, 'WASD para moverte  ·  E en la barra o en la puerta', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upA: 'UP', downA: 'DOWN', leftA: 'LEFT', rightA: 'RIGHT',
      usar: 'E', salir: 'ESC',
    });

    this.confirmacion = 0;
    this.saliendo = false;
    this.cameras.main.fadeIn(420, 0, 0, 0);
  }

  // sin lamina: la pista un circulo de luz, la barra un rectangulo largo
  dibujarSala(s) {
    this.add.image(s.x, s.y, 'px').setOrigin(0, 0).setDisplaySize(s.w, s.h).setTint(0x1c1420);
    this.add.circle(s.x + s.w * 0.5, s.y + s.h * 0.42, 90, 0x3a1f3a);
    this.add.image(s.x + s.w * 0.08, s.y + s.h * 0.5, 'px')
      .setOrigin(0.5).setDisplaySize(60, s.h * 0.7).setTint(0x4a2f22);
    for (const p of RESERVADOS) {
      this.add.circle(s.x + s.w * p.fx, s.y + s.h * p.fy, 22, 0x2a1a24);
    }
  }

  // Reusa los 4 fotogramas del andar (pensados para el bamboleo al caminar)
  // como si fueran un paso de baile: en bucle y bastante mas rapido, con la
  // camara cenital de este juego es lo mas cerca que se llega a "bailando"
  // sin arte nuevo.
  animarBaile(spr, clave, duracionFotograma) {
    let f = 0;
    this.time.addEvent({
      delay: duracionFotograma,
      loop: true,
      callback: () => {
        f = (f + 1) % 4;
        spr.setTexture(`${clave}-${f}`);
      },
    });
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const k = this.keys;

    const s0 = this.sala;
    for (const r of this.paseando) {
      r.t += dt;
      const recorrido = r.desde + (r.hasta - r.desde) * (Math.sin(r.t * 0.5) * 0.5 + 0.5);
      if (r.vertical) {
        r.spr.setPosition(r.fijaPx, s0.y + s0.h * recorrido);
      } else {
        r.spr.setPosition(s0.x + s0.w * recorrido, r.fijaPx);
      }
      r.spr.setDepth(r.spr.y);
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
    this.jugador.setDepth(this.py);

    const enBarra = Phaser.Math.Distance.Between(this.px, this.py, this.barra.x, this.barra.y) < 50;
    const enPuerta = Phaser.Math.Distance.Between(this.px, this.py, this.puerta.x, this.puerta.y) < 46;

    if (this.confirmacion > 0) {
      this.confirmacion -= dt;
    } else {
      this.aviso.setColor('#e6e1d4');
      this.aviso.setText(
        enBarra ? `E para pedir una copa · ${PRECIO_COPA} €`
          : enPuerta ? 'E para salir a la calle' : ''
      );
    }

    if (Phaser.Input.Keyboard.JustDown(k.usar)) {
      if (enBarra) this.pedirCopa();
      else if (enPuerta) this.salir();
    }
    if (Phaser.Input.Keyboard.JustDown(k.salir)) this.salir();
  }

  pedirCopa() {
    if (GameState.health >= GameState.vidaMaxima) {
      this.aviso.setColor('#8a8578');
      this.aviso.setText('Estas entero, no te hace falta');
      this.confirmacion = 1.6;
      return;
    }
    if (!GameState.canAfford(PRECIO_COPA)) {
      this.aviso.setColor('#d9584a');
      this.aviso.setText('No te llega ni para una copa');
      this.confirmacion = 1.6;
      return;
    }
    GameState.spendMoney(PRECIO_COPA, 'club');
    const curado = GameState.heal(CURA_COPA);
    Audio.pickup();
    this.aviso.setColor('#8fd694');
    this.aviso.setText(`Una copa: +${curado} de vida · ${PRECIO_COPA} €`);
    this.confirmacion = 1.6;
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
      EventBus.emit(EVT.HIDEOUT_EXIT, {});
      this.scene.stop();
    });
  }
}
