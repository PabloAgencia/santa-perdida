// LOS ROBOS DE CASAS (IDEAS-DE-LOS-GTA-3, punto 1), a lo San Andreas.
//
// LO QUE ES DE SAN ANDREAS TAL CUAL:
//   · hay una furgoneta especial; subirte a ella DE NOCHE (20:00 a 06:00)
//     empieza el robo, de dia no pasa nada
//   · durante el robo salen marcadas casas a las que se puede entrar
//   · dentro, a oscuras, cuanto mas ruido haces mas se llena la barra; si
//     se llena, el de la casa se despierta y llama a la policia
//   · agachado no haces ruido (pero vas despacio); corriendo, mucho
//   · los objetos se sacan de uno en uno, en brazos, y se meten en la
//     furgoneta; con algo en brazos no se corre
//   · lo de la furgoneta se cobra al llevarla al almacen
//   · al amanecer (06:00) se acaba: lo que no hayas vendido se pierde
//   · robar 10.000 € en total da aguante infinito (no te cansas de correr)
//
// LO QUE ES NUESTRO (no sale del juego original, se puede tocar a gusto):
// los numeros de abajo: capacidad, valores, cuanto ruido hace cada cosa.

export const ROBO = {
  horaEmpieza: 20,       // de 20:00...
  horaAcaba: 6,          // ...a 06:00
  furgonetas: 2,         // cuantas hay aparcadas por la ciudad
  capacidad: 8,          // objetos que caben en la furgoneta
  casasMarcadas: 12,     // las casas que salen marcadas al empezar
  radioCasas: 2600,      // como de lejos de la furgoneta pueden estar
  premioTotal: 10000,    // lo robado en total que da el aguante infinito

  // la barra de ruido (0-100) dentro de una casa, por segundo
  ruido: {
    andando: 5,
    corriendo: 34,
    agachado: 0,
    cargando: 7,         // andar con algo en brazos
    choque: 12,          // de golpe, al darte contra un mueble
    baja: 7,             // lo que se calma quieto o agachado
  },
};

// lo que se puede llevar de una casa. `pesado` = vas mas lento con ello.
export const OBJETOS_ROBO = [
  { clave: 'tele', nombre: 'Television', valor: 320, pesado: true, w: 40, h: 12, color: 0x15181d },
  { clave: 'equipo', nombre: 'Equipo de musica', valor: 210, pesado: false, w: 30, h: 16, color: 0x3a3d42 },
  { clave: 'consola', nombre: 'Videoconsola', valor: 190, pesado: false, w: 18, h: 12, color: 0xf2efe6 },
  { clave: 'ordenador', nombre: 'Ordenador', valor: 260, pesado: true, w: 26, h: 20, color: 0xc8c4b8 },
  { clave: 'microondas', nombre: 'Microondas', valor: 90, pesado: false, w: 26, h: 18, color: 0xdcd8cc },
  { clave: 'joyero', nombre: 'Joyero', valor: 380, pesado: false, w: 16, h: 12, color: 0x8a3a2a },
  { clave: 'cuadro', nombre: 'Cuadro', valor: 160, pesado: false, w: 34, h: 8, color: 0xb8862a },
  { clave: 'plata', nombre: 'Cuberteria de plata', valor: 230, pesado: false, w: 24, h: 10, color: 0xc4c8cc },
  { clave: 'lampara', nombre: 'Lampara de diseño', valor: 120, pesado: false, w: 14, h: 14, color: 0xe8c860 },
];
