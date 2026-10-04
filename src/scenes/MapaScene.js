import { COLORS } from '../config/balance.js';
import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { FACTIONS } from '../config/factions.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// El mapa entero, el que se abre con M. La ciudad se queda congelada detras.
// Aqui no hay zoom ni scroll: de un vistazo tienes que saber donde estas, por
// donde queda tu casa y donde hay una armeria.
export class MapaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapaScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const city = this.scene.get('CityScene');
    this.city = city;

    // EL MAPA ES UNA PAUSA, como en los GTA. La ciudad se congela detras,
    // asi que su sonido tambien: si no, seguias oyendo tu propio motor y las
    // sirenas mientras miras el mapa, y eso rompe la sensacion de pausa.
    // Al cerrar no hay que hacer nada: CityScene vuelve a llamar a
    // Audio.engine en su update y el motor arranca solo.
    Audio.engine(false, 0, false);
    Audio.skid(0);
    Audio.siren(0);
    Audio.menuOpen();

    // para no encimar las etiquetas unas sobre otras
    this.etiquetas = [];

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.93);

    // el mapa, lo mas grande que quepa dejando sitio al titulo y la leyenda
    const margen = 74;
    const escala = Math.min((w - margen * 2) / city.map.w, (h - margen * 2) / city.map.h);
    this.ancho = city.map.w * escala;
    this.alto = city.map.h * escala;
    this.x0 = (w - this.ancho) / 2;
    this.y0 = (h - this.alto) / 2 + 10;

    this.add.image(this.x0 - 4, this.y0 - 4, 'px').setOrigin(0, 0)
      .setDisplaySize(this.ancho + 8, this.alto + 8).setTint(0x1b1f25);
    this.add.image(this.x0, this.y0, 'minimap').setOrigin(0, 0)
      .setDisplaySize(this.ancho, this.alto);

    this.add.text(w / 2, this.y0 - 46, 'SANTA PERDIDA', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 6,
      fontSize: '40px', color: '#e8b54a',
    }).setOrigin(0.5, 0);

    this.pintarMarcas();

    this.add.text(w / 2, this.y0 + this.alto + 14, 'M o ESC para cerrar', {
      fontFamily: FONT, fontSize: '15px', color: COLORS.dim,
    }).setOrigin(0.5, 0);

    this.teclas = this.input.keyboard.addKeys({ mapa: 'M', salir: 'ESC' });
    this.input.keyboard.addCapture('M,ESC');
  }

  punto(x, y) {
    return {
      x: this.x0 + (x / this.city.map.pixelWidth) * this.ancho,
      y: this.y0 + (y / this.city.map.pixelHeight) * this.alto,
    };
  }

  // Un punto con su nombre al lado, que es lo que hace util un mapa.
  //
  // `icono` es la clave de un dibujo (marca-armeria, marca-casa...). Si esta,
  // manda el dibujo; si no, un cuadradito del color. Igual que en el resto del
  // juego: la imagen es opcional.
  marca(x, y, color, texto, tam = 10, icono = null) {
    const p = this.punto(x, y);

    if (icono && this.textures.exists(icono)) {
      this.add.image(p.x, p.y, icono).setDisplaySize(tam + 8, tam + 8);
    } else {
      this.add.image(p.x, p.y, 'px').setDisplaySize(tam, tam).setTint(color);
    }

    if (texto) this.etiqueta(p.x + tam, p.y - 7, texto);
    return p;
  }

  // Un icono de mapa hecho por codigo: circulo de color, borde oscuro y una
  // letra. Para los sitios que no tienen dibujo propio. Se fabrica una vez y
  // se queda en las texturas del juego; devuelve su clave.
  iconoLetra(clave, color, letra) {
    if (this.textures.exists(clave)) return clave;
    const T = 32;
    const rt = this.make.renderTexture({ width: T, height: T }, false);
    const g = this.make.graphics({}, false);
    g.fillStyle(0x05060a, 1).fillCircle(T / 2, T / 2, T / 2);
    g.fillStyle(color, 1).fillCircle(T / 2, T / 2, T / 2 - 3);
    rt.draw(g);
    const t = this.make.text({
      x: T / 2, y: T / 2 + 1, text: letra,
      style: { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: letra.length > 1 ? '13px' : '17px', color: '#f2efe6', stroke: '#05060a', strokeThickness: 3 },
    }, false).setOrigin(0.5);
    rt.draw(t);
    rt.saveTexture(clave);
    g.destroy();
    t.destroy();
    return clave;
  }

  // EL TEXTO BUSCA HUECO. Antes cada etiqueta se plantaba al lado de su punto
  // sin mirar, y dos sitios cercanos (la grua del puerto y un contacto de
  // trabajo, por ejemplo) salian con los nombres uno encima del otro y no se
  // leia ninguno. Ahora baja hasta encontrar sitio libre, y si no lo hay en
  // cuatro intentos no se escribe: el punto se sigue viendo, que es lo
  // importante.
  etiqueta(x, y, texto) {
    const alto = 15;
    const ancho = texto.length * 7;

    for (let intento = 0; intento < 5; intento++) {
      const py = y + intento * alto;
      const choca = this.etiquetas.some(
        (e) => Math.abs(e.y - py) < alto && x < e.x + e.ancho && e.x < x + ancho
      );
      if (choca) continue;
      this.etiquetas.push({ x, y: py, ancho });
      return this.add.text(x, py, texto, {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
        fontSize: '13px', color: '#d8d3c4',
      });
    }
    return null;
  }

  pintarMarcas() {
    const city = this.city;

    if (city.hideoutDoor) {
      this.marca(city.hideoutDoor.x, city.hideoutDoor.y, 0xe8b54a, 'Tu escondite', 12, 'marca-casa');
    }
    // solo lo que ya has visto: la ciudad se va llenando segun la recorres
    let sinDescubrir = 0;
    for (const t of city.shops ? city.shops.tiendas : []) {
      if (!GameState.conoce(t.clave)) { sinDescubrir++; continue; }
      this.marca(t.x, t.y, 0x7fd08a, 'Armeria', 10, 'marca-armeria');
    }

    // TUS PISOS, que no salian en el mapa: comprabas uno y luego no sabias
    // volver. Los que ya has descubierto salen aunque no los hayas comprado,
    // con el precio, para saber donde esta el siguiente.
    for (const piso of city.pisos ? city.pisos.pisos : []) {
      if (!GameState.conoce(piso.clave)) continue;
      const tuyo = GameState.esDueno(piso.clave);
      this.marca(
        piso.x, piso.y,
        tuyo ? 0xe8b54a : 0x7fa8d0,
        tuyo ? piso.nombre : `${piso.precio} €`,
        tuyo ? 12 : 9,
        tuyo ? 'marca-casa' : 'marca-piso-venta'
      );
    }

    // Todo lo que se monto el 26-sep (locales, negocios, concesionario,
    // desguaces, carreras) existia en la calle pero no aqui: comprabas un
    // negocio y no habia forma de encontrarlo luego. Los que tienen "sitio
    // descubierto" salen cuando los has visto; desguaces y carreras, que no
    // lo tienen, salen siempre (son cuatro de cada, como los landmarks).
    // tienda 24h, mecanico y bar usaban el dibujo de la comida o del taller
    // de pintura, y en el mapa no se distinguian: ahora llevan uno propio,
    // un circulo de su color con su inicial (ver iconoLetra)
    const ICONO_LOCAL = {
      hospital: 'marca-hospital', comisaria: 'marca-comisaria',
      taller: 'marca-taller', comida: 'marca-comida',
      gimnasio: 'marca-gimnasio',
      club: 'marca-club',
      tienda24: this.iconoLetra('marca-tienda24', 0x7fd0e8, '24'),
      mecanico: this.iconoLetra('marca-mecanico', 0xe0a050, 'M'),
      bar: this.iconoLetra('marca-bar', 0xd08a5a, 'B'),
    };
    for (const l of city.locales ? city.locales.locales : []) {
      if (!GameState.conoce(l.clave)) continue;
      this.marca(l.x, l.y, l.cfg.color, l.cfg.nombre, 9, ICONO_LOCAL[l.cfg.clave]);
    }
    for (const n of city.negocios ? city.negocios.negocios : []) {
      if (!GameState.conoce(n.clave)) continue;
      const tuyo = GameState.esDueno(n.clave);
      this.marca(n.x, n.y, tuyo ? 0xe8b54a : 0x8fd694, n.cfg.nombre, tuyo ? 11 : 9, 'marca-negocio');
    }
    const puertaConcesionario = city.concesionario && city.concesionario.puerta;
    if (puertaConcesionario && GameState.conoce('concesionario')) {
      this.marca(puertaConcesionario.x, puertaConcesionario.y, 0x7fa8d0, 'Concesionario', 10, 'marca-concesionario');
    }
    for (const d of city.mercado ? city.mercado.puntos : []) {
      this.marca(d.x, d.y, 0xc87f4a, 'Desguace', 9, 'marca-desguace');
    }
    for (const c of city.carreras ? city.carreras.carreras : []) {
      this.marca(c.x, c.y, 0xe8b54a, 'Carrera', 9, 'marca-carrera');
    }

    // LA GUERRA DE TERRITORIO no salia en el mapa grande, aunque en la calle
    // si tiene su aro y su cartel (GuerraTerritorioSystem.pintar): un sitio
    // donde se puede plantar cara a una banda tiene que verse desde aqui
    // igual que una carrera o un desguace. Siempre visibles, como los
    // landmarks: son parte fija de la ciudad, no algo que se "descubra".
    for (const t of city.guerra ? city.guerra.puntos : []) {
      const f = FACTIONS[t.faction];
      this.marca(t.x, t.y, f ? f.accent : 0xd9584a, `Territorio ${f ? f.short : ''}`, 9);
    }

    // LOS ROBOS (RoboSystem): las furgonetas siempre, como los desguaces; y
    // con el robo en marcha, las casas que quedan y los almacenes
    const robos = city.robos;
    if (robos) {
      const furgo = this.iconoLetra('marca-furgoneta', 0x2a2d33, 'R');
      for (const v of robos.furgonetas) {
        if (city.vehicles.includes(v) && !v.quemado) this.marca(v.x, v.y, 0x2a2d33, 'Furgoneta (de noche)', 9, furgo);
      }
      if (robos.activo) {
        for (const c of robos.activo.casas) if (!c.vacia) this.marca(c.x, c.y, 0xf2d84a, null, 7);
        const alm = this.iconoLetra('marca-almacen', 0xe8b54a, '€');
        for (const a of robos.almacenes) this.marca(a.x, a.y, 0xe8b54a, 'Almacen', 10, alm);
      }
    }

    // LOS SITIOS PRIVADOS de BajoMundoSystem: pedido explicito de Pablo,
    // "que se marque". Siempre visibles, como el resto de sitios fijos de
    // la ciudad.
    for (const s of city.bajoMundo ? city.bajoMundo.sitios : []) {
      this.marca(s.x, s.y, 0xc060a0, 'Sitio privado', 8);
    }

    // los sitios que se ven desde lejos si salen desde el principio: son
    // justo para orientarse
    for (const L of city.map.cfg.landmarks || []) {
      const px = (L.x + L.w / 2) * 32;
      const py = (L.y + L.h / 2) * 32;
      this.marca(px, py, 0xc8a465, L.label, 9);
    }
    // los contactos que dan trabajo, para saber a quien ir a ver
    const contactos = city.missions ? city.missions.puntos() : [];
    for (const c of contactos) {
      this.marca(c.x, c.y, c.color || 0xffffff, 'Trabajo', 10, 'marca-trabajo');
    }

    const destino = city.missions && city.missions.objetivo;
    if (destino) this.marca(destino.x, destino.y, 0xd9584a, 'Adonde vas', 12);

    // y tu, con una flecha que mira hacia donde estabas mirando
    const p = this.punto(city.player.x, city.player.y);
    const ang = city.drivingVehicle ? city.drivingVehicle.angle : city.player.angle;
    this.add.image(p.x, p.y, 'arrow')
      .setDisplaySize(20, 20).setTint(0xf2efe6).setRotation(ang + Math.PI / 2);

    if (sinDescubrir > 0) {
      this.add.text(this.x0 + this.ancho, this.y0 - 22,
        `Te quedan ${sinDescubrir} armerias por encontrar`, {
          fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
          fontSize: '14px', color: '#9aa3ad',
        }).setOrigin(1, 0);
    }

    // el nombre del barrio de verdad (el mismo que sale abajo a la derecha
    // al entrar en el, FactionSystem): el tipo de zona ("Residencial") solo
    // si el mapa no tiene barrios con nombre
    const zona = city.map.zoneAt(city.player.x, city.player.y);
    const distrito = city.map.distritoAt ? city.map.distritoAt(city.player.x, city.player.y) : null;
    const nombre = distrito || (zona ? (city.map.cfg.zones[zona] || {}).label || zona : '');
    this.add.text(this.x0, this.y0 + this.alto + 14, `Estas en ${nombre}`, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '15px', color: COLORS.objective,
    });
    this.add.text(this.x0 + this.ancho, this.y0 + this.alto + 14, `${GameState.money} €`, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '15px', color: COLORS.money,
    }).setOrigin(1, 0);
  }

  cerrar() {
    Audio.menuClose();
    this.scene.stop();
    this.scene.resume('UIScene');
    this.scene.resume('CityScene');
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.teclas.mapa) ||
        Phaser.Input.Keyboard.JustDown(this.teclas.salir)) {
      this.cerrar();
    }
  }
}
