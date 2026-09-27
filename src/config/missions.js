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

// Los nombres y el hilo de estas diez vienen de HISTORIA-SANTA-PERDIDA.txt:
// ACTO 1 (minRep -100 a 8) el jugador entra en la ciudad y trabaja para los
// tres jefes sin que se conozcan entre ellos; ACTO 2 (minRep 15-18) el
// trabajo se pone serio y aparecen las primeras grietas; ACTO 3 (minRep 25)
// es donde el plan de La Doña empieza a asomar. `faccion`/`minRep`/`pago`/
// `rep`/`pasos` no se han tocado: la historia se monta encima del mismo
// esqueleto que ya funcionaba.
export const MISSIONS = [
  {
    id: 'primer-recado',
    faccion: 'amarres',
    nombre: 'Primer recado',
    intro: 'El Consul no te conoce de nada, y eso es justo lo que busca: un fardo que no puede pasar por la aduana, y alguien sin cara que se lo lleve sin preguntar.',
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
    intro: 'El Consul empieza a fiarse un poco. Necesita un coche que no este fichado por nadie: cogelo y dejalo en el muelle, sin que quede rastro de quien lo llevo.',
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
    intro: 'Chispa necesita recordarle a alguien de quien es el barrio, pero si lo hace uno de los suyos empieza una guerra. Un desconocido, en cambio, no cuenta como ofensa.',
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
    intro: 'Uno de los chavales de Chispa la ha liado y tiene que desaparecer un rato del barrio conflictivo. "Sacalo tu, que a ti no te sigue nadie", dice Chispa.',
    minRep: 8,
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
    intro: 'La Doña no manda a su gente a cobrar: manda a alguien sin nombre, con guantes de verdad, para que nadie tenga que discutir con Casa Verdial en persona.',
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
    intro: 'Alguien ha hablado de mas de Casa Verdial. La Doña lo dice sin levantar la voz, como todo: su coche tiene que aparecer en el fondo del puerto.',
    minRep: 8,
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
    intro: 'El Consul tiene una entrega que tenia que estar hace veinte minutos, y por primera vez suena nervioso: alguien le esta metiendo prisa que no es de aqui.',
    minRep: 15,
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
    intro: 'Chispa cree que alguien de su propia cuadrilla habla con "gente de fuera" que no pinta nada en el barrio conflictivo. Siguele y averigua adonde va, sin que te vea.',
    minRep: 15,
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
    intro: 'La Doña te manda a un sitio sin decirte lo que te espera. No es descuido: para ella, la gente que trabaja para otros tambien es gente que se gasta.',
    minRep: 18,
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
    intro: 'El Consul por fin lo dice claro: alguien de dentro de Santa Perdida quiere que su trato del puerto salga mal. Del muelle al otro extremo, con media ciudad buscandote.',
    minRep: 25,
    pago: 600,
    rep: 20,
    pasos: [
      { tipo: 'recoger', zona: 'puerto', texto: 'Carga la mercancia' },
      { tipo: 'conducir', zona: 'residencial', limite: 150, texto: 'Cruza la ciudad' },
      { tipo: 'perder', limite: 120, texto: 'Pierde a la policia' },
    ],
  },
];
