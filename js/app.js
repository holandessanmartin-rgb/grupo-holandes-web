/* Chrome compartido + utilidades de la plataforma Grupo Holandés.
   Cada página incluye sus <div id="gh-header">, <div id="gh-footer"> y
   <a id="gh-wa-float">; este script los rellena y activa. */
(function () {
  'use strict';

  // Plantel Santa María del Tule: destino por defecto del WhatsApp flotante
  // cuando no hay plantel elegido ni ubicación autorizada.
  const WA_DEFAULT = '529512446714';

  /* ---------- tracking mínimo (UTM + dataLayer) ---------- */
  const utm = {};
  function getQuery() {
    try { return new URLSearchParams(location.search); }
    catch (e) { return { get: function () { return null; } }; }
  }
  try {
    const qs = getQuery();
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
      const v = qs.get(k);
      if (v) utm[k] = v;
    });
    const prev = JSON.parse(localStorage.getItem('gh_utm') || '{}');
    // prev debajo; lo que venga en la URL actual gana (last-touch de campaña).
    Object.keys(prev).forEach(k => { if (!utm[k]) utm[k] = prev[k]; });
    localStorage.setItem('gh_utm', JSON.stringify(utm));
  } catch (e) { /* noop */ }

  function consent() {
    try { return JSON.parse(localStorage.getItem('gh_cookie_consent') || '{}'); }
    catch (e) { return {}; }
  }
  // Re-abre el panel (usado por "Preferencias de privacidad" y re-consentimiento)
  function resetConsent() {
    openPreferences();
  }
  window.GH = window.GH || {};
  window.GH.resetConsent = resetConsent;
  function saveConsent(analytics, ubicacion) {
    try { localStorage.setItem('gh_cookie_consent', JSON.stringify({ decided: true, analytics, ubicacion: !!ubicacion, ts: Date.now() })); } catch (e) { /* noop */ }
  }
  // Auto-localización: muestra el plantel más cercano donde haya #nearby-card
  function autoLocate() {
    const card = document.getElementById('nearby-card');
    const note = document.getElementById('nearby-note');
    if (!card) return;
    if (!consent().ubicacion) {
      if (note) note.innerHTML = 'Para sugerirte el plantel automáticamente, <a href="#" id="nearby-auth">autoriza tu ubicación aquí</a>. O <a href="#inicio">localízalo arriba</a>.';
      const ab = document.getElementById('nearby-auth');
      if (ab) ab.addEventListener('click', e => { e.preventDefault(); resetConsent(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      return;
    }
    if (!navigator.geolocation) { if (note) note.textContent = 'Tu navegador no soporta geolocalización.'; return; }
    if (note) note.textContent = '📍 Detectando tu ubicación…';
    navigator.geolocation.getCurrentPosition(pos => {
      let near = [];
      try { near = findNearestCampus(pos.coords.latitude, pos.coords.longitude) || []; } catch (e) {}
      if (!near.length) { if (note) note.textContent = 'No pudimos calcular. Usa el localizador de arriba.'; return; }
      const top = near[0];
      const d = (typeof formatDistance === 'function') ? formatDistance(top.distancia) : '';
      if (note) note.innerHTML = `EL PLANTEL MÁS CERCANO SEGÚN TU UBICACIÓN ACTUAL ES:`;
      card.style.display = 'block';
      const specName = id => { const s = specialties().find(x => x.id === id); return s ? s.nombre : id; };
      card.innerHTML = `
        <h3>📍 ${top.nombre}</h3>
        ${d ? `<div class="distance">${d} de distancia</div>` : ''}
        <div class="info-row">📍 ${top.direccion}, ${top.ciudad}</div>
        <div class="info-row">🎓 ${(top.especialidades || []).map(specName).join(' · ')}</div>
        <div class="map-actions">
          <a class="btn-map btn-map-directions" href="/planteles/${top.slug}">Ver plantel</a>
          <a class="btn-map btn-map-whatsapp" href="${window.GH.mapsUrl(top)}" target="_blank" rel="noopener">🗺️ Cómo llegar</a>
          <a class="btn-map btn-map-other" href="/registro?plantel=${top.id}">Elegir este plantel</a>
        </div>`;
      track('location_permission_granted', { via: 'auto', campus: top.nombre });
      try { GH.setContext(top.id, []); } catch (e) {}
    }, () => {
      if (note) note.innerHTML = '🔒 Sin acceso a tu ubicación. <a href="#inicio">Localízalo manualmente arriba</a>.';
      track('location_permission_denied', { via: 'auto' });
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }
  window.GH.autoLocate = autoLocate;

  /* ¿Facebook/Instagram in-app? Sus WebViews bloquean la geolocalización sin
     mostrar permiso (la petición nunca contesta). Otros (WhatsApp, etc.)
     usan Custom Tabs de Chrome, que sí conceden GPS: ellos lo intentan. */
  function isInAppBrowser() {
    const ua = navigator.userAgent || '';
    return /FBAN|FBAV|Instagram/i.test(ua);
  }
  /* Ubicación aproximada por IP (servidor) — no pide permisos ni cookies. */
  async function geoPorIp() {
    try {
      const r = await fetch('/api/geo', { headers: { Accept: 'application/json' } });
      const d = await r.json();
      return d && d.ok && typeof d.lat === 'number' ? d : null;
    } catch (e) { return null; }
  }
  window.GH = Object.assign(window.GH || {}, { isInAppBrowser, geoPorIp });

  /* ---------- salir del webview de Facebook/Instagram ----------
     FB e Instagram abren el enlace en su webview interno: sin GPS (el permiso
     nunca se resuelve) y con ventanas bloqueadas. Mostramos una barra que invita
     a salir al navegador real: Android sale con intent:// al tocar; iOS no puede
     forzarse, así que se dan pasos (compartir → copiar → Safari). Si el usuario
     no sale, el funnel igual funciona por IP (fallback de geo). */
  function webviewSource() {
    const ua = navigator.userAgent || '';
    if (/FBAN|FBAV/i.test(ua)) return 'facebook';
    if (/Instagram/i.test(ua)) return 'instagram';
    return null;
  }
  function wvDismissed() {
    try { return localStorage.getItem('gh_wv_dismissed') === '1'; } catch (e) { return false; }
  }
  function wvIntentUrl() {
    // Misma URL (UTMs incluidos) abierta por el navegador externo del sistema.
    return 'intent://' + location.host + location.pathname + location.search + location.hash +
      '#Intent;scheme=https;end';
  }
  function wvGoExternal(via) {
    const source = webviewSource();
    if (!source) return false;
    track('webview_exit', { via, source });
    if (/android/i.test(navigator.userAgent || '')) {
      location.href = wvIntentUrl();
      return true;
    }
    if (typeof navigator.share === 'function') {
      try {
        navigator.share({ title: document.title, url: location.href }).catch(() => wvShowHelp());
        return true;
      } catch (e) { /* cae al modal */ }
    }
    wvShowHelp();
    return true;
  }
  function wvShowHelp() {
    if (document.getElementById('gh-wv-help')) return;
    const wrap = document.createElement('div');
    wrap.className = 'wv-help';
    wrap.id = 'gh-wv-help';
    wrap.innerHTML = `
      <div class="wv-help-card" role="dialog" aria-label="Abrir en Safari">
        <h3>Abre esta página en tu navegador</h3>
        <p>Facebook no deja salir de aquí automáticamente. En 3 pasos:</p>
        <ol>
          <li>Toca <strong>⋯</strong> (arriba a la derecha) o el ícono de compartir (abajo).</li>
          <li>Elige <strong>Compartir enlace</strong> o <strong>Copiar enlace</strong>.</li>
          <li>Ábrelo en <strong>Safari</strong>: ahí verás tu plantel por GPS.</li>
        </ol>
        <div class="cookie-actions">
          <button type="button" class="cookie-accept" id="gh-wv-copy">Copiar enlace</button>
          <button type="button" class="cookie-reject" id="gh-wv-help-close">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const copy = document.getElementById('gh-wv-copy');
    const close = document.getElementById('gh-wv-help-close');
    copy.addEventListener('click', () => {
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(location.href);
        copy.textContent = '¡Copiado! Pégalo en Safari';
      } catch (e) { /* noop */ }
    });
    close.addEventListener('click', () => wrap.remove());
  }
  function renderWebviewBanner() {
    if (document.getElementById('gh-wv-banner') || wvDismissed()) return;
    const bar = document.createElement('div');
    bar.className = 'wv-banner';
    bar.id = 'gh-wv-banner';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Abrir en navegador');
    bar.innerHTML = `
      <span class="wv-banner-txt">📱 Ábrelo en tu navegador: así te ubicamos por GPS y te mostramos tu plantel.</span>
      <button type="button" class="wv-banner-btn" id="gh-wv-open">Abrir en navegador</button>
      <button type="button" class="wv-banner-close" id="gh-wv-close" aria-label="Cerrar">&times;</button>`;
    document.body.appendChild(bar);
    document.getElementById('gh-wv-open').addEventListener('click', () => wvGoExternal('banner'));
    document.getElementById('gh-wv-close').addEventListener('click', () => {
      try { localStorage.setItem('gh_wv_dismissed', '1'); } catch (e) { /* noop */ }
      bar.remove();
      track('webview_banner_dismissed', { source: webviewSource() });
    });
  }
  function initWebviewExit() {
    const source = webviewSource();
    if (!source || wvDismissed()) return;
    if (/^\/(admin\/|alumnos\/)/.test(location.pathname) || /directivo\.html$/.test(location.pathname)) return;
    renderWebviewBanner();
  }
  window.GH = Object.assign(window.GH || {}, { isInAppBrowser, geoPorIp, webview: { source: webviewSource, intentUrl: wvIntentUrl } });
  // Eventos estándar de Meta: se envían por fbq SOLO si el píxel cargó (consent
  // de cookies). Lead = conversión de las campañas CTWA.
  const META_EVENTS = {
    view_specialty: 'ViewContent',
    campus_selected: 'Contact',
    whatsapp_click: 'Contact',
    phone_click: 'Contact',
    form_completed: 'Lead',
    visit_scheduled: 'Schedule',
    coupon_generated: 'CompleteRegistration'
  };
  function track(name, params) {
    if (!consent().analytics) return; // sin autorización, no se mide nada
    try {
      if (window.funnelTracking && funnelTracking.track) funnelTracking.track(name, params || {});
      else if (window.dataLayer) window.dataLayer.push({ event: name, ...(params || {}) });
    } catch (e) { /* noop */ }
    try {
      const me = META_EVENTS[name];
      if (me && typeof window.fbq === 'function') {
        window.fbq('track', me, {
          content_name: (params && (params.campus || params.specialty)) || '',
          value: (me === 'Lead' || me === 'CompleteRegistration') ? 1 : 0,
          currency: 'MXN'
        });
      }
    } catch (e) { /* noop */ }
  }
  window.GHtrack = track;
  window.GHutm = utm;
  // UTM de campaña para leads/citas: URL actual sobre lo persistido (gh_utm).
  // Así el anuncio que trajo al usuario se conserva aunque navegue sin query.
  window.GH.campanaUtm = function () {
    return {
      source: utm.utm_source || '', medium: utm.utm_medium || '',
      campaign: utm.utm_campaign || '', content: utm.utm_content || ''
    };
  };

  /* ---------- datos ---------- */
  function campuses() {
    try {
      if (typeof getAllActiveCampuses === 'function') return getAllActiveCampuses();
      if (typeof CAMPUSES !== 'undefined') return CAMPUSES.filter(c => c.activo);
    } catch (e) { /* noop */ }
    return [];
  }
  function campusById(id) {
    try { if (typeof getCampusById === 'function') return getCampusById(id); } catch (e) { /* noop */ }
    return campuses().find(c => c.id === id) || null;
  }
  function specialties() {
    try {
      if (typeof getAllActiveSpecialties === 'function') return getAllActiveSpecialties();
      if (typeof SPECIALTIES !== 'undefined') return SPECIALTIES.filter(s => s.activo);
    } catch (e) { /* noop */ }
    return [];
  }
  window.GH = Object.assign(window.GH || {}, {
    campuses, campusById, specialties,
    // Normaliza teléfono MX: acepta "+52 951...", "521...", espacios y guiones.
    // Devuelve los 10 dígitos o '' si es inválido.
    normPhone(raw) {
      let d = String(raw || '').replace(/\D/g, '');
      if (d.length === 13 && d.startsWith('521')) d = d.slice(3);
      else if (d.length === 12 && d.startsWith('52')) d = d.slice(2);
      else if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
      return /^[2-9]\d{9}$/.test(d) ? d : '';
    },
    // "529512446714" / "9512446714" -> "+52 951 244 6714"
    fmtPhone(raw) {
      const d = String(raw || '').replace(/\D/g, '');
      const n = (d.length === 12 && d.startsWith('52')) ? d.slice(2) : d;
      if (n.length !== 10) return d ? '+' + d : '';
      return '+52 ' + n.slice(0, 3) + ' ' + n.slice(3, 6) + ' ' + n.slice(6);
    },
    esc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    mapsUrl(c) {
      if (!c) return '#';
      if (c.mapsUrl) return c.mapsUrl;
      if (typeof c.latitud === 'number') return 'https://www.google.com/maps/dir/?api=1&destination=' + c.latitud + ',' + c.longitud;
      return '#';
    },
    waLink(number, message) {
      const n = String(number || WA_DEFAULT).replace(/\D/g, '');
      return 'https://wa.me/' + n + '?text=' + encodeURIComponent(message);
    },
    setContext(campusId, specialtyIds) {
      try {
        if (campusId) sessionStorage.setItem('gh_campus', campusId);
        if (specialtyIds) sessionStorage.setItem('gh_specs', JSON.stringify(specialtyIds));
      } catch (e) { /* noop */ }
      updateFloatingWA();
    }
  });

  function contextMessage() {
    let campusId = null, specs = [];
    try {
      campusId = sessionStorage.getItem('gh_campus');
      specs = JSON.parse(sessionStorage.getItem('gh_specs') || '[]');
    } catch (e) { /* noop */ }
    const c = campusId ? campusById(campusId) : null;
    const names = (specs || []).map(id => {
      const s = specialties().find(x => x.id === id);
      return s ? s.nombre : id;
    });
    return 'Hola, quiero información' +
      (names.length ? ' sobre ' + names.join(' + ') : '') +
      (c ? ' en ' + c.nombre : ' sobre Grupo Holandés') + '.';
  }

  function updateFloatingWA() {
    const a = document.getElementById('gh-wa-float');
    if (!a) return;
    let campusId = null;
    try { campusId = sessionStorage.getItem('gh_campus'); } catch (e) { /* noop */ }
    const c = campusId ? campusById(campusId) : null;
    const num = (c && c.whatsapp ? c.whatsapp : WA_DEFAULT).replace(/\D/g, '');
    a.href = window.GH.waLink(num, contextMessage());
  }
  window.GH.updateFloatingWA = updateFloatingWA;

  function openWA(num, message) {
    const url = window.GH.waLink(num, message);
    let w = null;
    try { w = window.open(url, '_blank'); } catch (e) { w = null; }
    if (!w) location.href = url; // popup bloqueado tras la petición asíncrona
  }
  // Botón flotante: con cookies+ubicación autorizadas abre el chat del plantel
  // más cercano; sin autorización (o sin ubicación) va directo a Plantel Tule.
  function routeFloatWA(e, a) {
    track('whatsapp_click', { via: 'floating' });
    let campusId = null;
    try { campusId = sessionStorage.getItem('gh_campus'); } catch (err) { /* noop */ }
    if (campusId && campusById(campusId)) return; // plantel elegido: su href ya apunta a él
    if (!consent().ubicacion) return; // sin cookies/ubicación → Tule (href)
    if (!navigator.geolocation || typeof findNearestCampus !== 'function') return;
    e.preventDefault();
    const toTule = () => {
      track('whatsapp_float_route', { via: 'floating', campus: 'tule-default' });
      openWA(WA_DEFAULT, contextMessage());
    };
    navigator.geolocation.getCurrentPosition(pos => {
      let near = [];
      try { near = findNearestCampus(pos.coords.latitude, pos.coords.longitude) || []; } catch (err) { /* noop */ }
      const top = near[0];
      if (!top) { toTule(); return; }
      track('whatsapp_float_route', { via: 'floating', campus: top.nombre });
      openWA(top.whatsapp || WA_DEFAULT, contextMessage());
    }, async () => {
      // GPS denegado (típico en navegadores integrados): intenta por IP antes de caer al plantel por defecto
      try {
        const g = await geoPorIp();
        const near = g ? (findNearestCampus(g.lat, g.lng) || []) : [];
        const top = near[0];
        if (top) {
          track('whatsapp_float_route', { via: 'floating-ip', campus: top.nombre });
          openWA(top.whatsapp || WA_DEFAULT, contextMessage());
          return;
        }
      } catch (err) { /* noop */ }
      toTule();
    }, { enableHighAccuracy: false, timeout: 7000, maximumAge: 5 * 60 * 1000 });
  }

  /* ---------- chrome ---------- */
  const NAV = [
    ['/', 'Inicio'], ['/nosotros', 'Nosotros'], ['/especialidades', 'Especialidades'],
    ['/planteles', 'Planteles'], ['/admisiones', 'Admisiones'], ['/cursos', 'Cursos'],
    ['/blog', 'Blog'], ['/contacto', 'Contacto']
  ];

  function renderHeader() {
    const el = document.getElementById('gh-header');
    if (!el || el.children.length) return; // respeta el chrome estático
    if (document.body.dataset.nav === 'minimal') {
      el.innerHTML = `
      <nav class="navbar"><div class="container">
        <a href="/" class="navbar-brand"><img src="/img/logotipo.png" alt="Grupo Holandés" class="navbar-logo"><span>GRUPO <span>HOLANDÉS</span></span></a>
        <ul class="navbar-nav"><li><a href="/registro" class="btn-nav-cta">Quiero información</a></li></ul>
      </div></nav>`;
      return;
    }
    const path = location.pathname.replace(/\/$/, '') || '/';
    el.innerHTML = `
      <div class="top-bar"><div class="container">
        <div class="top-bar-left">
          <a class="top-bar-item" href="https://api.whatsapp.com/send?phone=529512446714" target="_blank" rel="noopener" data-track="phone_click">💬 +52 951 244 6714</a>
        </div>
        <div class="top-bar-right"><a href="/planteles#buscar" class="top-bar-cta">📍 Encuentra tu plantel</a></div>
      </div></div>
      <nav class="navbar" id="navbar"><div class="container">
        <a href="/" class="navbar-brand"><img src="/img/logotipo.png" alt="Grupo Holandés" class="navbar-logo"><span>GRUPO <span>HOLANDÉS</span></span></a>
        <ul class="navbar-nav" id="navbar-nav">
          ${NAV.map(([href, label]) => `<li><a href="${href}" class="${path === href || (href !== '/' && path.startsWith(href)) ? 'active' : ''}">${label}</a></li>`).join('')}
          <li><a href="/registro" class="btn-nav-cta">Quiero información</a></li>
        </ul>
        <button class="hamburger" id="hamburger" aria-label="Menú"><span></span><span></span><span></span></button>
      </div></nav>`;
    const ham = document.getElementById('hamburger'), nav = document.getElementById('navbar-nav');
    if (ham && nav) {
      ham.addEventListener('click', () => nav.classList.toggle('open'));
      nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
    }
  }

  function renderFooter() {
    const el = document.getElementById('gh-footer');
    if (!el || el.children.length) return; // respeta el chrome estático
    const sp = specialties().map(s => `<li><a href="/especialidades/${s.slug}">${window.GH.esc(s.nombre)}</a></li>`).join('');
    const cp = campuses().slice(0, 8).map(c => `<li><a href="/planteles">${window.GH.esc(c.nombre)}</a></li>`).join('');
    el.innerHTML = `
      <footer class="footer"><div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <img src="/img/logotipo.png" alt="Grupo Holandés" class="footer-logo">
            <p>Escuela de Mecánica Automotriz con clases 90% prácticas en vehículos reales.</p>
          </div>
          <div class="footer-column"><h4>Especialidades</h4><ul>${sp}</ul></div>
          <div class="footer-column"><h4>Planteles</h4><ul>${cp}</ul><p><a href="/planteles">Ver los ${campuses().length} planteles →</a></p></div>
          <div class="footer-column"><h4>Contacto</h4><ul>
            <li>💬 <a href="https://api.whatsapp.com/send?phone=529512446714" target="_blank" rel="noopener">+52 951 244 6714</a></li>
            <li>📍 Tierra y Libertad #100 A, Col. Ejidal San Martín Montoya, Oaxaca</li>
            <li>📌 A 3 cuadras de Plaza Bella</li>
          </ul></div>
        </div>
        <div class="footer-bottom"><p>&copy; 2026 Grupo Holandés. <a href="/contacto">Contacto</a> · <a href="/aviso-privacidad">Aviso de privacidad</a> · <a href="/terminos-cupon">Términos del cupón</a> · <a href="/admin">Acceso asesores</a></p></div>
      </div></footer>
      <a class="floating-whatsapp" id="gh-wa-float" href="#" target="_blank" rel="noopener" aria-label="WhatsApp">💬</a>`;
    updateFloatingWA();
  }

  /* ---------- envío de prospectos (API o Netlify Forms) ---------- */
  async function postAPI(path, body, timeoutMs) {
    const hasAbort = typeof AbortController !== 'undefined';
    const ctl = hasAbort ? new AbortController() : null;
    const t = setTimeout(() => { try { ctl && ctl.abort(); } catch (e) {} }, timeoutMs || 6000);
    try {
      const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      if (ctl) opts.signal = ctl.signal;
      const r = await fetch(path, opts);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Error ' + r.status);
      return d;
    } finally { clearTimeout(t); }
  }
  function flatten(obj) {
    const out = {};
    Object.entries(obj || {}).forEach(([k, v]) => {
      out[k] = Array.isArray(v) ? v.join(', ') : (v && typeof v === 'object' ? JSON.stringify(v) : String(v == null ? '' : v));
    });
    return out;
  }
  async function submitNetlify(formName, payload) {
    const hasAbort = typeof AbortController !== 'undefined';
    const ctl = hasAbort ? new AbortController() : null;
    const t = setTimeout(() => { try { ctl && ctl.abort(); } catch (e) {} }, 10000);
    try {
      const params = new URLSearchParams({ 'form-name': formName, ...flatten(payload) });
      const opts = { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() };
      if (ctl) opts.signal = ctl.signal;
      const r = await fetch('/', opts);
      if (!r.ok) throw new Error('Netlify Forms no disponible');
    } finally { clearTimeout(t); }
  }
  function genCoupon() {
    const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 4; i++) c += ABC[Math.floor(Math.random() * ABC.length)];
    return 'GH-' + c;
  }
  function queueLead(payload) {
    try {
      const q = JSON.parse(localStorage.getItem('gh_leads_queue') || '[]');
      q.push({ ...payload, ts: Date.now() });
      localStorage.setItem('gh_leads_queue', JSON.stringify(q.slice(-50)));
    } catch (e) { /* noop */ }
  }
  async function flushQueue() {
    try {
      const q = JSON.parse(localStorage.getItem('gh_leads_queue') || '[]');
      if (!q.length) return;
      const rest = [];
      for (const item of q) {
        try { await postAPI('/api/leads', item, 5000); }
        catch (e) { rest.push(item); }
      }
      localStorage.setItem('gh_leads_queue', JSON.stringify(rest));
    } catch (e) { /* noop */ }
  }
  // Bitácora de trazabilidad: cada toque del prospecto a la hoja Interacciones.
  function logEvento(evento, d) {
    try {
      const url = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.sheetsWebhookUrl) || '';
      if (!url) return;
      d = d || {};
      const body = JSON.stringify({ form: 'interaccion', evento,
        detalle: d.detalle || '', nombre: d.nombre || '', telefono: d.telefono || '',
        plantel: d.plantel || '', cupon: d.cupon || '', fecha: new Date().toISOString() });
      fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body }).catch(() => {});
    } catch (e) { /* noop */ }
  }
  window.GH.logEvento = logEvento;
  // Registro de consentimiento (§11): versión del aviso + flags + UTM + origen.
  function privacyVersion() {
    try {
      if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.privacyPolicyVersion) return APP_CONFIG.privacyPolicyVersion;
    } catch (e) { /* noop */ }
    return '2026-09-30';
  }
  function consentRecord(formOrigin, marketing) {
    const c = consent();
    return {
      privacyVersion: privacyVersion(),
      consentPrincipal: true,
      consentMarketing: !!marketing,
      consentAnalytics: !!c.analytics,
      ubicacionPref: !!c.ubicacion,
      formOrigin: formOrigin || location.pathname
    };
  }
  window.GH.consentRecord = consentRecord;
  // Google Sheets (Drive): notificación silenciosa, sin bloquear al usuario.
  // Aplana consentimiento a columnas finales (nunca coordenadas).
  function notifySheets(form, payload, extra) {
    try {
      const url = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.sheetsWebhookUrl) || '';
      if (!url) return;
      const { campana, consent, ...rest } = payload || {};
      const cs = consent || {};
      const body = JSON.stringify({ form, ...flatten(rest), campana: campana || null,
        privacy_version: cs.privacyVersion || privacyVersion(),
        consent_marketing: !!cs.consentMarketing,
        consent_analytics: !!cs.consentAnalytics,
        ubicacion_pref: !!cs.ubicacionPref,
        tutor_autorizado: cs.tutorAutorizado === true ? true : (cs.tutorAutorizado === false ? false : ''),
        ...(extra || {}), fecha: new Date().toISOString() });
      fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body }).catch(() => {});
    } catch (e) { /* noop */ }
  }
  // Vía principal: backend propio. Respaldo: Netlify Forms + cupón local + cola.
  async function sendLeadSmart(payload) {
    try {
      const d = await postAPI('/api/leads', payload);
      notifySheets('registro', payload, { cupon: d.cupon, via: 'api' });
      return { data: d, via: 'api' };
    } catch (e) {
      await submitNetlify('registro', payload);
      queueLead(payload);
      const d = {
        success: true, id: 'netlify-' + Date.now(), cupon: genCoupon(),
        cuponMonto: 100, cuponConcepto: 'Válido por $100 de descuento al agendar tu cita e inscribirte'
      };
      notifySheets('registro', payload, { cupon: d.cupon, via: 'netlify' });
      return { data: d, via: 'netlify' };
    }
  }
  async function sendCitaSmart(payload) {
    try {
      const d = await postAPI('/api/citas', payload);
      notifySheets('citas', { ...payload, tipo: payload.tipo, fechaCita: payload.fecha, horarioCita: payload.horario }, { via: 'api' });
      return { data: d, via: 'api' };
    } catch (e) {
      await submitNetlify('citas', payload);
      notifySheets('citas', { ...payload, tipo: payload.tipo, fechaCita: payload.fecha, horarioCita: payload.horario }, { via: 'netlify' });
      return { data: { success: true, id: 'netlify-' + Date.now() }, via: 'netlify' };
    }
  }
  window.GH.sendLeadSmart = sendLeadSmart;
  window.GH.sendCitaSmart = sendCitaSmart;
  window.GH.flushQueue = flushQueue;
  window.GH.postAPI = postAPI;
  async function sendLead(payload) {
    const body = {
      ...payload,
      origenPage: location.pathname,
      campana: { source: utm.utm_source || '', medium: utm.utm_medium || '', campaign: utm.utm_campaign || '', content: utm.utm_content || '' }
    };
    const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Error al enviar');
    return data;
  }
  window.GH.sendLead = sendLead;

  function renderCookieBanner() {
    if (document.querySelector('.cookie-banner')) return;
    if (consent().decided) return;
    const bar = document.createElement('div');
    bar.className = 'cookie-banner';
    bar.innerHTML = `<div class="cookie-card">
      <h3>Tu privacidad importa</h3>
      <p>Utilizamos tecnologías necesarias para que el sitio funcione correctamente. Con tu autorización también podemos utilizar herramientas de analítica para conocer cómo se utiliza el sitio y mejorar nuestra experiencia digital.</p>
      <p>Puedes aceptar, rechazar o configurar tus preferencias.</p>
      <div class="cookie-actions">
        <button class="cookie-accept" id="ck-all">Aceptar todas</button>
        <button class="cookie-reject" id="ck-no">Rechazar analítica</button>
        <button class="cookie-config" id="ck-conf">Configurar preferencias</button>
      </div>
      <p><a href="/aviso-privacidad">Aviso de Privacidad</a></p>
    </div>`;
    document.body.appendChild(bar);
    setTimeout(() => bar.classList.add('show'), 800);
    const decide = (analytics, ubicacion) => {
      saveConsent(analytics, ubicacion);
      bar.classList.remove('show');
      setTimeout(() => bar.remove(), 400);
      if (analytics) { loadVendors(); track('page_view', { page: location.pathname }); }
      autoLocate(); // con autorización, sugiere el plantel al momento
    };
    document.getElementById('ck-all').addEventListener('click', () => decide(true, true));
    document.getElementById('ck-no').addEventListener('click', () => decide(false, false));
    document.getElementById('ck-conf').addEventListener('click', () => { bar.classList.remove('show'); setTimeout(() => bar.remove(), 300); openPreferences(); });
  }

  /* Panel de preferencias: Necesarias (siempre), Analítica y Ubicación. */
  function openPreferences() {
    const oldPop = document.getElementById('prefs-popup');
    if (oldPop) oldPop.remove();
    const c = consent();
    const ov = document.createElement('div');
    ov.className = 'cookie-banner show';
    ov.id = 'prefs-popup';
    ov.innerHTML = `<div class="cookie-card" style="text-align:left">
      <h3 style="text-align:center">Preferencias de privacidad</h3>
      <p><strong>Necesarias</strong> — <span class="muted">Siempre activas</span><br>
      <span class="muted">Funcionamiento, seguridad, recordar tu plantel y tus decisiones de privacidad.</span></p>
      <p><label class="privacy-label"><input type="checkbox" id="pf-an" ${c.analytics ? 'checked' : ''}>
      <span><strong>Analítica</strong> — <span id="pf-an-state">${c.analytics ? 'Activada' : 'Desactivada'}</span><br>
      <span class="muted">Medición estadística (Google Analytics). Sin esto no medimos tu visita.</span></span></label></p>
      <p><label class="privacy-label"><input type="checkbox" id="pf-ub" ${c.ubicacion ? 'checked' : ''}>
      <span><strong>Ubicación</strong> — <span id="pf-ub-state">${c.ubicacion ? 'Permitida' : 'No permitida'}</span><br>
      <span class="muted">Solo para calcular tu plantel más cercano. Tu navegador pedirá permiso aparte.</span></span></label></p>
      <div class="cookie-actions"><button class="cookie-accept" id="pf-save">Guardar preferencias</button></div>
      <p style="text-align:center"><a href="/aviso-privacidad">Aviso de Privacidad</a></p>
    </div>`;
    document.body.appendChild(ov);
    const sync = () => {
      document.getElementById('pf-an-state').textContent = document.getElementById('pf-an').checked ? 'Activada' : 'Desactivada';
      document.getElementById('pf-ub-state').textContent = document.getElementById('pf-ub').checked ? 'Permitida' : 'No permitida';
    };
    document.getElementById('pf-an').addEventListener('change', sync);
    document.getElementById('pf-ub').addEventListener('change', sync);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    document.getElementById('pf-save').addEventListener('click', () => {
      const an = document.getElementById('pf-an').checked;
      saveConsent(an, document.getElementById('pf-ub').checked);
      ov.remove();
      if (an) loadVendors();
      // Sin analítica: no se envían nuevos eventos (track() lo verifica).
    });
  }
  window.GH = window.GH || {};
  window.GH.openPreferences = openPreferences;

  function validId(v) { return typeof v === 'string' && v.length > 5 && v.indexOf('X') === -1; }
  // Carga Google Analytics 4 y Meta Pixel SOLO con autorización de cookies.
  // Los eventos de track() viajan por dataLayer/gtag automáticamente.
  function loadVendors() {
    if (!consent().analytics) return;
    let T = {};
    try { T = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.tracking) || {}; } catch (e) {}
    if (validId(T.gaId) && !window.__gaLoaded) {
      window.__gaLoaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + T.gaId;
      document.head.appendChild(s);
      window.gtag('js', new Date());
      window.gtag('config', T.gaId);
    }
    if (validId(T.metaPixelId) && !window.fbq) {
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', T.metaPixelId);
      window.fbq('track', 'PageView');
    }
  }
  window.GH.loadVendors = loadVendors;

  /* Exit-intent de cupón: si el visitante tiene cupón y abandona con el cursor
     por arriba (escritorio), se recuerda el cupón 1 vez por sesión. Es UX, no
     medición: no requiere consentimiento. */
  function setupExitIntent() {
    try {
      if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return; // solo escritorio
      if (/^\/(admin|directivo|alumnos)/.test(location.pathname)) return;
      let shown = false;
      try { shown = sessionStorage.getItem('gh_exit_shown') === '1'; } catch (e) {}
      if (shown) return;
      const getCupon = () => {
        try { const c = sessionStorage.getItem('gh_cupon'); if (c) return c; } catch (e) {}
        try { const l = JSON.parse(localStorage.getItem('gh_last_lead') || 'null'); if (l && l.cupon) return l.cupon; } catch (e) {}
        return '';
      };
      const show = cupon => {
        try { sessionStorage.setItem('gh_exit_shown', '1'); } catch (e) {}
        document.removeEventListener('mouseout', onOut);
        let c = null;
        try { c = campusById(sessionStorage.getItem('gh_campus') || ''); } catch (e) {}
        const waNum = ((c && c.whatsapp) || WA_DEFAULT).replace(/\D/g, '');
        const ov = document.createElement('div');
        ov.className = 'exit-overlay';
        ov.id = 'gh-exit';
        ov.innerHTML = `
          <div class="exit-card">
            <button class="exit-close" aria-label="Cerrar">×</button>
            <span class="exit-emoji">🎁</span>
            <h3>¡Espera! Tu cupón sigue activo</h3>
            <div class="exit-code">${window.GH.esc(cupon)}</div>
            <p class="exit-note"><strong>$100 de descuento</strong> al agendar tu visita e inscribirte. Válido 30 días. <a href="/terminos-cupon" target="_blank" rel="noopener">Términos</a></p>
            <div class="exit-actions">
              <a class="btn-primary" href="/citas">📅 Agendar mi visita</a>
              <a class="btn-outline" href="${window.GH.waLink(waNum, `Hola, quiero usar mi cupón ${cupon} ($100 de descuento) para agendar mi visita${c ? ' en ' + c.nombre : ''}.`)}" target="_blank" rel="noopener">💬 Enviar mi cupón por WhatsApp</a>
            </div>
          </div>`;
        document.body.appendChild(ov);
        track('coupon_reminder', { coupon: cupon, campus: (c && c.nombre) || '' });
        const close = () => { try { ov.remove(); } catch (e) {} };
        ov.addEventListener('click', e => { if (e.target === ov) close(); });
        const x = ov.querySelector('.exit-close');
        if (x) x.addEventListener('click', close);
      };
      const onOut = e => {
        try {
          if (e.clientY > 4 || e.relatedTarget) return;
          const cb = document.querySelector('.cookie-banner');
          if (cb && getComputedStyle(cb).display !== 'none') return;
          if (document.querySelector('.wv-help')) return;
          const cupon = getCupon();
          if (!cupon) { document.removeEventListener('mouseout', onOut); return; }
          show(cupon);
        } catch (err) { /* noop */ }
      };
      document.addEventListener('mouseout', onOut);
    } catch (e) { /* noop */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
    // Chrome estático: cablear hamburguesa y WhatsApp dinámico igual
    const ham = document.getElementById('hamburger'), nav = document.getElementById('navbar-nav');
    if (ham && nav && !ham.dataset.wired) {
      ham.dataset.wired = '1';
      ham.addEventListener('click', () => nav.classList.toggle('open'));
      nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
    }
    updateFloatingWA();
    const fw = document.getElementById('gh-wa-float');
    if (fw && !fw.dataset.wired) {
      fw.dataset.wired = '1';
      fw.addEventListener('click', e => routeFloatWA(e, fw));
    }
    document.addEventListener('click', e => {
      if (e.target.closest('#re-consent') || e.target.closest('[data-prefs]')) {
        e.preventDefault();
        openPreferences();
      }
    });
    renderCookieBanner();
    setupExitIntent();
    initWebviewExit();
    flushQueue();
    // Auto-geo al entrar (con autorización de cookies+ubicación): sugiere el
    // plantel más cercano sin clics. Sin autorización, solo búsqueda manual.
    autoLocate();
    loadVendors();
    if (consent().analytics) track('page_view', { page: location.pathname });
    // FASE 1: la bitácora (Sheets) solo registra eventos clave de negocio
    // (registro, cita, inscripción). Los clics se miden en GA4, no en Sheets.
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-track]');
      if (t) track(t.dataset.track, { href: t.getAttribute('href') || '' });
      const wa = e.target.closest('[data-wa]');
      if (wa) {
        e.preventDefault();
        const c = wa.dataset.campus ? campusById(wa.dataset.campus) : null;
        const num = (c && c.whatsapp ? c.whatsapp : (wa.dataset.wa || WA_DEFAULT)).replace(/\D/g, '');
        track('whatsapp_click', { context: wa.dataset.context || '' });
        location.href = window.GH.waLink(num, wa.dataset.msg || contextMessage());
      }
    });
  });
})();
