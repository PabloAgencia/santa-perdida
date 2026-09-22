export const EventBus = new Phaser.Events.EventEmitter();

export const EVT = {
  MONEY_CHANGED: 'money:changed',
  MONEY_REJECTED: 'money:rejected',
  STATS_CHANGED: 'stats:changed',

  MISSION_START: 'mission:start',
  MISSION_END: 'mission:end',

  JOB_OFFERED: 'job:offered',
  JOB_STARTED: 'job:started',
  JOB_STAGE: 'job:stage',
  JOB_DONE: 'job:done',
  JOB_FAILED: 'job:failed',

  // comprar algo que se queda en el mundo: pisos ahora, locales despues
  PROPERTY_BOUGHT: 'property:bought',
  GARAGE_STORED: 'garage:stored',
  GARAGE_TAKEN: 'garage:taken',

  VEHICLE_ENTERED: 'vehicle:entered',
  VEHICLE_EXITED: 'vehicle:exited',
  VEHICLE_CRASHED: 'vehicle:crashed',

  PED_HIT: 'ped:hit',
  FACTION_CHANGED: 'faction:changed',
  TERRITORY_ENTERED: 'faction:territory',
  WANTED_CHANGED: 'wanted:changed',
  PLAYER_HURT: 'player:hurt',
  PLAYER_BUSTED: 'player:busted',
  PLAYER_DEAD: 'player:dead',
  PLAYER_RESPAWN: 'player:respawn',

  HUD_TICK: 'hud:tick',
  NOTIFY: 'ui:notify',
  BIG_MESSAGE: 'ui:big',
  HIDEOUT_EXIT: 'hideout:exit',

  BEFORE_SAVE: 'save:before',
  AFTER_LOAD: 'save:after-load',
  SAVED: 'save:done',
};
