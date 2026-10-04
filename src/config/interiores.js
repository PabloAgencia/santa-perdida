// LAS SALAS DE LOS LOCALES POR DENTRO (APUNTES-PABLO-30SEP2026.txt, H1).
//
// Tienda 24h, Pollos Cluck, bar y hospital eran un aro en la acera: E y
// pasaba algo, sin entrar a ningun sitio. Ahora se entra, como al gimnasio o
// al club, y lo que se hacia en la acera se hace en el mostrador. Una sola
// escena (LocalScene) las pinta todas: lo que cambia de una a otra vive aqui.
//
// Todo en px dentro de la sala de 640x400 (la de siempre en los interiores),
// con el centro de cada mueble. La puerta esta SIEMPRE abajo en el centro
// (320, 394) y se entra a (320, 334): ese pasillo no se tapa nunca.
//
//   suelo       color base y dibujo: baldosa, madera, linoleo
//   muebles     los que chocan (solido: false = solo dibujo, como taburetes)
//   dependiente quien atiende: si lo tumbas, el mostrador se queda sin nadie
//   mostrador   donde se pulsa E
//   gente       clientes; con `hasta` van y vuelven entre dos puntos
//
// Tipos de mueble que sabe dibujar LocalScene: estanteria, nevera,
// mostrador, caja, cocina, mesa, barra, botellero, billar, maquina, cama,
// sillas, planta, cartel, taburete, alfombra, diana.

export const INTERIORES = {
  tienda24: {
    titulo: 'TIENDA 24H',
    colorTitulo: '#7fd0e8',
    suelo: { color: 0xc9ccc4, dibujo: 'baldosa' },
    pared: 0x3a4a52,
    luz: 0xe8f4ff,
    muebles: [
      // las neveras de bebida, contra la pared del fondo
      { tipo: 'nevera', x: 70, y: 36, w: 72, h: 34 },
      { tipo: 'nevera', x: 150, y: 36, w: 72, h: 34 },
      { tipo: 'nevera', x: 230, y: 36, w: 72, h: 34 },
      { tipo: 'nevera', x: 310, y: 36, w: 72, h: 34 },
      { tipo: 'nevera', x: 390, y: 36, w: 72, h: 34 },
      { tipo: 'cartel', x: 530, y: 30, w: 120, h: 22, texto: 'ABIERTO 24H', color: 0x7fd0e8, solido: false },
      // tres lineales de estanterias
      { tipo: 'estanteria', x: 230, y: 135, w: 300, h: 30 },
      { tipo: 'estanteria', x: 230, y: 215, w: 300, h: 30 },
      { tipo: 'estanteria', x: 175, y: 292, w: 190, h: 30 },
      // el mostrador, a la derecha de la puerta, con la caja encima
      { tipo: 'mostrador', x: 525, y: 268, w: 150, h: 34 },
      { tipo: 'mostrador', x: 592, y: 222, w: 30, h: 60 },
      { tipo: 'caja', x: 500, y: 266, w: 24, h: 18, solido: false },
      { tipo: 'estanteria', x: 520, y: 180, w: 120, h: 22, color: 0x6a3a3a },
      { tipo: 'planta', x: 34, y: 366, w: 26, h: 26 },
      { tipo: 'alfombra', x: 320, y: 372, w: 96, h: 34, color: 0x2e5a6a, solido: false },
    ],
    dependiente: { x: 525, y: 232, ped: 'ped-11' },
    mostrador: { x: 525, y: 306 },
    gente: [
      { x: 100, y: 175, hasta: { x: 360, y: 175 }, ped: 'ped-2' },
      { x: 360, y: 254, hasta: { x: 90, y: 254 }, ped: 'ped-6' },
      { x: 300, y: 80, ped: 'ped-9' },
    ],
    // lo que se compra en el mostrador (LocalScene.atender)
    accion: 'tienda',
    textoE: 'E botiquin',
    sePuedeAtracar: true,
  },

  comida: {
    titulo: 'POLLOS CLUCK',
    colorTitulo: '#e8b54a',
    suelo: { color: 0xb8a68a, dibujo: 'baldosa' },
    pared: 0x6a3a22,
    luz: 0xfff0d0,
    muebles: [
      // la cocina del fondo: freidoras y planchas
      { tipo: 'cocina', x: 320, y: 38, w: 600, h: 46 },
      { tipo: 'cartel', x: 200, y: 12, w: 120, h: 22, texto: 'MENU', color: 0xe8b54a, solido: false },
      { tipo: 'cartel', x: 440, y: 12, w: 120, h: 22, texto: 'CUBO x12', color: 0xd9384a, solido: false },
      // el mostrador corrido
      { tipo: 'mostrador', x: 320, y: 120, w: 380, h: 30, color: 0xd9384a },
      { tipo: 'caja', x: 250, y: 118, w: 22, h: 16, solido: false },
      { tipo: 'caja', x: 390, y: 118, w: 22, h: 16, solido: false },
      // las mesas del comedor, sin tapar el pasillo de la puerta
      { tipo: 'mesa', x: 90, y: 215, w: 64, h: 44 },
      { tipo: 'mesa', x: 90, y: 315, w: 64, h: 44 },
      { tipo: 'mesa', x: 205, y: 265, w: 64, h: 44 },
      { tipo: 'mesa', x: 435, y: 265, w: 64, h: 44 },
      { tipo: 'mesa', x: 550, y: 215, w: 64, h: 44 },
      { tipo: 'mesa', x: 550, y: 315, w: 64, h: 44 },
      { tipo: 'maquina', x: 612, y: 130, w: 28, h: 40, color: 0xd9384a },
      { tipo: 'planta', x: 30, y: 130, w: 26, h: 26 },
    ],
    dependiente: { x: 320, y: 88, ped: 'ped-7' },
    mostrador: { x: 320, y: 158 },
    gente: [
      { x: 205, y: 232, ped: 'ped-3', sentado: true },
      { x: 550, y: 282, ped: 'ped-10', sentado: true },
      { x: 90, y: 182, ped: 'ped-5', sentado: true },
      { x: 400, y: 160, ped: 'ped-1' },
      { x: 180, y: 88, hasta: { x: 470, y: 88 }, ped: 'ped-4' },
    ],
    accion: 'comer',
    textoE: 'E para pedir',
  },

  bar: {
    titulo: 'BAR',
    colorTitulo: '#d08a5a',
    suelo: { color: 0x6b4a32, dibujo: 'madera' },
    pared: 0x2e2018,
    luz: 0xffd8a0,
    muebles: [
      // la barra a lo largo de la pared izquierda, con las botellas detras
      { tipo: 'botellero', x: 22, y: 190, w: 16, h: 300, solido: false },
      { tipo: 'barra', x: 92, y: 190, w: 40, h: 290 },
      { tipo: 'taburete', x: 128, y: 90, w: 16, h: 16, solido: false },
      { tipo: 'taburete', x: 128, y: 135, w: 16, h: 16, solido: false },
      { tipo: 'taburete', x: 128, y: 245, w: 16, h: 16, solido: false },
      { tipo: 'taburete', x: 128, y: 290, w: 16, h: 16, solido: false },
      // la mesa de billar y las mesas
      { tipo: 'billar', x: 395, y: 150, w: 156, h: 84 },
      { tipo: 'mesa', x: 572, y: 80, w: 52, h: 52, redonda: true },
      { tipo: 'mesa', x: 572, y: 210, w: 52, h: 52, redonda: true },
      { tipo: 'mesa', x: 230, y: 300, w: 52, h: 52, redonda: true },
      { tipo: 'maquina', x: 612, y: 330, w: 30, h: 44, color: 0xc060a0 },
      { tipo: 'diana', x: 260, y: 16, w: 26, h: 26, solido: false },
    ],
    dependiente: { x: 52, y: 190, ped: 'ped-8' },
    mostrador: { x: 134, y: 190 },
    gente: [
      { x: 128, y: 90, ped: 'ped-0', sentado: true },
      { x: 128, y: 290, ped: 'ped-5', sentado: true },
      { x: 335, y: 210, hasta: { x: 460, y: 210 }, ped: 'ped-9' },
      { x: 572, y: 110, ped: 'ped-3', sentado: true },
      { x: 450, y: 320, hasta: { x: 540, y: 270 }, ped: 'ped-6' },
    ],
    accion: 'beber',
    textoE: 'E para tomar algo',
  },

  hospital: {
    titulo: 'HOSPITAL',
    colorTitulo: '#e8625a',
    suelo: { color: 0xd8dcd8, dibujo: 'linoleo' },
    pared: 0x5a6a70,
    luz: 0xf0fbff,
    muebles: [
      // las camas del fondo, separadas por cortinas
      { tipo: 'cama', x: 60, y: 62, w: 44, h: 84 },
      { tipo: 'cama', x: 140, y: 62, w: 44, h: 84 },
      { tipo: 'cama', x: 500, y: 62, w: 44, h: 84 },
      { tipo: 'cama', x: 580, y: 62, w: 44, h: 84 },
      { tipo: 'cartel', x: 320, y: 30, w: 150, h: 22, texto: 'URGENCIAS', color: 0xd9384a, solido: false },
      // la recepcion
      { tipo: 'mostrador', x: 320, y: 150, w: 230, h: 32, color: 0xe8e4dc },
      { tipo: 'caja', x: 360, y: 148, w: 26, h: 18, solido: false },
      // la sala de espera
      { tipo: 'sillas', x: 110, y: 290, w: 150, h: 22 },
      { tipo: 'sillas', x: 530, y: 290, w: 150, h: 22 },
      { tipo: 'planta', x: 30, y: 200, w: 26, h: 26 },
      { tipo: 'planta', x: 610, y: 200, w: 26, h: 26 },
      { tipo: 'maquina', x: 612, y: 360, w: 28, h: 40, color: 0x5a8fd0 },
    ],
    dependiente: { x: 320, y: 118, ped: 'ped-10' },
    mostrador: { x: 320, y: 190 },
    gente: [
      { x: 70, y: 290, ped: 'ped-1', sentado: true },
      { x: 150, y: 290, ped: 'ped-4', sentado: true },
      { x: 560, y: 290, ped: 'ped-2', sentado: true },
      { x: 200, y: 225, hasta: { x: 440, y: 225 }, ped: 'ped-7' },
      { x: 140, y: 62, ped: 'ped-0', tumbado: true },
      { x: 580, y: 62, ped: 'ped-11', tumbado: true },
    ],
    accion: 'curar',
    textoE: 'E para que te curen',
  },
};

// que locales se entran (el resto sigue en la acera: el taller y el
// mecanico se usan desde el coche, y la comisaria no tiene accion)
export const SE_ENTRA = Object.keys(INTERIORES);
