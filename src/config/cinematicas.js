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

  // =====================================================================
  // ACTO 2.5 — "EL BAJO MUNDO": El Duque, El Terciopelo y sus chicas
  // =====================================================================
  'bienvenido-al-terciopelo': [
    { fondo: 'despacho', quien: 'duque', texto: 'Pasa, pasa, cariño. Así que tú eres el famoso Cero. Me habían dicho que eras más alto.' },
    { quien: 'duque', texto: 'Bienvenido a El Terciopelo: la única casa de la ciudad donde un juez, un concejal y un camello se toman la copa en la misma barra sin mirarse.' },
    { quien: 'duque', texto: 'Aquí se viene a beber, a mirar y a subir con una de mis chicas. Lo que pasa arriba, se queda arriba. Lo que pasa en la caja... eso ya es otra historia.' },
    { quien: 'duque', texto: 'Hay una bolsa en la puerta de atrás con la recaudación de la semana. No es mía del todo: la mitad es de la Doña, y la Doña no quiere que pase por sus libros.' },
    { quien: 'duque', texto: 'Llévala a su banco antes de que abra. Y si la abres, cariño, cuenta bien: yo sé exactamente cuánto hay. Hasta el último billete con olor a puta.' },
    { quien: 'amparo', texto: 'No le hagas caso, rey. Habla así para que no se le note que está muerto de miedo de la vieja.' },
  ],
  'bienvenido-al-terciopelo:fin': [
    { fondo: 'despacho', quien: 'duque', texto: 'Ni un billete de menos. Me gustas, Cero. Eres de los que no preguntan.' },
    { quien: 'duque', texto: 'La Doña lava su dinero en mis sábanas y yo pago protección por el privilegio. Así funciona esta ciudad: todos le debemos algo a alguien.' },
  ],

  'alguien-no-paga': [
    { fondo: 'despacho', quien: 'duque', texto: 'Hay una regla en mi casa, una sola: a las chicas se les paga y no se les pone la mano encima.' },
    { quien: 'duque', texto: 'Un gilipollas de traje se ha ido sin pagar a Celeste. Y antes de irse le ha partido el labio.' },
    { quien: 'celeste', texto: 'Dijo que una puta no vale lo que cuesta. Que me pagaba con la hostia.' },
    { quien: 'duque', texto: 'Está en el aparcamiento, arrancando su cochazo de mierda. No lo quiero muerto, cariño: los muertos no vuelven a pagar. Quiero que se acuerde de mí cada vez que coja el autobús.' },
  ],
  'alguien-no-paga:fin': [
    { fondo: 'despacho', quien: 'duque', texto: 'Mañana lo sabrá todo el centro: el que no paga en El Terciopelo, vuelve a casa andando.' },
    { quien: 'celeste', texto: 'Gracias. Nadie hace estas cosas por nosotras. Solo por el dinero que damos.' },
  ],

  'la-chica-nueva': [
    { fondo: 'ciudad', quien: 'celeste', texto: 'No le debo nada al Duque. Al Duque le pago su parte y me deja en paz. Le debo a los que me trajeron.' },
    { quien: 'celeste', texto: 'Me dijeron que había trabajo en un hotel de la costa. Me pagaron el billete del barco. Cuando llegué no había hotel: había una deuda. Tres mil. Luego cinco mil. Luego ocho.' },
    { quien: 'celeste', texto: 'Cada semana debo más. Me tienen en un piso del residencial con otras cuatro. Si me voy, dicen que le hacen algo a mi madre.' },
    { quien: 'celeste', texto: 'Esta noche no hay nadie vigilando. Saca mis cosas de ese piso y llévame al autobús. No te pido más.' },
    { quien: 'amparo', texto: 'Esos no son de aquí, rey. Los barcos que traen chicas no los descarga ni El Cónsul. Ten cuidado con quién te cruzas.' },
  ],
  'la-chica-nueva:fin': [
    { fondo: 'carretera', texto: 'El autobús de la madrugada arranca con Celeste dentro. No mira por la ventanilla.' },
    { quien: 'celeste', texto: 'El barco que me trajo se llamaba Poniente III. Por si algún día te sirve.' },
  ],

  'lo-que-sabe-la-camarera': [
    { fondo: 'despacho', quien: 'amparo', texto: 'Siéntate, rey. ¿Una copa? Invita la casa, que la casa hoy está de buenas.' },
    { quien: 'amparo', texto: 'Veinte años detrás de esta barra. He servido a tres alcaldes, a dos obispos y al Cónsul cuando todavía era guapo.' },
    { quien: 'amparo', texto: 'Hay un señor que viene los jueves al reservado. No bebe, no sube con ninguna chica y no deja propina. Eso, aquí, es más raro que un cura sin pecados.' },
    { quien: 'amparo', texto: 'El otro día se le escapó un nombre al que iba con él, borracho como una cuba. «Anzures». No es de aquí, rey. Aquí nadie se llama así.' },
    { quien: 'amparo', texto: 'Esta noche es jueves. Cuando salga, síguele y mira dónde duerme.' },
  ],
  'lo-que-sabe-la-camarera:fin': [
    { fondo: 'ciudad', texto: 'El hombre del reservado entra en un hotel del centro, cristal y mármol. El portero le abre la puerta antes de que llegue.' },
    { solo: 'hecha:la-reportera', fondo: 'despacho', quien: 'amparo', texto: '¿Anzures? ¿El mismo que busca esa periodista? Ay, rey. Esto huele a muerto, y no precisamente al mío.' },
    { solo: '!hecha:la-reportera', fondo: 'despacho', quien: 'amparo', texto: 'Apúntate ese nombre, rey. Anzures. Los que no beben en un puticlub es porque vienen a comprar algo más caro.' },
  ],

  'proteccion': [
    { fondo: 'despacho', quien: 'duque', texto: 'Hay un chulo de fuera que ha plantado a sus chicas en la esquina de la gasolinera. Sin pagarme a mí y, lo que es peor, sin pagarle a la Doña.' },
    { quien: 'duque', texto: 'Si dejo pasar a uno, mañana tengo diez. Y pasado mañana la Doña me pregunta por qué cobro protección si no protejo nada.' },
    { quien: 'duque', texto: 'Hazle una visita. Que su coche no vuelva a arrancar en esta ciudad. A las chicas no las toques: ellas no tienen la culpa de con quién duermen.' },
  ],
  'proteccion:fin': [
    { fondo: 'despacho', quien: 'duque', texto: 'Me dicen que el señor se ha ido a pie, llorando. Qué poco aguante tiene la gente de fuera.' },
  ],

  'el-otro-chulo': [
    { fondo: 'despacho', quien: 'duque', texto: 'El hijo de puta ha vuelto. Con cinco hombres y un piso en el polígono. Dice que la zona comercial no es de nadie.' },
    { quien: 'duque', texto: 'Ve a su piso y que lo entienda. Y si vienen sus perros, no me los mates en mi barrio: llévatelos lejos.' },
    { quien: 'amparo', texto: 'Esos chulos de fuera llegaron con el mismo barco que la chica nueva, rey. Todo viene del mismo sitio.' },
  ],
  'el-otro-chulo:fin': [
    { fondo: 'despacho', quien: 'duque', texto: 'Ya no queda nadie en ese piso. Las chicas se han venido a mi casa. Aquí al menos cobran lo que les toca.' },
    { quien: 'duque', texto: 'No me mires así, Cero. Yo no soy un santo. Pero en esta ciudad hay cosas mucho peores que yo, y vienen en barco.' },
  ],

  // =====================================================================
  // SUELTAS — la gente de la ciudad que no es de ninguna banda
  // =====================================================================
  'coches-con-historia': [
    { fondo: 'ciudad', quien: 'puro', texto: 'A ver, chaval. Ese sedán azul que pasa por la zona comercial lo pinté yo hace diez años. Lo reconozco por la chapuza del aleta trasera. Mía, sí.' },
    { quien: 'puro', texto: 'Lo robaron con algo dentro del maletero. Algo que no era mío pero que me hizo perder un taller.' },
    { quien: 'puro', texto: 'Tráemelo. Entero. Un coche bien llevado dura; uno mal llevado se nota aunque lo pinte cien veces.' },
  ],
  'coches-con-historia:fin': [
    { fondo: 'ciudad', quien: 'puro', texto: 'Vacío. Claro. Diez años, chaval. Pero el doble fondo sigue ahí, y huele todavía a la farlopa que llevaba.' },
    { quien: 'puro', texto: 'Por eso me quemaron el primer taller. Por saber qué llevaba un coche que yo había pintado.' },
  ],

  'el-ojo-de-puro': [
    { fondo: 'muelle', quien: 'puro', texto: 'Necesito piezas de un modelo que ya no se fabrica. Hay un contenedor en el puerto lleno de ellas. No es mío.' },
    { quien: 'puro', texto: 'Tampoco es del que lo tiene, si a eso vamos. En esta ciudad nada es de quien lo tiene. Ve y tráemelas.' },
  ],
  'el-ojo-de-puro:fin': [
    { fondo: 'ciudad', quien: 'puro', texto: 'Esto es oro, chaval. Con esto le dejo un coche a cualquiera de las tres bandas que parece recién salido de fábrica.' },
    { quien: 'puro', texto: 'Y ya sabes: si alguna vez entras en mi taller con la policía detrás, yo no te he visto en mi vida.' },
  ],

  'deudas-viejas': [
    { fondo: 'ciudad', quien: 'puro', texto: 'Veinte años, chaval. Veinte años sin decir nada. El que me quemó el taller vive en el residencial y se ha comprado un coche nuevo.' },
    { quien: 'puro', texto: 'No quiero que le pase nada a él. Tiene nietos. Pero quiero que sepa lo que es oler tu trabajo ardiendo.' },
  ],
  'deudas-viejas:fin': [
    { fondo: 'ciudad', quien: 'puro', texto: 'Gracias. No me siento mejor, no te creas. Pero duermo un poco más tranquilo.' },
  ],

  'lo-que-se-ve-desde-el-faro': [
    { fondo: 'muelle', quien: 'remedios', texto: 'Ay, hijo, pasa, pasa. Que no muerdo. En el puerto dicen que estoy loca. Es que les da miedo lo que apunto.' },
    { quien: 'remedios', texto: 'Mis pastillas del corazón están en la farmacia del centro. Nadie quiere subir al faro, y yo ya no bajo esas escaleras.' },
  ],
  'lo-que-se-ve-desde-el-faro:fin': [
    { fondo: 'muelle', quien: 'remedios', texto: 'Gracias, hijo. Mi marido era el farero. Cuando automatizaron el faro me quedé aquí, y nadie se atrevió a echarme.' },
    { quien: 'remedios', texto: 'Desde aquí arriba se ve todo lo que entra de noche. Los barcos sin luces. Llevo cuarenta años apuntándolos en una libreta.' },
    { quien: 'remedios', texto: 'Desde hace un año entran más que nunca. Y no son del Cónsul. El Cónsul siempre ha llevado luces, el muy presumido.' },
  ],

  'el-faro-no-miente': [
    { fondo: 'muelle', quien: 'remedios', texto: 'He leído a esa chica del periódico, la que pregunta por los barcos. Lleve mi libreta. Cuarenta años de barcos sin luces.' },
    { quien: 'remedios', texto: 'Y dígale que el último año todos los barcos llevaban el mismo nombre pintado en la popa, con un número detrás.' },
  ],
  'el-faro-no-miente:fin': [
    { fondo: 'ciudad', quien: 'teresa', texto: 'Poniente I. Poniente II. Poniente III... Cuarenta y dos barcos en un año, todos de noche, todos sin luces.' },
    { quien: 'teresa', texto: 'Esa mujer ha hecho en una libreta lo que yo no he podido hacer en seis meses. Dile que le debo un artículo entero.' },
  ],

  'el-rumor-del-mercado': [
    { fondo: 'ciudad', quien: 'pregonero', texto: '¡Hombre, Cero! ¡El más famoso del mercado sin haber comprado nunca un tomate!' },
    { quien: 'pregonero', texto: 'Mira, le debo un dinerito a Casa Verdial, y si voy yo, la Doña me sonríe de esa forma que me quita el sueño una semana.' },
    { quien: 'pregonero', texto: 'Llévales el sobre. A cambio, te cuento lo que se dice. Y en este mercado se dice todo, todo y todo.' },
  ],
  'el-rumor-del-mercado:fin': [
    { fondo: 'ciudad', quien: 'pregonero', texto: 'Pagado. Gracias, chaval. Ahí va el rumor: dicen que unos de fuera están comprando los pisos del barrio alto a los viejos, a precio de saldo, y en metálico.' },
    { quien: 'pregonero', texto: 'Y que a los que no venden se les rompe una ventana. O un brazo. Yo no he dicho nada, ¿eh? Yo vendo fruta.' },
  ],

  'la-medalla-que-falta': [
    { fondo: 'muelle', quien: 'remedios', texto: 'Cuarenta medallas, hijo. Las cuarenta. Nadie las había juntado nunca. Mi marido decía que el que las juntara encontraría a la santa.' },
    { quien: 'remedios', texto: 'Él sabía dónde se hundió el barco. En la bocana, entre las rocas negras. Esta noche baja la marea como no ha bajado en cincuenta años.' },
    { quien: 'remedios', texto: 'Ya sé que suena a cuento de vieja. Pero ven conmigo. Por si acaso. Aquí todo se hace por si acaso.' },
  ],
  'la-medalla-que-falta:fin': [
    { fondo: 'muelle', texto: 'Entre las rocas, cubierta de algas y de doscientos años de sal, asoma una cabeza de madera. Una mujer con los ojos cerrados.' },
    { quien: 'remedios', texto: 'La Santa Perdida. Ya no está perdida.' },
    { quien: 'remedios', texto: 'No se lo digas a nadie, hijo. Una ciudad que encuentra a su santa ya no tiene excusa para portarse mal.' },
  ],

  'el-ultimo-favor': [
    { fondo: 'barrio', quien: 'abuelo', texto: 'Siéntate, chaval. Voy a contarte una cosa que no le he contado a nadie en treinta años. Ni a Chispa.' },
    { quien: 'abuelo', texto: 'Cuando cerró la fábrica de redes nos dijeron que era la crisis, que no había pedidos. Mentira. Había pedidos para cinco años.' },
    { quien: 'abuelo', texto: 'La cerraron porque alguien compró los terrenos. Una sociedad que nadie conocía. Tengo los papeles en una caja. Los robé de la oficina la noche que nos echaron.' },
    { quien: 'abuelo', texto: 'Llévaselos a esa periodista. Ya es hora de que alguien los lea.' },
  ],
  'el-ultimo-favor:fin': [
    { fondo: 'ciudad', quien: 'teresa', texto: '«Poniente Inversiones», 1996. Compraron los terrenos de la fábrica y la cerraron un mes después.' },
    { quien: 'teresa', texto: 'Treinta años, Cero. Llevan treinta años esperando a que el barrio se muriera solo. Y como no se muere, ahora vienen a rematarlo.' },
    { fondo: 'barrio', quien: 'abuelo', texto: 'Mi fábrica. Mis compañeros. Media vida. Y todo por un hijo de puta que ni siquiera vino a verlo cerrar.' },
  ],

  // =====================================================================
  // ACTO 4 — "LA CIUDAD ELIGE"
  // =====================================================================
  'la-ciudad-se-entera': [
    { fondo: 'ciudad', quien: 'teresa', texto: 'Está en todos los quioscos. Ya no pueden negarlo. Santa Perdida sabe que la están vendiendo por trozos.' },
    { quien: 'teresa', texto: 'Mi editor me ha llamado tres veces para que lo retire. Alguien le ha llamado a él cuatro.' },
    { quien: 'teresa', texto: 'Ve a ver cómo respira cada barrio. Quiero saber quién va a pelear y quién va a vender. Esta noche se decide todo.' },
  ],
  'la-ciudad-se-entera:fin': [
    { fondo: 'barrio', quien: 'chispa', texto: '¿Treinta años? ¿Treinta putos años esperando a que nos muriéramos? Pues se van a cagar. Aquí no se muere nadie sin hacer ruido.' },
    { quien: 'vale', texto: 'Chispa, piensa con la cabeza. Si salimos a quemar, les damos la excusa que buscan.' },
    { fondo: 'muelle', quien: 'consul', texto: 'Me equivoqué, socio. Treinta años sin equivocarme y la única vez que lo hago, me cuesta el puerto.' },
    { quien: 'marina', texto: 'No te ha costado nada todavía, papá. Todavía es nuestro.' },
    { solo: 'vivo:ferro', quien: 'ferro', texto: 'Yo digo que vendamos. Que nos paguen y nos vayamos ricos antes de que esto reviente. El puerto ya está muerto, viejo.' },
    { solo: 'muerto:ferro', quien: 'marina', texto: 'Ferro lo vio venir antes que nadie. Y yo le dejé morir por ello.' },
    { fondo: 'despacho', quien: 'dona', texto: 'Licenciado, ¿cuántos de nuestros clientes han llamado hoy preguntando si Casa Verdial sigue existiendo?' },
    { quien: 'empedrado', texto: 'Todos, señora. Absolutamente todos.' },
    { quien: 'dona', texto: 'Entonces, mañana sigue existiendo. Cueste lo que cueste.' },
    { solo: 'vivo:maximo', quien: 'maximo', texto: 'Madre, estás acabada. Si no tomas una decisión tú, la tomaré yo.' },
  ],

  'elige-un-bando': [
    { fondo: 'ciudad', quien: 'teresa', texto: 'Esta noche te van a llamar todos, Cero. Te lo digo porque me han llamado a mí para saber dónde estás.' },
    { quien: 'teresa', texto: 'Yo ya he hecho mi parte: lo he contado. Lo que pase ahora no lo decide un periódico. Lo decides tú.' },
  ],
  'elige-un-bando:fin': [
    { fondo: 'ciudad', texto: 'Medianoche. La plaza del Farol está vacía. Y de pronto, no lo está.' },
    { quien: 'marina', texto: 'Mi padre está viejo y cansado. Yo no. El puerto es de Los Amarres y lo va a seguir siendo. Te necesito conmigo.' },
    { quien: 'chispa', texto: 'Si nos echan, que lo hagan sobre un barrio en llamas. Prefiero morirme en mi calle que vivir en un piso de mierda en las afueras. ¿Vienes, tío?' },
    { quien: 'dona', texto: 'Yo le ofrezco algo más sensato: librarnos de ese caballero sin que nadie tenga que morir. Casi nadie. Con guantes, Cero. Como siempre.' },
    { quien: 'anzures', texto: 'Y yo le ofrezco la única salida en la que usted gana seguro. Este sobre tiene más ceros de los que verá en su vida. Solo tiene que dejar de ayudar a quien ya ha perdido.' },
    { texto: 'Cuatro voces. Cuatro ciudades distintas. Y solo una noche para elegir.',
      opciones: [
        { texto: 'Con Marina y Los Amarres: el puerto no se vende.', marca: 'camino-amarres' },
        { texto: 'Con Chispa: si nos echan, que arda todo.', marca: 'camino-rompiente' },
        { texto: 'Con la Doña: guante de seda.', marca: 'camino-verdial' },
        { texto: 'Coger el sobre de Anzures.', marca: 'camino-consorcio' },
        { texto: 'Con las tres a la vez, contra él.', marca: 'camino-independiente', repTodas: 50 },
      ] },
    { solo: 'camino-amarres', quien: 'marina', texto: 'Bien. Mañana, en el muelle. Y trae algo con lo que disparar.' },
    { solo: 'camino-amarres', quien: 'chispa', texto: 'Vale, tío. Pero cuando te dejen tirado los del puerto, no vengas a llorar al barrio.' },
    { solo: 'camino-rompiente', quien: 'chispa', texto: '¡Ese es mi Cero, joder! Mañana empezamos a levantar barricadas.' },
    { solo: 'camino-rompiente', quien: 'dona', texto: 'Qué pena. Era usted el único con cabeza en esta ciudad.' },
    { solo: 'camino-verdial', quien: 'dona', texto: 'Sabía que era usted un hombre sensato. Mañana tomaremos un café y le contaré lo que va a costar.' },
    { solo: 'camino-verdial', quien: 'marina', texto: 'Te has vendido a la vieja. Espero que te pague bien, porque yo no voy a olvidarlo.' },
    { solo: 'camino-consorcio', quien: 'anzures', texto: 'Una decisión excelente. Muy pocos saben reconocer cuándo una ciudad ya no tiene futuro.' },
    { solo: 'camino-consorcio', quien: 'chispa', texto: 'Hijo de puta. Te dimos de comer. Ojalá te pudras con su dinero.' },
    { solo: 'camino-independiente', quien: 'marina', texto: '¿Con los tres? ¿Con Chispa y con la vieja en el mismo muelle? Estás loco, Cero.' },
    { solo: 'camino-independiente', quien: 'chispa', texto: 'Loco, sí. Pero si alguien puede juntarnos sin que nos matemos, es este cabrón.' },
    { solo: 'camino-independiente', quien: 'dona', texto: 'Una noche. Les doy una noche. Después, cada uno vuelve a su casa.' },
    { solo: 'camino-independiente', quien: 'anzures', texto: 'Qué romántico. Y qué poco rentable.' },
  ],

  // ---------------------------------------------------- CAMINO AMARRES
  'marina-toma-el-mando': [
    { fondo: 'muelle', quien: 'marina', texto: 'Esta noche hablo yo con los hombres. No mi padre. Yo.' },
    { solo: 'vivo:ferro', quien: 'marina', texto: 'Ferro tiene a la mitad del muelle. La otra mitad está esperando a ver quién grita más fuerte.' },
    { solo: 'muerto:ferro', quien: 'marina', texto: 'Desde que murió Ferro, los hombres no saben a quién mirar. Esta noche me van a mirar a mí.' },
    { quien: 'consul', texto: 'Hija... hágalo usted. Yo ya he hablado demasiado en esta vida.' },
    { quien: 'marina', texto: 'Llévame al muelle, Cero. Y si alguien saca un arma mientras hablo, ya sabes lo que tienes que hacer.' },
  ],
  'marina-toma-el-mando:fin': [
    { fondo: 'muelle', quien: 'marina', texto: 'Escuchadme todos. El que quiera vender, que se suba ahora al barco de Anzures y no vuelva. El que se quede, que se quede para pelear.' },
    { solo: 'vivo:ferro', quien: 'ferro', texto: '¿Y quién eres tú para decirnos qué hacer, niña? ¿La hija de papá que estudió fuera?' },
    { solo: 'vivo:ferro', quien: 'marina', texto: 'Soy la que lleva diez años haciendo tu trabajo mientras tú gritabas. Cero, tú decides qué hacemos con él.',
      opciones: [
        { texto: 'Pegarle un tiro a Ferro delante de todos.', marca: 'ferro-ejecutado', muere: 'ferro', solo: 'vivo:ferro' },
        { texto: 'Echarlo de la ciudad: que se vaya y no vuelva.', marca: 'ferro-exiliado', solo: 'vivo:ferro' },
      ] },
    { solo: 'ferro-ejecutado', texto: 'Ferro cae sobre los tablones del muelle. Nadie más dice que quiera vender.' },
    { solo: 'ferro-exiliado', quien: 'ferro', texto: 'Esto no se acaba aquí, Cero. Os vais a ahogar todos en vuestro puerto de mierda.' },
    { quien: 'marina', texto: 'Desde esta noche, Los Amarres tienen dueña.' },
  ],

  'el-ultimo-barco-de-anzures': [
    { fondo: 'muelle', quien: 'sacau', solo: 'vivo:sacau', texto: 'Desde la grúa lo veo clarito: un camión sin matrícula y un barco esperando con el motor encendido. ¡Esa no es manera de despedirse!' },
    { quien: 'marina', texto: 'Anzures quiere sacar lo que metió antes de que cerremos el muelle. Coca, armas y papeles. Mucho dinero.' },
    { quien: 'marina', texto: 'Ni una caja sale de mi puerto. Sigue ese camión y revienta lo que lleve antes de que llegue al barco.' },
  ],
  'el-ultimo-barco-de-anzures:fin': [
    { fondo: 'muelle', texto: 'El barco zarpa vacío. En el muelle, el camión del Consorcio arde con todo lo que llevaba dentro.' },
    { quien: 'marina', texto: 'Que se lo cuente a sus inversores. Santa Perdida no se vende a quien no sabe nadar.' },
  ],

  'el-consul-se-despide': [
    { fondo: 'muelle', quien: 'consul', texto: 'Socio, deme el gusto. Una última vuelta por lo que construí. Desde el muelle donde descargué mi primera caja hasta las naves del polígono.' },
    { quien: 'consul', texto: 'Mañana mi hija firma como dueña de Los Amarres. Y un viejo como yo tiene derecho a despedirse de sus cosas.' },
  ],
  'el-consul-se-despide:fin': [
    { fondo: 'carretera', quien: 'consul', texto: 'Treinta años, Cero. Empecé descargando cajas por un jornal de miseria. Y acabé vendiendo el puerto por miedo a perderlo. Qué estupidez.' },
    { texto: 'Un coche sin luces se pone a vuestra altura. La ventanilla baja. Lo último que ves es el cañón.' },
    { quien: 'consul', texto: '¡Al suelo, socio!' },
    { texto: 'El Cónsul se echa encima de ti. Seis disparos. Ninguno te da a ti.', muere: 'consul' },
    { quien: 'consul', texto: 'Dígale a mi hija... que lo hizo mejor que yo. Que siempre lo hizo mejor que yo.' },
    { fondo: 'muelle', quien: 'marina', texto: 'Fue Anzures. Su último regalo antes de irse. Y se va a ir, Cero. Te lo juro sobre el cuerpo de mi padre.' },
    { marca: 'final-amarres', fondo: 'ciudad', titulo: 'EL PUERTO ES NUESTRO', sub: 'Final de Los Amarres' },
  ],

  // ---------------------------------------------------- CAMINO ROMPIENTE
  'barricadas-de-verdad': [
    { fondo: 'barrio', quien: 'chispa', texto: 'Esta noche cerramos el barrio. Coches cruzados, contenedores, lo que sea. Que entren si tienen huevos.' },
    { quien: 'vale', texto: 'Hace falta material. Las obras del Consorcio en el polígono tienen vallas, sacos y una puta grúa entera.' },
    { quien: 'abuelo', texto: 'En el setenta y ocho hicimos lo mismo con la fábrica. Aguantamos once días. Luego vinieron los antidisturbios.' },
    { quien: 'chispa', texto: 'Pues esta vez aguantamos doce, Abuelo.' },
  ],
  'barricadas-de-verdad:fin': [
    { fondo: 'barrio', texto: 'Los Rompientes amanecen cerrados. En cada entrada, una barricada. En cada barricada, un chaval con la cara tapada.' },
    { quien: 'chispa', texto: 'Mira esto, Cero. Mira mi barrio. Por fin parece que vale algo.' },
  ],

  'la-noche-mas-larga': [
    { fondo: 'barrio', quien: 'vale', texto: 'Vienen todos. Los coches de la Doña, las furgonetas del Consorcio y la policía de Salaverri. A la vez.' },
    { quien: 'chispa', texto: 'Que vengan. Esta es mi calle. Aquí nací y aquí me van a tener que sacar con los pies por delante.' },
    { quien: 'vale', texto: 'No digas esas cosas, joder.' },
    { quien: 'chispa', texto: 'Cero, a la barricada principal. Pase lo que pase, tú aguantas.' },
  ],
  'la-noche-mas-larga:fin': [
    { fondo: 'barrio', texto: 'Amanece. Los coches de fuera se retiran. La barricada sigue en pie.' },
    { texto: 'Chispa está sentado contra ella. No se levanta.', muere: 'chispa' },
    { quien: 'vale', texto: 'Nando. Nando, joder, levántate. Levántate, cabrón, que hemos ganado.' },
    { quien: 'abuelo', texto: 'Era un crío. Siempre fue un crío. Y era el mejor de todos nosotros.' },
    { quien: 'vale', texto: 'No quería sangre en el barrio, Cero. Toda la que había la ha puesto él.' },
  ],

  'cuentas-pendientes': [
    { fondo: 'barrio', quien: 'vale', texto: 'Mando yo ahora. No lo he pedido. Pero mando yo.' },
    { quien: 'vale', texto: 'Tengo una lista. El primero es Máximo Verdial: mató a aquel hombre en nuestro solar para que nos echaran la culpa.' },
    { solo: 'vivo:ferro', quien: 'vale', texto: 'El segundo es Ferro. Esta noche se ha visto con Anzures. Vendió al barrio por una comisión.' },
    { quien: 'vale', texto: 'Chispa nunca quiso sangre. Yo no soy Chispa.' },
  ],
  'cuentas-pendientes:fin': [
    { fondo: 'barrio', texto: 'El coche de Máximo Verdial acaba contra un muro del centro. Él sale vivo, cojeando, y no vuelve a pisar Santa Perdida.', marca: 'maximo-huye' },
    { solo: 'vivo:ferro', texto: 'A Ferro lo encuentran dos días después flotando en la bocana. Nadie pregunta.', muere: 'ferro' },
    { quien: 'vale', texto: 'Anzures se ha ido. Sin firmar nada. Dice el periódico que el Consorcio «reconsidera su inversión en la zona».' },
    { quien: 'vale', texto: 'Ganamos, Cero. El barrio sigue siendo nuestro. Y la ciudad nos odia más que nunca. Así es como gana la gente como nosotros.' },
    { marca: 'final-rompiente', fondo: 'ciudad', titulo: 'SE QUEMA TODO', sub: 'Final de la Cuadrilla' },
  ],

  // ---------------------------------------------------- CAMINO VERDIAL
  'el-precio-de-la-dona': [
    { fondo: 'despacho', quien: 'dona', texto: 'Siéntese, Cero. Esta vez sí acepte el café. Lo va a necesitar.' },
    { quien: 'dona', texto: 'Anzures tiene un punto débil: necesita que todo sea limpio. Y el muerto del solar no es limpio. Si demostramos que fue alguien de dentro... alguien que trabajaba con él...' },
    { quien: 'dona', texto: 'Mi hijo mató a ese hombre. Máximo. Creía que así me ayudaba. Es lo más estúpido que ha hecho nunca, y ha hecho muchas.' },
    { quien: 'dona', texto: 'Recójalo en El Terciopelo y llévelo a la comisaría. Salaverri le espera. Dígale a mi hijo... no le diga nada. No lo entendería.' },
    { quien: 'empedrado', texto: 'Señora... ¿está segura?' },
    { quien: 'dona', texto: 'Licenciado, en treinta años nunca me ha preguntado si estoy segura. No empiece hoy.' },
  ],
  'el-precio-de-la-dona:fin': [
    { fondo: 'carretera', quien: 'maximo', texto: '¿La comisaría? ¿Me lleva a la comisaría? ¿Mi madre me ha vendido, hijo de puta?' },
    { texto: 'Máximo saca una pistola de la chaqueta. Le tiembla la mano.',
      opciones: [
        { texto: 'Quitarle el arma y entregarlo vivo.', marca: 'maximo-preso' },
        { texto: 'Disparar primero.', marca: 'maximo-muerto', muere: 'maximo' },
      ] },
    { solo: 'maximo-preso', quien: 'salaverri', texto: 'Máximo Verdial. Queda usted detenido. Su madre ha sido muy... colaboradora.' },
    { solo: 'maximo-muerto', quien: 'salaverri', texto: 'Vaya por Dios. Legítima defensa, ¿no? Yo no he visto nada. Yo nunca veo nada.' },
    { fondo: 'despacho', quien: 'dona', texto: 'Ya está hecho. Ese era mi precio, Cero. Ahora el de Anzures.' },
  ],

  'fuera-anzures': [
    { fondo: 'despacho', quien: 'empedrado', texto: 'Con el caso del solar abierto, cualquier papel que una a Anzures con él lo hunde ante sus inversores. Gente muy limpia, los inversores.' },
    { quien: 'empedrado', texto: 'Su maletín está en la habitación del hotel. Tráigamelo. Por las vías adecuadas, Cero. Y esta vez, las vías adecuadas son la ventana.' },
  ],
  'fuera-anzures:fin': [
    { fondo: 'despacho', quien: 'empedrado', texto: 'Transferencias al hombre del solar. Pagos a Salaverri. A Máximo. Un contrato para echar a seiscientas familias del barrio alto. Está todo.' },
    { quien: 'dona', texto: 'Mándeselo a sus inversores, Licenciado. Con una nota muy educada.' },
    { fondo: 'ciudad', quien: 'anzures', texto: 'Ha sido una negociación interesante, señora Verdial. Volveremos dentro de diez años. Las ciudades siempre se acaban vendiendo.' },
    { fondo: 'despacho', quien: 'dona', texto: 'Dentro de diez años seguiré aquí, señor Anzures. Y usted tendrá diez años más.' },
  ],

  'lo-que-queda-entre-las-sombras': [
    { fondo: 'despacho', quien: 'dona', texto: 'Pase, Cero. El café está recién hecho. Hoy no es una invitación: es una costumbre que vamos a tener usted y yo.' },
  ],
  'lo-que-queda-entre-las-sombras:fin': [
    { fondo: 'despacho', quien: 'dona', texto: 'Anzures se ha ido. El puerto sigue siendo de Los Amarres, el barrio alto de esos chavales, y el centro, mío. Todo en su sitio. Casi todo.' },
    { solo: 'maximo-preso', quien: 'dona', texto: 'Mi hijo me escribe desde la cárcel cada semana. No le contesto. Todavía no.' },
    { solo: 'maximo-muerto', quien: 'dona', texto: 'A mi hijo lo enterré el martes. Usted no vino. Hizo bien.' },
    { quien: 'dona', texto: 'Usted me ha dado una ciudad, Cero. Y yo le debo una para siempre. No hay deuda más cara en Santa Perdida que una que tengo yo.' },
    { quien: 'dona', texto: 'Algún día le pediré algo. Y usted dirá que sí. Porque así funcionan las cosas aquí.' },
    { marca: 'final-verdial', fondo: 'ciudad', titulo: 'GUANTE DE SEDA', sub: 'Final de Casa Verdial' },
  ],

  // ---------------------------------------------------- CAMINO CONSORCIO
  'el-otro-lado-del-trato': [
    { fondo: 'despacho', quien: 'anzures', texto: 'Bienvenido al lado correcto de la historia, Cero. Aquí no hay bandas: hay activos, pasivos y plazos.' },
    { quien: 'anzures', texto: 'La Cuadrilla se ha atrincherado en el barrio alto con una furgoneta llena de lo que roban en mis obras. Sin furgoneta, no hay barricada.' },
    { quien: 'anzures', texto: 'Hágalo limpio. Que piensen que fue Casa Verdial. Que se maten entre ellos: eso abarata mucho las cosas.' },
  ],
  'el-otro-lado-del-trato:fin': [
    { fondo: 'barrio', quien: 'chispa', texto: '¡¿Quién ha sido?! ¡¿Quién coño ha sido?! ¡Ha sido la vieja, seguro, esa hija de puta!' },
    { quien: 'vale', texto: 'No, Chispa. Ha sido alguien que conocía la furgoneta. Alguien de dentro.' },
    { fondo: 'despacho', quien: 'anzures', texto: 'Excelente. El barrio se está devorando a sí mismo. A este ritmo, firmamos antes del viernes.' },
  ],

  'firma-y-listo': [
    { fondo: 'despacho', quien: 'anzures', texto: 'Hoy se firma. La señora Verdial vende su parte por un doce por ciento. Los Amarres, sin el Cónsul al mando, venden por miedo. El barrio alto... el barrio alto no tiene que vender nada. Ya está expropiado.' },
    { quien: 'anzures', texto: 'Lléveme a la notaría del puerto. Y después, cobre. Se lo ha ganado.' },
  ],
  'firma-y-listo:fin': [
    { fondo: 'muelle', texto: 'Tres firmas. Un apretón de manos. Santa Perdida tiene nuevo dueño y no vive en ella.' },
    { fondo: 'barrio', texto: 'Al día siguiente llegan las excavadoras a Los Rompientes. Chispa se sube a la primera con una barra de hierro.' },
    { texto: 'Dicen que fue un accidente. Dicen que se cayó.', muere: 'chispa' },
    { quien: 'vale', texto: 'Sé que fuiste tú, Cero. Lo sé. Y algún día voy a poder demostrarlo.' },
    { fondo: 'ciudad', quien: 'anzures', texto: 'No se preocupe por ella. En cinco años aquí habrá un puerto deportivo, tres hoteles y nadie que se acuerde de cómo se llamaba este barrio.' },
    { quien: 'anzures', texto: 'Usted es rico, Cero. La ciudad, no. Así funciona el progreso.' },
    { marca: 'final-consorcio', fondo: 'ciudad', titulo: 'SE VENDE LA CIUDAD', sub: 'Final del Consorcio' },
  ],

  // ---------------------------------------------------- CAMINO INDEPENDIENTE
  'las-tres-bandas-una-noche': [
    { fondo: 'muelle', quien: 'marina', texto: 'Si alguien me hubiera dicho hace un año que iba a pelear al lado de esos chavales y de la vieja...' },
    { quien: 'chispa', texto: 'Y yo al lado de los del puerto, que nos han vendido mierda cortada durante diez años.' },
    { quien: 'dona', texto: 'Señores, por favor. Esta noche somos socios. Mañana pueden volver a odiarse con toda tranquilidad.' },
    { quien: 'teresa', texto: 'Anzures tiene esta noche en el muelle a toda la gente que le queda. Si caen ellos, cae él.' },
  ],
  'las-tres-bandas-una-noche:fin': [
    { fondo: 'muelle', texto: 'Cuando acaba, no queda nadie del Consorcio en pie. Pero hay alguien más en el suelo.' },
    { texto: 'El Cónsul. Se puso delante de Chispa cuando le apuntaron.', muere: 'consul' },
    { quien: 'chispa', texto: '¿Por qué, viejo? ¿Por qué coño has hecho eso? Si me odiabas.' },
    { quien: 'consul', texto: 'Porque usted tiene veintitrés años, socio. Y yo ya he visto todo lo que tenía que ver.' },
    { quien: 'marina', texto: 'Papá...' },
    { quien: 'dona', texto: 'Era el último caballero de esta ciudad. Y no lo sabía nadie. Ni él.' },
  ],

  'te-vas-de-santa-perdida': [
    { fondo: 'carretera', quien: 'teresa', texto: '¿Te vas? ¿Así, sin más? Las tres casas te ofrecen de todo para que te quedes.' },
    { quien: 'teresa', texto: 'Claro. Por eso te vas. Si te quedas, acabas debiéndole algo a alguien.' },
  ],
  'te-vas-de-santa-perdida:fin': [
    { fondo: 'carretera', texto: 'La carretera de la costa. Detrás, la ciudad, con sus tres casas en paz por primera vez. Una paz de mentira, pero paz.' },
    { quien: 'marina', texto: 'El puerto siempre tendrá un sitio para ti, Cero.' },
    { quien: 'chispa', texto: 'Y el barrio, tío. Cuando quieras. Sin preguntas.' },
    { quien: 'dona', texto: 'Le echaré de menos, Cero. No se lo diga a nadie.' },
    { texto: 'Llegaste sin nombre. Te vas sin deberle nada a nadie.' },
    { marca: 'final-independiente', fondo: 'ciudad', titulo: 'NADIE TE PREGUNTA', sub: 'Final independiente' },
  ],

  // =====================================================================
  // EPILOGO — UN AÑO DESPUES (sale detras del final de cada camino)
  // =====================================================================
  epilogo: [
    { fondo: 'ciudad', titulo: 'UN AÑO DESPUES', sub: 'Santa Perdida' },
    { solo: 'final-amarres', fondo: 'muelle', texto: 'Marina Roig manda en el puerto. Los barcos vuelven a entrar con luces. Lo que llevan dentro, eso no ha cambiado tanto.' },
    { solo: 'final-amarres', texto: 'En el despacho del muelle hay una foto de su padre. Debajo, una sola palabra: «socio».' },
    { solo: 'final-rompiente', fondo: 'barrio', texto: 'Los Rompientes siguen en pie. En la barricada principal hay un mural de tres metros: un chaval de veintitrés años con una sonrisa de pillo. Debajo pone «CHISPA».' },
    { solo: 'final-rompiente', texto: 'Vale manda con la cabeza fría. Casa Verdial y el puerto no se atreven a subir al barrio. Nadie de fuera, tampoco.' },
    { solo: 'final-verdial', fondo: 'despacho', texto: 'Casa Verdial es más fuerte que nunca. La Doña toma café cada mañana mirando al puerto. Ya no le dice a nadie lo que valdría bien llevado.' },
    { solo: 'final-verdial', texto: 'El Licenciado Empedrado redacta los contratos de toda la ciudad. Ninguno de ellos demuestra nada.' },
    { solo: 'final-consorcio', fondo: 'ciudad', texto: 'Donde estaba Los Rompientes hay un hotel de cinco estrellas. El puerto se llama ahora Marina Poniente. Los camareros vienen de fuera.' },
    { solo: 'final-consorcio', texto: 'Tienes una casa en las afueras con piscina. Nadie te saluda por la calle. Nadie de los de antes queda en la calle para saludarte.' },
    { solo: 'final-independiente', fondo: 'ciudad', texto: 'Las tres casas siguen peleándose, como siempre. Pero ninguna ha vuelto a vender un metro de Santa Perdida a nadie de fuera.' },
    { solo: 'final-independiente', texto: 'Marina, Chispa y la Doña se ven una vez al año, en la plaza del Farol, el día que murió el Cónsul. No se dirigen la palabra. Pero van.' },
    { solo: 'muerto:sacau', fondo: 'muelle', texto: 'En lo alto de la grúa alguien ha colgado una libreta vieja. Nadie la ha descolgado.' },
    { solo: ['muerto:ferro', '!final-rompiente'], texto: 'A Ferro no lo llora nadie en voz alta. Pero en el muelle sur, los viejos todavía brindan por él.' },
    { solo: 'hecha:la-medalla-que-falta', fondo: 'muelle', texto: 'En el faro, una anciana guarda una cabeza de madera con los ojos cerrados. Dice que la ciudad todavía no se la merece.' },
    { solo: 'hecha:la-chica-nueva', texto: 'Una postal llega a El Terciopelo desde una ciudad del norte. Solo pone: «Estoy bien. C.»' },
    { fondo: 'ciudad', texto: 'Santa Perdida le sigue rezando a una santa que nunca llegó. Por si acaso.' },
    { titulo: 'SANTA PERDIDA', sub: 'Aquí nadie pregunta de dónde vienes' },
  ],
};

// el decorado de cada banda, para las misiones sin dialogo propio
export const FONDO_BANDA = { amarres: 'muelle', rompiente: 'barrio', verdial: 'despacho' };
// quien es el jefe de cada banda en PERSONAJES
export const JEFE_BANDA = { amarres: 'consul', rompiente: 'chispa', verdial: 'dona' };
