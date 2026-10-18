/* Auditoría SEO del HTML estático (lo que Google rastrea sin ejecutar JS).
   Comprueba por página: title, meta description, canonical, og:locale,
   H1 único, <div> equilibrados, JSON-LD válido, imágenes sin alt y
   un mínimo de palabras. Uso: node scripts/audit-seo.js [--json]

   Fallback de exit code 1 si algo falla → sirve para CI. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://grupoholandes.com';

/* Páginas con su mínimo de palabras estáticas y nº esperado de H1.
   Los mínimos son deliberadamente bajos: solo atrapan regresiones. */
const PAGES = [
  { url: '/', file: 'index.html', minPalabras: 150 },
  { url: '/especialidades', file: 'especialidades.html', minPalabras: 300 },
  { url: '/especialidades/mecanica-automotriz', file: 'especialidades/mecanica-automotriz.html', minPalabras: 450 },
  { url: '/especialidades/mecanica-motocicletas', file: 'especialidades/mecanica-motocicletas.html', minPalabras: 450 },
  { url: '/especialidades/mecanica-diesel', file: 'especialidades/mecanica-diesel.html', minPalabras: 400 },
  { url: '/especialidades/electronica-automotriz', file: 'especialidades/electronica-automotriz.html', minPalabras: 400 },
  { url: '/especialidades/licenciatura-mecanica-automotriz', file: 'especialidades/licenciatura-mecanica-automotriz.html', minPalabras: 400 },
  { url: '/planteles', file: 'planteles.html', minPalabras: 600 },
  { url: '/planteles/santa-maria-del-tule', file: 'planteles/santa-maria-del-tule.html', minPalabras: 150 },
  { url: '/blog', file: 'blog.html', minPalabras: 200 },
  { url: '/blog/escuela-de-mecanica-automotriz', file: 'blog/escuela-de-mecanica-automotriz.html', minPalabras: 800 },
  { url: '/blog/cuanto-dura-carrera-mecanica-automotriz', file: 'blog/cuanto-dura-carrera-mecanica-automotriz.html', minPalabras: 500 },
  { url: '/blog/escuela-de-mecanica-automotriz-en-oaxaca', file: 'blog/escuela-de-mecanica-automotriz-en-oaxaca.html', minPalabras: 500 },
  { url: '/admisiones', file: 'admisiones.html', minPalabras: 150 },
  { url: '/nosotros', file: 'nosotros.html', minPalabras: 150 },
  { url: '/cursos', file: 'cursos.html', minPalabras: 150 },
  { url: '/contacto', file: 'contacto.html', minPalabras: 80 },
];

const stripTags = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const json = process.argv.includes('--json');
const out = [];
let fails = 0;

for (const p of PAGES) {
  const f = path.join(ROOT, p.file);
  if (!fs.existsSync(f)) { out.push({ url: p.url, error: 'archivo no existe' }); fails++; continue; }
  const h = fs.readFileSync(f, 'utf8');
  const probs = [];

  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (!title) probs.push('sin <title>');
  else if (title.length < 25 || title.length > 65) probs.push(`title ${title.length} caracteres (25–65)`);
  if (title && !/holand/i.test(title)) probs.push('title sin la marca');

  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (!desc) probs.push('sin meta description');
  else if (desc.length < 110 || desc.length > 165) probs.push(`description ${desc.length} caracteres (110–165)`);

  const canon = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
  if (!canon) probs.push('sin canonical');
  else if (!canon.startsWith(BASE)) probs.push(`canonical fuera del dominio: ${canon}`);

  if (!/og:locale" content="es_MX"/.test(h)) probs.push('sin og:locale es_MX');

  const h1s = [...h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map(m => stripTags(m[1]));
  if (h1s.length !== 1) probs.push(`${h1s.length} etiquetas H1`);

  const palabras = stripTags(h).split(' ').filter(Boolean).length;
  if (palabras < p.minPalabras) probs.push(`${palabras} palabras (< ${p.minPalabras})`);

  const abre = (h.match(/<div\b/g) || []).length;
  const cierra = (h.match(/<\/div>/g) || []).length;
  if (abre !== cierra) probs.push(`<div> desbalanceados ${abre}/${cierra}`);

  const sinAlt = (h.match(/<img(?![^>]*\balt=)[^>]*>/g) || []).length;
  if (sinAlt) probs.push(`${sinAlt} imágenes sin alt`);

  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { probs.push('JSON-LD inválido'); }
  }

  if (!h.trim().endsWith('</html>')) probs.push('HTML mal cerrado');

  out.push({ url: p.url, title, palabras, h1: h1s[0] || '', problemas: probs });
  if (probs.length) fails++;
}

if (json) {
  console.log(JSON.stringify(out, null, 2));
} else {
  for (const r of out) {
    if (r.error) { console.log(`FALLO ${r.url} — ${r.error}`); continue; }
    console.log(`${r.problemas.length ? 'FALLO' : 'OK   '} ${r.url} · ${r.palabras} pal · "${r.title.slice(0, 48)}"`);
    for (const p of r.problemas) console.log(`        → ${p}`);
  }
  console.log(fails ? `\n${fails} PÁGINA(S) CON PROBLEMAS` : '\nTODO OK');
}
process.exit(fails ? 1 : 0);
