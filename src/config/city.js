// Puerto Sombra descrita como datos. CityMap.js convierte esto en la rejilla.
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
};

export const SOLID_TILES = new Set([T.WATER]);

export const CITY = {
  width: 124,
  height: 104,
  seed: 20260920,

  seaTop: 97,
  portTop: 78,

  roadsH: [
    { y: 4, h: 5 },
    { y: 22, h: 5 },
    { y: 40, h: 5 },
    { y: 56, h: 5 },
    { y: 72, h: 5 },
  ],
  roadsV: [
    { x: 4, w: 5 },
    { x: 26, w: 5 },
    { x: 50, w: 5 },
    { x: 74, w: 5 },
    { x: 96, w: 5 },
    { x: 114, w: 5 },
  ],

  // calle del puerto y sus dos bajadas desde la ronda sur
  portRoad: { y: 86, h: 5, x0: 10, x1: 112 },
  portLinks: [{ x: 26, w: 5 }, { x: 74, w: 5 }],

  zones: {
    residencial: {
      label: 'Residencial',
      palette: [0x4a4038, 0x554840, 0x3f3730, 0x51443a],
      minSize: 3, maxSize: 4,
    },
    centro: {
      label: 'Centro',
      palette: [0x3b414f, 0x454b5a, 0x2f3540, 0x424859],
      minSize: 3, maxSize: 5,
    },
    conflictivo: {
      label: 'Los Rompientes',
      palette: [0x3a3430, 0x443b33, 0x2e2926, 0x3d3229],
      minSize: 3, maxSize: 4,
    },
    comercial: {
      label: 'Comercial',
      palette: [0x46424f, 0x4f4a58, 0x3a3644, 0x4a4553],
      minSize: 3, maxSize: 5,
    },
    industrial: {
      label: 'Industrial',
      palette: [0x3d4238, 0x474c40, 0x333830, 0x424a3b],
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
    ['residencial', 'residencial', 'centro', 'conflictivo', 'conflictivo'],
    ['residencial', 'centro', 'centro', 'centro', 'conflictivo'],
    ['comercial', 'comercial', 'centro', 'centro', 'industrial'],
    ['comercial', 'comercial', 'comercial', 'industrial', 'industrial'],
  ],

  hideout: { blockRow: 0, blockCol: 0, label: 'Tu escondite' },

  // sitios reconocibles para poder orientarse: sin esto todas las manzanas
  // se parecen y no hay forma de saber donde estas
  landmarks: [
    { type: 'plaza', label: 'Plaza del Farol', x: 57, y: 46, w: 15, h: 9 },
    { type: 'torre', label: 'Torre Sombra', x: 60, y: 29, w: 11, h: 9 },
    { type: 'faro', label: 'El Faro', x: 103, y: 91, w: 6, h: 6 },
    { type: 'grua', label: 'Grua del Puerto', x: 28, y: 91, w: 16, h: 4 },
  ],
};
