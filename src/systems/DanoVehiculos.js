import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';
import { GameState } from '../core/GameState.js';

// LOS COCHES SE VAN MURIENDO A LA VISTA, no de golpe.
//
// Antes la chapa bajaba de 100 a 0 y lo unico que cambiaba era que el sprite
// se oscurecia un poco. Llegabas a cero y el coche seguia ahi, tan tranquilo.
// Ahora hay cuatro estados y se ven:
//
//   sano      nada
//   HUMEA     por debajo del 45% de chapa: humo gris saliendo del capo
//   ARDE      por debajo del 18%: llamas y humo negro, y ademas PIERDE VIDA
//             SOLO, asi que tienes unos segundos para bajarte
//   EXPLOTA   al agotarse o tras unos segundos ardiendo: fogonazo, empujon
//             a lo que haya cerca, y el chasis se queda negro para siempre
//
// El coche quemado NO desaparece: se queda en mitad de la calle como un
// monumento a lo que has hecho, y estorba, que es la gracia.

const HUMEA = 0.45;            // chapa por debajo de la cual sale humo
const ARDE = 0.18;             // y por debajo de la cual prende
const ARDE_SEGUNDOS = 5;       // desde que prende hasta que revienta
const PIERDE_ARDIENDO = 9;     // puntos de chapa por segundo mientras arde

const QUEMA_AL_DE_DENTRO = 16; // vida por segundo al que sigue dentro

const RADIO_EXPLOSION = 140;
const DANO_EXPLOSION = 60;
const EMPUJON = 420;

const GRIS_QUEMADO = 0x2e2c2a;

// cuantas bocanadas por segundo en cada estado
const RITMO_HUMO = 9;
const RITMO_FUEGO = 22;

export class DanoVehiculos {
  constructor(scene) {
    this.scene = scene;
    // Las bocanadas se reciclan. Crear y destruir un sprite por cada una,
    // con veinte coches humeando, es tirar el rendimiento.
    this.pool = [];
    this.vivas = [];
  }

  // ---------- bocanadas ----------

  coger() {
    const s = this.pool.pop();
    if (s) return s.setVisible(true).setActive(true);
    return this.scene.add.image(0, 0, 'lamp').setBlendMode(Phaser.BlendModes.ADD);
  }

  soltar(b) {
    b.sprite.setVisible(false).setActive(false);
    this.pool.push(b.sprite);
  }

  bocanada(x, y, { color, radio, vida, sube, alpha }) {
    const s = this.coger();
    s.setPosition(x, y)
      .setDisplaySize(radio, radio)
      .setTint(color)
      .setAlpha(alpha)
      .setDepth(y + 60);   // por encima del coche, que el humo tapa
    this.vivas.push({
      sprite: s, t: 0, vida, radio, alpha, sube,
      vx: (Math.random() - 0.5) * 26,
    });
  }

  moverBocanadas(dt) {
    for (let i = this.vivas.length - 1; i >= 0; i--) {
      const b = this.vivas[i];
      b.t += dt;
      const k = b.t / b.vida;
      if (k >= 1) {
        this.soltar(b);
        this.vivas.splice(i, 1);
        continue;
      }
      // sube, se abre y se apaga: las tres cosas a la vez es lo que hace que
      // parezca humo y no una pelota moviendose
      b.sprite.y -= b.sube * dt;
      b.sprite.x += b.vx * dt;
      b.sprite.setDisplaySize(b.radio * (1 + k * 1.6), b.radio * (1 + k * 1.6));
      b.sprite.setAlpha(b.alpha * (1 - k) * (1 - k));
      b.sprite.setDepth(b.sprite.y + 60);
    }
  }

  // ---------- el estado de cada coche ----------

  update(dt, vehicles, player, conduciendo) {
    this.moverBocanadas(dt);

    for (const v of vehicles) {
      if (v.quemado) {
        // los restos siguen soltando un hilo de humo un rato
        v.humoResto = (v.humoResto || 0) - dt;
        if (v.humoResto > 0) this.tocaBocanada(v, dt, 3, 'resto');
        continue;
      }

      const chapa = v.hp / v.stats.maxHp;

      // --- ARDIENDO ---
      if (v.ardiendo > 0) {
        v.ardiendo += dt;
        v.hp = Math.max(0, v.hp - PIERDE_ARDIENDO * dt);
        this.tocaBocanada(v, dt, RITMO_FUEGO, 'fuego');

        // al que sigue dentro se le va la vida: es el aviso de que hay que
        // bajarse ya
        if (v.occupied && conduciendo === v) {
          GameState.damage(QUEMA_AL_DE_DENTRO * dt, 'fuego');
        }
        if (v.ardiendo >= ARDE_SEGUNDOS || v.hp <= 0) this.explotar(v, player);
        continue;
      }

      // --- PRENDE ---
      if (chapa <= ARDE) {
        v.ardiendo = 0.001;
        Audio.notes([90, 70], 0.2, 'sawtooth', 0.08);
        if (v.occupied) {
          EventBus.emit(EVT.NOTIFY, { text: '¡El coche arde! Sal de ahi', tone: 'danger' });
        }
        continue;
      }

      // --- HUMEA ---
      if (chapa <= HUMEA) this.tocaBocanada(v, dt, RITMO_HUMO, 'humo');
    }
  }

  // Suelta bocanadas al ritmo que toque. El contador es por coche para que
  // dos coches humeando no echen el humo a la vez, que canta.
  tocaBocanada(v, dt, ritmo, tipo) {
    v.humoT = (v.humoT || Math.random()) + dt * ritmo;
    if (v.humoT < 1) return;
    v.humoT -= 1;

    // sale del capo, no del centro del coche
    const morro = v.stats.length * 0.36;
    const x = v.x + Math.cos(v.angle) * morro + (Math.random() - 0.5) * 10;
    const y = v.y + Math.sin(v.angle) * morro + (Math.random() - 0.5) * 10;

    if (tipo === 'fuego') {
      // dos capas: la llama corta y viva, y el humo negro por encima
      this.bocanada(x, y, {
        color: Math.random() < 0.5 ? 0xff9a3c : 0xffd24a,
        radio: 16 + Math.random() * 10, vida: 0.32, sube: 26, alpha: 0.85,
      });
      if (Math.random() < 0.45) {
        this.bocanada(x, y - 6, {
          color: 0x15120f, radio: 26, vida: 1.5, sube: 46, alpha: 0.6,
        });
      }
      return;
    }
    if (tipo === 'resto') {
      this.bocanada(x, y, {
        color: 0x3a3632, radio: 18, vida: 1.8, sube: 34, alpha: 0.3,
      });
      return;
    }
    // humo normal: gris, mas denso cuanto peor esta
    const mal = 1 - v.hp / v.stats.maxHp;
    this.bocanada(x, y, {
      color: 0x6b6862, radio: 14 + mal * 12, vida: 1.2, sube: 40,
      alpha: 0.22 + mal * 0.25,
    });
  }

  // ---------- reventar ----------

  explotar(v, player) {
    if (v.quemado) return;
    v.quemado = true;
    v.ardiendo = 0;
    v.hp = 0;
    v.encendido = false;
    v.humoResto = 6;

    // el fogonazo: tres halos de distinto tamaño, que uno solo se ve pobre
    for (const [radio, color, vida, alpha] of [
      [230, 0xfff1c0, 0.18, 0.95],
      [170, 0xff8c2a, 0.35, 0.9],
      [130, 0x1a1512, 1.9, 0.75],
    ]) {
      this.bocanada(v.x, v.y, { color, radio, vida, sube: 18, alpha });
    }

    Audio.crash(1);
    const cam = this.scene.cameras.main;
    const lejos = Phaser.Math.Distance.Between(v.x, v.y, player.x, player.y);
    if (lejos < 700) cam.shake(320, 0.006 * (1 - lejos / 700));

    this.pillados(v, player);

    // el chasis se queda negro. El coche NO se borra: estorbar en mitad de la
    // calle es parte de haberlo reventado.
    v.sprite.setTint(GRIS_QUEMADO);
    v.vx = 0;
    v.vy = 0;
    EventBus.emit(EVT.NOTIFY, { text: 'Ha reventado', tone: 'danger' });

    // REVENTAR UN COCHE ES UN DELITO GORDO, y ademas se ve y se oye desde
    // media calle. Si estabas cerca, te lo apuntan a ti: dos estrellas.
    // Sin esto podias ir quemando coches por la ciudad sin que pasara
    // absolutamente nada.
    //
    // LA EXCEPCION es una patrulla que TE ESTUVIERA PERSIGUIENDO DE VERDAD
    // (`!u.robada`: si ya se la habias robado, es tu coche y esto no aplica):
    // cargartela no es delito, es como quitarsela de encima. Cada una baja
    // una estrella, igual que en San Andreas.
    const policia = this.scene.police;
    const unidad = policia && policia.units.find((u) => u.vehicle === v);

    if (unidad && !unidad.robada) {
      if (lejos < 260 && GameState.wanted > 0) {
        GameState.setWanted(GameState.wanted - 1);
        Audio.notes([262, 330, 392], 0.12, 'triangle', 0.1);
        EventBus.emit(EVT.NOTIFY, { text: 'Patrulla destrozada · una estrella menos', tone: 'money' });
      }
      // el chasis se queda quemado en la calle (ver arriba); la unidad como
      // tal ya no existe, o sus agentes se quedan persiguiendo un coche que
      // ya no va a ningun sitio
      policia.perderUnidadPorExplosion(v);
    } else if (policia && lejos < 260) {
      policia.reportarCrimen(v.x, v.y, v.police || v.eraPatrulla ? 3 : 2);
    }
  }

  // A quien pilla el reventon: tu, la gente, la policia y los coches de al
  // lado. Y los coches de al lado pueden prender: una explosion en cadena es
  // de las cosas que mas gracia hacen de este tipo de juego.
  pillados(v, player) {
    const cerca = (x, y) => Phaser.Math.Distance.Between(v.x, v.y, x, y);

    const d = cerca(player.x, player.y);
    if (d < RADIO_EXPLOSION) {
      GameState.damage(DANO_EXPLOSION * (1 - d / RADIO_EXPLOSION), 'explosion');
    }

    const gente = this.scene.npcs ? this.scene.npcs.people : [];
    for (const p of gente) {
      if (p.down) continue;
      const dp = cerca(p.x, p.y);
      if (dp > RADIO_EXPLOSION) continue;
      if (p.recibirDano) p.recibirDano(DANO_EXPLOSION * (1 - dp / RADIO_EXPLOSION), v.x, v.y);
    }

    for (const otro of this.scene.vehicles) {
      if (otro === v || otro.quemado) continue;
      const dv = cerca(otro.x, otro.y);
      if (dv > RADIO_EXPLOSION) continue;
      const fuerza = 1 - dv / RADIO_EXPLOSION;
      otro.hp = Math.max(0, otro.hp - DANO_EXPLOSION * fuerza);
      const a = Math.atan2(otro.y - v.y, otro.x - v.x);
      otro.vx += Math.cos(a) * EMPUJON * fuerza;
      otro.vy += Math.sin(a) * EMPUJON * fuerza;
    }
  }

  limpiar() {
    for (const b of this.vivas) b.sprite.destroy();
    for (const s of this.pool) s.destroy();
    this.vivas = [];
    this.pool = [];
  }
}
