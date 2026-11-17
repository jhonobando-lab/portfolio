const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PORT = process.env.PORT || 3000;

// Contraseña del dashboard: se guarda en Railway → Variables → DASHBOARD_PASSWORD
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '';
const COOKIE_NAME = 'dash_session';
const COOKIE_DAYS = 30;

const routes = {
  '/': 'index.html',
  '/visa': 'visa.html',
  '/visa.html': 'visa.html',
  '/iris': 'iris.html',
  '/iris.html': 'iris.html',
  '/obi': 'obi.html',
  '/obi.html': 'obi.html',
  '/ilustraciones': 'ilustraciones.html',
  '/ilustraciones.html': 'ilustraciones.html',
  '/satrack': 'satrack.html',
  '/satrack.html': 'satrack.html',
  '/privacidad': 'privacidad.html',
  '/privacidad.html': 'privacidad.html',
};

// Solo se sirven directamente imágenes y estilos (nunca server.js ni los .html por fuera de las rutas)
const mime = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.css':  'text/css',
};

// ---------- Dashboard: sesión ----------
function sessionToken() {
  // Cambia automáticamente si cambias la contraseña en Railway (cierra sesiones viejas)
  return crypto.createHmac('sha256', DASHBOARD_PASSWORD).update('jhonobi-dashboard-v1').digest('hex');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function isLoggedIn(req) {
  if (!DASHBOARD_PASSWORD) return false;
  const c = getCookie(req, COOKIE_NAME);
  return !!c && safeEqual(c, sessionToken());
}

function loginPage(error) {
  const msg = !DASHBOARD_PASSWORD
    ? 'Falta configurar DASHBOARD_PASSWORD en Railway.'
    : (error ? 'Contraseña incorrecta' : '');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="robots" content="noindex"/>
  <title>Dashboard — Jhon Obando</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',-apple-system,sans-serif;background:#090909;color:#efefef;font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .box{background:#111;border:1px solid rgba(255,255,255,0.14);border-radius:14px;padding:40px 36px;width:100%;max-width:360px;text-align:center}
    .logo{font-size:13px;font-weight:500;margin-bottom:8px}
    .title{font-size:22px;font-weight:400;letter-spacing:-0.03em;margin-bottom:6px}
    .sub{font-size:13px;color:#555;margin-bottom:28px}
    input{width:100%;background:#181818;border:1px solid rgba(255,255,255,0.14);border-radius:10px;padding:11px 16px;font-size:14px;color:#efefef;font-family:inherit;outline:none;margin-bottom:12px;transition:border-color .15s}
    input:focus{border-color:#e8ff6e}
    .user{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
    button{width:100%;background:#e8ff6e;color:#1a1e00;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;transition:opacity .15s}
    button:hover{opacity:.88}
    .error{font-size:12px;color:#f87171;margin-top:10px;min-height:18px}
  </style>
</head>
<body>
  <form class="box" method="POST" action="/dashboard/login">
    <div class="logo">jhonobi.com</div>
    <div class="title">Dashboard</div>
    <div class="sub">Analytics privado del portfolio</div>
    <input class="user" type="text" name="username" value="jhon" autocomplete="username" tabindex="-1" aria-hidden="true"/>
    <input type="password" name="password" placeholder="contraseña" autocomplete="current-password" autofocus required/>
    <button type="submit">Entrar</button>
    <div class="error">${msg}</div>
  </form>
</body>
</html>`;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...headers });
  res.end(body);
}

function handleDashboard(req, res, pathname) {
  // Cerrar sesión
  if (pathname === '/dashboard/logout') {
    return send(res, 303, '', {
      'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      'Location': '/dashboard',
    });
  }

  // Enviar contraseña
  if (pathname === '/dashboard/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 10000) req.destroy(); });
    req.on('end', () => {
      const password = new URLSearchParams(body).get('password') || '';
      if (DASHBOARD_PASSWORD && safeEqual(password, DASHBOARD_PASSWORD)) {
        return send(res, 303, '', {
          'Set-Cookie': `${COOKIE_NAME}=${sessionToken()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_DAYS * 86400}`,
          'Location': '/dashboard',
        });
      }
      send(res, 401, loginPage(true));
    });
    return;
  }

  // Ver el dashboard
  if (!isLoggedIn(req)) return send(res, 200, loginPage(false));
  fs.readFile(path.join(__dirname, 'dashboard.html'), (err, data) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data);
  });
}

// ---------- Servidor ----------
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (e) { return send(res, 400, 'Bad request'); }

  // Archivos para buscadores (Google)
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
    const isXml = pathname === '/sitemap.xml';
    return fs.readFile(path.join(__dirname, pathname.slice(1)), (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': isXml ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      res.end(data);
    });
  }

  // Dashboard (protegido)
  if (pathname === '/dashboard' || pathname === '/dashboard.html' || pathname.startsWith('/dashboard/')) {
    return handleDashboard(req, res, pathname);
  }

  // Archivos estáticos (imágenes, estilos)
  const ext = path.extname(pathname).toLowerCase();
  if (ext && mime[ext]) {
    const filePath = path.join(__dirname, path.normalize(pathname));
    if (!filePath.startsWith(__dirname + path.sep)) return send(res, 404, 'Not found');
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': mime[ext] });
      res.end(data);
    });
    return;
  }

  // Rutas HTML
  const file = routes[pathname] || 'index.html';
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => console.log(`Running on ${PORT}`));
