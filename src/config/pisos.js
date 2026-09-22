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

// `lamina` es la ilustracion del interior, UNA POR PISO. Suben de lujo con el
// precio, que es lo que hace que subir de casa se sienta:
//   1.200   altillo      un agujero encima de un bar
//   3.500   residencial  una casa normal y corriente
//   5.000   estudio      pequeño pero decente, encima de la tienda
//   7.500   nave         hormigon frio, pero caben coches
//  11.000   almacen      enorme y portuario, huele a gasoil
//  16.000   centro       la recompensa: caro de verdad
//
// Si la suya no esta, se prueba `interior-piso` (una generica) y, si tampoco,
// el dibujo por codigo. Se pueden ir metiendo de una en una sin romper nada.
export const PISOS = {
  conflictivo: {
    nombre: 'Altillo en Los Rompientes',
    descripcion: 'Una habitacion encima de un bar. Se oye todo.',
    precio: 1200,
    plazas: 1,
    lamina: 'interior-piso-altillo',
  },
  residencial: {
    nombre: 'Piso en Residencial',
    descripcion: 'Tercero sin ascensor, pero nadie pregunta nada.',
    precio: 3500,
    plazas: 2,
    lamina: 'interior-piso-residencial',
  },
  comercial: {
    nombre: 'Estudio sobre la tienda',
    descripcion: 'Entrada por el callejon de atras.',
    precio: 5000,
    plazas: 2,
    lamina: 'interior-piso-estudio',
  },
  industrial: {
    nombre: 'Nave en el poligono',
    descripcion: 'Fria y vacia, pero caben coches.',
    precio: 7500,
    plazas: 3,
    lamina: 'interior-piso-nave',
  },
  puerto: {
    nombre: 'Almacen del puerto',
    descripcion: 'Huele a gasoil. El porton da directo al muelle.',
    precio: 11000,
    plazas: 4,
    lamina: 'interior-piso-almacen',
  },
  centro: {
    nombre: 'Apartamento del Centro',
    descripcion: 'Lo mas caro de Santa Perdida, y se nota.',
    precio: 16000,
    plazas: 4,
    lamina: 'interior-piso-centro',
  },
};

// La clave con la que vive dentro de GameState.propiedades
export const clavePiso = (zona) => `piso-${zona}`;

export const ZONAS_CON_PISO = Object.keys(PISOS);
