// Semaforos en los cruces. Sin esto, en cada cruce se juntaban tres coches
// apuntando a sitios distintos, se empotraban y ya no salian de ahi.
//
// Un cruce solo tiene DOS estados de verdad: pasan los que van en horizontal
// o pasan los que van en vertical. Cada cruce lleva su propio desfase, asi que
// no cambian todos a la vez y la ciudad no respira de golpe.

const VERDE = 8.5;
const AMBAR = 1.6;
const CICLO = (VERDE + AMBAR) * 2;

// a que distancia del centro del cruce esta la linea de detencion
export const LINEA_PARADA = 92;

export class TrafficLights {
  constructor(scene, net) {
    this.scene = scene;
    this.net = net;
    this.t = 0;
    this.cruces = new Map();
    this.luces = [];

    for (const n of net.nodes) {
      // solo los cruces de verdad: un tramo que sigue recto no necesita luz
      if (n.out.length < 3) continue;
      this.cruces.set(n.id, { node: n, desfase: Math.random() * CICLO });
      this.dibujar(n);
    }
  }

  // 'verde' | 'ambar' | 'rojo' para quien llega al cruce `nodeId`
  estadoEn(nodeId, horizontal) {
    const c = this.cruces.get(nodeId);
    if (!c) return 'verde';
    const p = (this.t + c.desfase) % CICLO;
    const enFaseH = p < VERDE + AMBAR;
    const dentro = enFaseH ? p : p - (VERDE + AMBAR);
    const faseVerde = dentro < VERDE;

    if (horizontal === enFaseH) return faseVerde ? 'verde' : 'ambar';
    return 'rojo';
  }

  // ---------- pintura ----------

  dibujar(n) {
    // una luz por cada boca del cruce, plantada a la derecha de quien llega
    for (const id of n.out) {
      const e = this.net.edges[id];
      // el tramo de salida da la direccion; la boca es la contraria
      const bx = n.x - e.dx * LINEA_PARADA;
      const by = n.y - e.dy * LINEA_PARADA;

      // el poste va en la acera: la calle mide 160 px, asi que hay que
      // separarse mas de 80 del eje para salir de la calzada
      let x = null;
      let y = null;
      for (const lado of [100, 114, 130, 88]) {
        const cx = bx - e.rx * lado;
        const cy = by - e.ry * lado;
        if (this.scene.map.isRoadPoint(cx, cy)) continue;
        if (this.scene.map.isSolidPoint(cx, cy)) continue;
        x = cx;
        y = cy;
        break;
      }
      if (x === null) continue;

      const horizontal = Math.abs(e.dx) > 0.5;

      const poste = this.scene.add.image(x, y, 'px')
        .setDisplaySize(5, 5).setTint(0x1b1f25).setDepth(-869);
      const halo = this.scene.add.image(x, y, 'lamp')
        .setDisplaySize(52, 52)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.3)
        .setDepth(-900);
      const bombilla = this.scene.add.image(x, y, 'px')
        .setDisplaySize(6, 6).setTint(0x3f9c5a).setDepth(-868);

      this.luces.push({ nodeId: n.id, horizontal, bombilla, halo, poste, estado: null });
    }
  }

  update(dt, focusX, focusY) {
    this.t += dt;

    for (const l of this.luces) {
      // las de media ciudad no hace falta repintarlas
      if (Math.abs(l.bombilla.x - focusX) > 1100 || Math.abs(l.bombilla.y - focusY) > 900) {
        continue;
      }
      const estado = this.estadoEn(l.nodeId, l.horizontal);
      if (estado === l.estado) continue;
      l.estado = estado;

      const color = estado === 'verde' ? 0x49c46e : estado === 'ambar' ? 0xe8b54a : 0xd9584a;
      l.bombilla.setTint(color);
      l.halo.setTint(color).setAlpha(estado === 'verde' ? 0.22 : 0.34);
    }
  }
}
