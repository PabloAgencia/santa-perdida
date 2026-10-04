import { ROBO, OBJETOS_ROBO } from '../config/robos.js';
import { Vehicle } from '../entities/Vehicle.js';
import { repartirPorBarrios, puertaDe } from '../world/puertas.js';
import { etiquetaFlotante } from '../world/etiquetas.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';

// LOS ROBOS DE CASAS EN LA CIUDAD (las reglas, en config/robos.js).
//
// Este sistema lleva lo de fuera: las furgonetas aparcadas, empezar el robo
// al subirte de noche, las casas marcadas, lo que llevas en brazos, cargar la
// furgoneta, venderlo en el almacen y el amanecer. Lo de dentro de cada casa
// (el ruido, coger cosas) es RoboCasaScene.
//
// Nada de esto se guarda en la partida a proposito: un robo dura una noche
// (seis minutos reales) y las furgonetas se vuelven a aparcar en cada carga.
// Lo unico que queda es lo cobrado (dinero) y lo robado en total
// (GameState.stats.robado), que es lo que da el aguante infinito.

const ALCANCE = 56;
const ALCANCE_FURGONETA = 70;

const esDeNoche = () => {
  const h = GameState.horaDelDia;
  return h >= ROBO.horaEmpieza || h < ROBO.horaAcaba;
};

export class RoboSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.activo = null;       // el robo en marcha
    this.cargando = null;     // el objeto que llevas en brazos
    this.cerca = null;        // { tipo: 'casa'|'cargar'|'almacen', ... }
    this.furgonetas = [];
    this.aparcarFurgonetas();
    this.colocarAlmacen();

    this.alSubir = ({ vehicle }) => {
      if (vehicle && vehicle.type === 'mudanzas') this.intentarEmpezar(vehicle);
    };
    // te matan o te detienen: se acabo, como cualquier mision
    this.alCaer = () => this.terminar('Se acabo el robo');
    EventBus.on(EVT.VEHICLE_ENTERED, this.alSubir);
    EventBus.on(EVT.PLAYER_DEAD, this.alCaer);
    EventBus.on(EVT.PLAYER_BUSTED, this.alCaer);
    scene.events.once('shutdown', () => {
      EventBus.off(EVT.VEHICLE_ENTERED, this.alSubir);
      EventBus.off(EVT.PLAYER_DEAD, this.alCaer);
      EventBus.off(EVT.PLAYER_BUSTED, this.alCaer);
    });

    // lo que llevas en brazos, por la calle: una caja encima de ti
    this.caja = scene.add.image(0, 0, 'px').setDisplaySize(18, 12).setDepth(9000).setVisible(false);
  }

  // dos furgonetas en el residencial, delante de una casa, como cualquier
  // coche aparcado (se recrean igual en cada carga, no se guardan)
  aparcarFurgonetas() {
    const sitios = repartirPorBarrios(this.map, {
      cuantos: ROBO.furgonetas, separacion: 2500,
      sirve: (b) => b.zone === 'residencial',
    });
    for (const s of sitios) {
      const b = s.edificio;
      const lado = Math.atan2(s.y - b.py, s.x - b.px);
      const x = s.x + Math.cos(lado) * 46;
      const y = s.y + Math.sin(lado) * 46;
      if (this.map.isSolidBox(x, y, 36, 36)) continue;
      const v = new Vehicle(this.scene, this.map, 'mudanzas', x, y, lado + Math.PI / 2, { color: 0 });
      v.deLocal = true;
      this.scene.vehicles.push(v);
      this.furgonetas.push(v);
    }
  }

  // los almacenes donde se vende lo robado: tres, en el poligono y el
  // puerto, bien separados. La noche dura cinco minutos reales: con uno solo
  // podia caer en la otra punta de la ciudad y no daba tiempo.
  colocarAlmacen() {
    this.almacenes = repartirPorBarrios(this.map, {
      cuantos: 3, separacion: 3500, ocupados: this.scene.edificiosOcupados,
      sirve: (b) => (b.zone === 'industrial' || b.zone === 'puerto') && b.pw >= 96 && b.ph >= 96,
    });
  }

  almacenCerca(x, y) {
    let mejor = null;
    for (const a of this.almacenes) {
      if (!mejor || Phaser.Math.Distance.Between(a.x, a.y, x, y) < Phaser.Math.Distance.Between(mejor.x, mejor.y, x, y)) mejor = a;
    }
    return mejor;
  }

  intentarEmpezar(v) {
    if (this.activo) {
      if (this.activo.furgoneta !== v) {
        EventBus.emit(EVT.NOTIFY, { text: 'Lo robado va en la otra furgoneta', tone: 'dim' });
      }
      return;
    }
    if (!esDeNoche()) {
      EventBus.emit(EVT.NOTIFY, { text: 'Furgoneta de mudanzas: vuelve de noche (20:00 a 06:00)', tone: 'dim' });
      return;
    }
    this.empezar(v);
  }

  empezar(v) {
    // las casas mas cercanas a la furgoneta, del residencial, separadas
    const candidatas = this.map.buildings
      .filter((b) => b.zone === 'residencial' && !b.isHideout && !this.scene.edificiosOcupados.has(b))
      .map((b) => ({ b, d: Phaser.Math.Distance.Between(b.px, b.py, v.x, v.y) }))
      .filter((c) => c.d < ROBO.radioCasas)
      .sort((p, q) => p.d - q.d);
    const casas = [];
    for (const { b } of candidatas) {
      if (casas.length >= ROBO.casasMarcadas) break;
      if (casas.some((c) => Phaser.Math.Distance.Between(c.edificio.px, c.edificio.py, b.px, b.py) < 220)) continue;
      const puerta = puertaDe(this.map, b);
      if (!puerta) continue;
      casas.push({ x: puerta.x, y: puerta.y, edificio: b, objetos: null, despierto: false, vacia: false });
    }
    if (casas.length === 0) {
      EventBus.emit(EVT.NOTIFY, { text: 'Por aqui no hay casas que robar', tone: 'dim' });
      return;
    }
    this.activo = { furgoneta: v, casas, carga: [], marcas: [] };
    for (const c of casas) this.marcarCasa(c);
    for (const a of this.almacenes) {
      const aro = this.scene.add.image(a.x, a.y, 'ring').setDisplaySize(60, 60).setTint(0xe8b54a).setDepth(6);
      this.activo.marcas.push(aro, ...Object.values(etiquetaFlotante(this.scene, a.x, a.y - 34, 'ALMACEN', 0xe8b54a))
        .filter((o) => o && o.destroy));
    }
    Audio.notes([262, 330, 392], 0.12, 'triangle', 0.1);
    EventBus.emit(EVT.BIG_MESSAGE, { title: 'ROBO', subtitle: 'Entra en las casas marcadas sin hacer ruido' });
    EventBus.emit(EVT.NOTIFY, {
      text: `Hasta las 06:00 · caben ${ROBO.capacidad} cosas · vendelo en un almacen (poligono o puerto)`, tone: 'objective',
    });
  }

  marcarCasa(c) {
    // la casa marcada: un aro amarillo en la puerta, como las de San Andreas
    c.aro = this.scene.add.image(c.x, c.y, 'ring').setDisplaySize(40, 40).setTint(0xf2d84a).setDepth(6);
    this.scene.tweens.add({ targets: c.aro, alpha: { from: 0.5, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
    this.activo.marcas.push(c.aro);
  }

  // la casa ya no tiene nada (o el vecino esta despierto): se apaga su aro
  apagarCasa(c) {
    if (c.aro) {
      this.scene.tweens.killTweensOf(c.aro);
      c.aro.setTint(0x6a6a6a).setAlpha(0.35);
    }
  }

  terminar(motivo, tono = 'danger') {
    if (!this.activo) return;
    for (const m of this.activo.marcas) if (m && m.active) m.destroy();
    for (const c of this.activo.casas) if (c.aro && c.aro.active) c.aro.destroy();
    this.activo = null;
    this.cargando = null;
    if (motivo) EventBus.emit(EVT.NOTIFY, { text: motivo, tone });
  }

  // ---- lo que pasa cada fotograma ---------------------------------------

  update(dt, player, enCoche) {
    this.cerca = null;
    this.caja.setVisible(!!this.cargando && !enCoche);
    if (this.cargando) {
      this.caja.setPosition(player.x, player.y - 12).setTint(this.cargando.color);
    }
    const r = this.activo;
    if (!r) return;

    // EL AMANECER: se acaba, y lo de la furgoneta se pierde
    if (!esDeNoche()) {
      this.terminar(r.carga.length ? 'Amanece: se acabo el robo. Lo de la furgoneta se pierde' : 'Amanece: se acabo el robo');
      return;
    }
    // la furgoneta destrozada: adios a todo
    const v = r.furgoneta;
    if (!this.scene.vehicles.includes(v) || v.quemado) {
      this.terminar('La furgoneta ya no sirve: el robo se acaba');
      return;
    }

    if (enCoche) {
      const a = this.almacenCerca(v.x, v.y);
      if (enCoche === v && a && Phaser.Math.Distance.Between(v.x, v.y, a.x, a.y) < 90) {
        this.cerca = { tipo: 'almacen' };
      }
      return;
    }

    if (this.cargando) {
      if (Phaser.Math.Distance.Between(player.x, player.y, v.x, v.y) < ALCANCE_FURGONETA) this.cerca = { tipo: 'cargar' };
      return;
    }
    for (const c of r.casas) {
      if (c.vacia) continue;
      if (Phaser.Math.Distance.Between(player.x, player.y, c.x, c.y) < ALCANCE) {
        this.cerca = { tipo: 'casa', casa: c };
        return;
      }
    }
  }

  // ---- E -------------------------------------------------------------------

  // devuelve true si el E era para el robo
  usar() {
    const r = this.activo;
    if (!r) return false;
    // con algo en brazos el E SOLO sirve para dejarlo en la furgoneta: ni
    // subirse a coches ni entrar en otros sitios
    if (this.cargando) {
      if (this.cerca && this.cerca.tipo === 'cargar') this.cargar();
      else EventBus.emit(EVT.NOTIFY, { text: `Lleva ${this.cargando.nombre.toLowerCase()} a la furgoneta`, tone: 'dim' });
      return true;
    }
    if (!this.cerca) return false;
    if (this.cerca.tipo === 'casa') {
      if (r.carga.length >= ROBO.capacidad) {
        EventBus.emit(EVT.NOTIFY, { text: 'La furgoneta esta llena: llevala al almacen', tone: 'dim' });
        return true;
      }
      if (GameState.wanted > 0) {
        EventBus.emit(EVT.NOTIFY, { text: 'Con la policia detras no es momento', tone: 'danger' });
        return true;
      }
      const c = this.cerca.casa;
      if (!c.objetos) c.objetos = this.llenarCasa();
      this.scene.interiorDoor = { x: c.x, y: c.y, edificio: c.edificio };
      this.scene.abrirInterior({ casa: c, sitio: ROBO.capacidad - r.carga.length }, 'RoboCasaScene');
      return true;
    }
    if (this.cerca.tipo === 'almacen') {
      this.vender();
      return true;
    }
    return false;
  }

  // lo que hay en una casa: de 3 a 5 cosas distintas, y una distribucion
  // de las tres que sabe pintar RoboCasaScene
  llenarCasa() {
    const n = Phaser.Math.Between(3, 5);
    return Phaser.Utils.Array.Shuffle([...OBJETOS_ROBO]).slice(0, n).map((o) => ({ ...o }));
  }

  // al salir de RoboCasaScene (CityScene.onHideoutExit)
  alSalirDeCasa(datos) {
    if (!this.activo) return;
    const c = datos.casa;
    if (datos.cargando) {
      this.cargando = datos.cargando;
      EventBus.emit(EVT.NOTIFY, { text: `${datos.cargando.nombre}: a la furgoneta (E al lado)`, tone: 'objective' });
    }
    if (c && (c.objetos.length === 0 || c.despierto)) {
      c.vacia = true;
      this.apagarCasa(c);
    }
  }

  cargar() {
    const r = this.activo;
    r.carga.push(this.cargando);
    Audio.notes([392, 523.25], 0.07);
    const total = r.carga.reduce((a, o) => a + o.valor, 0);
    EventBus.emit(EVT.NOTIFY, {
      text: `${this.cargando.nombre} cargado · ${r.carga.length}/${ROBO.capacidad} · ${total} €`, tone: 'money',
    });
    this.cargando = null;
    if (r.carga.length >= ROBO.capacidad) {
      EventBus.emit(EVT.NOTIFY, { text: 'Furgoneta llena: al almacen', tone: 'objective' });
    }
  }

  vender() {
    const r = this.activo;
    if (r.carga.length === 0) {
      EventBus.emit(EVT.NOTIFY, { text: 'La furgoneta va vacia', tone: 'dim' });
      return;
    }
    const total = r.carga.reduce((a, o) => a + o.valor, 0);
    const antes = GameState.stats.robado || 0;
    GameState.addMoney(total, 'robo');
    GameState.bumpStat('robado', total);
    GameState.bumpStat('robos', r.carga.length);
    Audio.notes([392, 523.25, 659.25, 783.99], 0.09);
    EventBus.emit(EVT.BIG_MESSAGE, { title: `+${total} €`, subtitle: `${r.carga.length} cosas vendidas en el almacen` });
    // EL PREMIO DE SAN ANDREAS: al pasar de 10.000 € robados en total
    if (antes < ROBO.premioTotal && antes + total >= ROBO.premioTotal) {
      GameState.flags.aguanteInfinito = true;
      this.scene.time.delayedCall(2600, () => EventBus.emit(EVT.BIG_MESSAGE, {
        title: 'AGUANTE INFINITO', subtitle: `Mas de ${ROBO.premioTotal.toLocaleString('es-ES')} € robados: ya no te cansas al correr`,
      }));
    }
    // se puede seguir robando esa misma noche con la furgoneta vacia
    r.carga = [];
  }

  // para el HUD: el objetivo, la flecha y el tiempo hasta el amanecer
  objetivo(player) {
    const r = this.activo;
    if (!r) return null;
    const h = GameState.minutoDelDia;
    const hasta6 = (ROBO.horaAcaba * 60 - h + 1440) % 1440;
    const segundos = hasta6 / 2;   // DiaNocheSystem: 2 minutos de mundo por segundo
    let target = null;
    let texto;
    if (this.cargando) {
      target = { x: r.furgoneta.x, y: r.furgoneta.y };
      texto = `Lleva ${this.cargando.nombre.toLowerCase()} a la furgoneta`;
    } else if (r.carga.length >= ROBO.capacidad) {
      target = this.almacenCerca(r.furgoneta.x, r.furgoneta.y);
      texto = 'Furgoneta llena: al almacen';
    } else {
      const libres = r.casas.filter((c) => !c.vacia);
      if (libres.length) {
        libres.sort((p, q) => Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y)
          - Phaser.Math.Distance.Between(q.x, q.y, player.x, player.y));
        target = libres[0];
      } else target = this.almacenCerca(r.furgoneta.x, r.furgoneta.y);
      texto = `Robo: ${r.carga.length}/${ROBO.capacidad} en la furgoneta · ${r.carga.reduce((a, o) => a + o.valor, 0)} €`;
    }
    return { objective: texto, remaining: segundos, target: target ? { x: target.x, y: target.y } : null };
  }

  textoAccion() {
    if (!this.cerca) return this.cargando ? 'Con algo en brazos no se corre' : '';
    if (this.cerca.tipo === 'casa') return 'E para colarte en la casa';
    if (this.cerca.tipo === 'cargar') return `E para meter ${this.cargando.nombre.toLowerCase()} en la furgoneta`;
    if (this.cerca.tipo === 'almacen') {
      const total = this.activo.carga.reduce((a, o) => a + o.valor, 0);
      return `E para vender lo robado · ${total} €`;
    }
    return '';
  }
}
