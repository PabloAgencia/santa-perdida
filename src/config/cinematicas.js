// LAS CINEMATICAS (APUNTES G1: "al dar a nueva partida que salga algo de la
// historia: cinematicas, dialogos... darle mas aire de videojuego").
//
// Una cinematica es una lista de PLANOS que CinematicaScene pasa de uno en
// uno (ENTER o clic: termina de escribir la frase / pasa a la siguiente;
// ESC: se salta entera). Cada plano es uno de estos:
//   { fondo, quien, texto }   alguien habla (PERSONAJES en personajes.js)
//   { fondo, texto }          sin `quien`: la voz del narrador, sin retrato
//   { fondo, titulo, sub }    un cartel grande, como los de los GTA
// `fondo` es un decorado (ciudad, carretera, muelle, barrio, despacho): si
// hay una imagen de IA `cine-<fondo>` cargada manda ella; si no, se dibuja
// por codigo. Si un plano no trae fondo, se queda el del anterior.
//
// LOS TEXTOS LLEVAN TILDES: el dialogo va en una fuente que las tiene
// (Georgia). Los `titulo` van en Pricedown, que NO las tiene: ahi, sin.
//
// COHERENCIA (pedido de Pablo, 4-oct: "que siga un hilo, los personajes, la
// historia de cada uno y su personalidad"). Todo sale de
// HISTORIA-SANTA-PERDIDA.txt, y cada personaje habla siempre igual (ver alli
// "COMO HABLA CADA UNO"): El Consul llama "socio" a todo el mundo y habla
// como en un tratado; Marina, seca y de su padre desconfia cada vez mas;
// Ferro, bruto y directo; Chispa, de barrio y de tu; Vale, la cabeza fria;
// el Abuelo, la memoria del barrio; La Doña trata de usted y nunca sube la
// voz; Empedrado, frases de abogado. Cero no habla nunca.
//
// EL HILO que siembran estas trece (para que las que vengan lo recojan):
//   · El Consul tiene un trato con "gente de fuera" que paga el triple, y
//     Marina empieza a notarlo (carrera-muelle, ultimo-viaje).
//   · Ferro cree que el viejo se ha ablandado y juega por su cuenta
//     (la-duda-de-ferro): es la semilla del golpe de mano del Acto 3.
//   · Renco vendia a "los de fuera" (el-soplon, lo-que-hizo-renco).
//   · La Doña mira el puerto con ganas (bien-llevado): la primera pista de
//     su plan, que en el Acto 3 resultara no ser solo suyo (Anzures).

export const CINEMATICAS = {
  // ---------------------------------------------------------------------
  // EL PROLOGO: la primera vez que se empieza una partida de cero
  // ---------------------------------------------------------------------
  prologo: [
    { fondo: 'ciudad', texto: 'Santa Perdida. Nadie recuerda ya el nombre de la santa que se hundió en la bocana la noche antes de bendecir el pueblo.' },
    { texto: 'Sin santa que perder, alguien dijo «pues que se llame Santa Perdida». Y desde entonces la ciudad le reza a una santa que nunca llegó. Por si acaso.' },
    { fondo: 'carretera', texto: 'Llegas en el último autobús de la costa. Una bolsa, unos billetes arrugados y nada que contar.' },
    { texto: 'Alguien te dijo una vez que en el puerto de Santa Perdida siempre hay trabajo para quien no hace preguntas.' },
    { fondo: 'muelle', quien: 'ferro', texto: 'Eh, tú. Aquí no se pasea. ¿Te ha mandado alguien?' },
    { quien: 'consul', texto: 'Déjalo, Ferro. Si lo hubiera mandado alguien, no vendría con esa cara de no tener dónde dormir.' },
    { quien: 'consul', texto: 'Mire, socio: en esta ciudad mandan tres casas. El puerto es mío. El barrio alto es de unos chavales con más hambre que cabeza.' },
    { quien: 'consul', texto: 'Y el centro... el centro es de una señora que nunca levanta la voz. Recuérdelo bien: esa es la que más miedo da.' },
    { quien: 'consul', texto: 'Ninguna de las tres le va a preguntar de dónde viene mientras trabaje. Dígame, ¿cómo se llama?' },
    { texto: 'No contestas.' },
    { quien: 'consul', texto: 'Como quiera. Aquí todos empezamos en cero.' },
    { quien: 'ferro', texto: 'Cero. Le pega.' },
    { quien: 'consul', texto: 'Dese una vuelta, Cero. Conozca la ciudad. Cuando quiera trabajar, a mí me encontrará en el puerto. A los otros dos ya los irá conociendo, cada uno en lo suyo.' },
    { fondo: 'ciudad', titulo: 'SANTA PERDIDA', sub: 'Aquí nadie pregunta de dónde vienes' },
  ],

  // ---------------------------------------------------------------------
  // ANTES DE CADA MISION: lo que te cuenta quien te da el encargo. La clave
  // es el `id` de la mision (config/missions.js). La que no tenga aqui su
  // dialogo usa su `intro` en boca del jefe (MissionSystem.dialogoDe).
  // Cada dialogo cuadra con los PASOS reales de su mision: si se cambia un
  // paso (la zona, lo que hay que hacer), se cambia tambien aqui.
  // ---------------------------------------------------------------------

  // ACTO 1 — "SIN PREGUNTAS"
  'primer-recado': [
    { fondo: 'muelle', quien: 'consul', texto: 'Cero. Puntual, eso me gusta. La puntualidad es la única virtud que no se puede fingir, socio.' },
    { quien: 'consul', texto: 'Hay un fardo en el puerto que no tiene papeles. Ni los va a tener.' },
    { quien: 'consul', texto: 'Llévelo al almacén del polígono. No lo abra, no corra más de la cuenta y no se pare a hablar con nadie.' },
    { quien: 'marina', texto: 'Papá, ¿otro de la calle?' },
    { quien: 'consul', texto: 'Otro que no conoce a nadie, hija. Por eso sirve.' },
  ],
  'coche-limpio': [
    { fondo: 'muelle', quien: 'consul', texto: 'La policía de esta ciudad tiene muy buena memoria para las matrículas, socio. Para las caras, no tanto.' },
    { quien: 'consul', texto: 'Necesito un coche que no esté fichado. Cójalo en la zona comercial y déjemelo en el muelle sin un arañazo.' },
    { quien: 'ferro', texto: 'Y si lo rayas, lo pagas. Aquí las cosas se devuelven como se dan.' },
  ],
  'aviso-rompiente': [
    { fondo: 'barrio', quien: 'chispa', texto: 'Así que tú eres el nuevo del Cónsul. Tranquilo, aquí no muerde nadie. Casi nadie.' },
    { quien: 'chispa', texto: 'Hay un pijo del centro que se pasea por mi barrio con su cochazo para que le vean. Como si esto fuera suyo.' },
    { quien: 'chispa', texto: 'Luego lo aparca en el centro, donde se cree que no le toca nadie. Ahí es donde le vas a dar el recado.' },
    { quien: 'vale', texto: 'Si se lo rompe uno de los nuestros, mañana tenemos a Casa Verdial en la puerta.' },
    { quien: 'chispa', texto: 'Por eso se lo rompes tú. Tú no eres de nadie. Destrózalo y piérdete.' },
  ],
  'corre-chaval': [
    { fondo: 'barrio', quien: 'chispa', texto: 'Uno de mis chavales se ha puesto chulo con quien no debía. Ahora le buscan.' },
    { quien: 'chispa', texto: 'Sácalo del barrio un par de días. A ti no te sigue nadie.' },
    { quien: 'abuelo', texto: 'En mis tiempos los chavales se escondían en las fábricas. Ya no quedan fábricas. Ni para eso.' },
  ],
  'cobro-verdial': [
    { fondo: 'despacho', quien: 'dona', texto: 'Siéntese, por favor. ¿Un café? No, claro. Usted ha venido a trabajar.' },
    { quien: 'dona', texto: 'Casa Verdial cobra un pequeño alquiler por la tranquilidad de sus vecinos. Nada que no se pueda pagar con una sonrisa.' },
    { quien: 'dona', texto: 'Son dos sobres. Uno en la zona comercial y otro aquí, en el centro. Tráigamelos sin abrir y sin discutir con nadie.' },
    { quien: 'empedrado', texto: 'Si alguien se niega, no insista. Apúntelo. Del resto ya nos ocupamos nosotros, por las vías adecuadas.' },
  ],
  'sin-testigos': [
    { fondo: 'despacho', quien: 'dona', texto: 'Hay un hombre que habla demasiado de cosas que no entiende. Sobre todo, de mí.' },
    { quien: 'dona', texto: 'No quiero que le pase nada. Quiero que su coche aparezca en el fondo del puerto. Él ya entenderá el mensaje.' },
    { quien: 'dona', texto: 'Y después desaparezca usted un rato. Es más elegante.' },
  ],

  // ACTO 2 — "TRES BANDAS, UNA CIUDAD"
  'carrera-muelle': [
    { fondo: 'muelle', quien: 'consul', texto: 'Llegamos tarde, Cero. Y yo no llego tarde nunca.' },
    { quien: 'consul', texto: 'Hay un paquete en el polígono que tenía que estar en el barrio alto hace veinte minutos.' },
    { quien: 'marina', texto: 'Lo ha pedido gente de fuera, papá. ¿Desde cuándo trabajamos para gente de fuera?' },
    { quien: 'consul', texto: 'Desde que pagan el triple, hija. Corra, socio.' },
  ],
  'el-soplon': [
    { fondo: 'barrio', quien: 'chispa', texto: 'Alguien de mi cuadrilla le cuenta mis cosas a gente que no es del barrio.' },
    { quien: 'vale', texto: 'Renco lleva una semana con zapatillas nuevas. Y nadie le ha visto currar.' },
    { quien: 'chispa', texto: 'No me lo quiero creer. Síguele. Si se va a ver con alguien, córtale el paso antes de que llegue.' },
  ],
  aguanta: [
    { fondo: 'despacho', quien: 'dona', texto: 'Necesito que esté usted en un sitio a una hora concreta. Y que se quede allí.' },
    { quien: 'dona', texto: 'No le voy a decir lo que va a pasar. Si se lo dijera, no iría.' },
    { quien: 'empedrado', texto: 'Sesenta segundos. Después, si sigue usted entero, váyase rápido. Y no nos llame.' },
  ],
  'la-duda-de-ferro': [
    { fondo: 'muelle', quien: 'ferro', texto: 'Eh, Cero. Antes de subir al despacho, una cosa.' },
    { quien: 'ferro', texto: 'El viejo se ha vuelto blando. Negocia con gente de traje y a nosotros nos dice que esperemos.' },
    { quien: 'ferro', texto: 'Llévale esto a un comprador mío. Sin pasar por el despacho. Si el Cónsul se entera, sabré quién ha hablado.' },
  ],
  'lo-que-hizo-renco': [
    { fondo: 'barrio', quien: 'vale', texto: 'Renco no hablaba de más, Chispa. Vendía. Por su culpa se perdió un cargamento entero del Cónsul.' },
    { quien: 'chispa', texto: 'Era mi amigo. Le enseñé a robar su primera moto.' },
    { quien: 'renco', texto: 'Chispa, te lo juro, me obligaron... Eran de fuera, tío. De fuera.' },
    { quien: 'chispa', texto: 'No quiero sangre en el barrio. Lo quiero fuera de Santa Perdida esta noche. Y que no vuelva nunca.' },
    { quien: 'chispa', texto: 'Llévatelo, Cero. Antes de que cambie de idea.' },
  ],
  'bien-llevado': [
    { fondo: 'despacho', quien: 'dona', texto: '¿Ve usted el puerto desde aquí? Precioso. Y tan mal aprovechado...' },
    { quien: 'dona', texto: 'Todo eso, bien llevado, valdría mucho más.' },
    { quien: 'dona', texto: 'Me gustaría saber cuánto se mueve por esos muelles cada semana. Por curiosidad. Y que en el puerto nadie sepa quién pregunta.' },
  ],
  'ultimo-viaje': [
    { fondo: 'muelle', quien: 'consul', texto: 'Se acabaron los rodeos, socio. Alguien de esta ciudad quiere que mi trato salga mal.' },
    { quien: 'marina', texto: 'Le han dado el chivatazo a la policía. Saben qué camión y saben a qué hora.' },
    { quien: 'consul', texto: 'Pues que vean otro camión. Cargue la mercancía y cruce la ciudad. Media Santa Perdida le va a estar buscando.' },
    { quien: 'consul', texto: 'Si llega, Cero, hablaremos de cosas más grandes.' },
  ],

  // =====================================================================
  // CIERRE DEL ACTO 2 — lo que Marina, Vale y el Licenciado dejan caer
  // (las claves '<id>:fin' salen al CUMPLIR la mision: MissionSystem.completar)
  // =====================================================================
  'cuentas-claras': [
    { fondo: 'muelle', quien: 'marina', texto: 'Cero. Ven por aquí, que no nos vea nadie.' },
    { quien: 'marina', texto: 'Llevo diez años haciendo estos libros. Hay tres entradas que no son mías: cantidades que no corresponden a ningún barco.' },
    { quien: 'marina', texto: 'Mi padre dice que es «cosa de socios». ¿Desde cuándo tiene socios?' },
    { quien: 'marina', texto: 'Saca los libros de la oficina del muelle y tráemelos al almacén. Mañana serán otros números.' },
    { quien: 'marina', texto: 'Si me equivoco, me habré pasado de lista. Si no me equivoco, tendré que decidir de qué lado estoy.' },
  ],
  'cuentas-claras:fin': [
    { fondo: 'muelle', quien: 'marina', texto: 'Tres cargas en tres meses. Cada una pagó el triple de lo normal y ninguna pasó por la aduana.' },
    { quien: 'marina', texto: 'Y ya no es solo tabaco y licor, Cero. Es polvo. Droga. Mi padre juró que esa mercancía no entraría jamás por su puerto.' },
    { quien: 'marina', texto: 'No está vendiendo mercancía. Está vendiendo el puerto, a plazos.' },
    { quien: 'marina', texto: 'Ni una palabra de esto. A Ferro, menos que a nadie.' },
  ],

  'vale-toma-cartas': [
    { fondo: 'barrio', quien: 'vale', texto: 'Chispa no sabe que estás aquí. Y va a seguir sin saberlo.' },
    { quien: 'vale', texto: 'Renco no se compró unas zapatillas con su sueldo. Alguien le pagaba. Y quien paga sin preguntar, manda.' },
    { quien: 'vale', texto: 'Tuvo que haber un sitio donde recogía el sobre. Un bar de la zona comercial. Ve y mira quién viene a por el siguiente.' },
    { quien: 'vale', texto: 'Si se lo cuento a Chispa, irá a por quien sea con la sangre en la cabeza. Si lo resuelvo yo antes, nos ahorramos una guerra.' },
    { quien: 'abuelo', texto: 'Cuidado, hija. En mis tiempos también había quien pagaba sobres. Siempre eran los mismos.' },
  ],
  'vale-toma-cartas:fin': [
    { fondo: 'barrio', quien: 'vale', texto: 'Matrícula del centro. Es un coche de Casa Verdial.' },
    { quien: 'vale', texto: 'Pero Renco hablaba de «gente de fuera». Los de la Doña no son de fuera. Son dos cosas distintas, Cero. Esto tiene más fondo.' },
    { quien: 'vale', texto: 'Ni una palabra a Chispa. Todavía no.' },
  ],

  'el-favor-de-empedrado': [
    { fondo: 'despacho', quien: 'empedrado', texto: 'Cero, qué puntualidad. Pase, pase. Esto no ha ocurrido.' },
    { quien: 'empedrado', texto: 'Tengo un recado que no puede aparecer en ningún papel, ni en ninguna llamada, ni en la memoria de nadie que no sea usted.' },
    { quien: 'empedrado', texto: 'Un maletín. Se recoge aquí y se deja en una casa del barrio residencial. No se abre, no se pregunta y no se deja ver.' },
    { quien: 'dona', texto: 'El Licenciado es muy meticuloso. Hágale caso: él nunca se equivoca. Por eso sigue conmigo.' },
  ],
  'el-favor-de-empedrado:fin': [
    { fondo: 'ciudad', texto: 'La casa no tiene nombre en el timbre. Una mano con gemelos de oro coge el maletín sin que le veas la cara.' },
    { texto: 'En la calle, un coche negro con matrícula de otra provincia espera con el motor en marcha.' },
    { fondo: 'despacho', quien: 'empedrado', texto: 'Gracias, Cero. Ahora olvide la dirección. Y no nos llame.' },
  ],

  // =====================================================================
  // ACTO 3 — "EL HOMBRE DE FUERA"
  // =====================================================================
  'el-hombre-del-traje': [
    { fondo: 'muelle', quien: 'marina', texto: 'Mi padre tiene visita esta tarde en el muelle norte. Dice que es «una visita de cortesía». Nadie me ha dicho de quién.' },
    { quien: 'marina', texto: 'Quiero saber quién es. Acércate sin que te vean y, cuando se vaya, sigue su coche.' },
    { quien: 'ferro', texto: 'Yo habría ido a preguntárselo a puñetazos.' },
    { quien: 'marina', texto: 'Por eso va Cero, Ferro. Y no tú.' },
  ],
  'el-hombre-del-traje:fin': [
    { fondo: 'ciudad', texto: 'Es un hotel del centro, cristal y mármol. El hombre del traje baja del coche, saluda al portero por su nombre y no mira atrás ni una vez.' },
    { texto: 'Un hombre que no mira atrás es un hombre que no teme que le miren.' },
    { fondo: 'muelle', quien: 'marina', texto: 'Gente de fuera. Lo sabía.' },
    { quien: 'marina', texto: 'Mi padre le ha dado la mano a alguien que ni siquiera se ha mojado los zapatos para venir.' },
  ],

  'la-reportera': [
    { fondo: 'ciudad', quien: 'teresa', texto: 'Tú eres Cero. Tranquilo, no escribo sobre ti. Todavía.' },
    { quien: 'teresa', texto: 'Llevo meses detrás de algo: alguien compra terrenos en Santa Perdida sin dar la cara. Solares, naves, media parte alta. Todo a través de sociedades con nombres de flores.' },
    { quien: 'teresa', texto: 'Detrás de las flores hay un nombre. Anzures. Íñigo Anzures, del Consorcio Poniente. ¿Te suena?' },
    { texto: 'No dices nada.' },
    { quien: 'teresa', texto: 'No, claro que no. A nadie le suena. Esa es su gracia.' },
    { quien: 'teresa', texto: 'Tengo copias de unos documentos. Llévalas a mi contacto en el centro. Yo no puedo acercarme: me conocen.' },
    { quien: 'teresa', texto: 'Y una cosa: no trabajo para ninguna banda. Si te preguntan, no me has visto en tu vida.' },
  ],
  'la-reportera:fin': [
    { fondo: 'ciudad', quien: 'teresa', texto: 'Perfecto. Con esto ya puedo empezar a tirar del hilo.' },
    { quien: 'teresa', texto: 'Si alguna vez ves a ese hombre, no le digas que existo. Ni que existe esta conversación.' },
  ],

  'ojos-en-el-barrio': [
    { fondo: 'barrio', quien: 'vale', texto: 'Hay gente con chalecos y planos midiendo las calles de Los Rompientes. Con cascos, con cinta métrica, con furgoneta blanca.' },
    { quien: 'chispa', texto: '¿Quién les ha llamado? Nadie del barrio, seguro.' },
    { quien: 'vale', texto: 'Eso es lo que me preocupa.' },
    { quien: 'abuelo', texto: 'Así empezó con las fábricas. Primero vinieron unos señores con cinta métrica. Luego, las cartas de desahucio.' },
    { quien: 'chispa', texto: 'No se va a repetir. Cero, sigue esa furgoneta. Y si puedes, páralos y mira qué llevan.' },
  ],
  'ojos-en-el-barrio:fin': [
    { fondo: 'barrio', texto: 'Entre botes de pintura y cinta hay unos planos. Pone «PONIENTE» en la esquina. Los Rompientes aparece dibujado sin las casas: solo solares.' },
    { quien: 'vale', texto: 'Han dibujado el barrio sin nosotros.' },
    { quien: 'chispa', texto: 'Pues vamos a recordarles que seguimos aquí.' },
  ],

  papeles: [
    { fondo: 'despacho', quien: 'empedrado', texto: 'Un documento que, por una desafortunada confusión de fechas, ha ido a parar a un domicilio equivocado: el de un notario del residencial.' },
    { quien: 'empedrado', texto: 'Antes de que lo vea quien no debe, tiene que volver a mis manos. Sin ruido y sin papeles. Por las vías adecuadas... aunque ya no quedan vías.' },
    { quien: 'dona', texto: 'No me gustan las confusiones, Licenciado. Que Cero se dé prisa.' },
  ],
  'papeles:fin': [
    { fondo: 'despacho', texto: 'La carpeta lleva el membrete del Consorcio Poniente. Tres apellidos subrayados en rojo: Verdial, Roig, Écija.' },
    { quien: 'empedrado', texto: 'No ha visto nada, Cero. Un contrato de arrendamiento. Aburridísimo.' },
    { quien: 'dona', texto: 'Gracias, Licenciado. Y gracias a usted, Cero. Hay cosas que es mejor leer una sola vez.' },
  ],

  'lo-que-vio-la-grua': [
    { fondo: 'muelle', quien: 'sacau', texto: 'Cero. Sube, sube, que desde aquí se ve todo. Todo lo que no debería verse.' },
    { quien: 'sacau', texto: 'Yo no cobro por mirar, cobro por contar. Esta vez te lo cuento gratis, que es más grave que mi sueldo.' },
    { quien: 'sacau', texto: 'Anoche descargaron un barco sin luces. Sin sello de Los Amarres. Y ni El Cónsul, ni Marina, ni Ferro estaban en el muelle.' },
    { quien: 'sacau', texto: 'En este puerto no baja una caja que no pase por ellos. Esa pasó. Sigue al camión y mira dónde la dejan.' },
  ],
  'lo-que-vio-la-grua:fin': [
    { fondo: 'muelle', quien: 'sacau', texto: '¿Lo ves? Naves que no son de nadie y están pagadas por alguien. Y no es tabaco, Cero. Es lo otro.' },
    { quien: 'sacau', texto: 'Apunta, que yo ya tengo la libreta llena y el cuello torcido de tanto mirar.' },
  ],

  'la-dona-no-duerme': [
    { fondo: 'despacho', quien: 'dona', texto: 'Perdone la hora, Cero. No duermo bien últimamente, y a mi edad es un lujo que no puedo permitirme.' },
    { quien: 'dona', texto: 'Ha habido un cambio en mis asuntos. Alguien que yo consideraba un socio me pide más de lo que acordamos.' },
    { quien: 'empedrado', texto: 'El señor Anzures ha adelantado el calendario, señora.' },
    { quien: 'dona', texto: 'Licenciado. Los nombres, en privado.' },
    { quien: 'dona', texto: 'Traiga al Licenciado desde el hotel hasta mi casa. Sin que nadie le siga. Esta noche necesito oír cómo se explica.' },
  ],
  'la-dona-no-duerme:fin': [
    { fondo: 'despacho', quien: 'dona', texto: '«Hasta el viernes», ha dicho. El viernes. Como quien me cita para un café.' },
    { quien: 'dona', texto: 'Treinta años construyendo Casa Verdial, Cero. Y un señor con una carpeta quiere ponerle precio.' },
    { quien: 'dona', texto: 'Lo que ha oído esta noche no ha existido. Pero recuérdelo bien.' },
  ],

  'el-barrio-no-se-vende': [
    { fondo: 'barrio', quien: 'chispa', texto: 'Ya sé quién anda midiendo mi barrio. No sé quién les paga, pero sé cómo se les para.' },
    { quien: 'chispa', texto: 'Una pancarta, una noche, en sus obras. Y que todo el barrio se entere de que esto no se vende.' },
    { quien: 'abuelo', texto: 'Los botes de pintura están en mi garaje. Ten cuidado, son los de cuando cerraron la fábrica.' },
    { quien: 'vale', texto: 'Pintada, Chispa. Pintada. Nada de prender fuego a nada.' },
    { quien: 'chispa', texto: 'Pintada. De momento.' },
  ],
  'el-barrio-no-se-vende:fin': [
    { fondo: 'barrio', texto: '«EL BARRIO NO SE VENDE». Tres metros de letras. Mañana se leerá hasta desde el puerto.' },
    { quien: 'vale', texto: 'Y mañana también lo verá quien les paga. Esto no ha acabado, Chispa.' },
    { quien: 'abuelo', texto: 'Siempre dices lo mismo, hija. Y siempre tienes razón.' },
  ],

  'ferro-se-harta': [
    { fondo: 'muelle', quien: 'ferro', texto: 'Cero. Ya has visto a quién visita el viejo. Un tío de traje en MI muelle.' },
    { quien: 'ferro', texto: 'Treinta años de contrabando y ahora negociamos con gente que nunca ha mojado los pies.' },
    { quien: 'ferro', texto: 'Tengo doce hombres que piensan como yo. Llévalos al muelle sur esta noche. Sin que el viejo se entere.' },
    { quien: 'ferro', texto: 'No te pido que traiciones a nadie. Te pido que decidas de qué lado estás cuando llegue el momento.' },
  ],
  'ferro-se-harta:fin': [
    { fondo: 'muelle', quien: 'marina', texto: 'Ferro mueve gente por el muelle sur. No me lo ha contado nadie: conozco cada barco que entra y cada hombre que sale.' },
    { quien: 'marina', texto: 'Tú los has llevado, ¿verdad? No pasa nada. Solo quiero saber a quién le debes lealtad.',
      opciones: [
        { texto: 'Se lo cuento todo: dónde, cuántos y para qué.', marca: 'marina-sabe' },
        { texto: 'No digo nada. Hice un favor y se acabó.', marca: 'ferro-confia' },
      ] },
    { solo: 'marina-sabe', quien: 'marina', texto: 'Gracias. Ahora sé cuánto tiempo me queda. Y sé en quién puedo confiar.' },
    { solo: 'ferro-confia', quien: 'marina', texto: 'Entiendo. Lo recordaré, Cero. Yo también sé guardar silencios.' },
  ],

  'un-sobre-para-el-inspector': [
    { fondo: 'despacho', quien: 'empedrado', texto: 'Un sobre. Más grueso que los habituales. Para el Inspector Salaverri.' },
    { quien: 'empedrado', texto: 'No es nuestro, para ser exactos. Nos han pedido que lo hagamos llegar. Cosas del nuevo escenario.' },
    { quien: 'empedrado', texto: 'Se entrega en mano. Si pregunta de quién es, diga «de un amigo del puerto». No se explique.' },
  ],
  'un-sobre-para-el-inspector:fin': [
    { fondo: 'ciudad', quien: 'salaverri', texto: 'Qué grueso. Hacía años que un sobre no pesaba tanto.' },
    { quien: 'salaverri', texto: 'Doce años cobrando de Casa Verdial y ahora de otro. Todo el mundo quiere comprar mi silencio. Qué cansancio de ciudad.' },
    { quien: 'salaverri', texto: 'Dígale a quien le mande que Salaverri recibe todos los sobres. Hasta los que no debería.' },
  ],

  'nadie-se-fia-de-nadie': [
    { fondo: 'barrio', quien: 'chispa', texto: 'Alguien ha pintado mis muros con porquería y han reventado el capó del coche de Vale. Y el Cónsul dice que fui yo quien le quitó su cargamento.' },
    { quien: 'vale', texto: 'Todos creen que los demás están detrás de lo que pasa.' },
    { quien: 'chispa', texto: 'Pues se lo preguntamos a los dos a la vez. Una nota para cada uno: «Sé lo que habéis hecho». Que se miren entre ellos.' },
    { quien: 'vale', texto: 'Es peligroso, Chispa.' },
    { quien: 'chispa', texto: 'Todo lo es.' },
  ],
  'nadie-se-fia-de-nadie:fin': [
    { fondo: 'ciudad', texto: 'El Cónsul rompe la nota sin leerla entera. La Doña la lee dos veces y la guarda.' },
    { texto: 'Esa noche, tres coches recorren Santa Perdida con las luces apagadas, cada uno vigilando a los otros dos.' },
    { fondo: 'barrio', quien: 'vale', texto: 'Hemos encendido la mecha, Chispa.' },
    { quien: 'chispa', texto: 'O alguien la encendió antes que nosotros.' },
  ],

  'la-foto-de-teresa': [
    { fondo: 'ciudad', quien: 'teresa', texto: 'Con lo que me trajiste publico mañana. Pero un artículo sin foto no vale nada.' },
    { quien: 'teresa', texto: 'Necesito una imagen: Anzures con alguien de las tres bandas. Un apretón de manos, un café, lo que sea.' },
    { quien: 'teresa', texto: 'Toma, es la cámara de mi padre. Se enfoca sola. También graba sonido, por si acaso. Tú no toques nada.' },
    { quien: 'teresa', texto: 'Y si te ven, tú no me conoces.' },
  ],
  'la-foto-de-teresa:fin': [
    { fondo: 'muelle', texto: 'El flash dura medio segundo. En la foto, Íñigo Anzures le estrecha la mano a Baltasar Roig, El Cónsul, delante de un barco sin luces.' },
    { fondo: 'ciudad', quien: 'teresa', texto: 'Es perfecta. Es perfecta y es peligrosísima.' },
    { quien: 'teresa', texto: 'Tu jefe le vendía el puerto a quien le prometió pagar el triple. Y las otras dos casas están igual. ¿Te das cuenta?' },
  ],

  'el-primero-en-caer': [
    { fondo: 'barrio', quien: 'vale', texto: 'Han encontrado a uno de los de los cascos en un solar del barrio. No respira.' },
    { quien: 'chispa', texto: 'Yo no he sido. Ni uno de los míos. Nadie toca a nadie en Los Rompientes sin que yo lo sepa.' },
    { quien: 'vale', texto: 'Pues alguien quiere que lo parezca. Si la policía lo encuentra aquí, el Consorcio tiene su excusa para echarnos.' },
    { quien: 'chispa', texto: 'Cero. Un coche se ha alejado del solar. Síguelo y dime quién va dentro.' },
  ],
  'el-primero-en-caer:fin': [
    { fondo: 'barrio', quien: 'vale', texto: 'Matrícula del centro. Y un anillo con sello en el salpicadero. Una V.' },
    { quien: 'chispa', texto: '¿La Doña?' },
    { quien: 'vale', texto: 'No. La Doña no hace estas cosas. Esto lo haría alguien con prisa por heredar.' },
    { quien: 'chispa', texto: 'Máximo.' },
    { quien: 'vale', texto: 'Y si Máximo mata por su cuenta, ya no hay nadie que mande en Casa Verdial. Ni nadie que la frene.' },
  ],

  'golpe-de-mano': [
    { fondo: 'muelle', quien: 'marina', texto: 'Ferro se ha hartado de esperar. Esta noche entra en el despacho del puerto con veinte hombres.' },
    { quien: 'marina', texto: 'Mi padre está dentro. Yo saco a quien pueda. Llega antes que ellos, Cero.' },
    { quien: 'sacau', texto: 'Yo lo veo todo desde la grúa y ya lo he visto: vienen tres furgonetas. ¡Tres!' },
    { quien: 'marina', texto: 'Corre.' },
  ],
  'golpe-de-mano:fin': [
    { fondo: 'muelle', quien: 'ferro', texto: 'Cero. Qué casualidad. Ya sabes cómo va esto: o conmigo o contra mí.' },
    { quien: 'consul', texto: 'Ramiro. Baje eso, socio. Todavía estamos a tiempo de hablar.' },
    { quien: 'ferro', texto: 'Treinta años, viejo. Treinta años, y ahora le besas las botas a un traje.' },
    { texto: 'Ferro te apunta con una mano y a Marina con la otra. Tienes el arma en la cintura. Nadie respira.',
      opciones: [
        { texto: 'Disparar a Ferro.', marca: 'ferro-cae', muere: 'ferro' },
        { texto: 'Bajar el arma y dejar que Ferro entre.', marca: 'sacau-cae', muere: 'sacau' },
      ] },
    { solo: 'ferro-cae', texto: 'El disparo suena más fuerte que todo lo demás. Ferro cae de rodillas, mirándote como si no lo creyera. Nadie se mueve.' },
    { solo: 'ferro-cae', quien: 'marina', texto: 'Era un hombre de otra época, Cero. Pero era de los nuestros.' },
    { solo: 'ferro-cae', quien: 'consul', texto: 'Gracias, socio. No sé si debo dárselas.' },
    { solo: 'sacau-cae', texto: 'Sacau lo ha visto todo desde la grúa y ha gritado por la radio. Alguien de los de Ferro ha visto la luz de la cabina. Un solo disparo. La radio se queda en silencio.' },
    { solo: 'sacau-cae', quien: 'marina', texto: '¡Sacau!' },
    { solo: 'sacau-cae', quien: 'ferro', texto: 'Ya lo ves, Cero. Así se hacen las cosas. Y el puerto, desde esta noche, es mío.' },
    { solo: 'sacau-cae', quien: 'consul', texto: 'Hija... recoja lo que pueda. Desde esta noche soy un invitado en mi propio puerto.' },
    { fondo: 'ciudad', titulo: 'SIN VUELTA ATRAS', sub: 'En Los Amarres, ya no hay marcha atrás' },
  ],

  'el-trato': [
    { fondo: 'despacho', quien: 'dona', texto: 'Cero, necesito que me acompañe a una reunión. No hace falta que hable. Hace falta que esté.' },
    { quien: 'empedrado', texto: 'Es una negociación delicada. Nunca se firma nada. Se acuerda.' },
    { quien: 'dona', texto: 'Y usted, ya lo sé, es de los pocos que no le deben nada a nadie.' },
  ],
  'el-trato:fin': [
    { fondo: 'despacho', quien: 'anzures', texto: 'Señora Verdial, un placer. Hemos calculado el valor del puerto, del barrio alto y del centro. Le agradezco que nos haya facilitado el trabajo.' },
    { quien: 'dona', texto: 'Yo no le he facilitado nada, señor Anzures. He hecho lo acordado: desestabilizar. Nada más.' },
    { quien: 'anzures', texto: 'Y lo ha hecho de forma impecable. Ahora que las tres casas desconfían entre sí, el precio baja. Una ciudad que se destroza sola es un activo barato.' },
    { quien: 'empedrado', texto: 'Convendría reflexionar sobre los plazos, señor.' },
    { quien: 'anzures', texto: 'Hasta el viernes, Licenciado. La señora Verdial recibirá su parte: un doce por ciento. Más de lo que ofreceré a las otras dos casas, por separado.' },
    { quien: 'dona', texto: 'Un doce por ciento. De mi ciudad.' },
    { texto: 'Anzures ni siquiera te mira. Eres parte del mobiliario. Y por eso mismo puedes oírlo todo.',
      opciones: [
        { texto: 'Grabar la conversación con la cámara de Teresa.', marca: 'grabado' },
        { texto: 'Quedarte quieto y escuchar.', marca: 'sin-grabacion' },
      ] },
    { solo: 'grabado', texto: 'La luz roja parpadea en tu bolsillo. Cada palabra, cada cifra, cada «activo».' },
    { solo: 'sin-grabacion', texto: 'Te quedas quieto. Lo recordarás todo, pero un recuerdo no se enseña en un tribunal.' },
  ],

  'se-sabe': [
    { fondo: 'ciudad', quien: 'teresa', texto: 'Publico a las seis. Con foto. Hay quien sabrá leerla y quien la romperá sin mirar.' },
    { quien: 'teresa', texto: 'Quiero que antes de las seis los tres jefes tengan un ejemplar en la mano. Uno para El Cónsul, otro para Chispa y otro para la Doña.' },
    { solo: 'grabado', quien: 'teresa', texto: 'Y con la grabación que me trajiste, nadie podrá decir que me lo he inventado.' },
    { solo: '!grabado', quien: 'teresa', texto: 'Sin grabación, es mi palabra contra la de ellos. Pero la foto vale por mil palabras.' },
    { quien: 'teresa', texto: 'Que lo lean a la vez. Es la única ventaja que vamos a tener.' },
  ],
  'se-sabe:fin': [
    { fondo: 'ciudad', texto: 'Los tres lo leen a la vez, en tres sitios distintos.' },
    { fondo: 'muelle', quien: 'consul', texto: 'Anzures. Treinta años de puerto para que un señor con una carpeta me compre en una tarde.' },
    { quien: 'marina', texto: 'Ya no, papá. Ya no.' },
    { solo: 'sacau-cae', quien: 'marina', texto: 'Sacau murió por esto. Que no sea por nada.' },
    { solo: 'ferro-cae', quien: 'consul', texto: 'Y Ramiro lo vio venir antes que yo. Dios, qué viejo me he hecho.' },
    { fondo: 'barrio', quien: 'chispa', texto: 'Todo este tiempo... Los cascos, los solares, Renco. No era Verdial. No era el puerto. Eran ellos.' },
    { quien: 'vale', texto: 'Ahora al menos sabemos contra quién.' },
    { fondo: 'despacho', quien: 'dona', texto: 'Licenciado, prepare mi coche. Es hora de descubrir cuánto vale la palabra de un caballero.' },
    { quien: 'empedrado', texto: 'Señora, le recuerdo que fuimos nosotros quienes le abrimos la puerta.' },
    { quien: 'dona', texto: 'Por eso mismo, Licenciado. Por eso mismo.' },
    { fondo: 'ciudad', titulo: 'LA CIUDAD ELIGE', sub: 'Fin del Acto 3' },
  ],
};

// el decorado de cada banda, para las misiones sin dialogo propio
export const FONDO_BANDA = { amarres: 'muelle', rompiente: 'barrio', verdial: 'despacho' };
// quien es el jefe de cada banda en PERSONAJES
export const JEFE_BANDA = { amarres: 'consul', rompiente: 'chispa', verdial: 'dona' };
