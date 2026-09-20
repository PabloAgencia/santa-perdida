export const TILE = 32;

export const PLAYER = {
  walkSpeed: 115,
  runSpeed: 200,
  radius: 9,
  enterRange: 58,
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
  handbrakeRetention: 0.975,
  rollingDrag: 95,
  crashMinSpeed: 70,
  crashSpeedLoss: 0.45,
  crashDamagePerSpeed: 0.045,
  crashShake: 0.0016,
};

export const SAVE = {
  key: 'puerto-sombra-save',
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
