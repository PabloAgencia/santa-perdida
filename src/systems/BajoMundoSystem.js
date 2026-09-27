import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';
import { T } from '../config/city.js';
import { TILE } from '../config/balance.js';

// HISTORIA-SANTA-PERDIDA.txt, "EL BAJO MUNDO": las trabajadoras de El Duque
// tambien se mueven por la calle, no solo dentro de El Terciopelo. Igual que
// en los GTA de siempre: se conduce hasta una, se le pregunta si quiere
// "pasar un buen rato", sube al coche, y hay que llevarla a uno de los
// sitios privados marcados por la ciudad (un callejon apartado, no en plena
// avenida). Alli el dinero se va cobrando poco a poco mientras pasan los
// segundos, no de golpe, y al terminar se cura y ella se baja. Nada
// explicito en ningun paso: ni desnudos, ni menu de servicios, todo pasa
// fuera de camara mientras se cuenta el dinero.

const TRABAJADORAS = ['ped-12', 'ped-13', 'ped-14', 'ped-15'];
const CUANTAS = 6;
const SEPARACION = 900;
const ALCANCE_RECOGER = 46;
const ALCANCE_SITIO = 50;

const SITIOS_PRIVADOS = 5;
const SEPARACION_SITIOS = 700;

export const PRECIO_BUEN_RATO = 60;
const DURACION = 5;              // segundos que dura, cobrando sin prisa
const CURA_TOTAL = 45;

export class BajoMundoSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.gente = [];
    this.sitios = [];
    this.cerca = null;        // trabajadora en la calle, lista para recoger
    this.sitioCerca = null;   // sitio privado, listo para parar
    this.pasajera = null;     // la que llevas encima, entre recogerla y llegar
    this.sesion = null;       // { tiempo, gastado, curado } mientras se cobra
    this.sembrar();
    this.sembrarSitios();
  }

  // Reparto determinista (sin barajar, ver ColeccionablesSystem.js para el
  // porque): preferentemente en el centro y la zona comercial, terreno de
  // Casa Verdial, que es donde esta El Duque. Si no da para tantas ahi, se
  // completa con cualquier acera.
  sembrar() {
    const spots = this.map.sidewalkSpots;
    const zonaBuena = spots.filter((s) => {
      const z = this.map.zoneAt(s.x, s.y);
      return z === 'comercial' || z === 'centro';
    });
    const resto = spots.filter((s) => !zonaBuena.includes(s));
    const elegidos = [];
    for (const s of [...zonaBuena, ...resto]) {
      if (elegidos.length >= CUANTAS) break;
      if (elegidos.some((p) => Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) < SEPARACION)) {
        continue;
      }
      elegidos.push(s);
    }

    elegidos.forEach((p, i) => {
      const clave = TRABAJADORAS[i % TRABAJADORAS.length];
      const g = {
        x: p.x, y: p.y, x0: p.x, clave, t: i * 1.3, fase: 0, fotoT: 0,
      };
      g.spr = this.scene.add.image(p.x, p.y, `${clave}-0`).setDepth(p.y);
      g.sombra = this.scene.add.image(p.x, p.y + 3, 'shadow').setScale(0.3).setAlpha(0.4).setDepth(p.y - 1);
      this.gente.push(g);
    });
  }

  // LOS SITIOS PRIVADOS: callejones de verdad (mismo criterio que los
  // corazones de PickupSystem.js), marcados con un aro tenue para que se
  // vean sin gritar. Pablo lo pidio explicito: "que se marque".
  sembrarSitios() {
    const puntos = [];
    for (let ty = 2; ty < this.map.h - 2; ty++) {
      for (let tx = 2; tx < this.map.w - 2; tx++) {
        if (this.map.getTile(tx, ty) !== T.ALLEY) continue;
        if (this.map.isSolidTile(tx, ty)) continue;
        puntos.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
      }
    }

    const elegidos = [];
    for (const p of puntos) {
      if (elegidos.length >= SITIOS_PRIVADOS) break;
      if (elegidos.some((q) => Phaser.Math.Distance.Between(q.x, q.y, p.x, p.y) < SEPARACION_SITIOS)) {
        continue;
      }
      elegidos.push(p);
    }

    for (const p of elegidos) {
      const aro = this.scene.add.image(p.x, p.y, 'ring')
        .setDisplaySize(50, 50).setTint(0xc060a0).setAlpha(0.5).setDepth(4);
      this.scene.tweens.add({
        targets: aro, alpha: { from: 0.3, to: 0.6 }, scale: { from: 0.9, to: 1.08 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
      this.sitios.push({ x: p.x, y: p.y, aro });
    }
  }

  // El bamboleo de siempre para simular que anda (ver ColeccionablesSystem)
  // Y AHORA TAMBIEN los 4 fotogramas de andar (antes se quedaban clavadas en
  // el fotograma 0 mientras se deslizaban de lado a lado: se veia rigido,
  // como patinando en vez de caminando). Es el mismo truco que ya usan
  // todos los peatones de la ciudad.
  update(dt, drivingVehicle) {
    for (const g of this.gente) {
      g.t += dt;
      g.x = g.x0 + Math.sin(g.t * 0.4) * 26;
      g.fotoT += dt;
      if (g.fotoT > 0.22) {
        g.fotoT = 0;
        g.fase = (g.fase + 1) % 4;
        g.spr.setTexture(`${g.clave}-${g.fase}`);
      }
      g.spr.setPosition(g.x, g.y).setDepth(g.y);
      g.sombra.setPosition(g.x, g.y + 3);
    }

    // MIENTRAS SE COBRA: nada de buscar mas gente ni mas sitios, solo pasa
    // el tiempo y se va notando en la cartera y en la salud.
    if (this.sesion) {
      this.tickSesion(dt);
      return;
    }

    this.cerca = null;
    this.sitioCerca = null;
    if (!drivingVehicle) return;

    if (this.pasajera) {
      for (const s of this.sitios) {
        if (Phaser.Math.Distance.Between(s.x, s.y, drivingVehicle.x, drivingVehicle.y) < ALCANCE_SITIO) {
          this.sitioCerca = s;
          break;
        }
      }
      return;
    }

    for (const g of this.gente) {
      if (Phaser.Math.Distance.Between(g.x, g.y, drivingVehicle.x, drivingVehicle.y) < ALCANCE_RECOGER) {
        this.cerca = g;
        break;
      }
    }
  }

  // SUBE AL COCHE: desaparece de la calle (igual que un coche que se
  // guarda), y se lleva encima hasta un sitio privado. Devuelve el texto
  // del aviso.
  recoger() {
    const g = this.cerca;
    if (!g) return null;
    g.spr.destroy();
    g.sombra.destroy();
    this.gente.splice(this.gente.indexOf(g), 1);
    this.pasajera = g;
    this.cerca = null;
    return { texto: 'Sube al coche. Busca un sitio privado (marcado en morado)', tono: 'objective' };
  }

  // PARA EL COCHE: aqui empieza a cobrarse de verdad, poco a poco.
  empezar() {
    if (!this.sitioCerca || !this.pasajera) return null;
    if (!GameState.canAfford(10)) {
      return { texto: 'No te llega ni para empezar', tono: 'danger' };
    }
    this.sesion = { tiempo: DURACION, gastado: 0, objetivo: 0, curado: 0 };
    return { texto: 'Un buen rato...', tono: 'dim' };
  }

  tickSesion(dt) {
    const s = this.sesion;
    const paso = Math.min(dt, s.tiempo);
    s.tiempo -= paso;

    // OJO: `GameState.spendMoney` REDONDEA cada llamada (`Math.round`) y
    // descarta cualquier importe menor de 0,5 €. Un fotograma a 60 fps son
    // unos 0,2 € del total: llamando a spendMoney cada fotograma con esa
    // fraccion, TODO se perdia por el redondeo y no se cobraba nada en
    // absoluto (la cura, en cambio, si se notaba: `heal()` no redondea).
    // Arreglado acumulando el objetivo sin redondear (`s.objetivo`) y
    // cobrando solo los euros ENTEROS nuevos que se van cruzando.
    s.objetivo += (PRECIO_BUEN_RATO / DURACION) * paso;
    const aCobrar = Math.floor(s.objetivo) - s.gastado;

    if (aCobrar > 0) {
      const puedeGastar = Math.min(aCobrar, Math.max(0, Math.floor(GameState.money)));
      if (puedeGastar > 0) {
        GameState.spendMoney(puedeGastar, 'calle');
        s.gastado += puedeGastar;
        s.curado += GameState.heal((CURA_TOTAL / PRECIO_BUEN_RATO) * puedeGastar);
        Audio.pickup();
      }
      if (puedeGastar < aCobrar) {
        // se ha quedado sin dinero a mitad: se acaba aqui, no de gorra
        this.terminarSesion();
        return;
      }
    }

    if (s.tiempo <= 0) this.terminarSesion();
  }

  terminarSesion() {
    const s = this.sesion;
    this.sesion = null;
    this.pasajera = null;
    this.sitioCerca = null;
    if (!s) return;
    EventBus.emit(EVT.NOTIFY, {
      text: `Un buen rato: +${Math.round(s.curado)} de vida · ${Math.round(s.gastado)} €`,
      tone: 'money',
    });
  }

  cancelar() {
    if (!this.pasajera) return;
    this.sesion = null;
    this.pasajera = null;
    this.sitioCerca = null;
  }
}
