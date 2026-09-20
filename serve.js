// Servidor local para jugar. Arrancar con:  node serve.js
// Luego abrir  http://localhost:5174
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5174;
const ROOT = __dirname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = url === '/' ? '/index.html' : url;
  const file = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ''));

  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Fuera de la carpeta del proyecto');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No existe: ' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Santa Perdida en http://localhost:${PORT}`);
});
