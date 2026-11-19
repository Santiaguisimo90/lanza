# memory.md — Lanza (fork de Postiz)

## Estado actual y próximo paso
- Hecho: fork `Santiaguisimo90/lanza`, rama `lanza` sobre Postiz v2.26.0. 1 commit de marca (`feat(brand)`) + commits de `deploy/` (VPS con Caddy, local Windows con Cloudflare Tunnel, respaldo diario a R2, Worker `lanza-monitor`).
- Imagen Docker `ghcr.io/santiaguisimo90/lanza` construida por GitHub Actions (OK). Visibilidad del paquete sin verificar (puede requerir ponerla pública).
- Repartidor (iec-contenido): `publicar.ts`, `lanza.ts`, `revisar-lanza.ts` escritos y commiteados; typecheck OK, nunca probados contra un Lanza real.
- Plan actual: correr Lanza en la PC de oficina (Docker Desktop + Cloudflare Tunnel) 1–2 semanas, luego migrar a VPS Hostinger KVM 2 (pasos en `deploy/docs/README_LANZA.md`).
- Docker Desktop 4.99.0 instalado; WSL 2 instalado por Santi; falta REINICIAR Windows.
- Próximo paso: Santi reinicia, abre Docker Desktop (marca "Start when you sign in") y dice "Docker listo". Luego: `deploy/local/preparar-windows.ps1` (admin), R2 (`lanza-media` público, `lanza-backups` privado), túnel de Cloudflare, `.env`, `docker compose up -d`, prueba de reinicio, app de Meta para Facebook/Instagram.
- Espera de Santi: todo lo de `deploy/docs/PENDIENTES_SANTIAGO.md` (pasos 1–13).
- Sin secretos en el repo. `deploy/local/.env` y `deploy/.env` están en .gitignore.
- Actualizado: 2026-11-19 · por: Claude
