// Conduccion asistida por ordenador: la usan el trafico y la policia.
// Devuelve el mismo objeto de mandos que usa el jugador, asi que los coches
// de la IA se mueven con la misma fisica y chocan igual.

export function steerTo(vehicle, tx, ty, speedLimit, blocked) {
  const input = {
    throttle: false, brake: false, left: false, right: false, handbrake: false,
  };

  const desired = Math.atan2(ty - vehicle.y, tx - vehicle.x);
  const diff = Phaser.Math.Angle.Wrap(desired - vehicle.angle);

  if (diff < -0.05) input.left = true;
  else if (diff > 0.05) input.right = true;

  const speed = vehicle.speed;

  if (blocked) {
    input.brake = speed > 15;
  } else if (Math.abs(diff) > 1.4) {
    // giro muy cerrado: mejor ir al paso que dar marcha atras
    if (speed < 55) input.throttle = true;
    else input.brake = true;
  } else if (speed < speedLimit) {
    input.throttle = true;
  }

  return input;
}

export function forwardBlocked(vehicle, vehicles, extraRange = 0) {
  const range = 46 + vehicle.speed * 0.55 + extraRange;
  const fx = Math.cos(vehicle.angle);
  const fy = Math.sin(vehicle.angle);

  for (const other of vehicles) {
    if (other === vehicle) continue;
    const dx = other.x - vehicle.x;
    const dy = other.y - vehicle.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) continue;
    if (dx * fx + dy * fy <= 0) continue;
    const side = Math.abs(-dx * fy + dy * fx);
    if (side < (vehicle.stats.width + other.stats.width) * 0.62) return true;
  }
  return false;
}

export function peopleAhead(vehicle, people) {
  const range = 40 + vehicle.speed * 0.4;
  const fx = Math.cos(vehicle.angle);
  const fy = Math.sin(vehicle.angle);

  for (const p of people) {
    if (p.down) continue;
    const dx = p.x - vehicle.x;
    const dy = p.y - vehicle.y;
    if (Math.hypot(dx, dy) > range) continue;
    if (dx * fx + dy * fy <= 0) continue;
    if (Math.abs(-dx * fy + dy * fx) < vehicle.stats.width * 0.8) return true;
  }
  return false;
}
