import { GameState } from '../core/GameState.js';
import { Audio } from '../core/Audio.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { COLORS, GIMNASIO } from '../config/balance.js';
import {
  ARMAS, ORDEN_ARMAS, COMBATE, HABILIDAD,
  factorDispersion, factorCadencia, nivelHabilidad,
} from '../config/weapons.js';

const FONT = 'Pricedown, Anton, Impact, sans-serif';

// EL CAMPO DE TIRO de la armeria (IDEAS-3, punto 2). Se llega desde el
// mostrador, se paga la ronda y se dispara a dianas que salen y se esconden.
//
//   - Las balas son gratis: el campo las pone.
//   - Se dispara hacia donde apunta el raton, con la dispersion REAL del arma
//     (la de weapons.js, la punteria del personaje y la habilidad con esa arma).
//   - Cada acierto sube la habilidad de ESA arma, con un tope por arma y dia,
//     como el gimnasio, para que no se entrene sentado durante horas.
//   - Las medallas dan premio SOLO la primera vez con cada arma.
export const TIRO = {
  precio: 40,
  duracion: 30,
  habilidadPorPunto: 0.12,    // por punto de diana, subiendo la habilidad del arma
  topeHabilidadDia: 5,        // por arma y dia
  punteriaPorAcierto: 0.05,   // la punteria general, con el tope del gimnasio
  // fraccion de los puntos posibles (3 por diana que ha salido)
  medallas: [
    { clave: 'bronce', nombre: 'BRONCE', fraccion: 0.30, premio: 60, color: '#c98a52' },
    { clave: 'plata', nombre: 'PLATA', fraccion: 0.55, premio: 140, color: '#c9ced6' },
    { clave: 'oro', nombre: 'ORO', fraccion: 0.80, premio: 300, color: '#f2c94c' },
  ],
  pxPorGrado: 4,              // cuanto desvio en la diana es un grado de dispersion
};

// armas de fuego que llevas, de menos a mas
export function armasDeTiro() {
  return ORDEN_ARMAS.filter((c) => !ARMAS[c].cuerpo && GameState.tieneArma(c));
}

export class TiroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TiroScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.sala = { x: w / 2 - 330, y: h / 2 - 250, w: 660, h: 500 };
    const s = this.sala;
    Audio.menuOpen();

    const caja = (x, y, an, al, color, alpha = 1) =>
      this.add.image(x, y, 'px').setOrigin(0, 0).setDisplaySize(an, al).setTint(color).setAlpha(alpha);

    caja(0, 0, w, h, 0x05060a);
    caja(s.x - 6, s.y - 6, s.w + 12, s.h + 12, 0x14161a);
    caja(s.x, s.y, s.w, s.h, 0x24272d);
    // el fondo con su pared de tope y las lineas de los carriles
    caja(s.x, s.y, s.w, 70, 0x1a1c20);
    for (let i = 1; i < 5; i++) caja(s.x + (s.w / 5) * i, s.y + 70, 2, s.h - 130, 0x1d2025, 0.8);
    // la barra de tiro, donde se apoya el tirador
    caja(s.x, s.y + s.h - 60, s.w, 60, 0x3a2f24);
    caja(s.x, s.y + s.h - 60, s.w, 5, 0x6b563c);

    this.add.text(s.x + s.w / 2, s.y + 14, 'CAMPO DE TIRO EL CERROJO', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4, fontSize: '24px', color: '#7fd08a',
    }).setOrigin(0.5, 0);

    this.armas = armasDeTiro();
    this.indice = Math.max(0, this.armas.indexOf(GameState.armaActual));
    this.estado = 'elegir';
    this.dianas = [];
    this.agujeros = [];

    this.textoArma = this.add.text(s.x + s.w / 2, s.y + 130, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4, fontSize: '34px', color: COLORS.ink,
    }).setOrigin(0.5).setDepth(5);
    this.textoNivel = this.add.text(s.x + s.w / 2, s.y + 172, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '18px', color: COLORS.objective,
    }).setOrigin(0.5).setDepth(5);
    this.barraFondo = caja(s.x + s.w / 2 - 110, s.y + 198, 220, 8, 0x2a2f38).setDepth(5);
    this.barra = caja(s.x + s.w / 2 - 110, s.y + 198, 1, 8, 0x8fd694).setDepth(5);
    this.textoAyuda = this.add.text(s.x + s.w / 2, s.y + 232, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '16px',
      color: COLORS.dim, align: 'center', wordWrap: { width: 520 },
    }).setOrigin(0.5, 0).setDepth(5);

    this.hud = this.add.text(s.x + 16, s.y + s.h - 44, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '22px', color: COLORS.ink,
    }).setDepth(5);
    this.pie = this.add.text(s.x + s.w / 2, s.y + s.h + 14, '', {
      fontFamily: FONT, fontSize: '15px', color: COLORS.dim,
    }).setOrigin(0.5, 0);

    // la mira: el raton de verdad se esconde mientras estas aqui
    this.mira = this.add.graphics().setDepth(100);
    this.input.setDefaultCursor('none');
    this.events.once('shutdown', () => this.input.setDefaultCursor('default'));

    this.teclas = this.input.keyboard.addKeys({
      izq: 'LEFT', der: 'RIGHT', a: 'A', d: 'D', entrar: 'ENTER', espacio: 'SPACE', salir: 'ESC',
    });
    this.input.keyboard.addCapture('LEFT,RIGHT,A,D,ENTER,SPACE,ESC');

    this.espera = 0;
    this.pintarEleccion();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ---------- elegir arma ----------

  pintarEleccion() {
    const clave = this.armas[this.indice];
    const arma = ARMAS[clave];
    const hab = GameState.habilidad(clave);
    const nivel = nivelHabilidad(hab);
    this.textoArma.setText(`<  ${arma.nombre}  >`);
    this.textoNivel.setText(`${HABILIDAD.nombres[nivel]}  ·  ${Math.floor(hab)}/100`);
    this.barra.setDisplaySize(Math.max(1, 220 * (hab / 100)), 8);
    const hoy = this.habilidadHoy(clave);
    const medalla = this.medallaDe(clave);
    const lineas = [
      `Ronda de ${TIRO.duracion} segundos · ${TIRO.precio} € · balas del campo`,
      medalla
        ? `Mejor medalla con esta arma: ${medalla.nombre}`
        : `Sin medalla con esta arma todavia. Bronce da ${TIRO.medallas[0].premio} €, oro ${TIRO.medallas[2].premio} €`,
      hoy >= TIRO.topeHabilidadDia
        ? 'Hoy ya has entrenado bastante esta arma: puedes tirar, pero no sube'
        : 'Clic para disparar. Cuanto mas al centro de la diana, mas puntos',
    ];
    this.textoAyuda.setText(lineas.join('\n'));
    this.pie.setText('IZQUIERDA/DERECHA cambiar de arma  ·  ENTER empezar  ·  ESC salir');
    this.hud.setText(`Llevas ${GameState.money} €`);
  }

  habilidadHoy(clave) {
    const t = this.estadoTiro();
    return t.hoy[clave] || 0;
  }

  // lo que se recuerda del campo de tiro, dentro de la partida guardada
  estadoTiro() {
    const f = GameState.flags;
    if (!f.tiro) f.tiro = { dia: GameState.dia, hoy: {}, medallas: {} };
    if (f.tiro.dia !== GameState.dia) { f.tiro.dia = GameState.dia; f.tiro.hoy = {}; }
    return f.tiro;
  }

  medallaDe(clave) {
    const m = this.estadoTiro().medallas[clave];
    return TIRO.medallas.find((x) => x.clave === m) || null;
  }

  // ---------- la ronda ----------

  empezar() {
    if (!GameState.spendMoney(TIRO.precio, 'tiro')) {
      Audio.menuBack();
      this.textoAyuda.setText('No te llega para la ronda.');
      return;
    }
    Audio.menuSelect();
    this.clave = this.armas[this.indice];
    this.arma = ARMAS[this.clave];
    this.estado = 'jugando';
    this.restante = TIRO.duracion;
    this.puntos = 0;
    this.disparos = 0;
    this.aciertos = 0;
    this.salidas = 0;
    this.espera = 0.3;
    // una diana nueva cada tanto: las armas lentas tienen mas calma
    this.intervalo = Phaser.Math.Clamp(this.arma.cadencia * 1.15, 0.7, 2.2);
    this.vidaDiana = Math.max(1.4, this.intervalo * 1.3);
    this.proxima = 0.4;
    this.ganadoHabilidad = 0;
    this.nivelInicial = nivelHabilidad(GameState.habilidad(this.clave));
    this.textoArma.setVisible(false);
    this.textoNivel.setVisible(false);
    this.barra.setVisible(false);
    this.barraFondo.setVisible(false);
    this.textoAyuda.setText('');
    this.pie.setText('');
  }

  nuevaDiana() {
    const s = this.sala;
    const filas = [
      { y: s.y + 110, r: 22 },    // lejos: chica
      { y: s.y + 200, r: 30 },
      { y: s.y + 300, r: 40 },    // cerca: grande
    ];
    // un sitio libre: columna y fila al azar que no tengan ya una diana
    for (let intento = 0; intento < 12; intento++) {
      const col = Phaser.Math.Between(0, 4);
      const fila = Phaser.Math.Between(0, 2);
      const x = s.x + (s.w / 5) * (col + 0.5);
      const f = filas[fila];
      if (this.dianas.some((d) => Math.abs(d.x - x) < 8 && Math.abs(d.y - f.y) < 8)) continue;
      this.salidas++;
      const g = this.add.container(x, f.y).setDepth(10);
      const anillos = [
        [1, 0xe6e1d4], [0.66, 0xd9584a], [0.33, 0xe6e1d4],
      ];
      for (const [k, color] of anillos) g.add(this.add.circle(0, 0, f.r * k, color).setStrokeStyle(1, 0x05060a));
      g.add(this.add.circle(0, 0, 2, 0x05060a));
      g.setScale(0);
      this.tweens.add({ targets: g, scale: 1, duration: 140, ease: 'Back.out' });
      this.dianas.push({ x, y: f.y, r: f.r, viva: this.vidaDiana, g, tocada: false });
      return;
    }
  }

  quitarDiana(d) {
    this.tweens.add({
      targets: d.g, scale: 0, alpha: 0, duration: 120,
      onComplete: () => d.g.destroy(),
    });
    this.dianas = this.dianas.filter((x) => x !== d);
  }

  // un disparo hacia el raton: el desvio sale de la dispersion REAL del arma
  disparar(px, py) {
    const a = this.arma;
    const punteria = GameState.atributo('punteria') / 100;
    const hab = GameState.habilidad(this.clave);
    const grados = a.dispersion * (1 - punteria * COMBATE.mejoraPorPunteria) * factorDispersion(hab);
    const radio = grados * TIRO.pxPorGrado;
    const balas = a.balasPorDisparo || 1;

    this.disparos++;
    this.espera = a.cadencia * factorCadencia(hab);
    if (!Audio.soltar(a.sonido, 0.55)) Audio.crash(0.3);
    this.cameras.main.shake(70, 0.0016);

    let mejor = null;        // la mejor bala del disparo (la escopeta suelta cinco)
    let mejorPuntos = 0;
    for (let i = 0; i < balas; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radio;
      const x = px + Math.cos(ang) * dist;
      const y = py + Math.sin(ang) * dist;
      this.marcarAgujero(x, y);
      for (const d of this.dianas) {
        if (d.tocada) continue;
        const dd = Math.hypot(x - d.x, y - d.y);
        if (dd > d.r) continue;
        const pts = dd < d.r * 0.33 ? 3 : dd < d.r * 0.66 ? 2 : 1;
        if (pts > mejorPuntos) { mejorPuntos = pts; mejor = d; }
      }
    }
    if (!mejor) return;

    mejor.tocada = true;
    this.puntos += mejorPuntos;
    this.aciertos++;
    this.flotante(mejor.x, mejor.y - mejor.r - 6, `+${mejorPuntos}`,
      mejorPuntos === 3 ? '#f2c94c' : COLORS.ink);
    this.subirHabilidad(mejorPuntos);
    this.quitarDiana(mejor);
  }

  subirHabilidad(puntos) {
    const hoy = this.estadoTiro();
    const queda = TIRO.topeHabilidadDia - (hoy.hoy[this.clave] || 0);
    if (queda <= 0) return;
    const cant = Math.min(queda, puntos * TIRO.habilidadPorPunto);
    GameState.subirHabilidad(this.clave, cant);
    hoy.hoy[this.clave] = (hoy.hoy[this.clave] || 0) + cant;
    this.ganadoHabilidad += cant;
    GameState.entrenar('punteria', TIRO.punteriaPorAcierto, GIMNASIO.tope.punteria);
  }

  marcarAgujero(x, y) {
    const p = this.add.circle(x, y, 1.6, 0x05060a, 0.9).setDepth(11);
    this.agujeros.push(p);
    this.tweens.add({ targets: p, alpha: 0, delay: 900, duration: 400, onComplete: () => p.destroy() });
  }

  flotante(x, y, texto, color) {
    const t = this.add.text(x, y, texto, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4, fontSize: '22px', color,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }

  terminar() {
    this.estado = 'fin';
    for (const d of [...this.dianas]) this.quitarDiana(d);

    const posibles = Math.max(1, this.salidas * 3);
    const fraccion = this.puntos / posibles;
    let medalla = null;
    for (const m of TIRO.medallas) if (fraccion >= m.fraccion) medalla = m;

    // premio solo la primera vez con esta arma, y solo si mejora la medalla
    const t = this.estadoTiro();
    const previa = TIRO.medallas.findIndex((m) => m.clave === t.medallas[this.clave]);
    const nueva = medalla ? TIRO.medallas.indexOf(medalla) : -1;
    let premio = 0;
    if (nueva > previa) {
      for (let i = previa + 1; i <= nueva; i++) premio += TIRO.medallas[i].premio;
      t.medallas[this.clave] = medalla.clave;
      GameState.addMoney(premio, 'tiro');
    }

    const lineas = [
      `${this.puntos} puntos  ·  ${this.aciertos} dianas de ${this.salidas}  ·  ${this.disparos} disparos`,
      medalla ? `MEDALLA DE ${medalla.nombre}` : 'Sin medalla esta vez',
      premio > 0 ? `Premio por primera vez: +${premio} €` : null,
      this.ganadoHabilidad > 0.005
        ? `${this.arma.nombre}: habilidad +${this.ganadoHabilidad.toFixed(1)}`
        : 'Hoy esta arma ya no sube mas',
    ].filter(Boolean);
    this.textoArma.setVisible(true).setText('RONDA TERMINADA');
    this.textoNivel.setVisible(true).setText(lineas[1]).setColor(medalla ? medalla.color : COLORS.dim);
    this.textoAyuda.setText([lineas[0], ...lineas.slice(2)].join('\n'));

    const nivel = nivelHabilidad(GameState.habilidad(this.clave));
    if (nivel > this.nivelInicial) {
      EventBus.emit(EVT.NOTIFY, {
        text: `${this.arma.nombre}: ya eres ${HABILIDAD.nombres[nivel]}. Dispara mas junto y mas rapido`,
        tone: 'money',
      });
    }
    this.pie.setText('ENTER otra ronda  ·  ESC volver al mostrador');
    this.hud.setText(`Llevas ${GameState.money} €`);
  }

  // ---------- bucle ----------

  update(_t, delta) {
    const dt = delta / 1000;
    const k = this.teclas;
    const p = this.input.activePointer;

    // la mira sigue al raton
    this.mira.clear().lineStyle(2, 0x7fd08a, 1);
    this.mira.strokeCircle(p.x, p.y, 9);
    this.mira.lineBetween(p.x - 15, p.y, p.x - 4, p.y);
    this.mira.lineBetween(p.x + 4, p.y, p.x + 15, p.y);
    this.mira.lineBetween(p.x, p.y - 15, p.x, p.y - 4);
    this.mira.lineBetween(p.x, p.y + 4, p.x, p.y + 15);

    if (Phaser.Input.Keyboard.JustDown(k.salir)) return this.salir();

    if (this.estado === 'elegir') {
      const mov = (Phaser.Input.Keyboard.JustDown(k.der) || Phaser.Input.Keyboard.JustDown(k.d) ? 1 : 0)
        - (Phaser.Input.Keyboard.JustDown(k.izq) || Phaser.Input.Keyboard.JustDown(k.a) ? 1 : 0);
      if (mov && this.armas.length > 1) {
        this.indice = (this.indice + mov + this.armas.length) % this.armas.length;
        Audio.menuMove();
        this.pintarEleccion();
      }
      if (Phaser.Input.Keyboard.JustDown(k.entrar) || Phaser.Input.Keyboard.JustDown(k.espacio)) this.empezar();
      return;
    }

    if (this.estado === 'fin') {
      if (Phaser.Input.Keyboard.JustDown(k.entrar) || Phaser.Input.Keyboard.JustDown(k.espacio)) {
        this.estado = 'elegir';
        this.textoArma.setVisible(true);
        this.textoNivel.setVisible(true).setColor(COLORS.objective);
        this.barra.setVisible(true);
        this.barraFondo.setVisible(true);
        this.pintarEleccion();
      }
      return;
    }

    // jugando
    this.restante -= dt;
    this.espera -= dt;
    this.proxima -= dt;
    if (this.proxima <= 0) {
      this.nuevaDiana();
      this.proxima = this.intervalo;
    }
    for (const d of [...this.dianas]) {
      d.viva -= dt;
      if (d.viva <= 0) this.quitarDiana(d);
    }
    if (p.isDown && this.espera <= 0) this.disparar(p.x, p.y);

    this.hud.setText(`${this.puntos} pts   ${Math.max(0, Math.ceil(this.restante))} s   ${this.arma.nombre}`);
    if (this.restante <= 0) this.terminar();
  }

  salir() {
    Audio.menuClose();
    this.scene.stop();
    this.scene.wake('ShopScene');
  }
}
