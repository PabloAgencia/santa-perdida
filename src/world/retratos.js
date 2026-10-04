import { PERSONAJES, COLOR_BANDA } from '../config/personajes.js';

// EL RETRATO DE UN PERSONAJE (config/personajes.js). Si hay imagen de IA
// `retrato-<id>` cargada, esa; si no, el busto dibujado por codigo con sus
// rasgos: hombros con su ropa, cuello, cabeza, pelo, cejas, ojos y boca, y
// el detalle que lo distingue. Se fabrica una vez por personaje y la usan
// las cinematicas y la pantalla de PERSONAJES, asi la cara es siempre la
// misma en los dos sitios.
export function texturaRetrato(scene, id) {
  const p = PERSONAJES[id];
  if (!p) return null;
  if (scene.textures.exists(`retrato-${id}`)) return `retrato-${id}`;
  const clave = `retrato-codigo-${id}`;
  if (scene.textures.exists(clave)) return clave;
  const Wr = 190;
  const Hr = 214;
  const g = scene.make.graphics({}, false);
  const oscuro = (c, f) => Phaser.Display.Color.ValueToColor(c).darken(f).color;
  const claro = (c, f) => Phaser.Display.Color.ValueToColor(c).lighten(f).color;
  const fondo = COLOR_BANDA[p.banda] || 0x3a3d42;
  g.fillStyle(oscuro(fondo, 55), 1).fillRect(0, 0, Wr, Hr);
  g.fillStyle(oscuro(fondo, 40), 1).fillCircle(Wr / 2, Hr * 0.42, 92);
  const cx = Wr / 2;
  const cy = 92;   // centro de la cara

  // hombros y ropa
  g.fillStyle(p.ropa, 1).fillRoundedRect(cx - 82, Hr - 62, 164, 90, 34);
  g.fillStyle(oscuro(p.ropa, 25), 1).fillTriangle(cx - 22, Hr - 62, cx + 22, Hr - 62, cx, Hr - 26);
  if (p.ropa === 0x2a3a48 || p.ropa === 0x24262c) {
    // traje: camisa blanca y corbata
    g.fillStyle(0xe8e4dc, 1).fillTriangle(cx - 16, Hr - 62, cx + 16, Hr - 62, cx, Hr - 34);
    g.fillStyle(0x6a1a20, 1).fillRect(cx - 4, Hr - 58, 8, 28);
  }
  // cuello
  g.fillStyle(oscuro(p.piel, 12), 1).fillRect(cx - 17, cy + 38, 34, 30);
  // pelo de detras (largo, coleta, moño)
  if (p.pelo === 'largo') g.fillStyle(p.colorPelo, 1).fillRoundedRect(cx - 50, cy - 50, 100, 140, 40);
  if (p.pelo === 'mono') g.fillStyle(p.colorPelo, 1).fillCircle(cx, cy - 56, 24);
  if (p.pelo === 'coleta') g.fillStyle(p.colorPelo, 1).fillEllipse(cx + 44, cy + 6, 22, 64);
  // orejas y cara
  g.fillStyle(oscuro(p.piel, 8), 1).fillEllipse(cx - 42, cy + 4, 16, 26).fillEllipse(cx + 42, cy + 4, 16, 26);
  g.fillStyle(p.piel, 1).fillEllipse(cx, cy, 86, 106);
  g.fillStyle(claro(p.piel, 8), 1).fillEllipse(cx - 12, cy - 14, 30, 30);
  // barba (antes que la boca)
  if (p.barba) {
    g.fillStyle(p.barba, 0.85).fillEllipse(cx, cy + 30, 78, 50);
    g.fillStyle(p.piel, 1).fillEllipse(cx, cy + 8, 60, 36);
  }
  // pelo de arriba
  g.fillStyle(p.colorPelo, 1);
  if (p.pelo === 'corto' || p.pelo === 'peinado' || p.pelo === 'largo' || p.pelo === 'mono' || p.pelo === 'coleta') {
    g.fillEllipse(cx, cy - 40, 92, 46);
    if (p.pelo === 'peinado') g.fillStyle(claro(p.colorPelo, 20), 1).fillRect(cx - 30, cy - 52, 50, 3);
  } else if (p.pelo === 'canoso') {
    g.fillEllipse(cx, cy - 44, 84, 30);
    g.fillEllipse(cx - 40, cy - 16, 16, 40).fillEllipse(cx + 40, cy - 16, 16, 40);
  } else if (p.pelo === 'rapado') {
    g.fillStyle(p.colorPelo, 0.55).fillEllipse(cx, cy - 36, 86, 40);
  } else if (p.pelo === 'calvo') {
    g.fillEllipse(cx - 40, cy - 6, 14, 34).fillEllipse(cx + 40, cy - 6, 14, 34);
  }
  if (p.extra === 'gorra') {
    g.fillStyle(0x24262c, 1).fillEllipse(cx, cy - 42, 96, 40);
    g.fillStyle(0x15181d, 1).fillRect(cx - 10, cy - 34, 62, 10);
  }
  // cejas, ojos, nariz y boca
  const ceja = p.colorPelo === 0xc8c4bc || p.colorPelo === 0xd8d4cc ? 0x8a8680 : oscuro(p.colorPelo, 10);
  g.fillStyle(ceja, 1).fillRect(cx - 30, cy - 16, 20, 5).fillRect(cx + 10, cy - 16, 20, 5);
  g.fillStyle(0xf2efe6, 1).fillEllipse(cx - 19, cy - 3, 18, 10).fillEllipse(cx + 19, cy - 3, 18, 10);
  g.fillStyle(0x2a1a12, 1).fillCircle(cx - 18, cy - 3, 4).fillCircle(cx + 20, cy - 3, 4);
  g.fillStyle(oscuro(p.piel, 22), 1).fillTriangle(cx, cy - 2, cx - 7, cy + 18, cx + 6, cy + 18);
  if (p.bigote) g.fillStyle(p.bigote, 1).fillEllipse(cx, cy + 25, 40, 11);
  g.fillStyle(oscuro(p.piel, 40), 1).fillRect(cx - 13, cy + 32, 26, 4);
  if (p.gafas) {
    g.lineStyle(3, 0x15181d, 1).strokeRect(cx - 32, cy - 12, 26, 18).strokeRect(cx + 6, cy - 12, 26, 18);
    g.lineBetween(cx - 6, cy - 4, cx + 6, cy - 4);
  }
  if (p.extra === 'perlas') {
    g.fillStyle(0xf2efe6, 1);
    for (let i = -4; i <= 4; i++) g.fillCircle(cx + i * 9, Hr - 60 + Math.abs(i) * -2 + 6, 4);
  }
  if (p.extra === 'cadena') {
    g.lineStyle(3, 0xd4af37, 1).beginPath();
    g.arc(cx, Hr - 70, 30, 0.35 * Math.PI, 0.65 * Math.PI);
    g.strokePath();
  }
  g.generateTexture(clave, Wr, Hr);
  g.destroy();
  return clave;
}
