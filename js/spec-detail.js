/* Detalle de especialidad: presenta, aprenderás, módulos, duración,
   horarios, planteles, beneficios, fotos, FAQ y CTA. */
document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('spec-body');
  if (!box) return;
  const id = box.dataset.spec;
  const s = (GH.specialties() || []).find(x => x.id === id);
  if (!s) { box.innerHTML = '<p>Especialidad no encontrada. <a href="/especialidades">Ver todas</a></p>'; return; }

  const planteles = GH.campuses().filter(c => (c.especialidades || []).includes(id));
  const faqs = (s.seo && s.seo.faqs || []).slice(0, 5);
  try { GH.setContext(null, [id]); } catch (e) { /* noop */ }
  if (window.GHtrack) GHtrack('view_specialty', { specialty: id });

  box.innerHTML = `
    <div class="spec-hero">
      <div>
        <h2>¿Qué aprenderás?</h2>
        <p>${GH.esc(s.descripcionLarga)}</p>
        <h3 style="margin-top:20px">Módulos (3 meses c/u)</h3>
        <ul class="mod-list">${s.modulos.map(m => `<li>✅ ${GH.esc(m)}</li>`).join('')}</ul>
      </div>
      <div class="info-card">
        <h3>Ficha rápida</h3>
        <p>⏱ <strong>Duración:</strong> ${GH.esc(s.duracion)}</p>
        <p>🕐 <strong>Horarios:</strong> Lun–Vie 2 h diarias (mañana, tarde o noche) · Sáb/Dom 8 AM–3 PM</p>
        <p>🛠️ <strong>Incluye:</strong></p>
        <ul class="mod-list">${s.incluye.map(i => `<li>✔ ${GH.esc(i)}</li>`).join('')}</ul>
        <p><a href="/registro" class="btn-primary">Quiero inscribirme</a></p>
        <p><a href="#" data-wa data-context="spec-${GH.esc(id)}">💬 Quiero información por WhatsApp</a></p>
      </div>
    </div>
    <h2 style="margin:32px 0 12px">Planteles disponibles (${planteles.length})</h2>
    <div class="grid-cards">
      ${planteles.map(c => `
        <div class="info-card"><h3>📍 ${GH.esc(c.nombre)}</h3>
          <p class="muted">${GH.esc(c.direccion)} · ${GH.esc(c.ciudad)}</p>
          <p><a class="btn-map btn-map-directions btn-sm" href="${GH.mapsUrl(c)}" target="_blank" rel="noopener">🗺️ Cómo llegar</a>
          <a class="btn-primary btn-sm" href="/registro">Solicitar información</a></p>
        </div>`).join('')}
    </div>
    ${faqs.length ? `<h2 style="margin:32px 0 12px">Preguntas frecuentes</h2>
    <div class="faq-container">${faqs.map(f => `
      <div class="faq-item"><button class="faq-question" type="button">${GH.esc(f.q)} <span class="arrow">▼</span></button>
      <div class="faq-answer"><p>${GH.esc(f.a)}</p></div></div>`).join('')}</div>` : ''}
    <div class="cta-band"><p><strong>¿Listo para empezar?</strong></p>
    <p><a href="/registro" class="btn-primary">Quiero inscribirme</a> <a href="/citas" class="btn-outline">Agendar visita</a></p></div>`;

  box.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-question').addEventListener('click', () => {
      const open = item.classList.contains('active');
      box.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      if (!open) item.classList.add('active');
    });
  });
});
