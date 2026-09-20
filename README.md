# Grupo Holandés — Plataforma institucional + admisiones

## Arrancar (backend completo)
```bash
node server.js          # http://localhost:3100
GH_ADMIN_KEY=tu-clave node server.js   # clave del panel /admin
```

## Desplegar en Netlify (solo estático)
- Se incluye `_redirects` con las URLs amigables.
- Formularios `registro` y `citas` llevan atributos **Netlify Forms**: si no hay
  backend (`/api/*` falla), el envío se guarda en
  *Site settings → Forms* automáticamente y la página avanza igual
  (el cupón se genera localmente en ese caso).
- Activa *Forms → Notifications* (email/WhatsApp vía Zapier) para avisar al plantel.
- El panel `/admin` y el portal requieren el backend Node; en Netlify no operan.

## Estructura
Páginas públicas (`*.html` + `especialidades/`, `planteles/`, `campanas/`),
`admin/`, `alumnos/`, `data/` (catálogos JS), `js/` (app + admin + spec-detail),
`css/`, `img/`, `docs/ARQUITECTURA.md`.

## Flujo
Visita → especialidad → plantel → horario → registro (`POST /api/leads`,
estado `nuevo`) → WhatsApp → cita (`POST /api/citas`) → apartado → inscripción.
Estados: nuevo, contactado, interesado, cita-agendada, seguimiento, apartado,
inscrito, no-interesado, no-localizado. Gestión en `/admin/prospectos`.
