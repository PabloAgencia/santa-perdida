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
};

// el decorado de cada banda, para las misiones sin dialogo propio
export const FONDO_BANDA = { amarres: 'muelle', rompiente: 'barrio', verdial: 'despacho' };
// quien es el jefe de cada banda en PERSONAJES
export const JEFE_BANDA = { amarres: 'consul', rompiente: 'chispa', verdial: 'dona' };
