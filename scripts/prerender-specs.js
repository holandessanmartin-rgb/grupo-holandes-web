/* Pre-renderiza el detalle de las especialidades en `especialidades/<slug>.html`.
   Idéntico enfoque que `scripts/build-planteles.js` y `scripts/prerender.py`:
   el contenido se escribe en el HTML estático dentro de marcadores
   <!--PRE-->…<!--/PRE--> y `js/spec-detail.js` lo vuelve a pintar al cargar
   (mismo markup, misma clase), así que es seguro re-ejecutarlo.

   Motivo (auditoría SEO 18/10/2026): esas páginas tenían ~161 palabras y
   CERO <h2>, porque todo vivía en JS. Google puede renderizar JS, pero lo
   hace en una segunda pasada diferida y sin garantía por rastreo.

   Todo el texto sale de `data/specialties.js` — NO se inventa nada.
   Uso: node scripts/prerender-specs.js
*/
const fs = require('fs');
const path = require('path');

const { getAllActiveCampuses } = require('../data/campuses.js');
const { getAllActiveSpecialties } = require('../data/specialties.js');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://grupoholandes.com';
const CCT = '20PBT0186W';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtPhone = w => {
  const d = String(w || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('52')) return '+52 ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8);
  return d ? '+' + d : '';
};

function mapsUrl(c) {
  if (c.mapsUrl) return c.mapsUrl;
  if (typeof c.latitud === 'number') return `https://www.google.com/maps/dir/?api=1&destination=${c.latitud},${c.longitud}`;
  return '#';
}

/* Mismo cálculo de meses que usa js/spec-detail.js */
function mesesTotales(d) {
  const t = String(d || '');
  const cuat = t.match(/(\d+)\s*cuatrimestre/i);
  if (cuat) return Number(cuat[1]) * 4;
  const anios = Number((t.match(/(\d+)\s*año/i) || [])[1] || 0);
  const meses = Number((t.match(/(\d+)\s*mes/i) || [])[1] || 0);
  return anios * 12 + meses;
}

function modTitle(s) {
  const mods = s.modulos || [];
  const total = mesesTotales(s.duracion);
  const porMes = mods.length ? total / mods.length : 0;
  const modMeses = (typeof s.modulosMeses === 'number' && s.modulosMeses > 0)
    ? s.modulosMeses
    : (total > 0 && Math.abs(porMes - Math.round(porMes)) < 0.01 ? Math.round(porMes) : 0);
  return modMeses > 0 ? `Módulos (${modMeses} meses c/u)` : 'Módulos';
}

function specBody(s, planteles) {
  const mods = s.modulos || [];
  const incluye = s.incluye || [];
  const faqs = ((s.seo && s.seo.faqs) || []).slice(0, 5);
  const horarioTxt = s.horario || (planteles.find(c => c.horario) || {}).horario || 'Consultar con el plantel';

  const modsHtml = mods.length
    ? `<h3 style="margin-top:20px">${esc(modTitle(s))}</h3>
        <ul class="mod-list">${mods.map(m => `<li>✅ ${esc(m)}</li>`).join('')}</ul>`
    : `<h3 style="margin-top:20px">Plan de estudios</h3><p class="muted">Solicítalo por WhatsApp del plantel más cercano o agenda una visita sin compromiso.</p>`;

  const plantelesHtml = planteles.map(c => `
        <div class="info-card"><h3>📍 ${esc(c.nombre)}</h3>
          <p class="muted">${esc(c.direccion)} · ${esc(c.ciudad)}</p>
          <p><a class="btn-map btn-map-directions btn-sm" href="${esc(mapsUrl(c))}" target="_blank" rel="noopener">🗺️ Cómo llegar</a>
          <a class="btn-primary btn-sm" href="/registro">Solicitar información</a></p>
        </div>`).join('');

  const faqHtml = faqs.length
    ? `<h2 style="margin:32px 0 12px">Preguntas frecuentes</h2>
    <div class="faq-container">${faqs.map(f => `
      <div class="faq-item"><button class="faq-question" type="button">${esc(f.q)} <span class="arrow">▼</span></button>
      <div class="faq-answer"><p>${esc(f.a)}</p></div></div>`).join('')}</div>`
    : '';

  return `
    <div class="spec-hero">
      <div>
        <h2>¿Qué aprenderás?</h2>
        <p>${esc(s.descripcionLarga)}</p>
        ${modsHtml}
      </div>
      <div class="info-card">
        <h3>Ficha rápida</h3>
        <p>⏱ <strong>Duración:</strong> ${esc(s.duracion)}</p>
        ${s.rvoe ? `<p>📜 <strong>RVOE:</strong> ${esc(s.rvoe)}${s.rvoeNombre ? ' (' + esc(s.rvoeNombre) + ')' : ''} · Clave CCT ${CCT}</p>` : ''}
        <p>🕐 <strong>Horarios:</strong> ${esc(horarioTxt)}</p>
        <p>🛠️ <strong>Incluye:</strong></p>
        <ul class="mod-list">${incluye.map(i => `<li>✔ ${esc(i)}</li>`).join('')}</ul>
        <p><a href="/registro" class="btn-primary">Quiero inscribirme</a></p>
        <p><a href="#" data-wa data-context="spec-${esc(s.id)}">💬 Quiero información por WhatsApp</a></p>
      </div>
    </div>
    <h2 style="margin:32px 0 12px">Planteles disponibles (${planteles.length})</h2>
    <div class="grid-cards">${plantelesHtml}
    </div>${faqHtml}
    <div class="cta-band"><p><strong>¿Listo para empezar?</strong></p>
    <p><a href="/registro" class="btn-primary">Quiero inscribirme</a> <a href="/citas" class="btn-outline">Agendar visita</a></p></div>`;
}

/* FAQPage JSON-LD: Google lo necesita en el HTML, no pintado por JS.
   Se marca con comentarios para que la re-ejecución sea idempotente. */
function faqLd(s) {
  const faqs = (s.seo && s.seo.faqs) || [];
  if (!faqs.length) return '';
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: String(f.a || '') }
    }))
  };
  return `\n  <!--FAQPRE-->  <script type="application/ld+json">${JSON.stringify(ld)}</script>\n  <!--/FAQPRE-->`;
}

function injectBody(html, content) {
  const pat = /(id="spec-body"[^>]*>)(?:<!--PRE-->[\s\S]*?<!--\/PRE-->)?(<\/div>)/;
  if (!pat.test(html)) throw new Error('  ! #spec-body no hallado');
  return html.replace(pat, `$1<!--PRE-->${content}\n<!--/PRE-->$2`);
}

function injectFaqLd(html, ld) {
  const pat = /\n\s*<!--FAQPRE-->[\s\S]*?<!--\/FAQPRE-->/;
  const clean = html.replace(pat, '');
  if (!ld) return clean;
  return clean.replace(/\n<\/head>/, `${ld}\n</head>`);
}

function main() {
  const campuses = getAllActiveCampuses();
  const specialties = getAllActiveSpecialties();
  let ok = 0;
  for (const s of specialties) {
    const file = path.join(ROOT, 'especialidades', `${s.slug}.html`);
    if (!fs.existsSync(file)) { console.log(`  ! falta ${s.slug}.html`); continue; }
    const planteles = campuses.filter(c => (c.especialidades || []).includes(s.id));
    let html = fs.readFileSync(file, 'utf8');
    html = injectBody(html, specBody(s, planteles));
    html = injectFaqLd(html, faqLd(s));
    fs.writeFileSync(file, html, 'utf8');
    const words = html.replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    console.log(`OK especialidades/${s.slug}.html · ${planteles.length} planteles · ${((s.seo && s.seo.faqs) || []).length} FAQs · ${words} palabras`);
    ok++;
  }
  console.log(`OK prerender-specs (${ok}/${specialties.length})`);
}

main();
