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
  // vol mas alto que los demas A PROPOSITO: medido con ffmpeg volumedetect,
  // motor-4.mp3 suena de media unos 6 dB mas flojo que el resto de
  // grabaciones (mean_volume -18.7 dB contra -12,5/-13,2 de las otras,
  // aunque el PICO sea igual de alto en todas) — sin este empujon el
  // Chinchorro sonaba raro de debil al lado de cualquier otro coche.
  barato:     { base: 40, range: 62,  wave: 'triangle', body: 0.6,  bright: 620, vol: 1.3,
                muestra: 'motor-4', tono: 1 },
  rapido:     { base: 48, range: 92,  wave: 'triangle', body: 0.45, bright: 950, vol: 1.0,
                muestra: 'motor-3', tono: 1 },
  // C4 (3-oct-2026): el sedan, el taxi y la patrulla sonaban fatal con
  // motor-1 (Pablo). Ahora cada uno tiene su grabacion libre de derechos
  // (Pixabay): motor-5, un V8 de ralenti limpio, y motor-6, un hot rod mas
  // bronco para la patrulla.
  resistente: { base: 34, range: 58,  wave: 'triangle', body: 0.75, bright: 540, vol: 1.0,
                muestra: 'motor-5', tono: 1.0 },
  // El taxi tenia el motor del sedan y sonaba a tractor: demasiado cuerpo
  // grave (body 0.75 sobre una base de 34 Hz) y tono bajo. Es un cuatro
  // cilindros de trabajo: mas agudo, menos cuerpo y mas lleno de aire.
  taxi:       { base: 46, range: 84,  wave: 'triangle', body: 0.35, bright: 820, vol: 1.0,
                muestra: 'motor-5', tono: 1.28 },
  // `aire` es la aspereza que se le suma POR ENCIMA de la grabacion. Solo la
  // lleva la moto: su grabacion no tiene nada por encima de 400 Hz (0%
  // medido) y sin esto es un zumbido grave, no una moto.
  moto:       { base: 58, range: 118, wave: 'triangle', body: 0.3,  bright: 1150, vol: 0.75,
                muestra: 'motor-moto', tono: 1.05, aire: 0.5, aireHz: 1100 },
  furgoneta:  { base: 28, range: 44,  wave: 'triangle', body: 0.9,  bright: 430, vol: 0.9,
                muestra: 'motor-2', tono: 0.82 },
  policia:    { base: 46, range: 86,  wave: 'triangle', body: 0.5,  bright: 880, vol: 0.95,
                muestra: 'motor-6', tono: 1.0 },
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
  // EL DE MAS ARRIBA DE TODOS. Pablo, viendo que con el dinero que se gana
  // jugando ya se compraba el Vela GT sin esfuerzo: "dale techo a los
  // precios". Mas rapido y mas caro que nada en el concesionario, para que
  // siga habiendo algo que de verdad cueste conseguir.
  centella: {
    name: 'Centella',
    clase: 'rapido',
    length: 49, width: 20,
    maxSpeed: 520, accel: 300, brake: 455, reverseSpeed: 118,
    turnRate: 2.05, lateralRetention: 0.855,
    maxHp: 65, price: 15000,
    palette: [0xd4af37, 0xc4c4c4, 0x151517, 0xb8262c, 0x0f4c81],
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
  // El taxi: un sedan de trabajo, machacado de tanto rodar. Ni corre ni
  // frena, pero aguanta y siempre hay uno cerca.
  taxi: {
    name: 'Taxi',
    clase: 'resistente',
    sonido: 'taxi',
    length: 50, width: 23,
    maxSpeed: 285, accel: 142, brake: 315, reverseSpeed: 98,
    turnRate: 2.15, lateralRetention: 0.872,
    maxHp: 135, price: 2600,
    palette: [0xe8b54a, 0xd9a63f],
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
  // LA AMBULANCIA, aparcada en la puerta del hospital. Lleva `police: true`
  // NO porque sea de la policia, sino porque esa marca es la que hace que un
  // vehiculo no salga como trafico normal ni aparcado por ahi: una ambulancia
  // suelta en cualquier esquina no tendria sentido. La pone LocalSystem en su
  // sitio, y de ahi se roba como cualquier otro coche.
  // Un paso de blanco, pesada y lenta, pero aguanta mucho.
  ambulancia: {
    name: 'Ambulancia',
    clase: 'furgoneta',
    police: true,
    length: 60, width: 26,
    maxSpeed: 305, accel: 130, brake: 340, reverseSpeed: 88,
    turnRate: 1.75, lateralRetention: 0.895,
    maxHp: 240, price: 0,
    palette: [0xe8e4dc, 0xdcd6c8],
  },
  // ---- LOS MODELOS DEL 4-OCT-2026 (Pablo: "incluso mas vehiculos") -------
  // Que la calle no sean siempre los mismos siete. Nombres propios de Santa
  // Perdida, ninguna marca real. Se dibujan por codigo segun su `clase`
  // hasta que lleguen sus imagenes (PROMPTS-PARA-GEMINI.txt).

  // el utilitario de ciudad: pequeño, gasta poco, se aparca en cualquier sitio
  pulga: {
    name: 'Pulga',
    clase: 'barato',
    length: 38, width: 19,
    maxSpeed: 230, accel: 135, brake: 300, reverseSpeed: 95,
    turnRate: 2.9, lateralRetention: 0.87,
    maxHp: 80, price: 2200,
    palette: [0xc8c4b4, 0x8a2a24, 0x2f5a7a, 0xd8b84a, 0x3a5a3a],
  },
  // la ranchera familiar de los noventa: larga, blanda, con sitio para todo
  ranchera: {
    name: 'Ranchera',
    clase: 'resistente',
    length: 54, width: 23,
    maxSpeed: 280, accel: 135, brake: 305, reverseSpeed: 98,
    turnRate: 2.0, lateralRetention: 0.88,
    maxHp: 150, price: 3800,
    palette: [0x6b5a44, 0x3a4a5a, 0x7a2e2a, 0xa8a49b, 0x2e3a2e],
  },
  // la pickup del campo y de las obras: fuerte, de suspension dura
  mulero: {
    name: 'Mulero',
    clase: 'resistente',
    length: 56, width: 25,
    maxSpeed: 290, accel: 150, brake: 300, reverseSpeed: 100,
    turnRate: 1.95, lateralRetention: 0.89,
    maxHp: 175, price: 5200,
    palette: [0x8a3a2a, 0x2f4a3a, 0xc8c0a8, 0x24262c, 0x5a6b7a],
  },
  // el todoterreno de quien quiere que le vean: alto, pesado y caro
  sierra: {
    name: 'Sierra 4x4',
    clase: 'resistente',
    length: 52, width: 26,
    maxSpeed: 320, accel: 190, brake: 330, reverseSpeed: 105,
    turnRate: 1.9, lateralRetention: 0.885,
    maxHp: 200, price: 9500,
    palette: [0x15171b, 0xe8e4dc, 0x3a4a3a, 0x5a5e66, 0x6a1a20],
  },
  // la berlina negra de los que mandan (la Doña no va en otra cosa)
  senador: {
    name: 'Senador',
    clase: 'resistente',
    length: 58, width: 24,
    maxSpeed: 360, accel: 210, brake: 360, reverseSpeed: 108,
    turnRate: 1.95, lateralRetention: 0.875,
    maxHp: 165, price: 11000,
    palette: [0x0f1014, 0x2a2a3a, 0x4a1a24, 0x3a3d42, 0xd8d4cc],
  },
  // el descapotable de los sesenta: precioso, rapido y de papel
  duna: {
    name: 'Duna',
    clase: 'rapido',
    length: 50, width: 22,
    maxSpeed: 390, accel: 225, brake: 380, reverseSpeed: 110,
    turnRate: 2.3, lateralRetention: 0.865,
    maxHp: 85, price: 12500,
    palette: [0xd8c8a0, 0x8ac0c8, 0xb8262c, 0x2a3a5a, 0xe8e4dc],
  },
  // el scooter de reparto: cabe por cualquier sitio y no aguanta nada
  mosquito: {
    name: 'Mosquito',
    clase: 'moto',
    length: 26, width: 12,
    maxSpeed: 260, accel: 270, brake: 330, reverseSpeed: 60,
    turnRate: 3.9, lateralRetention: 0.74,
    maxHp: 35, price: 1500,
    palette: [0x8ac0a0, 0xd8384a, 0xe8e4dc, 0x2a2d33, 0xe8b54a],
  },
  // el camion de caja: lento como un dia sin pan, pero no lo para nadie
  titan: {
    name: 'Titan',
    clase: 'furgoneta',
    length: 74, width: 30,
    maxSpeed: 185, accel: 70, brake: 210, reverseSpeed: 70,
    turnRate: 1.35, lateralRetention: 0.93,
    maxHp: 280, price: 7000,
    palette: [0xe8e4dc, 0x3a5a7a, 0xa8342a, 0x5a5e66, 0xd8a83a],
  },

  // LA FURGONETA DE LOS ROBOS (como la Boxville negra de San Andreas): solo
  // la aparca RoboSystem, en el residencial. `especial` = no sale como
  // trafico ni aparcada por ahi, SIN ser de la policia (la marca `police`
  // haria que al subirte se tratara como robar una patrulla).
  mudanzas: {
    name: 'Furgoneta de mudanzas',
    clase: 'furgoneta',
    especial: true,
    length: 62, width: 27,
    maxSpeed: 215, accel: 92, brake: 240, reverseSpeed: 82,
    turnRate: 1.55, lateralRetention: 0.915,
    maxHp: 170, price: 0,
    palette: [0x1c1d21, 0x24262b],
  },
};

// el coche patrulla no sale como trafico ni aparcado: lo saca la policia
export const VEHICLE_KEYS = Object.keys(VEHICLES).filter((k) => !VEHICLES[k].police && !VEHICLES[k].especial);
