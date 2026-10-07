/* Cliente del panel admin: stats, prospectos con filtros y cambio de estado. */
window.GHadmin = (() => {
  function key() { return sessionStorage.getItem('gh_admin_key') || ''; }
  function token() { return sessionStorage.getItem('gh_token') || ''; }
  function headers(extra) {
    const h = { 'Content-Type': 'application/json' };
    const k = key(); if (k) h['x-admin-key'] = k;
    const t = token(); if (t) h['Authorization'] = 'Bearer ' + t;
    return { ...h, ...(extra || {}) };
  }
  async function req(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: headers(opts.headers) });
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
    stats: (k) => req('/api/admin/stats', k ? { headers: { 'x-admin-key': k } } : {}),
    list: params => req('/api/prospectos' + (params || '')),
    seguimiento: params => req('/api/seguimiento' + (params || '')),
    patch: (id, body) => req('/api/prospectos/' + id, { method: 'PATCH', body: JSON.stringify(body) }),
    usuarios: () => req('/api/admin/users'),
    crearUsuario: body => req('/api/admin/users', { method: 'POST', body: JSON.stringify(body) }),
    editarUsuario: (id, body) => req('/api/admin/users/' + id, { method: 'PATCH', body: JSON.stringify(body) }),
    eliminarUsuario: id => req('/api/admin/users/' + id, { method: 'DELETE' }),
    renderDashboard
  };
})();
