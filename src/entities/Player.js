import { PLAYER, ENTRENAR } from '../config/balance.js';
import { FASES, makeWalkFrames } from '../world/personArt.js';
import { ROPA, LIENZO, CUERPO, anchoDelCuerpo, tramoDelCuerpo } from '../config/aspecto.js';
import { GameState } from '../core/GameState.js';
import { colorDelCuerpo, makeExtremidad, aclarar } from '../world/extremidades.js';

// CUANTO SE MUEVE EL BRAZO, EN PIXELES ADELANTE Y ATRAS.
//
// Ojo con esto, que se hizo mal la primera vez: el brazo NO gira sobre el
// hombro, se DESLIZA a lo largo del cuerpo. Visto desde arriba, un brazo al
// andar va adelante y atras; si lo giras, se separa del cuerpo y parece que
// el personaje esta haciendo aspavientos. Girando 35 grados quedaba la mano
// flotando a un lado, suelta del brazo.
//
// Lo que si lleva es un GIRO PEQUEÑO, de adorno, para que no parezca una
// pieza deslizandose por un raíl.
// Estos dos son A GUSTO: si el brazo se despega del cuerpo y parece una
// pieza suelta flotando al lado, bajalos; si no se nota que anda, subelos.
const ANDANDO = 2.4;        // px de recorrido del brazo
const CORRIENDO = 3.8;      // correr es zancada mas larga, no mas rapida
const GIRO_ADORNO = 0.14;   // radianes
const PIERNA = 0.85;        // la pierna recorre algo menos que el brazo

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

    // EL CUERPO ES UN CONTENEDOR, no una sola imagen. Dentro, y en este
    // orden (lo de antes queda detras):
    //   piernas -> brazos -> tronco
    // El tronco tapa la parte de dentro de brazos y piernas, y por fuera
    // asoma lo que se mueve. Es el mismo orden en que lo dibujaba a mano
    // `personArt.js`, solo que ahora las piezas giran de verdad.
    //
    // OJO: la camara sigue a `this.sprite`. Un contenedor tiene x e y como
    // cualquier objeto, asi que `startFollow` le vale igual.
    this.piernaIzq = scene.add.image(0, 0, 'px');
    this.piernaDer = scene.add.image(0, 0, 'px');
    this.brazoIzq = scene.add.image(0, 0, 'px');
    this.brazoDer = scene.add.image(0, 0, 'px');
    this.tronco = scene.add.image(0, 0, 'player-0').setOrigin(0.5);

    this.sprite = scene.add.container(x, y, [
      this.piernaIzq, this.piernaDer, this.brazoIzq, this.brazoDer, this.tronco,
    ]);

    this.actualizarCuerpo(true);
  }

  // ---------- como se ve ----------

  get alientoMaximo() {
    return PLAYER.alientoBase + (GameState.atributo('aguante') / 100) * PLAYER.alientoPorAguante;
  }

  // Redibuja el personaje con el cuerpo que tiene ahora. Solo hace trabajo de
  // verdad al cambiar de tramo o de ropa: son cuatro texturas nuevas.
  // Si hay imagenes preparadas, se usa la del cuerpo que toca: normal, gordo
  // o fuerte. Es lo unico que hace falta mirar, porque comer engorda y pelear
  // pone fuerte, y el personaje tiene que verse asi.
  cuerpoDeImagen(grasa, musculo) {
    // Las fotos van con clave propia ('player-foto'), porque 'player' es la
    // que dibuja el juego y siempre existe: sin distinguirlas, el cuerpo se
    // quedaba congelado y ya no engordabas ni te ponias fuerte.
    const hay = (c) => this.scene.textures.exists(`${c}-0`);
    if (grasa >= 60 && hay('player-gordo')) return 'player-gordo';
    if (musculo >= 60 && hay('player-fuerte')) return 'player-fuerte';
    return hay('player-foto') ? 'player-foto' : null;
  }

  actualizarCuerpo(forzar = false) {
    const grasa = GameState.atributo('grasa');
    const musculo = GameState.atributo('musculo');
    const tramo = `${tramoDelCuerpo(grasa, musculo)}-${this.ropa}`;
    if (!forzar && tramo === this.tramoCuerpo) return;
    this.tramoCuerpo = tramo;

    const ropa = ROPA[this.ropa] || ROPA.calle;
    const conFoto = this.cuerpoDeImagen(grasa, musculo);

    if (conFoto) {
      this.texturaBase = conFoto;
      if (this.tronco) this.tronco.setTexture(`${conFoto}-${this.fase}`);
    } else {
      this.texturaBase = 'player';
      for (let f = 0; f < FASES; f++) {
        const clave = `player-${f}`;
        if (this.scene.textures.exists(clave)) this.scene.textures.remove(clave);
      }
      // SOLO EL TRONCO: los brazos y las piernas ya no van cocidos en la
      // textura, son piezas aparte que se mueven. Dibujarlos aqui tambien
      // dejaria al personaje con cuatro brazos.
      makeWalkFrames(this.scene, 'player', {
        chaqueta: ropa.chaqueta,
        piel: ropa.piel,
        pelo: ropa.pelo,
        detalle: ropa.detalle,
        ancho: anchoDelCuerpo(grasa, musculo),
        largo: CUERPO.largo,
        soloTronco: true,
      }, LIENZO);
      if (this.tronco) this.tronco.setTexture(`player-${this.fase}`);
    }

    this.rehacerExtremidades(ropa, grasa, musculo);
  }

  // Rehace brazos y piernas para el cuerpo que toca. Solo se llama al cambiar
  // de tramo o de ropa, no en cada fotograma: son cuatro texturas.
  rehacerExtremidades(ropa, grasa, musculo) {
    const ancho = anchoDelCuerpo(grasa, musculo);

    // El color se saca del propio sprite del tronco, asi los brazos pegan
    // igual con el dibujo por codigo que con cualquiera de las fotos.
    const base = colorDelCuerpo(
      this.scene, `${this.texturaBase}-0`, ropa.chaqueta
    );

    // El brazo va mas CLARO que el tronco, no mas oscuro. Del mismo tono se
    // confundia con el cuerpo, y mas oscuro se comia con el contorno.
    const largoBrazo = 8.5 + musculo * 0.012;
    const anchoBrazo = 4.2 + musculo * 0.014;
    makeExtremidad(this.scene, 'jug-brazo', {
      color: aclarar(base, 1.28), largo: largoBrazo, ancho: anchoBrazo, piel: ropa.piel,
    });
    makeExtremidad(this.scene, 'jug-pierna', {
      color: aclarar(base, 0.72), largo: 8, ancho: 4.6, piel: null,
    });

    // Origen cerca del extremo de dentro, que es el hombro y la cadera: el
    // giro de adorno tiene que salir de ahi, no del centro de la pieza.
    for (const b of [this.brazoIzq, this.brazoDer]) {
      b.setTexture('jug-brazo').setOrigin(0.2, 0.5);
    }
    for (const p of [this.piernaIzq, this.piernaDer]) {
      p.setTexture('jug-pierna').setOrigin(0.25, 0.5);
    }

    // Hombros y caderas, en las medidas del cuerpo de ahora.
    // El hombro va DETRAS del centro: puesto delante, el brazo se adelantaba
    // mas que la cabeza y el personaje parecia que iba braceando por encima
    // de si mismo.
    this.hombroX = -2.2;
    // el hombro METIDO hacia dentro: con 0,52 el brazo salia entero por
    // fuera del tronco y se leia como una pieza aparte flotando al lado
    this.hombroY = ancho * 0.44;
    this.caderaX = -CUERPO.largo * 0.3;
    this.caderaY = ancho * 0.22;
    this.colocarExtremidades(0);
  }

  // Coloca las cuatro piezas para un punto del ciclo de paso (-1 a 1).
  // El brazo se desliza por el eje del cuerpo; el giro es solo un adorno.
  colocarExtremidades(swing) {
    const paso = this.running ? CORRIENDO : ANDANDO;
    const d = swing * paso;

    this.brazoIzq.setPosition(this.hombroX + d, -this.hombroY)
      .setRotation(swing * GIRO_ADORNO);
    this.brazoDer.setPosition(this.hombroX - d, this.hombroY)
      .setRotation(-swing * GIRO_ADORNO);
    // las piernas van al reves que los brazos, como al andar de verdad
    this.piernaIzq.setPosition(this.caderaX - d * PIERNA, -this.caderaY)
      .setRotation(-swing * GIRO_ADORNO * 0.6);
    this.piernaDer.setPosition(this.caderaX + d * PIERNA, this.caderaY)
      .setRotation(swing * GIRO_ADORNO * 0.6);
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
        this.tronco.setTexture(`${this.texturaBase || 'player'}-${fase}`);
      }
    } else if (this.fase !== 0) {
      this.fase = 0;
      // OJO: la textura de parado tiene que ser la MISMA familia que la de
      // andar. Aqui estaba puesto 'player-0' a pelo, que es el monigote que
      // dibuja el codigo, asi que con las imagenes de IA puestas el
      // personaje cambiaba de aspecto cada vez que te parabas y volvia al
      // sprite bueno al andar. Parecia que parpadeaba.
      this.tronco.setTexture(`${this.texturaBase || 'player'}-0`);
    }

    // LOS BRAZOS SE MUEVEN SIEMPRE, no en cuatro saltos. El vaiven sale del
    // mismo contador del paso que las texturas, pero aqui se usa entero y no
    // redondeado, asi que el brazo va donde toca en cada fotograma.
    //
    // Y al pararse NO se corta en seco: el vaiven se apaga en medio segundo.
    // Cortarlo de golpe dejaba el brazo tieso a media zancada.
    if (moviendose) {
      this.vaiven = Math.min(1, (this.vaiven ?? 0) + dt * 5);
    } else {
      this.vaiven = Math.max(0, (this.vaiven ?? 0) - dt * 2.2);
      if (this.vaiven > 0) this.paso += dt * 1.4;   // sigue el ciclo mientras se apaga
    }
    this.colocarExtremidades(Math.sin(this.paso * Math.PI * 2) * this.vaiven);

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
    // el contenedor se lleva por delante a las cinco piezas de dentro
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
