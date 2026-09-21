// Conduccion asistida por ordenador: la usan el trafico y la policia.
// Devuelve el mismo objeto de mandos que usa el jugador, asi que los coches
// de la IA se mueven con la misma fisica y chocan igual.

export function steerTo(vehicle, tx, ty, speedLimit, blocked) {
  const input = {
    throttle: false, brake: false, left: false, right: false, handbrake: false,
  };

  const desired = Math.atan2(ty - vehicle.y, tx - vehicle.x);
  const diff = Phaser.Math.Angle.Wrap(desired - vehicle.angle);

  // La velocidad CON SIGNO, no la magnitud. Aqui estaba el fallo que hacia
  // que los coches fueran "locos perdidos": si un coche ya iba hacia atras,
  // se le mandaba frenar, y el freno con marcha atras lo que hace es acelerar
  // hacia atras. Se quedaban de culo dando tumbos por la calle.
  const vf = vehicle.vx * Math.cos(vehicle.angle) + vehicle.vy * Math.sin(vehicle.angle);

  // marcha atras que no toca: lo primero es recuperar la marcha adelante
  if (vf < -4) {
    input.throttle = true;
    // yendo hacia atras el volante actua al reves, asi que se invierte
    if (diff < -0.05) input.right = true;
    else if (diff > 0.05) input.left = true;
    return input;
  }

  if (diff < -0.05) input.left = true;
  else if (diff > 0.05) input.right = true;

  if (blocked) {
    input.brake = vf > 12;
  } else if (Math.abs(diff) > 1.4) {
    // giro muy cerrado: mejor ir al paso que dar marcha atras
    if (vf < 55) input.throttle = true;
    else input.brake = true;
  } else if (vf < speedLimit) {
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

// Gente delante del coche. Se mira donde esta el peaton Y donde va a estar
// dentro de un segundo: el cono de antes era tan corto y estrecho que el coche
// solo "veia" al que ya tenia encima, cuando ya no daba tiempo a nada.
export function peopleAhead(vehicle, people) {
  if (!people) return false;
  const range = 70 + vehicle.speed * 0.8;
  const fx = Math.cos(vehicle.angle);
  const fy = Math.sin(vehicle.angle);
  const ancho = vehicle.stats.width * 1.25;

  for (const p of people) {
    if (!p || p.down || p.enCoche) continue;
    const vel = p.state === 'fleeing' ? 110 : 55;

    for (const t of [0, 0.6, 1.2]) {
      const px = p.x + Math.cos(p.angle) * vel * t;
      const py = p.y + Math.sin(p.angle) * vel * t;
      const dx = px - vehicle.x;
      const dy = py - vehicle.y;
      if (Math.hypot(dx, dy) > range) continue;
      if (dx * fx + dy * fy <= 0) continue;
      if (Math.abs(-dx * fy + dy * fx) < ancho) return true;
    }
  }
  return false;
}
