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

    if (todasQuietas) this.quieto = true;
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
