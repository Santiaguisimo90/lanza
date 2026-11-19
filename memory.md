# memory.md — Lanza (fork de Postiz)

## Estado actual y próximo paso
- Lanza corre en la PC de oficina (Docker Desktop + Cloudflare Tunnel) en https://lanza.inmobiliarioec.com. Registro cerrado, respaldo diario a R2 (probado), medios en R2 (probado), Worker lanza-monitor con aviso a Telegram (activo).
- Meta: app Lanza (ID 1345839520901176, modo desarrollo). Conectados Facebook (Inmobiliario-ec), Instagram (InmobiliarioEc) y Threads (inmobiliarioec).
- Repartidor (iec-contenido): publicar.ts probado de punta a punta en Facebook (programado, publicado, borrado). Borrar desde Lanza no borra en Facebook.
- Instagram y Threads probados de punta a punta con imagen (programado por el Repartidor, publicado, borrado en cada red).
- Arreglado: tras reiniciar, el orquestador no se conectaba a Temporal (healthcheck + depends_on). Falta repetir la prueba con reinicio real de Windows.
- Pendiente: reinicio real de Windows (<5 min y posts programados saliendo), rotar token R2 lanza-r2 (se expuso parcialmente), pasar LANZA_API_KEY a secrets de iec-contenido en la nube, LinkedIn/Google/Pinterest/YouTube/TikTok.
- Sin secretos en el repo. .env en deploy/local ignorado por git.
- Actualizado: 2026-11-19 · por: Claude