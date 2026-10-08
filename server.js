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

try {
  const envFile = path.join(__dirname, '.env');
  if (fs.existsSync(envFile)) {
    fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    });
  }
} catch (e) { /* sin .env, se usan valores por defecto */ }
const PORT = process.env.PORT || 3100;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');

// Clave para operaciones de administración. En producción es OBLIGATORIA
// (GH_ADMIN_KEY); con el valor por defecto se bloquea /api/admin/*.
const ADMIN_KEY = process.env.GH_ADMIN_KEY || 'CAMBIAR-ESTA-CLAVE';
const ADMIN_LOCKED = process.env.NODE_ENV === 'production' && ADMIN_KEY === 'CAMBIAR-ESTA-CLAVE';
function requireAdmin(req, res) {
  if (ADMIN_LOCKED || req.headers['x-admin-key'] !== ADMIN_KEY) {
    sendJSON(res, 401, { error: ADMIN_LOCKED ? 'Servidor sin clave de administración configurada' : 'No autorizado' });
    return false;
  }
  return true;
}

const TEACHER_CODE = 'HOLANDES-PROF-2026';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const LEAD_ESTADOS = ['nuevo', 'contactado', 'interesado', 'cita-agendada', 'visita', 'seguimiento', 'apartado', 'inscrito', 'no-interesado', 'no-localizado'];
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
  return { id: u.id, nombre: u.nombre, matricula: u.matricula, email: u.email, usuario: u.usuario || null, plantel: u.plantel, plantelId: u.plantelId || null, rol: u.rol, createdAt: u.createdAt };
}
const ROLES = ['alumno', 'profesor', 'encargado', 'asesor', 'directivo', 'admin'];
function validCampusId(id) {
  try {
    const { CAMPUSES } = require('./data/campuses.js');
    return CAMPUSES.some(c => c.id === id && c.activo);
  } catch (e) { return !!id; }
}
function seedIfEmpty() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  let users = loadJSON('users.json', null);
  if (!users) {
    const { salt, hash } = hashPassword('Holandes2026*');
    users = [{ id: crypto.randomUUID(), nombre: 'Prof. Grupo Holandés', matricula: 'PROF-001', email: 'profesor@grupoholandes.com', salt, hash, plantel: 'Plantel San Martín, Oaxaca', rol: 'profesor', createdAt: new Date().toISOString() }];
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

/* Panel: sesión (Bearer) con rol admin/directivo/encargado, o clave maestra.
   El encargado SOLO ve prospectos de su plantel (se fuerza en cada lectura). */
const PANEL_ROLES = ['admin', 'directivo', 'encargado'];
function panelAuth(req, res) {
  const u = getAuthUser(req);
  if (u && PANEL_ROLES.includes(u.rol)) return { rol: u.rol, user: u };
  if (requireAdmin(req, res)) return { rol: 'admin', user: null };
  return null;
}
function soloPlantelDe(auth) {
  if (!auth || auth.rol !== 'encargado') return null;
  const u = auth.user || {};
  return u.plantelId ? { id: u.plantelId, nombre: u.plantel } : null;
}
/* Gestion de cuentas (alta/baja/edicion): clave maestra o sesion admin/directivo */
function usuariosAuth(req, res) {
  const su = getAuthUser(req);
  if (su && (su.rol === 'admin' || su.rol === 'directivo')) return true;
  if (requireAdmin(req, res)) return true;
  return false;
}

/* Hoja (Google Apps Script): se consulta desde el servidor para poder aplicar
   el filtro de plantel del encargado. Si la hoja no responde, se usan los
   leads locales como respaldo. */
const SHEETS_URL = (() => { try { return require('./data/app-config.js').APP_CONFIG.sheetsWebhookUrl || ''; } catch (e) { return ''; } })();
function normTxt(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function matchPlantelLoose(valor, filtro) {
  const a = normTxt(valor), b = normTxt(filtro);
  if (!b) return true;
  if (!a) return false;
  return a === b || a.indexOf(b) !== -1 || b.indexOf(a) !== -1;
}
async function fetchHoja(action, params) {
  if (!SHEETS_URL) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(SHEETS_URL + '?action=' + action + (params ? '&' + params : ''), { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const d = await r.json();
    return d && typeof d === 'object' ? d : null;
  } catch (e) { return null; }
}

function normTel10(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
}

/* Ubicación aproximada por IP: fallback cuando el navegador no da
   geolocalización ( navegadores integrados de Facebook/Instagram/WhatsApp
   la bloquean sin mostrar ningún permiso). No se almacena la IP: caché
   efímera en memoria por 10 minutos. */
const GEO_CACHE = new Map();
const GEO_TTL_MS = 10 * 60 * 1000;
async function geoPorIp(ip) {
  if (!ip) return null;
  const limpio = String(ip).replace(/^::ffff:/, '').trim();
  if (!limpio || /^(127\.|::1$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(limpio)) return null; // IP local/privada
  const fuentes = [
    async () => {
      const r = await fetch('https://ipwho.is/' + encodeURIComponent(limpio), { signal: AbortSignal.timeout(3500) });
      const d = await r.json();
      if (!d || d.success === false || typeof d.latitude !== 'number') return null;
      return { ok: true, ciudad: d.city || '', region: d.region || '', pais: d.country || '', lat: d.latitude, lng: d.longitude };
    },
    async () => {
      const r = await fetch('https://ipapi.co/' + encodeURIComponent(limpio) + '/json/', { signal: AbortSignal.timeout(3500) });
      const d = await r.json();
      if (!d || d.error || typeof d.latitude !== 'number') return null;
      return { ok: true, ciudad: d.city || '', region: d.region || '', pais: d.country_name || '', lat: d.latitude, lng: d.longitude };
    }
  ];
  for (const f of fuentes) {
    try { const d = await f(); if (d) return d; } catch (e) { /* siguiente fuente */ }
  }
  return null;
}

/* Cambio de estado desde el panel: lo refleja también en la hoja
   (inscripción -> hoja Inscripciones; visita -> bitácora Interacciones)
   para que seguimiento y /directivo queden consistentes.
   Fire-and-forget: nunca bloquea ni hace fallar el PATCH. */
function notificarEstadoHoja(lead, previo, auth) {
  if (!SHEETS_URL || lead.estado === previo) return;
  const quien = (auth && auth.user && auth.user.nombre) || (auth && auth.rol) || 'panel';
  let body = null;
  if (lead.estado === 'inscrito') {
    body = { form: 'inscripcion', nombre: lead.nombre, telefono: lead.telefono, cupon: lead.cupon || '',
      edad: lead.edad || '', especialidad: lead.especialidad, plantel: lead.plantel, plantelId: lead.plantelId,
      via: 'panel', detalle: 'Inscripción registrada por ' + quien, fecha: new Date().toISOString() };
  } else if (lead.estado === 'visita') {
    body = { form: 'interaccion', evento: 'visita', detalle: 'Visita registrada por ' + quien,
      nombre: lead.nombre, telefono: lead.telefono, especialidad: lead.especialidad,
      plantel: lead.plantel, plantelId: lead.plantelId, cupon: lead.cupon || '',
      via: 'panel', fecha: new Date().toISOString() };
  }
  if (!body) return;
  fetch(SHEETS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000) }).catch(() => {});
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
    const rol = ROLES.includes(b.rol) ? b.rol : 'alumno';
    if (['encargado', 'asesor', 'directivo', 'admin'].includes(rol)) {
      return sendJSON(res, 403, { error: 'Ese rol solo lo crea un administrador' });
    }
    if (!nombre || !matricula || !email || !password || !plantel) return sendJSON(res, 400, { error: 'Todos los campos son obligatorios' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJSON(res, 400, { error: 'Correo inválido' });
    if (password.length < 6) return sendJSON(res, 400, { error: 'Mínimo 6 caracteres' });
    if (rol === 'profesor' && b.teacherCode !== TEACHER_CODE) return sendJSON(res, 403, { error: 'Código de profesor inválido' });
    const users = loadJSON('users.json', []);
    if (users.some(u => u.email === email)) return sendJSON(res, 400, { error: 'Correo ya registrado' });
    if (users.some(u => u.matricula.toLowerCase() === matricula.toLowerCase())) return sendJSON(res, 400, { error: 'Matrícula ya registrada' });
    const { salt, hash } = hashPassword(password);
    const user = { id: crypto.randomUUID(), nombre, matricula, email, salt, hash, plantel, plantelId: null, rol, createdAt: new Date().toISOString() };
    users.push(user); saveJSON('users.json', users);
    const token = crypto.randomBytes(32).toString('hex');
    const sessions = loadJSON('sessions.json', {});
    sessions[token] = { userId: user.id, exp: Date.now() + TOKEN_TTL_MS };
    saveJSON('sessions.json', sessions);
    return sendJSON(res, 201, { success: true, token, user: publicUser(user) });
  }
  if (url.pathname === '/api/auth/login' && method === 'POST') {
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const id = String(b.email || b.usuario || '').trim().toLowerCase();
    const user = loadJSON('users.json', []).find(u => (u.email || '').toLowerCase() === id || (u.usuario || '').toLowerCase() === id);
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

  /* Admin: listar cuentas (sin salt/hash) */
  if (url.pathname === '/api/admin/users' && method === 'GET') {
    if (!usuariosAuth(req, res)) return;
    const usuarios = loadJSON('users.json', []).map(publicUser);
    return sendJSON(res, 200, { usuarios, total: usuarios.length });
  }

  /* Admin: crear usuarios con rol (encargado de plantel, asesor, etc.) */
  if (url.pathname === '/api/admin/users' && method === 'POST') {
    if (!usuariosAuth(req, res)) return;
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const nombre = (b.nombre || '').trim();
    const email = (b.email || '').trim().toLowerCase();
    const usuario = String(b.usuario || '').trim().toLowerCase();
    const password = b.password || '';
    const rol = b.rol || 'encargado';
    const plantelId = b.plantelId || null;
    if (!ROLES.includes(rol)) return sendJSON(res, 400, { error: 'Rol inválido' });
    if (!nombre || !password) return sendJSON(res, 400, { error: 'Nombre y contraseña obligatorios' });
    if (!usuario && !email) return sendJSON(res, 400, { error: 'Usuario o correo obligatorio' });
    if (usuario && !/^[a-z0-9._-]{3,24}$/.test(usuario)) return sendJSON(res, 400, { error: 'Usuario: 3 a 24 caracteres (letras, números, . _ -)' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJSON(res, 400, { error: 'Correo inválido' });
    if (password.length < 6) return sendJSON(res, 400, { error: 'Mínimo 6 caracteres' });
    if (rol === 'encargado') {
      if (!plantelId || !validCampusId(plantelId)) return sendJSON(res, 400, { error: 'plantelId válido requerido para encargado' });
    }
    const users = loadJSON('users.json', []);
    if (usuario && users.some(u => (u.usuario || '').toLowerCase() === usuario)) return sendJSON(res, 400, { error: 'Usuario ya registrado' });
    if (email && users.some(u => u.email === email)) return sendJSON(res, 400, { error: 'Correo ya registrado' });
    const { salt, hash } = hashPassword(password);
    let plantelNombre = '';
    try {
      const { getCampusById } = require('./data/campuses.js');
      const cp = plantelId ? getCampusById(plantelId) : null;
      plantelNombre = cp ? cp.nombre : String(b.plantel || '');
    } catch (e) { plantelNombre = String(b.plantel || ''); }
    const user = { id: crypto.randomUUID(), nombre, matricula: 'ADM-' + Date.now().toString(36).toUpperCase(), email: email || null, usuario: usuario || null, salt, hash, plantel: plantelNombre, plantelId, rol, createdAt: new Date().toISOString() };
    users.push(user); saveJSON('users.json', users);
    return sendJSON(res, 201, { success: true, user: publicUser(user) });
  }

  /* Admin: editar usuario (correo, usuario, nombre, contraseña, plantel).
     Permite cambiar la cuenta de correo o restablecer contraseñas sin tocar
     el JSON a mano. Acceso: clave maestra o sesión admin/directivo. */
  if (url.pathname.startsWith('/api/admin/users/') && method === 'PATCH') {
    if (!usuariosAuth(req, res)) return;
    const id = url.pathname.slice('/api/admin/users/'.length);
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inv\u00e1lidos' }); }
    const users = loadJSON('users.json', []);
    const u = users.find(x => x.id === id);
    if (!u) return sendJSON(res, 404, { error: 'Usuario no encontrado' });
    if (b.email !== undefined) {
      const email = String(b.email || '').trim().toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJSON(res, 400, { error: 'Correo inv\u00e1lido' });
      if (email && users.some(x => x.email === email && x.id !== id)) return sendJSON(res, 400, { error: 'Correo ya registrado' });
      u.email = email || null;
    }
    if (b.usuario !== undefined) {
      const usuario = String(b.usuario || '').trim().toLowerCase();
      if (usuario && !/^[a-z0-9._-]{3,24}$/.test(usuario)) return sendJSON(res, 400, { error: 'Usuario: 3 a 24 caracteres (letras, n\u00fameros, . _ -)' });
      if (usuario && users.some(x => (x.usuario || '').toLowerCase() === usuario && x.id !== id)) return sendJSON(res, 400, { error: 'Usuario ya registrado' });
      u.usuario = usuario || null;
    }
    if (b.nombre !== undefined) {
      const nombre = String(b.nombre || '').trim();
      if (!nombre) return sendJSON(res, 400, { error: 'Nombre vac\u00edo' });
      u.nombre = nombre;
    }
    if (b.plantelId !== undefined) {
      if (u.rol !== 'encargado') return sendJSON(res, 400, { error: 'plantelId solo aplica a encargados' });
      const pid = b.plantelId || null;
      if (pid && !validCampusId(pid)) return sendJSON(res, 400, { error: 'plantelId inv\u00e1lido' });
      u.plantelId = pid;
      try { const { getCampusById } = require('./data/campuses.js'); const cp = pid ? getCampusById(pid) : null; u.plantel = cp ? cp.nombre : ''; } catch (e) { u.plantel = ''; }
    }
    if (b.password) {
      const pw = String(b.password);
      if (pw.length < 6) return sendJSON(res, 400, { error: 'M\u00ednimo 6 caracteres' });
      const { salt, hash } = hashPassword(pw);
      u.salt = salt; u.hash = hash;
      const sessions = loadJSON('sessions.json', {});
      Object.keys(sessions).forEach(t => { if (sessions[t].userId === u.id) delete sessions[t]; });
      saveJSON('sessions.json', sessions);
    }
    saveJSON('users.json', users);
    return sendJSON(res, 200, { success: true, user: publicUser(u) });
  }

  /* Admin: eliminar cuenta (no la propia) */
  if (url.pathname.startsWith('/api/admin/users/') && method === 'DELETE') {
    if (!usuariosAuth(req, res)) return;
    const id = url.pathname.slice('/api/admin/users/'.length);
    const users = loadJSON('users.json', []);
    const u = users.find(x => x.id === id);
    if (!u) return sendJSON(res, 404, { error: 'Usuario no encontrado' });
    const su = getAuthUser(req);
    if (su && su.id === id) return sendJSON(res, 400, { error: 'No puedes eliminar tu propia cuenta' });
    saveJSON('users.json', users.filter(x => x.id !== id));
    const sessions = loadJSON('sessions.json', {});
    Object.keys(sessions).forEach(t => { if (sessions[t].userId === id) delete sessions[t]; });
    saveJSON('sessions.json', sessions);
    return sendJSON(res, 200, { success: true, eliminado: id });
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
    // FASE 1 anti-spam: 1 registro por teléfono cada 24 h (devuelve el cupón existente)
    const hace24h = Date.now() - 24 * 60 * 60 * 1000;
    const previo = leads.find(l => l.telefono === telefono && new Date(l.fecha).getTime() > hace24h);
    if (previo) {
      // Wizard 2 pasos: el segundo envío (paso 2) completa campos vacíos sin duplicar.
      const extras = {};
      const edad = b.edad ? Number(b.edad) || null : null;
      if (edad && !previo.edad) extras.edad = edad;
      const horario = String(b.horarioPreferido || '').trim();
      if (horario && !previo.horarioPreferido) extras.horarioPreferido = horario;
      const origen = String(b.comoConociste || '').trim();
      if (origen && !previo.comoConociste) extras.comoConociste = origen;
      const com = String(b.comentarios || '').trim().slice(0, 1000);
      if (com && !previo.comentarios) extras.comentarios = com;
      if (previo.tutorAutorizado === null && (b.tutorAutorizado === true || b.tutorAutorizado === false)) extras.tutorAutorizado = b.tutorAutorizado;
      const actualizado = Object.keys(extras).length > 0;
      if (actualizado) { Object.assign(previo, extras); saveJSON('leads.json', leads); }
      return sendJSON(res, 200, { success: true, id: previo.id, cupon: previo.cupon, cuponMonto: previo.cuponMonto, cuponConcepto: previo.cuponConcepto, duplicate: true, updated: actualizado });
    }
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
      marketing: b.marketing === true,
      tutorAutorizado: b.tutorAutorizado === true ? true : (b.tutorAutorizado === false ? false : null),
      consent: (b.consent && typeof b.consent === 'object') ? {
        privacyVersion: String(b.consent.privacyVersion || ''),
        consentPrincipal: b.consent.consentPrincipal !== false,
        consentMarketing: !!b.consent.consentMarketing,
        consentAnalytics: !!b.consent.consentAnalytics,
        ubicacionPref: !!b.consent.ubicacionPref,
        formOrigin: String(b.consent.formOrigin || '')
      } : null,
      estado: 'nuevo',
      ultimoContacto: null, proximoSeguimiento: null, notas: '',
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200)
    };
    leads.push(lead); saveJSON('leads.json', leads);
    console.log(`[LEAD] ${lead.nombre} | ${lead.telefono} | ${lead.especialidad} | ${lead.plantelId} | ${lead.cupon}`);
    return sendJSON(res, 201, { success: true, id: lead.id, cupon: lead.cupon, cuponMonto: lead.cuponMonto, cuponConcepto: lead.cuponConcepto });
  }

  /* Admin: ver requireAdmin() */
  if (url.pathname === '/api/admin/stats' && method === 'GET') {
    const auth = panelAuth(req, res); if (!auth) return;
    const solo = soloPlantelDe(auth);
    let leads = loadJSON('leads.json', []);
    let citas = loadJSON('citas.json', []);
    if (solo) {
      leads = leads.filter(l => l.plantelId === solo.id);
      citas = citas.filter(c => c.campusId === solo.id);
    }
    const by = (arr, k) => arr.reduce((a, x) => { const v = x[k] || '—'; a[v] = (a[v] || 0) + 1; return a; }, {});
    const hoy = new Date().toISOString().slice(0, 10);
    return sendJSON(res, 200, {
      total: leads.length,
      porEstado: by(leads, 'estado'),
      porPlantel: by(leads, 'plantelId'),
      porEspecialidad: by(leads, 'especialidad'),
      porCampana: by(leads.map(l => ({ c: (l.campana && l.campana.campaign) || 'directo' })), 'c'),
      citasProximas: citas.filter(c => (c.fecha || '') >= hoy).length,
      ultimos: leads.slice(-10).reverse(),
      alcance: solo ? solo.nombre : 'todos'
    });
  }
  if (url.pathname === '/api/geo' && method === 'GET') {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || String(req.headers['x-real-ip'] || '').trim()
      || (req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : '');
    const clave = ip || 'desconocida';
    const hit = GEO_CACHE.get(clave);
    if (hit && Date.now() - hit.t < GEO_TTL_MS) return sendJSON(res, 200, hit.d);
    const dato = await geoPorIp(clave);
    const out = dato || { ok: false };
    if (dato) GEO_CACHE.set(clave, { t: Date.now(), d: out });
    return sendJSON(res, 200, out);
  }
  if (url.pathname === '/api/prospectos' && method === 'GET') {
    const auth = panelAuth(req, res); if (!auth) return;
    const solo = soloPlantelDe(auth);
    const q = url.searchParams;
    const leads = loadJSON('leads.json', []);
    const porTel = new Map(leads.map(l => [normTel10(l.telefono), l]));
    const hoja = await fetchHoja('prospectos');
    let filas, fuente;
    if (hoja && Array.isArray(hoja.prospectos)) {
      fuente = 'hoja';
      filas = hoja.prospectos.map(f => {
        const l = porTel.get(normTel10(f.telefono));
        // Estado: lo marcado a mano en el panel manda; si no, manda lo derivado de la hoja
        // (Citas/Inscripciones); si la hoja no sabe, se usa el estado local.
        const est = l && l.estadoExplicito ? l.estado
          : (f.estado && f.estado !== 'nuevo' ? f.estado : (l ? l.estado : 'nuevo'));
        const out = { ...f, estado: est };
        if (l) { out.id = l.id; out.plantelId = l.plantelId; }
        return out;
      });
    } else {
      fuente = 'local';
      filas = leads.map(l => ({
        id: l.id, fecha: String(l.fecha || '').slice(0, 10), nombre: l.nombre, telefono: l.telefono,
        especialidad: l.especialidad, plantel: l.plantel, plantelId: l.plantelId,
        campana: (l.campana && l.campana.campaign) || 'directo', cupon: l.cupon || '',
        horario: l.horarioPreferido || '', estado: l.estado || 'nuevo'
      })).reverse();
    }
    const fEst = q.get('estado'); if (fEst) filas = filas.filter(f => f.estado === fEst);
    const pl = solo ? solo.nombre : q.get('plantel'); if (pl) filas = filas.filter(f => matchPlantelLoose(f.plantel, pl));
    const fEs = q.get('especialidad'); if (fEs) filas = filas.filter(f => matchPlantelLoose(f.especialidad, fEs));
    const camp = q.get('campana'); if (camp) filas = filas.filter(f => String(f.campana || 'directo').toLowerCase() === camp.toLowerCase());
    const desde = q.get('desde'); if (desde) filas = filas.filter(f => String(f.fecha || '') >= desde);
    const hasta = q.get('hasta'); if (hasta) filas = filas.filter(f => String(f.fecha || '') <= hasta);
    return sendJSON(res, 200, { total: filas.length, prospectos: filas.slice(0, 500), fuente });
  }
  if (url.pathname === '/api/seguimiento' && method === 'GET') {
    const auth = panelAuth(req, res); if (!auth) return;
    const solo = soloPlantelDe(auth);
    const pl = url.searchParams.get('plantel') || '';
    const ps = new URLSearchParams();
    if (pl && !solo) ps.set('plantel', pl);
    if (url.searchParams.get('test') === '1' && !solo) ps.set('test', '1'); // filas de prueba solo para admin/directivo
    const hoja = await fetchHoja('seguimiento', ps.toString());
    if (hoja && (Array.isArray(hoja.sinCita) || Array.isArray(hoja.sinInscripcion))) {
      if (solo) {
        hoja.sinCita = (hoja.sinCita || []).filter(f => matchPlantelLoose(f.plantel, solo.nombre));
        hoja.sinInscripcion = (hoja.sinInscripcion || []).filter(f => matchPlantelLoose(f.plantel, solo.nombre));
      }
      // Un prospecto que el encargado marcó como avanzado (visita/inscrito/…) ya no es pendiente
      const leads = loadJSON('leads.json', []);
      const estTel = new Map(leads.map(l => [normTel10(l.telefono), l.estado]));
      const avanzado = ['inscrito', 'no-interesado', 'no-localizado'];
      hoja.sinCita = (hoja.sinCita || []).filter(f => {
        const e = estTel.get(normTel10(f.telefono));
        return !(e === 'cita-agendada' || e === 'visita' || avanzado.includes(e));
      });
      hoja.sinInscripcion = (hoja.sinInscripcion || []).filter(f => !avanzado.includes(estTel.get(normTel10(f.telefono))));
      return sendJSON(res, 200, hoja);
    }
    return sendJSON(res, 200, { sinCita: [], sinInscripcion: [], error: 'hoja no disponible' });
  }
  let m = url.pathname.match(/^\/api\/prospectos\/([A-Za-z0-9-]+)$/);
  if (m && method === 'PATCH') {
    const auth = panelAuth(req, res); if (!auth) return;
    const solo = soloPlantelDe(auth);
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const leads = loadJSON('leads.json', []);
    const lead = leads.find(l => l.id === m[1]);
    if (!lead) return sendJSON(res, 404, { error: 'No encontrado' });
    if (solo && lead.plantelId !== solo.id) return sendJSON(res, 404, { error: 'No encontrado' });
    if (b.estado && !LEAD_ESTADOS.includes(b.estado)) return sendJSON(res, 400, { error: 'Estado inválido' });
    const estadoPrevio = lead.estado;
    ['estado', 'ultimoContacto', 'proximoSeguimiento', 'notas'].forEach(k => { if (b[k] !== undefined) lead[k] = b[k]; });
    if (b.estado) lead.estadoExplicito = true; // marcado a mano: manda sobre lo derivado de la hoja
    saveJSON('leads.json', leads);
    notificarEstadoHoja(lead, estadoPrevio, auth);
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
      nombre, telefono, edad: b.edad ? Number(b.edad) || null : null, tipo: b.tipo,
      especialidadId: b.especialidadId || '', campusId: b.campusId,
      fecha: b.fecha, horario: b.horario,
      comentarios: String(b.comentarios || '').slice(0, 1000),
      marketing: b.marketing === true,
      tutorAutorizado: b.tutorAutorizado === true ? true : (b.tutorAutorizado === false ? false : null),
      consent: (b.consent && typeof b.consent === 'object') ? {
        privacyVersion: String(b.consent.privacyVersion || ''),
        consentPrincipal: b.consent.consentPrincipal !== false,
        consentMarketing: !!b.consent.consentMarketing,
        consentAnalytics: !!b.consent.consentAnalytics,
        ubicacionPref: !!b.consent.ubicacionPref,
        formOrigin: String(b.consent.formOrigin || '')
      } : null,
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
    if (!requireAdmin(req, res)) return;
    return sendJSON(res, 200, { citas: loadJSON('citas.json', []).slice().reverse() });
  }

  return sendJSON(res, 404, { error: 'No encontrado' });
}

/* ---------- páginas / URLs amigables ---------- */
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'text/xml', '.txt': 'text/plain' };

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
    const ext = path.extname(filePath);
    // Cache explícito (el CDN de Hostinger aplica 7d si no enviamos nada):
    // HTML siempre fresco, JS/CSS/Datos corto, imágenes largo.
    const cache = ext === '.html' ? 'no-cache'
      : ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp'].indexOf(ext) !== -1 ? 'public, max-age=604800'
      : 'public, max-age=300';
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': cache });
    res.end(data);
  });
});

seedIfEmpty();
server.listen(PORT, () => {
  console.log(`Grupo Holandés web en http://localhost:${PORT}`);
  console.log('Define GH_ADMIN_KEY para el panel /admin (actual: valor por defecto).');
});
