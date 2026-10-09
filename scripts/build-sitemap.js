/* Genera sitemap.xml a partir de los HTML públicos del repo.
   Re-ejecutar tras agregar páginas (blog, planteles, etc.):
     node scripts/build-sitemap.js */
const fs = require('fs');
const path = require('path');

const BASE = 'https://grupoholandes.com';
const ROOT = path.join(__dirname, '..');
const TODAY = new Date().toISOString().slice(0, 10);

const { ARTICLES } = require('../data/articles.js');
const fechaArt = Object.fromEntries(ARTICLES.map(a => [`/blog/${a.slug}`, a.fechaISO]));

/* Ruta amigable del archivo público (misma lógica que resolvePage/_redirects).
   Excluye paneles y cualquier página con meta robots noindex (campañas,
   galería, menú…): Google penaliza las URLs noindex dentro del sitemap. */
function routeOf(file) {
  const rel = '/' + path.relative(ROOT, file).split(path.sep).join('/');
  if (rel === '/index.html') return '/';
  if (rel.startsWith('/admin/') || rel.startsWith('/alumnos/')) return null;
  const html = fs.readFileSync(file, 'utf8');
  if (/name="robots"\s+content="[^"]*noindex/.test(html)) return null;
  return rel.replace(/\.html$/, '');
}

const prio = r =>
  r === '/' ? '1.0' :
  r === '/blog' || r.startsWith('/especialidades') || r === '/planteles' ? '0.8' :
  r.startsWith('/blog/') ? '0.7' :
  r.startsWith('/planteles/') || r.startsWith('/campanas/') ? '0.6' :
  '0.5';

const routes = [];
for (const dir of [ROOT, path.join(ROOT, 'planteles'), path.join(ROOT, 'especialidades'), path.join(ROOT, 'campanas'), path.join(ROOT, 'blog')]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.html')) continue;
    const r = routeOf(path.join(dir, f));
    if (r) routes.push(r);
  }
}
routes.sort();

const urls = routes.map(r => `  <url>\n    <loc>${BASE}${r}</loc>\n    <lastmod>${fechaArt[r] || TODAY}</lastmod>\n    <priority>${prio(r)}</priority>\n  </url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`OK sitemap.xml (${routes.length} URLs)`);
