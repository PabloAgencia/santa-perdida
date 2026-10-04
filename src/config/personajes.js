// EL REPARTO DE SANTA PERDIDA (HISTORIA-SANTA-PERDIDA.txt, "EL REPARTO").
//
// Pablo (4-oct-2026): "dales nombres y personalidad... que tengan su nombre,
// su personalidad y todo bien trabajado". Cada uno tiene:
//   nombre     el de verdad, con apellidos (sale debajo de la placa)
//   alias      como le llama la ciudad (la placa grande del dialogo)
//   edad, banda, oficio
//   historia   de donde viene
//   caracter   como es y como habla (lo mismo que "COMO HABLA CADA UNO"
//              en la biblia: si se cambia aqui, se cambia alli)
//   quiere     lo que le mueve
//   esconde    lo que no cuenta (lo que la historia ira destapando)
//   voz        el tono de los pitidos al hablar
//   + los rasgos del retrato dibujado por codigo
//
// EL RETRATO: si hay una imagen de IA `retrato-<id>` cargada (arte/), manda
// ella. Si no, CinematicaScene lo dibuja con estos rasgos:
//   piel, ropa       colores
//   pelo             corto | largo | rapado | calvo | canoso | coleta | mono | peinado
//   colorPelo
//   barba, bigote    color, o nada
//   gafas            true/false
//   extra            perlas | cadena | gorra (un detalle que lo distinga)
//
// `presentado`: los que ya salen en alguna cinematica. Los demas estan
// escritos para los actos que vienen, para que cuando aparezcan sean ya
// quienes tienen que ser.

export const PERSONAJES = {
  // ------------------------------------------------------------ LOS AMARRES
  consul: {
    nombre: 'Baltasar Roig', alias: 'El Cónsul', edad: 64, banda: 'amarres',
    oficio: 'Jefe de Los Amarres, el puerto',
    historia: 'Empezó descargando cajas en el mismo muelle que hoy manda. Lleva treinta años haciendo que por el puerto de Santa Perdida entre y salga de todo, y que nadie pueda demostrar nada.',
    caracter: 'Trata de usted a todo el mundo y llama «socio» hasta a quien está a punto de hundir. Habla despacio, como si cada frase fuera un tratado. Cuando se enfada, acorta las frases.',
    quiere: 'Retirarse con el puerto entero en manos de su familia.',
    esconde: 'Está cerrando un trato con gente de fuera a espaldas de todos, incluida su hija.',
    voz: 150, presentado: true,
    piel: 0xd8b48c, ropa: 0x2a3a48, pelo: 'canoso', colorPelo: 0xc8c4bc, bigote: 0xc8c4bc,
  },
  marina: {
    nombre: 'Marina Roig', alias: 'Marina', edad: 36, banda: 'amarres',
    oficio: 'La que lleva Los Amarres de verdad',
    historia: 'Hija única del Cónsul. Estudió fuera, volvió por él y lleva diez años haciendo el trabajo: las rutas, los pagos, saber dónde está enterrado cada muerto.',
    caracter: 'Seca, pocas palabras, siempre la pregunta incómoda. Desconfía de todo el que trae su padre, y últimamente desconfía de su padre.',
    quiere: 'Que Los Amarres sobrevivan a su padre. Con él o sin él.',
    esconde: 'Ya sabe que su padre negocia con alguien de fuera, y no le ha dicho que lo sabe.',
    voz: 270, presentado: true,
    piel: 0xc9a882, ropa: 0x2f5a52, pelo: 'largo', colorPelo: 0x241c14,
  },
  ferro: {
    nombre: 'Ramiro Sotelo', alias: 'Ferro', edad: 44, banda: 'amarres',
    oficio: 'Capataz de los muelles',
    historia: 'Veinte años partiéndose la espalda y alguna cara por el Cónsul. Le llaman Ferro porque nunca se dobla, ni con las grúas ni con los golpes.',
    caracter: 'Bruto y directo, tutea a todo el mundo y amenaza sin rodeos. Cree que el puerto se gana a la antigua, no en despachos.',
    quiere: 'Heredar Los Amarres antes que Marina.',
    esconde: 'Ya vende por su cuenta a compradores que el Cónsul no conoce.',
    voz: 110, presentado: true,
    piel: 0xa07b55, ropa: 0x4a5b6b, pelo: 'rapado', colorPelo: 0x14100c, barba: 0x1d1610,
  },
  sacau: {
    nombre: 'Anselmo Sacau', alias: 'Sacau', edad: 57, banda: 'amarres',
    oficio: 'Gruista del puerto',
    historia: 'Treinta años en la cabina de la grúa grande. Desde allí arriba lo ve todo, y lo que ve, lo vende.',
    caracter: 'Cotilla, gracioso, charlatán. Nunca da nada gratis, pero sus pistas son siempre ciertas.',
    quiere: 'Jubilarse con algo ahorrado y sin enemigos.',
    esconde: 'Vio descargar algo que no era de Los Amarres, y tiene miedo de lo que significa.',
    voz: 190, presentado: false,
    piel: 0xc9a882, ropa: 0xc8862a, pelo: 'calvo', colorPelo: 0x6b6257, bigote: 0x4a3e30, extra: 'gorra',
  },

  // ------------------------------------------- LA CUADRILLA DEL ROMPIENTE
  chispa: {
    nombre: 'Nando Écija', alias: 'Chispa', edad: 23, banda: 'rompiente',
    oficio: 'Jefe de la Cuadrilla del Rompiente',
    historia: 'Nació en el barrio alto cuando ya habían cerrado las fábricas. Se quedó con la cuadrilla cuando se fue todo el que podía permitírselo. No manda por ser el más duro: manda porque todos le siguen sin que lo pida.',
    caracter: 'De barrio, de tú, con chiste para todo, hasta que algo le toca de cerca. Ahí se le rompe la voz.',
    quiere: 'Que nadie eche a su gente del barrio.',
    esconde: 'Su punto débil es la lealtad: alguien la está usando contra él.',
    voz: 230, presentado: true,
    piel: 0xc9a882, ropa: 0xd97a3f, pelo: 'corto', colorPelo: 0x3d2a18, extra: 'cadena',
  },
  vale: {
    nombre: 'Valeria Morón', alias: 'Vale', edad: 23, banda: 'rompiente',
    oficio: 'La mano derecha de Chispa',
    historia: 'Amiga de Chispa desde el colegio. Si la cuadrilla sigue fuera de la cárcel, es casi siempre por ella.',
    caracter: 'La cabeza fría. Hechos y consecuencias, sin adornos. Es la primera en oler que algo no cuadra.',
    quiere: 'Que Chispa piense antes de actuar, aunque sea una vez.',
    esconde: 'Hace tiempo que sospecha que alguien de fuera mueve los hilos del barrio.',
    voz: 290, presentado: true,
    piel: 0x8c6a4a, ropa: 0x7a3a22, pelo: 'coleta', colorPelo: 0x14100c,
  },
  abuelo: {
    nombre: 'Custodio Ferrán', alias: 'El Abuelo', edad: 69, banda: 'rompiente',
    oficio: 'El veterano del barrio alto',
    historia: 'Trabajó en la fábrica de redes hasta que la cerraron. Fue de una banda que ya no existe y de una ciudad que tampoco. Ya no pelea, pero se acuerda de todo.',
    caracter: 'Melancólico y cariñoso. Habla siempre del barrio de antes y nunca da órdenes: cuenta historias, y que cada uno saque la suya.',
    quiere: 'Que los chavales no acaben como acabó su generación.',
    esconde: 'Sabe quién compró los terrenos de la fábrica cuando cerró, y nunca se lo ha contado a nadie.',
    voz: 120, presentado: true,
    piel: 0xc9a882, ropa: 0x5a4a3a, pelo: 'calvo', colorPelo: 0xd8d4cc, bigote: 0xe8e4dc,
  },
  renco: {
    nombre: 'Iván Renco', alias: 'Renco', edad: 20, banda: 'rompiente',
    oficio: 'Chaval de la cuadrilla',
    historia: 'Entró en la cuadrilla con quince años. Chispa le enseñó a robar su primera moto. Siempre ha querido más de lo que el barrio le puede dar.',
    caracter: 'Nervioso, se le traba la lengua, se justifica antes de que le acusen.',
    quiere: 'Salir del barrio con dinero en el bolsillo.',
    esconde: 'Vendía los movimientos de Chispa a gente de fuera del barrio.',
    voz: 250, presentado: true,
    piel: 0xd8b48c, ropa: 0x7a8a9a, pelo: 'corto', colorPelo: 0x6b4a2a, extra: 'gorra',
  },

  // ---------------------------------------------------------- CASA VERDIAL
  dona: {
    nombre: 'Adelina Verdial', alias: 'La Doña', edad: 62, banda: 'verdial',
    oficio: 'Jefa de Casa Verdial',
    historia: 'Tercera generación de Verdial en el centro. Heredó el dinero, los contratos y la costumbre de cobrar protección como quien cobra un alquiler: con papeles y sonrisas.',
    caracter: 'Trata de usted, ofrece café, nunca levanta la voz. Dice lo peor con la voz más suave y nunca pronuncia una amenaza con todas sus letras.',
    quiere: 'No perder nada de lo que heredó.',
    esconde: 'Está atrapada en un trato con alguien más grande que ella.',
    voz: 205, presentado: true,
    piel: 0xe0c19c, ropa: 0x4a2f6a, pelo: 'mono', colorPelo: 0x9a9690, extra: 'perlas',
  },
  maximo: {
    nombre: 'Máximo Verdial', alias: 'Máximo', edad: 31, banda: 'verdial',
    oficio: 'El hijo de la Doña',
    historia: 'Criado entre colegios caros y conversaciones a media voz. Lleva toda la vida esperando su turno.',
    caracter: 'Impaciente, arrogante, de usted cuando le conviene. Cree que su madre se ha vuelto lenta.',
    quiere: 'Tomar el puerto por la fuerza y demostrar que vale.',
    esconde: 'Ha hablado con gente que su madre no sabe que conoce.',
    voz: 215, presentado: false,
    piel: 0xe0c19c, ropa: 0x2a2a3a, pelo: 'peinado', colorPelo: 0x3d2a18,
  },
  empedrado: {
    nombre: 'Gonzalo Empedrado', alias: 'El Licenciado', edad: 54, banda: 'verdial',
    oficio: 'Abogado y hombre de confianza de la Doña',
    historia: 'Treinta años redactando los contratos de Casa Verdial. Nunca ha perdido un juicio, porque nunca ha dejado que llegue a haber uno.',
    caracter: 'De usted, frases de abogado: «por las vías adecuadas», «no nos llame». Todo para que nada quede en un papel.',
    quiere: 'Seguir siendo imprescindible.',
    esconde: 'Es él quien de verdad negocia con el hombre de fuera.',
    voz: 175, presentado: true,
    piel: 0xd8b48c, ropa: 0x24262c, pelo: 'peinado', colorPelo: 0x241c14, gafas: true,
  },
  salaverri: {
    nombre: 'Julián Salaverri', alias: 'El Inspector', edad: 50, banda: 'policia',
    oficio: 'Inspector de la comisaría central',
    historia: 'Llegó a Santa Perdida queriendo limpiarla. Hace doce años que cobra de Casa Verdial por mirar hacia otro lado.',
    caracter: 'Cansado, cínico, educado. Se cree mejor que los que le pagan.',
    quiere: 'Llegar a la jubilación sin que nadie tire de la manta.',
    esconde: 'Guarda una libreta con cada sobre que ha cobrado. Por si acaso.',
    voz: 160, presentado: false,
    piel: 0xc9a882, ropa: 0x3a4a5a, pelo: 'canoso', colorPelo: 0x8a8680, bigote: 0x6b6257,
  },

  // ------------------------------------------------------- EL HOMBRE DE FUERA
  anzures: {
    nombre: 'Íñigo Anzures', alias: 'El señor Anzures', edad: 48, banda: 'fuera',
    oficio: 'Consorcio Poniente',
    historia: 'Nadie en Santa Perdida sabe de dónde viene. Representa a un grupo inversor que quiere comprar el puerto entero y «poner en valor» el barrio alto.',
    caracter: 'Trajeado, educadísimo, jamás se mancha las manos. Habla de la ciudad como de una hoja de cálculo.',
    quiere: 'Quedarse con Santa Perdida sin disparar un solo tiro.',
    esconde: 'Paga a las tres bandas para que se destrocen entre ellas.',
    voz: 165, presentado: false,
    piel: 0xe0c19c, ropa: 0x1a1d24, pelo: 'peinado', colorPelo: 0x15120e,
  },

  // ------------------------------------------------------- LA CIUDAD DE TODOS
  puro: {
    nombre: 'Amador Lozano', alias: 'Puro', edad: 58, banda: 'neutral',
    oficio: 'Mecánico del taller de pintura',
    historia: 'Lleva la grasa incrustada en las manos desde los quince años. Ha pintado coches para las tres bandas sin preguntar nunca de dónde venían.',
    caracter: 'Gruñón y sabio. Juzga a la gente por cómo trata un coche: «un coche bien llevado dura».',
    quiere: 'Que le dejen trabajar en paz.',
    esconde: 'Reconoce cada coche robado que entra por su puerta.',
    voz: 135, presentado: false,
    piel: 0xa07b55, ropa: 0x2f4a63, pelo: 'canoso', colorPelo: 0x8a8680, barba: 0x6b6257,
  },
  teresa: {
    nombre: 'Teresa Alba', alias: 'La periodista', edad: 33, banda: 'neutral',
    oficio: 'Periodista por libre',
    historia: 'Dejó un periódico grande para investigar por su cuenta quién compra terrenos en Santa Perdida sin dar la cara.',
    caracter: 'Lista, tenaz, rápida hablando. No trabaja para nadie y no se deja asustar.',
    quiere: 'Publicar el reportaje que nadie quiere que publique.',
    esconde: 'Tiene una fuente dentro de Casa Verdial.',
    voz: 260, presentado: false,
    piel: 0xd8b48c, ropa: 0x6a5a48, pelo: 'largo', colorPelo: 0x8a5a2a, gafas: true,
  },
  remedios: {
    nombre: 'Remedios Galán', alias: 'La del faro', edad: 77, banda: 'neutral',
    oficio: 'Vive sola en el faro',
    historia: 'Viuda del último farero. Se quedó en el faro cuando lo automatizaron y nadie se atrevió a echarla. Ve todo lo que entra al puerto de noche.',
    caracter: 'Lenta, irónica, con muy buena memoria. Nadie la busca; quien la encuentra sale con algo que nadie más podía darle.',
    quiere: 'Morir en su faro.',
    esconde: 'Lleva años apuntando cada barco que entra sin luces.',
    voz: 180, presentado: false,
    piel: 0xe0c19c, ropa: 0x3a4a5a, pelo: 'mono', colorPelo: 0xe8e4dc,
  },
  pregonero: {
    nombre: 'Paco Iturbe', alias: 'El Pregonero', edad: 61, banda: 'neutral',
    oficio: 'Puesto del mercado cubierto',
    historia: 'Vende de todo un poco en el mercado. Se entera de los rumores antes que nadie, porque todo el mundo le compra algo.',
    caracter: 'Voceras, simpático, interesado. El primero en enterarse y el último en contarlo si no le conviene.',
    quiere: 'Estar a bien con todos.',
    esconde: 'Le debe dinero a Casa Verdial.',
    voz: 200, presentado: false,
    piel: 0xc9a882, ropa: 0x8a3a2a, pelo: 'corto', colorPelo: 0x4a4a4a, bigote: 0x3a3a3a,
  },
  duque: {
    nombre: 'Fermín Lasarte', alias: 'El Duque', edad: 52, banda: 'verdial',
    oficio: 'Dueño de El Terciopelo',
    historia: 'Abrió el club hace quince años en terreno de Casa Verdial y paga protección como todos. La Doña mueve por sus cuentas el dinero que no quiere en las suyas.',
    caracter: 'Encantador con quien le conviene, más anillos que dedos, nunca pierde la sonrisa delante de un cliente.',
    quiere: 'Que su negocio siga siendo el único de la ciudad.',
    esconde: 'Sabe más de las cuentas de la Doña que la propia Doña.',
    voz: 185, presentado: false,
    piel: 0xc9a882, ropa: 0x5a1a3a, pelo: 'peinado', colorPelo: 0x15120e, bigote: 0x15120e, extra: 'cadena',
  },
};

// el color de la placa de cada banda (el `accent` de config/factions.js)
export const COLOR_BANDA = {
  amarres: 0x49b39c,
  rompiente: 0xd97a3f,
  verdial: 0x9a7ac4,
  policia: 0x5a8fd0,
  fuera: 0xc8c4bc,
  neutral: 0xc8a465,
};

export const NOMBRE_BANDA = {
  amarres: 'Los Amarres', rompiente: 'Cuadrilla del Rompiente', verdial: 'Casa Verdial',
  policia: 'Policía de Santa Perdida', fuera: 'Consorcio Poniente', neutral: 'La ciudad',
};

// Pricedown no tiene tildes: para las placas y los titulos
export const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, (m, i, s) => (s[i - 1] === 'n' || s[i - 1] === 'N') && m === '̃' ? m : '').normalize('NFC');
