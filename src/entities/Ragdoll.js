// Fisica de mentira para cuando alguien cae muerto o atropellado: las piezas
// del cuerpo salen despedidas, caen con gravedad, rebotan una vez contra el
// suelo y se quedan tiradas donde paran.
//
// El juego no usa Matter.js (ni ningun motor de fisicas) en ningun otro
// sitio: todo el movimiento es a mano, con `map.isSolidBox`. Meter un motor
// real solo para esto era desproporcionado; esto hace lo mismo en unas
// pocas variables por pieza.
//
// La "altura" (z) es de mentira: crece con `vz` y la gravedad la devuelve al
// suelo. Se dibuja restando z a la Y, que es como GTA cenital simula saltos.

const GRAVEDAD = 640;        // px/s2 sobre la altura simulada
const REBOTE = 0.32;         // cuanto conserva vz al tocar el suelo
const FRICCION = 5.5;        // como frena vx/vy/giro una vez en el suelo
const QUIETA_DEBAJO_DE = 12; // px/s: por debajo de esto se da la pieza por parada

export class Ragdoll {
  // piezas: objetos { img, x, y, z, vx, vy, vz, rot, rotVel } (ver piezaRagdoll)
  constructor(piezas) {
    this.piezas = piezas;
    this.quieto = false;
  }

  update(dt) {
    if (this.quieto) return;
    let todasQuietas = true;

    for (const p of this.piezas) {
      if (p.sigue) continue;     // las adheridas se colocan al final
      if (p.quieta) continue;

      p.vz -= GRAVEDAD * dt;
      p.z += p.vz * dt;
      if (p.z <= 0) {
        p.z = 0;
        // rebota una vez con poca fuerza; si ya casi no llevaba velocidad
        // vertical, se queda en el suelo sin más bote
        p.vz = Math.abs(p.vz) > 60 ? -p.vz * REBOTE : 0;
        const f = Math.max(0, 1 - FRICCION * dt);
        p.vx *= f;
        p.vy *= f;
        p.rotVel *= f;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotVel * dt;

      p.img.setPosition(p.x, p.y - p.z);
      p.img.setRotation(p.rot);
      p.img.setDepth(p.y);

      if (p.z === 0 && Math.hypot(p.vx, p.vy) < QUIETA_DEBAJO_DE && Math.abs(p.rotVel) < 0.3) {
        p.quieta = true;
      } else {
        todasQuietas = false;
      }
    }

    // las piezas adheridas (un brazo todavia unido al cuerpo) siguen al
    // cuerpo con su desplazamiento, girado con el
    for (const p of this.piezas) {
      if (!p.sigue) continue;
      const c = p.sigue;
      const cos = Math.cos(c.rot);
      const sin = Math.sin(c.rot);
      p.x = c.x + cos * p.dx - sin * p.dy;
      p.y = c.y + sin * p.dx + cos * p.dy;
      p.z = c.z;
      p.rot = c.rot + p.rotRel;
      p.img.setPosition(p.x, p.y - p.z);
      p.img.setRotation(p.rot);
      p.img.setDepth(p.y + 0.1);
    }

    if (todasQuietas) this.quieto = true;
  }
}

// D4. UN BRAZO QUE TODAVIA ES DEL CUERPO: no sale despedido, va pegado al
// cuerpo y cae con el. `abierto` lo deja un poco separado (cuerpo tirado).
export function piezaAdherida(img, cuerpo, abierto = 0) {
  const dxm = img.x - cuerpo.x;
  const dym = img.y - cuerpo.y;
  const cos = Math.cos(-cuerpo.rot);
  const sin = Math.sin(-cuerpo.rot);
  return {
    img, sigue: cuerpo,
    dx: dxm * cos - dym * sin,
    dy: dxm * sin + dym * cos,
    rotRel: img.rotation - cuerpo.rot + abierto,
    x: img.x, y: img.y, z: 0, rot: img.rotation, quieta: true,
  };
}

// el cuerpo y sus dos brazos (adheridos) como un solo ragdoll
export function ragdollDeCuerpo(cuerpoImg, brazos, anguloImpacto, fuerza) {
  const cuerpo = piezaRagdoll(
    cuerpoImg, cuerpoImg.x, cuerpoImg.y, anguloImpacto, fuerza, cuerpoImg.rotation
  );
  const izq = piezaAdherida(brazos.izq, cuerpo, -0.55);
  const der = piezaAdherida(brazos.der, cuerpo, 0.55);
  const rag = new Ragdoll([cuerpo, izq, der]);
  rag.cuerpo = cuerpo;
  rag.brazoIzq = izq;
  rag.brazoDer = der;
  return rag;
}

// D4. ARRANCAR UN BRAZO: la pieza deja de seguir al cuerpo, sale volando por
// su cuenta y en el hombro se queda un chorro rojo. Devuelve cuantos se han
// ido. `dos` los quita los dos.
export function desmembrarBrazos(scene, rag, anguloImpacto, dos = false) {
  if (!rag) return 0;
  const candidatos = [rag.brazoIzq, rag.brazoDer].filter((p) => p && p.sigue);
  if (candidatos.length === 0) return 0;
  const n = dos ? candidatos.length : 1;
  Phaser.Utils.Array.Shuffle(candidatos);
  for (let i = 0; i < n; i++) {
    const p = candidatos[i];
    const lib = piezaRagdoll(p.img, p.x, p.y, anguloImpacto, 170, p.rot);
    // la pieza pasa a ser independiente: se copia el impulso en la misma
    // referencia, que es la que esta en la lista del ragdoll
    p.sigue = null;
    p.quieta = false;
    p.vx = lib.vx;
    p.vy = lib.vy;
    p.vz = lib.vz;
    p.rotVel = lib.rotVel * 1.5;
    chorroDeSangre(scene, rag.cuerpo.x, rag.cuerpo.y, anguloImpacto, 5);
  }
  rag.quieto = false;
  return n;
}

// D5. LA CABEZA REVIENTA: se queda una mancha oscura donde estaba y un
// reguero de gotas. Se dibuja por codigo (circulos), pequeño y cenital.
export function reventarCabeza(scene, rag, anguloImpacto) {
  if (!rag || !rag.cuerpo) return;
  const c = rag.cuerpo;
  const mancha = scene.add.circle(c.x, c.y, 6, 0x6a120e).setDepth(c.y + 0.5);
  const brillo = scene.add.circle(c.x, c.y, 3, 0x9e1c16).setDepth(c.y + 0.6);
  const pieza = (img) => {
    const p = piezaAdherida(img, c);
    p.dx = 0;
    p.dy = 0;
    p.rotRel = 0;
    return p;
  };
  rag.piezas.push(pieza(mancha), pieza(brillo));
  chorroDeSangre(scene, c.x, c.y, anguloImpacto, 9);
  const charco = scene.add.image(c.x, c.y, 'px')
    .setDisplaySize(30, 22).setTint(0x5e1f1a).setAlpha(0.8).setDepth(c.y - 6);
  scene.tweens.add({ targets: charco, scaleX: 1.5, scaleY: 1.5, duration: 1800 });
  rag.extras = [mancha, brillo, charco];
}

// gotas que salen en abanico y se apagan; sin fisica, solo un tween
export function chorroDeSangre(scene, x, y, angulo, cuantas) {
  for (let i = 0; i < cuantas; i++) {
    const a = angulo + (Math.random() - 0.5) * 1.3;
    const d = 14 + Math.random() * 30;
    const gota = scene.add.circle(x, y, 1.4 + Math.random() * 1.8, 0xa01e18)
      .setDepth(y + 2);
    scene.tweens.add({
      targets: gota,
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      alpha: { from: 1, to: 0.25 }, duration: 260 + Math.random() * 220, ease: 'Sine.out',
      onComplete: () => {
        gota.setFillStyle(0x5e1f1a, 0.6);
        scene.time.delayedCall(9000, () => gota.destroy());
      },
    });
  }
}

// Da el impulso inicial a una pieza: sale despedida hacia `angulo` con algo
// de dispersion propia (para que no todas vuelen exactas en la misma linea)
// y un salto antes de caer.
export function piezaRagdoll(img, x, y, angulo, fuerza, rotInicial = 0) {
  const a = angulo + (Math.random() - 0.5) * 1.1;
  const v = fuerza * (0.7 + Math.random() * 0.6);
  return {
    img, x, y, z: 0,
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v,
    vz: 90 + Math.random() * 90,
    rot: rotInicial,
    rotVel: (Math.random() - 0.5) * 9,
    quieta: false,
  };
}
