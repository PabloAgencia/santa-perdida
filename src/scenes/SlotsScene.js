import { SaveSystem } from '../core/SaveSystem.js';
import { GameState } from '../core/GameState.js';
import { Cloud } from '../core/Cloud.js';
import { Audio } from '../core/Audio.js';
import { COLORS, SAVE } from '../config/balance.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// Pantalla de partidas: tres ranuras, cada una con lo suyo. Si hay cuenta,
// tambien se ve cual de ellas esta guardada en la nube.
export class SlotsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SlotsScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x07080a);
    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.6);

    this.add.text(w / 2, 62, 'TUS PARTIDAS', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 7,
      fontSize: '54px', color: '#e8b54a',
    }).setOrigin(0.5);

    this.indice = Math.max(0, SaveSystem.ranura - 1);
    this.confirmando = null;
    this.nube = null;
    this.filas = [];

    for (let i = 0; i < SAVE.ranuras; i++) {
      const y = 190 + i * 106;
      const marco = this.add.image(w / 2, y, 'px')
        .setDisplaySize(620, 92).setTint(0x12161b).setAlpha(0.95);
      const numero = this.add.text(w / 2 - 272, y, `${i + 1}`, {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 4,
        fontSize: '40px', color: '#8a8578',
      }).setOrigin(0.5);
      const titulo = this.add.text(w / 2 - 218, y - 22, '', {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
        fontSize: '24px', color: COLORS.ink,
      }).setOrigin(0, 0);
      const detalle = this.add.text(w / 2 - 218, y + 12, '', {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 2,
        fontSize: '15px', color: COLORS.dim,
      }).setOrigin(0, 0);
      const enLaNube = this.add.text(w / 2 + 268, y, '', {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 2,
        fontSize: '13px', color: '#6f9ad9',
      }).setOrigin(1, 0.5);

      marco.setInteractive({ useHandCursor: true })
        .on('pointerover', () => { this.indice = i; this.pintar(); })
        .on('pointerdown', () => this.jugar());

      this.filas.push({ marco, numero, titulo, detalle, enLaNube });
    }

    this.ayuda = this.add.text(w / 2, h - 56, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2,
      fontSize: '15px', color: COLORS.dim,
    }).setOrigin(0.5);

    this.aviso = this.add.text(w / 2, h - 28, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2,
      fontSize: '14px', color: COLORS.ink,
    }).setOrigin(0.5);

    this.teclas = this.input.keyboard.addKeys({
      arriba: 'UP', abajo: 'DOWN', w: 'W', s: 'S',
      entrar: 'ENTER', espacio: 'SPACE', volver: 'ESC',
      nueva: 'N', borrar: 'B', traer: 'T',
    });
    this.input.keyboard.addCapture('UP,DOWN,W,S,ENTER,SPACE,ESC,N,B,T');

    this.pintar();
    this.mirarLaNube();
  }

  // ---------- pintar ----------

  cuandoFue(ms) {
    if (!ms) return '';
    const min = Math.floor((Date.now() - ms) / 60000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    return dias === 1 ? 'ayer' : `hace ${dias} dias`;
  }

  pintar() {
    for (let i = 0; i < SAVE.ranuras; i++) {
      const f = this.filas[i];
      const r = SaveSystem.resumen(i + 1);
      const elegida = i === this.indice;

      f.marco.setTint(elegida ? 0x1d242c : 0x12161b);
      f.marco.setAlpha(elegida ? 1 : 0.9);
      f.numero.setColor(elegida ? '#e8b54a' : '#8a8578');

      if (r) {
        f.titulo.setText(`${r.dinero.toLocaleString('es-ES')} €`);
        f.titulo.setColor(elegida ? '#e8b54a' : COLORS.ink);
        const partes = [`${r.misiones} misiones`, `${r.entregas} entregas`];
        const cuando = this.cuandoFue(r.fecha);
        if (cuando) partes.push(cuando);
        f.detalle.setText(partes.join('  ·  '));
      } else {
        f.titulo.setText('RANURA VACIA');
        f.titulo.setColor(elegida ? '#e8b54a' : '#5f5a50');
        f.detalle.setText('Aqui puedes empezar una partida nueva');
      }

      const enNube = this.nube && this.nube[i + 1];
      f.enLaNube.setText(enNube ? 'EN TU CUENTA' : '');
    }

    const hay = SaveSystem.hasSave(this.indice + 1);
    const enNube = this.nube && this.nube[this.indice + 1];
    const opciones = [hay ? 'ENTER seguir' : 'ENTER empezar aqui'];
    if (hay) opciones.push('N empezar de cero aqui', 'B borrar');
    if (enNube) opciones.push('T traer de tu cuenta');
    opciones.push('ESC volver');
    this.ayuda.setText(opciones.join('  ·  '));
  }

  async mirarLaNube() {
    if (!Cloud.conectado) return;
    this.aviso.setColor(COLORS.dim);
    this.aviso.setText('Mirando que tienes en tu cuenta...');
    try {
      this.nube = await Cloud.bajarTodas();
      this.aviso.setText('');
      this.pintar();
    } catch {
      this.aviso.setColor(COLORS.danger);
      this.aviso.setText('No se ha podido hablar con tu cuenta. Se juega igual.');
    }
  }

  decir(texto, color = COLORS.ink) {
    this.aviso.setColor(color);
    this.aviso.setText(texto);
  }

  mover(paso) {
    this.indice = (this.indice + paso + SAVE.ranuras) % SAVE.ranuras;
    this.confirmando = null;
    this.decir('');
    this.pintar();
    Audio.menuMove();
  }

  // ---------- acciones ----------

  jugar() {
    const n = this.indice + 1;
    Audio.menuSelect();
    SaveSystem.usarRanura(n);

    if (SaveSystem.hasSave(n)) {
      SaveSystem.load(n);
    } else {
      GameState.reset();
      SaveSystem.clear(n);
    }
    this.arrancar();
  }

  // empezar de cero en una ranura que ya tenia partida
  nuevaAqui() {
    const n = this.indice + 1;
    if (!SaveSystem.hasSave(n)) return this.jugar();

    if (this.confirmando !== `nueva${n}`) {
      this.confirmando = `nueva${n}`;
      this.decir(`Vuelve a pulsar N: se borra la partida ${n} y empiezas de cero`, COLORS.danger);
      return;
    }
    SaveSystem.clear(n);
    GameState.reset();
    SaveSystem.usarRanura(n);
    if (Cloud.conectado) Cloud.borrarRanura(n).catch(() => {});
    this.arrancar();
  }

  borrar() {
    const n = this.indice + 1;
    if (!SaveSystem.hasSave(n)) return;

    if (this.confirmando !== `borrar${n}`) {
      this.confirmando = `borrar${n}`;
      this.decir(`Vuelve a pulsar B para borrar la partida ${n}`, COLORS.danger);
      return;
    }
    SaveSystem.clear(n);
    if (Cloud.conectado) {
      Cloud.borrarRanura(n).catch(() => {});
      if (this.nube) delete this.nube[n];
    }
    this.confirmando = null;
    this.decir(`Partida ${n} borrada`, COLORS.dim);
    this.pintar();
  }

  traerDeLaNube() {
    const n = this.indice + 1;
    const enNube = this.nube && this.nube[n];
    if (!enNube) return;

    if (SaveSystem.hasSave(n) && this.confirmando !== `traer${n}`) {
      this.confirmando = `traer${n}`;
      this.decir(`Vuelve a pulsar T: la partida ${n} de aqui se pierde`, COLORS.danger);
      return;
    }
    SaveSystem.guardarCrudo(n, enNube.estado);
    this.confirmando = null;
    this.decir(`Partida ${n} traida de tu cuenta`, COLORS.money);
    this.pintar();
  }

  arrancar() {
    this.cameras.main.fadeOut(360, 0, 0, 0);
    this.time.delayedCall(380, () => {
      this.scene.start('CityScene');
    });
  }

  update() {
    const k = this.teclas;
    if (Phaser.Input.Keyboard.JustDown(k.arriba) || Phaser.Input.Keyboard.JustDown(k.w)) this.mover(-1);
    if (Phaser.Input.Keyboard.JustDown(k.abajo) || Phaser.Input.Keyboard.JustDown(k.s)) this.mover(1);
    if (Phaser.Input.Keyboard.JustDown(k.entrar) || Phaser.Input.Keyboard.JustDown(k.espacio)) this.jugar();
    if (Phaser.Input.Keyboard.JustDown(k.nueva)) this.nuevaAqui();
    if (Phaser.Input.Keyboard.JustDown(k.borrar)) this.borrar();
    if (Phaser.Input.Keyboard.JustDown(k.traer)) this.traerDeLaNube();
    if (Phaser.Input.Keyboard.JustDown(k.volver)) {
      Audio.menuBack();
      this.scene.start('MenuScene');
    }
  }
}
