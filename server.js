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
const zlib = require('zlib');
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

/* Código que da de alta cuentas de profesor. Debe venir del entorno (GH_TEACHER_CODE)
   porque está escrito en el código fuente: quien lo tenga puede crear cuentas de
   profesor por su cuenta. El valor viejo se conserva como respaldo para no romper
   un flujo que ya esté desplegado. */
const TEACHER_CODE = process.env.GH_TEACHER_CODE || 'HOLANDES-PROF-2026';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const LEAD_ESTADOS = ['nuevo', 'contactado', 'interesado', 'cita-agendada', 'visita', 'seguimiento', 'apartado', 'inscrito', 'no-interesado', 'no-localizado'];
const CITA_TIPOS = ['visita', 'clase-muestra', 'asesoria', 'info-cursos'];

/* ---------- banco de fotos ---------- */
/* Solo los encargados suben fotos y prácticas (requisito del usuario). Los
   alumnos NO escriben aquí: en el foro sí, porque una pregunta no compromete a
   la escuela; una foto del taller sí. */
const BANCO_DIR = path.join(DATA_DIR, 'banco');
/* 8 MB por foto. Un teléfono actual dispara de 3 a 5 MB; 8 deja margen para un
   reencuadre generoso sin que el respaldo deje de ser descargable. */
const BANCO_LIMITE = 8e6;
/* 20 fotos por plantel: los 19 planteles tienen capacidad por igual y una cuota
   evita que Santa María del Tule se llene de fotos y Puerto Escondido salga
   vacío. Las RECHAZADAS no ocupan lugar, o quien subió una foto que no sirvió
   no podría reemplazarla. */
const BANCO_CUOTA = 20;
const BANCO_TIPOS = {
  taller: 'Práctica en el taller',
  equipo: 'Herramientas y equipo',
  aula: 'Aula y teoría',
  instalaciones: 'Instalaciones',
  evento: 'Evento o graduación',
  grupo: 'Grupo de alumnos'
};
/* Los tres formatos que Meta pide para un anuncio. El navegador los recorta del
   original con <canvas>: el servidor guarda el original tal cual porque
   redimensionar JPEG en Node puro no es posible sin meter una librería pesada. */
const FORMATOS_META = [
  { id: 'cuadrado', ancho: 1080, alto: 1080, nombre: '1:1 · feed' },
  { id: 'vertical', ancho: 1080, alto: 1920, nombre: '9:16 · reels y stories' },
  { id: 'enlace', ancho: 1200, alto: 628, nombre: '1.91:1 · anuncio de enlace' }
];
const MSG_ROSTRO_ANUNCIO = 'Una foto con rostro no va en anuncios. Puede ir a la galería; para anuncios usa manos, herramientas o el taller.';

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
/* Si `users.json` no existe se crea una cuenta de ejemplo. La contraseña YA NO viene
   escrita aquí: antes estaba en claro a la vista de quien leyera el repo. Ahora se
   toma de GH_SEED_PASSWORD y, si no está definida, no se crea ninguna cuenta — el
   primer usuario se da de alta desde /api/admin/users con la llave GH_ADMIN_KEY.
   ⚠️ Esto NO cambia la cuenta existente en producción: `users.json` ya existe ahí,
   así que seedIfEmpty no vuelve a correr. Esa cuenta se cambia desde
   /admin/usuarios (PATCH /api/admin/users/:id acepta `password` y cierra todas
   las sesiones abiertas). */
function seedIfEmpty() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  let users = loadJSON('users.json', null);
  if (!users) {
    const semilla = String(process.env.GH_SEED_PASSWORD || '');
    if (semilla) {
      const { salt, hash } = hashPassword(semilla);
      users = [{ id: crypto.randomUUID(), nombre: 'Prof. Grupo Holandés', matricula: 'PROF-001', email: 'profesor@grupoholandes.com', salt, hash, plantel: 'Plantel San Martín, Oaxaca', rol: 'profesor', createdAt: new Date().toISOString() }];
    } else {
      /* Sin contraseña no se crea NADA: una cuenta con una llave aleatoria que nadie
         conoce solo ensucia el listado y da la sensación falsa de que hay un usuario.
         Se escribe el arreglo vacío para que seedIfEmpty no intente volver a
         sembrar en cada arranque (`![]` es falso). */
      console.warn('Sin GH_SEED_PASSWORD: no se creó cuenta de ejemplo. Alta de usuarios con GH_ADMIN_KEY.');
      users = [];
    }
    saveJSON('users.json', users);
  }
  if (loadJSON('sessions.json', null) === null) saveJSON('sessions.json', {});
  if (loadJSON('posts.json', null) === null) saveJSON('posts.json', []);
  if (loadJSON('leads.json', null) === null) saveJSON('leads.json', []);
  if (loadJSON('citas.json', null) === null) saveJSON('citas.json', []);
  if (loadJSON('banco.json', null) === null) saveJSON('banco.json', []);
  /* La carpeta de las fotos se crea aquí, no en la primera subida: así el
     primer encargado no depende de que el directorio exista ya. */
  try { fs.mkdirSync(BANCO_DIR, { recursive: true }); } catch (e) { /* ya existe */ }
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

/* Hora de México como ISO con offset (-06:00).
   Motivo: `new Date().toISOString()` SIEMPRE devuelve UTC, así que los leads
   se estampaban 6 horas adelantadas y cualquier registro hecho después de las
   18:00 (justo cuando más llega tráfico de anuncios) quedaba asignado al día
   siguiente en el panel. Todos los estados donde opera Grupo Holandés
   (Oaxaca, Puebla, Veracruz, Guerrero, Tabasco) son UTC-6 y México no usa
   horario de verano desde 2022, así que el offset es fijo.
   Se devuelve ISO con offset explícito: se lee con la hora local correcta y
   `new Date()` lo sigue parseando al instante correcto (la deduplicación de
   24 h, que compara instantes, no se ve afectada). */
function ahoraMX() {
  const f = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  return f.format(new Date()).replace(' ', 'T') + '-06:00';
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
/* Respaldo de `data/`: solo la llave maestra o una sesión con rol admin.
   No se reutiliza `requireAdmin` porque ese envía el 401 apenas falla la llave, y
   aquí hay dos caminos posibles: la negativa se manda una sola vez, al final. */
function respaldoAuth(req, res) {
  const k = String(req.headers['x-admin-key'] || '');
  if (!ADMIN_LOCKED && k && k === ADMIN_KEY) return true;
  const u = getAuthUser(req);
  if (u && u.rol === 'admin') return true;
  sendJSON(res, 401, { error: 'Solo el administrador puede descargar el respaldo' });
  return false;
}

/* Cola de moderación del foro: solo la llave maestra o una sesión con rol
   `admin`. NO se reutiliza `usuariosAuth` (que también deja pasar a
   `directivo`): el foro lo modera una sola persona. Con 500 alumnos y un solo
   moderador, repartir ese trabajo solo multiplica lo que hay que revisar, y
   además cada respuesta aprobada queda en el sitio público con la firma de
   quien la escribió. */
function foroAuth(req, res) {
  const u = getAuthUser(req);
  if (u && u.rol === 'admin') return true;
  if (requireAdmin(req, res)) return true;
  return false;
}

/* Hoja (Google Apps Script): se consulta desde el servidor para poder aplicar
   el filtro de plantel del encargado. Si la hoja no responde, se usan los
   leads locales como respaldo. */
// SHEETS_OFF=1 deja el webhook vacío. Es obligatorio al probar el panel en local:
// cambiar un estado dispara una escritura real en la hoja de Google, y ahí no se
// pueden meter datos de prueba. En producción la variable no existe y nada cambia.
const SHEETS_URL = process.env.SHEETS_OFF === '1' ? ''
  : (() => { try { return require('./data/app-config.js').APP_CONFIG.sheetsWebhookUrl || ''; } catch (e) { return ''; } })();
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
   (inscripción -> hoja Inscripciones; visita y contacto -> bitácora Interacciones)
   para que seguimiento y /directivo queden consistentes.
   "contactado" es el que hace auditable el trabajo del encargado: si no se escribe
   aquí, la hoja no sabe nunca cuándo llamó a alguien (el caso de 170 clics y 0 citas).
   Fire-and-forget: nunca bloquea ni hace fallar el PATCH. */
function notificarEstadoHoja(lead, previo, auth) {
  if (!SHEETS_URL || lead.estado === previo) return;
  const quien = (auth && auth.user && auth.user.nombre) || (auth && auth.rol) || 'panel';
  let body = null;
  if (lead.estado === 'inscrito') {
    body = { form: 'inscripcion', nombre: lead.nombre, telefono: lead.telefono, cupon: lead.cupon || '',
      edad: lead.edad || '', especialidad: lead.especialidad, plantel: lead.plantel, plantelId: lead.plantelId,
      via: 'panel', detalle: 'Inscripción registrada por ' + quien, fecha: ahoraMX() };
  } else if (lead.estado === 'visita') {
    body = { form: 'interaccion', evento: 'visita', detalle: 'Visita registrada por ' + quien,
      nombre: lead.nombre, telefono: lead.telefono, especialidad: lead.especialidad,
      plantel: lead.plantel, plantelId: lead.plantelId, cupon: lead.cupon || '',
      via: 'panel', fecha: ahoraMX() };
  } else if (lead.estado === 'contactado') {
    body = { form: 'interaccion', evento: 'contactado', detalle: 'Contactado por ' + quien,
      nombre: lead.nombre, telefono: lead.telefono, especialidad: lead.especialidad,
      plantel: lead.plantel, plantelId: lead.plantelId, cupon: lead.cupon || '',
      via: 'panel', fecha: ahoraMX() };
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
/* Cuerpo de la petición, con tope de 1 MB. El tope es lo que impide que alguien
   tumbe el proceso acumulando memoria en el servidor (los endpoints de autenticación
   y los del panel son públicos hasta que se autentican).
   ⚠️ Antes se hacía `req.destroy()` sin rechazar la promesa: el llamador no
   recibía respuesta y el navegador quedaba colgado hasta el timeout. Ahora se
   rechaza con `code = 'PAYLOAD_TOO_LARGE'`, y el banco de fotos distingue ese
   código para decir "la foto es demasiado grande" en vez de "datos inválidos". */
const LIMITE_CUERPO = 1e6;
/* El tope puede subirse por ruta. Solo lo necesita `/api/admin/banco/meta`, que
   recibe las imágenes generadas en el navegador (3 JPEG de 1080 px ≈ 2 MB en
   base64). El default sigue en 1 MB: es lo que protege los endpoints públicos. */
function parseBody(req, limite) {
  const tope = limite || LIMITE_CUERPO;
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => {
      if (body.length > tope) return;
      body += c;
      if (body.length > tope) {
        const e = new Error('Cuerpo demasiado grande');
        e.code = 'PAYLOAD_TOO_LARGE';
        reject(e);
        /* Se deja de leer, pero NO se destruye el socket: al destruirlo el llamador
           no puede contestar y el navegador muere por timeout en vez de ver el error. */
        req.pause();
      }
    });
    req.on('end', () => { if (!body) return resolve({}); try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

/* ---------- respaldo: ZIP sin dependencias ---------- */
/* `data/*.json` está en .gitignore: no viaja con el repo y un rebuild de Hostinger
   no lo recrea. Si algún día se pierde el disco de la app se pierden prospectos,
   usuarios y todo lo que suba el banco de fotos. Este bloque permite descargarlo.
   Se genera un ZIP "almacenado" (método 0, sin comprimir): los .json son
   diminutos y el formato sale en ~60 líneas. Para los .jpg del banco de fotos no
   hace falta comprimir tampoco — ya vienen comprimidos. */
const CRC_TABLA = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLA[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
/* Fecha/hora en el formato del ZIP (5 bits para segundos → se redondea a 2 s). */
function dosFechaHora(d) {
  const y = Math.min(Math.max(d.getFullYear(), 1980), 2107);
  return {
    fecha: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)
  };
}
function zipAlmacenar(archivos) {
  const cuerpos = [], centrales = [];
  let offset = 0;
  for (const a of archivos) {
    const nombre = Buffer.from(a.nombre, 'utf8');
    const datos = a.datos;
    const crc = crc32(datos);
    const { fecha, hora } = dosFechaHora(a.mtime || new Date());

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034B50, 0); // firma
    local.writeUInt16LE(20, 4);         // versión mínima
    local.writeUInt16LE(0x0800, 6);     // bandera: nombres en UTF-8
    local.writeUInt16LE(0, 8);          // método 0: almacenar
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(fecha, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(datos.length, 18);   // comprimido
    local.writeUInt32LE(datos.length, 22);   // original
    local.writeUInt16LE(nombre.length, 26);
    local.writeUInt16LE(0, 28);         // sin campo extra

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014B50, 0);
    central.writeUInt16LE(20, 4);       // creado por
    central.writeUInt16LE(20, 6);       // versión mínima
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(hora, 12);
    central.writeUInt16LE(fecha, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(datos.length, 20);
    central.writeUInt32LE(datos.length, 24);
    central.writeUInt16LE(nombre.length, 28);
    central.writeUInt16LE(0, 30);       // sin extra
    central.writeUInt16LE(0, 32);       // sin comentario
    central.writeUInt16LE(0, 34);       // disco de inicio
    central.writeUInt16LE(0, 36);       // atributos internos
    central.writeUInt32LE(0, 38);       // atributos externos
    central.writeUInt32LE(offset, 42);  // posición del encabezado local

    cuerpos.push(local, nombre, datos);
    centrales.push(central, nombre);
    offset += local.length + nombre.length + datos.length;
  }
  const dir = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054B50, 0);
  fin.writeUInt16LE(0, 4);
  fin.writeUInt16LE(0, 6);
  fin.writeUInt16LE(archivos.length, 8);
  fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(dir.length, 12);
  fin.writeUInt32LE(offset, 16);
  fin.writeUInt16LE(0, 20);
  return Buffer.concat([...cuerpos, dir, fin]);
}

/* Mismo ZIP, pero leyendo los archivos del disco UNO A LA VEZ y volcándolos a
   la respuesta sin acumularlos.
   ⚠️ `zipAlmacenar` junta todos los bytes en memoria. Con los `.json` (unos
   pocos KB) estaba bien, pero con `data/banco/` el respaldo pesaría varios GB
   y el proceso moriría contra el límite de memoria de un hosting compartido —
   y además el usuario no podría descargarlo.
   Aquí el CRC se calcula leyendo un archivo cada vez, así que lo que ocupa en
   memoria depende del archivo más GRANDE, no del total.
   Detalle que lo hace posible: como es un ZIP "almacenado" (método 0) no se
   comprime nada, así que el tamaño final se conoce ANTES de escribir un byte —
   se manda `Content-Length` y el navegador muestra la barra de progreso en vez
   de una descarga sin fin. Un ZIP deflateado no permitiría esto. */
function volcarArchivo(res, ruta) {
  return new Promise((ok, mal) => {
    const s = fs.createReadStream(ruta);
    s.on('error', mal);
    s.on('end', ok);
    /* `end: false`: el resumen del ZIP va después y cerrar el socket aquí lo
       cortaría. */
    s.pipe(res, { end: false });
  });
}
/* Tamaño exacto del ZIP "almacenado": suma de encabezados locales + datos +
   directorio central + registro final. Se conoce ANTES de escribir un byte, y
   eso es lo que permite mandar Content-Length con una descarga que no se
   acumula en memoria. Un ZIP deflateado no lo permitiría. */
function zipTamano(archivos) {
  let n = 22;
  for (const a of archivos) {
    const tam = a.datos ? a.datos.length : fs.statSync(a.ruta).size;
    n += 30 + Buffer.byteLength(a.nombre, 'utf8') + tam + 46 + Buffer.byteLength(a.nombre, 'utf8');
  }
  return n;
}
async function zipVolcado(res, archivos, total) {
  const filas = archivos.map(a => ({
    ...a,
    tam: a.datos ? a.datos.length : fs.statSync(a.ruta).size,
    nombreBuf: Buffer.from(a.nombre, 'utf8')
  }));

  const centrales = [];
  let offset = 0;
  for (const f of filas) {
    /* El CRC sí obliga a leer el archivo entero, pero UNO A LA VEZ: lo que
       ocupa en memoria depende del más grande, no del total del respaldo. */
    const crc = crc32(f.datos || fs.readFileSync(f.ruta));
    const { fecha, hora } = dosFechaHora(f.mtime || new Date());

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034B50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(fecha, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.tam, 18);
    local.writeUInt32LE(f.tam, 22);
    local.writeUInt16LE(f.nombreBuf.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014B50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(hora, 12);
    central.writeUInt16LE(fecha, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(f.tam, 20);
    central.writeUInt32LE(f.tam, 24);
    central.writeUInt16LE(f.nombreBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    res.write(Buffer.concat([local, f.nombreBuf]));
    if (f.datos) res.write(f.datos);
    else await volcarArchivo(res, f.ruta);
    centrales.push(Buffer.concat([central, f.nombreBuf]));
    offset += 30 + f.nombreBuf.length + f.tam;
  }

  const dir = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054B50, 0);
  fin.writeUInt16LE(0, 4);
  fin.writeUInt16LE(0, 6);
  fin.writeUInt16LE(filas.length, 8);
  fin.writeUInt16LE(filas.length, 10);
  fin.writeUInt32LE(dir.length, 12);
  fin.writeUInt32LE(offset, 16);
  fin.writeUInt16LE(0, 20);
  res.end(Buffer.concat([dir, fin]));
  return total;
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

  /* Admin: respaldo de `data/` — los .json que no están en git.
     Se sirve como descarga (no como JSON) para que el navegador la guarde directo. */
  if (url.pathname === '/api/admin/backup' && method === 'GET') {
    if (!respaldoAuth(req, res)) return;
    let archivos;
    try {
      archivos = fs.readdirSync(DATA_DIR, { withFileTypes: true })
        .filter(e => e.isFile() && path.extname(e.name) === '.json')
        .map(e => {
          const ruta = path.join(DATA_DIR, e.name);
          /* Los .json son diminutos: se leen enteros. */
          return { nombre: 'data/' + e.name, datos: fs.readFileSync(ruta), mtime: fs.statSync(ruta).mtime };
        });
    } catch (e) {
      return sendJSON(res, 500, { error: 'No se pudo leer el directorio de datos' });
    }
    /* Las fotos del banco. Van por `ruta` y no por `datos`: se vuelcan desde
       disco un archivo cada vez. Antes todo el respaldo se armaba en memoria y
       con las fotos eso era una sentencia de muerte — varios GB contra el
       límite de un hosting compartido. */
    let fotos = 0;
    try {
      for (const e of fs.readdirSync(BANCO_DIR, { withFileTypes: true })) {
        if (!e.isFile()) continue;
        const ext = path.extname(e.name).toLowerCase();
        if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') continue;
        const ruta = path.join(BANCO_DIR, e.name);
        archivos.push({ nombre: 'data/banco/' + e.name, ruta, mtime: fs.statSync(ruta).mtime });
        fotos++;
      }
    } catch (e) { /* aún no hay carpeta de fotos */ }
    if (!archivos.length) return sendJSON(res, 404, { error: 'No hay archivos que respaldar' });
    /* Resumen legible en el manifiesto: sirve para saber si un respaldo es válido
       antes de restaurarlo (un ZIP vacío o corrupto se detecta de un vistazo). */
    const conteo = {};
    for (const n of ['leads.json', 'users.json', 'citas.json', 'posts.json', 'banco.json']) {
      try {
        const v = JSON.parse(fs.readFileSync(path.join(DATA_DIR, n), 'utf8'));
        conteo[n] = Array.isArray(v) ? v.length : Object.keys(v).length;
      } catch (e) { conteo[n] = null; }
    }
    archivos.push({
      nombre: 'respaldo-manifest.json',
      datos: Buffer.from(JSON.stringify({ generadoEn: ahoraMX(), archivos: archivos.map(a => a.nombre), conteo, fotos }, null, 2), 'utf8'),
      mtime: new Date()
    });
    /* El tamaño se conoce antes de volcar nada → el navegador muestra la barra
       de progreso en vez de una descarga sin fin. */
    const total = zipTamano(archivos);
    const nombre = 'respaldo-grupoholandes-' + ahoraMX().slice(0, 10) + '.zip';
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="' + nombre + '"',
      'Content-Length': String(total),
      'Cache-Control': 'no-store'
    });
    await zipVolcado(res, archivos, total);
    return;
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
      fecha: ahoraMX(),
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
    const hoy = ahoraMX().slice(0, 10); // fecha local de México, no UTC
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
        // Contacto, recordatorio y notas viven en leads.json, NO en la hoja: si no
        // se copian aquí el panel los recibe siempre vacíos aunque el PATCH sí los guarde.
        if (l) {
          out.id = l.id; out.plantelId = l.plantelId;
          out.ultimoContacto = l.ultimoContacto || null;
          out.proximoSeguimiento = l.proximoSeguimiento || null;
          out.notas = l.notas || '';
        }
        return out;
      });
    } else {
      fuente = 'local';
      filas = leads.map(l => ({
        id: l.id, fecha: String(l.fecha || '').slice(0, 10), nombre: l.nombre, telefono: l.telefono,
        especialidad: l.especialidad, plantel: l.plantel, plantelId: l.plantelId,
        campana: (l.campana && l.campana.campaign) || 'directo', cupon: l.cupon || '',
        horario: l.horarioPreferido || '', estado: l.estado || 'nuevo',
        ultimoContacto: l.ultimoContacto || null, proximoSeguimiento: l.proximoSeguimiento || null,
        notas: l.notas || ''
      })).reverse();
    }
    const fEst = q.get('estado'); if (fEst) filas = filas.filter(f => f.estado === fEst);
    const pl = solo ? solo.nombre : q.get('plantel'); if (pl) filas = filas.filter(f => matchPlantelLoose(f.plantel, pl));
    const fEs = q.get('especialidad'); if (fEs) filas = filas.filter(f => matchPlantelLoose(f.especialidad, fEs));
    const camp = q.get('campana'); if (camp) filas = filas.filter(f => String(f.campana || 'directo').toLowerCase() === camp.toLowerCase());
    const desde = q.get('desde'); if (desde) filas = filas.filter(f => String(f.fecha || '') >= desde);
    const hasta = q.get('hasta'); if (hasta) filas = filas.filter(f => String(f.fecha || '') <= hasta);
    // Recordatorio: seguimiento=vencidos → solo los que tienen fecha pasada o de hoy.
    // Fecha (YYYY-MM-DD) que eligió el asesor, por eso se compara con diaStr y no con horaMX.
    if (q.get('seguimiento') === 'vencidos') {
      const hoy = ahoraMX().slice(0, 10);
      filas = filas.filter(f => f.proximoSeguimiento && String(f.proximoSeguimiento).slice(0, 10) <= hoy);
    }
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
      creada: ahoraMX(), estado: 'programada'
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

  /* ---------- foro: escritura ---------- */
  /* Sin cuenta no se escribe. Todo lo que entra queda en `en-revision`: no hay
     ningún camino que publique directo, ni siquiera para el personal.
     Por ahora solo escriben los encargados de cada plantel y la coordinación
     (decisión del usuario, oct-2026). ⚠️ El público sigue LEYENDO todo sin
     cuenta: cambiar quién publica no cambia quién lee.
     ⚠️ Esto es un guard de ROL en el servidor, no del formulario: un alumno
     con token de portal válido recibe 403 aunque su navegador pinte el
     formulario. Un guard solo en el navegador se salta con la consola. */
  const FORO_ESCRIBE = ['encargado', 'admin'];
  function autorForo(req, res) {
    const u = getAuthUser(req);
    if (!u) { sendJSON(res, 401, { error: 'Entra con tu cuenta para escribir en el foro' }); return null; }
    if (!FORO_ESCRIBE.includes(u.rol)) {
      sendJSON(res, 403, { error: 'Por ahora solo los encargados de cada plantel y la coordinación escriben en el foro. Cualquiera puede leerlo sin cuenta.' });
      return null;
    }
    return u;
  }
  /* Los precios no se publican: es una regla del sitio, no del formulario. Se
     filtra AQUÍ y no en el navegador, porque el navegador lo puede saltar. */
  const PRECIO = /(?:\$\s?\d[\d,.]*|colegiatura|cuota|precio)/i;
  function sinPrecio(res, texto) {
    if (!PRECIO.test(String(texto || ''))) return true;
    sendJSON(res, 400, { error: 'El foro no publica precios. Quita esa mención y vuelve a intentar.' });
    return false;
  }
  function slugForo(titulo) {
    return String(titulo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'hilo';
  }

  if (url.pathname === '/api/foro' && method === 'POST') {
    const u = autorForo(req, res); if (!u) return;
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const title = String(b.title || '').trim();
    const content = String(b.content || '').trim();
    if (!title || !content) return sendJSON(res, 400, { error: 'El título y el mensaje son obligatorios' });
    if (title.length > 140) return sendJSON(res, 400, { error: 'El título es demasiado largo' });
    if (content.length > 5000) return sendJSON(res, 400, { error: 'El mensaje es demasiado largo' });
    if (!sinPrecio(res, title + ' ' + content)) return;
    const category = Object.prototype.hasOwnProperty.call(CATEGORIAS_FORO, b.category) ? b.category : 'general';
    const posts = loadJSON('posts.json', []);
    /* Slug único: dos preguntas iguales no pueden pisar la URL de la primera. */
    let slug = slugForo(title), n = 2;
    while (posts.some(p => p && String(p.slug || p.id) === slug)) slug = slugForo(title) + '-' + n++;
    const hilo = {
      id: crypto.randomUUID(), slug, title, content, category,
      author: u.nombre, authorRol: u.rol, plantel: u.plantel || '',
      estado: 'en-revision', createdAt: ahoraMX(), replies: []
    };
    posts.push(hilo); saveJSON('posts.json', posts);
    return sendJSON(res, 201, { success: true, slug: hilo.slug, estado: hilo.estado });
  }

  if (url.pathname.startsWith('/api/foro/') && url.pathname.endsWith('/responder') && method === 'POST') {
    const u = autorForo(req, res); if (!u) return;
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const content = String(b.content || '').trim();
    if (!content) return sendJSON(res, 400, { error: 'La respuesta está vacía' });
    if (content.length > 5000) return sendJSON(res, 400, { error: 'La respuesta es demasiado larga' });
    if (!sinPrecio(res, content)) return;
    const slug = decodeURIComponent(url.pathname.slice('/api/foro/'.length, -'/responder'.length));
    const posts = loadJSON('posts.json', []);
    /* Solo se responde a un hilo PUBLICADO: responder a uno que aún está en
       revisión enredaría la cola sin aportar nada visible. */
    const hilo = posts.find(p => p && hiloPublicado(p) && String(p.slug || p.id) === slug);
    if (!hilo) return sendJSON(res, 404, { error: 'Hilo no encontrado' });
    const r = {
      id: crypto.randomUUID(), content,
      author: u.nombre, authorRol: u.rol, plantel: u.plantel || '',
      estado: 'en-revision', createdAt: ahoraMX()
    };
    hilo.replies = Array.isArray(hilo.replies) ? hilo.replies : [];
    hilo.replies.push(r);
    saveJSON('posts.json', posts);
    return sendJSON(res, 201, { success: true, estado: r.estado });
  }

  /* ---------- foro: cola de moderación ---------- */
  /* Una sola llamada devuelve los dos tipos de pendiente. Con la cola partida
     en dos endpoints habría que revisar dos pantallas para saber si quedó algo
     sin atender — y el riesgo real de este foro es que algo se quede ahí. */
  if (url.pathname === '/api/admin/foro' && method === 'GET') {
    if (!foroAuth(req, res)) return;
    const posts = loadJSON('posts.json', []);
    const pendientes = [];
    for (const p of posts) {
      if (!p) continue;
      if (p.estado === 'en-revision') {
        pendientes.push({ tipo: 'hilo', id: p.id, slug: p.slug || p.id, title: p.title, content: p.content,
          category: p.category, author: p.author, authorRol: p.authorRol, plantel: p.plantel || '', createdAt: p.createdAt });
      }
      for (const r of (Array.isArray(p.replies) ? p.replies : [])) {
        if (r && r.estado === 'en-revision') {
          pendientes.push({ tipo: 'respuesta', id: r.id, hiloId: p.id, hiloSlug: p.slug || p.id, hiloTitle: p.title,
            content: r.content, author: r.author, authorRol: r.authorRol, plantel: r.plantel || '', createdAt: r.createdAt });
        }
      }
    }
    /* Lo más viejo primero: es lo que lleva más tiempo esperando. */
    pendientes.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    return sendJSON(res, 200, { pendientes, total: pendientes.length });
  }

  if (url.pathname === '/api/admin/foro' && method === 'PATCH') {
    if (!foroAuth(req, res)) return;
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    /* `rechazar` NO borra: deja el texto en `rechazado` por si hay que revisar
       qué se rechazó y por qué. Borrar dejaría un hueco sin explicación. */
    const estado = b.accion === 'aprobar' ? 'publicado' : (b.accion === 'rechazar' ? 'rechazado' : null);
    if (!estado) return sendJSON(res, 400, { error: 'Acción inválida (aprobar o rechazar)' });
    if (!b.id) return sendJSON(res, 400, { error: 'Falta el identificador' });
    const posts = loadJSON('posts.json', []);
    let cambiado = null;
    for (const p of posts) {
      if (!p) continue;
      if (b.tipo === 'respuesta') {
        const r = (Array.isArray(p.replies) ? p.replies : []).find(x => x && x.id === b.id);
        if (r) { r.estado = estado; cambiado = r; break; }
      } else if (p.id === b.id) { p.estado = estado; cambiado = p; break; }
    }
    if (!cambiado) return sendJSON(res, 404, { error: 'No encontrado' });
    saveJSON('posts.json', posts);
    return sendJSON(res, 200, { success: true, estado });
  }

  /* ---------- banco de fotos ---------- */
  /* Cuerpo binario con tope. No pasa por `parseBody` porque ese espera JSON, y
     aquí el cuerpo ES la foto. El tope se aplica mientras se lee, así que
     alguien que mande 100 MB a lo lento no logra ocupar más de lo permitido. */
  function leerImagen(req, limite) {
    return new Promise((resolve, reject) => {
      const trozos = [];
      let total = 0;
      req.on('data', c => {
        total += c.length;
        if (total > limite) {
          const e = new Error('Archivo demasiado grande');
          e.code = 'PAYLOAD_TOO_LARGE';
          reject(e);
          req.pause();
          return;
        }
        trozos.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(trozos)));
      req.on('error', reject);
    });
  }
  /* Dimensiones leyendo la cabecera, sin librería. Además de dar el ancho y el
     alto (que deciden el recorte de Meta), ES LA VALIDACIÓN DEL ARCHIVO: se
     comprueba la firma en vez de confiar en el nombre, porque alguien podría
     mandar un .html renombrado a .jpg y, si algún día la galería lo sirviera
     con el content-type equivocado, eso es un ataque de scripting. */
  function leerDimensiones(buf) {
    /* PNG: firma + bloque IHDR; ancho y alto son 4 bytes en big-endian. */
    if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      return { ext: '.png', ancho: buf.readUInt32BE(16), alto: buf.readUInt32BE(20) };
    }
    /* JPEG: se recorren los segmentos hasta dar con un SOF, que es el único que
       trae las dimensiones. */
    if (buf.length > 4 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
      let i = 2;
      while (i + 1 < buf.length) {
        if (buf[i] !== 0xFF) { i++; continue; }
        const marca = buf[i + 1];
        if (marca === 0xFF) { i++; continue; }
        if (marca >= 0xC0 && marca <= 0xCF && marca !== 0xC4 && marca !== 0xC8 && marca !== 0xCC) {
          if (i + 9 > buf.length) return null;
          return { ext: '.jpg', alto: buf.readUInt16BE(i + 5), ancho: buf.readUInt16BE(i + 7) };
        }
        /* SOI, EOI y los RSTn no llevan campo de longitud: avanzan 2 y ya. */
        if (marca === 0xD8 || marca === 0xD9 || (marca >= 0xD0 && marca <= 0xD7)) { i += 2; continue; }
        if (i + 3 >= buf.length) return null;
        const largo = buf.readUInt16BE(i + 2);
        if (largo < 2) return null;  // segmento malformado: sin esto se avanza en bucle
        i += 2 + largo;
      }
      return null;                   // JPEG sin SOF: incompleto o dañado
    }
    return null;                     // ni JPEG ni PNG
  }
  /* Los catálogos salen de los mismos archivos que usa el sitio público: si un
     plantel se da de baja en campuses.js deja de poderse elegir aquí y no hace
     falta sostener dos listas que se pueden desincronizar. */
  function plantelesBanco() {
    try { return require('./data/campuses.js').CAMPUSES.filter(c => c.activo).map(c => ({ id: c.id, nombre: c.nombre })); }
    catch (e) { return []; }
  }
  function especialidadesBanco() {
    try { return require('./data/specialties.js').SPECIALTIES.filter(s => s.activo !== false).map(s => ({ id: s.id, nombre: s.nombre })); }
    catch (e) { return []; }
  }
  function rutaBanco(foto) {
    /* El nombre sale del registro y el id lo generó el servidor, así que no hay
       cómo salirse de la carpeta desde la URL. `path.basename` es la red de
       seguridad por si el registro llegara a manipularse a mano. */
    return path.join(BANCO_DIR, path.basename(String(foto.archivo || '')));
  }

  if (url.pathname === '/api/admin/banco' && method === 'GET') {
    if (!foroAuth(req, res)) return;
    const fotos = loadJSON('banco.json', []);
    /* Cuota por plantel. Cuenta lo pendiente y lo aprobado; lo rechazado queda
       fuera para que quien subió una foto que no sirvió pueda reemplazarla. */
    const cuotas = {};
    for (const f of fotos) {
      if (!f || f.estado === 'rechazada') continue;
      cuotas[f.plantelId] = (cuotas[f.plantelId] || 0) + 1;
    }
    return sendJSON(res, 200, {
      fotos, cuotas, cuota: BANCO_CUOTA, limite: BANCO_LIMITE,
      planteles: plantelesBanco(), especialidades: especialidadesBanco(),
      tipos: BANCO_TIPOS, formatos: FORMATOS_META
    });
  }

  /* La imagen se baja por API, no por URL: `servible()` no deja pasar nada que
     no sea `.js` dentro de `/data/`, así que `data/banco/x.jpg` responde 404.
     El navegador la pide con las cabeceras de autenticación y de la respuesta
     hace un blob — el `<img>` por sí solo no puede mandar cabeceras. */
  if (url.pathname.startsWith('/api/admin/banco/') && url.pathname.endsWith('/imagen') && method === 'GET') {
    if (!foroAuth(req, res)) return;
    const id = decodeURIComponent(url.pathname.slice('/api/admin/banco/'.length, -'/imagen'.length));
    const foto = loadJSON('banco.json', []).find(f => f && f.id === id);
    if (!foto) return sendJSON(res, 404, { error: 'Foto no encontrada' });
    const ruta = rutaBanco(foto);
    if (!ruta.startsWith(BANCO_DIR) || !fs.existsSync(ruta)) return sendJSON(res, 404, { error: 'El archivo ya no existe en el servidor' });
    res.writeHead(200, {
      'Content-Type': path.extname(ruta) === '.png' ? 'image/png' : 'image/jpeg',
      'Content-Length': String(fs.statSync(ruta).size),
      'Cache-Control': 'private, no-store'
    });
    fs.createReadStream(ruta).pipe(res);
    return;
  }

  /* Las 3 variantes que generó el navegador vuelven al servidor y salen como
     ZIP. Se hace así en vez de armar el ZIP en el navegador para que la
     compresión exista UNA sola vez (zipAlmacenar) y no dos que se pueden
     desincronizar. El envío es ~2 MB, por eso esta ruta sube su propio tope. */
  if (url.pathname === '/api/admin/banco/meta' && method === 'POST') {
    if (!foroAuth(req, res)) return;
    let b;
    try { b = await parseBody(req, 14e6); }
    catch (e) {
      const grande = e.code === 'PAYLOAD_TOO_LARGE';
      return sendJSON(res, grande ? 413 : 400, { error: grande ? 'Las imágenes generadas pesan demasiado' : 'Datos inválidos' });
    }
    const fotos = loadJSON('banco.json', []);
    const f = fotos.find(x => x && x.id === b.id);
    if (!f) return sendJSON(res, 404, { error: 'No encontrada' });
    const archivos = [];
    for (const a of (Array.isArray(b.archivos) ? b.archivos : []).slice(0, 6)) {
      /* El nombre lo escribe el navegador, pero no se le confía: con
         `path.basename` y el filtro de caracteres da igual que traiga `../`
         o un nombre raro, y no puede salirse de la carpeta. */
      const limpio = path.basename(String(a.nombre || '')).replace(/[^A-Za-z0-9._-]/g, '_');
      if (!limpio) continue;
      let datos;
      try { datos = Buffer.from(String(a.datos || ''), 'base64'); } catch (e2) { continue; }
      if (!datos.length || datos.length > 6e6) continue;
      if (!(datos[0] === 0xFF && datos[1] === 0xD8)) continue;  // JPEG o nada
      archivos.push({ nombre: limpio, datos, mtime: new Date() });
    }
    if (!archivos.length) return sendJSON(res, 400, { error: 'Ninguna de las imágenes llegó válida' });
    const zip = zipAlmacenar(archivos);
    /* Queda registrado en qué se usó la foto: es lo que permite saber, meses
       después, en qué campañas salió. */
    f.usadaEn = Array.isArray(f.usadaEn) ? f.usadaEn : [];
    f.usadaEn.push({ donde: 'meta', fecha: ahoraMX(), nota: archivos.map(a => a.nombre).join(' · ') });
    saveJSON('banco.json', fotos);
    const zipName = 'meta-' + path.basename(f.archivo, path.extname(f.archivo)) + '.zip';
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="' + zipName + '"',
      'Content-Length': String(zip.length),
      'Cache-Control': 'no-store'
    });
    res.end(zip);
    return;
  }

  if (url.pathname === '/api/admin/banco' && method === 'POST') {
    if (!foroAuth(req, res)) return;
    let img;
    try { img = await leerImagen(req, BANCO_LIMITE); }
    catch (e) {
      const grande = e.code === 'PAYLOAD_TOO_LARGE';
      return sendJSON(res, grande ? 413 : 400, {
        error: grande
          ? 'La foto pesa más de ' + Math.round(BANCO_LIMITE / 1e6) + ' MB. Mándala en menor resolución.'
          : 'No se pudo leer el archivo'
      });
    }
    if (!img.length) return sendJSON(res, 400, { error: 'El archivo está vacío' });
    const dim = leerDimensiones(img);
    if (!dim) return sendJSON(res, 400, { error: 'Solo se aceptan fotos en JPG o PNG.' });
    if (dim.ancho < 300 || dim.alto < 300) return sendJSON(res, 400, { error: 'La foto es demasiado pequeña para publicarse: usa al menos 300 píxeles por lado.' });
    if (dim.ancho > 20000 || dim.alto > 20000) return sendJSON(res, 400, { error: 'Las medidas de la foto no son válidas.' });

    const q = url.searchParams;
    const plantel = plantelesBanco().find(p => p.id === q.get('plantelId'));
    if (!plantel) return sendJSON(res, 400, { error: 'Elige el plantel de la foto' });
    const especialidad = especialidadesBanco().some(s => s.id === q.get('especialidad')) ? q.get('especialidad') : '';
    const tipo = Object.prototype.hasOwnProperty.call(BANCO_TIPOS, q.get('tipo')) ? q.get('tipo') : 'taller';
    const descripcion = String(q.get('descripcion') || '').trim().slice(0, 300);
    if (!sinPrecio(res, descripcion)) return;

    const fotos = loadJSON('banco.json', []);
    const ocupadas = fotos.filter(f => f && f.plantelId === plantel.id && f.estado !== 'rechazada').length;
    if (ocupadas >= BANCO_CUOTA) {
      return sendJSON(res, 400, { error: 'El ' + plantel.nombre + ' ya tiene ' + BANCO_CUOTA + ' fotos. Quita una antes de subir otra.' });
    }

    /* El nombre del archivo sale del id generado por el servidor, nunca del
       archivo que llegó: un nombre con `..`, acentos o espacios no puede
       salirse de la carpeta ni chocar con otra foto. */
    const id = crypto.randomUUID();
    if (!fs.existsSync(BANCO_DIR)) fs.mkdirSync(BANCO_DIR, { recursive: true });
    fs.writeFileSync(path.join(BANCO_DIR, id + dim.ext), img);

    const foto = {
      id, archivo: id + dim.ext, bytes: img.length, ancho: dim.ancho, alto: dim.alto,
      orientacion: dim.ancho >= dim.alto ? 'horizontal' : 'vertical',
      plantelId: plantel.id, plantel: plantel.nombre, especialidad, tipo, descripcion,
      tieneRostros: q.get('tieneRostros') === '1',
      estado: 'en-revision', aprobadaGaleria: false, aprobadaAnuncio: false,
      favorita: false, usadaEn: [], subidaEn: ahoraMX()
    };
    fotos.push(foto); saveJSON('banco.json', fotos);
    return sendJSON(res, 201, { success: true, foto, restantes: BANCO_CUOTA - ocupadas - 1 });
  }

  if (url.pathname === '/api/admin/banco' && method === 'PATCH') {
    if (!foroAuth(req, res)) return;
    let b; try { b = await parseBody(req); } catch (e) { return sendJSON(res, 400, { error: 'Datos inválidos' }); }
    const fotos = loadJSON('banco.json', []);
    const f = fotos.find(x => x && x.id === b.id);
    if (!f) return sendJSON(res, 404, { error: 'No encontrada' });

    /* Borrar sí borra el archivo. A diferencia del foro —donde el texto
       rechazado se conserva porque es una discusión y conviene saber qué se
       rechazó— una foto rechazada solo ocupa disco y un lugar de la cuota del
       plantel. El borrado es una acción aparte, no un subproducto de rechazar:
       quien quiera llevarse la foto primero la descarga. */
    if (b.accion === 'borrar') {
      try { fs.unlinkSync(rutaBanco(f)); } catch (e) { /* ya no existía */ }
      saveJSON('banco.json', fotos.filter(x => x.id !== f.id));
      return sendJSON(res, 200, { success: true, borrada: f.id });
    }

    if (b.accion === 'editar') {
      const plantel = plantelesBanco().find(p => p.id === b.plantelId);
      if (!plantel) return sendJSON(res, 400, { error: 'Elige el plantel de la foto' });
      const descripcion = String(b.descripcion || '').trim().slice(0, 300);
      if (!sinPrecio(res, descripcion)) return;
      f.plantelId = plantel.id; f.plantel = plantel.nombre;
      f.especialidad = especialidadesBanco().some(s => s.id === b.especialidad) ? b.especialidad : '';
      if (Object.prototype.hasOwnProperty.call(BANCO_TIPOS, b.tipo)) f.tipo = b.tipo;
      f.descripcion = descripcion;
      f.tieneRostros = b.tieneRostros === true;
      f.favorita = b.favorita === true;
    } else if (b.accion === 'rechazar') {
      f.estado = 'rechazada';
      f.aprobadaGaleria = false; f.aprobadaAnuncio = false;
    } else if (b.accion === 'galeria' || b.accion === 'anuncio') {
      /* Aprobaciones por DESTINO, y por separado: una foto puede estar en la
         galería del plantel y no servir para un anuncio (iluminación, encuadre,
         fondo con gente), y al revés también. Por eso no hay un solo "aprobar".
         Algunas quedan en la cola hasta que alguien marca un destino. */
      if (b.accion === 'anuncio' && f.tieneRostros) return sendJSON(res, 400, { error: MSG_ROSTRO_ANUNCIO });
      if (b.accion === 'galeria') f.aprobadaGaleria = true;
      else f.aprobadaAnuncio = true;
      f.estado = 'aprobada';
    } else if (b.accion === 'quitar') {
      if (b.campo === 'galeria' || b.campo === 'ambos') f.aprobadaGaleria = false;
      if (b.campo === 'anuncio' || b.campo === 'ambos') f.aprobadaAnuncio = false;
      if (!f.aprobadaGaleria && !f.aprobadaAnuncio) f.estado = 'en-revision';
    } else {
      return sendJSON(res, 400, { error: 'Acción inválida' });
    }

    /* Un rostro no va en anuncios, y esto se aplica aunque lo hayan aprobado
       antes: la marca de rostro puede cambiar después de aprobar y el destino
       tiene que seguirla. Una sola comprobación al final cubre el caso de quien
       marca "con rostro" sobre una foto ya aprobada para anuncios. */
    if (f.tieneRostros) f.aprobadaAnuncio = false;

    saveJSON('banco.json', fotos);
    return sendJSON(res, 200, { success: true, foto: f });
  }

  return sendJSON(res, 404, { error: 'No encontrado' });
}

/* ---------- páginas / URLs amigables ---------- */
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'text/xml', '.txt': 'text/plain' };

/* Directorios que el navegador puede leer y archivos sueltos de la raíz.
   ⚠️ Sin esta lista, `resolvePage` devolvía tal cual CUALQUIER archivo con
   extensión que existiera en disco: `/server.js` servía todo el backend del
   sitio y `/scripts/Code.gs` la llave que borra filas de la hoja de Google.
   Las `.html` se sirven en cualquier ruta porque son el contenido del sitio;
   el resto solo desde estas carpetas. Lo que no entre responde 404 y no 403:
   contestar 403 confirmaría que el archivo existe. */
const CARPETAS_PUBLICAS = ['/js/', '/css/', '/img/', '/admin/', '/alumnos/',
  '/especialidades/', '/planteles/', '/blog/', '/campanas/', '/data/'];
const ARCHIVOS_RAIZ = ['/robots.txt', '/sitemap.xml', '/favicon.ico'];
/* Plantillas que el servidor rellena a mano y que NO son páginas por sí solas.
   ⚠️ `foro.html` no está en la lista: `/foro` las intercepta antes y la rama
   `/foro/<slug>` pinta `foro-hilo.html`… pero esa rama solo cubre rutas que
   empiezan por `foro/`, así que `/foro-hilo` caía al `fs.readFile` de abajo y
   servía la plantilla con los marcadores `<!--HILO_*-->` crudos: una URL
   pública con texto de trabajo, indexable y con canonical a sí misma. */
const PLANTILLAS = ['/foro-hilo.html'];
function servible(page) {
  if (PLANTILLAS.indexOf(page) !== -1) return false;
  /* `data/` solo expone los .js que el sitio carga (app-config, campuses…).
     Los .json de ahí son los datos de prospectos, usuarios y sesiones: se
     comprueba aquí y no en el guard de DATA_DIR, para que la protección no
     dependa de que esa variable apunte a su sitio. */
  if (page.startsWith('/data/')) return page.endsWith('.js');
  if (CARPETAS_PUBLICAS.some(c => page.startsWith(c))) return true;
  if (page.endsWith('.html')) return true;
  return ARCHIVOS_RAIZ.indexOf(page) !== -1;
}

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

/* Versión limpia (sin `.html`) de una ruta, o `null` si no aplica.
   Compartida por los dos 301 (`.html` y `www.`) para que una URL con ambas
   particularidades no encadene dos saltos: sale directo a la limpia y en el
   host definitivo. */
function rutaLimpia(soloPath) {
  if (!soloPath.toLowerCase().endsWith('.html')) return null;
  const limpio = soloPath.slice(0, -5); // quita ".html"
  const destinoBase = (limpio === '' || limpio === '/index') ? '/' : limpio;
  if (destinoBase === soloPath || !resolvePage(destinoBase)) return null;
  return destinoBase;
}

/* Escapa para meter texto de usuarios dentro del HTML del foro. Sin esto, quien
   publicara `<script>` lo ejecutaría en el navegador de todos los que lean el
   hilo — y ya no sería un foro, sería un vector de ataque. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/* El JSON-LD va DENTRO de un <script>, donde escapar `<` como `&lt;` no sirve:
   el navegador no decodifica entidades ahí, así que el JSON quedaría con texto
   raro y Google no podría leer el hilo. Lo que hay que escapar allí es JSON. */
function escJSON(s) {
  return JSON.stringify(String(s == null ? '' : s)).slice(1, -1);
}

/* ---------- foro: helpers compartidos por la lista y por cada hilo ---------- */
/* Un hilo cuenta como publicado si `estado` lo dice, si trae `published: true`
   (el formato más antiguo) o si no trae ninguno de los dos — el hilo de
   bienvenida de posts.json, del 10 de septiembre. No puede desaparecer del
   foro solo por no traer el campo nuevo. ⚠️ Implicación: un posts.json sin
   `estado` se publica solo. */
function hiloPublicado(p) {
  return !!p && (p.estado === 'publicado' || p.estado === undefined || p.published === true);
}
function hilosPublicados() {
  let d = [];
  try { const x = loadJSON('posts.json', []); if (Array.isArray(x)) d = x; } catch (e) { d = []; }
  return d.filter(hiloPublicado).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
const MESES_FORO = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function fechaLargaForo(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.getDate() + ' de ' + MESES_FORO[d.getMonth()] + ' de ' + d.getFullYear();
}
/* Firma PÚBLICA: iniciales + plantel para TODOS, sin importar el rol.
   ⚠️ Antes el personal (profesor/encargado/asesor/directivo/admin) firmaba con
   NOMBRE COMPLETO. Desde oct-2026 el foro solo lo escriben encargados y la
   coordinación, así que cada hilo publicado habría llevado el nombre de una
   persona real en una página que Google indexa — algo que nadie pidió. El
   nombre completo NO se pierde: sigue en la cola de moderación (solo tú), que
   es donde hace falta saber quién escribió. Mismo dato, dos audiencias.
   🔢 Son 3 iniciales (nombre + dos apellidos), decisión del usuario
   24/10/2026: su firma de coordinación debe salir "V.R.A". Con 2 salía "V.R."
   y a un alumno con nombre completo se le comía el segundo apellido.
   Un nombre con menos palabras da menos iniciales y un título ("Prof.") cuenta
   como palabra: es el mismo criterio de siempre, no hay caso especial. */
function firmaForo(p) {
  const partes = String(p.author || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return p.plantel || 'Grupo Holandés';
  const ini = partes.slice(0, 3).map(x => x[0].toUpperCase()).join('.') + '.';
  return ini + (p.plantel ? ' · ' + p.plantel : '');
}
/* Las categorías se escriben en español; el dato crudo (slug) no le sirve a
   nadie que esté leyendo el foro. */
const CATEGORIAS_FORO = {
  general: 'General', mecanica: 'Mecánica automotriz', motos: 'Motos',
  diesel: 'Diésel', electronica: 'Electrónica automotriz',
  taller: 'Taller y práctica', admision: 'Admisión e inscripción'
};
function categoriaForo(c) { return CATEGORIAS_FORO[String(c || '').toLowerCase()] || CATEGORIAS_FORO.general; }
function plantillaForo(archivo) {
  try { return fs.readFileSync(path.join(ROOT, archivo), 'utf8'); } catch (e) { return ''; }
}
function respondHTML(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(html);
}
function noEncontrada(res) {
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('<h1>404 — Página no encontrada</h1><p><a href="/">Volver al inicio</a></p>');
}

/* `/foro` se pinta AQUÍ, no en un build: los hilos cambian cada vez que se
   aprueba uno desde el panel, y un HTML generado al arrancar seguiría mostrando
   la lista vieja hasta reiniciar el servidor. Mismo criterio que el resto del
   sitio (el contenido sale del disco en cada petición). */
function paginaForo() {
  const posts = hilosPublicados();
  const plantilla = plantillaForo('foro.html');
  if (!plantilla) return null;

  const tarjetas = posts.map(p => {
    const respuestas = Array.isArray(p.replies) ? p.replies.length : 0;
    const rel = encodeURIComponent(String(p.slug || p.id));
    return `  <article class="blog-card foro-hilo">
    <span class="blog-cat">${esc(categoriaForo(p.category))}</span>
    <h3><a href="/foro/${rel}">${esc(p.title)}</a></h3>
    <p class="foro-excerpt">${esc(String(p.content || '').replace(/\s+/g, ' ').slice(0, 190))}${String(p.content || '').replace(/\s+/g, ' ').length > 190 ? '…' : ''}</p>
    <p class="foro-meta"><span>${esc(firmaForo(p))}</span> · <time datetime="${esc(p.createdAt || '')}">${esc(fechaLargaForo(p.createdAt))}</time> · ${respuestas} ${respuestas === 1 ? 'respuesta' : 'respuestas'}</p>
    <p><a href="/foro/${rel}">Leer el hilo →</a></p>
  </article>`;
  }).join('\n');

  const lista = posts.length
    ? `<div class="blog-grid foro-grid">\n${tarjetas}\n  </div>`
    : '  <div class="foro-vacio"><p><strong>Todavía no hay hilos publicados.</strong></p><p>Los encargados de cada plantel abren los primeros hilos. Cualquiera puede leerlos sin cuenta.</p></div>';

  return plantilla.split('<!--FORO_LISTA-->').join(lista);
}

/* `/foro/<slug>` — el hilo con sus respuestas. Mismo tratamiento que la lista:
   se pinta en cada petición y solo se publica lo aprobado. Aquí también se
   conserva la firma con iniciales de los alumnos: la página es pública, y lo
   que protege al alumno es no exponer su nombre entero en Internet. */
/* El contenido del foro nace en un <textarea>: texto plano con saltos de línea
   reales. `esc()` SOLO escapa (`<`, `>`, `"` y `'`); no toca los `\n`, y el
   navegador los colapsa en espacios → un hilo con encabezados y lista de
   reglas salía como UN párrafo corrido, sin importar cuántos saltos traía.
   Ahora: se parte por líneas en BLANCO en párrafos (la CSS de `.foro-cuerpo`
   y `.foro-respuesta` ya estaba escrita para `<p>`, que no existían) y los
   saltos simples dentro de un párrafo quedan `<br>`.
   ⚠️ Se escapa ANTES de meter `<br>`: al revés se inyectaría HTML crudo.
   🔒 No cambia quién ve qué: es solo maquetación del texto ya autorizado. */
function contenidoForoHTML(txt) {
  const t = String(txt || '').replace(/\r\n?/g, '\n');
  const parrafos = t.split(/\n{2,}/).map(s => esc(s).replace(/\n/g, '<br>')).filter(s => s.trim());
  return parrafos.length ? '<p>' + parrafos.join('</p><p>') + '</p>' : '';
}

function paginaHilo(slug) {
  const posts = hilosPublicados();
  const p = posts.find(x => String(x.slug || x.id) === slug);
  if (!p) return null;
  const plantilla = plantillaForo('foro-hilo.html');
  if (!plantilla) return null;

  const rel = encodeURIComponent(String(p.slug || p.id));
  const respuestas = Array.isArray(p.replies) ? p.replies : [];
  /* Solo las respuestas aprobadas: una respuesta en revisión no puede salir a
     la vista pública aunque su hilo sí esté publicado. */
  const visibles = respuestas.filter(r => r && (r.estado === undefined || r.estado === 'publicado'));

  const cajas = visibles.map(r => `  <article class="foro-respuesta">
    <p class="foro-meta"><strong>${esc(firmaForo(r))}</strong> · <time datetime="${esc(r.createdAt || '')}">${esc(fechaLargaForo(r.createdAt))}</time></p>
    ${contenidoForoHTML(r.content)}
  </article>`).join('\n');

  const bloque = visibles.length
    ? `<section class="foro-respuestas"><h2>${visibles.length} ${visibles.length === 1 ? 'respuesta' : 'respuestas'}</h2>\n${cajas}\n  </section>`
    : '  <section class="foro-respuestas foro-vacio"><p><strong>Todavía no hay respuestas.</strong></p></section>';

  const datos = plantilla
    .split('<!--HILO_TITULO-->').join(esc(p.title))
    .split('<!--HILO_CATEGORIA-->').join(esc(categoriaForo(p.category)))
    .split('<!--HILO_AUTOR-->').join(esc(firmaForo(p)))
    .split('<!--HILO_FECHA-->').join(esc(fechaLargaForo(p.createdAt)))
    .split('<!--HILO_FECHA_ISO-->').join(esc(p.createdAt || ''))
    .split('<!--HILO_CONTENIDO-->').join(contenidoForoHTML(p.content))
    .split('<!--HILO_RESPUESTAS-->').join(bloque)
    .split('<!--HILO_CANONICAL-->').join('https://grupoholandes.com/foro/' + rel)
    .split('<!--HILO_REL-->').join(rel)
    /* Las que van dentro del JSON-LD: escapado de JSON, no de HTML. */
    .split('<!--HILO_TITULO_JSON-->').join(escJSON(p.title))
    .split('<!--HILO_AUTOR_JSON-->').join(escJSON(firmaForo(p)))
    .split('<!--HILO_CATEGORIA_JSON-->').join(escJSON(categoriaForo(p.category)));
  return datos;
}

/* `/sitemap.xml` es un archivo ESTÁTICO del repo: lo genera `build-sitemap.js`
   escaneando los `.html` del disco. Ese script corre en el REPO, así que nunca
   puede saber qué hilos existen — `data/posts.json` vive en el hosting y cambia
   cada vez que se aprueba algo desde /admin/foro. Por eso los hilos del foro NO
   salían en ningún sitemap: Google solo los encontraba por los enlaces de /foro.
   Aquí se les pega una entrada por hilo publicado, justo antes de `</urlset>`.
   ⚠️ Si el archivo no se puede leer, o trae algo inesperado, se devuelve tal
   cual: degradar al sitemap estático es mejor que enseñar un XML roto a Google.
   ⚠️ NO se agrega nada que no esté publicado: un hilo en revisión no puede
   salir en el sitemap ni de reojo, igual que en la lista pública. */
function sitemapConHilos() {
  let base;
  try { base = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8'); } catch (e) { return null; }
  if (base.indexOf('</urlset>') === -1) return base;
  const entradas = [];
  for (const p of hilosPublicados()) {
    const slug = encodeURIComponent(String(p.slug || p.id));
    if (!slug || base.indexOf('/foro/' + slug) !== -1) continue; /* ya viene en el archivo */
    const fecha = String(p.createdAt || '').slice(0, 10);
    /* `createdAt` sale de `ahoraMX()` (ISO con -06:00): los primeros 10
       caracteres ya son la fecha local. Si no es una fecha válida se omite
       <lastmod> en vez de inventar una. */
    const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `    <lastmod>${fecha}</lastmod>\n` : '';
    entradas.push(`  <url>\n    <loc>https://grupoholandes.com/foro/${slug}</loc>\n${lastmod}    <priority>0.6</priority>\n  </url>`);
  }
  if (!entradas.length) return base;
  return base.replace('</urlset>', entradas.join('\n') + '\n</urlset>');
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleAPI(req, res).catch(() => { try { sendJSON(res, 500, { error: 'Error interno' }); } catch (e) { /* noop */ } });
    return;
  }
  /* 301 de `.html` a la URL limpia.
     Las 18 URLs `.html` seguían respondiendo 200 con el mismo HTML y el mismo
     canonical que la limpia: Search Console las listaba como "página
     alternativa con etiqueta canónica adecuada". El canonical ya estaba bien,
     pero así Google consolida el señalamiento en una sola URL y las que
     circulen por ahí (compartidas, viejas, del navegador) no pierden su
     autoridad. Si la versión limpia no existe, se sirve el archivo tal cual. */
  const soloPath = req.url.split('?')[0];
  const q = req.url.indexOf('?');
  const query = q === -1 ? '' : req.url.slice(q);
  const limpia = rutaLimpia(soloPath);

  /* 301 de `www.` al dominio raíz.
     El `CNAME www` apunta al CDN de Hostinger, que sirve el sitio completo en
     ambos hosts SIN redirigir. Los canonicals ya consolidan `www` → apex para
     Google, así que el SEO no corría riesgo; pero la medición (píxel de Meta y
     GA4) usa el `location` del visitante, y los eventos quedaban repartidos
     entre `www.grupoholandes.com` y `grupoholandes.com` — Events Manager los
     listaba como dos dominios distintos.
     La condición es deliberadamente estrecha: solo el host que empieza con
     `www.`. `/api/` ya quedó fuera arriba (un 301 sobre un POST lo convertiría
     en GET) y, si el CDN no reenvía el Host original, el redirect simplemente
     no se dispara: no puede entrar en bucle ni romper nada.
     Si la ruta además trae `.html`, ya va limpia en este mismo salto. */
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  if (host.startsWith('www.')) {
    res.writeHead(301, { Location: 'https://grupoholandes.com' + (limpia || soloPath) + query, 'Cache-Control': 'no-cache' });
    res.end();
    return;
  }

  if (limpia) {
    res.writeHead(301, { Location: limpia + query, 'Cache-Control': 'no-cache' });
    res.end();
    return;
  }

  /* El foro se pinta aquí (ver `paginaForo` y `paginaHilo`) para que un hilo o
     una respuesta aprobada aparezcan sin reiniciar. Si algo falla, se sirve el
     HTML tal cual está en disco.
     ⚠️ Va ANTES de `resolvePage`: `/foro/<slug>` no tiene archivo y sin
     extensión `resolvePage` devuelve `null` → 404, y el hilo nunca se servía.
     (`/foro` sí pasaba porque `foro.html` existe en disco.) */
  const relLimpia = (limpia || soloPath).replace(/^\/+/, '');
  if (process.env.FORO_TRACE) console.error('[trace] soloPath=', soloPath, 'limpia=', limpia, 'relLimpia=', relLimpia);
  if (relLimpia === 'foro') {
    let html = null;
    try { html = paginaForo(); } catch (e) { console.error('/foro: ' + (e && e.stack || e)); html = null; }
    if (html) return respondHTML(res, html);
  }
  if (relLimpia.startsWith('foro/')) {
    let html = null;
    /* Único segmento tras `/foro/`: con dos, o con caracteres raros, no hay
       hilo que valga y se cae al 404 de abajo. */
    const partes = relLimpia.split('/');
    if (partes.length === 2 && partes[1]) {
      try { html = paginaHilo(decodeURIComponent(partes[1])); } catch (e) { console.error('/foro/<slug>: ' + (e && e.stack || e)); html = null; }
    }
    if (html) return respondHTML(res, html);
  }

  /* Sitemap con los hilos del foro (ver `sitemapConHilos`). Va ANTES de
     `resolvePage`, que lo serviría tal cual está en disco, sin los hilos. */
  if (relLimpia === 'sitemap.xml') {
    let xml = null;
    try { xml = sitemapConHilos(); } catch (e) { console.error('/sitemap.xml: ' + (e && e.stack || e)); xml = null; }
    if (xml) {
      /* `no-cache` y no los 300 s del archivo estático: el sitemap es chico y
         se pide poco, y lo que importa es que un hilo recién aprobado salga
         en la primera lectura, no 5 minutos después. */
      res.writeHead(200, { 'Content-Type': mime['.xml'], 'Cache-Control': 'no-cache' });
      res.end(xml);
      return;
    }
    /* Sin XML: se cae al archivo estático de abajo. */
  }

  const page = resolvePage(req.url);
  if (!page) { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('<h1>404 — Página no encontrada</h1><p><a href="/">Volver al inicio</a></p>'); return; }
  if (!servible(page)) { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('<h1>404 — Página no encontrada</h1><p><a href="/">Volver al inicio</a></p>'); return; }
  const filePath = path.normalize(path.join(ROOT, page));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (filePath.startsWith(DATA_DIR) && path.extname(filePath) !== '.js') { res.writeHead(403); res.end('Forbidden'); return; }
  const comprimir = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt']);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(filePath);
    const cache = ext === '.html' ? 'no-cache'
      : ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp'].indexOf(ext) !== -1 ? 'public, max-age=604800'
      : 'public, max-age=300';
    const headers = { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': cache };
    let body = data;
    const acceptGzip = /gzip/i.test(String(req.headers['accept-encoding'] || ''));
    if (comprimir.has(ext) && acceptGzip && data.length >= 1024) {
      try {
        const z = zlib.gzipSync(data, { level: 6 });
        if (z.length < data.length) { body = z; headers['Content-Encoding'] = 'gzip'; headers['Vary'] = 'Accept-Encoding'; }
      } catch (e) { pass }
    }
    res.writeHead(200, headers);
    res.end(body);
  });
});

seedIfEmpty();
server.listen(PORT, () => {
  console.log(`Grupo Holandés web en http://localhost:${PORT}`);
  console.log('Define GH_ADMIN_KEY para el panel /admin (actual: valor por defecto).');
});
