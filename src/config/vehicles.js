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
// Cada motor suena distinto. Con grabacion (audio/motor-*.mp3) manda
// `muestra` y `tono`; si el fichero no esta, se sintetiza con base/range/wave.
//
// El reparto sale de medir las grabaciones: `motor-2` es la mas grave (42%
// de la energia por debajo de 200 Hz), asi que va a la furgoneta; `motor-3`
// es la mas aguda y larga, para el deportivo; `motor-4` es la que mas varia,
// que suena a traqueteo y le pega al cacharro; `motor-1` es un motor grande
// y estable, para el sedan y la patrulla.
export const ENGINES = {
  barato:     { base: 40, range: 62,  wave: 'triangle', body: 0.6,  bright: 620, vol: 0.85,
                muestra: 'motor-4', tono: 1 },
  rapido:     { base: 48, range: 92,  wave: 'triangle', body: 0.45, bright: 950, vol: 1.0,
                muestra: 'motor-3', tono: 1 },
  resistente: { base: 34, range: 58,  wave: 'triangle', body: 0.75, bright: 540, vol: 0.95,
                muestra: 'motor-1', tono: 0.88 },
  moto:       { base: 58, range: 118, wave: 'triangle', body: 0.3,  bright: 1150, vol: 0.75,
                muestra: 'motor-moto', tono: 1.05 },
  furgoneta:  { base: 28, range: 44,  wave: 'triangle', body: 0.9,  bright: 430, vol: 0.9,
                muestra: 'motor-2', tono: 0.82 },
  policia:    { base: 46, range: 86,  wave: 'triangle', body: 0.5,  bright: 880, vol: 0.9,
                muestra: 'motor-1', tono: 1.08 },
};
export const VEHICLES = {
  chinchorro: {
    name: 'Chinchorro',
    clase: 'barato',
    length: 42, width: 20,
    // el cacharro: arranca regular, corre poco y gira bien por ser corto
    maxSpeed: 215, accel: 118, brake: 290, reverseSpeed: 92,
    turnRate: 2.75, lateralRetention: 0.875,
    maxHp: 90, price: 1800,
    palette: [0x8a8f7a, 0x6d7466, 0x9c8f6e, 0x7d6f63, 0x5f6b68],
  },
  velagt: {
    name: 'Vela GT',
    clase: 'rapido',
    length: 47, width: 21,
    // el deportivo: vuela y frena bien, pero se va de atras si lo fuerzas
    maxSpeed: 475, accel: 275, brake: 430, reverseSpeed: 115,
    turnRate: 2.2, lateralRetention: 0.862,
    maxHp: 70, price: 8500,
    palette: [0xb8382c, 0x1f1f24, 0xc8a12e, 0x2d5f7a, 0xa8a49b],
  },
  bastion: {
    name: 'Bastion',
    clase: 'resistente',
    length: 51, width: 25,
    // el tanque: pesado y lento de reaccion, pero se lo lleva todo por delante
    maxSpeed: 305, accel: 132, brake: 300, reverseSpeed: 105,
    turnRate: 1.85, lateralRetention: 0.885,
    maxHp: 190, price: 6200,
    palette: [0x2f4a63, 0x3d3f45, 0x55402f, 0x1e3a2f, 0x6b6257],
  },
  avispa: {
    name: 'Avispa',
    clase: 'moto',
    length: 30, width: 13,
    // la moto: sale disparada y gira como nada, pero es de papel
    maxSpeed: 420, accel: 340, brake: 360, reverseSpeed: 70,
    turnRate: 3.6, lateralRetention: 0.72,
    maxHp: 45, price: 3400,
    palette: [0xd0982a, 0x9b2f22, 0x24262c, 0x2f6b62, 0xb0b4b8],
  },
  carguero: {
    name: 'Carguero',
    clase: 'furgoneta',
    length: 60, width: 26,
    // la furgoneta: le cuesta todo, arrancar, girar y sobre todo parar
    maxSpeed: 205, accel: 88, brake: 230, reverseSpeed: 82,
    turnRate: 1.55, lateralRetention: 0.915,
    maxHp: 150, price: 4500,
    palette: [0xc9c3b4, 0x8a8f96, 0x4a5b6b, 0x6d5f4a, 0x2e3238],
  },
  patrulla: {
    name: 'Patrulla',
    clase: 'policia',
    police: true,
    length: 49, width: 23,
    // la patrulla: casi tan rapida como el deportivo y mucho mas noble
    maxSpeed: 370, accel: 235, brake: 395, reverseSpeed: 112,
    turnRate: 2.3, lateralRetention: 0.852,
    maxHp: 140, price: 0,
    palette: [0xd8d5cc, 0x2a2f3a],
  },
  // El furgon de asalto: solo sale con la busca al maximo y trae cuatro
  // dentro. Lento y pesado a proposito, para que se le pueda ver venir.
  furgon: {
    name: 'Furgon de asalto',
    clase: 'furgoneta',
    police: true,
    length: 66, width: 28,
    maxSpeed: 290, accel: 120, brake: 320, reverseSpeed: 85,
    turnRate: 1.6, lateralRetention: 0.9,
    maxHp: 300, price: 0,
    palette: [0x23262b, 0x2f3a45],
  },
};

// el coche patrulla no sale como trafico ni aparcado: lo saca la policia
export const VEHICLE_KEYS = Object.keys(VEHICLES).filter((k) => !VEHICLES[k].police);
