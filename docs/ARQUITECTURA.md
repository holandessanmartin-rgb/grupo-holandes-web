# Arquitectura — Plataforma Grupo Holandés

Stack: HTML + CSS + JS vanilla y Node.js puro (`server.js`, sin dependencias).
Mismo enfoque que `landing-mechanic`, del que se reutiliza: identidad visual
(`css/`), datos (`data/`), servicios JS, API de leads y auth del foro.

## Rutas

| URL | Archivo | Notas |
|---|---|---|
| `/` | `index.html` | Hero APRENDE/EMPRENDE/REPARA |
| `/nosotros` | `nosotros.html` | Institucional |
| `/especialidades` | `especialidades.html` | Catálogo + cursos |
| `/especialidades/mecanica-automotriz` | `especialidades/mecanica-automotriz.html` | Detalle (SEO + JSON-LD Course) |
| `/especialidades/mecanica-motocicletas` | `especialidades/mecanica-motocicletas.html` | Detalle |
| `/cursos` | `cursos.html` | Bootcamps (data/courses.js) |
| `/planteles` | `planteles.html` | Grid data-driven (18) |
| `/planteles/san-martin-oaxaca` | `planteles/san-martin-oaxaca.html` | Destacado + fotos + LocalBusiness |
| `/admisiones` | `admisiones.html` | Proceso 6 pasos |
| `/registro` | `registro.html` | Formulario inteligente → `POST /api/leads` |
| `/citas` | `citas.html` | `POST /api/citas` (vincula `prospectoId`) |
| `/contacto`, `/blog` | estáticas | |
| `/campanas/*` | 4 landings | `data-nav="minimal"`, `noindex`, UTM |
| `/admin`, `/admin/prospectos` | panel | Requiere `x-admin-key` |
| `/alumnos` | portal (fase 1) | Login con `/api/auth/*` |

`server.js:resolvePage()` mapea URL amigable → archivo (`/x` → `x.html`).

## API

- `POST /api/leads` — crea prospecto (estado `nuevo`). Campos: nombre,
  teléfono, edad, especialidad[es], plantel, horarioPreferido, comoConociste,
  comentarios, origen, origenPage, campana{source,medium,campaign,content},
  canalPreferido, dispositivo, ubicación.
- `GET /api/prospectos?estado&plantelId&especialidad&campana&desde&hasta` (admin)
- `PATCH /api/prospectos/:id` `{estado, ultimoContacto, proximoSeguimiento, notas}` (admin)
- `POST /api/citas` `{prospectoId?, nombre, telefono, tipo, especialidadId, campusId, fecha, horario, comentarios}` — si hay prospecto en etapa temprana, pasa a `cita-agendada`.
- `GET /api/citas` (admin), `GET /api/admin/stats` (admin)
- `POST /api/auth/register|login`, `GET /api/auth/me` — portal alumnos/foro.

## Datos y entidades (futura BD real)

`USER(id, nombre, matricula, email, plantel, rol)` ·
`PROSPECT(id → SPECIALTY, CAMPUS, CAMPAIGN, estado, ultimoContacto, proximoSeguimiento)` ·
`APPOINTMENT(id → PROSPECT, tipo, fecha, horario, estado)` ·
`CAMPUS`, `SPECIALTY`, `COURSE`, `CAMPAIGN`, `LEAD_SOURCE` ·
`ENROLLMENT(→PROSPECT, estado: apartado/inscrito)` · `PAYMENT(→USER/ENROLLMENT)` (futuro).

Hoy persisten en `data/*.json` (ignorado en git). Migrar a Postgres/MySQL
mapeando 1:1 estos objetos; el frontend no cambia.

## Fuentes de verdad

- Planteles: hoja `.ods` + `scripts/sync_planteles.py` (copiar script desde landing-mechanic).
- Oferta educativa: `recursos/INFORMACION.docx` → `data/specialties.js`, `data/courses.js`.
- Clave admin: variable `GH_ADMIN_KEY` (por defecto `CAMBIAR-ESTA-CLAVE`).
