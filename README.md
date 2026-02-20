# SaaS de Inversión - Search Fund

Plataforma para Search Funds que ayuda en la adquisición de PYMEs en España. Incluye dos herramientas:

- **Sectores**: Análisis de sectores con LLM
- **Empresas**: Gestión de empresas tipo Excel con columnas IA

## Requisitos

- Node.js 18+
- PostgreSQL 16+
- Docker (opcional, para levantar la base de datos)

## Configuración

1. **Clonar e instalar dependencias**
   ```bash
   npm install
   ```

2. **Base de datos**
   ```bash
   # Con Docker
   docker-compose up -d

   # Crear tablas
   npm run db:push
   ```

3. **Variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env y añadir GEMINI_API_KEY (de Google AI Studio)
   ```

4. **Desarrollo**
   ```bash
   npm run dev
   ```

5. **Producción**
   ```bash
   npm run build
   npm start
   ```

## Estructura

- `src/app/` - Rutas Next.js
- `src/components/` - Componentes React
- `src/lib/` - Lógica (DB, LLM, Excel)
- `prisma/` - Esquema de base de datos

## Deploy a producción (Vercel) – compartir link con socios

### 1. Base de datos PostgreSQL en la nube

Elige un proveedor y crea una base de datos:

- **[Neon](https://neon.tech)** – gratis, muy sencillo. Creas proyecto → te dan una `Connection string`.
- **[Supabase](https://supabase.com)** – PostgreSQL + extras. Dashboard → Project Settings → Database → Connection string (URI).
- **[Railway](https://railway.app)** – creas un servicio PostgreSQL y copias la URL.

Guarda la **URL de conexión** (ej. `postgresql://user:password@host:5432/dbname?sslmode=require`). En Neon/Supabase suele llevar `?sslmode=require` al final.

### 2. Crear proyecto en Vercel y conectar el repo

1. Entra en [vercel.com](https://vercel.com) e inicia sesión (con GitHub/GitLab/Bitbucket).
2. **Add New** → **Project** → importa el repositorio de este proyecto.
3. En **Configure Project** no cambies el Framework (Next.js); el build command ya está en `vercel.json`.

### 3. Variables de entorno en Vercel

En el proyecto de Vercel: **Settings** → **Environment Variables**. Añade:

| Nombre           | Valor                    | Entornos      |
|-----------------|---------------------------|---------------|
| `DATABASE_URL`  | La URL de PostgreSQL del paso 1 | Production (y Preview si quieres) |
| `GEMINI_API_KEY`| Tu API key de Google AI Studio  | Production (y Preview si quieres) |

No marques “Sensitive” si no es necesario; sí mantén “Production” para que el deploy use estas variables.

### 4. Crear las tablas en la base de datos de producción

La primera vez (o cuando cambies el esquema Prisma) hay que aplicar el esquema a la BD de producción:

```bash
# En tu máquina, con la URL de producción (o usa la misma que tiene Vercel)
DATABASE_URL="postgresql://..." npx prisma db push
```

Puedes copiar la `DATABASE_URL` desde Vercel (Settings → Environment Variables) y pegarla en ese comando. Así las tablas se crean/actualizan en la BD que usará la app en producción.

### 5. Deploy

1. Haz **Deploy** (o un push a la rama conectada).
2. Cuando termine, Vercel te dará una URL tipo `https://tu-proyecto.vercel.app`.
3. Ese es el link que puedes mandar a tus socios para testing.

### 6. (Opcional) Dominio propio

En **Settings** → **Domains** puedes añadir un dominio (ej. `app.tudominio.com`) y seguir las instrucciones de DNS.

---

**Resumen:** Repo en Vercel → `DATABASE_URL` + `GEMINI_API_KEY` en env → `DATABASE_URL="..." npx prisma db push` una vez → deploy → compartir el link de Vercel.
