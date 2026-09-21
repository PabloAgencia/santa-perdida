// Como es el personaje por fuera. Esta aqui y no dentro de BootScene porque
// ahora cambia durante la partida: engordas, te pones cachas y algun dia te
// cambiaras de ropa. Todo son numeros que van a `world/personArt.js`.

export const ROPA = {
  calle: {
    nombre: 'De calle',
    chaqueta: 0xa8552f, piel: 0xd8b48c, pelo: 0x2b2118, detalle: 0x7d3d20,
    precio: 0, atractivo: 0,
  },
};

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
