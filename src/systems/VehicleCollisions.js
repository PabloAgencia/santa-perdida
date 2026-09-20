const RESTITUTION = 0.3;
const MAX_IMPULSE = 260;

export function resolveVehicleCollisions(vehicles) {
  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      resolvePair(vehicles[i], vehicles[j]);
    }
  }
}

function resolvePair(a, b) {
  const reach = (a.stats.length + b.stats.length) * 0.6;
  const dxc = b.x - a.x;
  const dyc = b.y - a.y;
  if (dxc * dxc + dyc * dyc > reach * reach) return;

  const ca = a.getCircles();
  const cb = b.getCircles();

  for (const p of ca) {
    for (const q of cb) {
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dist = Math.hypot(dx, dy);
      const overlap = p.r + q.r - dist;
      if (overlap <= 0) continue;

      const nx = dist > 0.0001 ? dx / dist : 1;
      const ny = dist > 0.0001 ? dy / dist : 0;

      const invA = 1 / a.mass;
      const invB = 1 / b.mass;
      const invSum = invA + invB;

      const sepA = overlap * (invA / invSum);
      const sepB = overlap * (invB / invSum);

      const along = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      const impact = Math.abs(along);
      let j = along < 0 ? (-(1 + RESTITUTION) * along) / invSum : 0;
      j = Math.min(j, MAX_IMPULSE);

      a.push(-nx * sepA, -ny * sepA, -nx * j * invA, -ny * j * invA, impact);
      b.push(nx * sepB, ny * sepB, nx * j * invB, ny * j * invB, impact);
      return;
    }
  }
}
