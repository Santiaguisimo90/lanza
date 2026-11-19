# memory.md — Lanza (fork de Postiz)

## Estado actual y próximo paso
- Lanza corre en la PC de oficina (Docker Desktop + Cloudflare Tunnel) en https://lanza.inmobiliarioec.com. Registro cerrado, respaldo diario a R2 (probado), medios en R2 (probado), Worker lanza-monitor con aviso a Telegram (activo).
- Meta: app Lanza (ID 1345839520901176, modo desarrollo). Conectados Facebook (Inmobiliario-ec), Instagram (InmobiliarioEc) y Threads (inmobiliarioec).
- Repartidor (iec-contenido): publicar.ts probado de punta a punta en Facebook (programado, publicado, borrado). Borrar desde Lanza no borra en Facebook.
- Pendiente: probar Instagram y Threads (imagen), prueba de reinicio de Windows (<5 min), pasar LANZA_API_KEY a los secrets de iec-contenido en la nube, demas redes (LinkedIn, Google, Pinterest, YouTube, TikTok), rotar token R2 lanza-r2 (se expuso parcialmente en un log).
- Sin secretos en el repo. .env en deploy/local ignorado por git.
- Actualizado: 2026-11-19 · por: Claude