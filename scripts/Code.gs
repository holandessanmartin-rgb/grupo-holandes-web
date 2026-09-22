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

var HOJAS = { registro: 'Prospectos', citas: 'Citas' };

var COLUMNAS = ['fecha', 'cupon', 'nombre', 'telefono', 'edad',
  'especialidad', 'especialidades', 'plantel', 'plantelId',
  'horarioPreferido', 'comoConociste', 'comentarios', 'origen',
  'origenPage', 'campana_source', 'campana_medium', 'campana_campaign',
  'canalPreferido', 'via', 'tipo', 'fechaCita', 'horarioCita'];

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

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (DIRECTIVO_KEY && p.key !== DIRECTIVO_KEY) {
    return salida({ ok: false, error: 'no autorizado' });
  }
  if (p.action === 'stats') {
    return salida({ ok: true, stats: buildStats() });
  }
  return salida({ ok: true, servicio: 'Prospectos GH' });
}

function buildStats() {
  var out = { total: 0, porDia: {}, porPlantel: {}, porEspecialidad: {}, porCampana: {}, recientes: [] };
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Prospectos');
    if (!sh) return out;
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      var r = vals[i];
      if (!r[2] && !r[3]) continue; // sin nombre ni teléfono
      out.total++;
      var dia = String(r[0]).slice(0, 10);
      if (dia) out.porDia[dia] = (out.porDia[dia] || 0) + 1;
      var pl = r[7] || '—';
      out.porPlantel[pl] = (out.porPlantel[pl] || 0) + 1;
      var es = r[5] || '—';
      out.porEspecialidad[es] = (out.porEspecialidad[es] || 0) + 1;
      var cm = r[16] || 'directo';
      out.porCampana[cm] = (out.porCampana[cm] || 0) + 1;
    }
    var desde = Math.max(1, vals.length - 10);
    for (var j = vals.length - 1; j >= desde; j--) {
      out.recientes.push({
        fecha: String(vals[j][0]).slice(0, 16).replace('T', ' '),
        nombre: vals[j][2], plantel: vals[j][7],
        especialidad: vals[j][5], cupon: vals[j][1]
      });
    }
  } catch (err) { out.error = String(err); }
  return out;
}
