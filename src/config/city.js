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
};

export const SOLID_TILES = new Set([T.WATER]);

export const CITY = {
  // La ciudad ha crecido dos veces: 124x104 al principio, 173x146 y ahora
  // 221x182 casillas (7.072 x 5.824 px), mas de tres veces la original.
  // Todo sale de aqui: para agrandarla otra vez basta con añadir calles y su
  // fila o columna en blockZones.
  width: 221,
  height: 182,
  seed: 20260920,

  seaTop: 173,
  portTop: 154,

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
  ],
  roadsV: [
    { x: 4, w: 5 },
    { x: 26, w: 5 },
    { x: 50, w: 5 },
    { x: 74, w: 5 },
    { x: 98, w: 5 },
    { x: 122, w: 5 },
    { x: 146, w: 5 },
    { x: 170, w: 5 },
    { x: 194, w: 5 },
    { x: 212, w: 5 },
  ],

  // calle del puerto y sus dos bajadas desde la ronda sur
  portRoad: { y: 162, h: 5, x0: 10, x1: 209 },
  portLinks: [{ x: 74, w: 5 }, { x: 170, w: 5 }],
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
    ['residencial', 'residencial', 'residencial', 'centro', 'centro', 'centro', 'conflictivo', 'conflictivo', 'conflictivo'],
    ['residencial', 'residencial', 'centro', 'centro', 'centro', 'centro', 'conflictivo', 'conflictivo', 'conflictivo'],
    ['residencial', 'comercial', 'centro', 'centro', 'centro', 'centro', 'centro', 'conflictivo', 'industrial'],
    ['comercial', 'comercial', 'comercial', 'centro', 'centro', 'comercial', 'conflictivo', 'industrial', 'industrial'],
    ['comercial', 'comercial', 'comercial', 'comercial', 'comercial', 'comercial', 'industrial', 'industrial', 'industrial'],
    ['comercial', 'residencial', 'residencial', 'comercial', 'comercial', 'industrial', 'industrial', 'industrial', 'conflictivo'],
    ['residencial', 'residencial', 'comercial', 'industrial', 'industrial', 'industrial', 'industrial', 'conflictivo', 'conflictivo'],
    ['industrial', 'industrial', 'comercial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial', 'industrial'],
  ],
  hideout: { blockRow: 0, blockCol: 0, label: 'Tu escondite' },

  // sitios reconocibles para poder orientarse: sin esto todas las manzanas
  // se parecen y no hay forma de saber donde estas
  landmarks: [
    { type: 'plaza', label: 'Plaza del Farol', x: 104, y: 82, w: 15, h: 9 },
    { type: 'torre', label: 'Torre Sombra', x: 106, y: 64, w: 11, h: 9 },
    { type: 'faro', label: 'El Faro', x: 196, y: 167, w: 6, h: 6 },
    { type: 'grua', label: 'Grua del Puerto', x: 56, y: 167, w: 16, h: 4 },
  ],};
