import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { TILE } from '../config/balance.js';

// ENCUENTROS POR LA CALLE. Punto 13 del plan: gente suelta con la que te
// cruzas explorando, no un dador fijo de una banda (eso ya lo hace
// MissionSystem). Cada uno da UN recado corto, a pie, cerca de donde
// aparecio. Mismo lenguaje visual que los dadores de mision (persona
// plantada, sombra, un marker sobre la cabeza), pero sin texto flotante
// pegado al sitio: como el sitio es cualquier acera de la ciudad y no un
// hueco ya comprobado a mano, un rotulo ahi podria acabar encima de un
// portal o un coche aparcado.

const ALCANCE = 46;
const APARECE_ENTRE = [500, 950];   // lejos del jugador: se descubre andando
const RECADO_ENTRE = [250, 550];    // el recado, cerca de donde te lo dan
const VIDA_SIN_HABLAR = 65;          // si no te acercas a tiempo, se va

const RECADOS = [
  'Un vecino necesita que le lleves esto aqui cerca',
  'Un recado rapido, nada complicado',
  'Hazme un favor y llevale esto a alguien',
  'Dale esto a un colega antes de que se enfrie',
  'Necesito que corras un encargo, aqui mismo',
];

export class EncuentroSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.actual = null;
    this.avisado = false;
    this.cooldown = Phaser.Math.Between(20, 35);

    this.aro = scene.add.image(0, 0, 'ring').setVisible(false).setDepth(5).setAlpha(0.85);
    scene.tweens.add({
      targets: this.aro, scale: { from: 0.85, to: 1.15 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
  }

  // para el minimapa, igual que MissionSystem.puntos()
  puntos() {
    if (!this.actual || this.actual.fase !== 'esperando') return [];
    return [{ x: this.actual.x, y: this.actual.y, color: 0xdfe4ea }];
  }

  get cerca() {
    return !!(this.actual && this.actual.fase === 'esperando' && this.actual.dentro);
  }

  pickSpotEnRango(centro, min, max) {
    const spots = this.map.sidewalkSpots;
    if (spots.length === 0) return null;
    const candidatos = spots.filter((s) => {
      const d = Phaser.Math.Distance.Between(centro.x, centro.y, s.x, s.y);
      return d >= min && d <= max;
    });
    const pool = candidatos.length > 0 ? candidatos : spots;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  update(dt, player, enCoche) {
    if (this.actual && this.actual.fase === 'en_marcha') {
      // el recado se hace a pie: si te subes a un coche a mitad, sigue
      // corriendo el reloj, pero no hace falta bajarse justo encima
      this.actual.tiempo -= dt;
      if (this.actual.tiempo <= 0) {
        this.fallar();
        return;
      }
      if (Phaser.Math.Distance.Between(player.x, player.y, this.actual.objetivo.x, this.actual.objetivo.y) < ALCANCE) {
        this.completar();
      }
      return;
    }

    if (this.actual && this.actual.fase === 'esperando') {
      this.actual.vida -= dt;
      if (this.actual.vida <= 0) {
        this.despawn();
        return;
      }
      // solo se habla con el a pie: en coche no se enseña el aviso, para no
      // pedir E sobre algo con lo que no se puede hacer nada ahora mismo
      const d = Phaser.Math.Distance.Between(player.x, player.y, this.actual.x, this.actual.y);
      this.actual.dentro = !enCoche && d < ALCANCE;
      if (this.actual.dentro && !this.avisado) {
        this.avisado = true;
        EventBus.emit(EVT.NOTIFY, { text: 'E para hablar con el', tone: 'objective' });
      }
      return;
    }

    // nada esperando ni en marcha: cuenta atras para el siguiente
    this.cooldown -= dt;
    if (this.cooldown <= 0) this.spawn(player);
  }

  spawn(player) {
    const punto = this.pickSpotEnRango(player, APARECE_ENTRE[0], APARECE_ENTRE[1]);
    if (!punto) {
      this.cooldown = 15;
      return;
    }

    const objetos = [];
    objetos.push(
      this.scene.add.image(punto.x, punto.y + 4, 'shadow').setScale(0.32).setAlpha(0.45).setDepth(punto.y - 3)
    );
    const i = Math.floor(Math.random() * 12);
    const persona = this.scene.add.image(punto.x, punto.y, `ped-${i}-0`).setDepth(punto.y);
    objetos.push(persona);
    this.scene.tweens.add({
      targets: persona, angle: { from: -6, to: 6 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    const marca = this.scene.add.image(punto.x, punto.y - 24, 'px')
      .setDisplaySize(12, 12).setTint(0xdfe4ea).setRotation(Math.PI / 4).setDepth(10).setAlpha(0.9);
    objetos.push(marca);
    this.scene.tweens.add({
      targets: marca, y: punto.y - 30,
      duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    this.avisado = false;
    this.actual = {
      fase: 'esperando', x: punto.x, y: punto.y, objetos, vida: VIDA_SIN_HABLAR, dentro: false,
    };
  }

  intentarHablar(x, y) {
    if (!this.actual || this.actual.fase !== 'esperando') return false;
    if (Phaser.Math.Distance.Between(x, y, this.actual.x, this.actual.y) >= ALCANCE) return false;
    this.aceptar();
    return true;
  }

  aceptar() {
    const desde = { x: this.actual.x, y: this.actual.y };
    this.destruirVisual();

    const objetivo = this.pickSpotEnRango(desde, RECADO_ENTRE[0], RECADO_ENTRE[1]);
    const tiles = objetivo
      ? Math.round(Phaser.Math.Distance.Between(desde.x, desde.y, objetivo.x, objetivo.y) / TILE)
      : 10;
    const pago = Math.round(50 + tiles * 4);
    const limite = Math.round(10 + tiles * 0.9);
    const texto = RECADOS[Math.floor(Math.random() * RECADOS.length)];

    this.actual = { fase: 'en_marcha', objetivo: objetivo || desde, tiempo: limite, pago, texto };
    this.aro.setPosition(this.actual.objetivo.x, this.actual.objetivo.y).setVisible(true);
    EventBus.emit(EVT.NOTIFY, { text: `${texto}. Paga ${pago} €`, tone: 'objective' });
  }

  completar() {
    const { pago } = this.actual;
    GameState.addMoney(pago, 'encuentro');
    GameState.addReputation(1);
    this.aro.setVisible(false);
    this.actual = null;
    this.cooldown = Phaser.Math.Between(25, 55);
    EventBus.emit(EVT.NOTIFY, { text: `Recado cumplido. +${pago} €`, tone: 'money' });
  }

  fallar() {
    this.aro.setVisible(false);
    this.actual = null;
    this.cooldown = Phaser.Math.Between(20, 40);
    EventBus.emit(EVT.NOTIFY, { text: 'No has llegado a tiempo', tone: 'dim' });
  }

  despawn() {
    this.destruirVisual();
    this.actual = null;
    this.cooldown = Phaser.Math.Between(20, 45);
  }

  destruirVisual() {
    if (this.actual && this.actual.objetos) this.actual.objetos.forEach((o) => o.destroy());
  }

  // ---------- para el HUD ----------

  get activo() {
    return !!(this.actual && this.actual.fase === 'en_marcha');
  }

  objectiveText() {
    return this.actual && this.actual.fase === 'en_marcha' ? this.actual.texto : '';
  }

  remainingTime() {
    return this.actual && this.actual.fase === 'en_marcha' ? Math.max(0, this.actual.tiempo) : null;
  }

  get target() {
    return this.actual && this.actual.fase === 'en_marcha' ? this.actual.objetivo : null;
  }
}
