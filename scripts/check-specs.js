/* Verificación del pre-render de especialidades (auditoría SEO 18/10/2026).
   Comprueba: JSON-LD válido, equilibrio de <div>, marcadores PRE y
   palabras por página. Uso: node scripts/check-specs.js */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { getAllActiveSpecialties } = require('../data/specialties.js');

let fails = 0;
const chk = (ok, label, extra) => {
  console.log(`  ${ok ? 'OK  ' : 'FALLO'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) fails++;
};

for (const s of getAllActiveSpecialties()) {
  const f = path.join(ROOT, 'especialidades', `${s.slug}.html`);
  const h = fs.readFileSync(f, 'utf8');
  console.log(`\n== especialidades/${s.slug}.html ==`);

  let lds = [];
  let ldOk = true;
  try {
    lds = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  } catch (e) { ldOk = false; }
  chk(ldOk, 'JSON-LD válido', lds.map(x => x['@type']).join(', '));

  const faqLd = lds.find(x => x['@type'] === 'FAQPage');
  const esperadas = ((s.seo && s.seo.faqs) || []).length;
  chk(!!faqLd && faqLd.mainEntity.length === esperadas, 'FAQPage con todas las preguntas',
    `${faqLd ? faqLd.mainEntity.length : 0}/${esperadas}`);

  const abre = (h.match(/<div\b/g) || []).length;
  const cierra = (h.match(/<\/div>/g) || []).length;
  chk(abre === cierra, '<div> equilibrados', `${abre}/${cierra}`);

  chk((h.match(/<!--PRE-->/g) || []).length === 1 && (h.match(/<!--\/PRE-->/g) || []).length === 1,
    'marcadores PRE (1 par)', `${(h.match(/<!--PRE-->/g) || []).length}`);

  const words = h.replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  chk(words > 450, 'palabras estáticas', `${words}`);

  chk((h.match(/<h2\b/g) || []).length >= 3, 'H2 presentes', `${(h.match(/<h2\b/g) || []).length}`);
  chk(h.trim().endsWith('</html>'), 'HTML bien cerrado');
}

console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
