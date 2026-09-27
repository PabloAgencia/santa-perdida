// UNA ETIQUETA FLOTANTE SOBRE EL MUNDO: el nombre de un local, una tienda,
// un negocio, un territorio... Antes cada sistema escribia su propio texto
// de un color directamente sobre el mundo, con solo un borde negro fino de
// contorno (ver el historial: LocalSystem, ShopSystem, ConcesionarioSystem,
// CarreraSystem, GuerraTerritorioSystem y MercadoSystem lo repetian cada uno
// por su cuenta). Contra un tejado de foto de verdad (ya no un rectangulo
// plano) se leia mal, y era el mismo texto pequeño sobre fondos muy
// distintos por toda la ciudad — "sale lo de gimnasio pero no se lee bien".
//
// Ahora el texto es SIEMPRE blanco, bien legible, y lleva una placa oscura
// semitransparente detras (el mismo tono que el resto del HUD). El color
// propio de cada sitio no se pierde: se queda en una rayita fina debajo.
export function etiquetaFlotante(scene, x, y, texto, color, tam = 13) {
  const t = scene.add.text(x, y, texto, {
    fontFamily: 'Pricedown, Anton, Impact, sans-serif',
    fontSize: `${tam}px`,
    color: '#f5f1e6',
    align: 'center',
    stroke: '#05060a',
    strokeThickness: 4,
  }).setOrigin(0.5).setDepth(6.2);

  const placa = scene.add.image(x, y, 'px').setTint(0x05060a).setAlpha(0.7).setDepth(6);
  const raya = scene.add.image(x, y, 'px').setTint(color).setAlpha(0.95).setDepth(6.1);

  // Ajusta la placa al ANCHO REAL del texto. Se llama sola al crearla, y hay
  // que volver a llamarla a mano si el texto cambia despues (el precio de un
  // negocio, la caja, el piso que se acaba de comprar): por eso se devuelve.
  const refrescar = () => {
    placa.setPosition(t.x, t.y).setDisplaySize(t.width + 16, t.height + 6);
    raya.setPosition(t.x, t.y + t.height / 2 + 2).setDisplaySize(Math.min(t.width + 6, 70), 3);
  };
  refrescar();

  return { texto: t, placa, raya, refrescar };
}
