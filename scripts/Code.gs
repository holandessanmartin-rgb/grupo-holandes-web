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

/* Costos publicitarios: ['campaña','canal','monto','inicio','fin','plantel','especialidad'].
   plantel/especialidad vacíos = aplica a todo. Fechas YYYY-MM-DD. */
var COL_COSTOS = ['campaña', 'canal', 'monto', 'inicio', 'fin', 'plantel', 'especialidad'];

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
    if (d.form === 'costo') return guardarCosto(d);
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
var CLEAN_KEY = 'Limpieza2026';

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
  if (p.action === 'archivar') {
    return salida(archivar(p.key || '', parseInt(p.meses || '12', 10) || 12));
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
      var dia = diaStr(r[0]);
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
      var dia = diaStr(r[0]);
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
  ['Prospectos', 'Citas', 'Inscripciones', 'Interacciones', 'Costos'].forEach(function (nombre) {
    var sh = ss.getSheetByName(nombre);
    if (!sh || sh.getLastRow() < 2) { reporte[nombre] = 0; return; }
    var vals = sh.getDataRange().getValues();
    var head = vals[0];
    var kept = [];
    var vistos = {};
    for (var i = 1; i < vals.length; i++) {
      var nom = String(vals[i][2] || '');
      var tel = String(vals[i][3] || '');
      if (/^\s*prueba\b/i.test(nom) || (!nom.trim() && !tel.trim() && nombre !== 'Costos')) continue;
      if (nombre === 'Costos') {
        var firma = vals[i].join('||');
        if (!String(vals[i][0]).trim() || vistos[firma]) continue; // sin campaña o duplicado exacto
        vistos[firma] = true;
      }
      kept.push(vals[i]);
    }
    var borradas = (vals.length - 1) - kept.length;
    sh.clearContents();
    sh.getRange(1, 1, kept.length + 1, head.length).setValues([head].concat(kept));
    reporte[nombre] = borradas;
  });
  return { ok: true, eliminadas: reporte };
}

/* FASE 1: archiva filas con más de N meses en hojas Archivo_<Nombre>.
   Mantiene las operativas rápidas. Solo con CLEAN_KEY. */
function archivar(key, meses) {
  if (!CLEAN_KEY || CLEAN_KEY === 'CAMBIAR-CLAVE-LIMPIEZA' || key !== CLEAN_KEY) {
    return { ok: false, error: 'clave inválida' };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var corte = new Date();
  corte.setMonth(corte.getMonth() - meses);
  var reporte = {};
  ['Prospectos', 'Citas', 'Inscripciones', 'Interacciones'].forEach(function (nombre) {
    var sh = ss.getSheetByName(nombre);
    if (!sh || sh.getLastRow() < 2) { reporte[nombre] = 0; return; }
    var vals = sh.getDataRange().getValues();
    var head = vals[0];
    var viejas = [], nuevas = [];
    for (var i = 1; i < vals.length; i++) {
      var f = vals[i][0] ? new Date(vals[i][0]) : null;
      if (f && !isNaN(f) && f < corte) viejas.push(vals[i]);
      else nuevas.push(vals[i]);
    }
    if (!viejas.length) { reporte[nombre] = 0; return; }
    var dest = ss.getSheetByName('Archivo_' + nombre);
    if (!dest) {
      dest = ss.insertSheet('Archivo_' + nombre);
      dest.appendRow(head);
      dest.setFrozenRows(1);
    }
    viejas.forEach(function (r) { dest.appendRow(r); });
    sh.clearContents();
    sh.getRange(1, 1, nuevas.length + 1, head.length).setValues([head].concat(nuevas));
    reporte[nombre] = viejas.length;
  });
  return { ok: true, archivadas: reporte };
}

/* Guarda un renglón de costo publicitario. */
function guardarCosto(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Costos');
  if (!sh) {
    sh = ss.insertSheet('Costos');
    sh.appendRow(COL_COSTOS);
    sh.setFrozenRows(1);
  }
  sh.appendRow(COL_COSTOS.map(function (c) {
    if (d[c] !== undefined) return d[c];
    if (c === 'campaña' && d.campana !== undefined) return d.campana; // alias sin acento
    return '';
  }));
  return salida({ ok: true });
}

/* Finanzas: por cada renglón de Costos atribuye prospectos (misma campaña,
   fecha en periodo, plantel/especialidad si se etiquetaron) y cuenta su
   avance (citas, visitas realizadas, inscripciones) por teléfono/cupón. */
function finanzas(filtroPlantel) {
  var out = { campanas: [], global: null };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Costos');
    if (!sh || sh.getLastRow() < 2) return out;
    var costos = sh.getDataRange().getValues().slice(1);
    var leads = leafRows(ss, 'Prospectos');
    var citas = leafRows(ss, 'Citas');
    var insc = leafRows(ss, 'Inscripciones');
    var g = { monto: 0, leads: 0, citas: 0, visitas: 0, insc: 0 };
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    costos.forEach(function (cr) {
      var camp = String(cr[0] || '').trim();
      var monto = parseFloat(cr[2]) || 0;
      var ini = diaStr(cr[3]), fin = diaStr(cr[4]);
      var tagPl = String(cr[5] || '').trim(), tagEs = String(cr[6] || '').trim();
      if (!camp || !(monto > 0)) return;
      var tels = {}, cups = {}, nL = 0;
      leads.forEach(function (r) {
        if (String(r[16] || '').trim().toLowerCase() !== camp.toLowerCase()) return;
        var f = diaStr(r[0]);
        if ((ini && f < ini) || (fin && f > fin)) return;
        if (tagPl && !matchPlantel(r[7], tagPl)) return;
        if (tagEs && canonEspecialidad(r[5]) !== canonEspecialidad(tagEs)) return;
        if (filtroPlantel && !matchPlantel(r[7], filtroPlantel)) return;
        nL++;
        var t = normTel(r[3]); if (t) tels[t] = true;
        if (r[1]) cups[String(r[1])] = true;
      });
      var nC = 0, nV = 0;
      citas.forEach(function (r) {
        var t = normTel(r[3]);
        if (!tels[t]) return;
        if (filtroPlantel && !matchPlantel(r[7], filtroPlantel)) return;
        nC++;
        var fc = r[20] ? new Date(r[20]) : null;
        if (String(r[19]).toLowerCase().indexOf('visita') >= 0 && fc && !isNaN(fc) && fc < hoy) nV++;
      });
      var nI = 0;
      insc.forEach(function (r) {
        if (!tels[normTel(r[3])] && !(r[1] && cups[String(r[1])])) return;
        if (filtroPlantel && !matchPlantel(r[7], filtroPlantel)) return;
        nI++;
      });
      var row = { campana: camp, canal: cr[1], monto: monto, leads: nL,
        cpl: nL ? +(monto / nL).toFixed(2) : null,
        citas: nC, costoCita: nC ? +(monto / nC).toFixed(2) : null,
        visitas: nV, costoVisita: nV ? +(monto / nV).toFixed(2) : null,
        inscritos: nI, costoInscrito: nI ? +(monto / nI).toFixed(2) : null,
        conv: nL ? +((100 * nI / nL).toFixed(1)) : 0 };
      out.campanas.push(row);
      g.monto += monto; g.leads += nL; g.citas += nC; g.visitas += nV; g.insc += nI;
    });
    out.global = { monto: +g.monto.toFixed(2), leads: g.leads,
      cpl: g.leads ? +(g.monto / g.leads).toFixed(2) : null,
      citas: g.citas, costoCita: g.citas ? +(g.monto / g.citas).toFixed(2) : null,
      visitas: g.visitas, costoVisita: g.visitas ? +(g.monto / g.visitas).toFixed(2) : null,
      inscritos: g.insc, costoInscrito: g.insc ? +(g.monto / g.insc).toFixed(2) : null };
  } catch (err) { out.error = String(err); }
  return out;
}

function leafRows(ss, nombre) {
  var sh = ss.getSheetByName(nombre);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getDataRange().getValues().slice(1);
}

/* Fechas: Sheets a veces convierte ISO en objetos Date. Normalizar siempre. */
function diaStr(v) {
  try {
    if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
      return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  } catch (e) { /* noop */ }
  return String(v || '').slice(0, 10);
}
function isoStr(v) {
  try {
    if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return v.toISOString();
  } catch (e) { /* noop */ }
  return String(v || '');
}

/* Solo dígitos finales (10) para comparar teléfonos con o sin +52. */
function normTel(v) {
  var d = String(v || '').replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
}

/* Historia completa de un teléfono: bitácora + Prospectos + Citas +
   Inscripciones, ordenada por fecha (la bitácora solo existe para
   actividad real en la web; las hojas cubren datos de prueba y CRM). */
function timeline(telefono) {
  var out = [];
  var want = normTel(telefono);
  if (!want) return out;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Interacciones');
    if (sh) {
      var vals = sh.getDataRange().getValues();
      for (var i = 1; i < vals.length; i++) {
        if (normTel(vals[i][3]) === want) {
          out.push({ f: isoStr(vals[i][0]), evento: vals[i][22] || 'evento',
                     detalle: vals[i][23] || '', plantel: vals[i][7] || '', cupon: vals[i][1] || '' });
        }
      }
    }
    var pr = ss.getSheetByName('Prospectos');
    if (pr) {
      var vp = pr.getDataRange().getValues();
      for (var a = 1; a < vp.length; a++) {
        if (normTel(vp[a][3]) === want) {
          out.push({ f: isoStr(vp[a][0]), evento: 'registro',
                     detalle: vp[a][5] || '', plantel: vp[a][7] || '', cupon: vp[a][1] || '' });
        }
      }
    }
    var ci = ss.getSheetByName('Citas');
    if (ci) {
      var vc = ci.getDataRange().getValues();
      for (var b = 1; b < vc.length; b++) {
        if (normTel(vc[b][3]) === want) {
          out.push({ f: isoStr(vc[b][0]), evento: 'cita',
                     detalle: (vc[b][19] || '') + ' ' + diaStr(vc[b][20]),
                     plantel: vc[b][7] || '', cupon: vc[b][1] || '' });
        }
      }
    }
    var cupones = {};
    out.forEach(function (x) { if (x.cupon) cupones[String(x.cupon)] = true; });
    var ins = ss.getSheetByName('Inscripciones');
    if (ins) {
      var vi = ins.getDataRange().getValues();
      for (var c = 1; c < vi.length; c++) {
        if (normTel(vi[c][3]) === want || (vi[c][1] && cupones[String(vi[c][1])])) {
          out.push({ f: isoStr(vi[c][0]), evento: 'inscripción',
                     detalle: vi[c][5] || '', plantel: vi[c][7] || '', cupon: vi[c][1] || '' });
        }
      }
    }
  } catch (err) { /* noop */ }
  out.sort(function (x, y) { return y.f < x.f ? -1 : 1; });
  return out.slice(0, 50).map(function (x) {
    return { fecha: x.f.slice(0, 16).replace('T', ' '),
             evento: x.evento, detalle: x.detalle, plantel: x.plantel, cupon: x.cupon };
  });
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
  if (t.indexOf('moto') >= 0) return 'Reparación de Motocicletas';
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
      var dia = diaStr(r[0]);
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
        fecha: isoStr(vals[j][0]).slice(0, 16).replace('T', ' '),
        nombre: vals[j][2], plantel: vals[j][7],
        especialidad: canonEspecialidad(vals[j][5]), cupon: vals[j][1]
      });
    }
  } catch (err) { out.error = String(err); }
  out.citas = statsCitas(filtroPlantel);
  out.inscripciones = statsInscripciones(filtroPlantel);
  out.interacciones = statsInteracciones(filtroPlantel);
  out.finanzas = finanzas(filtroPlantel);
  return out;
}
