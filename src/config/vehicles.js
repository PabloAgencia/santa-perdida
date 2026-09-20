// lateralRetention: cuanta velocidad lateral conserva por fotograma.
// Mas bajo = mas agarre. Mas alto = derrapa mas.
// palette: colores de carroceria. Cada coche de la calle coge uno, asi que
// dos del mismo modelo no salen identicos.

export const GLASS = 0x1d2128;

export const VEHICLES = {
  chinchorro: {
    name: 'Chinchorro',
    clase: 'barato',
    length: 42, width: 20,
    maxSpeed: 235, accel: 175, brake: 320, reverseSpeed: 90,
    turnRate: 2.6, lateralRetention: 0.88,
    maxHp: 90, price: 1800,
    palette: [0x8a8f7a, 0x6d7466, 0x9c8f6e, 0x7d6f63, 0x5f6b68],
  },
  velagt: {
    name: 'Vela GT',
    clase: 'rapido',
    length: 47, width: 21,
    maxSpeed: 430, accel: 300, brake: 430, reverseSpeed: 110,
    turnRate: 2.3, lateralRetention: 0.845,
    maxHp: 70, price: 8500,
    palette: [0xb8382c, 0x1f1f24, 0xc8a12e, 0x2d5f7a, 0xa8a49b],
  },
  bastion: {
    name: 'Bastion',
    clase: 'resistente',
    length: 51, width: 25,
    maxSpeed: 300, accel: 200, brake: 300, reverseSpeed: 100,
    turnRate: 2.0, lateralRetention: 0.865,
    maxHp: 190, price: 6200,
    palette: [0x2f4a63, 0x3d3f45, 0x55402f, 0x1e3a2f, 0x6b6257],
  },
  avispa: {
    name: 'Avispa',
    clase: 'moto',
    length: 30, width: 13,
    maxSpeed: 405, accel: 385, brake: 380, reverseSpeed: 70,
    turnRate: 3.4, lateralRetention: 0.74,
    maxHp: 45, price: 3400,
    palette: [0xd0982a, 0x9b2f22, 0x24262c, 0x2f6b62, 0xb0b4b8],
  },
  carguero: {
    name: 'Carguero',
    clase: 'furgoneta',
    length: 60, width: 26,
    maxSpeed: 225, accel: 140, brake: 265, reverseSpeed: 85,
    turnRate: 1.7, lateralRetention: 0.905,
    maxHp: 150, price: 4500,
    palette: [0xc9c3b4, 0x8a8f96, 0x4a5b6b, 0x6d5f4a, 0x2e3238],
  },
  patrulla: {
    name: 'Patrulla',
    clase: 'policia',
    police: true,
    length: 49, width: 23,
    maxSpeed: 385, accel: 275, brake: 400, reverseSpeed: 105,
    turnRate: 2.25, lateralRetention: 0.85,
    maxHp: 140, price: 0,
    palette: [0xd8d5cc, 0x2a2f3a],
  },
};

// el coche patrulla no sale como trafico ni aparcado: lo saca la policia
export const VEHICLE_KEYS = Object.keys(VEHICLES).filter((k) => !VEHICLES[k].police);
