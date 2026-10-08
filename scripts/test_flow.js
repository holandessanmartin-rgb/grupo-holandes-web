#!/usr/bin/env node
/* Flujo de prueba para encargados de plantel.
   Por cada plantel activo crea 10 prospectos con formulario completo
   (prefijo "Test") y deja 5 de ellos con cita agendada. La especialidad
   se elige al azar entre las que ofrece cada plantel.

   Doble escritura, igual que el formulario real:
     1) POST {BASE}/api/leads y /api/citas  -> dashboard y estadísticas
     2) POST a la Google Sheet              -> /admin/prospectos lee la hoja

   Uso:
     node scripts/test_flow.js --dry-run          # solo imprime el plan
     node scripts/test_flow.js                    # crea todo (prod por defecto)
     node scripts/test_flow.js --force            # añade aunque ya haya filas Test
   Env:
     BASE          (default https://grupoholandes.com)
     GH_ADMIN_KEY  opcional; si existe verifica panel/dashboard al final */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { CAMPUSES } = require(path.join(ROOT, 'data', 'campuses.js'));
const { SPECIALTIES } = require(path.join(ROOT, 'data', 'specialties.js'));
const SHEETS_URL = (() => {
  try { return require(path.join(ROOT, 'data', 'app-config.js')).APP_CONFIG.sheetsWebhookUrl || ''; }
  catch (e) { return ''; }
})();

const BASE = process.env.BASE || 'https://grupoholandes.com';
const ADMIN_KEY = process.env.GH_ADMIN_KEY || '';
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const DELAY_MS = 250;
const LEADS_POR_PLANTEL = 10;
const CITAS_POR_PLANTEL = 5;
const PREFIJO = 'Test';

const NOMBRES = ['Mariana', 'Carlos', 'Fernanda', 'Jorge', 'Andrea', 'Luis', 'Paola', 'Diego', 'Sofia', 'Emiliano', 'Valeria', 'Ricardo', 'Ximena', 'Alejandro', 'Regina'];
const APELLIDOS = ['López', 'Hernández', 'García', 'Sánchez', 'Ramírez', 'Cruz', 'Torres', 'Vargas', 'Mendoza', 'Aguilar'];
const HORARIOS = ['Matutino (7–11 AM)', 'Vespertino (3–7 PM)', 'Nocturno (5–9 PM)', 'Sabatino (8 AM–3 PM)', 'Dominical (8 AM–3 PM)'];
const ORIGENES = ['Facebook', 'Instagram', 'TikTok', 'Google', 'WhatsApp', 'Código QR', 'Recomendación', 'Pasé por el plantel', 'Otro'];
const TIPOS_CITA = ['visita', 'clase-muestra', 'asesoria', 'info-cursos'];
const HORAS_CITA = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
// Fechas del registro para que el módulo Seguimiento tenga filas de práctica:
// 4 de cada 5 sin cita superan 2 días (tabla "sin cita") y 4 de cada 5 con
// cita superan 7 días (tabla "sin inscripción").
const DIAS_SIN_CITA = [0, 2, 4, 6, 8];
const DIAS_CON_CITA = [1, 7, 8, 9, 10];
const COMENTARIO = 'Registro de prueba — flujo de capacitación de encargados.';

const pick = a => a[Math.floor(Math.random() * a.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function proximaFechaCita() {
  const d = new Date();
  d.setDate(d.getDate() + randInt(1, 14));
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}
function consent(edad) {
  return { privacyVersion: 'v1', consentPrincipal: true, consentMarketing: true, consentAnalytics: true, ubicacionPref: false, formOrigin: '/registro' };
}

function buildPlan() {
  const planteles = CAMPUSES.filter(c => c.activo !== false);
  const plan = [];
  let telN = 1;
  for (const c of planteles) {
    const espIds = (c.especialidades || []).filter(id => SPECIALTIES.some(s => s.id === id && s.activo !== false));
    if (!espIds.length) { console.error('  ⚠ sin especialidades: ' + c.id); continue; }
    const items = [];
    for (let i = 1; i <= LEADS_POR_PLANTEL; i++) {
      const espId = pick(espIds);
      const esp = SPECIALTIES.find(s => s.id === espId);
      const edad = randInt(16, 38);
      items.push({
        num: i,
        nombre: `${PREFIJO} ${pick(NOMBRES)} ${pick(APELLIDOS)} ${String(i).padStart(2, '0')}`,
        telefono: '951000' + String(telN++).padStart(4, '0'),
        espId, espNombre: esp.nombre, edad,
        horario: pick(HORARIOS), origen: pick(ORIGENES),
        conCita: false
      });
    }
    const idx = items.map((_, k) => k);
    for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; }
    const conCitaIdx = idx.slice(0, CITAS_POR_PLANTEL);
    const sinCitaIdx = idx.slice(CITAS_POR_PLANTEL);
    conCitaIdx.forEach(k => { items[k].conCita = true; });
    const diasCita = DIAS_CON_CITA.slice(), diasSin = DIAS_SIN_CITA.slice();
    for (let k = diasCita.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [diasCita[k], diasCita[j]] = [diasCita[j], diasCita[k]]; }
    for (let k = diasSin.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [diasSin[k], diasSin[j]] = [diasSin[j], diasSin[k]]; }
    conCitaIdx.forEach((k, i) => { items[k].diasAtras = diasCita[i]; });
    sinCitaIdx.forEach((k, i) => { items[k].diasAtras = diasSin[i]; });
    plan.push({ plantel: c, items });
  }
  return plan;
}

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
  return d;
}

async function postSheet(obj) {
  const body = JSON.stringify(obj);
  let ultimo;
  for (let intento = 0; intento < 2; intento++) {
    try {
      const r = await fetch(SHEETS_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body, signal: AbortSignal.timeout(20000)
      });
      const d = await r.json().catch(() => ({}));
      if (d && d.ok) return true;
      throw new Error(JSON.stringify(d));
    } catch (e) {
      ultimo = e;
      if (intento === 0) await sleep(1200);
    }
  }
  throw ultimo;
}

async function getJSON(url, opts) {
  const r = await fetch(url, Object.assign({ signal: AbortSignal.timeout(25000) }, opts || {}));
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function main() {
  if (!SHEETS_URL) { console.error('Falta sheetsWebhookUrl en data/app-config.js'); process.exit(1); }
  const plan = buildPlan();
  const totalLeads = plan.reduce((a, g) => a + g.items.length, 0);
  const totalCitas = plan.reduce((a, g) => a + g.items.filter(i => i.conCita).length, 0);
  console.log(`Plan: ${plan.length} planteles -> ${totalLeads} prospectos (${PREFIJO}...), ${totalCitas} con cita`);
  console.log(`BASE=${BASE}  hoja=${SHEETS_URL.slice(0, 60)}...`);

  if (DRY) {
    for (const g of plan.slice(0, 3)) {
      for (const it of g.items.slice(0, 4)) {
        console.log(`  ${it.nombre} | ${it.telefono} | ${g.plantel.nombre} | ${it.espNombre} | ${it.edad} años | ${it.horario} | hace ${it.diasAtras}d | ${it.conCita ? 'CITA ' + pick(TIPOS_CITA) : 'sin cita'}`);
      }
    }
    console.log(`  ... (${totalLeads - 12} más)`);
    return;
  }

  const prev = await getJSON(SHEETS_URL + '?action=prospectos').catch(() => null);
  const testPrevios = prev ? (prev.prospectos || []).filter(p => /^\s*test\b/i.test(p.nombre || '')).length : 0;
  if (testPrevios > 0 && !FORCE) {
    console.error(`La hoja ya tiene ${testPrevios} filas Test. Usa --force si quieres añadir más.`);
    process.exit(1);
  }

  const t0 = Date.now();
  const fallas = [];
  let okLeads = 0, okCitas = 0, okFilas = 0;
  const iso = () => new Date().toISOString();

  for (const g of plan) {
    for (const it of g.items) {
      const consentRec = consent(it.edad);
      const leadBody = {
        nombre: it.nombre, telefono: it.telefono,
        especialidad: it.espNombre, especialidades: [it.espId],
        plantel: g.plantel.nombre, plantelId: g.plantel.id,
        edad: it.edad, horarioPreferido: it.horario, comoConociste: it.origen,
        comentarios: COMENTARIO, origen: 'web', origenPage: '/registro',
        campana: { source: 'test', medium: 'interno', campaign: 'pruebas', content: '' },
        canalPreferido: 'whatsapp', marketing: true,
        tutorAutorizado: it.edad < 18 ? true : null,
        consent: consentRec, dispositivo: 'test-flujo'
      };
      let leadId = null, cupon = '';
      try {
        const d = await postJSON(BASE + '/api/leads', leadBody);
        leadId = d.id; cupon = d.cupon || '';
        if (d.duplicate) fallas.push('lead duplicado (24h): ' + it.telefono);
        else okLeads++;
      } catch (e) { fallas.push(`lead API ${it.telefono}: ${e.message}`); }

      const fechaReg = new Date(); fechaReg.setDate(fechaReg.getDate() - it.diasAtras);
      try {
        await postSheet({
          form: 'registro',
          nombre: it.nombre, telefono: it.telefono, edad: it.edad,
          especialidad: it.espNombre, especialidades: [it.espId].join(', '),
          plantel: g.plantel.nombre, plantelId: g.plantel.id,
          horarioPreferido: it.horario, comoConociste: it.origen,
          comentarios: COMENTARIO, origen: 'web', origenPage: '/registro',
          campana: { source: 'test', medium: 'interno', campaign: 'pruebas', content: '' },
          canalPreferido: 'whatsapp', marketing: true,
          cupon, via: 'test',
          privacy_version: 'v1', consent_marketing: true, consent_analytics: true,
          ubicacion_pref: false, tutor_autorizado: it.edad < 18 ? true : '',
          fecha: fechaReg.toISOString()
        });
        okFilas++;
        await sleep(DELAY_MS);
      } catch (e) { fallas.push(`hoja registro ${it.telefono}: ${e.message}`); }

      if (it.conCita) {
        const citaBody = {
          prospectoId: leadId, nombre: it.nombre, telefono: it.telefono, edad: it.edad,
          tipo: pick(TIPOS_CITA), especialidadId: it.espId, campusId: g.plantel.id,
          fecha: ymd(proximaFechaCita()), horario: pick(HORAS_CITA),
          comentarios: COMENTARIO, marketing: true,
          tutorAutorizado: it.edad < 18 ? true : null, consent: consentRec
        };
        try {
          await postJSON(BASE + '/api/citas', citaBody);
          okCitas++;
        } catch (e) { fallas.push(`cita API ${it.telefono}: ${e.message}`); }
        try {
          await postSheet({
            form: 'citas',
            nombre: it.nombre, telefono: it.telefono, edad: it.edad,
            especialidad: it.espNombre, especialidades: [it.espId].join(', '),
            plantel: g.plantel.nombre, plantelId: g.plantel.id,
            cupon, via: 'test', tipo: citaBody.tipo,
            fechaCita: citaBody.fecha, horarioCita: citaBody.horario,
            comentarios: COMENTARIO, marketing: true,
            privacy_version: 'v1', consent_marketing: true, consent_analytics: true,
            ubicacion_pref: false, tutor_autorizado: it.edad < 18 ? true : '',
            fecha: iso()
          });
          await sleep(DELAY_MS);
        } catch (e) { fallas.push(`hoja cita ${it.telefono}: ${e.message}`); }
      }
    }
    const seg = Math.round((Date.now() - t0) / 1000);
    console.log(`✓ ${g.plantel.id.padEnd(24)} 10 leads (${g.items.filter(i => i.conCita).length} con cita)  [${seg}s]`);
  }

  console.log(`\nCreados: ${okLeads}/${totalLeads} leads | ${okCitas}/${totalCitas} citas | ${okFilas}/${totalLeads} filas hoja`);
  if (fallas.length) { console.log('Fallas:'); fallas.forEach(f => console.log('  ✗ ' + f)); }

  console.log('\n== Verificación ==');
  try {
    const pj = await getJSON(SHEETS_URL + '?action=prospectos');
    const rows = (pj.prospectos || []).filter(p => /^\s*test\b/i.test(p.nombre || ''));
    const conCita = rows.filter(p => p.estado === 'cita-agendada').length;
    console.log(`Hoja Prospectos: ${rows.length} filas Test (esperado ${totalLeads}) | cita-agendada: ${conCita} (esperado ${totalCitas})`);
  } catch (e) { console.log('Hoja prospectos: ERROR ' + e.message); }
  try {
    const st = await getJSON(SHEETS_URL + '?action=stats');
    console.log(`Hoja stats: prospectos=${st.stats.total}, citas=${st.stats.citas.total}, inscripciones=${st.stats.inscripciones.total}`);
  } catch (e) { console.log('Hoja stats: ERROR ' + e.message); }
  if (ADMIN_KEY) {
    const h = { 'x-admin-key': ADMIN_KEY };
    try {
      const pr = await getJSON(BASE + '/api/prospectos', { headers: h });
      const rows = (pr.prospectos || []).filter(p => /^\s*test\b/i.test(p.nombre || ''));
      console.log(`Panel /api/prospectos: ${rows.length} Test (fuente: ${pr.fuente})`);
    } catch (e) { console.log('Panel: ERROR ' + e.message); }
    try {
      const s = await getJSON(BASE + '/api/admin/stats', { headers: h });
      console.log(`Dashboard local: total=${s.total}, cita-agendada=${(s.porEstado || {})['cita-agendada'] || 0}, citasProximas=${s.citasProximas}`);
    } catch (e) { console.log('Dashboard: ERROR ' + e.message); }
  } else { console.log('(sin GH_ADMIN_KEY: se omite la verificación del panel/dashboard)'); }

  process.exit(fallas.length ? 1 : 0);
}

main().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
