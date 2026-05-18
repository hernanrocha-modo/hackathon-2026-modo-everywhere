# PRD — Modo Everywhere (Smartwatch)

**Autor:** Hernán Rocha
**Fecha:** 2026-05-18
**Estado:** Draft — pendiente de aprobación
**Plataforma destino:** ZeppOS (Amazfit GTR3, GTR3-Pro, T-Rex 2 — pantalla 454×454)

---

## 1. Contexto y objetivo

Modo es una wallet móvil. Hoy toda la experiencia vive en el teléfono. Queremos llevar al smartwatch las dos interacciones que el usuario hace "en movimiento" y donde sacar el teléfono es fricción:

1. **Pagar el transporte público** mostrando un QR en la pantalla del reloj.
2. **Recibir notificaciones** de eventos importantes de la wallet sin tener que mirar el celular.

El objetivo del MVP es validar que un usuario de Modo pueda pagar el transporte y enterarse de movimientos de plata **sin sacar el teléfono del bolsillo**.

---

## 2. Métricas de éxito (post-launch)

- ≥ 30% de los usuarios que instalan la app del reloj usan el botón "QR Transporte" al menos 1 vez por semana.
- p95 < 2 s desde tap en el botón hasta QR visible en pantalla.
- Tasa de QR escaneados con éxito al primer intento ≥ 90%.
- 0 incidentes de seguridad por QR reutilizado o filtrado.

---

## 3. Usuarios y casos de uso

**Usuario tipo:** persona con cuenta Modo activa en el teléfono, con un smartwatch Amazfit emparejado.

**Casos de uso prioritarios:**
- *Pagar el colectivo/subte*: levanto la muñeca, abro la app, toco "Transporte", apoyo el reloj en el validador.
- *Enterarme de un cobro*: alguien me transfiere y el reloj vibra avisándome el monto y de quién.
- *Ver una promo activa*: aviso de cashback o beneficio relevante.

**Fuera de scope (no-goals) del MVP:**
- Pago en comercios (POS) o QR a comercio.
- Transferencias iniciadas desde el reloj.
- Consulta de saldo o historial detallado.
- Login / onboarding desde el reloj (se asume que ya hay pairing previo con la app de Modo en el teléfono).

---

## 4. Arquitectura general

```
┌──────────────┐  BLE/Messaging   ┌──────────────┐  HTTPS   ┌──────────────┐
│  Smartwatch  │ ◄──────────────► │  Modo app    │ ◄──────► │ Backend Modo │
│  (ZeppOS)    │                  │  (companion) │          │   (APIs)     │
└──────────────┘                  └──────────────┘          └──────────────┘
```

**Decisión clave:** el reloj **no** habla con el backend directamente. Todo pasa por la app de Modo del teléfono vía el sistema de messaging de ZeppOS (`messageBuilder`). Razones:
- Reutilizamos la sesión/autenticación que ya vive en la app del teléfono.
- Evitamos depender del Wi-Fi del reloj (no siempre disponible).
- Una sola superficie hablando con backend → más seguro y más fácil de auditar.

**Repos / superficies involucradas:**
- `modo-everywhere/` (este repo) → app del reloj (ZeppOS).
- App Modo del teléfono → companion side (a definir el módulo concreto en otro PRD/ticket).
- Backend Modo → endpoints para QR de transporte y push de eventos.

---

## 5. Feature 1 — Botón "QR Pago Transporte"

### 5.1 User flow

1. Usuario abre la app Modo en el reloj → ve pantalla `home` con botón **"QR Transporte"** ocupando el área principal.
2. Toca el botón.
3. Reloj muestra estado **Loading** (spinner + texto "Generando QR…").
4. Reloj pide al companion (vía messaging) un QR de transporte.
5. Companion llama a la API de Modo y devuelve la imagen/payload del QR.
6. Reloj renderiza el QR ocupando **toda la pantalla** (full-screen, alto contraste, sin chrome).
7. Aparece un **contador de TTL** discreto (ej. círculo decreciente o "Expira en 28s") en una esquina.
8. Cuando el TTL llega a 0, el QR se renueva automáticamente (loop hasta que el usuario salga de la pantalla).
9. Tap en cualquier parte (o botón físico back) → vuelve al home.

### 5.2 Comportamiento del QR

- **Un solo uso, corta vida.** TTL inicial sugerido: **60 segundos** (configurable desde backend).
- **Refresh automático** al expirar mientras el usuario esté en la pantalla.
- **Brillo:** subir brillo de pantalla al máximo mientras está visible (mejora lectura del scanner). Restaurar al salir.
- **Pantalla siempre encendida** mientras el QR está activo (evitar AOD/dim).

### 5.3 Contrato de API (mock-first)

**Endpoint (backend Modo — propuesto):**
```
POST /v1/transport/qr
Authorization: Bearer <token de sesión Modo>
Body: {}
```

**Response:**
```json
{
  "qrId": "uuid",
  "payload": "string-codificable-en-qr",
  "imageBase64": "data:image/png;base64,...",   // opcional, ver 5.4
  "ttlSeconds": 60,
  "issuedAt": "2026-05-18T12:34:56Z"
}
```

**Mock inicial:** el companion (o stub local en el reloj durante desarrollo) devuelve un payload fijo + `ttlSeconds: 60`. La imagen se genera on-device a partir de `payload` con una lib de QR para ZeppOS, **o** se transmite ya rasterizada en base64 desde el companion. Decisión técnica a tomar en el ticket de implementación; el contrato soporta ambas.

### 5.4 Mensajería reloj ↔ teléfono

Mensajes mínimos (formato JSON sobre `messageBuilder.request`):

- **Request:** `{ "type": "transport.qr.request" }`
- **Response OK:** `{ "type": "transport.qr.response", "qrId": "...", "payload": "...", "imageBase64": "...", "ttlSeconds": 60 }`
- **Response error:** `{ "type": "transport.qr.error", "code": "NO_SESSION" | "NETWORK" | "BACKEND", "message": "..." }`

### 5.5 Edge cases

| Caso | Comportamiento |
|---|---|
| No hay sesión activa en la app del teléfono | Mensaje en pantalla: "Abrí la app de Modo en el teléfono". Botón "Reintentar". |
| El teléfono está fuera de rango (BLE caído) | Timeout 5 s → "Sin conexión con el teléfono". Botón "Reintentar". |
| Backend responde error | Mensaje genérico "No pudimos generar el QR" + "Reintentar". |
| TTL expira sin red para refrescar | Se muestra el último QR con un overlay "Expirado — Reintentar". |
| Usuario sale de la pantalla | Cancelar request pendiente, restaurar brillo y AOD. |

### 5.6 Requisitos no funcionales

- p95 tap-a-render < 2 s en condiciones normales (BLE estable, app del teléfono en foreground o background reciente).
- No persistir el `payload` del QR en disco bajo ninguna circunstancia.
- Loggear sólo `qrId` (nunca el payload completo).

---

## 6. Feature 2 — Notificaciones en el reloj

### 6.1 Alcance MVP

Sólo dos tipos en el MVP:

1. **Transferencias recibidas** — alguien te mandó plata.
2. **Promos / Cashback** — beneficio o devolución relevante para el usuario.

(Pagos realizados, alertas de seguridad y otros tipos quedan para una siguiente fase.)

### 6.2 User flow

1. Backend Modo emite un evento (ej. transferencia recibida).
2. Push notification → app de Modo en el teléfono.
3. La app del teléfono filtra los eventos que corresponde reenviar al reloj y los manda vía messaging.
4. El reloj recibe el evento → dispara una **notificación nativa de ZeppOS** (vibración + tarjeta visible al levantar la muñeca).
5. Tap en la notificación → abre la app de Modo en el reloj en una pantalla de detalle (lectura, no acción).

### 6.3 Contenido por tipo

**Transferencia recibida:**
- Título: `+ $12.500`
- Línea 1: `De: Juan P.` (nombre acortado si excede)
- Línea 2: `Hoy 14:32`
- Icono: flecha entrante / logo Modo

**Promo / Cashback:**
- Título: `Cashback recibido` o `Promo activa`
- Línea 1: descripción corta (ej. `15% en supermercados`)
- Línea 2: vigencia (ej. `Hasta 31/05`)
- Icono: estrella / regalo

### 6.4 Contrato de mensaje (teléfono → reloj)

```json
{
  "type": "notification.push",
  "eventId": "uuid",
  "category": "transfer_in" | "promo",
  "title": "string ≤ 24 chars",
  "body": "string ≤ 60 chars",
  "metadata": { "amount": 12500, "currency": "ARS", "from": "Juan P." },
  "timestamp": "2026-05-18T14:32:00Z"
}
```

El reloj **no decide** qué notificar — sólo renderiza lo que le manda el companion. Toda la lógica de filtrado, dedupe y priorización vive en el teléfono.

### 6.5 Comportamiento en el reloj

- **Vibración:** patrón corto (1 pulso) para promos, patrón medio (2 pulsos) para transferencias.
- **Persistencia:** las últimas N=20 notificaciones quedan disponibles en una vista "Historial" dentro de la app del reloj (out of scope si complica el MVP — ver Open Questions).
- **No molestar:** respetar el modo DND nativo del reloj. Si está activo, no vibrar (la notificación igual aparece en historial).
- **Idempotencia:** si el mismo `eventId` llega dos veces, no duplicar.

### 6.6 Edge cases

| Caso | Comportamiento |
|---|---|
| Reloj desconectado del teléfono cuando llega el evento | El teléfono encola los eventos no entregados y los manda al reconectar (TTL 24 h). |
| Texto excede el ancho de pantalla | Truncar con `…` — la lógica de truncado vive en el companion. |
| Usuario tiene la app del reloj abierta en otra pantalla | La notificación aparece igual (no interrumpe el QR si está visible: ahí se encola). |

---

## 7. Plan de implementación (fases)

**Fase 0 — Esqueleto y mocks (este sprint)**
- Renombrar/reconfigurar `app.json` (appName, appId, icon).
- Pantalla `home` con botón "QR Transporte" estilado.
- Pantalla `qr` full-screen mostrando un QR **mockeado localmente** (imagen estática).
- Stub de notificación: comando de test que dispara una notificación fake al reloj.

**Fase 1 — Mensajería con companion**
- Cliente de messaging en el reloj (`messageBuilder` request/response).
- Contrato definido en sección 5.4 y 6.4.
- Mock del companion side (mock server local) que responde el QR y empuja notificaciones de prueba.

**Fase 2 — Integración real**
- Companion real en la app de Modo del teléfono.
- Conexión a endpoints reales del backend.
- Manejo completo de errores y reintentos.

**Fase 3 — Polish**
- Animaciones de transición, brillo automático, vibración fina, historial de notificaciones.

---

## 8. Riesgos y Open Questions

1. **Generación del QR on-device vs base64 del backend** — definir antes de Fase 1 según peso y latencia.
2. **Historial de notificaciones en el reloj** — ¿entra en MVP o se posterga?
3. **Identidad del usuario en el QR** — ¿el `payload` incluye `userId` claro, token efímero, o referencia a `qrId` que el backend resuelve al validar? Definir con el equipo de transporte/SUBE.
4. **Companion app** — necesitamos ownership del lado teléfono (qué equipo, qué timeline). Sin eso, el MVP queda capado en Fase 1 (todo mock).
5. **Permisos ZeppOS** — declarar `internet`/`bluetooth` según corresponda en `app.json > permissions`.

---

## 9. Aprobación

- [ ] Producto (Hernán)
- [ ] Equipo Backend Modo (endpoint QR + push eventos)
- [ ] Equipo App Modo Teléfono (companion side)
- [ ] Seguridad (revisión del flujo de QR y tokens)
