// LOS SITIOS DE LA CIUDAD A LOS QUE SE VA A ALGO.
//
// La armeria y los pisos tienen su propio sistema porque hacen cosas raras
// (un catalogo, una compra que se guarda). Estos cuatro son mas simples: te
// acercas, pulsas E, pagas y pasa algo. Uno solo archivo los describe y
// LocalSystem los reparte y los atiende, asi que añadir el quinto es añadir
// diez lineas aqui.
//
//   cuantos      cuantos hay en la ciudad
//   separacion   px minimos entre dos del mismo tipo
//   precio       lo que cuesta usarlo
//   enCoche      si hay que estar DENTRO de un coche (el taller) o fuera
//   color        el del aro y el del nombre en el mapa

export const LOCALES = {
  hospital: {
    clave: 'hospital',
    nombre: 'Hospital',
    corto: 'HOSPITAL',
    cuantos: 6,
    separacion: 2300,
    precio: 150,
    enCoche: false,
    color: 0xe8625a,
    // solo la salud, como en los demas GTA: el chaleco no se cura aqui
    accion: 'curar',
    // aparcada fuera: una ambulancia que se puede robar como cualquier coche
    vehiculo: 'ambulancia',
  },
  comisaria: {
    clave: 'comisaria',
    nombre: 'Comisaria',
    corto: 'COMISARIA',
    cuantos: 2,
    separacion: 3200,
    precio: 0,
    enCoche: false,
    color: 0x5a8fd0,
    // no se entra: es donde apareces si te detienen, y un sitio del que
    // conviene saber donde esta para no pasar por delante con seis estrellas
    accion: 'ninguna',
    vehiculo: 'patrulla',
  },
  taller: {
    clave: 'taller',
    nombre: 'Taller de pintura',
    corto: 'TALLER',
    cuantos: 3,
    separacion: 2400,
    precio: 200,
    enCoche: true,
    color: 0x8fd694,
    // el clasico: entras con el coche, sale pintado de otro color, con la
    // chapa arreglada y SIN policia detras (si no te estan viendo)
    accion: 'pintar',
  },
  comida: {
    clave: 'comida',
    nombre: 'Pollos Cluck',
    corto: 'COMIDA',
    cuantos: 10,
    separacion: 1100,
    precio: 18,
    enCoche: false,
    color: 0xe8b54a,
    // barato y sin tope: comer cura poco y engorda, como debe ser
    accion: 'comer',
  },
  // F2: COSAS QUE HACER EN CASI CUALQUIER PUNTO DEL MAPA. Tres sitios mas,
  // repartidos por toda la ciudad como la comida: uno para comprar, uno para
  // reparar el coche y uno para tomar algo. Mismo patron de siempre (te
  // acercas, E, pagas, pasa algo): lo que cambia esta aqui.
  tienda24: {
    clave: 'tienda24',
    nombre: 'Tienda 24h',
    corto: 'TIENDA 24H',
    cuantos: 9,
    separacion: 1000,
    precio: 35,
    enCoche: false,
    color: 0x7fd0e8,
    // sin arma en la mano: compras un botiquin. Con un arma de fuego en la
    // mano: es un ATRACO (cobras, pero te ven y sube la busca)
    accion: 'tienda',
  },
  mecanico: {
    clave: 'mecanico',
    nombre: 'Taller mecanico',
    corto: 'MECANICO',
    cuantos: 6,
    separacion: 1500,
    precio: 60,
    enCoche: true,
    color: 0xe0a050,
    // arregla la chapa, pero no pinta ni te quita la busca (eso es del taller
    // de pintura): es la opcion barata
    accion: 'reparar',
  },
  bar: {
    clave: 'bar',
    nombre: 'Bar',
    corto: 'BAR',
    cuantos: 7,
    separacion: 1200,
    precio: 12,
    enCoche: false,
    color: 0xd08a5a,
    accion: 'beber',
  },
  // SISTEMA-PERSONAJE.txt punto 4: uno en el centro y otro en el comercial.
  // Se paga la cuota al entrar y dentro (GimnasioScene) estan las maquinas.
  gimnasio: {
    clave: 'gimnasio',
    nombre: 'Gimnasio',
    corto: 'GIMNASIO',
    cuantos: 2,
    separacion: 2000,
    zonas: ['centro', 'comercial'],
    precio: 20,
    enCoche: false,
    color: 0xd98a4a,
    accion: 'gimnasio',
  },
  // HISTORIA-SANTA-PERDIDA.txt, "EL BAJO MUNDO": el club de El Duque, uno
  // solo en toda la ciudad (cuantos: 1) y siempre en la zona comercial,
  // terreno de Casa Verdial. Misma mecanica que el gimnasio: se paga en la
  // puerta y dentro (ClubScene) esta el resto.
  club: {
    clave: 'club',
    nombre: 'El Terciopelo',
    corto: 'EL TERCIOPELO',
    cuantos: 1,
    separacion: 9999,
    zonas: ['comercial'],
    precio: 25,
    enCoche: false,
    color: 0xc060a0,
    accion: 'club',
  },
};

export const CLAVES_LOCALES = Object.keys(LOCALES);

// cuanto cura cada cosa
export const CURAS = {
  hospital: 1,      // al maximo
  comida: 22,       // puntos de vida
  comidaEngorda: 1.6,
};
