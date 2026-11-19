// MAREJADA FM — la radio del coche (19-nov-2026). DJ Marejada ya estaba en
// HISTORIA-SANTA-PERDIDA.txt: "comenta lo que pasa en la ciudad sin nombrar
// a nadie directamente". Sale como subtitulo mientras conduces, una frase cada
// medio minuto largo. No hay voces grabadas: como las cinematicas, texto.
//
// Cada linea puede llevar `solo` (las condiciones de core/condiciones.js:
// 'hecha:<mision>', 'muerto:<id>', 'marca'...). Las que tienen `solo` y se
// cumplen salen ANTES que las genericas, y cada una una sola vez por partida:
// son las noticias. Las genericas (ambiente y anuncios) se repiten al azar.
//
// `busca: N`: solo con N estrellas o mas (la radio narra tu persecucion).

export const RADIO = {
  nombre: 'MAREJADA FM',

  ambiente: [
    'Buenas noches, Santa Perdida. Aquí Marejada, la única voz de esta ciudad que no cobra de nadie. Bueno, casi.',
    'Tráfico: atasco en la Gran Vía, como siempre. Y un tío en calzoncillos corriendo por el puerto, como casi siempre.',
    'Dicen que en esta ciudad nadie pregunta de dónde vienes. Yo pregunto. Por eso me han rayado el coche tres veces este mes.',
    'El tiempo para mañana: sol, levante y alguna bala perdida en el barrio alto. Coged chaqueta.',
    'Una oyente pregunta si es verdad que la santa sigue en el fondo de la bocana. Señora, en el fondo de la bocana hay de todo menos santos.',
    'Si vais por el polígono de noche, no paréis en los semáforos. Os lo dice alguien que paró una vez.',
    'Me llaman para decirme que hay un coche ardiendo en el centro. Gracias, amigo, pero eso no es noticia. Es martes.',
    'Recordad: en Santa Perdida la policía tarda siete minutos en llegar. Si pagas, cuatro. Si eres de los que pagan, no llega.',
    'Seguimos con música. Bueno, no tenemos música, que no hemos pagado los derechos. Seguimos con mi voz, que es gratis.',
    'Un saludo a los chavales del barrio alto, a los del muelle y a los señores del centro. Que esta noche nadie mate a nadie. Ya, ya sé.',
  ],

  anuncios: [
    'POLLOS CLUCK. Pollo frito de verdad, de pollos que no sabían lo que les esperaba. Pollos Cluck: no preguntes de dónde viene.',
    'CASINO FORTUNA. Entra con un sueldo y sal con una historia. La casa siempre gana, pero tú puedes salir en la foto.',
    '¿Te han reconocido el coche? TALLER DE PINTURA: un color nuevo, una vida nueva y ninguna pregunta. Pregunta por Puro.',
    'EL TERCIOPELO. Copas, compañía y discreción absoluta. Lo que pasa arriba, se queda arriba. Zona comercial, abierto hasta que amanezca.',
    'TIENDA 24H. Botiquines, tabaco, condones y cinta americana. Todo lo que necesitas para una noche cualquiera en Santa Perdida.',
    'GIMNASIO DEL CENTRO. Porque en esta ciudad, si no corres, te pillan. Y si no pegas, te pegan. Primera semana gratis.',
    '¿Sin gasolina en mitad de una persecución? Las GASOLINERAS de Santa Perdida: lleno o media, tú decides. Prohibido disparar a los surtidores. En serio.',
  ],

  // noticias: salen una vez, en cuanto se cumple lo que piden
  noticias: [
    { solo: 'hecha:primer-recado', texto: 'Se habla de una cara nueva en el puerto. Llegó en el último autobús, no dice cómo se llama y ya hace recados para el Cónsul. Bienvenido, forastero.' },
    { solo: 'hecha:sin-testigos', texto: 'Han sacado un coche del fondo del puerto. Dentro no había nadie. Su dueño dice que no sabe nada. Su dueño, por cierto, ya no habla de Casa Verdial.' },
    { solo: 'hecha:lo-que-hizo-renco', texto: 'Un chaval del barrio alto se ha ido de la ciudad sin despedirse. En Los Rompientes nadie dice su nombre. Eso, allí, es peor que un entierro.' },
    { solo: 'hecha:ultimo-viaje', texto: 'Persecución de película por media ciudad con un camión del puerto. La policía dice que lo tenía controlado. La policía dice muchas cosas.' },
    { solo: 'hecha:la-chica-nueva', texto: 'Un barco llamado Poniente III ha salido del puerto a toda prisa esta madrugada. Alguien ha perdido algo. O a alguien.' },
    { solo: 'hecha:el-barrio-no-se-vende', texto: 'Tres metros de letras en las obras del polígono: «EL BARRIO NO SE VENDE». Los obreros dicen que no las vieron pintar. Los obreros cobran por no ver.' },
    { solo: 'hecha:el-primero-en-caer', texto: 'Aparece un hombre muerto en un solar del barrio alto. Trabajaba para una empresa de fuera que mide calles. La policía ya tiene culpable. Antes de investigar.' },
    { solo: 'muerto:ferro', texto: 'Silencio esta noche en el muelle sur. Se ha ido uno de los de antes, de los que no se doblaban. Que la marea le sea leve.' },
    { solo: 'muerto:sacau', texto: 'La grúa del puerto lleva dos días parada. Su gruista no va a volver. Desde allí arriba se veía toda la ciudad. Ahora no la ve nadie.' },
    { solo: 'hecha:se-sabe', texto: 'Última hora: un periódico cuenta que un consorcio de fuera lleva treinta años comprando Santa Perdida por trozos. Si alguien tenía dudas de por qué nos va así, ya no las tiene.' },
    { solo: 'camino-rompiente', texto: 'El barrio alto amanece con barricadas. Contenedores, coches cruzados y chavales con la cara tapada. Hacía cuarenta años que no se veía esto. El Abuelo dice que entonces aguantaron once días.' },
    { solo: 'camino-amarres', texto: 'Cambio de mando en el puerto. Dicen que ahora manda una mujer, y que los barcos vuelven a entrar con luces. Lo que llevan, eso ya no lo dice nadie.' },
    { solo: 'camino-verdial', texto: 'Casa Verdial no hace declaraciones. Casa Verdial nunca hace declaraciones. Pero esta semana ha dejado de no hacerlas con una sonrisa.' },
    { solo: 'camino-consorcio', texto: 'Excavadoras en Los Rompientes. Una empresa de fuera dice que es «regeneración urbana». Los vecinos dicen otra palabra, que no puedo decir por la radio.' },
    { solo: 'muerto:chispa', texto: 'Esta noche no hay chistes. El barrio alto ha perdido a su chaval. Tenía veintitrés años. Pon la radio alta, Nando, estés donde estés.' },
    { solo: 'muerto:consul', texto: 'Ha muerto Baltasar Roig, el Cónsul. Treinta años mandando en el puerto. Llamaba socio a todo el mundo. Hoy media ciudad se siente un poco menos socia de algo.' },
    { solo: 'flag:historiaAcabada', texto: 'Santa Perdida sigue aquí. Con sus tres casas, sus barcos y su santa que nunca llegó. Y con alguien que ya no le debe nada a nadie. Buenas noches.' },
  ],

  // la radio te narra en directo cuando la cosa se pone fea
  persecucion: [
    { busca: 3, texto: '¡Atención! Persecución en directo por las calles de Santa Perdida. Si estáis en la calle, apartaos. Si estáis en el coche perseguido... buena suerte, chaval.' },
    { busca: 4, texto: 'Esto ya no es una persecución, es una guerra. Helicóptero no tenemos, pero desde la azotea de la emisora se ven las sirenas. Madre mía.' },
    { busca: 5, texto: 'Me dicen que hay medio cuerpo de policía detrás de un solo coche. Sea quien seas: o eres muy bueno o eres muy idiota. Probablemente las dos cosas.' },
  ],
};
