// Como es el personaje por fuera. Esta aqui y no dentro de BootScene porque
// ahora cambia durante la partida: engordas, te pones cachas y algun dia te
// cambiaras de ropa. Todo son numeros que van a `world/personArt.js`.

// PUNTO 23 DEL PLAN: la ropa del armario. `precio` 0 = ya la llevas puesta
// desde el principio, no hace falta comprarla. `atractivo` se suma a la
// estadistica de siempre (GameState.atributos.atractivo, "como te miran").
// `banda`, si la lleva, es la banda cuyos colores son estos: ponertela sube
// el respeto con ESA banda y lo baja un poco con las otras dos, como llevar
// colores de banda por la calle en San Andreas (ver Player.ponerRopa). Los
// tres trajes de banda usan el `accent` de esa banda en config/factions.js
// como color de detalle, para que se reconozcan de un vistazo.
export const ROPA = {
  calle: {
    nombre: 'De calle',
    chaqueta: 0xa8552f, piel: 0xd8b48c, pelo: 0x2b2118, detalle: 0x7d3d20,
    precio: 0, atractivo: 0,
  },
  elegante: {
    nombre: 'Traje elegante',
    chaqueta: 0x1c1c22, piel: 0xd8b48c, pelo: 0x2b2118, detalle: 0x3a3d46,
    precio: 600, atractivo: 18,
  },
  amarres: {
    nombre: 'Colores de Los Amarres',
    chaqueta: 0x1f5c50, piel: 0xd8b48c, pelo: 0x2b2118, detalle: 0x49b39c,
    precio: 220, atractivo: 4, banda: 'amarres',
  },
  rompiente: {
    nombre: 'Colores del Rompiente',
    chaqueta: 0x7a3419, piel: 0xd8b48c, pelo: 0x2b2118, detalle: 0xd97a3f,
    precio: 220, atractivo: 4, banda: 'rompiente',
  },
  verdial: {
    nombre: 'Colores de Casa Verdial',
    chaqueta: 0x3f2c5a, piel: 0xd8b48c, pelo: 0x2b2118, detalle: 0x9a7ac4,
    precio: 220, atractivo: 4, banda: 'verdial',
  },
};

// Cuanto sube el respeto con la banda propia y cuanto baja con las otras
// dos al ponerte un traje de banda. Se deshace igual al quitartelo (ver
// Player.ponerRopa): no es un regalo permanente por comprarla una vez, es
// "mientras la llevas puesta".
export const EFECTO_BANDA_PROPIA = 8;
export const EFECTO_BANDA_RIVAL = -4;

// Tamaño del lienzo del sprite. No se toca: si cambia, cambia la escala de
// todo el personaje respecto a coches y peatones.
export const LIENZO = 32;

export const CUERPO = {
  // el tronco: estrecho si estas flaco, ancho si estas gordo o cachas
  anchoBase: 11,
  anchoPorGrasa: 5,
  anchoPorMusculo: 3,
  largo: 16,
};

// ancho del tronco segun como estes
export function anchoDelCuerpo(grasa, musculo) {
  return CUERPO.anchoBase
    + (grasa / 100) * CUERPO.anchoPorGrasa
    + (musculo / 100) * CUERPO.anchoPorMusculo;
}

// Se redibuja solo al cambiar de decena: regenerar cuatro texturas en cada
// fotograma seria tirar el rendimiento por la ventana.
export function tramoDelCuerpo(grasa, musculo) {
  return `${Math.floor(grasa / 10)}-${Math.floor(musculo / 10)}`;
}
