/* Quién puede escribir en el foro.
   El foro es PÚBLICO para leer; escribir requiere cuenta con rol de encargado
   o administración. Eso lo decide el SERVIDOR (`autorForo` en server.js): esto
   solo decide QUÉ SE PINTA, para no enseñar un formulario que va a recibir un
   403. Un guard solo aquí se salta con la consola.

   ⚠️ El token del panel vive en `sessionStorage` (es por pestaña). Sirve cuando
   el encargado llega desde /admin en la MISMA pestaña, pero no si abre /foro
   directo o en una pestaña nueva — y `sessionStorage` sobrevive a la
   navegación dentro de la misma pestaña, por eso también se consulta. Por eso
   el foro guarda su propio token en `localStorage.gh_foro_token`, que sí
   atraviesa pestañas. */
window.GHforo = (() => {
  const LLAVE = 'gh_foro_token';
  const ROLES_ESCRIBE = ['encargado', 'admin'];

  function token() {
    return localStorage.getItem(LLAVE) || sessionStorage.getItem('gh_token') || '';
  }
  function borrarToken() {
    try { localStorage.removeItem(LLAVE); } catch (e) { /* modo privado */ }
  }
  function puedeEscribir(u) { return !!u && ROLES_ESCRIBE.includes(u.rol); }

  async function yo() {
    const t = token();
    if (!t) return null;
    let r;
    /* Sin red se devuelve null y no se pinta nada: mejor no enseñar el
       formulario que enseñarlo y que luego falle el envío. */
    try { r = await fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + t } }); }
    catch (e) { return null; }
    if (!r.ok) { borrarToken(); return null; }   // token vencido o de otro rol
    const d = await r.json().catch(() => ({}));
    return d.user || null;
  }

  /* `formId` es el bloque con el formulario de la página: `foro-escribir` en la
     lista y `foro-responder` dentro de un hilo. Los ids del bloque de entrada
     (`foro-login`, `fl-*`) son los mismos en las dos páginas. */
  async function montar(formId) {
    const form = document.getElementById(formId);
    const login = document.getElementById('foro-login');
    if (!form || !login) return;

    const u = await yo();
    if (puedeEscribir(u)) { pintarSesion(u, form, login); return; }
    login.style.display = 'block';

    const btn = document.getElementById('fl-entrar');
    const err = document.getElementById('fl-error');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      err.textContent = '';
      btn.disabled = true;
      try {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('fl-email').value.trim(),
            password: document.getElementById('fl-pass').value
          })
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'No se pudo entrar');
        /* El rol se comprueba ANTES de guardar: una cuenta que no escribe no
           debe quedar "media logueada" en el navegador. */
        if (!puedeEscribir(d.user)) {
          borrarToken();
          throw new Error('Esa cuenta no escribe en el foro: por ahora solo los encargados de cada plantel y la coordinación.');
        }
        try { localStorage.setItem(LLAVE, d.token); } catch (e2) { /* modo privado */ }
        pintarSesion(d.user, form, login);
      } catch (e3) { err.textContent = e3.message || 'No se pudo entrar.'; }
      btn.disabled = false;
    });
  }

  function pintarSesion(u, form, login) {
    login.style.display = 'none';
    form.style.display = 'block';
    const quien = document.getElementById('foro-quien');
    if (!quien) return;
    quien.textContent = 'Escribiendo como ' + (u.nombre || '') + (u.plantel ? ' · ' + u.plantel : '') + ' · ';
    const salir = document.createElement('a');
    salir.href = '#';
    salir.textContent = 'cerrar sesión';
    salir.addEventListener('click', ev => {
      ev.preventDefault();
      /* Se borran las dos llaves. Si la sesión venía del panel, dejar solo la
         del foro haría que "cerrar sesión" no hiciera nada visible al
         recargar — y eso es peor que cerrar también el panel: un aviso
         sorprendente pero seguro, contra un botón que no sirve. */
      borrarToken();
      try { sessionStorage.removeItem('gh_token'); } catch (e) { /* noop */ }
      location.reload();
    });
    quien.appendChild(salir);
  }

  return { montar, token, yo, puedeEscribir };
})();
