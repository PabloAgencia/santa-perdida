// lateralRetention: cuanta velocidad lateral conserva por fotograma.
// Mas bajo = mas agarre. Mas alto = derrapa mas.
// palette: colores de carroceria. Cada coche de la calle coge uno, asi que
// dos del mismo modelo no salen identicos.

export const GLASS = 0x1d2128;

// Cada motor suena distinto. base = tono al ralenti, range = cuanto sube con
// la velocidad, body = cuerpo grave, bright = cuanto abre el filtro al correr.
// Ondas triangulares: la sierra a tono alto zumbaba como una mosca.
// Los tonos se mantienen graves a proposito; el motor se nota por el cuerpo,
// no por agudos.
export const ENGINES = {
  barato:     { base: 40, range: 62,  wave: 'triangle', body: 0.6,  bright: 620, vol: 0.85 },
  rapido:     { base: 48, range: 92,  wave: 'triangle', body: 0.45, bright: 950, vol: 1.0 },
  resistente: { base: 34, range: 58,  wave: 'triangle', body: 0.75, bright: 540, vol: 0.95 },
  moto:       { base: 58, range: 118, wave: 'triangle', body: 0.3,  bright: 1150, vol: 0.75 },
  furgoneta:  { base: 28, range: 44,  wave: 'triangle', body: 0.9,  bright: 430, vol: 0.9 },
  policia:    { base: 46, range: 86,  wave: 'triangle', body: 0.5,  bright: 880, vol: 0.9 },
};

export const VEHICLES = {
  chinchorro: {
    name: 'Chinchorro',
    clase: 'barato',
    length: 42, width: 20,
    maxSpeed: 235, accel: 135, brake: 300, reverseSpeed: 90,
    turnRate: 2.6, lateralRetention: 0.88,
    maxHp: 90, price: 1800,
    palette: [0x8a8f7a, 0x6d7466, 0x9c8f6e, 0x7d6f63, 0x5f6b68],
  },
  velagt: {
    name: 'Vela GT',
    clase: 'rapido',
    length: 47, width: 21,
    maxSpeed: 430, accel: 240, brake: 400, reverseSpeed: 110,
    turnRate: 2.3, lateralRetention: 0.845,
    maxHp: 70, price: 8500,
    palette: [0xb8382c, 0x1f1f24, 0xc8a12e, 0x2d5f7a, 0xa8a49b],
  },
  bastion: {
    name: 'Bastion',
    clase: 'resistente',
    length: 51, width: 25,
    maxSpeed: 300, accel: 140, brake: 340, reverseSpeed: 100,
    turnRate: 2.0, lateralRetention: 0.865,
    maxHp: 190, price: 6200,
    palette: [0x2f4a63, 0x3d3f45, 0x55402f, 0x1e3a2f, 0x6b6257],
  },
  avispa: {
    name: 'Avispa',
    clase: 'moto',
    length: 30, width: 13,
    maxSpeed: 405, accel: 300, brake: 340, reverseSpeed: 70,
    turnRate: 3.4, lateralRetention: 0.74,
    maxHp: 45, price: 3400,
    palette: [0xd0982a, 0x9b2f22, 0x24262c, 0x2f6b62, 0xb0b4b8],
  },
  carguero: {
    name: 'Carguero',
    clase: 'furgoneta',
    length: 60, width: 26,
    maxSpeed: 225, accel: 95, brake: 255, reverseSpeed: 85,
    turnRate: 1.7, lateralRetention: 0.905,
    maxHp: 150, price: 4500,
    palette: [0xc9c3b4, 0x8a8f96, 0x4a5b6b, 0x6d5f4a, 0x2e3238],
  },
  patrulla: {
    name: 'Patrulla',
    clase: 'policia',
    police: true,
    length: 49, width: 23,
    maxSpeed: 355, accel: 225, brake: 385, reverseSpeed: 105,
    turnRate: 2.25, lateralRetention: 0.85,
    maxHp: 140, price: 0,
    palette: [0xd8d5cc, 0x2a2f3a],
  },
};

// el coche patrulla no sale como trafico ni aparcado: lo saca la policia
export const VEHICLE_KEYS = Object.keys(VEHICLES).filter((k) => !VEHICLES[k].police);
