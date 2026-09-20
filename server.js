/* ============================================================
   GRUPO HOLANDÉS — Plataforma institucional + admisiones
   Node puro, sin dependencias.
   - Sirve páginas con URLs amigables (/planteles/san-martin-oaxaca)
   - API: auth+foro (reutilizado), leads/prospectos, citas, admin
   Datos en ./data/*.json (ignorar en git).
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3100;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');

// Clave para operaciones de administración (cambiar en producción y
// mover a variable de entorno cuando se despliegue el CRM real).
const ADMIN_KEY = process.env.GH_ADMIN_KEY || 'CAMBIAR-ESTA-CLAVE';

const TEACHER_CODE = 'HOLANDES-PROF-2026';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const LEAD_ESTADOS = ['nuevo', 'contactado', 'interesado', 'cita-agendada', 'seguimiento', 'apartado', 'inscrito', 'no-interesado', 'no-localizado'];
const CITA_TIPOS = ['visita', 'clase-muestra', 'asesoria', 'info-cursos'];

/* ---------- almacenamiento ---------- */
function loadJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')); }
  catch (e) { return fallback; }
}
function saveJSON(name, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2), 'utf8');
}
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') };
}
function verifyPassword(pw, salt, hash) {
  try {
    return crypto.timingSafeEqual(Buffer.from(crypto.scryptSync(pw, salt, 64).toString('hex'), 'hex'), Buffer.from(hash, 'hex'));
  } catch (e) { return false; }
}
function publicUser(u) {
  return { id: u.id, nombre: u.nombre, matricula: u.matricula, email: u.email, plantel: u.plantel, rol: u.rol, createdAt: u.createdAt };
}
function seedIfEmpty() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  let users = loadJSON('users.json', null);
  if (!users) {
    const { salt, hash } = hashPassword('Holandes2026*');
    users = [{ id: crypto.randomUUID(), nombre: 'Prof. Grupo Holandés', matricula: 'PROF-001', email: 'profesor@grupoholandes.mx', salt, hash, plantel: 'Plantel San Martín, Oaxaca', rol: 'profesor', createdAt: new Date().toISOString() }];
    saveJSON('users.json', users);
  }
  if (loadJSON('sessions.json', null) === null) saveJSON('sessions.json', {});
  if (loadJSON('posts.json', null) === null) saveJSON('posts.json', []);
  if (loadJSON('leads.json', null) === null) saveJSON('leads.json', []);
  if (loadJSON('citas.json', null) === null) saveJSON('citas.json', []);
}
function getAuthUser(req) {
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const sessions = loadJSON('sessions.json', {});
  const sess = sessions[token];
  if (!sess || sess.exp < Date.now()) return null;
  return loadJSON('users.json', []).find(u => u.id === sess.userId) || null;
}

/* ---------- http helpers ---------- */
function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => { if (!body) return resolve({}); try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

/* ---------- API ---------- */
async function handleAPI(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const method = req.method;

  /* Auth foro/portal (reutilizado) */
  if (url.pathname === '/api/auth/register' && method === 'POST') {
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const nombre = (b.nombre || '').trim(), matricula = (b.matricula || '').trim();
    const email = (b.email || '').trim().toLowerCase(), password = b.password || '';
    const plantel = (b.plantel || '').trim();
    const rol = b.rol === 'profesor' ? 'profesor' : 'alumno';
    if (!nombre || !matricula || !email || !password || !plantel) return sendJSON(res, 400, { error: 'Todos los campos son obligatorios' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJSON(res, 400, { error: 'Correo inválido' });
    if (password.length < 6) return sendJSON(res, 400, { error: 'Mínimo 6 caracteres' });
    if (rol === 'profesor' && b.teacherCode !== TEACHER_CODE) return sendJSON(res, 403, { error: 'Código de profesor inválido' });
    const users = loadJSON('users.json', []);
    if (users.some(u => u.email === email)) return sendJSON(res, 400, { error: 'Correo ya registrado' });
    if (users.some(u => u.matricula.toLowerCase() === matricula.toLowerCase())) return sendJSON(res, 400, { error: 'Matrícula ya registrada' });
    const { salt, hash } = hashPassword(password);
    const user = { id: crypto.randomUUID(), nombre, matricula, email, salt, hash, plantel, rol, createdAt: new Date().toISOString() };
    users.push(user); saveJSON('users.json', users);
    const token = crypto.randomBytes(32).toString('hex');
    const sessions = loadJSON('sessions.json', {});
    sessions[token] = { userId: user.id, exp: Date.now() + TOKEN_TTL_MS };
    saveJSON('sessions.json', sessions);
    return sendJSON(res, 201, { success: true, token, user: publicUser(user) });
  }
  if (url.pathname === '/api/auth/login' && method === 'POST') {
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const user = loadJSON('users.json', []).find(u => u.email === (b.email || '').trim().toLowerCase());
    if (!user || !verifyPassword(b.password || '', user.salt, user.hash)) return sendJSON(res, 401, { error: 'Correo o contraseña incorrectos' });
    const token = crypto.randomBytes(32).toString('hex');
    const sessions = loadJSON('sessions.json', {});
    sessions[token] = { userId: user.id, exp: Date.now() + TOKEN_TTL_MS };
    saveJSON('sessions.json', sessions);
    return sendJSON(res, 200, { success: true, token, user: publicUser(user) });
  }
  if (url.pathname === '/api/auth/me' && method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'No autorizado' });
    return sendJSON(res, 200, { user: publicUser(user) });
  }

  /* Prospectos: crear (público) */
  if (url.pathname === '/api/leads' && method === 'POST') {
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const nombre = String(b.nombre || '').trim();
    let telefono = String(b.telefono || b.whatsapp || '').replace(/\D/g, '');
    if (telefono.length === 13 && telefono.startsWith('521')) telefono = telefono.slice(3);
    else if (telefono.length === 12 && telefono.startsWith('52')) telefono = telefono.slice(2);
    else if (telefono.length === 11 && telefono.startsWith('1')) telefono = telefono.slice(1);
    const especialidad = String(b.especialidad || '').trim();
    const plantelId = String(b.plantelId || '').trim();
    if (nombre.length < 2) return sendJSON(res, 400, { error: 'Nombre incompleto' });
    if (!/^[2-9]\d{9}$/.test(telefono)) return sendJSON(res, 400, { error: 'Teléfono mexicano de 10 dígitos inválido' });
    if (!especialidad) return sendJSON(res, 400, { error: 'Especialidad requerida' });
    if (!plantelId) return sendJSON(res, 400, { error: 'Plantel requerido' });
    const leads = loadJSON('leads.json', []);
    // Cupón único: GH-XXXX (alfanumérico sin caracteres ambiguos), válido por
    // $100 de descuento al agendar su cita e inscribirse. Se genera aquí para
    // garantizar unicidad y quedar guardado junto al prospecto.
    const usados = new Set(leads.map(l => l.cupon).filter(Boolean));
    const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let cupon = '';
    do {
      cupon = 'GH-' + Array.from({ length: 4 }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('');
    } while (usados.has(cupon));
    const lead = {
      id: crypto.randomUUID(),
      cupon, cuponMonto: 100,
      cuponConcepto: 'Válido por $100 de descuento al agendar tu cita e inscribirte',
      nombre, telefono, especialidad,
      especialidades: Array.isArray(b.especialidades) ? b.especialidades.slice(0, 4) : [],
      plantel: String(b.plantel || ''), plantelId,
      edad: b.edad ? Number(b.edad) || null : null,
      horarioPreferido: String(b.horarioPreferido || ''),
      comoConociste: String(b.comoConociste || ''),
      comentarios: String(b.comentarios || '').slice(0, 1000),
      fecha: new Date().toISOString(),
      origen: String(b.origen || 'web').slice(0, 80),
      origenPage: String(b.origenPage || '').slice(0, 200),
      campana: b.campana && typeof b.campana === 'object' ? {
        source: String(b.campana.source || ''), medium: String(b.campana.medium || ''),
        campaign: String(b.campana.campaign || ''), content: String(b.campana.content || '')
      } : null,
      dispositivo: b.dispositivo || null,
      ubicacion: b.ubicacion || null,
      canalPreferido: ['whatsapp', 'llamada', 'cualquiera'].includes(b.canalPreferido) ? b.canalPreferido : 'whatsapp',
      estado: 'nuevo',
      ultimoContacto: null, proximoSeguimiento: null, notas: '',
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200)
    };
    leads.push(lead); saveJSON('leads.json', leads);
    console.log(`[LEAD] ${lead.nombre} | ${lead.telefono} | ${lead.especialidad} | ${lead.plantelId} | ${lead.cupon}`);
    return sendJSON(res, 201, { success: true, id: lead.id, cupon: lead.cupon, cuponMonto: lead.cuponMonto, cuponConcepto: lead.cuponConcepto });
  }

  /* Admin: requiere x-admin-key */
  const isAdmin = req.headers['x-admin-key'] === ADMIN_KEY;
  if (url.pathname === '/api/admin/stats' && method === 'GET') {
    if (!isAdmin) return sendJSON(res, 401, { error: 'No autorizado' });
    const leads = loadJSON('leads.json', []);
    const citas = loadJSON('citas.json', []);
    const by = (arr, k) => arr.reduce((a, x) => { const v = x[k] || '—'; a[v] = (a[v] || 0) + 1; return a; }, {});
    const hoy = new Date().toISOString().slice(0, 10);
    return sendJSON(res, 200, {
      total: leads.length,
      porEstado: by(leads, 'estado'),
      porPlantel: by(leads, 'plantelId'),
      porEspecialidad: by(leads, 'especialidad'),
      porCampana: by(leads.map(l => ({ c: (l.campana && l.campana.campaign) || 'directo' })), 'c'),
      citasProximas: citas.filter(c => (c.fecha || '') >= hoy).length,
      ultimos: leads.slice(-10).reverse()
    });
  }
  if (url.pathname === '/api/prospectos' && method === 'GET') {
    if (!isAdmin) return sendJSON(res, 401, { error: 'No autorizado' });
    let leads = loadJSON('leads.json', []);
    const q = url.searchParams;
    ['estado', 'plantelId', 'especialidad'].forEach(k => {
      const v = q.get(k);
      if (v) leads = leads.filter(l => l[k] === v);
    });
    const camp = q.get('campana');
    if (camp) leads = leads.filter(l => (l.campana && l.campana.campaign) === camp);
    const desde = q.get('desde'), hasta = q.get('hasta');
    if (desde) leads = leads.filter(l => (l.fecha || '') >= desde);
    if (hasta) leads = leads.filter(l => (l.fecha || '') <= hasta + 'T23:59:59');
    return sendJSON(res, 200, { total: leads.length, prospectos: leads.slice().reverse().slice(0, 500) });
  }
  let m = url.pathname.match(/^\/api\/prospectos\/([A-Za-z0-9-]+)$/);
  if (m && method === 'PATCH') {
    if (!isAdmin) return sendJSON(res, 401, { error: 'No autorizado' });
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const leads = loadJSON('leads.json', []);
    const lead = leads.find(l => l.id === m[1]);
    if (!lead) return sendJSON(res, 404, { error: 'No encontrado' });
    if (b.estado && !LEAD_ESTADOS.includes(b.estado)) return sendJSON(res, 400, { error: 'Estado inválido' });
    ['estado', 'ultimoContacto', 'proximoSeguimiento', 'notas'].forEach(k => { if (b[k] !== undefined) lead[k] = b[k]; });
    saveJSON('leads.json', leads);
    return sendJSON(res, 200, { success: true, prospecto: lead });
  }

  /* Citas: crear (público) + listar (admin) */
  if (url.pathname === '/api/citas' && method === 'POST') {
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const nombre = String(b.nombre || '').trim();
    let telefono = String(b.telefono || '').replace(/\D/g, '');
    if (telefono.length === 13 && telefono.startsWith('521')) telefono = telefono.slice(3);
    else if (telefono.length === 12 && telefono.startsWith('52')) telefono = telefono.slice(2);
    else if (telefono.length === 11 && telefono.startsWith('1')) telefono = telefono.slice(1);
    if (nombre.length < 2) return sendJSON(res, 400, { error: 'Nombre incompleto' });
    if (!/^[2-9]\d{9}$/.test(telefono)) return sendJSON(res, 400, { error: 'Teléfono inválido' });
    if (!CITA_TIPOS.includes(b.tipo)) return sendJSON(res, 400, { error: 'Tipo de cita inválido' });
    if (!b.campusId || !b.fecha || !b.horario) return sendJSON(res, 400, { error: 'Plantel, fecha y horario requeridos' });
    const citas = loadJSON('citas.json', []);
    const cita = {
      id: crypto.randomUUID(), prospectoId: b.prospectoId || null,
      nombre, telefono, tipo: b.tipo,
      especialidadId: b.especialidadId || '', campusId: b.campusId,
      fecha: b.fecha, horario: b.horario,
      comentarios: String(b.comentarios || '').slice(0, 1000),
      creada: new Date().toISOString(), estado: 'programada'
    };
    citas.push(cita); saveJSON('citas.json', citas);
    if (cita.prospectoId) {
      const leads = loadJSON('leads.json', []);
      const lead = leads.find(l => l.id === cita.prospectoId);
      if (lead && ['nuevo', 'contactado', 'interesado', 'seguimiento'].includes(lead.estado)) {
        lead.estado = 'cita-agendada'; saveJSON('leads.json', leads);
      }
    }
    console.log(`[CITA] ${cita.nombre} | ${cita.tipo} | ${cita.campusId} | ${cita.fecha} ${cita.horario}`);
    return sendJSON(res, 201, { success: true, id: cita.id });
  }
  if (url.pathname === '/api/citas' && method === 'GET') {
    if (!isAdmin) return sendJSON(res, 401, { error: 'No autorizado' });
    return sendJSON(res, 200, { citas: loadJSON('citas.json', []).slice().reverse() });
  }

  return sendJSON(res, 404, { error: 'No encontrado' });
}

/* ---------- páginas / URLs amigables ---------- */
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function resolvePage(urlPath) {
  let p = urlPath.split('?')[0];
  try { p = decodeURIComponent(p); } catch (e) { /* noop */ }
  if (p === '/') return '/index.html';
  if (p.endsWith('/')) p = p.slice(0, -1);
  const direct = path.normalize(path.join(ROOT, p));
  if (path.extname(p)) return p; // /css/x.css, /img/..., /data/*.js
  for (const cand of [p + '.html', p + '/index.html']) {
    const full = path.normalize(path.join(ROOT, cand));
    if (full.startsWith(ROOT) && fs.existsSync(full) && fs.statSync(full).isFile()) return cand;
  }
  return null;
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleAPI(req, res).catch(() => { try { sendJSON(res, 500, { error: 'Error interno' }); } catch (e) { /* noop */ } });
    return;
  }
  const page = resolvePage(req.url);
  if (!page) { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('<h1>404 — Página no encontrada</h1><p><a href="/">Volver al inicio</a></p>'); return; }
  const filePath = path.normalize(path.join(ROOT, page));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (filePath.startsWith(DATA_DIR) && path.extname(filePath) !== '.js') { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

seedIfEmpty();
server.listen(PORT, () => {
  console.log(`Grupo Holandés web en http://localhost:${PORT}`);
  console.log('Define GH_ADMIN_KEY para el panel /admin (actual: valor por defecto).');
});
