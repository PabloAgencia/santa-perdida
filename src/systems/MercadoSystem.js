import { VEHICLES } from '../config/vehicles.js';
import { CITY } from '../config/city.js';
import { TILE } from '../config/balance.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { etiquetaFlotante } from '../world/etiquetas.js';
import { COOLDOWN_VENTA_COCHE } from './GruaSystem.js';

// EL MERCADO DE COCHES POR BARRIOS. La grua del puerto (GruaSystem) ya
// compraba coches, pero solo en un sitio y solo tres modelos concretos a la
// vez. Esto es aparte: unos desguaces repartidos por otros barrios que
// compran CUALQUIER coche, a un precio que sube y baja solo con el tiempo
// segun como ande la demanda de esa zona. La libreta (tecla L) dice donde
// pagan mejor ahora mismo, para decidir adonde llevarlo antes de vender.

const ZONAS = ['residencial', 'comercial', 'industrial', 'conflictivo'];
const SEPARACION = 1700;
const ALCANCE = 70;
const PAGO_MIN_FRACCION = 0.12;
// un pelin peor que la grua: es la via facil, no la mejor paga. Con la
// demanda del sitio (0,65 a 1,45) la fraccion de verdad puede llegar a
// rondar la de la grua en el mejor momento, pero nunca de calle
const PAGO_MAX_FRACCION = 0.24;
const REFRESCO_ENTRE = [100, 170];  // segundos entre subidas/bajadas de demanda de cada desguace

export class MercadoSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.puntos = [];
    this.cerca = null;
    this.abrir();
  }

  puertaDe(b) {
    for (const dist of [26, 36, 48]) {
      const lados = [
        { x: b.px, y: b.py + b.ph / 2 + dist },
        { x: b.px, y: b.py - b.ph / 2 - dist },
        { x: b.px + b.pw / 2 + dist, y: b.py },
        { x: b.px - b.pw / 2 - dist, y: b.py },
      ];
      for (const c of lados) {
        if (this.map.isSolidBox(c.x, c.y, 14, 14)) continue;
        if (this.map.isRoadPoint(c.x, c.y)) continue;
        return c;
      }
    }
    return null;
  }

  abrir() {
    const ocupados = this.scene.edificiosOcupados;
    const candidatos = this.map.buildings.filter(
      (b) => !b.isHideout && b.pw >= TILE * 2 && b.ph >= TILE * 2 && (!ocupados || !ocupados.has(b))
    );
    Phaser.Utils.Array.Shuffle(candidatos);

    for (const zona of ZONAS) {
      const vale = (c, min) => c.zone === zona && c.pw >= min && c.ph >= min &&
        !this.puntos.some((p) => Phaser.Math.Distance.Between(p.x, p.y, c.px, c.py) < SEPARACION) &&
        this.puertaDe(c);
      // un desguace necesita patio: primero un edificio de 3 casillas o mas,
      // y solo si en ese barrio no hay ninguno, uno de 2
      const b = candidatos.find((c) => vale(c, TILE * 3)) || candidatos.find((c) => vale(c, TILE * 2));
      if (!b) continue;
      const puerta = this.puertaDe(b);

      const punto = {
        x: puerta.x, y: puerta.y, edificio: b, zona,
        nombre: this.map.cfg.zones[zona]?.label || zona,
        demanda: 0.8 + Math.random() * 0.5,
        refresco: Phaser.Math.Between(REFRESCO_ENTRE[0], REFRESCO_ENTRE[1]),
      };
      this.puntos.push(punto);
      if (ocupados) ocupados.add(b);
      this.pintar(punto);
    }
  }

  // igual que el tejado de un barrio o de un local: un solo `techo-desguace`
  // compartido por los cuatro (son el mismo tipo de sitio, no seis sabores
  // distintos como los pisos o los negocios)
  pintarTejado(p) {
    if (!this.scene.textures.exists('techo-desguace')) return;
    const b = p.edificio;
    this.scene.add.image(b.px, b.py, 'techo-desguace')
      .setDisplaySize(b.pw - 4, b.ph - 4).setDepth(-900);
  }

  pintar(p) {
    this.pintarTejado(p);
    if (!this.scene.textures.exists('techo-desguace')) this.pintarPatio(p);
    // la entrada, la misma del mecanico: franjas amarillas por donde se
    // mete el coche (LocalSystem.pintarFachada)
    const f = this.scene.locales
      ? this.scene.locales.pintarFachada({ x: p.x, y: p.y, edificio: p.edificio, cfg: { enCoche: true, color: 0xc87f4a } })
      : { rotulo: { x: p.x, y: p.y - 32 } };
    const aro = this.scene.add.image(p.x, p.y, 'ring')
      .setDisplaySize(58, 58).setTint(0xc87f4a).setDepth(6);
    this.scene.tweens.add({
      targets: aro, scale: { from: 0.85, to: 1.1 },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    etiquetaFlotante(this.scene, f.rotulo.x, f.rotulo.y, 'DESGUACE', 0xc87f4a);
  }

  // EL PATIO DEL DESGUACE (pulido B del PLAN). Eran cuatro edificios
  // normales con un cartel, identicos. Ahora el "tejado" es un patio vallado
  // de grava con coches siniestrados apilados, cada desguace con su propio
  // monton (sale del sitio del edificio, asi que siempre es el mismo). El
  // edificio sigue siendo macizo: es un patio cerrado, no se entra andando.
  pintarPatio(p) {
    const s = this.scene;
    const b = p.edificio;
    let semilla = (b.tx * 73856093) ^ (b.ty * 19349663);
    const rnd = () => {
      semilla = (semilla * 1103515245 + 12345) & 0x7fffffff;
      return semilla / 0x7fffffff;
    };
    const D = -885;
    const x0 = b.px - b.pw / 2;
    const y0 = b.py - b.ph / 2;
    s.pintarRect(b.px, b.py, b.pw - 2, b.ph - 2, 0x5e594e, D);
    // manchas de aceite y grava
    for (let i = 0; i < (b.pw * b.ph) / 900; i++) {
      s.pintarRect(x0 + rnd() * b.pw, y0 + rnd() * b.ph, 3 + rnd() * 8, 2 + rnd() * 6,
        rnd() < 0.3 ? 0x2a2620 : 0x7a7466, D + 1, 0.6);
    }
    // los coches: filas de chatarra, unos en horizontal y otros en vertical
    const COLORES = [0x6a2a24, 0x2f4a63, 0x6d6a5c, 0x3d3f45, 0x55402f, 0x8a7a4a, 0x4a5b6b];
    const paso = 30;
    for (let y = y0 + 16; y < y0 + b.ph - 14; y += paso) {
      for (let x = x0 + 18; x < x0 + b.pw - 16; x += paso) {
        if (rnd() < 0.28) continue;   // huecos para que no sea una cuadricula
        const horiz = rnd() < 0.6;
        const w = horiz ? 24 : 12;
        const h = horiz ? 12 : 24;
        const cx = x + (rnd() - 0.5) * 6;
        const cy = y + (rnd() - 0.5) * 6;
        const color = COLORES[Math.floor(rnd() * COLORES.length)];
        s.pintarRect(cx + 2, cy + 3, w, h, 0x05060a, D + 2, 0.45);
        s.pintarRect(cx, cy, w, h, color, D + 3);
        // la luna, rota y oscura
        s.pintarRect(cx + (horiz ? 3 : 0), cy + (horiz ? 0 : -3), horiz ? 7 : 8, horiz ? 8 : 7, 0x1d2128, D + 4, 0.85);
        // otro encima, a veces: la pila
        if (rnd() < 0.35) {
          const c2 = COLORES[Math.floor(rnd() * COLORES.length)];
          s.pintarRect(cx + 2, cy - 2, w - 4, h - 4, c2, D + 5);
          s.pintarRect(cx + 2, cy - 2, w - 10 > 0 ? w - 10 : 4, 3, 0x1d2128, D + 6, 0.7);
        }
      }
    }
    // la valla de chapa, con sus postes
    const valla = 0x8a8f96;
    s.pintarRect(b.px, y0 + 1.5, b.pw, 3, valla, D + 7);
    s.pintarRect(b.px, y0 + b.ph - 1.5, b.pw, 3, valla, D + 7);
    s.pintarRect(x0 + 1.5, b.py, 3, b.ph, valla, D + 7);
    s.pintarRect(x0 + b.pw - 1.5, b.py, 3, b.ph, valla, D + 7);
    for (let x = x0; x <= x0 + b.pw; x += 16) {
      s.pintarRect(x, y0 + 1.5, 4, 4, 0x3a3f46, D + 8);
      s.pintarRect(x, y0 + b.ph - 1.5, 4, 4, 0x3a3f46, D + 8);
    }
    for (let y = y0; y <= y0 + b.ph; y += 16) {
      s.pintarRect(x0 + 1.5, y, 4, 4, 0x3a3f46, D + 8);
      s.pintarRect(x0 + b.pw - 1.5, y, 4, 4, 0x3a3f46, D + 8);
    }
  }

  update(dt, player, drivingVehicle) {
    for (const p of this.puntos) {
      p.refresco -= dt;
      if (p.refresco <= 0) {
        p.demanda = 0.65 + Math.random() * 0.8;
        p.refresco = Phaser.Math.Between(REFRESCO_ENTRE[0], REFRESCO_ENTRE[1]);
      }
    }

    this.cerca = null;
    if (!drivingVehicle) return;
    for (const p of this.puntos) {
      if (Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) < ALCANCE) {
        this.cerca = p;
        return;
      }
    }
  }

  // cuanto pagaria este desguace AHORA por este coche
  estimar(punto, vehicle) {
    const stats = VEHICLES[vehicle.type];
    const estado = Phaser.Math.Clamp(vehicle.hp / stats.maxHp, 0, 1);
    const fraccion = PAGO_MIN_FRACCION + (PAGO_MAX_FRACCION - PAGO_MIN_FRACCION) * estado;
    return Math.round(stats.price * fraccion * punto.demanda);
  }

  vender(vehicle) {
    if (!this.cerca) return null;
    if (!GameState.puedeVenderCoche()) return null;
    const pago = this.estimar(this.cerca, vehicle);
    GameState.addMoney(pago, 'desguace');
    GameState.marcarVentaCoche(COOLDOWN_VENTA_COCHE);
    EventBus.emit(EVT.NOTIFY, { text: `Vendido en el desguace · ${pago} €`, tone: 'money' });
    return { pago, nombre: VEHICLES[vehicle.type].name };
  }

  // para la libreta (tecla L): cada punto, su etiqueta de demanda y la
  // distancia en casillas desde donde esta ahora el jugador, el mejor primero
  resumen(playerX, playerY) {
    const etiqueta = (d) => d >= 1.25 ? 'MUY BUENA' : d >= 1.05 ? 'BUENA' : d >= 0.85 ? 'NORMAL' : 'FLOJA';
    return this.puntos
      .map((p) => ({
        zona: p.nombre,
        etiqueta: etiqueta(p.demanda),
        demanda: p.demanda,
        tiles: Math.round(Phaser.Math.Distance.Between(playerX, playerY, p.x, p.y) / TILE),
      }))
      .sort((a, b) => b.demanda - a.demanda);
  }
}
