#!/usr/bin/env node
// Despliegue a Hostinger (grupoholandes.com) via Hostinger Public API.
// Compila la rama main desde GitHub -> espera el build -> smoke test.
// Token: variable de entorno HOSTINGER_TOKEN (preferido) o archivo ~/.hostinger_token.
// El token NUNCA se guarda en el repo.
// Uso:
//   node scripts/deploy-hostinger.js                  deploy + verificacion
//   node scripts/deploy-hostinger.js --skip-push-check  (fuerza aunque HEAD no este en origin)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API = 'https://developers.hostinger.com';
const USERNAME = process.env.HSH_USERNAME || 'u672867784';
const DOMAIN = process.env.HSH_DOMAIN || 'grupoholandes.com';
const OWNER = process.env.HSH_OWNER || 'holandessanmartin-rgb';
const REPO = process.env.HSH_REPO || 'grupo-holandes-web';
const BRANCH = process.env.HSH_BRANCH || 'main';
const BASE_URL = process.env.HSH_BASE_URL || 'https://grupoholandes.com';
const SITE = '/api/hosting/v1/accounts/' + USERNAME + '/websites/' + DOMAIN;
const OPTIONS = {
  node_version: 22,
  app_type: 'other',
  root_directory: null,
  output_directory: null,
  build_script: null,
  entry_file: 'server.js',
  package_manager: 'npm'
};

function token() {
  if (process.env.HOSTINGER_TOKEN && process.env.HOSTINGER_TOKEN.trim()) return process.env.HOSTINGER_TOKEN.trim();
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const file = path.join(home, '.hostinger_token');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  console.error('Falta el token: define HOSTINGER_TOKEN o crea ~/.hostinger_token');
  process.exit(1);
}

async function api(method, p, body) {
  const r = await fetch(API + p, {
    method,
    headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = text; }
  if (!r.ok) {
    const msg = data && typeof data === 'object' ? data.message || JSON.stringify(data) : text;
    throw new Error(method + ' ' + p + ' -> HTTP ' + r.status + ': ' + msg);
  }
  return data;
}

function git(cmd) {
  return execSync('git ' + cmd, { cwd: path.join(__dirname, '..'), encoding: 'utf8' }).trim();
}

async function checkPushed() {
  const head = git('rev-parse HEAD');
  const remote = git('ls-remote origin refs/heads/' + BRANCH).split(/\s+/)[0];
  if (head !== remote) {
    console.error('HEAD (' + head.slice(0, 8) + ') != origin/' + BRANCH + ' (' + (remote || '???').slice(0, 8) + ').');
    console.error('Haz push primero: el despliegue compila lo que esta en GitHub.');
    process.exit(1);
  }
  const dirty = git('status --porcelain');
  if (dirty) console.log('Aviso: cambios locales sin commitear (no entran al deploy):\n' + dirty);
  return head;
}

async function installationUuid() {
  const list = await api('GET', '/api/hosting/v1/git/installations');
  const items = Array.isArray(list) ? list : (list && list.data) || [];
  const gh = items.find((i) => i.provider === 'github' && i.status === 'active');
  if (!gh) throw new Error('No hay instalacion de GitHub activa. Conecta GitHub en hPanel (Account > Integraciones).');
  const repos = await api('GET', '/api/hosting/v1/git/installations/' + gh.uuid + '/repositories');
  const repoItems = Array.isArray(repos) ? repos : (repos && repos.data) || [];
  const full = OWNER + '/' + REPO;
  const hit = repoItems.find((r) => r.full_name === full);
  if (!hit) throw new Error('El repo ' + full + ' no esta visible en la instalacion de GitHub.');
  console.log('GitHub: ' + hit.full_name + ' @ ' + BRANCH + ' (via ' + gh.account_login + ')');
  return gh.uuid;
}

async function startBuild(installation_uuid) {
  return api('POST', SITE + '/nodejs/builds', Object.assign({}, OPTIONS, {
    source_type: 'git',
    source_options: { owner: OWNER, repository: REPO, branch: BRANCH, installation_uuid }
  }));
}

async function waitBuild(uuid, timeoutMs) {
  const started = Date.now();
  let last = '';
  while (Date.now() - started < timeoutMs) {
    const b = await api('GET', SITE + '/nodejs/builds/' + uuid);
    const state = b.state || (b.data && b.data.state) || '?';
    if (state !== last) { console.log('  build ' + state + ' (' + Math.round((Date.now() - started) / 1000) + 's)'); last = state; }
    if (state === 'completed' || state === 'failed' || state === 'error' || state === 'canceled') return b;
    await new Promise((r) => setTimeout(r, 4000));
  }
  return { state: 'timeout' };
}

async function buildLogs(uuid) {
  for (const p of [SITE + '/nodejs/builds/' + uuid + '/logs', SITE + '/nodejs/builds/' + uuid + '/analysis']) {
    try {
      const d = await api('GET', p);
      const txt = typeof d === 'string' ? d : JSON.stringify(d, null, 1);
      console.log('--- ' + p + '\n' + txt.slice(-4000));
      return;
    } catch (e) { /* endpoint opcional */ }
  }
  console.log('(no fue posible obtener los logs del build)');
}

async function smoke() {
  const checks = [['/', 200], ['/admin/usuarios', 200], ['/planteles/puerto-escondido.html', 200], ['/admin/index.html', 200]];
  let detail = [];
  for (let attempt = 0; attempt < 15; attempt++) {
    detail = [];
    let ok = 0;
    for (const c of checks) {
      try {
        const r = await fetch(BASE_URL + c[0], { redirect: 'manual' });
        detail.push(c[0] + '=' + r.status);
        if (r.status === c[1] || (c[1] === 200 && r.status === 301)) ok++;
      } catch (e) { detail.push(c[0] + '=ERR(' + e.message + ')'); }
    }
    if (ok === checks.length) { console.log('  smoke OK  ' + detail.join('  ')); return true; }
    if (attempt < 14) await new Promise((r) => setTimeout(r, 5000));
  }
  console.log('  smoke FALLA  ' + detail.join('  '));
  return false;
}

(async () => {
  const skipPush = process.argv.indexOf('--skip-push-check') !== -1;
  console.log('[deploy] ' + OWNER + '/' + REPO + '@' + BRANCH + ' -> ' + DOMAIN + ' (Node ' + OPTIONS.node_version + ', entry ' + OPTIONS.entry_file + ')');
  const head = skipPush ? git('rev-parse HEAD') : await checkPushed();
  console.log('[deploy] commit ' + head.slice(0, 12));
  const installation = await installationUuid();
  const build = await startBuild(installation);
  const uuid = build.uuid || (build.data && build.data.uuid);
  if (!uuid) throw new Error('La API no devolvio uuid de build: ' + JSON.stringify(build).slice(0, 300));
  console.log('[deploy] build ' + uuid);
  const done = await waitBuild(uuid, 6 * 60 * 1000);
  if (done.state !== 'completed') {
    console.error('[deploy] build termino en "' + done.state + '"');
    await buildLogs(uuid);
    process.exit(1);
  }
  console.log('[deploy] build completado; verificando sitio...');
  const ok = await smoke();
  if (!ok) { console.error('[deploy] el sitio no responde como se esperaba'); process.exit(1); }
  console.log('[deploy] OK ' + DOMAIN + ' @ ' + head.slice(0, 12));
})().catch((e) => {
  console.error('[deploy] ERROR: ' + (e && e.message ? e.message : e));
  process.exit(1);
});
