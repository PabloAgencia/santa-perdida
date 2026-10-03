// Tres bandas originales de Santa Perdida. Cada una manda en unos barrios.
// La reputacion va de -100 (te quieren muerto) a +100 (eres de los suyos).

export const FACTIONS = {
  amarres: {
    key: 'amarres',
    name: 'Los Amarres',
    short: 'AMARRES',
    color: 0x2f7a6b,
    accent: 0x49b39c,
    zones: ['puerto', 'industrial'],
    lema: 'Todo lo que entra por el muelle pasa por ellos',
    negocio: 'contrabando',
    // HISTORIA-SANTA-PERDIDA.txt: el "dador de mision" ya no es una banda
    // sin cara, es su jefe en persona. El sprite sigue siendo el mismo
    // (`gang-amarres-0`), solo cambia el nombre que se lee encima.
    jefe: { nombre: 'Baltasar Roig', alias: 'El Consul' },
  },
  rompiente: {
    key: 'rompiente',
    name: 'Cuadrilla del Rompiente',
    short: 'ROMPIENTE',
    color: 0x9c4526,
    accent: 0xd97a3f,
    zones: ['conflictivo'],
    lema: 'Chavales del barrio alto, sin nada que perder',
    negocio: 'calle',
    jefe: { nombre: 'Nando Ecija', alias: 'Chispa' },
  },
  verdial: {
    key: 'verdial',
    name: 'Casa Verdial',
    short: 'VERDIAL',
    color: 0x5a3f7a,
    accent: 0x9a7ac4,
    zones: ['centro', 'comercial', 'casco'],
    lema: 'Dinero viejo que cobra proteccion con guantes',
    negocio: 'proteccion',
    jefe: { nombre: 'Adelina Verdial', alias: 'La Doña' },
  },
};

export const FACTION_KEYS = Object.keys(FACTIONS);

// que banda manda en cada tipo de barrio
export const ZONE_OWNER = {};
for (const f of Object.values(FACTIONS)) {
  for (const z of f.zones) ZONE_OWNER[z] = f.key;
}

export const REP = {
  min: -100,
  max: 100,
  hostileBelow: -25,
  friendlyAbove: 30,
  hitMemberPenalty: -14,
  rivalBonus: 5,
};
