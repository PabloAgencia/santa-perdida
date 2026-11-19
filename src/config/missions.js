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
  // ---------- ACTO 2: "TRES BANDAS, UNA CIUDAD" (HISTORIA-SANTA-PERDIDA.txt)
  // Las grietas internas de cada banda. La de Rompiente es la que "muerde"
  // de verdad: Renco no vuelve a aparecer despues de esta.
  {
    id: 'la-duda-de-ferro',
    faccion: 'amarres',
    nombre: 'La duda de Ferro',
    intro: 'Ferro te para antes de que llegues a hablar con El Consul. Quiere que le lleves algo a un comprador el mismo, sin pasar por el despacho. "Esto no hace falta que lo sepa nadie mas." No es un encargo de Los Amarres: es una prueba de a quien le eres leal.',
    minRep: 17,
    pago: 260,
    rep: 10,
    pasos: [
      { tipo: 'recoger', zona: 'industrial', texto: 'Recoge lo que te da Ferro' },
      { tipo: 'entregar', zona: 'conflictivo', limite: 100, texto: 'Entregalo sin que se entere nadie del puerto' },
    ],
  },
  {
    id: 'lo-que-hizo-renco',
    faccion: 'rompiente',
    nombre: 'Lo que hizo Renco',
    intro: 'No hablo de mas: vendio de verdad. Por su culpa se fue al garete un cargamento entero de El Consul, y ahora hasta Los Amarres miran raro a la Cuadrilla. Chispa no quiere un cadaver en su barrio: quiere a Renco fuera de Santa Perdida esta misma noche, y que no vuelva nunca.',
    minRep: 17,
    pago: 300,
    rep: 12,
    pasos: [
      { tipo: 'recoger', zona: 'conflictivo', texto: 'Recoge a Renco antes de que alguien se te adelante' },
      { tipo: 'conducir', zona: 'industrial', limite: 110, texto: 'Sacalo por la carretera del poligono, lejos de todos' },
    ],
  },
  {
    id: 'vale-toma-cartas',
    faccion: 'rompiente',
    nombre: 'Vale toma cartas',
    intro: 'Chispa sigue sin querer creerse lo de Renco, y Vale no puede esperar a que se lo crea. Te manda a ti, a espaldas de su jefe, a averiguar quien pagaba a Renco.',
    minRep: 20,
    requiere: ['lo-que-hizo-renco'],
    pago: 300,
    rep: 10,
    pasos: [
      { tipo: 'ir', zona: 'comercial', texto: 'Ve al bar de la zona comercial donde cobraba Renco' },
      { tipo: 'seguir', limite: 80, texto: 'Sigue al coche que recoge el sobre' },
    ],
  },
  {
    id: 'bien-llevado',
    faccion: 'verdial',
    nombre: '"Bien llevado"',
    intro: 'La Doña lo dice como quien no quiere la cosa, mirando al puerto desde su ventana: "Todo eso, bien llevado, valdria mucho mas." Lo que de verdad quiere es saber cuanto se mueve por los muelles de Los Amarres cada semana, y que en el puerto nadie sepa quien pregunta.',
    minRep: 20,
    pago: 340,
    rep: 13,
    pasos: [
      { tipo: 'ir', zona: 'puerto', texto: 'Acercate a los muelles sin llamar la atencion' },
      { tipo: 'entregar', zona: 'centro', limite: 120, texto: 'Llevale el recuento a Casa Verdial' },
    ],
  },
  {
    id: 'cuentas-claras',
    faccion: 'amarres',
    nombre: 'Cuentas claras',
    intro: 'Marina te cita a solas, sin su padre: hay numeros en los libros del puerto que no cuadran, y solo se fia de alguien que no le debe nada a nadie. Saca los libros de la oficina del muelle y llevaselos antes de que amanezca.',
    minRep: 20,
    requiere: ['la-duda-de-ferro'],
    pago: 320,
    rep: 10,
    pasos: [
      { tipo: 'recoger', zona: 'puerto', texto: 'Saca los libros de cuentas de la oficina del muelle' },
      { tipo: 'entregar', zona: 'industrial', limite: 110, texto: 'Llevaselos a Marina al almacen, sin que te vea nadie del puerto' },
    ],
  },
  {
    id: 'el-favor-de-empedrado',
    faccion: 'verdial',
    nombre: 'El favor del Licenciado',
    intro: 'El Licenciado Empedrado tiene un recado que no puede aparecer en ningun papel, ni en ninguna llamada, ni en la memoria de nadie que no seas tu.',
    minRep: 22,
    requiere: ['bien-llevado'],
    pago: 400,
    rep: 11,
    pasos: [
      { tipo: 'recoger', zona: 'centro', texto: 'Recoge el maletin que te da el Licenciado' },
      { tipo: 'conducir', zona: 'residencial', limite: 100, texto: 'Dejalo en la casa que te indica, sin parar por el camino' },
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
  // ---------- ACTO 3: "EL HOMBRE DE FUERA" (HISTORIA-SANTA-PERDIDA.txt) ----------
  // Se descubre a Anzures y al Consorcio Poniente. Cada mision lleva `requiere`
  // (las que tienen que estar hechas antes: el orden entre bandas) y algunas
  // un `dador` que no es el jefe (Sacau, Teresa, el Licenciado). Los cierres
  // con eleccion estan en config/cinematicas.js ('<id>:fin'): golpe-de-mano
  // decide quien muere (Ferro o Sacau) y el-trato si graba la reunion.
  {
    id: 'el-hombre-del-traje',
    faccion: 'amarres',
    nombre: 'El hombre del traje',
    intro: 'Marina quiere saber quien visita a su padre en el muelle norte. Acercate sin que te vean y, cuando se vaya, sigue su coche.',
    minRep: 28,
    requiere: ['ultimo-viaje', 'cuentas-claras'],
    pago: 360,
    rep: 8,
    pasos: [
      { tipo: 'ir', zona: 'puerto', texto: 'Acercate al muelle norte y mira sin que te vean' },
      { tipo: 'seguir', limite: 80, texto: 'Sigue el coche negro del desconocido' },
      { tipo: 'ir', zona: 'centro', texto: 'Mira donde para' },
    ],
  },
  {
    id: 'la-reportera',
    faccion: 'verdial',
    dador: 'teresa',
    nombre: 'La reportera',
    intro: 'Una periodista que no trabaja para nadie lleva meses detras de quien compra terrenos en Santa Perdida sin dar la cara. Necesita que alguien que no conozca nadie lleve unas copias.',
    minRep: 25,
    requiere: ['el-favor-de-empedrado'],
    pago: 300,
    rep: 5,
    pasos: [
      { tipo: 'ir', zona: 'comercial', texto: 'Reunete con Teresa Alba en la zona comercial' },
      { tipo: 'entregar', zona: 'centro', limite: 90, texto: 'Llevale las copias a su contacto del centro' },
    ],
  },
  {
    id: 'ojos-en-el-barrio',
    faccion: 'rompiente',
    nombre: 'Ojos en el barrio',
    intro: 'Hay gente con chalecos, cascos y planos midiendo las calles de Los Rompientes. Nadie del barrio los ha llamado. Chispa quiere saber quien son y quien les paga.',
    minRep: 28,
    requiere: ['vale-toma-cartas'],
    pago: 380,
    rep: 9,
    pasos: [
      { tipo: 'ir', zona: 'conflictivo', texto: 'Ve donde estan midiendo el barrio' },
      { tipo: 'seguir', limite: 80, texto: 'Sigue la furgoneta de los cascos' },
      { tipo: 'romper', texto: 'Cortales el paso' },
      { tipo: 'entregar', zona: 'conflictivo', limite: 70, texto: 'Llevale a Vale lo que han dejado caer' },
    ],
  },
  {
    id: 'papeles',
    faccion: 'verdial',
    dador: 'empedrado',
    nombre: 'Papeles',
    intro: 'Un documento ha ido a parar por error a casa de un notario del barrio residencial. El Licenciado lo quiere de vuelta antes de que lo vea quien no debe.',
    minRep: 30,
    requiere: ['la-reportera'],
    pago: 420,
    rep: 10,
    pasos: [
      { tipo: 'recoger', zona: 'residencial', texto: 'Recoge la carpeta de casa del notario' },
      { tipo: 'perder', limite: 90, texto: 'Quitate de encima a quien te sigue' },
      { tipo: 'entregar', zona: 'centro', limite: 80, texto: 'Llevale los papeles al Licenciado' },
    ],
  },
  {
    id: 'lo-que-vio-la-grua',
    faccion: 'amarres',
    dador: 'sacau',
    nombre: 'Lo que vio la grua',
    intro: 'Sacau lo ve todo desde su grua, y esta vez ha visto algo que no se atreve a contar a nadie de Los Amarres: un barco sin luces y una carga sin el sello de la banda.',
    minRep: 28,
    requiere: ['el-hombre-del-traje'],
    pago: 300,
    rep: 7,
    pasos: [
      { tipo: 'ir', zona: 'puerto', texto: 'Reunete con Sacau en los muelles' },
      { tipo: 'seguir', limite: 75, texto: 'Sigue al camion sin sello' },
      { tipo: 'ir', zona: 'industrial', texto: 'Mira donde descarga' },
    ],
  },
  {
    id: 'la-dona-no-duerme',
    faccion: 'verdial',
    nombre: 'La Doña no duerme',
    intro: 'Por primera vez, la Doña te llama de madrugada y la voz no es del todo suave. Algo ha cambiado en sus asuntos. Quiere que traigas al Licenciado a su casa, sin que nadie os siga.',
    minRep: 32,
    requiere: ['papeles'],
    pago: 450,
    rep: 10,
    pasos: [
      { tipo: 'recoger', zona: 'centro', texto: 'Recoge al Licenciado en el hotel' },
      { tipo: 'conducir', zona: 'comercial', limite: 90, texto: 'Llevalo a casa de la Doña sin que os vean' },
    ],
  },
  {
    id: 'el-barrio-no-se-vende',
    faccion: 'rompiente',
    nombre: 'El barrio no se vende',
    intro: 'Chispa ya sabe quien mide su barrio. No sabe para quien trabajan, pero sabe como se les para: una pancarta, una noche, en sus obras.',
    minRep: 32,
    requiere: ['ojos-en-el-barrio'],
    pago: 400,
    rep: 10,
    pasos: [
      { tipo: 'recoger', zona: 'conflictivo', texto: 'Recoge los botes de pintura del Abuelo' },
      { tipo: 'ir', zona: 'industrial', texto: 'Llega a las obras de los cascos' },
      { tipo: 'entregar', zona: 'conflictivo', limite: 90, texto: 'Vuelve al barrio antes de que lleguen los coches' },
    ],
  },
  {
    id: 'ferro-se-harta',
    faccion: 'amarres',
    nombre: 'Ferro se harta',
    intro: 'Ferro esta convencido de que El Consul se ha vendido, y ha dejado de pedir permiso. Te pide que lleves a su gente al muelle sur esta noche, sin que el viejo se entere.',
    minRep: 32,
    requiere: ['lo-que-vio-la-grua'],
    pago: 420,
    rep: 9,
    pasos: [
      { tipo: 'recoger', zona: 'industrial', texto: 'Recoge a la gente de Ferro' },
      { tipo: 'conducir', zona: 'puerto', limite: 80, texto: 'Llevalos al muelle sur sin que lo sepa El Consul' },
    ],
  },
  {
    id: 'un-sobre-para-el-inspector',
    faccion: 'verdial',
    dador: 'empedrado',
    nombre: 'Un sobre para el Inspector',
    intro: 'Un sobre mas grueso que los de siempre, para el Inspector Salaverri. Se entrega en mano y no se explica nada.',
    minRep: 34,
    requiere: ['la-dona-no-duerme'],
    pago: 420,
    rep: 9,
    pasos: [
      { tipo: 'recoger', zona: 'comercial', texto: 'Recoge el sobre del Licenciado' },
      { tipo: 'entregar', zona: 'centro', limite: 90, texto: 'Entregaselo al Inspector Salaverri en mano' },
    ],
  },
  {
    id: 'nadie-se-fia-de-nadie',
    faccion: 'rompiente',
    nombre: 'Nadie se fia de nadie',
    intro: 'Cada banda cree que las otras dos estan detras de lo raro que pasa. Chispa quiere que se miren entre ellas: una nota para cada una.',
    minRep: 34,
    requiere: ['el-barrio-no-se-vende'],
    pago: 380,
    rep: 8,
    pasos: [
      { tipo: 'recoger', zona: 'conflictivo', texto: 'Coge las dos notas de Chispa' },
      { tipo: 'entregar', zona: 'puerto', limite: 90, texto: 'Entregale la primera a El Consul' },
      { tipo: 'entregar', zona: 'centro', limite: 90, texto: 'Y la otra a la Doña' },
    ],
  },
  {
    id: 'la-foto-de-teresa',
    faccion: 'verdial',
    dador: 'teresa',
    nombre: 'La foto de Teresa',
    intro: 'A la periodista le falta una sola cosa: una foto del hombre de fuera con alguien de las tres bandas. Te presta su camara. Que no te vean.',
    minRep: 36,
    requiere: ['un-sobre-para-el-inspector', 'el-hombre-del-traje'],
    pago: 450,
    rep: 6,
    pasos: [
      { tipo: 'ir', zona: 'centro', texto: 'Esperate frente al hotel con la camara de Teresa' },
      { tipo: 'seguir', limite: 80, texto: 'Sigue el coche de Anzures' },
      { tipo: 'ir', zona: 'puerto', texto: 'Llega al muelle: ahi se encontrara con alguien' },
    ],
  },
  {
    id: 'el-primero-en-caer',
    faccion: 'rompiente',
    nombre: 'El primero en caer',
    intro: 'Uno de los de los cascos ha aparecido muerto en un solar del barrio. Chispa no ha sido, y alguien quiere que lo parezca. Un coche se aleja del solar: hay que saber de quien es.',
    minRep: 36,
    requiere: ['nadie-se-fia-de-nadie'],
    pago: 400,
    rep: 9,
    pasos: [
      { tipo: 'ir', zona: 'conflictivo', texto: 'Ve al solar donde ha aparecido el cuerpo' },
      { tipo: 'seguir', limite: 80, texto: 'Sigue el coche que se aleja' },
      { tipo: 'romper', texto: 'Cortale el paso' },
    ],
  },
  {
    id: 'golpe-de-mano',
    faccion: 'amarres',
    nombre: 'Golpe de mano',
    intro: 'Ferro entra esta noche en el despacho del puerto con veinte hombres. Marina saca a quien puede. Tienes que llegar antes que ellos.',
    minRep: 38,
    requiere: ['ferro-se-harta', 'el-hombre-del-traje'],
    pago: 600,
    rep: 12,
    pasos: [
      { tipo: 'conducir', zona: 'puerto', limite: 75, texto: 'Llega al despacho del puerto antes de medianoche' },
      { tipo: 'aguantar', limite: 45, texto: 'Aguanta mientras Marina saca a su gente' },
    ],
  },
  {
    id: 'el-trato',
    faccion: 'verdial',
    nombre: 'El trato',
    intro: 'La Doña va a una reunion de la que depende todo y quiere que la acompañes. No hace falta que hables: hace falta que estes.',
    minRep: 40,
    requiere: ['la-dona-no-duerme', 'papeles', 'un-sobre-para-el-inspector', 'la-foto-de-teresa'],
    pago: 500,
    rep: 14,
    pasos: [
      { tipo: 'recoger', zona: 'centro', texto: 'Recoge a la Doña' },
      { tipo: 'conducir', zona: 'comercial', limite: 90, texto: 'Llevala a la reunion sin llamar la atencion' },
    ],
  },
  {
    id: 'se-sabe',
    faccion: 'amarres',
    dador: 'teresa',
    nombre: 'Se sabe',
    intro: 'Teresa publica a las seis. Antes de esa hora, los tres jefes tienen que tener un ejemplar en la mano. Que lo lean a la vez.',
    minRep: 40,
    requiere: ['golpe-de-mano', 'el-trato', 'el-primero-en-caer', 'la-foto-de-teresa'],
    pago: 700,
    rep: 15,
    pasos: [
      { tipo: 'recoger', zona: 'centro', texto: 'Recoge los ejemplares de Teresa' },
      { tipo: 'entregar', zona: 'puerto', limite: 100, texto: 'El primero, para El Consul' },
      { tipo: 'entregar', zona: 'conflictivo', limite: 100, texto: 'El segundo, para Chispa' },
      { tipo: 'entregar', zona: 'centro', limite: 100, texto: 'Y el ultimo, para la Doña' },
    ],
  },
];
