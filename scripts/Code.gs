/* ============================================================
   Grupo Holandés → Google Sheets  (LIBRO MAESTRO)
   ------------------------------------------------------------
   PASO 1. Abre el libro MAESTRO (copia "Prospectos GH"):
           Extensiones → Apps Script → borra TODO → pega este archivo.
           Ctrl+S para guardar.
   PASO 2. Implementar → Administrar implementaciones → ✏️ →
           "Nueva versión" → Implementar.
           ⚠️ La URL /exec NO cambia: el sitio web y el bot
           siguen apuntando igual, no hay que tocar nada más.
   PASO 3. Corre la función **migrarTodo** desde el editor (▶,
           elige tu cuenta si pide permiso). Mueve los leads del bot
           que estaban mezclados en "Prospectos" a "Leads Chatbot",
           las citas del bot a "Citas" e importa "BotCRM" del libro
           de respaldo. Idempotente: correrla 2 veces no duplica.
           Revisar el reporte en View ▸ Logs.
   PASO 4. Verifica: "Prospectos" debe quedar SOLO con formularios
           web y "Leads Chatbot" con los leads del bot.

   Después de esto:
   - Sitio web (registro/empezar/citas) → sigue yendo a "Prospectos".
   - Bot (leads) → "Leads Chatbot", 1 fila por teléfono (upsert).
   - Bot (citas)  → "Citas".
   - El libro original pasa a ser respaldo: ya no recibe datos.
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
  'evento', 'detalle', 'marketing',
  'privacy_version', 'consent_marketing', 'consent_analytics',
  'ubicacion_pref', 'tutor_autorizado'];

/* Leads del chatbot: pestaña propia "Leads Chatbot" (NO se mezcla con
   los formularios web de "Prospectos"). */
var COLS_LEAD = ['fecha', 'nombre', 'telefono', 'plantel', 'especialidad', 'horario',
  'ubicacion', 'estado', 'origen', 'score', 'mensajes', 'citas', 'ultima',
  'campana', 'aviso'];

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
    /* --- Leads y citas DEL CHATBOT: pestañas aparte (nunca "Prospectos") --- */
    if (d.form === 'lead' || (d.evento === 'lead' && !d.form)) return guardarLeadChatbot(d);
    if (d.evento === 'cita' && !d.form) return guardarCitaBot(d);
    if (d.form === 'costo') return guardarCosto(d);
    var nombreHoja = HOJAS[d.form] || 'Prospectos';
    var fila = COLUMNAS.map(function (c) {
      if (c.indexOf('campana_') === 0 && d.campana) {
        return d.campana[c.replace('campana_', '')] || '';
      }
      return d[c] !== undefined && d[c] !== null ? d[c] : '';
    });
    hoja(nombreHoja).appendRow(fila);
    if (nombreHoja === 'Prospectos') notificarPlantel(d.plantel || d.plantelId || '', 'Nuevo lead web: ' + (d.full_name || d.nombre || '') + ' | Tel: ' + (d.telefono || d.phone || d.wa || '') + ' | Esp: ' + (d.especialidad || d.especialidadTexto || '') + ' | Origen: web');
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

/* Clave obligatoria para la limpieza (?action=limpiar&key=...): borra
   pruebas, vacías y duplicados exactos de Prospectos.
   Cámbiala por una propia en tu copia del script. */
var CLEAN_KEY = 'Limpieza2026';

/* Clave para disparar el resumen diario por correo a los encargados
   (?action=broadcast&key=...). Solo envía; no modifica las hojas. */
var BROADCAST_KEY = 'Broadcast2026';

/* Clave del pixel de apertura de correo (?action=abrir&key=...).
   Va DENTRO del correo: quien la reciba puede verla (solo sirve para
   registrar aperturas falsas, no para leer nada). */
var TRACK_KEY = 'Abre2026';
var URL_EXEC = 'https://script.google.com/macros/s/AKfycbzMjM28bTa52i4adlTifQVFNDCwEL8aQ9nWvbne8oEOf7znEHzeVs2gfs9n1o4rP_cF/exec';

function doGet(e) {
  var p = (e && e.parameter) || {};
  /* Pixel de apertura: lo carga el cliente de correo SIN sesión,
     por eso va antes de autorizarPlantel(). */
  if (p.action === 'abrir') return registrarApertura(p);
  var auth = autorizarPlantel(p);
  if (!auth.ok) return salida({ ok: false, error: auth.error });
  var plantelFiltro = auth.admin ? (p.plantel || '') : (auth.plantel || p.plantel);
  if (p.action === 'stats') {
    return salida({ ok: true, stats: buildStats(plantelFiltro) });
  }
  if (p.action === 'timeline') {
    return salida({ ok: true, eventos: timeline(p.telefono || '') });
  }
  if (p.action === 'limpiar') {
    return salida(limpiarPruebas(p.key || ''));
  }
  if (p.action === 'borrar') {
    return salida(borrarTelefonos(p.key || '', p.telefonos || ''));
  }
  if (p.action === 'dedupe') {
    return salida(dedupeLeads(p.key || ''));
  }
  if (p.action === 'seguimiento') {
    if (!auth.admin && !p.plantel) { return salida({ ok: false, error: 'plantel-requerido' }); }
    return salida(seguimiento(plantelFiltro, p.test === '1'));
  }
  if (p.action === 'prospectos') {
    if (!auth.admin) p.plantel = plantelFiltro;
    else if (p.plantel) p.plantel = p.plantel;
    else p.plantel = '';
    return salida(listaProspectos(p));
  }
  if (p.action === 'archivar') {
    return salida(archivar(p.key || '', parseInt(p.meses || '12', 10) || 12));
  }
  if (p.action === 'broadcast') {
    if (String(p.key || '') !== BROADCAST_KEY) return salida({ ok: false, error: 'key' });
    return salida(broadcastLeadsAEncargados());
  }
  if (p.action === 'aperturas') {
    /* Quién abrió el resumen: resumen por correo + detalle reciente. */
    if (String(p.key || '') !== BROADCAST_KEY) return salida({ ok: false, error: 'key' });
    return salida(reporteAperturas());
  }
  if (p.action === 'correoPrueba') {
    /* Prueba del pixel: manda un correo con el pixel de apertura a la
       direccion que se indique (?action=correoPrueba&key=Broadcast2026&para=...).
       Solo envia; no toca las hojas (aparte de registrar la apertura al abrirlo). */
    if (String(p.key || '') !== BROADCAST_KEY) return salida({ ok: false, error: 'key' });
    return salida(correoPrueba(p));
  }
  if (p.action === 'citasBorrar') {
    /* Limpieza puntual de duplicados en la hoja Citas (ver borrarCitas). */
    if (String(p.key || '') !== CLEAN_KEY) return salida({ ok: false, error: 'key' });
    return salida(borrarCitas(p.filas || '', String(p.confirmar || '') === '1'));
  }
  return salida({ ok: true, servicio: 'Prospectos GH' });
}

/* ================================================================
   SEGUIMIENTO DE APERTURA DE CORREOS (pixel1x1 en el broadcast)
   - El correo va en HTML con <img src="...action=abrir...">.
   - Cada apertura registra: fecha, plantel, correo, idEnvio.
   - Hoja 'Aperturas': se crea sola en el primer registro.
   - Ver: ?action=aperturas&key=Broadcast2026
   ================================================================ */
function hojaAperturas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Aperturas');
  if (!sh) {
    sh = ss.insertSheet('Aperturas');
    sh.appendRow(['fecha', 'plantel', 'correo', 'idEnvio', 'agente']);
  }
  return sh;
}

function registrarApertura(p) {
  var gif = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 transparente
  var out = ContentService.createTextOutput(
    Utilities.newBlob(Utilities.base64Decode(gif), 'image/gif')
  ).setMimeType(ContentService.MimeType.GIF);
  try {
    if (String(p.key || '') !== TRACK_KEY) return out; // sin clave: se ignora
    hojaAperturas().appendRow([
      Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy-MM-dd HH:mm:ss'),
      String(p.plantel || ''),
      String(p.correo || ''),
      String(p.id || ''),
      String(p.a || 'pixel').slice(0, 40)
    ]);
  } catch (err) { Logger.log('aperturas error: ' + err); }
  return out;
}

/* Marca de tiempo (epoch ms) incrustada en el idEnvio.
   Formato real: <prefijo>-<13 digitos>-<aleatorio>
   (lead-…, santa-maria-tule-…, prueba-…). Sirve para saber CUANDO se
   envio el correo, y con eso separar la entrega automatica de una
   apertura humana. Devuelve 0 si el id no trae tiempo. */
function msDeIdEnvio(id) {
  var m = String(id || '').match(/-(\d{13})-/);
  return m ? parseInt(m[1], 10) : 0;
}

/* Diferencia en segundos entre dos fechas 'yyyy-MM-dd HH:mm:ss'.
   Ambas se leen como hora local, asi que aunque el proyecto use otra
   zona horaria la diferencia sale correcta (ambas van en hora de Mexico). */
function segsEntre(f1, f2) {
  function ms(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return 0;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
  }
  var a = ms(f1), b = ms(f2);
  return (a && b) ? Math.round((a - b) / 1000) : 0;
}

/* Clasifica un renglon de la hoja Aperturas:
   - 'apertura'   -> lo abrio una persona (>= 30 s despues de enviar)
   - 'automatico' -> el visor/escanner de imagenes toco el pixel al
                     entregar el correo (2 a 5 s despues de enviar)
   - 'ignorado'   -> el id no trae hora de envio, no se puede juzgar    El umbral de 30 s separa limpio los dos casos medidos en produccion:
    +2 s, +3 s, +3 s, +4 s (automaticos)  vs  +3.7 min, +16 min, +1 h (reales). */
function tipoApertura(fecha, idEnvio) {
  var ts = msDeIdEnvio(idEnvio);
  if (!ts) return 'ignorado';
  var enviada = Utilities.formatDate(new Date(ts), 'America/Mexico_City', 'yyyy-MM-dd HH:mm:ss');
  var dif = segsEntre(fecha, enviada);
  return (dif > -30 && dif < 30) ? 'automatico' : 'apertura';
}

function reporteAperturas() {
  var sh = null;
  try { sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Aperturas'); } catch (e) {}
  if (!sh) return { ok: true, total: 0, abiertos: 0, automaticos: 0, porCorreo: {}, nota: 'aun sin aperturas' };
  var v = sh.getDataRange().getValues();
  var porCorreo = {};
  var detalle = [];
  var hoy = Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy-MM-dd');
  var hoyN = 0;        // aperturas humanas de hoy
  var hoyAuto = 0;     // toques automaticos de hoy
  var abiertosN = 0;   // aperturas humanas totales
  var autoN = 0;       // toques automaticos totales
  for (var i = 1; i < v.length; i++) {
    var r = v[i];
    if (!r[0]) continue;
    /* Con segundos: el umbral de 30 s no funciona con la hora a lo minuto. */
    var fecha = (r[0] instanceof Date)
      ? Utilities.formatDate(r[0], 'America/Mexico_City', 'yyyy-MM-dd HH:mm:ss')
      : String(r[0]);
    var tipo = tipoApertura(fecha, r[3]);
    var esApertura = (tipo === 'apertura');
    var correo = String(r[2] || '(sin correo)');
    var k = String(r[1] || '?') + ' :: ' + correo;
    porCorreo[k] = porCorreo[k] || { plantel: r[1], correo: r[2], abiertos: 0, automaticos: 0, ultima: '' };
    if (esApertura) {
      porCorreo[k].abiertos++;
      abiertosN++;
      if (fecha > porCorreo[k].ultima) porCorreo[k].ultima = fecha;
    } else {
      porCorreo[k].automaticos++;
      autoN++;
    }
    if (fecha.slice(0, 10) === hoy) {
      if (esApertura) hoyN++; else hoyAuto++;
      detalle.push({ fecha: fecha, plantel: r[1], correo: r[2], tipo: tipo });
    }
  }
  detalle.reverse();
  return { ok: true, total: v.length - 1, abiertos: abiertosN, automaticos: autoN,
           hoy: hoyN, hoyAutomaticos: hoyAuto,
           porCorreo: porCorreo, detalleHoy: detalle.slice(0, 60) };
}

/* ================================================================
   PRUEBA DEL PIXEL DE APERTURA
   Manda un correo de prueba (con el pixel 1x1) a una direccion libre
   para confirmar que abrirlo queda registrado en la hoja 'Aperturas'.
   - Desde el editor:  pruebaCorreo()
   - Por URL:          ?action=correoPrueba&key=Broadcast2026&para=...
   - Ver resultado:    ?action=aperturas&key=Broadcast2026
   ================================================================ */
function correoPrueba(p) {
  var para = String(p.para || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para)) return { ok: false, error: 'correo-invalido' };
  var plantel = String(p.plantel || 'prueba');
  var idEnv = 'prueba-' + new Date().getTime() + '-' + Math.random().toString(36).slice(2, 7);
  var pixel = URL_EXEC + '?action=abrir&key=' + TRACK_KEY +
    '&plantel=' + encodeURIComponent(plantel) +
    '&correo=' + encodeURIComponent(para) +
    '&id=' + encodeURIComponent(idEnv) +
    '&a=' + encodeURIComponent('prueba');
  var lineas = [
    'Hola,',
    '',
    'Este es un correo de PRUEBA del aviso de apertura de Grupo Holandes.',
    'Sirve para verificar que el sistema detecta quien lo abre.',
    '',
    'Si lo ves en tu bandeja, solo tienes que abrirlo (con imagenes activas)',
    'y el administrador registrara la apertura.',
    '',
    'Id de envio: ' + idEnv,
    'Plantel: ' + plantel,
    '',
    'Equipo Grupo Holandes'
  ];
  var body = lineas.join('\n');
  var htmlBody = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111">' +
    lineas.map(function(l) {
      return l ? l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '&nbsp;';
    }).join('<br>') +
    '<img src="' + pixel + '" width="1" height="1" alt="" style="border:0;display:block;opacity:0"></div>';
  MailApp.sendEmail({
    to: para,
    subject: String(p.asunto || 'Prueba de apertura - Grupo Holandes'),
    body: body,
    htmlBody: htmlBody
  });
  Logger.log('CORREO DE PRUEBA enviado a ' + para + ' id=' + idEnv);
  return { ok: true, para: para, plantel: plantel, id: idEnv,
           ver: URL_EXEC + '?action=aperturas&key=' + BROADCAST_KEY };
}

/* Atajo para correr desde el editor de Apps Script (menu ▶ Ejecutar). */
function pruebaCorreo() {
  return correoPrueba({ para: 'viko.gameplays@gmail.com' });
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
      var dia = horaMX(r[0]).slice(0, 10);
      if (dia) out.porDia[dia] = (out.porDia[dia] || 0) + 1;
      var tp = r[19] || 'visita';
      out.porTipo[tp] = (out.porTipo[tp] || 0) + 1;
      var fc = r[20] ? toTime(r[20]) : null;
      if (fc !== null) {
        if (fc < hoy.getTime()) out.realizadas++;
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
      var dia = horaMX(r[0]).slice(0, 10);
      if (dia) out.porDia[dia] = (out.porDia[dia] || 0) + 1;
    }
  } catch (err) { out.error = String(err); }
  return out;
}

/* Borra filas de prueba: nombre que empieza con PRUEBA o TEST, filas vacías
   (sin nombre, teléfono ni evento) y duplicados exactos en Prospectos
   (mismo nombre + mismo teléfono, se conserva la fila más antigua).
   Solo con la CLEAN_KEY correcta. */
function limpiarPruebas(key) {
  if (!CLEAN_KEY || CLEAN_KEY === 'CAMBIAR-CLAVE-LIMPIEZA' || key !== CLEAN_KEY) {
    return { ok: false, error: 'clave inválida o sin configurar (edita CLEAN_KEY en el script)' };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reporte = {};
  var duplicadas = {};
  ['Prospectos', 'Citas', 'Inscripciones', 'Interacciones', 'Costos'].forEach(function (nombre) {
    var sh = ss.getSheetByName(nombre);
    if (!sh || sh.getLastRow() < 2) { reporte[nombre] = 0; return; }
    var vals = sh.getDataRange().getValues();
    var head = vals[0];
    var kept = [];
    var vistos = {};
    var dup = 0;
    for (var i = 1; i < vals.length; i++) {
      var nom = String(vals[i][2] || '');
      var tel = String(vals[i][3] || '');
      // Vacía solo si además no tiene evento (protege la bitácora Interacciones)
      var vacia = !nom.trim() && !tel.trim() && nombre !== 'Costos' && !String(vals[i][22] || '').trim();
      if (esPrueba(nom) || vacia) continue;
      if (nombre === 'Costos') {
        var firma = vals[i].join('||');
        if (!String(vals[i][0]).trim() || vistos[firma]) continue; // sin campaña o duplicado exacto
        vistos[firma] = true;
      }
      if (nombre === 'Prospectos') {
        var k = clavePersona(nom, tel);
        if (k && vistos[k]) { dup++; continue; } // duplicado exacto: mismo nombre + teléfono
        if (k) vistos[k] = true;
      }
      kept.push(vals[i]);
    }
    var borradas = (vals.length - 1) - kept.length;
    sh.clearContents();
    sh.getRange(1, 1, kept.length + 1, head.length).setValues([head].concat(kept));
    reporte[nombre] = borradas;
    if (dup) duplicadas[nombre] = dup;
  });
  return { ok: true, eliminadas: reporte, duplicadas: duplicadas };
}

/* Clave de dedupe: nombre en minúsculas/sin acentos + teléfono de 10
   dígitos. Si falta alguno de los dos no deduplica (dato incompleto). */
function clavePersona(nom, tel) {
  var n = normTxt(nom);
  var t = normTel(tel);
  return (n && t) ? n + '|' + t : '';
}

/* Fila de prueba: el nombre empieza con PRUEBA o TEST (cualquier caso). */
function esPrueba(nom) {
  return /^\s*(prueba|test)\b/i.test(String(nom || ''));
}

/* Borra de "Prospectos" SOLO las filas cuyo teléfono esté en la lista.
   Uso: ?action=borrar&key=CLEAN_KEY&telefonos=9513143703,9511183267
   Comparación por los 10 dígitos finales (normTel), así que acepta con o sin
   +52. NO toca Citas, Inscripciones, Interacciones ni Costos, y NO borra nada
   que no coincida exacto: es un borrado quirúrgico, pensado para retirar
   registros de prueba sin tocar prospectos reales. Requiere CLEAN_KEY. */
function borrarTelefonos(key, lista) {
  if (!CLEAN_KEY || CLEAN_KEY === 'CAMBIAR-CLAVE-LIMPIEZA' || key !== CLEAN_KEY) {
    return { ok: false, error: 'clave inválida o sin configurar (edita CLEAN_KEY en el script)' };
  }
  var set = {};
  // Se separa por coma o punto y coma (no por espacio): un número con "+52"
  // puede llevar espacios internos y partirlo lo dejaría irreconocible.
  String(lista || '').split(/[,;]+/).forEach(function (seg) {
    var d = String(seg || '').replace(/\D/g, '');
    if (d.length === 10) { set[d] = 0; return; }
    if (d.length === 20) { set[d.slice(0, 10)] = 0; set[d.slice(10)] = 0; return; }
    if (d.length > 10) { set[d.slice(-10)] = 0; } // +52 / espacios: 10 finales
  });
  var objetivos = Object.keys(set);
  if (!objetivos.length) return { ok: false, error: 'sin telefonos validos (10 digitos)' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Prospectos');
  if (!sh || sh.getLastRow() < 2) return { ok: true, borradas: 0, porTelefono: {}, conservadas: 0 };
  var vals = sh.getDataRange().getValues();
  var head = vals[0];
  var kept = [];
  for (var i = 1; i < vals.length; i++) {
    var t = normTel(vals[i][3]); // columna D = telefono
    if (t && set.hasOwnProperty(t)) { set[t]++; continue; }
    kept.push(vals[i]);
  }
  var borradas = (vals.length - 1) - kept.length;
  if (borradas > 0) {
    sh.clearContents();
    sh.getRange(1, 1, kept.length + 1, head.length).setValues([head].concat(kept));
  }
  var porTelefono = {};
  objetivos.forEach(function (k) { if (set[k]) porTelefono[k] = set[k]; });
  return { ok: true, borradas: borradas, porTelefono: porTelefono, conservadas: kept.length };
}

/* Dedupe de "Leads Chatbot" por teléfono (10 dígitos finales): conserva la
   PRIMERA fila de cada número y borra las repetidas — los duplicados que
   Meta manda dos veces (mismo número, mismo día, mismo JSON de campaña).
   Solo toca "Leads Chatbot". Requiere CLEAN_KEY. */
function dedupeLeads(key) {
  if (!CLEAN_KEY || CLEAN_KEY === 'CAMBIAR-CLAVE-LIMPIEZA' || key !== CLEAN_KEY) {
    return { ok: false, error: 'clave inválida o sin configurar (edita CLEAN_KEY en el script)' };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Leads Chatbot');
  if (!sh || sh.getLastRow() < 3) return { ok: true, borradas: 0, conservadas: 0 };
  var vals = sh.getDataRange().getValues();
  var head = vals[0];
  var kept = [];
  var vistos = {};
  var dup = 0;
  for (var i = 1; i < vals.length; i++) {
    var t = normTel(vals[i][2]);
    if (t && vistos[t]) { dup++; continue; }
    if (t) vistos[t] = true;
    kept.push(vals[i]);
  }
  if (!dup) return { ok: true, borradas: 0, conservadas: kept.length };
  sh.clearContents();
  sh.getRange(1, 1, kept.length + 1, head.length).setValues([head].concat(kept));
  return { ok: true, borradas: dup, conservadas: kept.length };
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

/* Seguimiento: prospectos sin cita en 48h y con cita pero sin inscripción
   en 7 días (por teléfono). Las filas TEST sí se muestran (el plantel del
   encargado se filtra en el servidor); las PRUEBA legadas solo con test=1. */
function seguimiento(filtroPlantel, incluirPruebas) {
  var out = { sinCita: [], sinInscripcion: [] };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Prospectos');
    if (!sh) return out;
    var vals = sh.getDataRange().getValues();
    var ahora = new Date().getTime();
    var conCita = {}, inscritos = {};
    var ci = ss.getSheetByName('Citas');
    if (ci) {
      var vc = ci.getDataRange().getValues();
      for (var i = 1; i < vc.length; i++) {
        var t = normTel(vc[i][3]);
        if (t) conCita[t] = true;
      }
    }
    var ins = ss.getSheetByName('Inscripciones');
    if (ins) {
      var vi = ins.getDataRange().getValues();
      for (var j = 1; j < vi.length; j++) {
        var t2 = normTel(vi[j][3]);
        if (t2) inscritos[t2] = true;
        else if (vi[j][1]) inscritos['CUPON:' + String(vi[j][1])] = true;
      }
    }
    for (var k = vals.length - 1; k >= 1; k--) {
      var r = vals[k];
      var nom = String(r[2] || '');
      if (!nom || (!incluirPruebas && /^\s*prueba\b/i.test(nom))) continue;
      if (filtroPlantel && !matchPlantel(r[7], filtroPlantel)) continue;
      var tel = normTel(r[3]);
      if (!tel) continue;
      var f = toTime(r[0]);
      if (f === null) continue;
      var dias = (ahora - f) / 86400000;
      var base = { nombre: nom, telefono: r[3], plantel: r[7] || '',
                   especialidad: canonEspecialidad(r[5]), cupon: r[1] || '',
                   dias: Math.floor(dias) };
      if (!conCita[tel] && !inscritos[tel] && !(r[1] && inscritos['CUPON:' + String(r[1])]) && dias >= 2) {
        out.sinCita.push(base);
      } else if (conCita[tel] && !inscritos[tel] && !(r[1] && inscritos['CUPON:' + String(r[1])]) && dias >= 7) {
        out.sinInscripcion.push(base);
      }
      if (out.sinCita.length >= 200 || out.sinInscripcion.length >= 200) break;
    }
  } catch (err) { out.error = String(err); }
  return out;
}

/* Prospectos para /admin/prospectos: filtros + estado derivado
   (inscrito > cita-agendada > nuevo) cruzando teléfonos y cupones. */
function listaProspectos(p) {
  var out = { total: 0, prospectos: [] };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Prospectos');
    if (!sh) return out;
    var fEst = (p.estado || '').trim(), fPl = (p.plantel || '').trim();
    var fEs = (p.especialidad || '').trim(), fCam = (p.campana || '').trim();
    var fDes = (p.desde || '').slice(0, 10), fHas = (p.hasta || '').slice(0, 10);
    var conCita = {}, insc = {};
    var ci = ss.getSheetByName('Citas');
    if (ci) {
      var vc = ci.getDataRange().getValues();
      for (var i = 1; i < vc.length; i++) {
        var t = normTel(vc[i][3]);
        if (t) conCita[t] = true;
      }
    }
    var si = ss.getSheetByName('Inscripciones');
    if (si) {
      var vi = si.getDataRange().getValues();
      for (var j = 1; j < vi.length; j++) {
        var u = normTel(vi[j][3]);
        if (u) insc[u] = true;
        else if (vi[j][1]) insc['CUPON:' + String(vi[j][1])] = true;
      }
    }
    var vals = sh.getDataRange().getValues();
    var toda = [];  // mezcla Prospectos (web) + Leads Chatbot (bot)
    for (var kw = 1; kw < vals.length; kw++) toda.push({s:'w', r: vals[kw]});
    var shL = ss.getSheetByName('Leads Chatbot');
    if (shL) {
      var vL = shL.getDataRange().getValues();
      for (var kb = 1; kb < vL.length; kb++) if (vL[kb] && (vL[kb][1] || vL[kb][2])) toda.push({s:'b', r: vL[kb]});
    }
    for (var k = toda.length - 1; k >= 0 && out.prospectos.length < 5000; k--) {
      var item = toda[k];
      var r = item.r, sbot = item.s === 'b';
      var nom = sbot ? String(r[1] || '') : String(r[2] || '');
      var telRaw = sbot ? (r[2] || '') : (r[3] || '');
      var tel = normTel(telRaw);
      if (!nom && !telRaw) continue;
      var esp = sbot ? (r[4] ? canonEspecialidad(r[4]) : canonEspecialidad(r[4])) : canonEspecialidad(r[5]);
      var pl = sbot ? (r[3] || '') : (r[7] || '');
      var camp = canonCampana(sbot ? (r[13] || 'Chatbot WhatsApp') : r[16]);
      var hor = sbot ? String(r[5] || '') : String(r[9] || '');
      var fecha = horaMX(r[0]).slice(0, 10);
      var est;
      if (sbot) est = r[7] || 'nuevo';
      else est = (insc[tel] || (r[1] && insc['CUPON:' + String(r[1])])) ? 'inscrito'
        : (conCita[tel] ? 'cita-agendada' : 'nuevo');
      var obj = { fecha: fecha, nombre: nom, telefono: sbot ? String(telRaw || '') : String(r[3] || ''),
        especialidad: esp, plantel: pl,
        campana: camp, cupon: sbot ? '' : (r[1] || ''),
        horario: hor, estado: est };
      if (fEst && est !== fEst) continue;
      if (fPl && !matchPlantel(obj.plantel, fPl)) continue;
      if (fEs && canonEspecialidad(obj.especialidad) !== canonEspecialidad(fEs)) continue;
      if (fCam && String(obj.campana).toLowerCase() !== fCam.toLowerCase()) continue;
      if (fDes && fecha < fDes) continue;
      if (fHas && fecha > fHas) continue;
      out.prospectos.push(obj);
    }
    out.total = out.prospectos.length;
  } catch (err) { out.error = String(err); }
  return out;
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
        if (String(r[19]).toLowerCase().indexOf('visita') >= 0 && fc && !isNaN(fc) && fc < hoy.getTime()) nV++;
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

/* Hora de México para MOSTRAR (yyyy-MM-dd HH:mm).
   La hoja guarda texto: las filas anteriores al 15/10/2026 venían en UTC
   (terminan en "Z", con milisegundos) y las nuevas llegan con offset -06:00.
   Si el valor termina en Z se trata como UTC (incluye el caso en que Sheets
   haya convertido la celda en un objeto Date) y se pasa a la hora local;
   cualquier otra forma se imprime tal cual. México está en UTC-6 fijo desde
   2022, así que las filas viejas se reinterpretan retroactivamente. */
function horaMX(v) {
  var s = isoStr(v);
  if (!s) return '';
  if (/[zZ]$/.test(s)) {
    try {
      var d = new Date(s);
      if (!isNaN(d)) return Utilities.formatDate(d, 'America/Mexico_City', 'yyyy-MM-dd HH:mm');
    } catch (e) { /* noop */ }
  }
  return s.slice(0, 16).replace('T', ' ');
}

/* Hora normalizada para comparar horarios de cita.
   Sheets guarda "09:00" como objeto Date (medianoche de 1899 + 9 h), así que
   String(v) nunca iguala al texto "09:00" y el guard anti-duplicado no
   matcheaba (caso Usiel: 4 filas). Aquí se devuelve SIEMPRE "HH:mm" en texto:
   Date  -> Utilities.formatDate en la zona del script
   texto -> se extrae el primer patrón (\d{1,2}):(\d{2}) y se normaliza a 2 dígitos */
function txtHora(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm');
  }
  var s = String(v);
  var m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return s.trim();
  return ('0' + m[1]).slice(-2) + ':' + m[2];
}

/* Fecha robusta: acepta Date de Sheets, ISO con microsegundos o texto. */
function toTime(v) {
  try {
    if (Object.prototype.toString.call(v) === '[object Date]') {
      return isNaN(v) ? null : v.getTime();
    }
    var s = String(v || '');
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var t = Date.parse(s);
    return isNaN(t) ? null : t;
  } catch (e) { return null; }
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
    /* Mismo registro sintético para los leads del bot/Meta: si no, el 50%
       de los prospectos sale con la línea de tiempo vacía. */
    var lc = ss.getSheetByName('Leads Chatbot');
    if (lc) {
      var vl = lc.getDataRange().getValues();
      for (var d2 = 1; d2 < vl.length; d2++) {
        if (normTel(vl[d2][2]) === want) {
          out.push({ f: isoStr(vl[d2][0]), evento: 'registro',
                     detalle: vl[d2][4] || '', plantel: vl[d2][3] || '', cupon: '' });
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
    return { fecha: horaMX(x.f),
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
function matchPlantel(valor, filtro) { if (!filtro) return true; return canonPlantel(valor) === canonPlantel(filtro); }
function canonPlantel(raw) {
  var n = normTxt(raw);
  if (!n) return '';
  if (n.indexOf('san') >= 0 && n.indexOf('martin') >= 0) return 'san-martin-oaxaca';
  if (n.indexOf('santa cruz') >= 0) return 'santa-cruz-xoxocotlan';
  if (n.indexOf('santa maria') >= 0 && n.indexOf('tule') >= 0) return 'santa-maria-tule';
  if (n.indexOf('zimatlan') >= 0) return 'zimatlan-alvarez';
  if (n.indexOf('tehuacan') >= 0) return 'tehuacan';
  if (n.indexOf('pinotepa') >= 0) return 'pinotepa-nacional';
  if (n.indexOf('santa maria') >= 0) return 'santa-maria-tule';
  if (n.indexOf('san juan') >= 0 || n.indexOf('tuxtepec') >= 0) return 'san-juan-bautista-tuxtepec';
  if (n.indexOf('huajuapan') >= 0) return 'huajuapan-de-leon';
  if (n.indexOf('juchitan') >= 0) return 'juchitan-de-zaragoza';
  if (n.indexOf('miahuatlan') >= 0) return 'miahuatlan-de-porfirio-diaz';
  if (n.indexOf('ocotlan') >= 0) return 'ocotlan-de-morelos';
  if (n.indexOf('ometepec') >= 0) return 'ometepec';
  if (n.indexOf('puerto escondido') >= 0) return 'puerto-escondido';
  if (n.indexOf('ejutla') >= 0) return 'ejutla';
  if (n.indexOf('putla') >= 0) return 'putla';
  if (n.indexOf('tierra blanca') >= 0) return 'tierra-blanca';
  if (n.indexOf('villahermosa') >= 0) return 'villahermosa';
  if (n.indexOf('cem') >= 0) return 'cem';
  return n.replace(/\s+/g, '-');
}

/* Nombre de campaña "legible" para KPIs, gráficas y el filtro del corte.
   Los leads Meta/CTWA traen un JSON crudo en la celda (ad_id, fuente fb.me…):
   ahí se agrupa todo como "Meta CTWA"; el chatbot orgánico queda como
   "Chatbot WhatsApp"; el JSON del bot con campaign se abre a ese valor. */
function canonCampana(v) {
  if (v && typeof v === 'object') {
    try { v = JSON.stringify(v); } catch (e) { v = ''; }
  }
  var s = String(v || '');
  if (s.charAt(0) === '{') {
    try {
      var p = JSON.parse(s);
      if (p.campaign) return String(p.campaign);
      if (p.ad_id !== undefined || p.fuente) return 'Meta CTWA';
    } catch (e) { return 'Meta CTWA'; }
    return 'Chatbot WhatsApp';
  }
  return s || 'directo';
}

function buildStats(filtroPlantel) {
  filtroPlantel = filtroPlantel || '';
  var out = { total: 0, porDia: {}, porPlantel: {}, porEspecialidad: {}, porCampana: {}, recientes: [],
              citas: null, inscripciones: null, filtro: filtroPlantel };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Prospectos');
    if (!sh) return out;
    /* Dedupe por teléfono (10 dígitos): el mismo número en "Prospectos" y en
       "Leads Chatbot" es UN prospecto — el KPI no lo cuenta dos veces. */
    var vistos = {};
    var recientes = [];   // se mezclan las 2 hojas y se ordenan por fecha
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      var r = vals[i];
      if (!r[2] && !r[3]) continue; // sin nombre ni teléfono
      if (!matchPlantel(r[7], filtroPlantel)) continue;
      var telW = normTel(r[3]);
      if (telW) { if (vistos[telW]) continue; vistos[telW] = true; }
      out.total++;
      var dia = horaMX(r[0]).slice(0, 10);
      if (dia) out.porDia[dia] = (out.porDia[dia] || 0) + 1;
      var pl = r[7] || '—';
      out.porPlantel[pl] = (out.porPlantel[pl] || 0) + 1;
      var es = canonEspecialidad(r[5]);
      out.porEspecialidad[es] = (out.porEspecialidad[es] || 0) + 1;
      var cm = canonCampana(r[16]);
      out.porCampana[cm] = (out.porCampana[cm] || 0) + 1;
      recientes.push({ fecha: horaMX(r[0]), nombre: r[2], plantel: r[7],
                       especialidad: es, cupon: r[1] });
    }
    /* Leads Chatbot (bot + Meta/CTWA): mismas métricas, columnas propias. */
    var shL = ss.getSheetByName('Leads Chatbot');
    if (shL) {
      var vL = shL.getDataRange().getValues();
      for (var k = 1; k < vL.length; k++) {
        var b = vL[k];
        if (!b[1] && !b[2]) continue; // sin nombre ni teléfono
        if (!matchPlantel(b[3], filtroPlantel)) continue;
        var telB = normTel(b[2]);
        if (telB) { if (vistos[telB]) continue; vistos[telB] = true; }
        out.total++;
        var diaB = horaMX(b[0]).slice(0, 10);
        if (diaB) out.porDia[diaB] = (out.porDia[diaB] || 0) + 1;
        var plB = b[3] || '—';
        out.porPlantel[plB] = (out.porPlantel[plB] || 0) + 1;
        var esB = canonEspecialidad(b[4]);
        out.porEspecialidad[esB] = (out.porEspecialidad[esB] || 0) + 1;
        var cmB = canonCampana(b[13] || 'Chatbot WhatsApp');
        out.porCampana[cmB] = (out.porCampana[cmB] || 0) + 1;
        recientes.push({ fecha: horaMX(b[0]), nombre: b[1], plantel: b[3],
                         especialidad: esB, cupon: '' });
      }
    }
    recientes.sort(function (x, y) { return y.fecha < x.fecha ? -1 : 1; });
    out.recientes = recientes.slice(0, 10);
  } catch (err) { out.error = String(err); }
  out.citas = statsCitas(filtroPlantel);
  out.inscripciones = statsInscripciones(filtroPlantel);
  out.interacciones = statsInteracciones(filtroPlantel);
  out.finanzas = finanzas(filtroPlantel);
  return out;
}

/* ================================================================
   LEADS Y CITAS DEL CHATBOT (pestañas aparte)
   ================================================================ */

function hojaLeads() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Leads Chatbot');
  if (!sh) {
    sh = ss.insertSheet('Leads Chatbot');
    sh.appendRow(COLS_LEAD);
    sh.setFrozenRows(1);
  }
  // teléfono SIEMPRE texto: si queda como número se vuelve 5.21951E+11
  sh.getRange('C:C').setNumberFormat('@');
  return sh;
}

/* Fila destino de un lead del bot (alias del payload enriquecido). */
function filaLead(d) {
  var campana = d.campana;
  if (campana && typeof campana === 'object') {
    try { campana = JSON.stringify(campana); } catch (e) { campana = ''; }
  }
  var v = {
    fecha: d.ts || '',
    nombre: d.full_name || d.nombre || '',
    telefono: String(d.wa || d.telefono || d.phone_number || '').replace(/\D/g, ''),
    plantel: d.plantelCiudad || d.city || d.plantel || '',
    especialidad: d.especialidad || d.especialidadTexto || '',
    horario: d.horario || d.horarioPreferido || '',
    ubicacion: d.ubicacion || d.city || '',
    estado: d.lead_status || d.estado || 'nuevo',
    origen: d.origin || 'Chatbot WhatsApp',
    score: d.score != null ? d.score : '',
    mensajes: d.mensajes != null ? d.mensajes : '',
    citas: d.citas != null ? d.citas : '',
    ultima: d.ultima || '',
    campana: campana || '',
    aviso: d.avisoEstado || ''
  };
  return COLS_LEAD.map(function (c) { return v[c] !== undefined && v[c] !== null ? v[c] : ''; });
}

/* UPSERT por teléfono: el bot manda el mismo lead varias veces
   (score 5 → 7 → 11), NO se duplica fila, se actualiza.
   Regla: gana lo no-vacío del dato nuevo; lo vacío no borra lo existente. */
function upsertLeadChatbot(fila) {
  var sh = hojaLeads();
  var nuevo = String(fila[2] == null ? '' : fila[2]).replace(/\D/g, '');
  var claveN = nuevo ? nuevo.slice(-10) : '';
  if (!claveN) return 0;
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    var t = String(vals[i][2] == null ? '' : vals[i][2]).replace(/\D/g, '');
    if (t && t.slice(-10) === claveN) {
      var act = vals[i];
      var mez = fila.map(function (nv, k) {
        return (nv === '' || nv === null || nv === undefined) ? act[k] : nv;
      });
      sh.getRange(i + 1, 1, 1, COLS_LEAD.length).setValues([mez]);
      return { fila: i + 1, isNew: false };
    }
  }
  sh.appendRow(fila);
  return { fila: sh.getLastRow(), isNew: true };
}

function guardarLeadChatbot(d) {
  try {
    var res = upsertLeadChatbot(filaLead(d));
    var valFila = (res && typeof res === 'object') ? res.fila : res;
    if (res && res.isNew) {
      /* Bitácora: el lead del bot/Meta también escribe en Interacciones con
         el mismo evento 'registro' que los formularios web — sin esto la
         línea de tiempo y el KPI de interacciones lo ignoran. */
      try {
        var campD = d.campana;
        var filaIx = COLUMNAS.map(function (c) {
          if (c.indexOf('campana_') === 0 && campD && typeof campD === 'object') {
            return campD[c.replace('campana_', '')] || '';
          }
          var v = {
            fecha: d.ts || Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy-MM-dd HH:mm:ss'),
            cupon: '', nombre: d.full_name || d.nombre || '',
            telefono: String(d.wa || d.telefono || d.phone_number || '').replace(/\D/g, ''),
            especialidad: d.especialidad || d.especialidadTexto || '',
            plantel: d.plantelCiudad || d.city || d.plantel || '',
            origen: d.origin || 'Chatbot WhatsApp',
            evento: 'registro',
            detalle: 'Lead · ' + canonCampana(campD || 'Chatbot WhatsApp')
          };
          return v[c] !== undefined && v[c] !== null ? v[c] : '';
        });
        hoja('Interacciones').appendRow(filaIx);
      } catch (eIx) { /* la bitácora nunca debe romper el alta del lead */ }
      notificarPlantel(d.plantelCiudad || d.city || d.plantel || '', 'Nuevo lead chatbot WA: ' + (d.full_name || d.nombre || '') + ' | Tel: ' + (d.wa || d.telefono || '') + ' | Plantel: ' + (d.plantelCiudad || d.plantel || d.city || '') + ' | Esp: ' + (d.especialidad || d.especialidadTexto || ''));
    }
    return salida({ ok: true, hoja: 'Leads Chatbot', fila: valFila });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

/* Cita agendada por el bot → hoja "Citas" (layout de COLUMNAS).
   El payload del bot es { fecha, wa, plantel, nombre, dia, hora }. */
function guardarCitaBot(d) {
  try {
    var obj = {
      fecha: d.fecha || d.ts || '',
      cupon: d.cupon || '',
      nombre: d.nombre || d.full_name || '',
      telefono: String(d.wa || d.telefono || d.phone_number || '').replace(/\D/g, ''),
      especialidad: d.especialidad || d.especialidadTexto || '',
      plantel: d.plantel || d.plantelCiudad || '',
      origen: 'Chatbot WhatsApp',
      via: 'chatbot',
      tipo: 'chatbot',
      fechaCita: d.dia || '',
      horarioCita: d.hora || '',
      evento: 'cita',
      detalle: 'Agendada por el asistente'
    };
    /* Anti-duplicado: si esta misma cita (teléfono + fechaCita + horarioCita)
       ya está en la hoja — webhook reintentado o "sí" repetido — no se
       vuelve a agregar. Con fechaCita y horarioCita vacíos se compara
       además la fecha exacta del evento para atrapar reintentos idénticos
       (nunca bloquea una cita nueva: si las fechas no coinciden, agrega). */
    var sh = hoja('Citas');
    var tel = obj.telefono;
    if (tel) {
      var prev = sh.getDataRange().getValues();
      for (var ip = 1; ip < prev.length; ip++) {
        var pr = prev[ip];
        if (String(pr[3] || '').replace(/\D/g, '') !== tel) continue;
        var ambosVacios = !String(obj.fechaCita) && !String(obj.horarioCita);
        var mismoHorario = !ambosVacios &&
          String(pr[20] || '') === String(obj.fechaCita) &&
          txtHora(pr[21]) === txtHora(obj.horarioCita);
        var mismoTs = ambosVacios && pr[0] && obj.fecha &&
          new Date(pr[0]).getTime() === new Date(obj.fecha).getTime();
        if (mismoHorario || mismoTs) {
          return salida({ ok: true, hoja: 'Citas', duplicada: true, fila: ip + 1 });
        }
      }
    }
    var fila = COLUMNAS.map(function (c) { return obj[c] !== undefined ? obj[c] : ''; });
    sh.appendRow(fila);
    return salida({ ok: true, hoja: 'Citas' });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

/* ================================================================
   LIMPIEZA PUNTUAL DE CITAS DUPLICADAS
   ?action=citasBorrar&key=<CLEAN_KEY>&filas=6,8,10[&confirmar=1]
   - filas = números de fila de la hoja Citas (1 = encabezado), coma-separados.
   - SIN confirmar=1 solo regresa lo que se borraría (revisión previa).
   - Borra de ab hacia arriba: los números bajos no se mueven.
   ================================================================ */
function borrarCitas(filas, confirmar) {
  if (!CLEAN_KEY || CLEAN_KEY === 'CAMBIAR-CLAVE-LIMPIEZA') {
    return { ok: false, error: 'CLEAN_KEY sin configurar' };
  }
  var nums = String(filas || '').split(',').map(function(s) {
    return parseInt(String(s).trim(), 10);
  }).filter(function(n) { return n >= 2; })
    .filter(function(n, i, a) { return a.indexOf(n) === i; })
    .sort(function(a, b) { return b - a; }); // de mayor a menor
  if (!nums.length) return { ok: false, error: 'sin filas validas (min. fila 2)' };
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Citas');
  if (!sh) return { ok: false, error: 'no existe la hoja Citas' };
  var vals = sh.getDataRange().getValues();
  var vista = nums.map(function(n) {
    var r = vals[n - 1];
    if (!r) return { fila: n, falta: true };
    return {
      fila: n,
      fecha: String(r[0] == null ? '' : r[0]),
      nombre: String(r[2] || ''),
      tel: String(r[3] || ''),
      fechaCita: String(r[20] || ''),
      hora: String(r[21] || ''),
      evento: String(r[22] || '')
    };
  });
  var conDatos = vista.filter(function(v) { return !v.falta && v.evento; });
  if (conDatos.length !== vista.length) {
    // una fila pedida no existe o no es evento: no se borra nada a ciegas
    return { ok: false, error: 'revisar: alguna fila no existe o no es cita', vista: vista };
  }
  if (!confirmar) return { ok: true, modo: 'vista', borraria: vista };
  var borradas = [];
  nums.forEach(function(n) { sh.deleteRow(n); borradas.push(n); });
  return { ok: true, modo: 'borrado', borradas: borradas.reverse(), detalle: vista };
}

/* ================================================================
   MIGRACIÓN ÚNICA — correr UNA vez desde el editor (▶ migrarTodo)
   ================================================================
   1) Revisa "Prospectos" y separa lo que escribió el bot:
        - evento "lead" o teléfono de 13 dígitos → "Leads Chatbot"
        - evento "cita"                        → "Citas"
        - filas de prueba (nombre con prueba/test) → se descartan
      Los formularios web NO se tocan.
   2) Importa la pestaña "BotCRM" del libro de respaldo (el original).
   3) Borra SOLO las filas bot movidas (borrado por rangos de abajo hacia
      arriba: una fila web que llegue al mismo tiempo no se pierde).
   Idempotente: correrla otra vez no duplica nada.
   Deja el reporte en View ▸ Logs. */
var RESPALDO_ID = '1iHmhgA_DOmyLKPKr7JdmoMmZvSC6JbKaofuC3eRQS8c';

function migrarTodo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rep = { botcrm: 0, botcrmOmitidos: 0, leads: 0, citas: 0,
              citasRepetidas: 0, filasBotBorradas: 0, errores: [] };

  var shP = ss.getSheetByName('Prospectos');
  var vals = shP.getDataRange().getValues();

  /* --- índices auxiliares: teléfono y fecha por nombre ------------ */
  var telPorNombre = {}, fechaPorNombre = {};
  var i, r, nom, dig, ev;
  for (i = 1; i < vals.length; i++) {
    r = vals[i];
    ev = String(r[22] || '').toLowerCase();
    nom = String(r[2] || '').trim();
    dig = String(r[3] == null ? '' : r[3]).replace(/\D/g, '');
    if (!nom) continue;
    if (ev === 'lead' && dig.length >= 10) telPorNombre[normTxt(nom)] = dig;
    if (ev === 'cita' && r[0]) fechaPorNombre[normTxt(nom)] = r[0]; // última gana
  }

  /* --- 1) BotCRM del respaldo → Leads Chatbot (primero, para que
          los datos más frescos de ESTE libro queden encima) --------- */
  try {
    var otro = SpreadsheetApp.openById(RESPALDO_ID);
    var shB = otro.getSheetByName('BotCRM');
    if (shB) {
      var vb = shB.getDataRange().getValues();
      for (i = 1; i < vb.length; i++) {
        var b = vb[i];
        var nb = String(b[3] || '').trim();
        var db = String(b[2] == null ? '' : b[2]).replace(/\D/g, '');
        if (!db) continue;
        if (/prueba|test/i.test(nb)) { rep.botcrmOmitidos++; continue; }
        upsertLeadChatbot(leadDeBotcrm(b));
        rep.botcrm++;
      }
    } else {
      rep.errores.push('No existe la pestaña BotCRM en el respaldo');
    }
  } catch (e2) { rep.errores.push('BotCRM: ' + e2); }

  /* --- 2) Prospectos: separar leads/citas del bot de los web ------ */
  var shC = hoja('Citas');
  var vc = shC.getDataRange().getValues();
  var vistosCita = {};
  for (i = 1; i < vc.length; i++) vistosCita[citaClave(vc[i])] = true;

  var idxBorrar = [];   // filas bot de ESTE libro (se borran al final)
  for (i = 1; i < vals.length; i++) {
    r = vals[i];
    ev = String(r[22] || '').toLowerCase();
    nom = String(r[2] || '').trim();
    dig = String(r[3] == null ? '' : r[3]).replace(/\D/g, '');
    var esBot = ev === 'lead' || ev === 'cita' || dig.length >= 12;
    if (!esBot) continue;                       // formulario web: se queda
    var filaSheet = i + 1;
    if (/prueba|test/i.test(nom)) { idxBorrar.push(filaSheet); continue; } // basura
    if (ev === 'cita') {
      var fc = citaDeProspecto(r, telPorNombre);
      var k = citaClave(fc);
      if (vistosCita[k]) { rep.citasRepetidas++; idxBorrar.push(filaSheet); continue; }
      vistosCita[k] = true;
      shC.appendRow(fc);
      rep.citas++;
      idxBorrar.push(filaSheet);
      continue;
    }
    if (dig.length >= 10) {
      upsertLeadChatbot(leadDeProspecto(r, telPorNombre, fechaPorNombre));
      rep.leads++;
      idxBorrar.push(filaSheet);
      continue;
    }
    // lead sin teléfono: no se mueve (queda en Prospectos para no perderlo)
  }

  /* --- 3) borra las filas bot movidas (de abajo hacia arriba) -----
     ⚠️ CORRECCIÓN 2026-11-08: el borrado original hacía
        deleteRows(start, cnt) con start = fila MAYOR del tramo, lo que
        borraba start..start+cnt-1 (hacia ABAJO, fuera del tramo) y
        dejaba vivas las filas del tramo + se llevaba por delante filas
        web vecinas. Ahora se borra desde la fila MENOR del tramo. */
  idxBorrar.sort(function (a, b2) { return b2 - a; });
  var n = 0;
  while (n < idxBorrar.length) {
    var start = idxBorrar[n], cnt = 1;
    while (n + cnt < idxBorrar.length && idxBorrar[n + cnt] === start - cnt) cnt++;
    shP.deleteRows(start - cnt + 1, cnt);   // tramo [start-cnt+1 … start]
    n += cnt;
    rep.filasBotBorradas += cnt;
  }

  Logger.log('MIGRACIÓN LISTA:\n' + JSON.stringify(rep, null, 2));
  return rep;
}

/* Fila de Prospectos (bot) → fila de "Leads Chatbot". */
function leadDeProspecto(r, telPorNombre, fechaPorNombre) {
  var nom = String(r[2] || '').trim();
  var dig = String(r[3] == null ? '' : r[3]).replace(/\D/g, '');
  var v = {
    fecha: r[0] || fechaPorNombre[normTxt(nom)] || '',
    nombre: nom,
    telefono: dig,
    plantel: r[7] || '',
    especialidad: r[5] || '',
    horario: r[9] || '',
    ubicacion: '',
    estado: '',                 // vacío: no pisa un estado más completo (BotCRM)
    origen: 'Chatbot WhatsApp',
    score: '', mensajes: '', citas: '', ultima: '', campana: '', aviso: ''
  };
  return COLS_LEAD.map(function (c) { return v[c] !== undefined && v[c] !== null ? v[c] : ''; });
}

/* Fila de "BotCRM" (respaldo) → fila de "Leads Chatbot". */
function leadDeBotcrm(b) {
  var num = function (x) {
    return (x === '' || x === null || x === undefined) ? '' : Math.round(Number(x) || 0);
  };
  var v = {
    fecha: b[0] || '',                       // Timestamp
    nombre: String(b[3] || '').trim(),       // Nombre
    telefono: String(b[2] == null ? '' : b[2]).replace(/\D/g, ''), // WA
    plantel: b[4] || '',                     // Plantel
    especialidad: b[10] || '',
    horario: '',
    ubicacion: b[11] || '',
    estado: b[5] || '',
    origen: 'Chatbot WhatsApp',
    score: num(b[6]),
    mensajes: num(b[7]),
    citas: num(b[8]),
    ultima: b[12] || '',
    campana: b[13] || '',
    aviso: b[9] || ''
  };
  return COLS_LEAD.map(function (c) { return v[c] !== undefined && v[c] !== null ? v[c] : ''; });
}

/* Fila de Prospective (cita del bot) → fila de "Citas" (COLUMNAS). */
function citaDeProspecto(r, telPorNombre) {
  var nom = String(r[2] || '').trim();
  var dig = String(r[3] == null ? '' : r[3]).replace(/\D/g, '');
  var obj = {
    fecha: r[0] || '',
    cupon: '',
    nombre: nom,
    telefono: telPorNombre[normTxt(nom)] || (dig.length >= 10 ? dig : ''),
    especialidad: r[5] || '',
    plantel: r[7] || '',
    origen: 'Chatbot WhatsApp',
    via: 'chatbot',
    tipo: 'chatbot',
    fechaCita: '',
    horarioCita: '',
    evento: 'cita',
    detalle: 'Agendada por el asistente (migrada)'
  };
  return COLUMNAS.map(function (c) { return obj[c] !== undefined ? obj[c] : ''; });
}

/* Clave para no repetir citas: fecha + nombre + plantel. */
function citaClave(f) {
  return String(f[0] == null ? '' : f[0]) + '|' +
         String(f[2] == null ? '' : f[2]) + '|' +
         String(f[7] == null ? '' : f[7]);
}

var WEB_PERDIDAS = [
  ["2026-11-07T15:35:50-06:00", "GH-ZADM", "Fredy Alberto García Vilchis", 9511133091, "", "Reparación de Motocicletas", "reparacion-motocicletas", "Plantel Santa María del Tule", "santa-maria-tule", "", "", "", "registro-web", "/registro", "", "", "", "whatsapp", "api", "", "", ""],
  ["2026-11-07T16:30:21-06:00", "GH-E3DZ", "Por confirmar", 9515565292, "", "Mecánica Automotriz", "", "Plantel Santa María del Tule", "santa-maria-tule", "", "", "", "empezar-web", "/empezar", "facebook", "paid_social", "HOLANDES | LEADS | INFO-CURSOS | 14-CIUDADES | CONTINUO", "whatsapp", "api", "", "", ""],
  ["2026-11-07T16:31:57-06:00", "GH-CH33", "Por confirmar", 9511744330, "", "Mecánica Automotriz", "", "Plantel Santa María del Tule", "santa-maria-tule", "", "", "", "empezar-web", "/empezar", "facebook", "paid_social", "HOLANDES | LEADS | INFO-CURSOS | 14-CIUDADES | CONTINUO", "whatsapp", "api", "", "", ""],
  ["2026-11-07T17:12:31-06:00", "GH-PRXN", "Oscar Uriel Martinez Geraldo", 2381989329, "", "Mecánica Automotriz", "mecanica-automotriz", "Plantel Tehuacán", "tehuacan", "", "", "", "registro-web", "/registro", "", "", "", "whatsapp", "api", "", "", ""],
  ["2026-11-07T17:55:47-06:00", "GH-FEUU", "Por confirmar", 9513569105, "", "Mecánica Automotriz", "", "Plantel San Martín, Oaxaca", "san-martin-oaxaca", "", "", "", "empezar-web", "/empezar", "facebook", "paid_social", "HOLANDES | LEADS | INFO-CURSOS | 14-CIUDADES | CONTINUO", "whatsapp", "api", "", "", ""],
  ["2026-11-07T20:47:24-06:00", "GH-D48J", "Por confirmar", 2382538286, "", "Mecánica Automotriz", "", "Plantel Tehuacán", "tehuacan", "", "", "", "empezar-web", "/empezar", "facebook", "paid_social", "HOLANDES | LEADS | INFO-CURSOS | 14-CIUDADES | CONTINUO", "whatsapp", "api", "", "", ""],
  ["2026-11-07T23:04:47-06:00", "GH-X645", "Por confirmar", 9141310077, "", "Mecánica Automotriz", "", "Plantel Villahermosa", "villahermosa", "", "", "", "empezar-web", "/empezar", "facebook", "paid_social", "HOLANDES | LEADS | INFO-CURSOS | 14-CIUDADES | CONTINUO", "whatsapp", "api", "", "", ""],
  ["2026-11-08T01:34:06-06:00", "GH-RHV8", "Por confirmar", 9214901402, "", "Mecánica Automotriz", "", "Plantel Villahermosa", "villahermosa", "", "", "", "empezar-web", "/empezar", "facebook", "paid_social", "HOLANDES | LEADS | INFO-CURSOS | 14-CIUDADES | CONTINUO", "whatsapp", "api", "", "", ""],
  ["2026-11-08T08:20:47-06:00", "GH-9BFE", "Ariel Ruiz", 9512037635, "", "Mecánica Automotriz", "mecanica-automotriz", "Plantel Santa Cruz Xoxocotlán", "santa-cruz-xoxocotlan", "", "", "", "registro-web", "/registro", "", "", "", "whatsapp", "api", "", "", ""],
];

/* ================================================================
   REPARACIÓN POST-MIGRACIÓN — correr UNA vez ▶ repararMigracion
   ----------------------------------------------------------------
   1. Restaura las ~9 filas web que borró el bug de deleteRows (copiadas
      de la copia de respaldo, con sus datos completos). Idempotente:
      si ya están, se saltan.
   2. Pone el teléfono en las citas del chatbot que quedaron sin él
      (buscando por nombre en las filas web de Prospectos).
   3. Elimina el residual del bot en "Prospectos" (72 filas: 38 con
      teléfono que ya están en "Leads Chatbot"; filas vacías sin nombre/
      sin fecha; duplicados del bot cuyo nombre ya existe como fila web;
      filas PRUEBA). Lo que NO se pueda verificar, se deja conservado
      y se reporta.
   4. Borrado de abajo hacia arriba, POR RANGOS CORRECTOS (ceil/floor
      corregido: se borra desde la fila MÁS ALTA del tramo y descendiendo).
   ================================================================ */

function repararMigracion() {
  var rep = { restauradas: WEB_PERDIDAS.length, yaEstaban: 0, citasConTel: 0,
              movidosAlChatbot: 0,
              borradas: { prueba: 0, yaEnChatbot: 0, vacias: 0, duplicadasWeb: 0 },
              conservadas: [], errores: [] };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shP = ss.getSheetByName('Prospectos');
  var vp = shP.getDataRange().getValues();

  /* --- 1) restaura filas web borradas por el bug ------------------ */
  var llaves = {};
  for (var a = 1; a < vp.length; a++) {
    llaves[String(vp[a][0] || '') + '|' + String(vp[a][3] == null ? '' : vp[a][3]).replace(/\D/g, '')] = true;
  }
  rep.restauradas = 0;
  WEB_PERDIDAS.forEach(function (f) {
    var k = String(f[0] || '') + '|' + String(f[3] == null ? '' : f[3]).replace(/\D/g, '');
    if (llaves[k]) { rep.yaEstaban++; return; }
    shP.appendRow(f);
    llaves[k] = true;
    rep.restauradas++;
  });
  // re-leer Prospectos incluyendo las filas recién restauradas
  vp = shP.getDataRange().getValues();

  /* --- 2) teléfono en citas del bot que quedaron sin él ---------- */
  var telPorNombre = {};
  for (var b = 1; b < vp.length; b++) {
    var evb = String(vp[b][22] || '').toLowerCase();
    if (evb === 'lead' || evb === 'cita') continue;
    var nb = normTxt(vp[b][2]);
    var db = String(vp[b][3] == null ? '' : vp[b][3]).replace(/\D/g, '');
    if (nb && db.length >= 10) telPorNombre[nb] = db.slice(-10);
  }
  var shC = ss.getSheetByName('Citas');
  if (shC) {
    var vc = shC.getDataRange().getValues();
    for (var c = 1; c < vc.length; c++) {
      var tel = String(vc[c][3] == null ? '' : vc[c][3]).replace(/\D/g, '');
      if (tel) continue;
      var nc = normTxt(vc[c][2]);
      if (nc && telPorNombre[nc]) {
        shC.getRange(c + 1, 4).setValue(telPorNombre[nc]);
        rep.citasConTel++;
      }
    }
  }

  /* --- 3) Limpia el residual del bot en Prospectos --------------- */
  var shL = ss.getSheetByName('Leads Chatbot');
  var enChatbot = {};
  if (shL) {
    var vl = shL.getDataRange().getValues();
    for (var d2 = 1; d2 < vl.length; d2++) {
      var dl = String(vl[d2][2] == null ? '' : vl[d2][2]).replace(/\D/g, '');
      if (dl.length >= 10) enChatbot[dl.slice(-10)] = true;
    }
  }
  var nombresWeb = {};
  for (var e2 = 1; e2 < vp.length; e2++) {
    var eve = String(vp[e2][22] || '').toLowerCase();
    if (eve === 'lead' || eve === 'cita') continue;
    var ne = normTxt(vp[e2][2]);
    if (ne) nombresWeb[ne] = true;
  }

  var aBorrar = [];
  for (var i = 1; i < vp.length; i++) {
    var r = vp[i];
    var ev = String(r[22] || '').toLowerCase();
    if (ev !== 'lead' && ev !== 'cita') continue;
    var nom = String(r[2] || '').trim();
    var dig = String(r[3] == null ? '' : r[3]).replace(/\D/g, '');
    var fila = i + 1;
    if (esPrueba(nom)) { aBorrar.push(fila); rep.borradas.prueba++; continue; }
    if (dig.length >= 10) {
      if (enChatbot[dig.slice(-10)]) {
        aBorrar.push(fila);
        rep.borradas.yaEnChatbot++;
      } else {
        // leads del bot nuevos que aún no están en Leads Chatbot: los subo
        if (ev === 'lead') {
          try { upsertLeadChatbot(leadDeProspecto(r, telPorNombre, {})); rep.movidosAlChatbot++; aBorrar.push(fila); } catch (err) { rep.errores.push('upsert ' + dig + ': ' + err); rep.conservadas.push(nom + ' (' + dig + ')'); }
        } else rep.conservadas.push(nom + ' (' + dig + ')');
      }
      continue;
    }
    // sin teléfono
    if (!nom && !String(r[0] || '')) { aBorrar.push(fila); rep.borradas.vacias++; continue; }
    if (nom && nombresWeb[normTxt(nom)]) { aBorrar.push(fila); rep.borradas.duplicadasWeb++; continue; }
    rep.conservadas.push((nom || '(sin nombre)') + ' sin telefono');
  }

  aBorrar.sort(function (x, y) { return y - x; });
  var n = 0;
  while (n < aBorrar.length) {
    var start = aBorrar[n], cnt = 1;
    while (n + cnt < aBorrar.length && aBorrar[n + cnt] === start - cnt) cnt++;
    shP.deleteRows(start - cnt + 1, cnt);
    n += cnt;
  }

  Logger.log('REPARACIÓN LISTA:\n' + JSON.stringify(rep, null, 2));
  return rep;
}

/* ================================================================
   PURGE DE RESIDUOS "Prueba" â€” UNA vez â–¶ purgePruebas
   Borra cualquier fila cuyo nombre contenga "prueba" (en cualquier
   posiciÃ³n, no distingue mayÃºsculas), tanto en "Prospectos" como en
   "Leads Chatbot". Deja reporte en View â–¸ Logs.
   ================================================================ */
function purgePruebas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reporte = { prospectos: 0, leadsChatbot: 0 };
  ['Prospectos', 'Leads Chatbot'].forEach(function (nombre) {
    var sh = ss.getSheetByName(nombre);
    if (!sh || sh.getLastRow() < 2) return;
    var vals = sh.getDataRange().getValues();
    var head = vals[0];
    var kept = [];
    for (var i = 1; i < vals.length; i++) {
      /* Prospectos: nombre en col C (índice 2) · Leads Chatbot: en col B (índice 1,
         COLS_LEAD) — con 2 fijo la hoja del bot comparaba el TELÉFONO y no borraba nada. */
      var colNom = nombre === 'Prospectos' ? 2 : 1;
      var nom = String(vals[i][colNom] || '');
      if (/prueba/i.test(nom)) { reporte[nombre === 'Prospectos' ? 'prospectos' : 'leadsChatbot']++; continue; }
      kept.push(vals[i]);
    }
    if (kept.length !== vals.length - 1) {
      sh.clearContents();
      sh.getRange(1, 1, kept.length + 1, head.length).setValues([head].concat(kept));
    }
  });
  Logger.log('PURGE LISTO: ' + JSON.stringify(reporte));
  return reporte;
}

var MAIL_PANEL = {
  'tlaxiaco': 'mecanicaautomotriztlaxiaco@gmail.com',
  'zimatlan-de-alvarez': 'mecanicaholandeszimatlan@gmail.com',
  'juchitan-de-zaragoza': 'escuelaautomotrizjuchitan@gmail.com',
  'santa-maria-tule':  'escuelaautomotrizdeltule@gmail.com, mecanicaautomotrizdelsureste@gmail.com, holandes424@gmail.com',
  'miahuatlan-de-porfirio-diaz': 'grupoholandesmiahuatlan@gmail.com',
  'santa-cruz-xoxocotlan': 'grupoholandesxoxo@gmail.com',
  'villahermosa': 'escuelademecanicavillahermosa@gmail.com',
  'huajuapan-de-leon': 'escuelaautomotrizhuajuapan@hotmail.com',
  'san-juan-bautista-tuxtepec': 'escuelaautomotriztuxcipec1@gmail.com',
  'tehuacan': 'haromiguelharo@gmail.com',
  'tierra-blanca': 'mecanicaholandestierrablanca@gmail.com',
  'san-martin-oaxaca': 'holandes.san.martin@gmail.com',
  'pinotepa-nacional': 'guerreroelizabethnohemi@gmail.com',
  'ometepec': 'elizabethnohemiguerreromarin1@gmail.com',
  'puerto-escondido': 'holandesmecanicapuertoescondid@gmail.com',
  'ocotlan-de-morelos': 'mecanicaholandesocotlan@gmail.com',
  'ejutla': 'Grupoholandes.ejutla@gmail.com',
  'putla': 'escuelaautomotrizdeltule@hotmail.com'
};
function notificarPlantel(plantelCrudo, mensaje) {
  var k = canonPlantel(plantelCrudo);
  var correos = String(MAIL_PANEL[k] || '');
  if (!correos) { Logger.log('Sin correo para plantel ' + k); return; }
  var lista = correos.split(',').map(function(s){return s.trim();}).filter(function(s){return s;});
  for (var i=0;i<lista.length;i++){
    try {
      var c = lista[i];
      /* Mismo pixel de apertura que el resumen diario: el admin puede ver si
         el asesor abrió este correo con ?action=aperturas&key=Broadcast2026
         (la columna "agente" dice "lead" para distinguirlo del resumen). */
      var idEnv = 'lead-' + new Date().getTime() + '-' + Math.random().toString(36).slice(2, 7);
      var pixel = URL_EXEC + '?action=abrir&key=' + TRACK_KEY +
        '&plantel=' + encodeURIComponent(k) +
        '&correo=' + encodeURIComponent(c) +
        '&id=' + encodeURIComponent(idEnv) +
        '&a=' + encodeURIComponent('lead');
      var htmlBody = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111">' +
        mensaje.split('\n').map(function(l) {
          return l ? l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '&nbsp;';
        }).join('<br>') +
        '<img src="' + pixel + '" width="1" height="1" alt="" style="border:0;display:block;opacity:0"></div>';
      MailApp.sendEmail({ to: c, subject: 'Nuevo lead Grupo Holandes - ' + k, body: mensaje, htmlBody: htmlBody });
    } catch (err) { Logger.log('Error en correo ' + lista[i] + ': ' + err); }
  }
}

/* =========================================================
   ISOLATION POR PLANTEL (token por encargado)
   Los tokens se guardan en Script Properties bajo "TOKEN_MAP"
   como JSON { "tok123": "san-martin-oaxaca", ... }.
   El admin global (ADMIN_TOKEN env, opcional) ve todo.
   ========================================================= */
var ADMIN_TOKEN = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN') || '';

function registrarTokenPlantel(slug, token) {
  var m = JSON.parse(PropertiesService.getScriptProperties().getProperty('TOKEN_MAP') || '{}');
  m[token] = slug;
  PropertiesService.getScriptProperties().setProperty('TOKEN_MAP', JSON.stringify(m));
  return { ok: true, slug: slug, token: token };
}
function plantelDesdeToken(key) {
  if (!key) return '';
  try { var m = JSON.parse(PropertiesService.getScriptProperties().getProperty('TOKEN_MAP') || '{}'); return m[key] || ''; }
  catch (e) { return ''; }
}
function esAdmin(key) {
  return !!ADMIN_TOKEN && key === ADMIN_TOKEN;
}
function autorizarPlantel(p) {
  if (!p) return { ok: false, error: 'bad-param' };
  var key = String(p.key || '').trim();
  var admin = esAdmin(key);
  if (admin) return { ok: true, admin: true, plantel: p.plantel || '' };
  var tokenPlantel = plantelDesdeToken(key);
  if (tokenPlantel) {
    if (p.plantel && canonPlantel(p.plantel) !== canonPlantel(tokenPlantel)) {
      return { ok: false, error: 'plantel-no-autorizado' };
    }
    return { ok: true, admin: false, plantel: tokenPlantel };
  }
  // DIRECTIVO_KEY si quedo fijado en el script
  if (DIRECTIVO_KEY && key !== DIRECTIVO_KEY) return { ok: false, error: 'no-autorizado' };
  // si no definimos keys (modo open), lo dejamos como estaba
  return { ok: true, admin: true, plantel: p.plantel || '' };
}


/* =========================================================
   BROADCAST UNA SOLA VEZ → encargados por planel (email directo)
   No requiere token al encargado; cada correo contiene **solo**
   los leads de su plantel + link a wa.me para seguimiento.
   ========================================================= */

function broadcastLeadsAEncargados() {
  var rep = { enviados: 0, planteles: [], faltantes: [] };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  /* Citas por plantel: se leen una sola vez. Columnas COLUMNAS:
     [2] nombre, [3] telefono, [5] especialidad, [7] plantel,
     [20] fechaCita, [21] horarioCita. */
  var citasPorPlantel = {};
  try {
    var ci = ss.getSheetByName('Citas');
    if (ci) {
      var vc = ci.getDataRange().getValues();
      for (var ic = 1; ic < vc.length; ic++) {
        var rc = vc[ic];
        if (!rc[2] && !rc[3]) continue;
        var k = canonPlantel(rc[7] || '');
        if (!k) continue;
        (citasPorPlantel[k] = citasPorPlantel[k] || []).push(rc);
      }
    }
  } catch (eCita) { /* noop: sin hoja Citas no se listan citas */ }

  Object.keys(MAIL_PANEL).forEach(function(p) {
    var correos = String(MAIL_PANEL[p]).split(',').map(function(s){return s.trim();}).filter(function(s){return s;});
    var res = listaProspectos({ plantel: p });
    var leads = (res && res.prospectos) ? res.prospectos : [];
    var block = leads.map(function(l, i) {
      var tel = normTel(l.telefono);
      var wa = tel ? 'https://wa.me/' + tel : '(sin telefono)';
      return (i+1)+'. ' + (l.nombre || '(Por confirmar)') + ' | wa.me: ' + wa + ' | Estado: ' + (l.estado || 'nuevo') + (l.especialidad ? ' | Esp: ' + l.especialidad : '');
    });
    if (!block.length) block = ['(Sin leads hoy)'];
    var max = block.slice(0, 100);

    /* CITAS AGENDADAS de este plantel */
    var citas = citasPorPlantel[canonPlantel(p)] || [];
    var cits = citas.map(function(c, i) {
      var telC = normTel(c[3]);
      var waC = telC ? 'https://wa.me/' + telC : '(sin telefono)';
      /* Las celdas de fecha/hora llegan como Date de Apps Script: formatear
         en vez de cortar el string (String(Date).slice(11,16) daba "1899").
         Si vienen como texto (día "sábado", "10:00:00") se respeta tal cual. */
      var fC = '';
      if (c[20]) {
        fC = (c[20] instanceof Date)
          ? Utilities.formatDate(c[20], 'America/Mexico_City', 'yyyy-MM-dd')
          : (horaMX(c[20]).slice(0, 10) || String(c[20]).slice(0, 10));
      }
      var hC = '';
      if (c[21]) {
        var sH = (c[21] instanceof Date)
          ? Utilities.formatDate(c[21], 'America/Mexico_City', 'HH:mm')
          : String(c[21]);
        hC = (sH.length >= 16) ? sH.slice(11, 16) : sH.slice(0, 5);
      }
      return (i+1)+'. ' + (c[2] || '(Por confirmar)') + ' | Cita: ' + (fC || 'por definir') + (hC ? ' ' + hC : '') + ' | wa.me: ' + waC + (c[5] ? ' | Esp: ' + c[5] : '');
    });
    if (!cits.length) cits = ['(Sin citas agendadas)'];
    var maxC = cits.slice(0, 60);

    var body = [
      'Hola encargado de ' + p + ',',
      '',
      'Resumen diario (unificado: web + chatbot)',
      'Leads nuevos hoy: ' + leads.length + ' | Citas agendadas: ' + citas.length,
      '',
      'LISTA DE LEADS (wa.me directo):',
      max.join('\n'),
      '',
      'CITAS AGENDADAS:',
      maxC.join('\n'),
      '',
      'Equipo Grupo Holandes'
    ].join('\n');
    correos.forEach(function(c){
      try {
        /* HTML con pixel de apertura (1x1) identificado por plantel+correo.
           El body de texto se conserva para clientes que no ven HTML. */
        var idEnv = p + '-' + new Date().getTime() + '-' + Math.random().toString(36).slice(2, 7);
        var pixel = URL_EXEC + '?action=abrir&key=' + TRACK_KEY +
          '&plantel=' + encodeURIComponent(p) +
          '&correo=' + encodeURIComponent(c) +
          '&id=' + encodeURIComponent(idEnv);
        var htmlBody = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111">' +
          body.split('\n').map(function(linea) {
            return linea ? linea.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '&nbsp;';
          }).join('<br>') +
          '<img src="' + pixel + '" width="1" height="1" alt="" style="border:0;display:block;opacity:0">' +
          '</div>';
        MailApp.sendEmail({ to: c, subject: 'Leads - ' + p + ' (grupo holandes)', body: body, htmlBody: htmlBody });
        rep.enviados++;
      } catch (err) { rep.faltantes.push(c + ' - ' + err); }
    });
    rep.planteles.push(p + ' (' + leads.length + ' leads, ' + citas.length + ' citas)');
  });
  Logger.log('BROADCAST LISTO: ' + JSON.stringify(rep));
  return rep;
}


/* ================================================================
   ENVIO DIARIO AUTOMATICO (disparador interno de Apps Script)
   - Corre UNA vez:  instalarBroadcastDiario()
   - Se ejecuta a las 7:00 AM hora de Mexico y SOLO envia
     lunes, miercoles y viernes (los demas dias se omite).
   - Idempotente: instalar de nuevo no duplica triggers.
   - Para quitarlo:  desinstalarBroadcastDiario()
   ================================================================ */
var DIAS_BROADCAST = [1, 3, 5]; // 1=lunes, 3=miercoles, 5=viernes (formato ISO-8601)

function instalarBroadcastDiario() {
  var viejos = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === 'broadcastDiario';
  });
  if (viejos.length) return 'ya instalado (' + viejos.length + ' trigger), no se duplica';
  ScriptApp.newTrigger('broadcastDiario')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .inTimezone('America/Mexico_City')
    .create();
  Logger.log('TRIGGER INSTALADO: broadcastDiario 7:00 AM MX, lun/mie/vie');
  return 'instalado: broadcastDiario 7:00 AM (lun, mie, vie)';
}

function desinstalarBroadcastDiario() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'broadcastDiario') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('TRIGGERS BORRADOS: ' + n);
  return 'borrados: ' + n;
}

/* Handler del trigger: valida dia y envia el reporte. */
function broadcastDiario() {
  var diaMx = parseInt(Utilities.formatDate(new Date(), 'America/Mexico_City', 'u'), 10); // 1=lun .. 7=dom
  if (DIAS_BROADCAST.indexOf(diaMx) < 0) {
    Logger.log('BROADCAST omitido (dia ' + diaMx + ' no esta en DIAS_BROADCAST)');
    return 'omitido: dia ' + diaMx;
  }
  Logger.log('BROADCAST automatico disparado (dia ' + diaMx + ')');
  return broadcastLeadsAEncargados();
}
