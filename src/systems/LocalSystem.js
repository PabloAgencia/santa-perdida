import { LOCALES, CURAS } from '../config/locales.js';
import { VEHICLES } from '../config/vehicles.js';
import { Vehicle } from '../entities/Vehicle.js';
import { repartirPorBarrios } from '../world/puertas.js';
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
        cuantos: cfg.cuantos,
        separacion: cfg.separacion,
        ocupados: this.scene.edificiosOcupados,
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
    const aro = this.scene.add.image(local.x, local.y, 'ring')
      .setDisplaySize(58, 58).setTint(local.cfg.color).setDepth(6);
    this.scene.tweens.add({
      targets: aro, scale: { from: 0.85, to: 1.1 },
      duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.scene.add.text(local.x, local.y - 32, local.cfg.corto, {
      fontFamily: 'Pricedown, Anton, Impact, sans-serif',
      fontSize: '12px',
      color: '#' + local.cfg.color.toString(16).padStart(6, '0'),
      stroke: '#05060a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);
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

  // Devuelve un texto para el aviso, o null si no ha pasado nada.
  usar(local, vehiculo) {
    const cfg = local.cfg;
    if (cfg.accion === 'ninguna') return null;

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
      const veAlguien = this.scene.police && this.scene.police.units.some(
        (u) => u.state === 'persiguiendo' &&
          Phaser.Math.Distance.Between(u.vehicle.x, u.vehicle.y, vehiculo.x, vehiculo.y) < 320
      );
      if (GameState.wanted > 0 && !veAlguien) {
        GameState.setWanted(0);
        Audio.notes([392, 330, 262], 0.16, 'triangle', 0.1);
        return { texto: `Otro color y sin busca · ${cfg.precio} €`, tono: 'money' };
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
