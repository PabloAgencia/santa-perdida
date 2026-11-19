import { GameState } from './GameState.js';

// LAS CONDICIONES DE LA HISTORIA, en un solo sitio (las usan CinematicaScene
// para los planos con `solo` y las opciones, y MissionSystem para `decision`).
//
//   'marca'          se eligio esa opcion en alguna cinematica (flags.decisiones)
//   '!marca'         NO se eligio
//   'hecha:<id>'     esa mision esta cumplida
//   'muerto:<id>'    ese personaje ha muerto en esta partida (flags.muertos)
//   'vivo:<id>'      sigue vivo
//   'flag:<nombre>'  un flag suelto de la partida (flags.historiaAcabada...)
// Cualquiera con '!' delante se niega. Una lista = todas a la vez.
export function cumpleCondicion(c) {
  if (c[0] === '!') return !cumpleCondicion(c.slice(1));
  const f = GameState.flags;
  if (c.startsWith('hecha:')) return !!(f.misiones || {})[c.slice(6)];
  if (c.startsWith('muerto:')) return !!(f.muertos || {})[c.slice(7)];
  if (c.startsWith('vivo:')) return !(f.muertos || {})[c.slice(5)];
  if (c.startsWith('flag:')) return !!f[c.slice(5)];
  return !!(f.decisiones || {})[c];
}

export function cumpleTodas(lista) {
  return [].concat(lista || []).every(cumpleCondicion);
}
