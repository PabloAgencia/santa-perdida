export const TILE = 32;

export const PLAYER = {
  walkSpeed: 115,
  runSpeed: 200,
  radius: 9,
  enterRange: 58,

  // ---- correr cansa ----
  // Segundos de carrera seguida: con el aguante a cero das para poco, con el
  // aguante al maximo cruzas un barrio. Es lo que hace que entrenar se note.
  alientoBase: 2.6,
  alientoPorAguante: 6,
  alientoRecuperaAndando: 0.9,   // por segundo andando o parado
  alientoRecuperaQuieto: 1.6,

  // ---- lo que hace el cuerpo ----
  // gordo: mas lento y te cansas antes. Cachas: algo mas lento que un flaco
  // pero pegas mas y aguantas mas vida.
  penalizacionPorGrasa: 0.25,    // hasta un 25% mas lento con la grasa a tope
  penalizacionPorMusculo: 0.06,
};

// Cuanto sube cada cosa con el uso. Numeros pequeños a proposito: esto tiene
// que notarse a las horas de juego, no en dos minutos.
export const ENTRENAR = {
  grasaPorSegundoCorriendo: -0.06,
  aguantePorSegundoCorriendo: 0.12,
  volantePorMetro: 0.0009,
  musculoPorGolpe: 0.08,
  punteriaPorAcierto: 0.15,
};

export const CAMERA = {
  followLerp: 0.12,
  zoomFoot: 1.45,
  zoomDrive: 1.0,
  zoomLerp: 0.035,
};

export const ECONOMY = {
  startingMoney: 35,
  deliveryBase: 40,
  deliveryPerTile: 0.9,
  deliveryTimeBonus: 55,
  deliveryTimePerTile: 0.28,
  repairPerHp: 1.5,
};

export const DRIVING = {
  handbrakeRetention: 0.986,
  rollingDrag: 68,
  crashMinSpeed: 70,
  crashSpeedLoss: 0.45,
  crashDamagePerSpeed: 0.045,
  crashShake: 0.0016,
};

export const SAVE = {
  // tres ranuras de partida, como los GTA de siempre
  key: 'santa-perdida-save',      // se le pega el numero: ...-save-1
  keyRanuraActiva: 'santa-perdida-ranura',
  ranuras: 3,
  version: 1,
  autosaveMs: 15000,
};

export const COLORS = {
  ink: '#e6e1d4',
  money: '#8fd694',
  objective: '#e8b54a',
  danger: '#d9584a',
  dim: '#8a8578',
};
