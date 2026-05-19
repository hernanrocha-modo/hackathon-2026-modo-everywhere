# SUBE - Lector QR Transporte

Aplicacion React que simula una terminal SUBE de transporte. Usa la camara de la Mac para leer codigos QR (mostrados desde un smartwatch) y muestra el resultado del pago.

## Requisitos

- Node.js 18+
- npm

## Levantar localmente

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre http://localhost:5173 en el navegador. Se pedira permiso para usar la camara.

## Formato del QR

El QR debe contener un JSON con el campo `result`:

```json
{ "result": "success" }
```

Valores posibles:
- `"success"` — Pago exitoso, muestra el monto cobrado
- `"no_balance"` — Saldo insuficiente
- `"error"` — Error al procesar el pago

Si el QR no contiene JSON valido, el resultado se genera de forma aleatoria.

## Build para produccion

```bash
npm run build
```

Los archivos estaticos quedan en `dist/`.

# Instalar SUBE Lector QR en celular (PWA)

Esta app es una PWA (Progressive Web App) que se puede instalar en cualquier celular Android o iPhone directamente desde el navegador, sin necesidad de app stores.

## Opcion 1: Red local (sin internet)

Ideal para demos. Tu Mac sirve la app y el celular se conecta por WiFi.

### Requisitos

- Mac y celular en la **misma red WiFi**
- Node.js instalado en la Mac

### Pasos

1. **Levantar el servidor en la Mac:**

   ```bash
   cd qr-reader
   npm run dev
   ```

   La terminal va a mostrar algo como:

   ```
   Local:   https://localhost:5173/
   Network: https://192.168.1.45:5173/
   ```

   Anotá la IP de "Network" (ej: `192.168.1.45`).

2. **Desde el celular**, abrir Chrome y entrar a:

   ```
   https://192.168.1.45:5173
   ```

   (Reemplazar con tu IP real)

3. **Aceptar el certificado:** El navegador va a mostrar una advertencia de seguridad porque el certificado es autofirmado. Tocar "Configuracion avanzada" > "Continuar al sitio".

4. **Permitir acceso a la camara** cuando el navegador lo pida.

5. **Instalar como app (opcional):**
    - **Android (Chrome):** Tocar el menu (tres puntos) > "Instalar app" o "Agregar a pantalla de inicio"
    - **iPhone (Safari):** Tocar el boton de compartir > "Agregar a pantalla de inicio"

   La app aparece con icono propio y se abre sin barra de navegador.

### Importante

- La app solo funciona mientras la Mac tenga el servidor corriendo
- Si la IP de la Mac cambia, hay que actualizar la URL en el celular

---

## Opcion 2: Build estatico + servidor en la Mac

Si no queres tener el entorno de desarrollo corriendo:

1. **Buildear:**

   ```bash
   npm run build
   ```

   Esto genera la carpeta `dist/` con todos los archivos necesarios.

2. **Servir con Vite preview (usa el mismo HTTPS configurado):**

   ```bash
   npx vite preview --host
   ```

   Esto levanta un servidor HTTPS con la build de produccion. Acceder desde el celular igual que en la opcion 1.

---

## Opcion 3: Hosting gratuito (con internet)

Para acceder desde cualquier lugar sin depender de la red local.

1. **Buildear:**

   ```bash
   npm run build
   ```

2. **Subir a Netlify (la mas rapida):**

   ```bash
   npx netlify-cli deploy --prod --dir=dist
   ```

   O simplemente arrastra la carpeta `dist/` a [app.netlify.com/drop](https://app.netlify.com/drop).

3. Te da una URL publica con HTTPS (ej: `https://sube-qr.netlify.app`).

4. Entrar desde el celular, instalar como PWA, y listo.

**Alternativas:** Vercel (`npx vercel --prod`), GitHub Pages, Firebase Hosting.

---

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| La camara no funciona | Asegurate de estar usando HTTPS (no HTTP). La camara solo funciona en HTTPS o localhost |
| No puedo acceder desde el celular | Verifica que Mac y celular estan en la misma red WiFi. Proba hacer ping a la IP de la Mac desde el celular |
| Chrome no ofrece "Instalar app" | Recarga la pagina. A veces tarda unos segundos en detectar el manifest de PWA |
| El certificado es rechazado | En Android Chrome: "Configuracion avanzada" > "Continuar". En iOS Safari no siempre se puede con cert autofirmado, usar opcion 3 |

