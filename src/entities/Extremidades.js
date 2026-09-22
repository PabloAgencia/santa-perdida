import { colorDelCuerpo, costadosDelCuerpo, makeExtremidad, aclarar } from '../world/extremidades.js';

// BRAZOS PARA CUALQUIERA: peatones, pandilleros y policias.
//
// El jugador lleva los suyos dentro de un CONTENEDOR (ver Player.js), que es
// lo comodo cuando el cuerpo son cinco piezas. Aqui NO se puede hacer igual:
// los peatones usan `sprite.setTint()` para el fogonazo rojo al recibir un
// tiro, y un contenedor de Phaser no tiene tinte. Convertirlos romperia eso.
//
// Asi que los brazos van sueltos por el mundo y se colocan a mano: se gira el
// hombro con el cuerpo y se suma a la posicion. Mas cuentas, cero cambios en
// como funcionaba el peaton.
//
// LAS TEXTURAS SE COMPARTEN POR TIPO. Veinte peatones del mismo `ped-3` usan
// el mismo brazo: generar uno por peaton seria crear y tirar sesenta texturas
// cada vez que la ciudad repuebla.

// cuanto recorre el brazo adelante y atras, en pixeles
const ANDANDO = 2.2;
const CORRIENDO = 3.4;
const GIRO_ADORNO = 0.12;

export class Extremidades {
  // `base` es el prefijo de las texturas del cuerpo (ped-3, gang-roja,
  // officer, swat). De ahi se saca el color y lo ancho que es.
  constructor(scene, base, { piel = 0xd8b48c, ancho = 12 } = {}) {
    this.scene = scene;
    this.base = base;

    const clave = `brazo-${base}`;
    if (!scene.textures.exists(clave)) {
      const color = colorDelCuerpo(scene, `${base}-0`, 0x6b6257);
      makeExtremidad(scene, clave, {
        color: aclarar(color, 1.28), largo: 8, ancho: 4, piel,
      });
    }

    // los hombros van JUSTO POR FUERA de la silueta: por dentro el brazo
    // queda tapado por el cuerpo y no se ve nada (le paso al jugador)
    const costados = costadosDelCuerpo(scene, `${base}-0`, ancho * 0.6);
    this.hombroX = -2;
    this.arriba = costados.arriba + 0.6;
    this.abajo = costados.abajo + 0.6;

    this.izq = scene.add.image(0, 0, clave).setOrigin(0.2, 0.5);
    this.der = scene.add.image(0, 0, clave).setOrigin(0.2, 0.5);
  }

  // x, y, angle: donde y hacia donde mira el cuerpo
  // swing: -1 a 1, el vaiven del paso
  colocar(x, y, angle, swing, corriendo = false) {
    const d = swing * (corriendo ? CORRIENDO : ANDANDO);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // el hombro esta en coordenadas del cuerpo; hay que girarlo con el
    const poner = (brazo, lx, ly, giro) => {
      brazo.setPosition(x + cos * lx - sin * ly, y + sin * lx + cos * ly);
      brazo.setRotation(angle + giro);
      brazo.setDepth(y + 0.1);
    };
    poner(this.izq, this.hombroX + d, -this.arriba, swing * GIRO_ADORNO);
    poner(this.der, this.hombroX - d, this.abajo, -swing * GIRO_ADORNO);
  }

  setVisible(v) {
    this.izq.setVisible(v);
    this.der.setVisible(v);
  }

  destroy() {
    this.izq.destroy();
    this.der.destroy();
  }
}
