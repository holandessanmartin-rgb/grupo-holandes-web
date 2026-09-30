# Sustento legal — Plataforma Grupo Holandés (México)

> Documento de trabajo, NO sustituye asesoría jurídica. Validar con abogado
> antes de operar con datos reales a escala.

## Marco aplicable
- **LFPDPPP** + Reglamento + Lineamientos del Aviso de Privacidad (INAI).
- **LFPC (Profeco)**: publicidad veraz — cupón, RVOE, SEP y precios.
- **Normativa SEP**: solo anunciar validez/RVOE reales y vigentes.

## Implementado
1. Aviso integral (`/aviso-privacidad`): identidad, datos, finalidades
   primarias/secundarias, transferencias internacionales (Meta/Google),
   menores con tutor, ARCO 20 días, cookies, seguridad, conservación 3 años.
2. Textos exactos: casilla principal obligatoria + marketing opcional
   desmarcado (registro, citas, apartado); tutor obligatorio 13–17.
3. Banner (Aceptar/Rechazar/Configurar) + panel (Necesarias fijas,
   Analítica, Ubicación) + enlaces footer y aviso; revocación efectiva.
4. Sin auto-geo al entrar; sin coordenadas en backend/cookies/Analytics.
5. Registro de consentimiento (versión 2026-09-30, flags, UTM, origen)
   en backend, Sheets y bitácora; UTM intacto.
6. Términos del cupón publicados (condiciones, vigencia, no acumulable).

## Pendiente (operativo, no código)
- [ ] Designar responsable/contacto ARCO operativo (hoy: correo + WhatsApp).
- [ ] Contratos de encargado con Meta/Google (sus DPA estándar).
- [ ] Verificar vigencia de cada RVOE publicado y CCT 20PBT0186W.
- [ ] Política de respaldos y borrado seguro; registro de incidentes.
- [ ] Revisión anual del aviso y de textos publicitarios.
