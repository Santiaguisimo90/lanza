# Lanza — guía corta

Lanza es [Postiz](https://github.com/gitroomhq/postiz-app) (AGPL-3.0) con marca propia. Fork: https://github.com/Santiaguisimo90/lanza

## Cómo está armado
- Rama `lanza` = Postiz **v2.26.0** + **commits de marca** (los que empiezan con `feat(brand)`: `git log --oneline --grep="feat(brand)"`) + commits de despliegue (`deploy/`).
- Remoto `upstream` = el repo original de Postiz.
- `deploy/local/` = Lanza en tu PC Windows (Docker Desktop + Cloudflare Tunnel). `deploy/` (raíz) = versión para VPS con Caddy. `deploy/monitor/` = Worker de Cloudflare que vigila Lanza desde fuera.
- Las claves viven solo en el `.env` de cada despliegue (no se sube a git) y en secrets de Cloudflare.
- Medios en R2 `lanza-media` (público). Respaldos en R2 `lanza-backups` (privado).

## Día a día en tu PC
- Encender/actualizar: `cd deploy\local` y `docker compose pull && docker compose up -d`.
- Estado: `docker compose ps`. Logs: `docker compose logs -f lanza`.
- Respaldo manual: `docker exec lanza-backup /usr/local/bin/backup.sh now`.
- Al reiniciar Windows todo vuelve solo: inicio de sesión automático → Docker Desktop → los contenedores (`restart: always`) + tarea "Lanza-Arranque" de respaldo.

## Actualizar a una nueva versión de Postiz sin perder la marca
1. `git fetch upstream --tags`
2. `git checkout -b lanza-nueva vX.Y.Z` (la etiqueta nueva de Postiz).
3. `git cherry-pick $(git log --reverse --format=%h --grep="feat(brand)" lanza)` y luego los commits de `deploy`. Los conflictos suelen ser textos con "Postiz": se resuelven con "Lanza" manteniendo el pie "Basado en Postiz".
4. `git push origin lanza-nueva:lanza`. GitHub Actions construye la imagen (`Lanza image`).
5. Respaldo (`backup.sh now`) y luego `docker compose pull lanza && docker compose up -d`.
- **No quites** los avisos AGPL-3.0 ni "Basado en Postiz" (pantalla de acceso, con enlace al código).

## Restaurar un respaldo
1. Baja `lanza-AAAA-MM-DD.sql.gz` del bucket `lanza-backups` (panel de R2).
2. `docker compose stop lanza`
3. Si la base ya tiene datos: `docker exec lanza-postgres psql -U lanza -d postgres -c "DROP DATABASE lanza;" -c "CREATE DATABASE lanza OWNER lanza;"`
4. `gunzip -c lanza-AAAA-MM-DD.sql.gz | docker exec -i lanza-postgres psql -U lanza -d lanza`
5. `docker compose start lanza`
- Guarda aparte `ENCRYPTION_KEY`: sin ella los tokens de las redes del respaldo no se leen.

## Migrar a un VPS (Hostinger KVM 2, Ubuntu 24.04)
Hazlo cuando decidas. Se pierde cero información si sigues el orden. (Verifica en Hostinger que el plan KVM 2 tenga ≥ 8 GB de RAM; con 4 GB va justo.)

**Qué se copia** (todo está en dos lugares): (a) la base de datos de Lanza, (b) el archivo `.env`. Los medios ya están en R2, no hay nada que mover. Redis y Temporal no se migran (se recrean solos; los posts programados viven en la base de Lanza).

**Orden:**
1. **Prepara el VPS** (sin tocar la PC todavía): `curl -fsSL https://get.docker.com | sh`; `git clone https://github.com/Santiaguisimo90/lanza.git /opt/lanza`; `cd /opt/lanza && git checkout lanza`.
2. **Copia el `.env`** de `deploy\local\` al VPS como `/opt/lanza/deploy/.env` (por `scp`, no por chat). Añade `LANZA_DOMAIN=lanza.inmobiliarioec.com`. Quita `CLOUDFLARE_TUNNEL_TOKEN` (en el VPS no se usa; Caddy saca el HTTPS).
3. **Respaldo final en la PC**: `docker exec lanza-backup /usr/local/bin/backup.sh now` y anota la cantidad de canales y posts programados que ves en Lanza.
4. **Detén Lanza en la PC** para que no se escriban datos nuevos: `docker compose stop lanza`.
5. **Haz un último respaldo manual** y bájalo al VPS: `docker exec lanza-postgres pg_dump -U lanza -d lanza | gzip > lanza-final.sql.gz` y cópialo con `scp`.
6. **En el VPS** levanta solo la base: `cd /opt/lanza/deploy && docker compose up -d lanza-postgres lanza-redis`, luego restaura: `gunzip -c lanza-final.sql.gz | docker exec -i lanza-postgres psql -U lanza -d lanza`.
7. **Levanta todo**: `docker compose up -d`. Caddy pedirá el certificado cuando el DNS apunte al VPS.
8. **Cambia el DNS**: en Cloudflare borra la ruta pública del túnel `lanza` (Zero Trust → Tunnels → Public Hostname) y crea el registro **A** `lanza` → IP del VPS (nube gris al inicio).
9. **Re-activa los monitores/respaldos**: el cron `0 3 * * * /opt/lanza/deploy/backup.sh` (ya está en `deploy/`). El Worker `lanza-monitor` no cambia (usa la misma URL).
10. **Apaga Lanza en la PC** solo cuando todo lo de abajo esté bien: `docker compose down` (no uses `-v` hasta una semana después).

**Cómo comprobar que no se perdió nada:**
- [ ] https://lanza.inmobiliarioec.com abre con candado y puedes entrar con tu cuenta.
- [ ] Siguen conectados los mismos canales (Facebook, Instagram…) sin pedir reconectar. Si piden reconectar: `ENCRYPTION_KEY` no es la misma.
- [ ] El conteo de posts programados y publicados coincide con el que anotaste en el paso 3.
- [ ] Se ven las fotos y videos de la biblioteca (vienen de R2).
- [ ] La clave de API sigue funcionando: el Repartidor programa un post de prueba en Facebook.
- [ ] `./backup.sh` sube un archivo nuevo a `lanza-backups`.
- [ ] El Worker `lanza-monitor` no manda avisos y, al apagar Lanza 6 minutos, sí manda uno.

## Lecciones aprendidas (no repetir)
- **Borrar un post en Lanza NO lo borra en Facebook.** Para quitar un post ya publicado hay que borrarlo tambien en Facebook (Meta Business Suite > Publicaciones > Administrar > Eliminar) o desde la propia red.
- **Nunca definir NOT_SECURED** en el compose (ni como "false"): Lanza solo mira si existe y entonces desactiva las cookies seguras; el cierre de sesion deja de funcionar.
- **ENCRYPTION_KEY** debe ser base64 de exactamente 32 bytes (44 caracteres terminados en "=").
- En Meta, cada permiso (pages_manage_posts, instagram_content_publish, threads_content_publish, etc.) hay que agregarlo en Casos de uso > Permisos y funciones antes de conectar; si no, sale "Invalid Scopes".
- Mientras la app de Meta este en modo desarrollo solo funciona con tus cuentas; los evaluadores de Threads deben aceptar la invitacion en Threads > Configuracion > Permisos de sitios web > Invitaciones.

- **Arranque tras reiniciar**: el orquestador de Lanza se conectaba a Temporal antes de que estuviera listo y se quedaba sin trabajar (Lanza abre y se ve bien, pero los posts programados no salen). Arreglado en dos capas: healthcheck en Temporal + `depends_on: service_healthy` (vale para `docker compose up`) y, como Docker revive los contenedores tras un reinicio de Windows SIN respetar depends_on, el `command` de Lanza espera a que Temporal acepte conexiones (puerto 7233) antes de arrancar. Si ves posts atascados en cola: `docker compose restart lanza` (no uses `pm2 restart orchestrator`: deja el puerto 3002 ocupado).

## Cuánto cuesta al mes (estimado)
| Pieza | USD/mes |
|---|---|
| En tu PC (luz aparte) | 0 |
| Cloudflare R2 (primeros 10 GB gratis, luego ~0,015/GB) | 0–1 |
| Cloudflare Tunnel, Workers (monitor), GitHub Actions, ghcr.io | 0 |
| **Total ahora** | **~0–1** |
| Después, VPS Hostinger KVM 2 | consulta el precio vigente en hostinger.com |

## Fábrica (iec-contenido)
El Repartidor usa la API pública de Lanza (`agents/05-repartidor/src/publicar.ts`). Variables: `LANZA_URL`, `LANZA_API_KEY`, `TELEGRAM_BOT_TOKEN`, `SANTI_CHAT_ID`. Los avisos de fallo (publicación fallida o Lanza caída) los manda el Worker `lanza-monitor` con @iec_capitan_bot.
