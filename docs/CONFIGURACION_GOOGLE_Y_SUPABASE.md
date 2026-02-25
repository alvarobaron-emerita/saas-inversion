# Configuración Google Cloud y Supabase para login

## 1. Google Cloud Console (completar lo que falta)

Ya tienes el **ID de cliente** y el **Secreto del cliente**. Falta:

### Orígenes autorizados de JavaScript
Haz clic en **"+ Agregar URI"** y añade:
- `http://localhost:3000` (desarrollo)
- Cuando tengas producción, añade también la URL de tu app (ej. `https://tu-app.vercel.app`)

### URIs de redireccionamiento autorizados
**Primero** crea el proyecto en Supabase (paso 2) y activa Google ahí. Supabase te mostrará una URL de callback como:
`https://<TU-PROJECT-REF>.supabase.co/auth/v1/callback`

En Google Cloud, en **"+ Agregar URI"** de "URIs de redireccionamiento autorizados", añade exactamente esa URL (la copias desde Supabase).

Guarda los cambios en Google Cloud.

---

## 2. Supabase – pasos uno a uno

### Paso 1: Crear proyecto
1. Entra en [supabase.com](https://supabase.com) e inicia sesión.
2. **New project**: elige organización, nombre del proyecto (ej. "saas-inversion"), contraseña de la base de datos (guárdala), región.
3. Espera a que el proyecto esté listo.

### Paso 2: Obtener URL y anon key
1. En el menú izquierdo: **Project Settings** (icono de engranaje).
2. **API**: anota **Project URL** y **anon public** (clave pública). Las usarás en `.env.local` como `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Paso 3: Activar Google como proveedor
1. En el menú: **Authentication** → **Providers**.
2. Busca **Google** y actívalo (toggle On).
3. En **Client ID** pega el ID de tu cliente OAuth de Google Cloud (ej. `xxxx.apps.googleusercontent.com`).
4. En **Client Secret** pega el secreto del cliente (lo ves en Google Cloud → Credentials → tu cliente OAuth).
5. Supabase muestra **Callback URL (for OAuth)**. Cópiala (ej. `https://xxxx.supabase.co/auth/v1/callback`).
6. Guarda (Save).

### Paso 4: Añadir esa callback en Google Cloud
1. Vuelve a Google Cloud Console → tu cliente OAuth → **URIs de redireccionamiento autorizados**.
2. **"+ Agregar URI"** y pega la URL que copiaste de Supabase. Guardar.

### Paso 5: URL de la app en Supabase (opcional pero recomendado)
1. En Supabase: **Authentication** → **URL Configuration**.
2. **Site URL**: en desarrollo pon `http://localhost:3000` (en producción tu dominio).
3. **Redirect URLs**: añade `http://localhost:3000/**` y, en producción, `https://tu-dominio.com/**`.

---

## 3. Variables de entorno en el proyecto

Crea o edita `.env.local` en la raíz del proyecto (no se sube a git):

```env
# Ya existentes
DATABASE_URL="postgresql://..."
GEMINI_API_KEY="..."

# Supabase (valores de Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Reinicia el servidor de desarrollo (`npm run dev`) después de cambiar `.env.local`.
