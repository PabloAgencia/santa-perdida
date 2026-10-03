// LA CIUDAD GRANDE descrita como datos (PLAN-MAPA-GRANDE.txt).
// world/GeneradorCiudad.js convierte esto en calles, manzanas y edificios.
// Todo en casillas de 32 px.

import { CITY } from './city.js';

export const CIUDAD_GRANDE = {
  width: 640,
  height: 512,
  seed: 20261003,

  // el mar: costa sur y costa este, con su ruido para que no sean rectas
  costa: { sur: 478, este: 610, amplitud: 20, arena: 5 },
  // la bahia del puerto, un mordisco de mar en la costa sur
  bahia: { x: 365, ancho: 62, fondo: 42 },
  // el monte: una sierra al norte y una loma al oeste
  sierra: { alto: 60, amplitud: 26, oeste: 18 },
  // el rio baja de la sierra hasta el mar y parte la ciudad en dos
  rio: {
    ancho: 8,
    puntos: [[300, -6], [292, 50], [262, 112], [280, 182], [242, 250], [262, 330], [246, 400], [255, 470], [252, 520]],
  },

  // tu escondite: la casa mas cerca de este punto de ese barrio
  escondite: { distrito: 'Lomas del Norte', x: 120, y: 150 },

  // ancho de la calzada por tipo de calle (casillas)
  anchos: { calle: 5, arteria: 5, autovia: 6, carretera: 5 },

  zones: {
    ...CITY.zones,
    casco: {
      label: 'Casco Viejo',
      palette: [0x5a4a3c, 0x634f3e, 0x4e4034, 0x6b5844, 0x584536, 0x725c46],
      minSize: 3, maxSize: 4,
    },
    afueras: {
      label: 'Afueras',
      palette: [0x55503f, 0x5e5845, 0x4c4738],
      minSize: 3, maxSize: 5,
    },
  },

  // LOS BARRIOS. Cada casilla es del barrio con el centro mas cercano (con
  // algo de ruido en la frontera). `lado` ata el barrio a una orilla del rio
  // (-1 oeste, 1 este). `trazado` es como se tiran sus calles:
  //   angulo      giro de la rejilla, en grados
  //   sepA, sepB  separacion entre calles en cada sentido (casillas)
  //   curva       cuanto se tuercen las calles (casillas de desvio)
  //   ondulacion  lo seguido que se tuercen (mas = curvas mas cerradas)
  //   irregular   cuanto varia la separacion de una calle a la siguiente
  //   quitar      probabilidad de quitar un tramo (calles sin salida)
  //   rural       sin aceras ni edificios: carretera de campo
  //   patio       probabilidad de edificio en el interior de la manzana
  distritos: [
    { nombre: 'Lomas del Norte', zona: 'residencial', x: 140, y: 125, lado: -1,
      trazado: { angulo: 8, sepA: 25, sepB: 20, curva: 3.5, ondulacion: 0.04, irregular: 0.2, quitar: 0.14 }, patio: 0.15 },
    { nombre: 'Los Pinares', zona: 'residencial', x: 115, y: 250, lado: -1,
      trazado: { angulo: -12, sepA: 24, sepB: 19, curva: 3, ondulacion: 0.045, irregular: 0.2, quitar: 0.12 }, patio: 0.15 },
    { nombre: 'Gran Via Oeste', zona: 'comercial', x: 140, y: 395, lado: -1,
      trazado: { angulo: 4, sepA: 34, sepB: 26, irregular: 0.2 }, patio: 0.6 },
    { nombre: 'Campos de Poniente', zona: 'afueras', x: 45, y: 160, lado: -1, rural: true, peso: 0.8,
      trazado: { angulo: 0, sepA: 60, sepB: 55, curva: 10, ondulacion: 0.04, quitar: 0.3 } },

    { nombre: 'Casco Viejo', zona: 'casco', x: 315, y: 272, lado: 1, peso: 0.9,
      trazado: { angulo: 17, sepA: 20, sepB: 16, curva: 3.5, ondulacion: 0.12, irregular: 0.6, quitar: 0.15 }, patio: 0.85 },
    { nombre: 'Centro', zona: 'centro', x: 415, y: 225, lado: 1, peso: 1.2,
      trazado: { angulo: 0, sepA: 21, sepB: 17, irregular: 0.1 }, patio: 0.95 },
    { nombre: 'Los Rompientes', zona: 'conflictivo', x: 525, y: 140, lado: 1,
      trazado: { angulo: 24, sepA: 20, sepB: 16, curva: 2, ondulacion: 0.08, irregular: 0.35, quitar: 0.06 }, patio: 0.4 },
    { nombre: 'Poligono Sur', zona: 'industrial', x: 525, y: 365, lado: 1,
      trazado: { angulo: -5, sepA: 44, sepB: 32, irregular: 0.15 }, patio: 0.8 },
    { nombre: 'El Puerto', zona: 'puerto', x: 375, y: 430, lado: 1, peso: 0.7,
      trazado: { angulo: 0, sepA: 34, sepB: 18, irregular: 0.2 }, patio: 0.8 },
    { nombre: 'Altos de la Sierra', zona: 'afueras', x: 420, y: 82, lado: 1, rural: true, peso: 0.8,
      trazado: { angulo: 0, sepA: 55, sepB: 45, curva: 8, ondulacion: 0.04, quitar: 0.3 } },
  ],

  // LAS GRANDES: se trazan antes que los barrios y son las unicas que
  // cruzan el rio (puentes) y el monte. `recta` = sin suavizar.
  arterias: [
    // la autovia de circunvalacion, cerrada, rodeando la ciudad
    { tipo: 'autovia', cerrada: true, puntos: [
      [45, 102], [150, 84], [300, 80], [450, 82], [575, 98], [600, 200], [596, 330],
      [578, 428], [470, 422], [365, 405], [250, 432], [150, 452], [42, 440], [30, 300],
    ] },
    // la avenida en diagonal: casco viejo, centro y Los Rompientes
    { tipo: 'arteria', recta: true, puntos: [[300, 342], [380, 280], [460, 212], [562, 120]] },
    // la costera, siguiendo la orilla del mar
    { tipo: 'arteria', costera: true, desde: 30, hasta: 600, margen: 10 },
    // la carretera del monte, haciendo eses por la sierra
    { tipo: 'carretera', puntos: [
      [210, 84], [228, 58], [205, 38], [240, 20], [300, 30], [360, 18], [420, 32],
      [470, 22], [520, 42], [545, 80],
    ] },
    // el paseo del rio, por la orilla este
    { tipo: 'arteria', puntos: [[293, 112], [294, 182], [256, 250], [276, 330], [262, 405]] },
    // la gran avenida de oeste a este, con su puente
    { tipo: 'arteria', puntos: [[32, 300], [150, 312], [245, 300], [350, 312], [450, 300], [598, 290]] },
    // la avenida norte-sur de la orilla oeste
    { tipo: 'arteria', puntos: [[132, 84], [142, 200], [122, 300], [136, 450]] },
  ],

  // LOS SITIOS ESPECIALES: barrio y tamaño, y el generador les busca hueco
  // (ver GeneradorCiudad.reservarLandmarks). `costa` = pegado al agua.
  landmarks: [
    { type: 'plaza', label: 'Plaza del Farol', distrito: 'Casco Viejo', w: 15, h: 9 },
    { type: 'torre', label: 'Torre Sombra', distrito: 'Centro', w: 11, h: 9, dx: -30, dy: 10 },
    { type: 'casino', label: 'Casino Fortuna', distrito: 'Centro', w: 17, h: 11, dx: 35, dy: -25 },
    { type: 'mercado', label: 'Mercado Cubierto', distrito: 'Lomas del Norte', w: 17, h: 11 },
    { type: 'carcel', label: 'Correccional Santa Perdida', distrito: 'Los Rompientes', w: 17, h: 11 },
    { type: 'aparcamiento', label: 'Aparcamiento Central', distrito: 'Gran Via Oeste', w: 17, h: 11 },
    { type: 'estadio', label: 'Estadio Municipal', distrito: 'Poligono Sur', w: 17, h: 11, dx: -30, dy: 0 },
    { type: 'poligono', label: 'Poligono Industrial', distrito: 'Poligono Sur', w: 17, h: 11, dx: 35, dy: 20 },
    { type: 'grua', label: 'Grua del Puerto', distrito: 'El Puerto', w: 16, h: 4, costa: true },
    { type: 'faro', label: 'El Faro', distrito: 'Poligono Sur', w: 6, h: 6, costa: true },
    { type: 'aeropuerto', label: 'Aerodromo Santa Perdida', distrito: 'Altos de la Sierra', w: 85, h: 19 },
  ],
};
