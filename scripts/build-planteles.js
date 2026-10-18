/* Genera planteles/<slug>.html para cada plantel desde los datos.
   Re-ejecutar cuando cambien campuses/specialties/courses:
     node scripts/build-planteles.js
   Las páginas quedan como archivos estáticos (funcionan en Netlify).
*/
const fs = require('fs');
const path = require('path');

const { getAllActiveCampuses } = require('../data/campuses.js');
const { getAllActiveSpecialties } = require('../data/specialties.js');
const { getAllActiveCourses } = require('../data/courses.js');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtPhone = w => {
  const d = String(w || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('52')) return '+52 ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8);
  return d ? '+' + d : '';
};

/* Title y description pensados para Google, no para el archivo:
   - `nombreCorto` quita el subtítulo cuando el nombre es largo (CEMAS), para que
     el title no supere los 60 caracteres ni la description los 165;
   - la description omite la dirección completa (eso vive en el cuerpo de la
     página), porque con direcciones largas se pasaba de 165. */
const nombreCorto = c => String(c.nombre).replace(/\s*[—-]\s*.*$/, '');

const titlePlantel = c => `${nombreCorto(c)} | Grupo Holandés`;

function descPlantel(c) {
  const conCiudad = c.nombre.includes(c.ciudad) ? '' : `, ${c.ciudad}`;
  const n = (c.especialidades || []).length;
  const esp = n === 1 ? '1 especialidad' : `${n} especialidades`;
  return `${nombreCorto(c)}${conCiudad}, ${c.estado}. ${esp} con plan de estudios por módulos, horarios y WhatsApp del plantel. Agenda tu visita.`;
}

function mapsUrl(c) {
  if (c.mapsUrl) return c.mapsUrl;
  if (typeof c.latitud === 'number') return `https://www.google.com/maps/dir/?api=1&destination=${c.latitud},${c.longitud}`;
  return '#';
}

const thumbOf = src => src.replace(/\/([^/]+)$/, '/thumbs/$1');

/* ================= texto local (Fase 2 de SEO, 18/10/2026) =================
   Las 19 fichas tenían 187 palabras y no nombraban la ciudad más allá de la
   dirección: no competían por "escuela de mecánica en <ciudad>", que ya trae
   impresiones en Search Console. Todo lo de aquí abajo se genera SOLO con lo
   que ya está en campuses.js y specialties.js — nada de texto inventado. */

/* Orden por cercanía con la fórmula haversine sobre las coordenadas del propio
   archivo. La distancia NO se publica: es línea recta, no la de conducir, así
   que solo sirve para ordenar la lista. */
function porCercania(base, lista) {
  const R = 6371;
  const rad = d => (d * Math.PI) / 180;
  const km = c => {
    const a = Math.sin(rad(c.latitud - base.latitud) / 2) ** 2
      + Math.cos(rad(base.latitud)) * Math.cos(rad(c.latitud))
      * Math.sin(rad(c.longitud - base.longitud) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  return lista
    .filter(c => typeof c.latitud === 'number' && typeof base.latitud === 'number')
    .sort((x, y) => km(x) - km(y));
}

function listaEspecialidades(specs) {
  if (!specs.length) return '';
  // El detalle (p. ej. "9 cuatrimestres") ya va en la lista de abajo: aquí se
  // deja solo la duración principal para no dejar paréntesis anidados.
  const t = specs.map(s => s.nombre + (s.duracion ? ` (${s.duracion.replace(/\s*\([^)]*\)\s*/g, ' ').trim()})` : '')).join(', ');
  return t.replace(/, ([^,]*)$/, ' y $1');
}

/* Preguntas locales: cambian por plantel (nombre, dirección, especialidades y
   horario), así las 19 páginas no quedan con el mismo texto copiado. */
function faqLocal(c, specs) {
  const f = [{
    q: `¿Dónde está el ${c.nombre}?`,
    a: `En ${c.direccion}. ${c.referencia ? 'Referencia: ' + c.referencia + '. ' : ''}Ciudad o municipio: ${c.ciudad}, ${c.estado}.`
  }];
  if (specs.length) f.push({
    q: `¿Qué especialidades se estudian en el ${c.nombre}?`,
    a: `${listaEspecialidades(specs)}. Todas llevan plan de estudios por módulos y clases 90% prácticas sobre vehículos reales.`
  });
  if (c.horario) f.push({
    q: `¿Cuál es el horario del ${c.nombre}?`,
    a: `${c.horario}. Antes de venir, confirma la disponibilidad por WhatsApp del plantel.`
  });
  f.push({
    q: `¿Cómo llego al ${c.nombre}?`,
    a: `La dirección es ${c.direccion}, en ${c.ciudad}, ${c.estado}. En esta página hay un botón de "Cómo llegar" que abre Google Maps desde tu ubicación.`
  });
  f.push({
    q: `¿Puedo visitar el ${c.nombre} antes de inscribirme?`,
    a: 'Sí. Puedes agendar una visita sin compromiso, conocer las instalaciones, ver los vehículos con los que se practica y hablar con los instructores antes de decidir.'
  });
  if (c.whatsapp || c.email) f.push({
    q: `¿Cómo solicito información del ${c.nombre}?`,
    a: `Escríbenos${c.whatsapp ? ` por WhatsApp al ${fmtPhone(c.whatsapp)}` : ''}${c.whatsapp && c.email ? ' o' : ''}${c.email ? ` al correo ${c.email}` : ''}. También puedes llenar el formulario de inscripción y el plantel te contacta.`
  });
  return f;
}

function bloqueLocal(c, specs, todos, totalNacional) {
  const enEstado = todos.filter(x => x.estado === c.estado);
  const cerca = porCercania(c, enEstado.filter(x => x.slug !== c.slug)).slice(0, 6);
  const nEstado = enEstado.length;
  const ciudad = c.ciudad;

  const intro = `El <strong>${esc(c.nombre)}</strong> es el centro de formación técnica de Grupo Holandés en ${esc(ciudad)}, ${esc(c.estado)}. Está en ${esc(c.direccion)}${c.referencia ? ' · referencia: ' + esc(c.referencia) : ''}. ${
    nEstado > 1
      ? `Es 1 de los ${nEstado} planteles que el grupo tiene en ${esc(c.estado)}.`
      : `Es el único plantel de Grupo Holandés en ${esc(c.estado)}.`
  } En total operan ${totalNacional} planteles en México.`;

  const estudiar = specs.length
    ? `<p>En este plantel se imparten <strong>${specs.length} ${specs.length === 1 ? 'especialidad' : 'especialidades'}</strong>: ${esc(listaEspecialidades(specs))}.</p>
    <h3>Qué se estudia en ${esc(ciudad)}</h3>
    <ul class="mod-list">
      ${specs.map(s => `<li>${s.icon} <strong><a href="/especialidades/${s.slug}">${esc(s.nombre)}</a></strong> — ${esc(s.duracion)}${s.rvoe && String(s.rvoe).toLowerCase() !== 'consultar' ? ` · RVOE ${esc(s.rvoe)}` : ''}<br><span class="muted">${esc(s.descripcionCorta)}</span></li>`).join('')}
    </ul>`
    : '<p>Consulta por WhatsApp la disponibilidad de especialidades en este plantel.</p>';

  const vecinos = cerca.length
    ? `<h3>Planteles de ${esc(c.estado)}, de más cercano a más lejano</h3>
    <ul class="mod-list">
      ${cerca.map(x => `<li>📍 <a href="/planteles/${x.slug}">${esc(x.nombre)}</a> — ${esc(x.ciudad)}</li>`).join('')}
    </ul>
    <p class="muted">¿No te queda bien? <a href="/planteles#buscar">Busca el plantel más cercano a tu ubicación</a> entre los ${totalNacional} del grupo.</p>`
    : `<p class="muted">Es el único plantel de Grupo Holandés en ${esc(c.estado)}. Consulta las <a href="/planteles">${totalNacional} sedes del grupo</a>.</p>`;

  return `
  <section class="plantel-local">
    <h2>Escuela de mecánica en ${esc(ciudad)}, ${esc(c.estado)}</h2>
    <p>${intro}</p>
    ${estudiar}
    ${c.horario ? `<h3>Horarios en ${esc(ciudad)}</h3><p>🕐 ${esc(c.horario)}</p>` : ''}
    ${vecinos}
  </section>`;
}

/* <details>/<summary>, igual que el FAQ del home: abre y cierra con HTML
   nativo, así que el contenido se lee aunque no corra JavaScript. */
function faqHtmlLocal(faqs) {
  if (!faqs.length) return '';
  return `
  <h2 style="margin-top:28px">Preguntas frecuentes de este plantel</h2>
  <div class="faq-container">${faqs.map(f => `
    <details class="faq-item"><summary class="faq-question">${esc(f.q)} <span class="arrow">▼</span></summary>
    <div class="faq-answer"><p>${esc(f.a)}</p></div></details>`).join('')}</div>`;
}

function faqLdLocal(faqs) {
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  };
}

/* Collage "El taller": hero + miniaturas con badge hacia la galería completa. */
function collage(c) {
  const imgs = c.imagenes || [];
  if (!imgs.length) return '';
  const n = imgs.length;
  const show = imgs.slice(0, Math.min(n, 4));
  const cls = n >= 4 ? 'n4' : 'n' + n;
  const cells = show.map((src, i) =>
    `<img src="/${thumbOf(src)}" srcset="/${thumbOf(src)} 640w, /${src} 1400w" sizes="(max-width: 900px) 94vw, 330px" alt="${esc(c.nombre)} - foto ${i + 1}" loading="lazy" decoding="async">`).join('');
  return `<a class="taller-collage ${cls}" href="/galeria?plantel=${c.slug}" target="_blank" rel="noopener" aria-label="Ver galería completa de ${esc(c.nombre)} (${n} fotos)">${cells}<span class="taller-badge">📸 Ver galería · ${n} fotos</span></a>`;
}

function page(c, specialties, courses, todos, totalNacional) {
  const specs = specialties.filter(s => (c.especialidades || []).includes(s.id));
  const hasPhotos = (c.imagenes || []).length > 0;
  const faqs = faqLocal(c, specs);
  const faqLd = faqLdLocal(faqs);
  const sameAs = [c.facebook, c.instagram, c.tiktok].filter(Boolean);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `Grupo Holandés — ${c.nombre}`,
    url: `https://grupoholandes.com/planteles/${c.slug}`,
    telephone: c.whatsapp ? '+' + c.whatsapp : undefined,
    image: hasPhotos ? `https://grupoholandes.com/${(c.imagenes || [])[0]}` : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.direccion,
      addressLocality: c.ciudad,
      addressRegion: c.estado,
      addressCountry: 'MX'
    },
    geo: (typeof c.latitud === 'number' && typeof c.longitud === 'number')
      ? { '@type': 'GeoCoordinates', latitude: c.latitud, longitude: c.longitud }
      : undefined,
    hasMap: mapsUrl(c) !== '#' ? mapsUrl(c) : undefined,
    sameAs: sameAs.length ? sameAs : undefined
  };
  Object.keys(schema).forEach(k => schema[k] === undefined && delete schema[k]);
  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(titlePlantel(c))}</title>
  <link rel="canonical" href="https://grupoholandes.com/planteles/${c.slug}">
  <meta name="description" content="${esc(descPlantel(c))}">
  <meta property="og:title" content="${esc(titlePlantel(c))}">
  <meta property="og:description" content="${esc(descPlantel(c))}">
  <meta property="og:locale" content="es_MX">
  <meta property="og:image" content="https://grupoholandes.com/img/logotipo.png">
  <meta property="og:url" content="https://grupoholandes.com/planteles/${c.slug}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/img/logotipo.png" type="image/png">
  <link rel="stylesheet" href="/css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script type="application/ld+json">
  ${JSON.stringify(schema)}
  </script>${faqLd ? `
  <script type="application/ld+json">
  ${JSON.stringify(faqLd)}
  </script>` : ''}
</head>
<body>
<div id="gh-header"></div>
<div class="page-hero"><div class="container">
  <h1>Plantel <span class="highlight">${esc(c.nombre.replace(/^Plantel\s+/i, ''))}</span></h1>
  <p>${esc(c.direccion)}${c.referencia ? ' · ' + esc(c.referencia) : ''}, ${esc(c.ciudad)}, ${esc(c.estado)}.${c.whatsapp ? `<br>💬 WhatsApp: ${esc(fmtPhone(c.whatsapp))}` : ''}</p>
  <p><a href="/registro?plantel=${c.id}" class="btn-primary">Solicitar información</a> <a href="${mapsUrl(c)}" target="_blank" rel="noopener" class="btn-outline">🗺️ Cómo llegar</a> ${hasPhotos ? `<a href="/galeria?plantel=${c.slug}" target="_blank" rel="noopener" class="btn-outline">📸 Ver galería</a>` : ''}</p>
</div></div>
<main class="page-body"><div class="container">
  ${bloqueLocal(c, specs, todos, totalNacional)}
  <div class="two-col">
    <div>
      <h2>Especialidades disponibles</h2>
      <div class="grid-cards" style="margin-top:12px">
        ${specs.map(s => `<div class="info-card"><div class="service-icon">${s.icon}</div><h3>${esc(s.nombre)}</h3><p class="muted">⏱ ${esc(s.duracion)}${s.rvoe ? ` · 📜 RVOE ${esc(s.rvoe)}` : ''}</p><p><a class="btn-primary btn-sm" href="/especialidades/${s.slug}">Ver especialidad</a></p></div>`).join('') || '<p class="muted">Consultar disponibilidad.</p>'}
      </div>
      <h2 style="margin-top:28px">Cursos en este plantel</h2>
      ${courses.length ? `<div class="grid-cards" style="margin-top:12px">` + courses.map(x => `<div class="info-card"><div class="service-icon">${x.icon}</div><h3>${esc(x.nombre)}</h3><p class="muted">📅 ${esc(x.fecha)} · ⏱ ${esc(x.duracion)}<br>🕐 ${esc(x.horario)} · 💰 ${esc(x.precio)} · 👥 Cupo: ${x.cupo}</p><p><a class="btn-primary btn-sm" href="/cursos">Ver detalle e inscribirme</a></p></div>`).join('') + `</div>` : '<p class="muted">Por el momento no hay cursos programados aquí. Pregunta por WhatsApp los próximos.</p>'}
      <h2 style="margin-top:28px">Horarios</h2>
      <p>🕐 ${esc(c.horario || 'Consultar horarios en plantel')}</p>
      ${(c.requisitos || []).length ? `<h2 style="margin-top:28px">Requisitos de inscripción</h2><ul class="mod-list">${c.requisitos.map(r => `<li>📄 ${esc(r)}</li>`).join('')}</ul>` : ''}
      ${c.whatsapp || c.email ? `<h2 style="margin-top:28px">Contacto directo</h2><p>${c.whatsapp ? `💬 <a href="https://api.whatsapp.com/send?phone=${esc(c.whatsapp)}" target="_blank" rel="noopener">${esc(fmtPhone(c.whatsapp))}</a><br>` : ''}${c.email ? `📧 ${esc(c.email)}` : ''}</p>` : ''}
      ${c.facebook || c.tiktok || c.instagram ? `<h2 style="margin-top:28px">Síguenos</h2><p>${c.facebook ? `<a href="${esc(c.facebook)}" target="_blank" rel="noopener">📘 Facebook</a> ` : ''}${c.tiktok ? `<a href="${esc(c.tiktok)}" target="_blank" rel="noopener">🎵 TikTok</a> ` : ''}${c.instagram ? `<a href="${esc(c.instagram)}" target="_blank" rel="noopener">📸 Instagram</a>` : ''}</p>` : ''}
    </div>
    <div>
      <h2>El taller</h2>
      ${hasPhotos
        ? collage(c)
        : `<div class="info-card"><h3>📸 Fotos próximamente</h3><p>Agenda una visita y conoce el taller en persona.</p><p><a class="btn-primary btn-sm" href="/citas">Agendar visita</a></p></div>`}
    </div>
  </div>
  ${faqHtmlLocal(faqs)}
  <div class="cta-band"><p><strong>¿Vienes a conocernos?</strong></p><p><a href="/citas" class="btn-outline">Agendar visita</a> <a href="/registro?plantel=${c.id}" class="btn-primary">Quiero inscribirme</a></p></div>
  <p style="text-align:center;margin-top:16px"><a href="/planteles">← Ver todos los planteles</a></p>
</div></main>
<div id="gh-footer"></div>
<script src="/data/app-config.js"></script>
<script src="/data/campuses.js"></script>
<script src="/data/specialties.js"></script>
<script src="/js/app.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  try { GH.setContext('${c.id}', []); } catch (e) {}
});
</script>
</body>
</html>
`;
}

const outDir = path.join(__dirname, '..', 'planteles');
const campuses = getAllActiveCampuses();
const specs = getAllActiveSpecialties();
const allCourses = getAllActiveCourses();
const { getCoursesForCampus } = require('../data/courses.js');

let n = 0;
for (const c of campuses) {
  const html = page(c, specs, getCoursesForCampus(c.id), campuses, campuses.length);
  fs.writeFileSync(path.join(outDir, `${c.slug}.html`), html, 'utf8');
  n++;
}
console.log(`OK: ${n} páginas de plantel generadas en planteles/`);
