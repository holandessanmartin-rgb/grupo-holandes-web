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
