// BRAZOS Y PIERNAS QUE SE MUEVEN DE VERDAD.
//
// Hasta ahora el personaje eran cuatro texturas con los brazos ya dibujados
// en cuatro posiciones. Eso da un andar decente y nada mas: no puede correr
// mas deprisa con los brazos, ni estirar el brazo al apuntar, ni quedarse
// con las manos quietas mientras el cuerpo gira.
//
// Aqui las extremidades son piezas sueltas que giran sobre el hombro y la
// cadera en cada fotograma. Desde arriba el brazo es LO UNICO que se lee de
// una persona, asi que es donde mas se nota.
//
// EL COLOR SE SACA DEL PROPIO SPRITE
//   El cuerpo puede ser el dibujo por codigo o una de las imagenes generadas
//   con IA (normal, gordo, fuerte), y cada una tiene su chaqueta. Si el color
//   del brazo estuviera puesto a mano, al cambiar de cuerpo los brazos se
//   quedarian de otro color. Se muestrea del sprite y siempre pega.

const OSCURO = 0x0a0c10;

// Mira unos cuantos puntos del sprite y devuelve el color que mas manda.
// Se ignoran los pixeles transparentes y los muy oscuros (el contorno), que
// si no el brazo sale negro.
export function colorDelCuerpo(scene, clave, porDefecto = 0xa8552f) {
  if (!scene.textures.exists(clave)) return porDefecto;
  const tex = scene.textures.get(clave);
  const ancho = tex.getSourceImage().width;
  const alto = tex.getSourceImage().height;

  const cuenta = new Map();
  // se recorre la mitad delantera del cuerpo, que es donde esta la chaqueta;
  // la trasera trae los pies y ensucia la cuenta
  for (let x = Math.floor(ancho * 0.35); x < Math.floor(ancho * 0.7); x++) {
    for (let y = Math.floor(alto * 0.3); y < Math.floor(alto * 0.7); y++) {
      const p = scene.textures.getPixel(x, y, clave);
      if (!p || p.alpha < 200) continue;
      if (p.r + p.g + p.b < 90) continue;          // contorno
      // se agrupan los tonos parecidos para que no gane un pixel suelto
      const k = ((p.r >> 4) << 8) | ((p.g >> 4) << 4) | (p.b >> 4);
      const antes = cuenta.get(k) || { n: 0, r: 0, g: 0, b: 0 };
      cuenta.set(k, { n: antes.n + 1, r: antes.r + p.r, g: antes.g + p.g, b: antes.b + p.b });
    }
  }
  let mejor = null;
  for (const v of cuenta.values()) if (!mejor || v.n > mejor.n) mejor = v;
  if (!mejor || mejor.n < 6) return porDefecto;

  const r = Math.round(mejor.r / mejor.n);
  const g = Math.round(mejor.g / mejor.n);
  const b = Math.round(mejor.b / mejor.n);
  return (r << 16) | (g << 8) | b;
}

// HASTA DONDE LLEGA EL CUERPO POR CADA COSTADO.
//
// Esto existe por un fallo que costo una tanda: los brazos van DETRAS del
// tronco, asi que si el hombro cae dentro de la silueta, el brazo no se ve.
// Nada. Se pusieron los hombros "un poco mas adentro" para que no parecieran
// despegados y desaparecieron del todo.
//
// Se mide en vez de calcularse porque cada cuerpo ocupa lo suyo: el dibujo
// por codigo es simetrico, pero las fotos de IA no (la del jugador llega a
// -11 por arriba y a +8 por abajo), y ademas cambian al engordar.
//
// Devuelve, en pixeles desde el centro, lo que sobresale por arriba y por
// abajo mirando solo la MITAD DELANTERA, que es donde estan los hombros.
export function costadosDelCuerpo(scene, clave, porDefecto = 7) {
  if (!scene.textures.exists(clave)) return { arriba: porDefecto, abajo: porDefecto };
  const img = scene.textures.get(clave).getSourceImage();
  const cx = img.width / 2;
  const cy = img.height / 2;

  let arriba = 0;
  let abajo = 0;
  for (let x = Math.floor(cx * 0.8); x < img.width; x++) {
    for (let y = 0; y < img.height; y++) {
      const p = scene.textures.getPixel(x, y, clave);
      if (!p || p.alpha < 60) continue;
      const d = y - cy;
      if (d < 0) arriba = Math.max(arriba, -d);
      else abajo = Math.max(abajo, d);
    }
  }
  return {
    arriba: arriba || porDefecto,
    abajo: abajo || porDefecto,
  };
}

// Una extremidad: una capsula con contorno oscuro y, si lleva mano, un
// circulo de piel en la punta. El origen se pone luego en el extremo de
// dentro, que es por donde tiene que girar.
export function makeExtremidad(scene, clave, { color, largo, ancho, piel = null }) {
  if (scene.textures.exists(clave)) scene.textures.remove(clave);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const w = Math.ceil(largo);
  const h = Math.ceil(ancho);

  // El contorno va FINO a proposito. Con 0,9 px por lado, en una extremidad
  // de 5 px de alto el relleno se quedaba en 3 y el brazo se veia casi negro
  // desde arriba: parecia una pata de insecto en vez de un brazo.
  const borde = 0.55;
  g.fillStyle(OSCURO, 1);
  g.fillRoundedRect(0, 0, w, h, h / 2);
  g.fillStyle(color, 1);
  g.fillRoundedRect(borde, borde, w - borde * 2, h - borde * 2, (h - borde * 2) / 2);

  // LA MANO, MINUSCULA. Un brazo aqui mide 9x5 pixeles: con la mano a radio
  // 1,8 se comia un TERCIO del brazo y desde arriba se veia un cuadro de
  // color carne flotando, no una mano. Y el aro oscuro alrededor no cabe: a
  // este tamaño solo sirve para tapar la propia mano.
  if (piel !== null) {
    g.fillStyle(piel, 1);
    g.fillCircle(w - h * 0.4, h / 2, h * 0.22);
  }

  g.generateTexture(clave, w, h);
  g.destroy();
}

export function aclarar(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
}
