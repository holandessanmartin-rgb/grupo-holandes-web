# Acumular prospectos en Google Sheets (Drive)

Cada formulario (`/registro` y `/citas`) puede agregar una fila automáticamente
a una hoja de cálculo, además del WhatsApp y el guardado local.

## 1. Crear la hoja (5 min, una sola vez)
1. En Drive crea una hoja, p. ej. **"Prospectos GH"**.
2. Menú **Extensiones → Apps Script**.
3. Borra el código de ejemplo y pega el contenido de `scripts/Code.gs`.
4. Guarda (Ctrl+S).
5. **Implementar → Nueva implementación → App web**:
   - *Ejecutar como:* **Yo**
   - *Acceso:* **Cualquier usuario (incluso anónimo)**
   - Implementar y **autorizar** con tu cuenta.
6. Copia la URL que termina en `/exec`.

## 2. Conectar la plataforma
Pega la URL en `data/app-config.js`:
```js
sheetsWebhookUrl: 'https://script.google.com/macros/s/TU_ID/exec',
```
Sube el cambio (o recarga si corres en local). Listo: no hay nada más que configurar.

## 3. Qué se guarda
- Hoja **Prospectos**: fecha, cupón, nombre, teléfono, edad, especialidad,
  plantel, horario, cómo conociste, comentarios, origen, página, campaña
  (source/medium/campaign), canal y vía (api/netlify).
- Hoja **Citas**: lo anterior + tipo, fecha y horario de cita.
- Hoja **Inscripciones** (opcional, créala con encabezados
  `fecha, nombre, plantel, especialidad, cupon`): alimenta la gráfica de
  inscripciones acumuladas del panel directivo.
Los encabezados de Prospectos/Citas se crean solos en la primera fila.

## 4. Panel directivo
`/directivo` lee las hojas en vivo (`?action=stats[&plantel=...]`) para
graficar prospectos, citas, visitas programadas/realizadas, inscripciones,
interacciones y finanzas. Tras modificar `Code.gs`, publica siempre una
**nueva versión**.

## 5. Finanzas por campaña
Crea renglones en la hoja **Costos** con columnas
`campaña, canal, monto, inicio, fin, plantel, especialidad`
(plantel/especialidad vacíos = aplica a todo; fechas YYYY-MM-DD).
El panel atribuye prospectos por campaña+periodo y calcula CPL,
costo por cita/visita/inscrito y conversión, global y por campaña,
respetando el filtro por plantel.

## Notas
- El envío a Sheets es silencioso: si falla, el registro y WhatsApp siguen funcionando.
- Si cambias el código `.gs`, crea una **nueva versión** de la implementación para que aplique.
- Para redesplegar en Netlify basta subir `data/app-config.js` actualizado.
