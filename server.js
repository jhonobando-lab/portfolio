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
};

http.createServer((req, res) => {
  const file = routes[req.url] || 'index.html';
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => console.log(`Running on ${PORT}`));
