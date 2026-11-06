# Campaña de Mensajes (Click-to-WhatsApp) → chatbot — Borrador

> Creado: 28/oct/2026 · Actualizado: 5/nov/2026 · Estado: **BORRADOR** (no crear hasta que el chatbot
> esté activo y el nombre visible de WhatsApp esté aprobado) · Cuenta `875196221941073`
> (Cristobal Ramos Ramirez — designada el 3/nov/2026) · Portafolio `1784066369245029`

YANET HARÁ ESTA CAMPAÑA. Bloqueantes I–V a verificar antes de crear (ver §0 de abajo):
verificación de negocio, nombre visible aprobado, bot en Cloud API, plantillas.

## 0. Precondiciones (bloqueantes — en este orden)

1. ✅ Número del chatbot: **`+52 1951 212 5727`** (WhatsApp account ya conectada al portafolio).
2. 🔴 **Verificación de negocio** en Meta (nombre legal = razón social del RFC + docs) → levanta
   *"el nombre visible de WhatsApp Business aún no se aprobó"*.
3. 🔴 **Nombre visible aprobado** para el 951 212 5727 (se aprueba dentro de la verificación).
4. 🔴 **Chatbot en Cloud API** recibiendo mensajes (ver `flujo-chatbot-whatsapp.md`).
5. 🔴 **Plantillas aprobadas** — solo **2** las necesita el bot: el **aviso al asesor**
   (`AVISO_TEMPLATE`; vacío en prod → el aviso se pierde con error `131026`) y la de **reanudación
   de conversación >24 h**. El saludo del anuncio y la respuesta del bot **NO** usan plantilla
   (el usuario escribe primero y la ventana de 24 h queda abierta).

⚠️ **Cuenta nueva:** esta campaña corre en **`875196221941073`** (Cristobal), **no** en la vieja
`2329756177365009`. Píxel `WEB` y audiencias (`CONVERTIDOS_180d`) hay que **asignarlas/verificarlas**
en la cuenta destino (ver `migracion-cuenta-meta.md`) antes de publicar.

⚠️ **No confundir:** este objetivo **no usa UTM** (no hay URL de sitio). La atribución por anuncio
llega al bot en el webhook de WhatsApp como parámetro **`referral`** (trae el ID del anuncio/campaña).
Por eso el **nombre de campaña y de anuncio sigue siendo obligatorio**: es lo que Meta reporta.

## 1. Estructura (nombres listos para pegar)

```
C · HOLANDES | MENSAJES | CTWA-BOT | 17-CIUDADES | CONTINUO     ($25–50/día · presupuesto del conjunto)
└── AS08 | CTWA-BOT | 18-40 | 17-CIUDADES | CTWA                ← objetivo: Mensajes (WhatsApp)
        ├── AD19 | REEL-9x16 | PRACTICA-TALLER | V1             (mismo creativo ganador que AD01)
        ├── AD20 | VIDEO-9x16 | TESTIMONIO-ALUMNO | V1
        └── AD21 | IMAGEN-4x5 | HORARIOS-Y-PROGRAMA | V1
```

> Nota: el fragmento `17-CIUDADES` usa el conteo real (17). Si se prefière seguir la etiqueta
> congelada `14-CIUDADES` por consistencia con la campaña de Leads, se cambia antes de crear.

## 2. Configuración

| Campo | Valor |
|---|---|
| Objetivo | **Mensajes** → destino **WhatsApp** (Click-to-WhatsApp) |
| Cuenta | `875196221941073` (Cristobal Ramos Ramirez) |
| Presupuesto | **$25–50/día** en el conjunto · CBO apagado · ⚠️ **no superar 20% del total** |
| Optimización del resultado | **Conversación iniciada** (no "formulario") |
| Destino WhatsApp | **+52 1951 212 5727** (el chatbot) |
| Ubicación | **17 ciudades manuales** (`docs/ciudades-17.txt`) · Oaxaca de Juárez 50 km · resto 40 km · Advantage+ automático · **sin** "Llegar a más personas" |
| Edad | 18–40 (mismo corte que AS01) |
| Género | Todos |
| Incluir | **NINGUNO** (broad) |
| Excluir | `CONVERTIDOS_180d` |
| Mensaje inicial | ❌ **No enviar** (el usuario escribe primero; el bot responde) |

## 3. KPIs y umbrales

| Semana | Meta |
|---|---|
| 1–2 | **Conversación iniciada ≤ $15 MXN** (aprendizaje; benchmark MX ~$10–25) |
| Mes 1 | **≤ $30 MXN** por conversación iniciada |
| Embudo interno | `conversación → calificado → cita` ≥ 25% → objetivo real ≈ **$120 MXN por cita** |
| 🔴 Línea roja | $75+ por conversación con 0 citas en 14 días → pausar y diagnosticar |
| ⚠️ Costo oculto | Cada conversación = **1 unidad de la cuota de 1,000/mes** del número (la de servicio es gratis; la de **marketing** se cobra por tarifa de Meta) |

## 4. Reglas de oro

1. **Nunca corren a la vez las dos captaciones al 100%** — si CTWA-BOT se enciende con presupuesto
   propio, bajar `AS01` proporcionalmente o el test pierde claridad.
2. **Una variable por prueba:** mismo público, mismos creativos que `AS01`; lo único distinto es el
   **destino** (chatbot vs web). Así el CPL/CPM es comparable.
3. **Nunca borrar** — pausar/archivar.
4. La atribución por anuncio se lee en **Meta** (columna Resultados) y en el **bot** (log del
   `referral`), no en la hoja (no hay UTM).
5. Si el chatbot cae → **pausar la campaña al instante** (una campaña de mensajes sin bot = gente
   escribiendo a nadie = reputación del número quemada).

## 5. Verificación posterior a la publicación

- Meta → tabla: "Conversaciones iniciadas" por anuncio.
- Bot → log de `referral` por campaña/anuncio.
- Hoja/panel → citas creadas por el bot con su plantel.
