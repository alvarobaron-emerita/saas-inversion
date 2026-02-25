import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/db/prisma";
import type { User } from "@prisma/client";

function parseCookieHeader(cookieHeader: string | null): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((c) => {
    const eq = c.trim().indexOf("=");
    const name = eq > 0 ? c.trim().slice(0, eq).trim() : c.trim();
    const value = eq > 0 ? c.trim().slice(eq + 1).trim() : "";
    return { name, value };
  });
}

/**
 * Obtiene el usuario de Prisma asociado a la sesión Supabase (vía cookies del request).
 * Si el usuario existe en Supabase pero no en Prisma, lo crea/actualiza.
 * Devuelve null si no hay sesión o si Supabase no está configurado.
 */
export async function getSessionUser(request: Request): Promise<User | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("cookie") ?? null);
        },
        setAll() {
          // En API routes no escribimos cookies; solo lectura de sesión.
        },
      },
    }
  );

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.id) return null;

  const user = await prisma.user.upsert({
    where: { id: authUser.id },
    create: {
      id: authUser.id,
      email: authUser.email ?? "",
      name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
      avatarUrl: authUser.user_metadata?.avatar_url ?? null,
    },
    update: {
      email: authUser.email ?? undefined,
      name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? undefined,
      avatarUrl: authUser.user_metadata?.avatar_url ?? undefined,
    },
  });

  return user;
}

/**
 * Exige sesión; si no hay usuario, lanza Response 401 para devolver en la API.
 */
export async function requireSessionUser(request: Request): Promise<{ user: User; response?: never } | { user?: never; response: Response }> {
  const user = await getSessionUser(request);
  if (user) return { user };
  return { response: new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { "Content-Type": "application/json" } }) };
}
