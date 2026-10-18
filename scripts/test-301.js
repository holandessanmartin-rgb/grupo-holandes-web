/* Prueba del 301 `.html` → URL limpia en server.js (local, no toca prod). */
const { spawn } = require('child_process');

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;

const ESPERADO = [
  ['/index.html', '/', 301],
  ['/planteles/santa-maria-del-tule.html', '/planteles/santa-maria-del-tule', 301],
  ['/planteles/puerto-escondido.html', '/planteles/puerto-escondido', 301],
  ['/especialidades/mecanica-diesel.html', '/especialidades/mecanica-diesel', 301],
  ['/blog/escuela-de-mecanica-automotriz.html', '/blog/escuela-de-mecanica-automotriz', 301],
  ['/menu.html', '/menu', 301],
  ['/planteles/santa-maria-del-tule.html?utm_source=fb&utm_medium=paid', '/planteles/santa-maria-del-tule?utm_source=fb&utm_medium=paid', 301],
  // limpias: siguen 200
  ['/planteles/santa-maria-del-tule', null, 200],
  ['/', null, 200],
  ['/blog/cuanto-dura-carrera-mecanica-automotriz', null, 200],
  // la limpia de un .html inexistente se comporta igual que antes
  ['/no-existe.html', null, 404],
  // la API no se ve afectada
  ['/api/geo', null, 200],
];

async function main() {
  const srv = spawn(process.execPath, ['server.js'], {
    cwd: __dirname + '/..',
    env: { ...process.env, PORT: String(PORT), DATA_DIR: require('os').tmpdir() + '/gh-301-test' },
    stdio: 'ignore'
  });

  // esperar a que escuche
  let listo = false;
  for (let i = 0; i < 40 && !listo; i++) {
    try { await fetch(BASE + '/'); listo = true; } catch (e) { await new Promise(r => setTimeout(r, 250)); }
  }
  if (!listo) { console.log('FALLO: el servidor no arrancó'); srv.kill(); process.exit(1); }

  let fails = 0;
  for (const [url, destino, codigo] of ESPERADO) {
    const r = await fetch(BASE + url, { redirect: 'manual' });
    const loc = r.headers.get('location') || '';
    let ok = r.status === codigo;
    if (ok && destino !== null) ok = loc === destino;
    if (!ok) fails++;
    console.log(`${ok ? 'OK  ' : 'FALLO'} ${String(r.status).padStart(3)} ${url}`);
    if (destino !== null) console.log(`        Location: ${loc || '(ninguna)'}`);
  }

  // el 301 debe ser un solo salto: limpiar → 200
  const follow = await fetch(BASE + '/planteles/tehuacan.html');
  const okFollow = follow.status === 200 && follow.url === BASE + '/planteles/tehuacan';
  if (!okFollow) fails++;
  console.log(`${okFollow ? 'OK  ' : 'FALLO'} seguimiento automático: ${follow.status} ${follow.url}`);

  srv.kill();
  console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK — 301 correcto');
  process.exit(fails ? 1 : 0);
}
main();
