import { NEGOCIOS, NEGOCIO_CASINO, claveNegocio } from '../config/negocios.js';
import { FACTIONS, ZONE_OWNER } from '../config/factions.js';
import { puertaDe } from '../world/puertas.js';
import { etiquetaFlotante } from '../world/etiquetas.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';

// LOS NEGOCIOS QUE DAN RENTA. Uno por barrio, elegido DETERMINISTA como los
// pisos (el mismo edificio siempre, el mas centrado del barrio con puerta
// valida): lo has pagado, no puede cambiar de sitio en otra carga.
//
// Reparto FUERA de este fichero: config/negocios.js dice cuanto cuesta cada
// uno, cuanto renta y de que banda es. Aqui solo vive el mecanismo.

const DESCUBRE = 340;
const ALCANCE = 62;

const CHEQUEO_ATAQUE = 22;         // cada cuantos segundos se tira el dado
const PROB_ATAQUE = 0.22;          // si la banda dueña esta hostil contigo
const ATACANTES = 2;
const TIEMPO_ANTES_DE_ROBAR = 26;  // aguanta esto sin que los rechaces
const FRACCION_ROBADA = 0.55;
const REFRESCO_CARTEL = 1;         // el cartel no hace falta repintarlo cada fotograma

export class NegocioSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.negocios = [];
    this.cerca = null;
    this.colocar();
  }

  colocar() {
    for (const zona of Object.keys(NEGOCIOS)) {
      const candidatos = this.map.buildings.filter(
        (b) => b.zone === zona && !b.isHideout && b.pw >= 64 && b.ph >= 64
      );
      if (candidatos.length === 0) continue;

      let cx = 0;
      let cy = 0;
      for (const b of candidatos) { cx += b.px; cy += b.py; }
      cx /= candidatos.length;
      cy /= candidatos.length;

      candidatos.sort((a, b) => {
        const da = Phaser.Math.Distance.Between(a.px, a.py, cx, cy);
        const db = Phaser.Math.Distance.Between(b.px, b.py, cx, cy);
        return da - db || a.px - b.px || a.py - b.py;
      });

      // F1: DOS PROPIEDADES EN VENTA NO VAN PEGADAS. El piso del barrio coge el
      // edificio mas centrado y el negocio cogia el siguiente, o sea el de al
      // lado. Se prefiere uno a 1000 px o mas de los pisos; si el barrio no da
      // para tanto, se pone donde se pueda.
      const pisos = this.scene.pisos ? this.scene.pisos.pisos : [];
      const lejos = (b) => pisos.every(
        (p) => Phaser.Math.Distance.Between(p.x, p.y, b.px, b.py) >= 1000
      );
      candidatos.sort((x, y) => (lejos(y) ? 1 : 0) - (lejos(x) ? 1 : 0));

      for (const b of candidatos) {
        // saltar si ya tiene el cartel de otro sistema (un piso, la
        // armeria...): dos carteles en el mismo sitio no se leen
        if (this.scene.edificiosOcupados && this.scene.edificiosOcupados.has(b)) continue;
        const puerta = puertaDe(this.map, b);
        if (!puerta) continue;
        const negocio = {
          zona, clave: claveNegocio(zona), x: puerta.x, y: puerta.y,
          edificio: b, cfg: NEGOCIOS[zona],
          ataque: null, probTimer: CHEQUEO_ATAQUE * Math.random(), refrescoTimer: 0,
        };
        this.negocios.push(negocio);
        this.pintar(negocio);
        if (this.scene.edificiosOcupados) this.scene.edificiosOcupados.add(b);
        break;
      }
    }
    this.colocarCasino();
  }

  // EL CASINO: no es "uno por barrio en un edificio cualquiera" como los
  // otros seis, es EL LANDMARK del casino, que ya existia sin ningun uso.
  // `zona: 'centro'` es solo para que lo ataque la banda que ya manda en el
  // centro (ZONE_OWNER), no porque comparta edificio con la joyeria: cada
  // uno tiene su propia clave y su propia caja. Ya tiene su lamina propia
  // (landmark-casino); no hace falta pedirle un tejado aparte.
  colocarCasino() {
    const lm = this.map.landmarks.find((l) => l.type === 'casino');
    if (!lm || !lm.fachada) return;
    const b = lm.fachada;
    const puerta = puertaDe(this.map, b);
    if (!puerta) return;
    const negocio = {
      zona: 'centro', clave: claveNegocio('casino'), x: puerta.x, y: puerta.y,
      edificio: b, cfg: NEGOCIO_CASINO,
      ataque: null, probTimer: CHEQUEO_ATAQUE * Math.random(), refrescoTimer: 0,
    };
    this.negocios.push(negocio);
    this.pintar(negocio);
  }

  // igual que el tejado de un barrio o de un local: uno por negocio (seis en
  // total, cada uno de un tipo de comercio distinto)
  pintarTejado(n) {
    const clave = `techo-negocio-${n.zona}`;
    if (!this.scene.textures.exists(clave)) return;
    const b = n.edificio;
    this.scene.add.image(b.px, b.py, clave)
      .setDisplaySize(b.pw - 4, b.ph - 4).setDepth(-900);
  }

  pintar(n) {
    this.pintarTejado(n);
    const suyo = GameState.esDueno(n.clave);
    n.aro = this.scene.add.image(n.x, n.y, 'ring')
      .setDisplaySize(60, 60).setTint(suyo ? 0xe8b54a : n.cfg.color).setDepth(6);
    this.scene.tweens.add({
      targets: n.aro, scale: { from: 0.85, to: 1.1 },
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    n.etiqueta = etiquetaFlotante(
      this.scene, n.x, n.y - 32, this.textoCartel(n), suyo ? 0xe8b54a : n.cfg.color
    );
  }

  textoCartel(n) {
    // el casino se ENTRA (CasinoScene): "SE VENDE" en su puerta no decia
    // que dentro se juega. Que se vende lo cuenta el despacho de dentro.
    if (n.cfg === NEGOCIO_CASINO && !GameState.esDueno(n.clave)) return 'CASINO FORTUNA\nABIERTO';
    if (!GameState.esDueno(n.clave)) return `SE VENDE\n${n.cfg.precio} €`;
    if (n.ataque) return `${n.cfg.corto}\n¡EN PELIGRO!`;
    return `${n.cfg.corto}\n${Math.round(GameState.caja(n.clave))} €`;
  }

  refrescar(n) {
    const suyo = GameState.esDueno(n.clave);
    n.aro.setTint(suyo ? 0xe8b54a : n.cfg.color);
    n.etiqueta.texto.setText(this.textoCartel(n));
    n.etiqueta.raya.setTint(suyo ? 0xe8b54a : n.cfg.color);
    n.etiqueta.refrescar();
  }

  update(dt, player) {
    this.cerca = null;
    for (const n of this.negocios) {
      const d = Phaser.Math.Distance.Between(n.x, n.y, player.x, player.y);

      if (d < DESCUBRE && GameState.descubrir(n.clave)) {
        EventBus.emit(EVT.NOTIFY, { text: `Nuevo sitio: ${n.cfg.nombre}`, tone: 'objective' });
        EventBus.emit(EVT.STATS_CHANGED, { descubierto: n.clave });
      }
      if (d < ALCANCE) this.cerca = n;

      if (!GameState.esDueno(n.clave)) continue;
      this.actualizarNegocioComprado(n, dt);
    }
  }

  actualizarNegocioComprado(n, dt) {
    if (n.ataque) {
      n.ataque.timer -= dt;
      const vivos = n.ataque.atacantes.filter((p) => !p.down);
      if (vivos.length === 0) {
        this.resolverAtaque(n, true);
      } else if (n.ataque.timer <= 0) {
        this.resolverAtaque(n, false);
      }
    } else {
      GameState.acumularRenta(n.clave, n.cfg.rentaPorSegundo * dt, n.cfg.tope);

      const owner = n.cfg.tipo !== 'neutral' ? ZONE_OWNER[n.zona] : null;
      if (owner && GameState.isHostile(owner)) {
        n.probTimer -= dt;
        if (n.probTimer <= 0) {
          n.probTimer = CHEQUEO_ATAQUE;
          if (Math.random() < PROB_ATAQUE) this.iniciarAtaque(n, owner);
        }
      }
    }

    n.refrescoTimer += dt;
    if (n.refrescoTimer >= REFRESCO_CARTEL) {
      n.refrescoTimer = 0;
      this.refrescar(n);
    }
  }

  iniciarAtaque(n, owner) {
    if (!this.scene.npcs) return;
    const atacantes = [];
    for (let i = 0; i < ATACANTES; i++) {
      const a = (Math.PI * 2 * i) / ATACANTES + Math.random() * 0.6;
      const x = n.x + Math.cos(a) * 70;
      const y = n.y + Math.sin(a) * 70;
      if (this.map.isSolidBox(x, y, 20, 20)) continue;
      atacantes.push(this.scene.npcs.crearPandillero(x, y, owner));
    }
    if (atacantes.length === 0) return;

    n.ataque = { atacantes, timer: TIEMPO_ANTES_DE_ROBAR };
    EventBus.emit(EVT.NOTIFY, {
      text: `¡${FACTIONS[owner].short} esta atacando ${n.cfg.nombre}!`, tone: 'danger',
    });
  }

  resolverAtaque(n, rechazado) {
    if (rechazado) {
      EventBus.emit(EVT.NOTIFY, { text: `${n.cfg.nombre} a salvo`, tone: 'money' });
    } else {
      const robado = GameState.robarCaja(n.clave, FRACCION_ROBADA);
      EventBus.emit(EVT.NOTIFY, {
        text: robado > 0
          ? `Te han vaciado la caja de ${n.cfg.nombre} · -${robado} €`
          : `${n.cfg.nombre}: se han ido de vacio`,
        tone: 'danger',
      });
    }
    n.ataque = null;
    this.refrescar(n);
  }

  // Devuelve que ha pasado, para que CityScene decida el aviso.
  comprar(n) {
    if (GameState.esDueno(n.clave)) return 'ya-es-tuyo';
    if (!GameState.canAfford(n.cfg.precio)) return 'sin-dinero';
    GameState.comprarPropiedad(n.clave, { tipo: 'negocio', precio: n.cfg.precio });
    this.refrescar(n);
    return 'comprado';
  }

  // igual, para cobrar la caja: null si no hay nada que decir
  cobrar(n) {
    if (n.ataque) return { texto: 'Con la banda encima no se puede cobrar', tono: 'danger' };
    const cobrado = GameState.cobrarRenta(n.clave);
    this.refrescar(n);
    if (cobrado <= 0) return { texto: 'La caja esta vacia', tono: 'dim' };
    return { texto: `Caja cobrada · ${cobrado} €`, tono: 'money' };
  }
}
