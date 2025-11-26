"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  CheckCircle, 
  XCircle,
  Clock,
  UserCircle
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

const dateFormat = new Intl.DateTimeFormat("es-ES", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

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

  const createdDate = new Date(profile.created_at);
  const statusLabels: Record<string, string> = {
    active: "Activo",
    invited: "Invitado",
    suspended: "Suspendido",
    disabled: "Deshabilitado",
  };

  const statusColors: Record<string, string> = {
    active: "text-green-600 bg-green-50",
    invited: "text-blue-600 bg-blue-50",
    suspended: "text-yellow-600 bg-yellow-50",
    disabled: "text-red-600 bg-red-50",
  };

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

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Profile Information Card */}
            <div className="card p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <UserCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Información del Perfil
                  </h2>
                  <p className="text-sm text-slate-500">
                    Datos de tu cuenta
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <User className="mt-0.5 h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Nombre Completo
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {profile.full_name || "No especificado"}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <Mail className="mt-0.5 h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Email
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {profile.email}
                    </p>
                  </div>
                </div>

                {/* Account Status */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  {profile.status === "active" ? (
                    <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 text-slate-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Estado de la Cuenta
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          statusColors[profile.status] || statusColors.active
                        }`}
                      >
                        {statusLabels[profile.status] || profile.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Created Date */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <Calendar className="mt-0.5 h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Fecha de Creación
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {dateFormat.format(createdDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Details Card */}
            <div className="card p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                  <Shield className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Detalles de la Cuenta
                  </h2>
                  <p className="text-sm text-slate-500">
                    Información adicional
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* User ID */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <User className="mt-0.5 h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      ID de Usuario
                    </p>
                    <p className="mt-1 font-mono text-sm font-medium text-slate-900">
                      {profile.id}
                    </p>
                  </div>
                </div>

                {/* Admin Status */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <Shield className="mt-0.5 h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Permisos
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {profile.is_admin ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          <Shield className="h-3 w-3" />
                          Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          Usuario
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-6 card border-blue-100 bg-blue-50/50 p-6">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">
                  Más opciones próximamente
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  Estamos trabajando en más opciones de configuración, incluyendo preferencias de notificaciones, 
                  actualización de perfil y más.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

