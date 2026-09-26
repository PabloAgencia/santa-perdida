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
    cuantos: 3,
    separacion: 2600,
    precio: 150,
    enCoche: false,
    color: 0xe8625a,
    // te deja como nuevo, y ademas quita el chaleco roto
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
    cuantos: 7,
    separacion: 1300,
    precio: 18,
    enCoche: false,
    color: 0xe8b54a,
    // barato y sin tope: comer cura poco y engorda, como debe ser
    accion: 'comer',
  },
};

export const CLAVES_LOCALES = Object.keys(LOCALES);

// cuanto cura cada cosa
export const CURAS = {
  hospital: 1,      // al maximo
  comida: 22,       // puntos de vida
  comidaEngorda: 1.6,
};
