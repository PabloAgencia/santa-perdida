import { LOCALES, CURAS } from '../config/locales.js';
import { VEHICLES } from '../config/vehicles.js';
import { Vehicle } from '../entities/Vehicle.js';
import { repartirPorBarrios } from '../world/puertas.js';
import { etiquetaFlotante } from '../world/etiquetas.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';

// LOS LOCALES: hospital, comisaria, taller de pintura y sitios de comida.
//
// Los cuatro funcionan igual (te acercas, pulsas E, pagas, pasa algo), asi
// que comparten sistema en vez de tener uno cada uno. Lo que los distingue
// esta en config/locales.js: cuantos hay, que cuestan y que hacen. Añadir el
// quinto es añadir diez lineas alli.

const DESCUBRE = 340;   // pasar por delante basta para que salga en el mapa
const ALCANCE = 62;

export class LocalSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.locales = [];
    this.cerca = null;
    this.colocar();
  }

  colocar() {
    for (const cfg of Object.values(LOCALES)) {
      const sitios = repartirPorBarrios(this.map, {
        // los unicos (el concesionario...) siguen siendo uno
        cuantos: cfg.cuantos > 1 ? Math.round(cfg.cuantos * this.map.escalaContenido) : cfg.cuantos,
        separacion: cfg.separacion,
        ocupados: this.scene.edificiosOcupados,
        // algunos solo van en ciertos barrios (el gimnasio: centro y comercial)
        sirve: cfg.zonas ? (b) => cfg.zonas.includes(b.zone) : null,
      });
      for (const s of sitios) {
        const local = {
          ...s,
          cfg,
          clave: `${cfg.clave}-${Math.round(s.x)}-${Math.round(s.y)}`,
        };
        this.locales.push(local);
        this.pintar(local);
        if (cfg.vehiculo) this.aparcar(local, cfg.vehiculo);
      }
    }
  }

  // hospital y comisaria se ven como edificios de uso de verdad, no un
  // edificio cualquiera con un marcador flotando encima: se repinta el
  // tejado del propio edificio (`local.edificio`, ver repartirPorBarrios)
  // por encima del dibujo normal de CityScene.drawBuildings.
  pintarEdificioDeUso(local) {
    const b = local.edificio;
    if (!b) return;
    const lado = Math.min(b.pw, b.ph);

    // igual que el tejado normal de un barrio (PintarCiudad.drawBuildings,
    // `techo-${b.zone}`): si hay una imagen de IA para ESTE local en
    // concreto, manda ella y el dibujo de rectangulos de abajo no se pinta.
    const claveTecho = `techo-${local.cfg.clave}`;
    if (this.scene.textures.exists(claveTecho)) {
      this.scene.add.image(b.px, b.py, claveTecho)
        .setDisplaySize(b.pw - 4, b.ph - 4).setDepth(-900);
      return;
    }

    if (local.cfg.clave === 'hospital') {
      this.scene.add.image(b.px, b.py, 'px')
        .setDisplaySize(b.pw - 4, b.ph - 4).setTint(0xe8e4dc).setDepth(-900);
      const cruz = lado * 0.4;
      this.scene.add.image(b.px, b.py, 'px')
        .setDisplaySize(cruz, cruz * 0.3).setTint(0xd9384a).setDepth(-895);
      this.scene.add.image(b.px, b.py, 'px')
        .setDisplaySize(cruz * 0.3, cruz).setTint(0xd9384a).setDepth(-895);
    } else if (local.cfg.clave === 'comisaria') {
      this.scene.add.image(b.px, b.py, 'px')
        .setDisplaySize(b.pw - 4, b.ph - 4).setTint(0x2a3550).setDepth(-900);
      this.scene.add.circle(b.px, b.py, lado * 0.22, 0x5a8fd0).setDepth(-895);
      this.scene.add.circle(b.px, b.py, lado * 0.13, 0x1a2a4a).setDepth(-894);
    }
  }

  pintar(local) {
    this.pintarEdificioDeUso(local);
    const f = this.pintarFachada(local);
    // el aro en la puerta: es el sitio donde se pulsa E, como las entradas
    // de los GTA. Algo mas pequeño que antes, ahora que la fachada ya dice
    // que es una tienda.
    const aro = this.scene.add.image(local.x, local.y, 'ring')
      .setDisplaySize(44, 44).setTint(local.cfg.color).setDepth(6);
    this.scene.tweens.add({
      targets: aro, scale: { from: 0.85, to: 1.1 },
      duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    // el nombre, como un rotulo sobre el propio edificio, no flotando en
    // la acera
    etiquetaFlotante(this.scene, f.rotulo.x, f.rotulo.y, local.cfg.corto, local.cfg.color);

    // DE NOCHE SE ENCIENDE: un resplandor del color del local en su puerta,
    // como un escaparate iluminado, para encontrarlo desde lejos. Aqui solo
    // se apunta donde va: lo pinta UIScene.pintarLucesNoche POR ENCIMA del
    // velo de la noche (pintado en la ciudad, el velo lo apagaba entero).
    this.luces = this.luces || [];
    this.luces.push({ x: local.x, y: local.y, color: local.cfg.color });
  }

  // LA FACHADA (APUNTES H1). Antes el local era un edificio cualquiera con
  // un aro delante: nada decia desde la calle que alli hubiera una tienda.
  // Ahora el lado de la puerta lleva lo que lleva un local de verdad:
  //   tiendas, bar, comida...  un toldo a rayas de su color y la puerta
  //   mecanico y taller       una persiana de garaje y el suelo pintado a
  //                           franjas amarillas y negras, por donde se entra
  //                           con el coche
  // Todo va pintado encima del edificio y de la acera (no es un objeto
  // nuevo que haya que esquivar): el edificio ya es macizo y la acera se
  // sigue pisando.
  pintarFachada(local) {
    const b = local.edificio;
    const s = this.scene;
    // de que lado del edificio cae la puerta, y hacia donde mira (n)
    let n;
    if (local.y > b.py + b.ph / 2) n = { x: 0, y: 1 };
    else if (local.y < b.py - b.ph / 2) n = { x: 0, y: -1 };
    else if (local.x > b.px) n = { x: 1, y: 0 };
    else n = { x: -1, y: 0 };
    const horizontal = n.y !== 0;               // la fachada corre de lado a lado
    const lado = horizontal ? b.pw : b.ph;
    // el punto del borde del edificio frente a la puerta
    const bx = horizontal ? local.x : b.px + n.x * b.pw / 2;
    const by = horizontal ? b.py + n.y * b.ph / 2 : local.y;
    const D = -880;
    const rect = (cx, cy, largo, ancho, color, alpha = 1, dz = 0) => {
      // largo = a lo largo de la fachada; ancho = hacia la calle
      const w = horizontal ? largo : ancho;
      const h = horizontal ? ancho : largo;
      s.pintarRect(cx, cy, w, h, color, D + dz, alpha);
    };
    const en = (a, fuera) => ({   // a = a lo largo, fuera = hacia la calle
      x: bx + (horizontal ? a : 0) + n.x * fuera,
      y: by + (horizontal ? 0 : a) + n.y * fuera,
    });

    const enCoche = local.cfg.enCoche;
    if (enCoche) {
      const L = Math.min(lado - 10, 72);
      // la persiana, en el borde del tejado
      let p = en(0, -5);
      rect(p.x, p.y, L, 10, 0x6a6f76);
      for (let i = -3; i <= 3; i++) {
        p = en(0, -5 + i * 1.3);
        rect(p.x, p.y, L - 4, 1, 0x3a3f46, 0.8, 1);
      }
      // el suelo de la entrada: franjas amarillas y negras
      p = en(0, 9);
      rect(p.x, p.y, L, 14, 0x15181d, 0.9, 1);
      for (let a = -L / 2 + 5; a < L / 2; a += 12) {
        p = en(a, 9);
        rect(p.x, p.y, 6, 12, 0xe8c040, 0.9, 2);
      }
    } else {
      const L = Math.min(lado - 10, 104);
      // sombra del toldo sobre la acera
      let p = en(4, 12);
      rect(p.x, p.y, L, 16, 0x05060a, 0.35);
      // el toldo: rayas de su color y crema
      const raya = 10;
      for (let a = -L / 2, i = 0; a < L / 2; a += raya, i++) {
        p = en(a + raya / 2, 7);
        rect(p.x, p.y, Math.min(raya, L / 2 - a), 14, i % 2 ? 0xf2efe6 : local.cfg.color, 1, 1);
      }
      // el faldon del toldo, mas oscuro
      p = en(0, 14.5);
      rect(p.x, p.y, L, 3, 0x05060a, 0.45, 2);
      // la puerta de cristal, en el borde, y el felpudo delante
      p = en(0, -2);
      rect(p.x, p.y, 22, 4, 0x9fd8f0, 0.9, 3);
      p = en(0, 21);
      rect(p.x, p.y, 20, 7, 0x3a2a20, 0.9, 1);
    }
    // donde va el rotulo: sobre el tejado, pegado a la fachada
    return { rotulo: en(0, -20) };
  }

  // Un coche del oficio aparcado en la puerta. No es decoracion: se roba
  // como cualquier otro, que es justo lo que uno quiere hacer al ver una
  // ambulancia parada.
  aparcar(local, tipo) {
    if (!VEHICLES[tipo]) return;
    const lado = Math.atan2(local.y - local.edificio.py, local.x - local.edificio.px);
    const x = local.x + Math.cos(lado) * 46;
    const y = local.y + Math.sin(lado) * 46;
    if (this.map.isSolidBox(x, y, 34, 34)) return;
    if (this.scene.vehicles.some((v) => Phaser.Math.Distance.Between(v.x, v.y, x, y) < 90)) return;

    const v = new Vehicle(this.scene, this.map, tipo, x, y, lado + Math.PI / 2, { color: 0 });
    // se recrea igual en cada carga (ver comprobacion de arriba), asi que no
    // se guarda en la partida: si se guardara, se duplicaria cada vez
    v.deLocal = true;
    this.scene.vehicles.push(v);
    local.coche = v;
  }

  update(player, enCoche) {
    this.cerca = null;
    for (const l of this.locales) {
      const d = Phaser.Math.Distance.Between(l.x, l.y, player.x, player.y);

      if (d < DESCUBRE && GameState.descubrir(l.clave)) {
        EventBus.emit(EVT.NOTIFY, { text: `Nuevo sitio: ${l.cfg.nombre}`, tone: 'objective' });
        EventBus.emit(EVT.STATS_CHANGED, { descubierto: l.clave });
      }
      if (d >= ALCANCE) continue;
      // el taller pide estar DENTRO del coche; los demas, fuera
      if (!!enCoche !== !!l.cfg.enCoche) continue;
      this.cerca = l;
    }
  }

  // Lo que se usa SIN entrar: el mecanico y el taller de pintura, desde el
  // coche. Tienda, comida, bar y hospital ya no pasan por aqui: se entra
  // (LocalScene) y se compra en el mostrador, atraco incluido.
  // Devuelve un texto para el aviso, o null si no ha pasado nada.
  usar(local, vehiculo) {
    const cfg = local.cfg;
    if (cfg.accion === 'ninguna') return null;
    if (cfg.precio > 0 && !GameState.canAfford(cfg.precio)) {
      return { texto: `${cfg.nombre}: ${cfg.precio} €. No te llega`, tono: 'danger' };
    }
    return this.usarEnCoche(cfg, vehiculo);
  }

  // el mecanico y el taller de pintura: se usan desde el coche
  usarEnCoche(cfg, vehiculo) {
    if (cfg.accion === 'reparar') {
      if (!vehiculo) return null;
      if (vehiculo.quemado) return { texto: 'Eso ya no tiene arreglo', tono: 'danger' };
      if (vehiculo.hp >= vehiculo.stats.maxHp) {
        return { texto: 'El coche esta como nuevo', tono: 'dim' };
      }
      GameState.spendMoney(cfg.precio, 'mecanico');
      vehiculo.hp = vehiculo.stats.maxHp;
      vehiculo.ardiendo = 0;
      vehiculo.syncSprite();
      Audio.notes([392, 523.25], 0.1);
      return { texto: `Chapa arreglada · ${cfg.precio} €`, tono: 'money' };
    }

    if (cfg.accion === 'pintar') {
      if (!vehiculo) return null;
      GameState.spendMoney(cfg.precio, 'taller');

      // otro color, chapa como nueva
      const paleta = vehiculo.stats.palette.length;
      vehiculo.color = (vehiculo.color + 1 + Math.floor(Math.random() * (paleta - 1))) % paleta;
      if (vehiculo.repintar) vehiculo.repintar(vehiculo.color);
      vehiculo.hp = vehiculo.stats.maxHp;
      vehiculo.ardiendo = 0;

      // Y LO IMPORTANTE: te quita la busca, pero SOLO si no te estan viendo.
      // Entrando con la patrulla pegada al culo no serviria de nada.
      //
      // No se borra en seco: tarda unos segundos (las estrellas parpadean en
      // el HUD mientras tanto) y si cometes otro delito en ese rato se queda
      // como estaba (ver GameState.setWanted). Asi el taller tiene riesgo de
      // verdad y no es un boton magico.
      const veAlguien = this.scene.police && this.scene.police.units.some(
        (u) => u.state === 'persiguiendo' &&
          Phaser.Math.Distance.Between(u.vehicle.x, u.vehicle.y, vehiculo.x, vehiculo.y) < 320
      );
      if (GameState.wanted > 0 && !veAlguien) {
        GameState.iniciarPerdidaBusca(10);
        Audio.notes([392, 330, 262], 0.16, 'triangle', 0.1);
        return { texto: `Otro color · perdiendo la busca... · ${cfg.precio} €`, tono: 'money' };
      }
      Audio.notes([392, 523.25], 0.1);
      return {
        texto: veAlguien
          ? `Pintado, pero te han visto entrar · ${cfg.precio} €`
          : `Pintado y como nuevo · ${cfg.precio} €`,
        tono: veAlguien ? 'danger' : 'money',
      };
    }
    return null;
  }
}

// LO QUE SE COMPRA EN EL MOSTRADOR: curarse, comer, el botiquin, la copa.
// Vivia dentro de LocalSystem.usar, cuando todo pasaba en la acera; ahora
// lo llama tambien LocalScene, desde dentro del local, y asi el precio y lo
// que cura no pueden ir por separado. Devuelve null si la accion no es de
// mostrador (el taller y el mecanico van aparte, en coche).
export function servir(cfg) {
  const deMostrador = ['curar', 'comer', 'tienda', 'beber'];
  if (!deMostrador.includes(cfg.accion)) return null;

  if (cfg.precio > 0 && !GameState.canAfford(cfg.precio)) {
    return { texto: `${cfg.nombre}: ${cfg.precio} €. No te llega`, tono: 'danger' };
  }

  if (cfg.accion === 'curar') {
    // solo salud, como en los demas GTA: el chaleco se compra aparte, en
    // la armeria (o se encuentra por la calle)
    if (GameState.health >= GameState.vidaMaxima) {
      return { texto: 'Estas entero', tono: 'dim' };
    }
    GameState.spendMoney(cfg.precio, 'hospital');
    GameState.heal(GameState.vidaMaxima);
    Audio.notes([392, 523.25, 659.25], 0.1);
    return { texto: `Curado · ${cfg.precio} €`, tono: 'money' };
  }

  if (cfg.accion === 'comer') {
    if (GameState.health >= GameState.vidaMaxima) {
      return { texto: 'No te cabe mas', tono: 'dim' };
    }
    GameState.spendMoney(cfg.precio, 'comida');
    GameState.heal(CURAS.comida);
    // comer engorda: es el contrapeso de curarse barato
    GameState.subirAtributo('grasa', CURAS.comidaEngorda);
    Audio.notes([523.25, 659.25], 0.08);
    return { texto: `+${CURAS.comida} de vida · ${cfg.precio} €`, tono: 'money' };
  }

  if (cfg.accion === 'tienda') {
    if (GameState.health >= GameState.vidaMaxima) {
      return { texto: 'No necesitas nada', tono: 'dim' };
    }
    GameState.spendMoney(cfg.precio, 'tienda');
    GameState.heal(45);
    Audio.notes([523.25, 659.25, 783.99], 0.07);
    return { texto: `Botiquin: +45 de vida · ${cfg.precio} €`, tono: 'money' };
  }

  // beber
  if (GameState.health >= GameState.vidaMaxima) {
    return { texto: 'Estas entero, no te apetece', tono: 'dim' };
  }
  GameState.spendMoney(cfg.precio, 'bar');
  GameState.heal(10);
  Audio.notes([440, 523.25], 0.08);
  return { texto: `Una copa: +10 de vida · ${cfg.precio} €`, tono: 'money' };
}
