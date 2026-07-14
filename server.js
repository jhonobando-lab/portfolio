const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

const routes = {
  '/': 'index.html',
  '/visa': 'visa.html',
  '/visa.html': 'visa.html',
  '/iris': 'iris.html',
  '/iris.html': 'iris.html',
  '/obi': 'obi.html',
  '/obi.html': 'obi.html',
  '/ilustraciones': 'ilustraciones.html',        // ← agrega esta
  '/ilustraciones.html': 'ilustraciones.html',   // ← y esta
  '/dashboard': 'dashboard.html',
  '/dashboard.html': 'dashboard.html',
};

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.css':  'text/css',
  '.js':   'application/javascript',
};

http.createServer((req, res) => {
  const ext = path.extname(req.url);

  // Archivos estáticos (imágenes, etc.)
  if (ext && mime[ext]) {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': mime[ext] });
      res.end(data);
    });
    return;
  }

  // Rutas HTML
  const file = routes[req.url] || 'index.html';
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => console.log(`Running on ${PORT}`));
