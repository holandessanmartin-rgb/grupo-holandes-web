/* Genera blog/<slug>.html y blog.html desde data/articles.js.
   Re-ejecutar cuando cambie el contenido:
     node scripts/build-blog.js
   Páginas estáticas: rastreables sin JavaScript y válidas en Netlify/Hostinger
   (requiere regla /blog/* en _redirects). */
const fs = require('fs');
const path = require('path');

const { ARTICLES } = require('../data/articles.js');

const BASE = 'https://grupoholandes.com';
const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const MIN_PER_WORD = 200; // palabras por minuto estimadas de lectura

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stripTags = html => String(html || '').replace(/<[^>]*>/g, ' ');

const wordCount = html => stripTags(html).split(/\s+/).filter(Boolean).length;

/* Expande marcadores {{fig:carpeta/arch.jpg | alt | caption}} y
   {{img:carpeta/arch.jpg | alt}} con thumbs + srcset (patrón de galerías).
   {{fig:}} acepta también 2 campos (src | alt, sin pie de foto). */
function expandImgs(body) {
  const fig = (s, a, c) => {
    const thumb = s.replace(/\/([^/]+)$/, '/thumbs/$1');
    const cap = c ? `<figcaption>${esc(c.trim())}</figcaption>` : '';
    return `<figure class="art-fig"><img src="/img/planteles/${s}" srcset="/img/planteles/${thumb} 640w, /img/planteles/${s} 1400w" sizes="(max-width: 900px) 94vw, 720px" alt="${esc(a.trim())}" loading="lazy" decoding="async">${cap}</figure>`;
  };
  return body
    .replace(/\{\{fig:\s*([^|{}]+?)\s*\|\s*([^|{}]+?)\s*\|\s*([^|{}]+?)\s*\}\}/g, (_, src, alt, cap) => fig(src, alt, cap))
    .replace(/\{\{fig:\s*([^|{}]+?)\s*\|\s*([^|{}]+?)\s*\}\}/g, (_, src, alt) => fig(src, alt, ''))
    .replace(/\{\{img:\s*([^|{}]+?)\s*\|\s*([^|{}]+?)\s*\}\}/g, (_, src, alt) => fig(src, alt, ''));
}

/* Verifica que cada imagen referenciada exista (base y thumb). */
function checkImgs(a) {
  const refs = [...a.body.matchAll(/\{\{(?:fig|img):\s*([^|{}]+?)\s*(?:\||\}\})/g)].map(m => m[1].trim());
  if (a.hero) refs.push(a.hero);
  for (const src of refs) {
    const full = path.join(ROOT, 'img', 'planteles', src);
    const thumb = path.join(ROOT, 'img', 'planteles', src.replace(/\/([^/]+)$/, '/thumbs/$1'));
    if (!fs.existsSync(full)) throw new Error(`[${a.slug}] imagen faltante: img/planteles/${src}`);
    if (!fs.existsSync(thumb)) throw new Error(`[${a.slug}] thumb faltante: img/planteles/${src.replace(/\/([^/]+)$/, '/thumbs/$1')}`);
  }
}

function tocFrom(body) {
  const out = [];
  for (const m of body.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)) out.push({ id: m[1], label: m[2] });
  return out;
}

function articlePage(a) {
  const url = `${BASE}/blog/${a.slug}`;
  const words = wordCount(a.body);
  const mins = Math.max(1, Math.round(words / MIN_PER_WORD));
  const heroThumb = a.hero.replace(/\/([^/]+)$/, '/thumbs/$1');
  const body = expandImgs(a.body);
  const toc = tocFrom(a.body);
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: a.faq.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: stripTags(f.a) }
    }))
  };
  const postLd = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: a.titulo, description: a.metaDesc,
    image: `${BASE}/img/planteles/${a.hero}`,
    datePublished: a.fechaISO,
    inLanguage: 'es-MX',
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Grupo Holandés' },
    publisher: {
      '@type': 'EducationalOrganization', name: 'Grupo Holandés',
      logo: { '@type': 'ImageObject', url: `${BASE}/img/logotipo.png` }
    }
  };
  const crumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
      { '@type': 'ListItem', position: 3, name: a.titulo, item: url }
    ]
  };
  const tocHtml = toc.length >= 4
    ? `<nav class="art-toc" aria-label="Índice del artículo"><strong>En este artículo</strong><ul>${toc.map(t => `<li><a href="#${t.id}">${esc(t.label)}</a></li>`).join('')}</ul></nav>`
    : '';
  const faqHtml = a.faq.map(f => `<h3>${esc(f.q)}</h3><p>${f.a}</p>`).join('\n');

  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(a.metaTitle)} | Grupo Holandés</title>
  <link rel="canonical" href="${url}">
  <meta name="description" content="${esc(a.metaDesc)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(a.titulo)} | Grupo Holandés">
  <meta property="og:description" content="${esc(a.metaDesc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${BASE}/img/planteles/${a.hero}">
  <meta property="article:published_time" content="${a.fechaISO}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(a.titulo)} | Grupo Holandés">
  <meta name="twitter:image" content="${BASE}/img/planteles/${a.hero}">
  <link rel="icon" href="/img/logotipo.png" type="image/png">
  <link rel="stylesheet" href="/css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script type="application/ld+json">${JSON.stringify(postLd)}</script>
  <script type="application/ld+json">${JSON.stringify(crumbLd)}</script>
  <script type="application/ld+json">${JSON.stringify(faqLd)}</script>
</head>
<body>
<div id="gh-header"></div>
<div class="page-hero"><div class="container">
  <nav class="art-crumb" aria-label="Migas de pan"><a href="/">Inicio</a> › <a href="/blog">Blog</a> › <span>${esc(a.categoria)}</span></nav>
  <h1>${esc(a.titulo)}</h1>
  <p class="art-meta">📅 ${esc(a.fechaTexto)} · 🏷 ${esc(a.categoria)} · 📖 ${mins} min de lectura</p>
</div></div>
<main class="page-body"><div class="container art-wrap">
  ${tocHtml}
  <article class="art-body">
${body}
  </article>
  <section class="art-faq" aria-label="Preguntas frecuentes">
    <h2 id="faq">Preguntas frecuentes</h2>
${faqHtml}
  </section>
  <div class="cta-band art-cta">
    <p><strong>¿Quieres verlo en persona?</strong></p>
    <p><a href="/citas" class="btn-outline">Agendar visita</a> <a href="/registro" class="btn-primary">Solicitar información</a></p>
  </div>
  <p style="text-align:center;margin-top:18px"><a href="/blog">← Volver al blog</a></p>
</div></main>
<div id="gh-footer"></div>
<script src="/data/app-config.js"></script>
<script src="/data/campuses.js"></script>
<script src="/data/specialties.js"></script>
<script src="/js/app.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  try { GHtrack('article_view', { article: '${a.slug}' }); } catch (e) {}
  var cta = document.querySelector('.art-cta');
  if (cta) {
    cta.querySelectorAll('a').forEach(function (el) {
      el.addEventListener('click', function () {
        try { GHtrack('article_cta_click', { article: '${a.slug}', label: el.getAttribute('href') }); } catch (e) {}
      });
    });
  }
});
</script>
</body>
</html>
`;
}

function blogIndex(articles) {
  const listLd = {
    '@context': 'https://schema.org', '@type': 'Blog',
    name: 'Blog de Grupo Holandés',
    url: `${BASE}/blog`,
    inLanguage: 'es-MX',
    blogPost: articles.map(a => ({
      '@type': 'BlogPosting',
      headline: a.titulo,
      url: `${BASE}/blog/${a.slug}`,
      datePublished: a.fechaISO,
      image: `${BASE}/img/planteles/${a.hero}`
    }))
  };
  const crumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` }
    ]
  };
  const cards = articles.map(a => {
    const thumb = a.hero.replace(/\/([^/]+)$/, '/thumbs/$1');
    return `  <article class="blog-card">
    <a href="/blog/${a.slug}" aria-label="${esc(a.titulo)}"><img class="blog-thumb" src="/img/planteles/${thumb}" srcset="/img/planteles/${thumb} 640w, /img/planteles/${a.hero} 1400w" sizes="(max-width: 900px) 94vw, 330px" alt="${esc(a.heroAlt)}" loading="lazy" decoding="async"></a>
    <span class="blog-cat">${esc(a.categoria)}</span>
    <time datetime="${a.fechaISO}">${esc(a.fechaTexto)}</time>
    <h3><a href="/blog/${a.slug}">${esc(a.titulo)}</a></h3>
    <p>${esc(a.extracto)}</p>
    <p><a href="/blog/${a.slug}">Leer artículo →</a></p>
  </article>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog y noticias | Grupo Holandés</title>
  <link rel="canonical" href="${BASE}/blog">
  <meta name="description" content="Guías de mecánica automotriz y motos, costos de formación, consejos de taller y vida en los planteles de Grupo Holandés.">
  <meta property="og:title" content="Blog y noticias | Grupo Holandés">
  <meta property="og:description" content="Guías de mecánica automotriz y motos, costos de formación, consejos de taller y vida en los planteles de Grupo Holandés.">
  <meta property="og:url" content="${BASE}/blog">
  <meta property="og:image" content="${BASE}/img/logotipo.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Blog y noticias | Grupo Holandés">
  <meta name="twitter:image" content="${BASE}/img/logotipo.png">
  <link rel="icon" href="/img/logotipo.png" type="image/png">
  <link rel="stylesheet" href="/css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script type="application/ld+json">${JSON.stringify(listLd)}</script>
  <script type="application/ld+json">${JSON.stringify(crumbLd)}</script>
</head>
<body>
<div id="gh-header"></div>
<div class="page-hero"><div class="container"><h1>Blog y <span class="highlight">noticias</span></h1><p>Guías prácticas de mecánica, formación y taller desde los planteles de Grupo Holandés.</p></div></div>
<main class="page-body"><div class="container">
  <div class="blog-grid">
${cards}
  </div>
  <div class="cta-band"><p><strong>¿Quieres aprender haciendo?</strong></p><p><a href="/planteles" class="btn-outline">Ver planteles</a> <a href="/citas" class="btn-primary">Agendar visita</a></p></div>
</div></main>
<div id="gh-footer"></div>
<script src="/data/app-config.js"></script>
<script src="/data/campuses.js"></script>
<script src="/data/specialties.js"></script>
<script src="/js/app.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  try { GHtrack('page_view', { page: 'blog' }); } catch (e) {}
});
</script>
</body>
</html>
`;
}

/* ---------- main ---------- */
for (const a of ARTICLES) checkImgs(a);
fs.mkdirSync(BLOG_DIR, { recursive: true });
let n = 0;
for (const a of ARTICLES) {
  fs.writeFileSync(path.join(BLOG_DIR, `${a.slug}.html`), articlePage(a), 'utf8');
  n++;
  console.log(`OK blog/${a.slug}.html (${wordCount(a.body)} palabras)`);
}
fs.writeFileSync(path.join(ROOT, 'blog.html'), blogIndex(ARTICLES), 'utf8');
console.log(`OK blog.html (${n} artículos listados)`);
