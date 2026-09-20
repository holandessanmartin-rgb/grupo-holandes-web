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

function mapsUrl(c) {
  if (c.mapsUrl) return c.mapsUrl;
  if (typeof c.latitud === 'number') return `https://www.google.com/maps/dir/?api=1&destination=${c.latitud},${c.longitud}`;
  return '#';
}

function page(c, specialties, courses) {
  const specs = specialties.filter(s => (c.especialidades || []).includes(s.id));
  const hasPhotos = (c.imagenes || []).length > 0;
  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(c.nombre)} | Grupo Holandés</title>
  <meta name="description" content="${esc(c.nombre)}: ${esc(c.direccion)}, ${esc(c.ciudad)}. Especialidades, horarios, WhatsApp y cómo llegar.">
  <meta property="og:title" content="${esc(c.nombre)} | Grupo Holandés">
  <meta property="og:image" content="/img/logotipo.png">
  <link rel="stylesheet" href="/css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"LocalBusiness","name":"Grupo Holandés — ${esc(c.nombre)}","telephone":"${esc(c.telefono || '')}","address":{"@type":"PostalAddress","streetAddress":"${esc(c.direccion)}","addressLocality":"${esc(c.ciudad)}","addressRegion":"${esc(c.estado)}","addressCountry":"MX"}}
  </script>
</head>
<body>
<div id="gh-header"></div>
<div class="page-hero"><div class="container">
  <h1>Plantel <span class="highlight">${esc(c.nombre.replace(/^Plantel\\s+/i, ''))}</span></h1>
  <p>${esc(c.direccion)}${c.referencia ? ' · ' + esc(c.referencia) : ''}, ${esc(c.ciudad)}, ${esc(c.estado)}.${c.telefono ? `<br>📞 ${esc(c.telefono)}` : ''}${c.whatsapp ? ` · 💬 ${esc(c.whatsapp)}` : ''}</p>
  <p><a href="/registro?plantel=${c.id}" class="btn-primary">Solicitar información</a> <a href="${mapsUrl(c)}" target="_blank" rel="noopener" class="btn-outline">🗺️ Cómo llegar</a> <a href="/galeria?plantel=${c.slug}" target="_blank" rel="noopener" class="btn-outline">📸 Ver galería</a></p>
</div></div>
<main class="page-body"><div class="container">
  <div class="two-col">
    <div>
      <h2>Especialidades disponibles</h2>
      <div class="grid-cards" style="margin-top:12px">
        ${specs.map(s => `<div class="info-card"><div class="service-icon">${s.icon}</div><h3>${esc(s.nombre)}</h3><p class="muted">⏱ ${esc(s.duracion)}</p><p><a class="btn-primary btn-sm" href="/especialidades/${s.slug}">Ver especialidad</a></p></div>`).join('') || '<p class="muted">Consultar disponibilidad.</p>'}
      </div>
      <h2 style="margin-top:28px">Cursos en este plantel</h2>
      ${courses.length ? `<div class="grid-cards" style="margin-top:12px">` + courses.map(x => `<div class="info-card"><div class="service-icon">${x.icon}</div><h3>${esc(x.nombre)}</h3><p class="muted">📅 ${esc(x.fecha)} · ⏱ ${esc(x.duracion)}<br>🕐 ${esc(x.horario)} · 💰 ${esc(x.precio)} · 👥 Cupo: ${x.cupo}</p><p><a class="btn-primary btn-sm" href="/cursos">Ver detalle e inscribirme</a></p></div>`).join('') + `</div>` : '<p class="muted">Por el momento no hay cursos programados aquí. Pregunta por WhatsApp los próximos.</p>'}
      <h2 style="margin-top:28px">Horarios</h2>
      <p>🕐 ${esc(c.horario || 'Consultar horarios en plantel')}</p>
      ${c.telefono || c.email ? `<h2 style="margin-top:28px">Contacto directo</h2><p>${c.telefono ? `📞 <a href="tel:${esc(c.telefono.replace(/\\s/g, ''))}">${esc(c.telefono)}</a><br>` : ''}${c.email ? `📧 ${esc(c.email)}` : ''}</p>` : ''}
    </div>
    <div>
      <h2>El taller</h2>
      ${hasPhotos
        ? `<p><a class="btn-map btn-map-other btn-sm" href="/galeria?plantel=${c.slug}" target="_blank" rel="noopener">📸 Ver galería completa (${c.imagenes.length} fotos)</a></p>` + c.imagenes.slice(0, 2).map((src, i) => `<p><img src="/${src}" alt="${esc(c.nombre)} - foto ${i + 1}" style="border-radius:12px" loading="lazy"></p>`).join('')
        : `<div class="info-card"><h3>📸 Fotos próximamente</h3><p>Agenda una visita y conoce el taller en persona.</p><p><a class="btn-primary btn-sm" href="/citas">Agendar visita</a></p></div>`}
    </div>
  </div>
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
  GHtrack('page_view', { page: 'plantel', campus: '${c.id}' });
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
  const html = page(c, specs, getCoursesForCampus(c.id));
  fs.writeFileSync(path.join(outDir, `${c.slug}.html`), html, 'utf8');
  n++;
}
console.log(`OK: ${n} páginas de plantel generadas en planteles/`);
