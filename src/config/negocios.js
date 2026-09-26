// LOS NEGOCIOS QUE SE COMPRAN Y DAN RENTA. Uno por barrio, igual que los
// pisos: la clave es el barrio, no el edificio, para que sobreviva a que el
// reparto de la ciudad salga distinto en otra carga.
//
// `tipo` es el negocio de la banda que manda en esa zona (ver
// `config/factions.js`), salvo en Residencial, que no tiene banda: ahi no
// hay ataques nunca, es el unico sitio "tranquilo" para empezar.
//
// La renta se acumula sola con el tiempo (€ por segundo) hasta el `tope`, y
// hay que ir a cobrarla en persona con E: no ingresa sola en el bolsillo.
// Si la banda dueña de la zona esta hostil contigo, de vez en cuando te
// atacan el negocio (ver systems/NegocioSystem.js) y, si no los rechazas,
// se llevan parte de la caja.

export const NEGOCIOS = {
  conflictivo: {
    nombre: 'Locutorio Los Rompientes',
    corto: 'LOCUTORIO',
    descripcion: 'Llamadas a dos euros el minuto. La banda se queda el resto.',
    precio: 2200, rentaPorSegundo: 0.05, tope: 260,
    tipo: 'calle', color: 0xd97a3f,
  },
  residencial: {
    nombre: 'Lavanderia Buenavista',
    corto: 'LAVANDERIA',
    descripcion: 'Limpia ropa. Sin banda de por medio, sin sobresaltos.',
    precio: 3200, rentaPorSegundo: 0.06, tope: 320,
    tipo: 'neutral', color: 0x7fa8d0,
  },
  comercial: {
    nombre: 'Boutique Verdial',
    corto: 'BOUTIQUE',
    descripcion: 'Cobra caro, paga proteccion, no hace preguntas.',
    precio: 5200, rentaPorSegundo: 0.09, tope: 460,
    tipo: 'proteccion', color: 0x9a7ac4,
  },
  industrial: {
    nombre: 'Almacen del Poligono',
    corto: 'ALMACEN',
    descripcion: 'Cajas que entran de noche y salen de dia.',
    precio: 7000, rentaPorSegundo: 0.11, tope: 560,
    tipo: 'contrabando', color: 0x49b39c,
  },
  puerto: {
    nombre: 'Lonja del Muelle',
    corto: 'LONJA',
    descripcion: 'Pescado fresco. Y lo que venga por debajo.',
    precio: 9200, rentaPorSegundo: 0.13, tope: 640,
    tipo: 'contrabando', color: 0x2f7a6b,
  },
  centro: {
    nombre: 'Joyeria del Centro',
    corto: 'JOYERIA',
    descripcion: 'Lo mas caro de Santa Perdida, tambien para montar.',
    precio: 12000, rentaPorSegundo: 0.17, tope: 820,
    tipo: 'proteccion', color: 0x5a3f7a,
  },
};

// La clave con la que vive dentro de GameState.propiedades, igual que
// `clavePiso` en config/pisos.js
export const claveNegocio = (zona) => `negocio-${zona}`;
