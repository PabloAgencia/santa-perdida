// Las 10 misiones de arranque, escritas como DATOS. Cada una es una lista de
// pasos, y cada paso es de un tipo que MissionSystem sabe ejecutar. Asi se
// añade una mision nueva sin tocar codigo: solo esta tabla.
//
// Tipos de paso:
//   ir        llegar a un punto
//   recoger   llegar a un punto y coger algo
//   entregar  llevarlo a otro punto
//   conducir  hacer lo mismo pero obligatoriamente en coche
//   perder    quitarte a la policia de encima
//   aguantar  sobrevivir X segundos
//   romper    destrozar un vehiculo concreto
//   seguir    mantenerte cerca de un vehiculo sin perderlo
//
// Cada paso puede llevar `limite` (segundos) y `zona` (donde cae el punto).

export const MISSIONS = [
  {
    id: 'primer-recado',
    faccion: 'amarres',
    nombre: 'Primer recado',
    intro: 'Un fardo que no puede pasar por la aduana. Tu lo llevas y no preguntas.',
    minRep: -100,
    pago: 180,
    rep: 8,
    pasos: [
      { tipo: 'recoger', zona: 'puerto', texto: 'Recoge el fardo en el puerto' },
      { tipo: 'entregar', zona: 'industrial', limite: 110, texto: 'Llevalo al almacen' },
    ],
  },
  {
    id: 'coche-limpio',
    faccion: 'amarres',
    nombre: 'Coche limpio',
    intro: 'Necesitan un coche que no este fichado. Cogelo y dejalo en el muelle.',
    minRep: 5,
    pago: 260,
    rep: 10,
    pasos: [
      { tipo: 'ir', zona: 'comercial', texto: 'Busca un coche en la zona comercial' },
      { tipo: 'conducir', zona: 'puerto', limite: 120, texto: 'Llevalo al muelle sin destrozarlo' },
    ],
  },
  {
    id: 'aviso-rompiente',
    faccion: 'rompiente',
    nombre: 'Un aviso',
    intro: 'Hay que recordarle a alguien de quien es el barrio. Su coche lo dira por ti.',
    minRep: -100,
    pago: 200,
    rep: 9,
    pasos: [
      { tipo: 'ir', zona: 'centro', texto: 'Ve al centro, donde aparca' },
      { tipo: 'romper', texto: 'Destroza su coche' },
      { tipo: 'perder', limite: 90, texto: 'Quitate a la policia de encima' },
    ],
  },
  {
    id: 'corre-chaval',
    faccion: 'rompiente',
    nombre: 'Corre, chaval',
    intro: 'Un chaval del barrio la ha liado y tiene que desaparecer un rato.',
    minRep: 10,
    pago: 240,
    rep: 10,
    pasos: [
      { tipo: 'recoger', zona: 'conflictivo', texto: 'Recogelo en Los Rompientes' },
      { tipo: 'conducir', zona: 'residencial', limite: 95, texto: 'Sacalo del barrio' },
    ],
  },
  {
    id: 'cobro-verdial',
    faccion: 'verdial',
    nombre: 'La ronda de cobros',
    intro: 'Tres negocios, tres sobres. Nadie discute, solo pagan.',
    minRep: -100,
    pago: 220,
    rep: 8,
    pasos: [
      { tipo: 'recoger', zona: 'comercial', texto: 'Primer sobre' },
      { tipo: 'recoger', zona: 'centro', texto: 'Segundo sobre' },
      { tipo: 'entregar', zona: 'centro', limite: 130, texto: 'Llevalo todo a Casa Verdial' },
    ],
  },
  {
    id: 'sin-testigos',
    faccion: 'verdial',
    nombre: 'Sin testigos',
    intro: 'Alguien ha hablado de mas. Su coche tiene que aparecer en el fondo del puerto.',
    minRep: 15,
    pago: 330,
    rep: 12,
    pasos: [
      { tipo: 'ir', zona: 'residencial', texto: 'Localiza el coche' },
      { tipo: 'conducir', zona: 'puerto', limite: 120, texto: 'Llevalo al puerto' },
      { tipo: 'perder', limite: 90, texto: 'Desaparece' },
    ],
  },
  {
    id: 'carrera-muelle',
    faccion: 'amarres',
    nombre: 'Contrarreloj',
    intro: 'Una entrega que tenia que estar hace veinte minutos. Vuela.',
    minRep: 20,
    pago: 300,
    rep: 9,
    pasos: [
      { tipo: 'recoger', zona: 'industrial', texto: 'Coge el paquete' },
      { tipo: 'conducir', zona: 'conflictivo', limite: 70, texto: 'Entrega antes de que cierren' },
    ],
  },
  {
    id: 'el-soplon',
    faccion: 'rompiente',
    nombre: 'El soplon',
    intro: 'Va a ir a contarlo. Siguele y averigua adonde va, pero sin que te vea.',
    minRep: 20,
    pago: 280,
    rep: 11,
    pasos: [
      { tipo: 'seguir', limite: 75, texto: 'Sigue al coche sin perderlo' },
      { tipo: 'romper', texto: 'Cortale el paso' },
    ],
  },
  {
    id: 'aguanta',
    faccion: 'verdial',
    nombre: 'Aguanta ahi',
    intro: 'Te has metido donde no debias. Ahora toca salir vivo.',
    minRep: 25,
    pago: 380,
    rep: 14,
    pasos: [
      { tipo: 'ir', zona: 'conflictivo', texto: 'Ve al punto' },
      { tipo: 'aguantar', limite: 60, texto: 'Aguanta 60 segundos' },
      { tipo: 'perder', limite: 100, texto: 'Sal de ahi' },
    ],
  },
  {
    id: 'ultimo-viaje',
    faccion: 'amarres',
    nombre: 'El ultimo viaje',
    intro: 'Lo gordo. Del puerto al otro extremo, con media ciudad buscandote.',
    minRep: 35,
    pago: 600,
    rep: 20,
    pasos: [
      { tipo: 'recoger', zona: 'puerto', texto: 'Carga la mercancia' },
      { tipo: 'conducir', zona: 'residencial', limite: 150, texto: 'Cruza la ciudad' },
      { tipo: 'perder', limite: 120, texto: 'Pierde a la policia' },
    ],
  },
];
