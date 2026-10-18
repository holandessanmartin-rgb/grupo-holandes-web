/* Añade `<meta property="og:locale" content="es_MX">` a todo el HTML público
   que no lo tenga. Idempotente: los archivos ya correctos no se tocan.
   Excluye los paneles privados (no indexables).
   Uso: node scripts/og-locale.js [--dry]
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TAG = '<meta property="og:locale" content="es_MX">';

/* No indexables / privadas: no aporta nada y solo ensucian el diff. */
const EXCLUIR = /^(\.git|node_modules|out|deploy|scripts|img|css|js|data)/;
const PRIVADAS = /(^|\/)(admin|directivo|alumnos)(\/|$)/;

const dry = process.argv.includes('--dry');
const carpetas = ['.', 'especialidades', 'planteles', 'blog', 'campanas'];
let tocados = 0, yaEstaba = 0;

for (const dir of carpetas) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (!f.endsWith('.html')) continue;
    const rel = path.relative(ROOT, path.join(abs, f)).replace(/\\/g, '/');
    if (EXCLUIR.test(rel) || PRIVADAS.test(rel)) continue;

    const full = path.join(abs, f);
    let h = fs.readFileSync(full, 'utf8');
    if (h.includes('og:locale')) { yaEstaba++; continue; }

    let n = null;
    // 1) justo después de og:title (mantiene el bloque OpenGraph junto)
    const ogTitle = /(<meta property="og:title"[^>]*>\s*\r?\n)/;
    if (ogTitle.test(h)) {
      h = h.replace(ogTitle, `$1  ${TAG}\n`);
      n = 'tras og:title';
    } else {
      // 2) fallback: antes de </head>
      const head = /\r?\n<\/head>/;
      if (!head.test(h)) { console.log(`  ! sin </head>: ${rel}`); continue; }
      h = h.replace(head, `\n  ${TAG}\n</head>`);
      n = 'antes de </head>';
    }
    if (!dry) fs.writeFileSync(full, h, 'utf8');
    tocados++;
    console.log(`${dry ? 'DRY ' : 'OK  '} ${rel} (${n})`);
  }
}

console.log(`\n${tocados} archivo(s) ${dry ? 'por tocar' : 'actualizados'} · ${yaEstaba} ya lo tenían`);
