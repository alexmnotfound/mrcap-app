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
            {loading ? "Loading..." : "Redirecting to login..."}
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
              Configuration
            </h1>
            <p className="mt-2 text-slate-600">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="card p-12 text-center">
            <Settings className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Account Configuration
            </h2>
            <p className="mt-2 text-slate-600">
              This section is coming soon. You'll be able to configure your
              account settings, preferences, and notifications here.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

