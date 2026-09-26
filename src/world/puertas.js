// DONDE ESTA LA PUERTA DE UN EDIFICIO.
//
// Estaba copiada igual en ShopSystem y en PisoSystem, y al montar los locales
// (hospital, comisaria, taller, sitios de comida) iba a ser la tercera copia.
// Ahora vive aqui y la usan los tres.
//
// Un edificio vale si tiene un lado LIBRE que da a la acera: ni dentro de
// otro edificio ni en mitad de la calzada. Se prueban tres distancias, de
// menos a mas: cuanto mas pegada al edificio, mejor se lee que es su puerta.
export function puertaDe(map, b) {
  for (const dist of [26, 36, 48]) {
    const lados = [
      { x: b.px, y: b.py + b.ph / 2 + dist },
      { x: b.px, y: b.py - b.ph / 2 - dist },
      { x: b.px + b.pw / 2 + dist, y: b.py },
      { x: b.px - b.pw / 2 - dist, y: b.py },
    ];
    for (const c of lados) {
      if (map.isSolidBox(c.x, c.y, 14, 14)) continue;
      if (map.isRoadPoint(c.x, c.y)) continue;
      return c;
    }
  }
  return null;
}

// Reparte N sitios por la ciudad, uno por barrio primero y luego los que
// falten, respetando una separacion minima. Es el reparto que ya hacia la
// armeria: primero una por barrio, porque si no salian tres seguidas en el
// centro y ninguna en media ciudad.
//
// `ocupados`, si se pasa, es el Set compartido de edificios que YA tiene un
// cartel de otro sistema (CityScene.edificiosOcupados): se saltan al elegir,
// y el que se acaba usando se añade. Sin esto, dos sistemas deterministas
// (piso y negocio de un mismo barrio, por ejemplo) elegian el MISMO
// edificio con el MISMO criterio y sus carteles quedaban uno encima del
// otro, ilegibles.
export function repartirPorBarrios(map, { cuantos, separacion, minTile = 2, sirve = null, ocupados = null }) {
  const candidatos = map.buildings.filter(
    (b) => !b.isHideout && b.pw >= minTile * 32 && b.ph >= minTile * 32 &&
      (!sirve || sirve(b)) && (!ocupados || !ocupados.has(b))
  );
  Phaser.Utils.Array.Shuffle(candidatos);

  const puestos = [];
  const barrios = new Set();
  for (const pasada of [1, 2]) {
    for (const b of candidatos) {
      if (puestos.length >= cuantos) break;
      if (pasada === 1 && barrios.has(b.zone)) continue;
      if (puestos.some((p) => Phaser.Math.Distance.Between(p.x, p.y, b.px, b.py) < separacion)) {
        continue;
      }
      const puerta = puertaDe(map, b);
      if (!puerta) continue;
      barrios.add(b.zone);
      puestos.push({ x: puerta.x, y: puerta.y, edificio: b, zona: b.zone });
      if (ocupados) ocupados.add(b);
    }
  }
  return puestos;
}
