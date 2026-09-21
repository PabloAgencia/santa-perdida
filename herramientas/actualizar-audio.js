// Rehace audio/lista.json con los sonidos que haya en la carpeta.
// Se ejecuta despues de meter sonidos nuevos:   node herramientas/actualizar-audio.js
const fs = require('fs');
const path = require('path');

const carpeta = path.join(__dirname, '..', 'audio');
const validos = ['.mp3', '.ogg', '.wav'];
const hay = fs.readdirSync(carpeta)
  .filter((f) => validos.includes(path.extname(f).toLowerCase()))
  .sort();

fs.writeFileSync(path.join(carpeta, 'lista.json'), JSON.stringify(hay, null, 0) + '\n');
console.log(hay.length ? `Sonidos listos: ${hay.join(', ')}` : 'No hay ningun sonido todavia.');
