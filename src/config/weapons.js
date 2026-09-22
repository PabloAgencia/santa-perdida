// Las armas. Cada una tiene SU sitio: si dos sirven para lo mismo, sobra una.
//
//   puños      lo que llevas siempre, para el barullo de cerca
//   bate       pega el triple que el puño, pero hay que pegarse
//   pistola    la de andar por casa: media distancia y muchas balas
//   escopeta   de cerca no perdona, de lejos no hace nada
//   rifle      la de las broncas gordas: rapida, larga y de cargador grande
//   sniper     de una calle a otra, un tiro cada dos segundos y a la primera
//
// alcance      hasta donde llega (px). La calle mide 160 px de ancho y la
//              pantalla, unos 1.100: mas de eso es disparar a ciegas.
// dano         por golpe o disparo
// cadencia     segundos entre golpe y golpe
// dispersion   cuanto se desvia (grados); la punteria del personaje la baja
// cargador     balas por disparo (la escopeta suelta varias a la vez)
// cuerpo       true = hay que estar pegado, no gasta municion
// dosManos     como se agarra. Solo sirve para la POSE de los brazos:
//              con dos manos los dos se juntan al frente; con una sola,
//              el otro brazo se queda al costado.
// sonido       que muestra de audio suena al disparar

export const ARMAS = {
  puno: {
    clave: 'puno',
    nombre: 'Los puños',
    cuerpo: true,
    alcance: 26,
    dano: 11,
    cadencia: 0.34,
    dispersion: 0,
    precio: 0,
    municionMax: 0,
    sonido: 'golpe',
  },
  bate: {
    dosManos: true,
    clave: 'bate',
    nombre: 'Bate',
    cuerpo: true,
    alcance: 34,
    dano: 26,
    cadencia: 0.55,
    dispersion: 0,
    precio: 120,
    municionMax: 0,
    sonido: 'golpe',
  },
  pistola: {
    dosManos: false,
    clave: 'pistola',
    nombre: 'Pistola',
    cuerpo: false,
    alcance: 300,
    dano: 24,
    cadencia: 0.3,
    dispersion: 3.5,
    balasPorDisparo: 1,
    precio: 900,
    municionMax: 120,
    municionPorCompra: 20,
    precioMunicion: 30,
    sonido: 'pistola',
    ruido: 620,          // a que distancia lo oyen (y se asustan)
  },
  escopeta: {
    dosManos: true,
    clave: 'escopeta',
    nombre: 'Escopeta',
    cuerpo: false,
    alcance: 165,
    dano: 18,            // por perdigon; de cerca entran casi todos
    cadencia: 0.95,
    dispersion: 11,
    balasPorDisparo: 5,
    precio: 2400,
    municionMax: 40,
    municionPorCompra: 10,
    precioMunicion: 60,
    sonido: 'escopeta',
    ruido: 800,
  },
  // El rifle: la de las broncas gordas. Llega el doble que la pistola, va
  // casi al doble de rapido y el cargador es grande, pero moverse la
  // descoloca mucho mas y las balas cuestan un dineral.
  rifle: {
    dosManos: true,
    clave: 'rifle',
    nombre: 'Rifle de asalto',
    cuerpo: false,
    alcance: 560,
    dano: 22,
    cadencia: 0.14,
    dispersion: 5.5,
    balasPorDisparo: 1,
    precio: 4200,
    municionMax: 210,
    municionPorCompra: 30,
    precioMunicion: 95,
    sonido: 'rifle',
    ruido: 900,
  },
  // El sniper: de una punta de la calle a la otra, sin desvio ninguno, pero
  // dos segundos entre tiro y tiro. De cerca es un ladrillo.
  sniper: {
    dosManos: true,
    clave: 'sniper',
    nombre: 'Rifle de mira',
    cuerpo: false,
    alcance: 1100,
    dano: 95,
    cadencia: 1.9,
    dispersion: 0.6,
    balasPorDisparo: 1,
    precio: 9000,
    municionMax: 30,
    municionPorCompra: 5,
    precioMunicion: 220,
    sonido: 'sniper',
    ruido: 1300,
  },
};

export const ORDEN_ARMAS = ['puno', 'bate', 'pistola', 'escopeta', 'rifle', 'sniper'];

// Cuanto aguanta cada uno antes de caer. El jugador tiene su propia vida.
export const VIDA = {
  peaton: 60,
  pandillero: 70,
  policia: 110,
};

export const COMBATE = {
  // cono por delante donde se busca objetivo, en radianes a cada lado
  conoFijado: Math.PI / 3,
  // si no hay nadie delante, se mira alrededor pero mas cerca
  alcanceCortoAlrededor: 90,
  // la punteria del personaje quita hasta este porcentaje de dispersion
  mejoraPorPunteria: 0.6,
  // moverse empeora la punteria
  penalizacionEnMovimiento: 1.8,
  // el musculo suma a los golpes de cerca
  danoExtraPorMusculo: 0.5,
};
