# Guía de práctica — Panel de encargados (datos de prueba)

**Objetivo:** que cada encargado conozca su panel usando los 10 prospectos de
prueba (**prefijo `Test`**) de su plantel antes de trabajar con datos reales.
**Duración estimada:** 20–25 minutos.

> Las credenciales (usuario y contraseña) las distribuye dirección por canal
> privado. No las compartas ni las pegues en correos grupales.

---

## 1. Entrar al panel

1. Abre **https://grupoholandes.com/admin**
2. En **Usuario o correo** captura tu usuario (el código corto de tu plantel;
   p. ej. `huajuapan`) y tu contraseña.
3. Si te redirige otra vez al login o la página aparece vacía, no hay sesión
   iniciada: vuelve a capturar tus datos.

Con sesión iniciada verás el **Dashboard**, que saluda con
`Hola <Nombre> · <Tu plantel> (solo ves tu plantel)` y muestra las tarjetas
de la sección 3. Abajo están los accesos: **Gestionar prospectos →**,
**Seguimiento →**, **Vista directivo →** y **Usuarios →**. Las dos últimas
son de la cuenta de dirección: si haces clic, el sistema te regresa al
dashboard.

La sesión vive en la pestaña del navegador: para salir basta con cerrar la
pestaña.

---

## 2. Tus datos de prueba

Cada plantel tiene **10 prospectos `Test`** con formulario completo:

| Dato | Detalle |
|---|---|
| Nombre | `Test <Nombre> <Apellido> 01…10` |
| Cantidad | 10 por plantel |
| Estados | **5 con cita agendada** y 5 en `nuevo` |
| Campos | edad, horario preferido, origen (Facebook/Instagram/…), comentarios, cupón `GH-XXXX` |
| Especialidad | una al azar entre las que ofrece **tu plantel** |
| Fecha | entre hoy y 10 días atrás (varía para probar filtros) |
| Campaña | `pruebas` |
| Teléfono | `951 000 XXXX` — **son números de prueba**: WhatsApp puede indicar que el número no está registrado. Es esperado. |

**Permisos por plantel:** tú verás **únicamente los prospectos de tu plantel**,
en todas las secciones. Los de otros planteles no aparecen aunque lo pidas —
es correcto, es el control de acceso.

*(En Tule, Tierra Blanca y Huajuapan hay además prospectos reales: se
distinguen porque NO empiezan con `Test`.)*

---

## 3. Dashboard (`/admin`)

Revisa las tarjetas. En tu plantel los valores esperados son:

| Tarjeta | Esperado |
|---|---|
| Prospectos | 10 (+ reales si los hay) |
| Prospecto | 5 |
| Citas | 5 |
| Visitas | 0 |
| Citas próximas | 5 |
| Inscripciones | 0 |

Abajo están los desgloses: **por estado** (5 `nuevo` / 5 `cita-agendada`),
**por especialidad** (distribución aleatoria), **por plantel** (solo el tuyo)
y **por campaña** (`pruebas`).

**Práctica:** identifica cuántos llevan cita y qué especialidad es la más
común en tu plantel.

---

## 4. Prospectos y filtros (`/admin/prospectos`)

1. Arriba aparece el conteo: `10 prospectos (hoja Prospectos GH)`.
2. En cada fila ves: nombre, horario y cupón; teléfono; especialidad;
   plantel; fecha; campaña; **estado** (lista desplegable); botón
   **💬 Contactar**.
3. Aplica estos filtros y verifica los conteos:

| Filtro | Esperado en tu plantel |
|---|---|
| Estado = Cita | 5 |
| Estado = Prospecto | 5 |
| Estado = Visita | 0 (hasta que practiques) |
| Estado = Inscripción | 0 (hasta que practiques) |
| Especialidad (cualquiera de las tuyas) | suma el total al quitarlo |
| Fecha desde/hasta (últimos 7 días) | ~7–10 (las fechas están repartidas) |
| Plantel | **bloqueado en tu plantel** — no se puede cambiar |

### Cambiar el estado de un prospecto

En la columna **Estado** usa la lista con estas 4 opciones:

| Opción | Cuándo usarla |
|---|---|
| **Prospecto** | registrado, todavía sin cita |
| **Cita** | ya tiene cita agendada |
| **Visita** | fue a tu plantel |
| **Inscripción** | se inscribió (esto lo refleja también en la hoja) |

**Práctica:** filtra `Cita` y confirma que son 5; luego elige un prospecto en
Estado = Prospecto y cámbialo a **Visita** → filtra `Visita` y debe aparecer 1;
regrésalo a **Prospecto** y limpia los filtros con Filtrar sin selecciones.

---

## 5. Seguimiento (`/admin/seguimiento`)

El sistema marca automáticamente los pendientes:

| Tabla | Regla | Esperado |
|---|---|---|
| **Sin cita** | registro ≥2 días y sin cita | ~4 `Test` de tu plantel |
| **Con cita, sin inscripción** | cita hace ≥7 días sin inscripción | ~4 `Test` (5 en Huajuapan) |

Cada fila muestra los días transcurridos y un botón **💬 Contactar**.

**Práctica:** ubica los pendientes de tu plantel y verifica que **no aparece
ningún prospecto de otro plantel**.

> El checkbox “ver filas de prueba” solo tiene efecto para las cuentas de
> dirección; para encargados no cambia nada.

> Si marcaste a un prospecto como **Cita**, **Visita** o **Inscripción** en la
> sección 4, ya no aparece en estas tablas: dejó de ser pendiente.

---

## 6. Botón Contactar (WhatsApp)

1. En Prospectos o Seguimiento, haz clic en **💬 Contactar**.
2. Se abre WhatsApp con un mensaje prellenado, por ejemplo:
   `Hola Test Fernanda López, te contactamos de Grupo Holandés (Plantel Huajuapan de León).`
3. Como los teléfonos son de prueba, WhatsApp puede decir que el número no
   está en WhatsApp: **es normal**. Lo importante es que el mensaje y el
   plantel sean los correctos.

---

## 7. Comprobación de permisos (5 minutos)

Haz estas 3 pruebas:

1. **Filtro de plantel bloqueado** — en Prospectos y Seguimiento, intenta
   cambiar el plantel: debe estar deshabilitado y fijado al tuyo.
2. **Sin sesión no hay acceso** — abre una ventana incógnita y entra
   directo a `https://grupoholandes.com/admin/prospectos`: debe redirigir
   al login.
3. **Contraseña incorrecta** — captura una contraseña errónea: debe marcar
   error sin conceder acceso.

**Prueba inversa** (que la cuenta de dirección sí vea todos los planteles):
la realiza dirección en su revisión, no con tu usuario.

---

## 8. Vista directivo — revisión de dirección

Esta sección **no aplica a tu cuenta de encargado**: la revisa dirección con
su usuario. Allí se ven estadísticas globales de **todos** los planteles:

- Embudo acumulado y últimos registros (incluyen los `Test`).
- **Finanzas por campaña**: la campaña `pruebas` con sus leads y citas.
- **Citas por día / por tipo** — las 95 citas repartidas en 19 planteles.
- **Por plantel** — los 10 `Test` de cada uno.
- **Trazabilidad por prospecto**: con un teléfono `9510000001` se muestra la
  historia completa (registro + cita).

Si durante tu práctica haces clic en **Vista directivo →**, el sistema te
regresará al dashboard: esa vista es de dirección.

---

## 9. Al terminar

- **No borres datos de la hoja**: los datos `Test` los limpia dirección con la
  rutina de limpieza cuando termine la capacitación. Los cambios de estado
  que practiques en el panel sí quedan guardados: no pasa nada, también se
  limpian con los datos `Test`.
- Si algo no cuadra (conteos, un prospecto de otro plantel visible, un
  error), repórtalo a dirección con captura de pantalla.
- Los datos reales de prospectos **nunca** empiezan con `Test`.

---

## Incidencias conocidas (sin impacto en la práctica)

- **Tierra Blanca** y **Huajuapan** pueden mostrar 11 filas `Test`: son 2
  duplicados de la hoja (borrados en limpieza).
- En **CEMAS (Licenciatura)** la especialidad aparece como
  “Mecánica Automotriz” en algunos desgloses: es el normalizador de
  especialidades de la hoja.
- Los teléfonos `951 000 XXXX` no reciben llamadas ni WhatsApp: son de
  práctica.
