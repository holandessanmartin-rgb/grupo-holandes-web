/* ============================================================
   Grupo Holandés → Google Sheets
   1. Crea una hoja de cálculo en Drive (p. ej. "Prospectos GH").
   2. Extensiones → Apps Script, pega este código y guarda.
   3. Implementar → Nueva implementación → App web:
      - Ejecutar como: Yo
      - Acceso: Cualquier usuario (incluso anónimo)
   4. Copia la URL https://script.google.com/.../exec
   5. Pégala en data/app-config.js → sheetsWebhookUrl.
   Cada formulario (registro/citas) agregará una fila automáticamente.
   ============================================================ */

var HOJAS = { registro: 'Prospectos', citas: 'Citas', inscripcion: 'Inscripciones', interaccion: 'Interacciones' };

var COLUMNAS = ['fecha', 'cupon', 'nombre', 'telefono', 'edad',
  'especialidad', 'especialidades', 'plantel', 'plantelId',
  'horarioPreferido', 'comoConociste', 'comentarios', 'origen',
  'origenPage', 'campana_source', 'campana_medium', 'campana_campaign',
  'canalPreferido', 'via', 'tipo', 'fechaCita', 'horarioCita',
  'evento', 'detalle'];

function hoja(nombre) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUMNAS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var nombreHoja = HOJAS[d.form] || 'Prospectos';
    var fila = COLUMNAS.map(function (c) {
      if (c.indexOf('campana_') === 0 && d.campana) {
        return d.campana[c.replace('campana_', '')] || '';
      }
      return d[c] !== undefined && d[c] !== null ? d[c] : '';
    });
    hoja(nombreHoja).appendRow(fila);
    return salida({ ok: true });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

function salida(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============ LECTURA PARA PANEL DIRECTIVO (/directivo) ============
   GET <URL>?action=stats[&key=...] -> agregados en vivo de la hoja.
   Opcional: define DIRECTIVO_KEY para exigir clave (debe coincidir con
   la que pidan en la página). Vacío = acceso con la URL (obscura). */
var DIRECTIVO_KEY = '';

/* Clave obligatoria para la limpieza de pruebas (?action=limpiar&key=...).
   Cámbiala por una propia en tu copia del script. */
var CLEAN_KEY = 'CAMBIAR-CLAVE-LIMPIEZA';

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (DIRECTIVO_KEY && p.key !== DIRECTIVO_KEY) {
    return salida({ ok: false, error: 'no autorizado' });
  }
  if (p.action === 'stats') {
    return salida({ ok: true, stats: buildStats(p.plantel || '') });
  }
  if (p.action === 'timeline') {
    return salida({ ok: true, eventos: timeline(p.telefono || '') });
  }
  if (p.action === 'limpiar') {
    return salida(limpiarPruebas(p.key || ''));
  }
  return salida({ ok: true, servicio: 'Prospectos GH' });
}

/* Lee la hoja Citas: por día, por tipo y visitas programadas vs realizadas.
   Una visita cuenta como realizada si su fecha ya pasó. */
function statsCitas(filtroPlantel) {
  var out = { total: 0, porDia: {}, porTipo: {}, programadas: 0, realizadas: 0 };
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Citas');
    if (!sh) return out;
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      var r = vals[i];
      if (!r[2] && !r[3]) continue;
      if (!matchPlantel(r[7], filtroPlantel)) continue;
      out.total++;
      var dia = String(r[0]).slice(0, 10);
      if (dia) out.porDia[dia] = (out.porDia[dia] || 0) + 1;
      var tp = r[19] || 'visita';
      out.porTipo[tp] = (out.porTipo[tp] || 0) + 1;
      var fc = r[20] ? new Date(r[20]) : null;
      if (fc && !isNaN(fc)) {
        if (fc < hoy) out.realizadas++;
        else out.programadas++;
      } else if (String(tp).toLowerCase().indexOf('visita') >= 0) {
        out.programadas++;
      }
    }
  } catch (err) { out.error = String(err); }
  return out;
}

/* Hoja opcional "Inscripciones" (fecha, nombre, plantel, especialidad, cupon).
   Se llena al inscribir (futuro CRM) o manualmente. */
function statsInscripciones(filtroPlantel) {
  var out = { total: 0, porDia: {} };
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inscripciones');
    if (!sh) return out;
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      var r = vals[i];
      if (!r[2] && !r[3]) continue; // nombre / teléfono (layout COLUMNAS)
      if (!matchPlantel(r[7], filtroPlantel)) continue; // plantel
      out.total++;
      var dia = String(r[0]).slice(0, 10);
      if (dia) out.porDia[dia] = (out.porDia[dia] || 0) + 1;
    }
  } catch (err) { out.error = String(err); }
  return out;
}

/* Borra filas de prueba: nombre que empieza con PRUEBA o filas vacías
   (sin nombre ni teléfono). Solo con la CLEAN_KEY correcta. */
function limpiarPruebas(key) {
  if (!CLEAN_KEY || CLEAN_KEY === 'CAMBIAR-CLAVE-LIMPIEZA' || key !== CLEAN_KEY) {
    return { ok: false, error: 'clave inválida o sin configurar (edita CLEAN_KEY en el script)' };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reporte = {};
  ['Prospectos', 'Citas', 'Inscripciones', 'Interacciones'].forEach(function (nombre) {
    var sh = ss.getSheetByName(nombre);
    if (!sh || sh.getLastRow() < 2) { reporte[nombre] = 0; return; }
    var vals = sh.getDataRange().getValues();
    var borrar = [];
    for (var i = 1; i < vals.length; i++) {
      var nom = String(vals[i][2] || '');
      var tel = String(vals[i][3] || '');
      if (/^\s*prueba\b/i.test(nom) || (!nom.trim() && !tel.trim())) {
        borrar.push(i + 1);
      }
    }
    for (var j = borrar.length - 1; j >= 0; j--) {
      sh.deleteRow(borrar[j]);
    }
    reporte[nombre] = borrar.length;
  });
  return { ok: true, eliminadas: reporte };
}

/* Solo dígitos finales (10) para comparar teléfonos con o sin +52. */
function normTel(v) {
  var d = String(v || '').replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
}

/* Bitácora: últimos 50 eventos de un teléfono (Prospectos→Citas→visitas→…). */
function timeline(telefono) {
  var out = [];
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Interacciones');
    if (!sh) return out;
    var vals = sh.getDataRange().getValues();
    var want = normTel(telefono);
    if (!want) return out;
    for (var i = vals.length - 1; i >= 1 && out.length < 50; i--) {
      if (normTel(vals[i][3]) === want) {
        out.push({ fecha: String(vals[i][0]).slice(0, 16).replace('T', ' '),
                   evento: vals[i][22], detalle: vals[i][23],
                   plantel: vals[i][7], cupon: vals[i][1] });
      }
    }
  } catch (err) { /* noop */ }
  return out;
}

function statsInteracciones(filtroPlantel) {
  var out = { total: 0, porEvento: {} };
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Interacciones');
    if (!sh) return out;
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      if (!matchPlantel(vals[i][7], filtroPlantel) && filtroPlantel) continue;
      var ev = vals[i][22] || 'otro';
      out.porEvento[ev] = (out.porEvento[ev] || 0) + 1;
      out.total++;
    }
  } catch (err) { /* noop */ }
  return out;
}

/* Normaliza cualquier variante a las 4 especialidades oficiales + Cursos.
   Tolera acentos rotos (datos de prueba), "Curso: ..." y "Todas". */
function canonEspecialidad(v) {
  var t = String(v || '').toLowerCase().replace(/[?¿]/g, '');
  if (t.indexOf('moto') >= 0) return 'Mecánica de Motocicletas';
  if (t.indexOf('isel') >= 0 || t.indexOf('diesel') >= 0) return 'Mecánica Diésel';
  if (t.indexOf('electr') >= 0) return 'Electrónica Automotriz';
  if (t.indexOf('automotriz') >= 0) return 'Mecánica Automotriz';
  if (t.indexOf('curso') >= 0) return 'Cursos especializados';
  if (t.indexOf('todas') >= 0) return 'Múltiple';
  return String(v || '—').slice(0, 40) || '—';
}

/* Compara planteles ignorando acentos/mayúsculas, para que el filtro
   coincida aunque los datos vengan con o sin acento. */
function normTxt(v) {
  return String(v || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}
function matchPlantel(valor, filtro) {
  if (!filtro) return true;
  return normTxt(valor) === normTxt(filtro);
}

function buildStats(filtroPlantel) {
  filtroPlantel = filtroPlantel || '';
  var out = { total: 0, porDia: {}, porPlantel: {}, porEspecialidad: {}, porCampana: {}, recientes: [],
              citas: null, inscripciones: null, filtro: filtroPlantel };
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Prospectos');
    if (!sh) return out;
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      var r = vals[i];
      if (!r[2] && !r[3]) continue; // sin nombre ni teléfono
      if (!matchPlantel(r[7], filtroPlantel)) continue;
      out.total++;
      var dia = String(r[0]).slice(0, 10);
      if (dia) out.porDia[dia] = (out.porDia[dia] || 0) + 1;
      var pl = r[7] || '—';
      out.porPlantel[pl] = (out.porPlantel[pl] || 0) + 1;
      var es = canonEspecialidad(r[5]);
      out.porEspecialidad[es] = (out.porEspecialidad[es] || 0) + 1;
      var cm = r[16] || 'directo';
      out.porCampana[cm] = (out.porCampana[cm] || 0) + 1;
    }
    var desde = Math.max(1, vals.length - 10);
    for (var j = vals.length - 1; j >= desde; j--) {
      if (!matchPlantel(vals[j][7], filtroPlantel)) continue;
      out.recientes.push({
        fecha: String(vals[j][0]).slice(0, 16).replace('T', ' '),
        nombre: vals[j][2], plantel: vals[j][7],
        especialidad: canonEspecialidad(vals[j][5]), cupon: vals[j][1]
      });
    }
  } catch (err) { out.error = String(err); }
  out.citas = statsCitas(filtroPlantel);
  out.inscripciones = statsInscripciones(filtroPlantel);
  out.interacciones = statsInteracciones(filtroPlantel);
  return out;
}
