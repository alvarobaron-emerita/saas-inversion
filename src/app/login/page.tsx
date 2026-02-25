"use client";

import { createClient } from "@/lib/supabase/client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#1A2C3D] flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-white tracking-widest mb-8">
        EMERITA
      </h1>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-8 flex flex-col items-center gap-6">
        <h2 className="text-xl font-semibold text-zinc-900">Bienvenido</h2>
        <p className="text-center text-zinc-600 text-sm">
          Inicia sesión con tu cuenta de Google para acceder al SaaS de inversión.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1A2C3D] text-white font-medium py-3 px-4 hover:opacity-90 transition-opacity"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
          Iniciar sesión con Google
        </button>
        <div className="w-full rounded-lg bg-zinc-50 border border-zinc-100 px-4 py-3">
          <p className="text-xs text-[#1A2C3D] text-center">
            Nota: Solo los usuarios invitados por un administrador pueden acceder.
          </p>
        </div>
      </div>
      <p className="mt-8 text-sm text-white/90">
        <Link href="#" className="underline hover:no-underline">
          ¿No tienes acceso? Contacta con tu administrador
        </Link>
      </p>
    </div>
  );
}
