# PENDIENTES_SANTIAGO — lo que solo tú puedes hacer (Lanza en tu PC)

Plan actual: Lanza corre en **tu computadora Windows** con Docker Desktop y sale a internet por un **Cloudflare Tunnel** (sin abrir puertos en el router). El VPS queda para después (pasos de migración en `README_LANZA.md`).

Haz los pasos **en orden**. Los valores que copies van al archivo `.env` de la carpeta `lanza\deploy\local\`. **Nunca pegues claves en el chat ni en GitHub.**

Ya está listo (no tienes que hacer nada): la marca Lanza, la imagen Docker, el compose con límite de memoria (~4,6 GB en total), el respaldo diario a R2, el script de preparación de Windows, el monitor externo con aviso a Telegram y la herramienta "publicar" del Repartidor.

---

## 1. Docker Desktop (instalado el 2026-11-19; falta WSL 2 y reiniciar)
- Docker Desktop 4.99.0 ya está instalado. **Falta WSL 2**, que necesita permisos de administrador (yo no los tengo):
  1. Clic derecho en PowerShell → **Ejecutar como administrador**.
  2. Escribe `wsl --install --no-distribution` y Enter.
  3. **Reinicia Windows.**
  4. Abre **Docker Desktop**, acepta los términos y espera a que diga "Engine running".
- Docker Desktop → ⚙ Settings → General → marca **"Start Docker Desktop when you sign in"**.

## 2. Preparar Windows (1 min)
- Clic derecho en PowerShell → **Ejecutar como administrador**:
  ```
  cd "E:\CLAUDE\PROYECTOS\lanza publicador\lanza\deploy\local"
  powershell -ExecutionPolicy Bypass -File .\preparar-windows.ps1
  ```
- Esto limita Docker a 6 GB, desactiva la suspensión, crea el `.env` con claves aleatorias y la tarea de arranque "Lanza-Arranque".
- **Guarda una copia de `ENCRYPTION_KEY`** (está en el `.env`) en tu gestor de claves. Si la pierdes hay que reconectar todas las redes.

## 3. Inicio de sesión automático de Windows (para que vuelva solo tras un corte de luz)
Docker Desktop solo arranca cuando se inicia sesión. Para que no tengas que hacerlo tú:
1. Tecla Windows + R → escribe `netplwiz` → Enter.
2. Desmarca **"Los usuarios deben escribir su nombre y contraseña para usar el equipo"** → Aceptar → escribe tu contraseña de Windows.
- Alternativa más segura si no quieres dejar la sesión abierta: dímelo y buscamos otra forma (Docker Engine dentro de WSL como servicio).
- Revisa también que Windows Update no reinicie en horas de trabajo: Configuración → Windows Update → Opciones avanzadas → Horas activas.

## 4. Cloudflare R2: crear los buckets
1. https://dash.cloudflare.com → **R2 Object Storage** → *Create bucket*.
2. Bucket **`lanza-media`** (fotos y videos). Luego Settings → **Public access** → *Connect domain* → `media-lanza.inmobiliarioec.com` (o activa el `r2.dev` si prefieres rápido).
3. Bucket **`lanza-backups`** (respaldos). **Déjalo privado**, sin dominio público. Settings → *Object lifecycle rules* → borrar objetos a los 14 días (opcional: el script ya borra los viejos).
4. R2 → **Manage API tokens** → *Create API token* → permiso **Object Read & Write** sobre los dos buckets.
5. Copia al `.env`:
   - `R2_ACCOUNT_ID` = tu Account ID (barra derecha de R2)
   - `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` = del token
   - `R2_PUBLIC_URL` = la URL pública de `lanza-media` (ej. `https://media-lanza.inmobiliarioec.com`)

## 5. Cloudflare Tunnel (lo que pone Lanza en internet)
1. https://one.dash.cloudflare.com → **Networks → Tunnels → Create a tunnel** → *Cloudflared* → nombre `lanza`.
2. En "Install and run a connector" **no instales nada**: solo copia el **token** (el texto largo después de `--token`) → `CLOUDFLARE_TUNNEL_TOKEN` en el `.env`.
3. Pestaña **Public Hostname → Add**: Subdomain `lanza`, Domain `inmobiliarioec.com`, Service **HTTP**, URL **`lanza:5000`**.
4. Si ya existe un registro DNS `lanza` (A/CNAME) en inmobiliarioec.com, bórralo antes; el túnel crea el suyo.

## 6. Telegram (avisos de respaldo)
- En el `.env`: `TELEGRAM_BOT_TOKEN` = token de @iec_capitan_bot (el mismo de la fábrica) y `TELEGRAM_CHAT_ID` = tu chat (el mismo valor de `SANTI_CHAT_ID`).

## 7. Encender Lanza
```
cd "E:\CLAUDE\PROYECTOS\lanza publicador\lanza\deploy\local"
docker compose up -d
```
- La primera vez descarga la imagen `ghcr.io/santiaguisimo90/lanza:latest`. Si da error de acceso: GitHub → tu perfil → Packages → `lanza` → Package settings → **Change visibility → Public**.
- Abre https://lanza.inmobiliarioec.com (también desde el celular con datos móviles). Crea tu cuenta.
- Después pon `DISABLE_REGISTRATION=true` en el `.env` y corre otra vez `docker compose up -d`.
- Prueba el respaldo: `docker exec lanza-backup /usr/local/bin/backup.sh now` y confirma que aparece un archivo en `lanza-backups`.

## 8. Prueba de reinicio (criterio 2)
- Reinicia Windows, no toques nada y cronometra: Lanza debe abrir en menos de 5 minutos. Si no, dime qué ves.

## 9. Monitor externo con aviso a Telegram (avisa aunque la PC esté apagada)
En PowerShell, dentro de `lanza\deploy\monitor`:
```
npx wrangler login
npx wrangler kv namespace create ESTADO
```
- Pega el `id` que muestra en `wrangler.toml` (descomenta el bloque `kv_namespaces`).
- Luego, uno por uno (te pide el valor, no queda en pantalla ni en archivos): `npx wrangler secret put LANZA_API_KEY`, `... TELEGRAM_BOT_TOKEN`, `... TELEGRAM_CHAT_ID`, y `npx wrangler deploy`.
- `LANZA_API_KEY` la sacas en Lanza → Settings → **Public API**.

## 10. Facebook e Instagram (prioridad)
1. https://developers.facebook.com/apps → **Crear app** → nombre **Lanza** → tipo **Business**.
2. Agrega **Facebook Login for Business** e **Instagram** (API con inicio de sesión de Facebook).
3. En *Valid OAuth Redirect URIs* pega: `https://lanza.inmobiliarioec.com/integrations/social/facebook` y `https://lanza.inmobiliarioec.com/integrations/social/instagram`
4. App settings → Basic: **App ID** → `FACEBOOK_APP_ID`, **App secret** → `FACEBOOK_APP_SECRET`.
5. Mientras la app esté en modo desarrollo y tú seas administrador, **no necesita revisión de Meta** (solo tus cuentas). Tu Instagram debe ser cuenta *Profesional* enlazada a la página de Facebook.
6. `docker compose up -d` y en Lanza → *Add Channel* → Facebook e Instagram.
- **Buffer no se toca.**

## 11. Clave de API para la fábrica
- Con Lanza andando: Settings → **Public API** → copia la clave y guárdala como secret `LANZA_API_KEY` (junto a `LANZA_URL=https://lanza.inmobiliarioec.com`) en iec-contenido.

## 12. Después, las demás redes (una por una, sin prisa)
- **Threads**: producto Threads en la misma app de Meta → https://developers.facebook.com/docs/threads (redirect `.../integrations/social/threads`) → `THREADS_APP_ID/SECRET`.
- **LinkedIn**: https://www.linkedin.com/developers/apps (app **Lanza**) → `LINKEDIN_CLIENT_ID/SECRET`.
- **Google Mi Negocio y YouTube**: https://console.cloud.google.com (proyecto **Lanza**; la API de Mi Negocio hay que pedirla). YouTube sale **privado** hasta la auditoría.
- **Pinterest**: https://developers.pinterest.com/apps/ (app **Lanza**).
- **TikTok**: https://developers.tiktok.com/apps (app **Lanza**). Sale **privado** hasta la auditoría.
- Las redirecciones siguen el mismo patrón: `https://lanza.inmobiliarioec.com/integrations/social/<red>`.

## 13. Pruebas finales (avísame y las hacemos juntos)
- Post de prueba programado en Facebook e Instagram, público, y luego borrarlo.
- Post real desde el Repartidor por la API de Lanza.
- Forzar un fallo y confirmar el aviso de Telegram.

---
X (Twitter) queda fuera.
