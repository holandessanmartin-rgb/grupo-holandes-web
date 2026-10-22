/* Cliente del banco de fotos: subir, moderar y generar las variantes de Meta.
   Vive aparte de js/admin.js porque aquí el cuerpo de la petición NO es JSON
   (es el archivo de la foto crudo) y admin.js solo sabe hablar JSON. */
window.GHbanco = (() => {
  function key() { return sessionStorage.getItem('gh_admin_key') || ''; }
  function token() { return sessionStorage.getItem('gh_token') || ''; }
  function headers(extra) {
    const h = {};
    const k = key(); if (k) h['x-admin-key'] = k;
    const t = token(); if (t) h['Authorization'] = 'Bearer ' + t;
    return { ...h, ...(extra || {}) };
  }
  async function pedir(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: headers(opts.headers) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Error (' + r.status + ')');
    return data;
  }

  /* La foto se pide por API y se convierte en blob: `servible()` no deja pasar
     nada que no sea `.js` dentro de `/data/`, así que la URL directa responde
     404 y un `<img src="/data/banco/x.jpg">` no serviría. Además un `<img>` no
     puede mandar cabeceras de autenticación; el `fetch` sí. */
  async function imagenBlob(id) {
    const r = await fetch('/api/admin/banco/' + encodeURIComponent(id) + '/imagen', { headers: headers() });
    if (!r.ok) throw new Error('No se pudo cargar la foto');
    return r.blob();
  }

  /* Recorta a la medida de Meta centrando en el eje que sobra, y dejando que
     el control mueva ese recorte. Sin el control, una foto vertical para un
     anuncio de enlace se cortaría por el centro y podría perder la cabeza de
     quien aparece. */
  function areaRecorte(w, h, W, H, pos) {
    const ta = W / H;
    if (w / h > ta) { const cw = h * ta; return { cx: (w - cw) * pos, cy: 0, cw, ch: h }; }
    const ch = w / ta;
    return { cx: 0, cy: (h - ch) * pos, cw: w, ch };
  }

  function descargar(blob, nombre) {
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    /* Se revoca tarde: si se revoca en el mismo instante del clic, Firefox a
       veces cancela la descarga. */
    setTimeout(() => URL.revokeObjectURL(u), 30000);
  }

  function aBlob(canvas, calidad) {
    return new Promise((ok, mal) => canvas.toBlob(b => (b ? ok(b) : mal(new Error('No se pudo generar la imagen'))), 'image/jpeg', calidad));
  }

  /* Genera las 3 variantes y las manda al servidor, que devuelve el ZIP.
     Se hace así en vez de armar el ZIP aquí: así la compresión existe una sola
     vez (en zipAlmacenar, ya probada) y no en dos lugares que se pueden
     desincronizar. El envío son ~2 MB. */
  async function prepararMeta(id, img, formatos, pos) {
    const archivos = [];
    for (const f of formatos) {
      const c = document.createElement('canvas');
      c.width = f.ancho; c.height = f.alto;
      const a = areaRecorte(img.naturalWidth, img.naturalHeight, f.ancho, f.alto, pos);
      c.getContext('2d').drawImage(img, a.cx, a.cy, a.cw, a.ch, 0, 0, f.ancho, f.alto);
      /* 0.90: para un anuncio se ve idéntico al original y pesa una fracción. */
      const blob = await aBlob(c, 0.90);
      archivos.push({ nombre: f.id + '-' + f.ancho + 'x' + f.alto + '.jpg', datos: await leerBase64(blob) });
    }
    const r = await fetch('/api/admin/banco/meta', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id, archivos })
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || 'No se pudo preparar el paquete');
    }
    const zip = await r.blob();
    descargar(zip, 'meta-' + id.slice(0, 8) + '.zip');
    return zip;
  }
  function leerBase64(blob) {
    return new Promise((ok, mal) => {
      const fr = new FileReader();
      fr.onload = () => ok(String(fr.result).split(',')[1]);
      fr.onerror = () => mal(new Error('No se pudo leer la imagen'));
      fr.readAsDataURL(blob);
    });
  }

  return {
    listar: () => pedir('/api/admin/banco'),
    subir: (archivo, meta) => {
      const q = new URLSearchParams({
        plantelId: meta.plantelId || '',
        especialidad: meta.especialidad || '',
        tipo: meta.tipo || 'taller',
        descripcion: meta.descripcion || '',
        tieneRostros: meta.tieneRostros ? '1' : '0'
      });
      return pedir('/api/admin/banco?' + q.toString(), {
        method: 'POST',
        headers: headers({ 'Content-Type': archivo.type || 'image/jpeg' }),
        body: archivo
      });
    },
    moderar: body => pedir('/api/admin/banco', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    imagenBlob, areaRecorte, prepararMeta, descargar
  };
})();
