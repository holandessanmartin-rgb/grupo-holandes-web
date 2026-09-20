/* Cliente del panel admin: stats, prospectos con filtros y cambio de estado. */
window.GHadmin = (() => {
  function key() { return sessionStorage.getItem('gh_admin_key') || ''; }
  async function req(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-admin-key': key(), ...(opts.headers || {}) } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Error');
    return data;
  }
  const ESTADOS = ['nuevo', 'contactado', 'interesado', 'cita-agendada', 'seguimiento', 'apartado', 'inscrito', 'no-interesado', 'no-localizado'];

  function rows(obj) {
    return Object.entries(obj || {}).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<p><strong>${k}</strong>: ${v}</p>`).join('') || '<p class="muted">Sin datos.</p>';
  }
  function renderDashboard(s) {
    document.getElementById('dash-cards').innerHTML = `
      <div class="dash-card"><strong>${s.total}</strong><span>Prospectos</span></div>
      <div class="dash-card"><strong>${s.porEstado.nuevo || 0}</strong><span>Nuevos</span></div>
      <div class="dash-card"><strong>${s.porEstado.contactado || 0}</strong><span>Contactados</span></div>
      <div class="dash-card"><strong>${s.citasProximas}</strong><span>Citas próximas</span></div>
      <div class="dash-card"><strong>${s.porEstado.apartado || 0}</strong><span>Apartados</span></div>
      <div class="dash-card"><strong>${s.porEstado.inscrito || 0}</strong><span>Inscritos</span></div>`;
    document.getElementById('d-estado').innerHTML = rows(s.porEstado);
    document.getElementById('d-plantel').innerHTML = rows(s.porPlantel);
    document.getElementById('d-spec').innerHTML = rows(s.porEspecialidad);
    document.getElementById('d-camp').innerHTML = rows(s.porCampana);
  }
  return {
    ESTADOS,
    stats: k => fetch('/api/admin/stats', { headers: { 'x-admin-key': k } }).then(r => { if (!r.ok) throw new Error('auth'); return r.json(); }),
    list: params => req('/api/prospectos' + (params || '')),
    patch: (id, body) => req('/api/prospectos/' + id, { method: 'PATCH', body: JSON.stringify(body) }),
    renderDashboard
  };
})();
