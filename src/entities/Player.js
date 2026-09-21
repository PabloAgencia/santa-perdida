import { PLAYER, ENTRENAR } from '../config/balance.js';
import { FASES, makeWalkFrames } from '../world/personArt.js';
import { ROPA, LIENZO, CUERPO, anchoDelCuerpo, tramoDelCuerpo } from '../config/aspecto.js';
import { GameState } from '../core/GameState.js';

export class Player {
  constructor(scene, map, x, y) {
    this.scene = scene;
    this.map = map;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.radius = PLAYER.radius;
    this.running = false;
    this.ropa = 'calle';
    this.tramoCuerpo = null;

    // aliento: los segundos de carrera que te quedan ahora mismo
    this.aliento = this.alientoMaximo;

    this.shadow = scene.add.image(x, y + 5, 'shadow').setScale(0.42).setAlpha(0.5);
    this.paso = 0;
    this.fase = 0;
    this.sprite = scene.add.image(x, y, 'player-0');
    this.sprite.setOrigin(0.5);

    this.actualizarCuerpo(true);
  }

  // ---------- como se ve ----------

  get alientoMaximo() {
    return PLAYER.alientoBase + (GameState.atributo('aguante') / 100) * PLAYER.alientoPorAguante;
  }

  // Redibuja el personaje con el cuerpo que tiene ahora. Solo hace trabajo de
  // verdad al cambiar de tramo o de ropa: son cuatro texturas nuevas.
  actualizarCuerpo(forzar = false) {
    const grasa = GameState.atributo('grasa');
    const musculo = GameState.atributo('musculo');
    const tramo = `${tramoDelCuerpo(grasa, musculo)}-${this.ropa}`;
    if (!forzar && tramo === this.tramoCuerpo) return;
    this.tramoCuerpo = tramo;

    const ropa = ROPA[this.ropa] || ROPA.calle;
    for (let f = 0; f < FASES; f++) {
      const clave = `player-${f}`;
      if (this.scene.textures.exists(clave)) this.scene.textures.remove(clave);
    }
    makeWalkFrames(this.scene, 'player', {
      chaqueta: ropa.chaqueta,
      piel: ropa.piel,
      pelo: ropa.pelo,
      detalle: ropa.detalle,
      ancho: anchoDelCuerpo(grasa, musculo),
      largo: CUERPO.largo,
    }, LIENZO);

    if (this.sprite) this.sprite.setTexture(`player-${this.fase}`);
  }

  ponerRopa(clave) {
    if (!ROPA[clave]) return false;
    this.ropa = clave;
    this.actualizarCuerpo(true);
    return true;
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

  // ---------- moverse ----------

  update(dt, input) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    const moviendose = dx !== 0 || dy !== 0;
    const quiereCorrer = input.run && moviendose;

    // Correr gasta aliento; andar o pararse lo recupera. Al quedarte sin
    // fuelle hay que recuperar un tercio antes de poder volver a correr: si
    // no, en cuanto entra una gota de aliento se corre otra vez y se avanza
    // a tirones ridiculos.
    if (this.aliento <= 0) this.sinFuelle = true;
    if (this.sinFuelle && this.aliento > this.alientoMaximo * 0.33) this.sinFuelle = false;

    if (quiereCorrer && !this.sinFuelle) {
      this.running = true;
      this.aliento = Math.max(0, this.aliento - dt);
      GameState.subirAtributo('aguante', ENTRENAR.aguantePorSegundoCorriendo * dt);
      if (GameState.subirAtributo('grasa', ENTRENAR.grasaPorSegundoCorriendo * dt)) {
        this.actualizarCuerpo();
      }
    } else {
      this.running = false;
      const recupera = moviendose
        ? PLAYER.alientoRecuperaAndando
        : PLAYER.alientoRecuperaQuieto;
      this.aliento = Math.min(this.alientoMaximo, this.aliento + recupera * dt);
    }

    const speed = (this.running ? PLAYER.runSpeed : PLAYER.walkSpeed) * this.lastreDelCuerpo;

    if (moviendose) {
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

  // el peso te frena: la grasa mucho, el musculo un poco
  get lastreDelCuerpo() {
    const grasa = GameState.atributo('grasa') / 100;
    const musculo = GameState.atributo('musculo') / 100;
    return 1 - grasa * PLAYER.penalizacionPorGrasa - musculo * PLAYER.penalizacionPorMusculo;
  }

  // 0 a 1, para pintar la barra
  get alientoRatio() {
    return Phaser.Math.Clamp(this.aliento / this.alientoMaximo, 0, 1);
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
