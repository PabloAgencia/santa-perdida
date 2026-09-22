// LOS PISOS FRANCOS QUE SE COMPRAN. Uno por barrio, y el barrio decide lo que
// cuesta y cuantos coches caben: en Los Rompientes un altillo barato de una
// plaza, en el Centro un apartamento caro, en el puerto un almacen enorme.
//
// Los nombres van en el tono que pide Pablo: que suenen a sitio real y
// corriente. Nada de "La Guarida de las Sombras".
//
// POR QUE LA CLAVE ES EL BARRIO Y NO EL EDIFICIO
//   Un piso se COMPRA, asi que su clave tiene que ser la misma partida tras
//   partida. Si la clave llevara las coordenadas del edificio (como hace la
//   armeria), bastaria con que el reparto saliera un metro distinto para que
//   el piso que pagaste dejara de ser tuyo. Con la clave del barrio, eso no
//   puede pasar.
//
// LOS PRECIOS, PARA PODER TOCARLOS
//   Un reparto paga entre 40 y 150, y los coches valen de 1.800 a 8.500. El
//   altillo esta puesto a 1.200 a proposito: tiene que ser la primera cosa
//   gorda que te puedas permitir, antes incluso que un coche decente.

export const PISOS = {
  conflictivo: {
    nombre: 'Altillo en Los Rompientes',
    descripcion: 'Una habitacion encima de un bar. Se oye todo.',
    precio: 1200,
    plazas: 1,
  },
  residencial: {
    nombre: 'Piso en Residencial',
    descripcion: 'Tercero sin ascensor, pero nadie pregunta nada.',
    precio: 3500,
    plazas: 2,
  },
  comercial: {
    nombre: 'Estudio sobre la tienda',
    descripcion: 'Entrada por el callejon de atras.',
    precio: 5000,
    plazas: 2,
  },
  industrial: {
    nombre: 'Nave en el poligono',
    descripcion: 'Fria y vacia, pero caben coches.',
    precio: 7500,
    plazas: 3,
  },
  puerto: {
    nombre: 'Almacen del puerto',
    descripcion: 'Huele a gasoil. El porton da directo al muelle.',
    precio: 11000,
    plazas: 4,
  },
  centro: {
    nombre: 'Apartamento del Centro',
    descripcion: 'Lo mas caro de Santa Perdida, y se nota.',
    precio: 16000,
    plazas: 4,
  },
};

// La clave con la que vive dentro de GameState.propiedades
export const clavePiso = (zona) => `piso-${zona}`;

export const ZONAS_CON_PISO = Object.keys(PISOS);
