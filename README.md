# COOTRAVIR — Backend (NestJS)

API REST para propuestas comerciales: autenticación JWT, propuestas, diapositivas, mapa, archivos en Supabase.

## Requisitos

- Node.js 20+
- MySQL 8 **local** (no se usa Docker en este proyecto)

## Base de datos (sin Docker)

1. Instale MySQL (XAMPP, WAMP, MySQL Installer, etc.).
2. Ejecute el script:

```sql
-- scripts/setup-mysql-local.sql
```

3. Copie variables de entorno:

```powershell
copy .env.example .env
```

Ajuste `DATABASE_*` si su MySQL usa otro usuario o puerto.

## Instalación y ejecución

```powershell
npm install
npm run start:dev
```

La API escucha en `http://localhost:3001` (variable `PORT`).

Al arrancar se crea el usuario administrador si no existe (`ADMIN_EMAIL`, `ADMIN_PASSWORD` en `.env`).

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_HOST` | Host MySQL (ej. `localhost`) |
| `DATABASE_PORT` | Puerto (por defecto `3306`) |
| `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME` | Credenciales BD |
| `JWT_SECRET` | Secreto para tokens |
| `JWT_EXPIRES_IN` | Ej. `7d` |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role (solo servidor) |
| `SUPABASE_BUCKET` | Nombre del bucket (ej. `propuestas-assets`) |
| `CORS_ORIGIN` | Origen del frontend (ej. `http://localhost:3000`) |
| `LEGACY_TEMPLATE_PATH` | Ruta a `plantilla 1` (relativa o absoluta) |

## Endpoints principales

- `POST /auth/login` — login
- `GET /proposals` — listado (JWT)
- `POST /proposals/:id/duplicate` — copiar por cliente
- `PATCH /proposals/:id/publish` — publicar
- `GET /proposals/by-slug/:slug` — visor público
- `PUT /proposals/:id/slides/:slideId` — guardar diapositiva
- `POST /files/upload` — imagen → Supabase
- `GET /templates` — plantillas del sistema
- `POST /templates` — nueva plantilla (con diapositivas base opcionales)
- `POST /templates/seed-system` — reinstalar plantilla maestra desde assets internos (ADMIN)

La plantilla COOTRAVIR vive en `assets/system-template/` (no depende de carpetas externas).

## Producción

```powershell
npm run build
npm run start:prod
```

En producción use `NODE_ENV=production` y desactive `synchronize` de TypeORM (migraciones manuales recomendadas).
# presentaciones-back
