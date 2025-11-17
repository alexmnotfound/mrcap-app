"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

export default function ConfigurationPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login");
    }
  }, [loading, profile, router]);

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-600">
            {loading ? "Cargando..." : "Redirigiendo al inicio de sesión..."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">
              Configuración
            </h1>
            <p className="mt-2 text-slate-600">
              Gestioná la configuración y preferencias de tu cuenta
            </p>
          </div>

          <div className="card p-12 text-center">
            <Settings className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Configuración de Cuenta
            </h2>
            <p className="mt-2 text-slate-600">
              Esta sección estará disponible próximamente. Podrás configurar tu
              cuenta, preferencias y notificaciones aquí.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

