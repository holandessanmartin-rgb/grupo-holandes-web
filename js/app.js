/* Chrome compartido + utilidades de la plataforma Grupo Holandés.
   Cada página incluye sus <div id="gh-header">, <div id="gh-footer"> y
   <a id="gh-wa-float">; este script los rellena y activa. */
(function () {
  'use strict';

  const WA_DEFAULT = '529515678678';

  /* ---------- tracking mínimo (UTM + dataLayer) ---------- */
  const utm = {};
  try {
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
      const v = new URLSearchParams(location.search).get(k);
      if (v) utm[k] = v;
    });
    const prev = JSON.parse(localStorage.getItem('gh_utm') || '{}');
    Object.assign(utm, prev, utm);
    localStorage.setItem('gh_utm', JSON.stringify(utm));
  } catch (e) { /* noop */ }

  function consent() {
    try { return JSON.parse(localStorage.getItem('gh_cookie_consent') || '{}'); }
    catch (e) { return {}; }
  }
  function track(name, params) {
    if (!consent().analytics) return; // sin autorización, no se mide nada
    try {
      if (window.funnelTracking && funnelTracking.track) funnelTracking.track(name, params || {});
      else if (window.dataLayer) window.dataLayer.push({ event: name, ...(params || {}) });
    } catch (e) { /* noop */ }
  }
  window.GHtrack = track;
  window.GHutm = utm;

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

  /* ---------- chrome ---------- */
  const NAV = [
    ['/', 'Inicio'], ['/nosotros', 'Nosotros'], ['/especialidades', 'Especialidades'],
    ['/planteles', 'Planteles'], ['/admisiones', 'Admisiones'], ['/cursos', 'Cursos'],
    ['/blog', 'Blog'], ['/contacto', 'Contacto']
  ];

  function renderHeader() {
    const el = document.getElementById('gh-header');
    if (!el) return;
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
          <a class="top-bar-item" href="tel:+529515678678" data-track="phone_click">📞 +52 951 567 8678</a>
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
    if (!el) return;
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
            <li>📞 <a href="tel:+529515678678">+52 951 567 8678</a></li>
            <li>📍 Tierra y Libertad #100 A, Col. Ejidal San Martín Montoya, Oaxaca</li>
            <li>📌 A 3 cuadras de Plaza Bella</li>
          </ul></div>
        </div>
        <div class="footer-bottom"><p>&copy; 2026 Grupo Holandés. <a href="/contacto">Contacto</a> · <a href="/aviso-privacidad">Aviso de privacidad</a> · <a href="/terminos-cupon">Términos del cupón</a> · <a href="/admin">Acceso asesores</a></p></div>
      </div></footer>
      <a class="floating-whatsapp" id="gh-wa-float" href="#" target="_blank" rel="noopener" aria-label="WhatsApp">💬</a>`;
    updateFloatingWA();
    const fw = document.getElementById('gh-wa-float');
    if (fw) fw.addEventListener('click', () => track('whatsapp_click', { via: 'floating' }));
  }

  /* ---------- envío de prospectos (API o Netlify Forms) ---------- */
  async function postAPI(path, body, timeoutMs) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs || 6000);
    try {
      const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
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
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 10000);
    try {
      const params = new URLSearchParams({ 'form-name': formName, ...flatten(payload) });
      const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString(), signal: ctl.signal });
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
  // Google Sheets (Drive): notificación silenciosa, sin bloquear al usuario.
  function notifySheets(form, payload, extra) {
    try {
      const url = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.sheetsWebhookUrl) || '';
      if (!url) return;
      const { campana, ...rest } = payload || {};
      const body = JSON.stringify({ form, ...flatten(rest), campana: campana || null, ...(extra || {}), fecha: new Date().toISOString() });
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
    bar.innerHTML = `<div class="container">
      <p>🍪 Usamos cookies propias para recordar tu plantel y medir visitas. Al aceptar, autorizas su uso según nuestro <a href="/aviso-privacidad">aviso de privacidad</a>.</p>
      <div class="cookie-actions"><button class="cookie-reject" id="ck-no">Rechazar</button><button class="cookie-accept" id="ck-si">Aceptar</button></div>
    </div>`;
    document.body.appendChild(bar);
    requestAnimationFrame(() => bar.classList.add('show'));
    const decide = v => {
      try { localStorage.setItem('gh_cookie_consent', JSON.stringify({ decided: true, analytics: v, ts: Date.now() })); } catch (e) { /* noop */ }
      bar.classList.remove('show');
      if (v) { loadVendors(); track('page_view', { page: location.pathname }); }
    };
    document.getElementById('ck-si').addEventListener('click', () => decide(true));
    document.getElementById('ck-no').addEventListener('click', () => decide(false));
  }

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

  document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
    renderCookieBanner();
    flushQueue();
    loadVendors();
    if (consent().analytics) track('page_view', { page: location.pathname });
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
