// Santa Perdida descrita como datos. CityMap.js convierte esto en la rejilla.
// Todas las coordenadas van en casillas, no en pixeles.

export const T = {
  ROAD: 0,
  LINE_H: 1,
  LINE_V: 2,
  SIDEWALK: 3,
  GRASS: 4,
  SAND: 5,
  WATER: 6,
  DOCK: 7,
  ALLEY: 8,
  ROCK: 9,     // monte macizo (la ciudad grande)
};

export const SOLID_TILES = new Set([T.WATER]);

export const CITY = {
  // La ciudad ha crecido tres veces: 124x104 al principio, 173x146, 221x182
  // y ahora 325x262 casillas (10400 x 8384 px), mas de SEIS veces
  // la original. Todo sale de aqui: para agrandarla otra vez basta con añadir
  // calles y su fila o columna en blockZones.
  width: 325,
  height: 262,
  seed: 20260920,

  seaTop: 253,
  portTop: 234,

  roadsH: [
    { y: 4, h: 5 },
    { y: 22, h: 5 },
    { y: 40, h: 5 },
    { y: 58, h: 5 },
    { y: 76, h: 5 },
    { y: 94, h: 5 },
    { y: 112, h: 5 },
    { y: 130, h: 5 },
    { y: 148, h: 5 },
    { y: 166, h: 5 },
    { y: 184, h: 5 },
    { y: 202, h: 5 },
    { y: 220, h: 5 },
  ],
  roadsV: [
    { x: 4, w: 5 },
    { x: 28, w: 5 },
    { x: 52, w: 5 },
    { x: 76, w: 5 },
    { x: 100, w: 5 },
    { x: 124, w: 5 },
    { x: 148, w: 5 },
    { x: 172, w: 5 },
    { x: 196, w: 5 },
    { x: 220, w: 5 },
    { x: 244, w: 5 },
    { x: 268, w: 5 },
    { x: 292, w: 5 },
    { x: 316, w: 5 },
  ],

  // calle del puerto y sus dos bajadas desde la ronda sur
  portRoad: { y: 242, h: 5, x0: 10, x1: 313 },
  portLinks: [{ x: 100, w: 5 }, { x: 220, w: 5 }],

  zones: {
    residencial: {
      label: 'Residencial',
      palette: [0x4a4038, 0x554840, 0x3f3730, 0x51443a, 0x5e4a38, 0x463c34],
      minSize: 3, maxSize: 4,
    },
    centro: {
      label: 'Centro',
      palette: [0x3b414f, 0x454b5a, 0x2f3540, 0x424859, 0x4e5568, 0x363c49],
      minSize: 3, maxSize: 5,
    },
    conflictivo: {
      label: 'Los Rompientes',
      palette: [0x3a3430, 0x443b33, 0x2e2926, 0x3d3229, 0x4a3d31, 0x332c26],
      minSize: 3, maxSize: 4,
    },
    comercial: {
      label: 'Comercial',
      palette: [0x46424f, 0x4f4a58, 0x3a3644, 0x4a4553, 0x5a4f63, 0x403c4c],
      minSize: 3, maxSize: 5,
    },
    industrial: {
      label: 'Industrial',
      palette: [0x3d4238, 0x474c40, 0x333830, 0x424a3b, 0x4f5545, 0x2e332b],
      minSize: 4, maxSize: 7,
    },
    puerto: {
      label: 'Puerto',
      palette: [0x4a4238, 0x554b3f, 0x3e372f],
      minSize: 4, maxSize: 6,
    },
  },

  // que zona ocupa cada manzana: [fila][columna]
  // filas de arriba a abajo, columnas de izquierda a derecha
  blockZones: [
    ['residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'conflictivo', 'conflictivo', 'conflictivo'],
    ['residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'conflictivo', 'conflictivo', 'conflictivo'],
    ['residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'residencial', 'conflictivo', 'conflictivo', 'conflictivo'],
    ['comercial', 'comercial', 'comercial', 'comercial', 'centro', 'centro', 'centro', 'centro', 'centro', 'centro', 'conflictivo', 'conflictivo', 'conflictivo'],
    ['comercial', 'comercial', 'comercial', 'comercial', 'centro', 'centro', 'centro', 'centro', 'centro', 'centro', 'conflictivo', 'conflictivo', 'conflictivo'],
    ['comercial', 'comercial', 'comercial', 'comercial', 'centro', 'centro', 'centro', 'centro', 'centro', 'centro', 'conflictivo', 'conflictivo', 'conflictivo'],
    ['comercial', 'comercial', 'comercial', 'comercial', 'centro', 'centro', 'centro', 'centro', 'centro', 'industrial', 'conflictivo', 'conflictivo', 'conflictivo'],
    ['comercial', 'comercial', 'comercial', 'comercial', 'centro', 'centro', 'centro', 'centro', 'centro', 'industrial', 'industrial', 'industrial', 'industrial'],
    ['comercial', 'comercial', 'comercial', 'comercial', 'centro', 'centro', 'centro', 'centro', 'centro', 'industrial', 'industrial', 'industrial', 'industrial'],
    ['industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial'],
    ['industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial'],
    ['industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial'],
  ],

  hideout: { blockRow: 0, blockCol: 0, label: 'Tu escondite' },

  // sitios reconocibles para poder orientarse: sin esto todas las manzanas
  // se parecen y no hay forma de saber donde estas
  //
  // LA REGLA DE LAS MANZANAS: entre dos calles quedan 19 x 13 casillas. Un
  // landmark que ocupa una manzana va en 17 x 11 con una casilla de acera
  // alrededor, como el mercado. Varios se pasaban de la manzana y dejaban
  // muro solido encima de los carriles (los coches se estampaban en mitad de
  // la calle): se comprobo con un script que cruza cada landmark con las
  // calles, y ninguno de los de manzana puede pisar ninguna.
  landmarks: [
    { type: 'plaza', label: 'Plaza del Farol', x: 155, y: 119, w: 15, h: 9 },
    { type: 'torre', label: 'Torre Sombra', x: 157, y: 101, w: 11, h: 9 },
    { type: 'faro', label: 'El Faro', x: 299, y: 247, w: 6, h: 6 },
    { type: 'grua', label: 'Grua del Puerto', x: 56, y: 247, w: 16, h: 4 },
    // en la franja de arena entre el puerto y el mar (portTop-seaTop), lejos
    // de la grua (x 56-72) y del faro (x 299-305)
    { type: 'playa', label: 'Playa Buenavista', x: 140, y: 234, w: 70, h: 19 },
    // una manzana entera de la zona industrial
    { type: 'estadio', label: 'Estadio Municipal', x: 226, y: 172, w: 17, h: 11 },
    // REPARTO 27-sep (58a tanda): antes en col2/fila5 (comercial), pegado a
    // aparcamiento. Un mercado de barrio encaja igual de bien junto a las
    // casas, y asi la zona residencial (filas 0-2, que no tenia NINGUN
    // landmark) deja de estar vacia del todo.
    { type: 'mercado', label: 'Mercado Cubierto', x: 130, y: 28, w: 17, h: 11 },
    // REPARTO 27-sep: antes en col4/fila10 (industrial), a solo una columna
    // del poligono. La zona conflictiva (columnas 10-12) no tenia NINGUN
    // landmark, y una carcel encaja mejor ahi que en medio de las naves.
    { type: 'carcel', label: 'Correccional Santa Perdida', x: 274, y: 118, w: 17, h: 11 },
    // REPARTO 27-sep: antes en col6/fila4, apilado justo encima de la torre
    // (fila5) y la plaza (fila6): tres landmarks en la misma columna, tres
    // filas seguidas. Se queda en la zona centro pero en la esquina
    // contraria, lejos de la torre y de la plaza.
    { type: 'casino', label: 'Casino Fortuna', x: 202, y: 64, w: 17, h: 11 },
    // otra manzana comercial, distinta de la del mercado (que ya no esta aqui)
    { type: 'aparcamiento', label: 'Aparcamiento Central', x: 34, y: 136, w: 17, h: 11 },
    // REPARTO 27-sep: antes en col3/fila10, pegado a la carcel. Ahora en la
    // esquina opuesta de la (enorme) zona industrial, lejos del estadio y de
    // donde estaba la carcel.
    { type: 'poligono', label: 'Poligono Industrial', x: 274, y: 208, w: 17, h: 11 },
    // otro tramo de la franja de arena/puerto, al este de la playa y antes
    // del faro (comprobado: solo naves del puerto, nada especial)
    { type: 'aeropuerto', label: 'Aerodromo Santa Perdida', x: 210, y: 234, w: 85, h: 19 },
    // otro tramo de la franja de arena/puerto, antes de la grua
    { type: 'monte', label: 'Mirador del Farallon', x: 5, y: 234, w: 45, h: 19 },
    // entre la grua y la playa, SOLO en la mitad sur de la franja de arena
    // (y=247 en adelante, DESPUES de la calle del puerto que va de 242 a
    // 246 — asi la bahia no la tapa): una isla pequeña con puente de
    // acceso, fundida con el mar de verdad que empieza justo debajo (253)
    { type: 'isla', label: 'Isla del Pescador', x: 90, y: 247, w: 18, h: 6 },
    // un tramo de calle YA EXISTENTE (roadsH[6], y=112-116), entre dos
    // cruces sin ninguno en medio (roadsV en x=76 y x=100): no hace falta
    // tocar el terreno, solo oscurecerlo
    { type: 'tunel', label: 'Tunel de la Ronda', x: 81, y: 112, w: 18, h: 5 },
  ],};
