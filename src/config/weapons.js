// Las armas. Pocas y distintas entre si: cuatro que se usan de verdad valen
// mas que doce que se solapan.
//
// alcance      hasta donde llega (px)
// dano         por golpe o disparo
// cadencia     segundos entre golpe y golpe
// dispersion   cuanto se desvia (grados); la punteria del personaje la baja
// cargador     balas por disparo (la escopeta suelta varias a la vez)
// cuerpo       true = hay que estar pegado, no gasta municion

export const ARMAS = {
  puno: {
    clave: 'puno',
    nombre: 'Los puños',
    cuerpo: true,
    alcance: 26,
    dano: 8,
    cadencia: 0.42,
    dispersion: 0,
    precio: 0,
    municionMax: 0,
  },
  bate: {
    clave: 'bate',
    nombre: 'Bate',
    cuerpo: true,
    alcance: 34,
    dano: 22,
    cadencia: 0.55,
    dispersion: 0,
    precio: 120,
    municionMax: 0,
  },
  pistola: {
    clave: 'pistola',
    nombre: 'Pistola',
    cuerpo: false,
    alcance: 340,
    dano: 26,
    cadencia: 0.32,
    dispersion: 3.5,
    balasPorDisparo: 1,
    precio: 900,
    municionMax: 120,
    municionPorCompra: 20,
    precioMunicion: 30,
    ruido: 620,          // a que distancia lo oyen (y se asustan)
  },
  escopeta: {
    clave: 'escopeta',
    nombre: 'Escopeta',
    cuerpo: false,
    alcance: 190,
    dano: 17,            // por perdigon; de cerca entran casi todos
    cadencia: 0.95,
    dispersion: 11,
    balasPorDisparo: 5,
    precio: 2400,
    municionMax: 40,
    municionPorCompra: 10,
    precioMunicion: 60,
    ruido: 800,
  },
};

export const ORDEN_ARMAS = ['puno', 'bate', 'pistola', 'escopeta'];

// Cuanto aguanta cada uno antes de caer. El jugador tiene su propia vida.
export const VIDA = {
  peaton: 60,
  pandillero: 85,
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
