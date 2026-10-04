import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { PERSONAJES, COLOR_BANDA, NOMBRE_BANDA, sinTildes } from '../config/personajes.js';
import { texturaRetrato } from '../world/retratos.js';
import { CINEMATICAS } from '../config/cinematicas.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';
const TEXTO = 'Georgia, "Times New Roman", serif';

// LOS PERSONAJES (desde la pausa). Pablo: "dales nombres y personalidad...
// que tengan su nombre, su personalidad y todo bien trabajado".
//
// Un expediente de la gente de Santa Perdida que ya conoces: los que te han
// hablado en alguna cinematica (GameState.flags.conocidos). A la izquierda la
// lista; a la derecha, el elegido: su retrato, nombre de verdad, mote, edad,
// a que se dedica y para quien, su historia, como es y que quiere.
//
// Lo que ESCONDE cada uno (config/personajes.js) no sale aqui: eso lo va
// destapando la historia. Los que todavia no han aparecido en ninguna
// cinematica tampoco salen (ni como hueco): no hay que reventar quien va a
// salir en el Acto 3.
export class PersonajesScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PersonajesScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    Audio.menuOpen();
    this.add.image(0, 0, 'px').setOrigin(0, 0).setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.94);
    this.add.text(w / 2, 46, 'PERSONAJES', {
      fontFamily: FONT, fontSize: '40px', color: '#e8b54a', stroke: '#05060a', strokeThickness: 6,
    }).setOrigin(0.5);

    const conocidos = this.conocidos();
    this.lista = Object.keys(PERSONAJES).filter((id) => conocidos[id]);
    this.add.text(w / 2, 84, `Conoces a ${this.lista.length} · la ciudad tiene mucha más gente que irás conociendo`, {
      fontFamily: TEXTO, fontStyle: 'italic', fontSize: '16px', color: '#a49c8a',
    }).setOrigin(0.5);

    this.add.text(w / 2, h - 30, 'Flechas o clic para elegir  ·  P para ver el prologo otra vez  ·  ESC para volver', {
      fontFamily: FONT, fontSize: '14px', color: '#8a8578',
    }).setOrigin(0.5);

    if (this.lista.length === 0) {
      this.add.text(w / 2, h / 2, 'Todavía no conoces a nadie.\nHabla con quien te ofrezca trabajo.', {
        fontFamily: TEXTO, fontSize: '22px', color: '#e6e1d4', align: 'center', lineSpacing: 8,
      }).setOrigin(0.5);
    } else {
      this.pintarLista();
      this.ficha = this.add.container(0, 0);
      this.elegir(0);
    }

    this.teclas = this.input.keyboard.addKeys({
      arriba: 'UP', abajo: 'DOWN', w: 'W', s: 'S', salir: 'ESC', entrar: 'ENTER', prologo: 'P',
    });
  }

  // A quien conoces: los que te han hablado en una cinematica, y ademas los
  // de las misiones que ya cumpliste y el prologo si ya lo viste. Lo segundo
  // es por las partidas de antes de las cinematicas (4-oct-2026): ahi se
  // hicieron misiones sin dialogo, pero esa gente ya la conoces.
  conocidos() {
    const c = { ...(GameState.flags.conocidos || {}) };
    const apuntar = (planos) => { for (const p of planos || []) if (p.quien) c[p.quien] = true; };
    if (GameState.flags.prologoVisto) apuntar(CINEMATICAS.prologo);
    for (const id of Object.keys(GameState.flags.misiones || {})) apuntar(CINEMATICAS[id]);
    return c;
  }

  // el prologo otra vez (sobre todo para las partidas empezadas antes de que
  // existiera): se cierra la pausa y se ve encima de la ciudad
  verPrologo() {
    const ciudad = this.scene.get('CityScene');
    if (!ciudad || !ciudad.verCinematica) return;
    this.scene.stop('PauseScene');
    this.scene.stop();
    ciudad.verCinematica(CINEMATICAS.prologo);
  }

  // la lista de la izquierda, agrupada por banda (en el orden del reparto)
  pintarLista() {
    this.filas = this.lista.map((id, i) => {
      const p = PERSONAJES[id];
      const y = 130 + i * 40;
      const fondo = this.add.image(170, y, 'px').setDisplaySize(260, 34).setTint(0x12161b)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.elegir(i))
        .on('pointerover', () => { if (this.indice !== i) this.elegir(i); });
      const raya = this.add.image(44, y, 'px').setDisplaySize(5, 30).setTint(COLOR_BANDA[p.banda] || 0x8a8578);
      const mote = this.add.text(58, y - 8, sinTildes(p.alias).toUpperCase(), {
        fontFamily: FONT, fontSize: '16px', color: '#f2efe6', stroke: '#05060a', strokeThickness: 2,
      }).setOrigin(0, 0.5);
      const nombre = this.add.text(58, y + 9, p.nombre, {
        fontFamily: TEXTO, fontStyle: 'italic', fontSize: '12px', color: '#a49c8a',
      }).setOrigin(0, 0.5);
      return { fondo, raya, mote, nombre };
    });
  }

  elegir(i) {
    if (!this.lista.length) return;
    this.indice = (i + this.lista.length) % this.lista.length;
    Audio.menuMove();
    this.filas.forEach((f, k) => f.fondo.setTint(k === this.indice ? 0x2a2418 : 0x12161b));
    this.pintarFicha(this.lista[this.indice]);
  }

  // EL EXPEDIENTE del elegido
  pintarFicha(id) {
    const p = PERSONAJES[id];
    this.ficha.removeAll(true);
    const add = (o) => { this.ficha.add(o); return o; };
    const color = COLOR_BANDA[p.banda] || 0x8a8578;
    const x0 = 340;
    const x1 = this.scale.width - 40;
    add(this.add.image((x0 + x1) / 2, 380, 'px').setDisplaySize(x1 - x0, 560).setTint(0x0d1014).setAlpha(0.96));
    add(this.add.image((x0 + x1) / 2, 103, 'px').setDisplaySize(x1 - x0, 6).setTint(color));

    // el retrato, con el marco del color de su banda
    add(this.add.image(x0 + 130, 245, texturaRetrato(this, id)).setDisplaySize(209, 235));
    add(this.add.rectangle(x0 + 130, 245, 213, 239).setStrokeStyle(3, color));

    const tx = x0 + 270;
    add(this.add.text(tx, 132, sinTildes(p.alias).toUpperCase(), {
      fontFamily: FONT, fontSize: '40px', color: '#f2efe6', stroke: '#05060a', strokeThickness: 5,
    }));
    add(this.add.text(tx, 184, `${p.nombre} · ${p.edad} años`, {
      fontFamily: TEXTO, fontSize: '22px', color: '#e8c860',
    }));
    add(this.add.text(tx, 218, p.oficio, {
      fontFamily: TEXTO, fontStyle: 'italic', fontSize: '18px', color: '#c8c0a8',
    }));
    add(this.add.text(tx, 246, NOMBRE_BANDA[p.banda] || '', {
      fontFamily: FONT, fontSize: '15px', color: '#' + color.toString(16).padStart(6, '0'),
    }));

    // historia, caracter y lo que quiere
    const ancho = x1 - x0 - 50;
    const bloque = (titulo, cuerpo, y) => {
      add(this.add.text(x0 + 25, y, titulo, {
        fontFamily: FONT, fontSize: '15px', color: '#e8b54a', stroke: '#05060a', strokeThickness: 2,
      }));
      const t = add(this.add.text(x0 + 25, y + 22, cuerpo, {
        fontFamily: TEXTO, fontSize: '17px', color: '#e6e1d4', lineSpacing: 4, wordWrap: { width: ancho },
      }));
      return y + 30 + t.height;
    };
    let y = 385;
    y = bloque('DE DONDE VIENE', p.historia, y);
    y = bloque('COMO ES', p.caracter, y + 4);
    bloque('QUE QUIERE', p.quiere, y + 4);
  }

  cerrar() {
    Audio.menuClose();
    this.scene.stop();
    this.scene.resume('PauseScene');
  }

  update() {
    const k = this.teclas;
    if (Phaser.Input.Keyboard.JustDown(k.salir)) { this.cerrar(); return; }
    if (Phaser.Input.Keyboard.JustDown(k.prologo)) { this.verPrologo(); return; }
    if (!this.lista.length) {
      if (Phaser.Input.Keyboard.JustDown(k.entrar)) this.cerrar();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(k.arriba) || Phaser.Input.Keyboard.JustDown(k.w)) this.elegir(this.indice - 1);
    if (Phaser.Input.Keyboard.JustDown(k.abajo) || Phaser.Input.Keyboard.JustDown(k.s)) this.elegir(this.indice + 1);
  }
}
