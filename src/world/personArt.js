// Dibuja una persona vista desde arriba con brazos y piernas de verdad, en
// una fase concreta del paso. Generando cuatro fases se consigue que ande.
//
// El personaje mira hacia +x. Los brazos van a los lados y se balancean
// adelante y atras; las piernas hacen lo contrario, como al caminar.

export function drawPerson(g, opts, fase) {
  const {
    chaqueta,
    piel,
    pelo,
    detalle = null,
    ancho = 13,
    largo = 14,
    cx = 14,
    cy = 14,
  } = opts;

  // fase va de 0 a 1; el seno da el vaiven
  const swing = Math.sin(fase * Math.PI * 2);
  const brazo = swing * 4.2;
  const pierna = -swing * 4.0;

  const oscuro = 0x0a0c10;

  // PIERNAS: salen por detras del tronco, una adelantada y otra atrasada
  const piernaY = ancho * 0.24;
  const piernaX = cx - largo * 0.46;
  g.fillStyle(oscuro, 1);
  g.fillRect(piernaX - 5 + pierna, cy - piernaY - 2.6, 9, 5.2);
  g.fillRect(piernaX - 5 - pierna, cy + piernaY - 2.6, 9, 5.2);
  g.fillStyle(shadeLocal(chaqueta, 0.5), 1);
  g.fillRect(piernaX - 4.2 + pierna, cy - piernaY - 2, 8, 4);
  g.fillRect(piernaX - 4.2 - pierna, cy + piernaY - 2, 8, 4);
  // pies
  g.fillStyle(0x15171c, 1);
  g.fillRect(piernaX - 6 + pierna, cy - piernaY - 2, 2.6, 4);
  g.fillRect(piernaX - 6 - pierna, cy + piernaY - 2, 2.6, 4);

  // BRAZOS: por fuera del tronco, se ven enteros a ambos lados
  const brazoY = ancho * 0.66;
  g.fillStyle(oscuro, 1);
  g.fillRect(cx - 3 + brazo, cy - brazoY - 2.4, 10, 4.8);
  g.fillRect(cx - 3 - brazo, cy + brazoY - 2.4, 10, 4.8);
  g.fillStyle(shadeLocal(chaqueta, 0.86), 1);
  g.fillRect(cx - 2.4 + brazo, cy - brazoY - 1.8, 9, 3.6);
  g.fillRect(cx - 2.4 - brazo, cy + brazoY - 1.8, 9, 3.6);

  // manos
  g.fillStyle(piel, 1);
  g.fillCircle(cx + 6.4 + brazo, cy - brazoY, 2);
  g.fillCircle(cx + 6.4 - brazo, cy + brazoY, 2);

  // tronco
  g.fillStyle(oscuro, 1);
  g.fillRoundedRect(cx - largo * 0.5, cy - ancho * 0.5, largo, ancho, 4);
  g.fillStyle(chaqueta, 1);
  g.fillRoundedRect(cx - largo * 0.44, cy - ancho * 0.42, largo - 2, ancho - 2, 3.5);
  g.fillStyle(shadeLocal(chaqueta, 1.22), 1);
  g.fillRoundedRect(cx - largo * 0.32, cy - ancho * 0.26, largo - 6, ancho - 6, 3);

  if (detalle !== null) {
    g.fillStyle(detalle, 1);
    g.fillRect(cx - largo * 0.1, cy - ancho * 0.42, 2.6, ancho - 2);
  }

  // hombros, para que se lea el sentido de la marcha
  g.fillStyle(shadeLocal(chaqueta, 0.7), 1);
  g.fillRect(cx - largo * 0.36, cy - ancho * 0.5, 4, 1.8);
  g.fillRect(cx - largo * 0.36, cy + ancho * 0.28, 4, 1.8);

  // cabeza
  g.fillStyle(oscuro, 1);
  g.fillCircle(cx + largo * 0.34, cy, 4.9);
  g.fillStyle(piel, 1);
  g.fillCircle(cx + largo * 0.34, cy, 3.9);
  g.fillStyle(pelo, 1);
  g.fillCircle(cx + largo * 0.2, cy, 3.2);
}

function shadeLocal(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
}

export const FASES = 4;

// genera las cuatro texturas de un personaje: prefijo-0 .. prefijo-3
export function makeWalkFrames(scene, prefijo, opts, tam = 28) {
  for (let f = 0; f < FASES; f++) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    drawPerson(g, Object.assign({ cx: tam / 2, cy: tam / 2 }, opts), f / FASES);
    g.generateTexture(`${prefijo}-${f}`, tam, tam);
    g.destroy();
  }
}
