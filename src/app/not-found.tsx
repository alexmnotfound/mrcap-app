import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className="text-6xl font-semibold text-black">404</span>
          <div className="h-16 w-px bg-slate-300" />
          <p className="text-lg text-slate-600">Mmm, no pudimos encontrar la página que estás buscando.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-900 transition hover:border-blue-200 hover:bg-slate-50 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la página principal.
        </Link>
      </div>
    </div>
  );
}

