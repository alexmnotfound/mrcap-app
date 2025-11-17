"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Bot,
  ChevronDown,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

const metrics = [
  { label: "Fondos de Inversión", value: "1" },
  { label: "Bots de Trading", value: "2 en proceso" },
  { label: "Ganancias Promedio", value: "3% mensual" },
];

const features = [
  {
    title: "Fondos de Inversión",
    description:
      "Accedé a una gestión transparente y dinámica de tus participaciones. Visualizá en tiempo real los movimientos de tu fondo y los rendimientos histórico. Todo desde una plataforma diseñada para evolucionar junto a tus inversiones.",
    icon: LayoutDashboard,
  },
  {
    title: "Alertas en Telegram",
    description:
      "Recibí información clave al instante. Nuestro próximo módulo conectará tus estrategias con alertas inteligentes en Telegram: niveles de entrada y salida, notificaciones sobre eventos críticos del mercado, y más. Estar informado será tan fácil como mirar tu chat.",
    icon: Bell,
  },
  {
    title: "Bots de Trading",
    description:
      "Explorá la nueva frontera del trading automatizado. Nuestros prototipos de bots combinan análisis cuantitativo y ejecución algorítmica para operar con precisión y consistencia. Flujos discrecionales y sistemáticos conviven sobre la misma infraestructura, optimizando resultados sin fricción.",
    icon: Bot,
  },
];

function NavLinks() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const inversionesItems = [
    { href: "#investor-profile", label: "Perfil del Inversor" },
    { href: "#hedge-fund", label: "Fondos de Inversión" },
  ];

  const herramientasItems = [
    { href: "#finanzas", label: "Planilla Finanzas Personales" },
    { href: "#backtester", label: "Backtester" },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  return (
    <div
      ref={navRef}
      className="hidden items-center gap-1 text-sm font-medium text-slate-600 lg:flex"
    >
      {/* Inversiones Dropdown */}
      <div className="relative">
        <button
          onClick={() =>
            setOpenDropdown(openDropdown === "inversiones" ? null : "inversiones")
          }
          className="flex items-center gap-1 rounded-lg px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Inversiones
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              openDropdown === "inversiones" ? "rotate-180" : ""
            }`}
          />
        </button>
        {openDropdown === "inversiones" && (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="py-1">
              {inversionesItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setOpenDropdown(null)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Herramientas Dropdown */}
      <div className="relative">
        <button
          onClick={() =>
            setOpenDropdown(
              openDropdown === "herramientas" ? null : "herramientas"
            )
          }
          className="flex items-center gap-1 rounded-lg px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Herramientas
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              openDropdown === "herramientas" ? "rotate-180" : ""
            }`}
          />
        </button>
        {openDropdown === "herramientas" && (
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="py-1">
              {herramientasItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setOpenDropdown(null)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nosotros Link */}
      <Link
        href="#about"
        className="rounded-lg px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        Nosotros
      </Link>

      {/* FAQ Link */}
      <Link
        href="#faq"
        className="rounded-lg px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        FAQ
      </Link>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative overflow-hidden bg-[#f6f9ff] text-slate-900">
      <div className="absolute inset-0 dot-grid opacity-60" />
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-8 lg:px-8">
        <nav className="flex flex-col items-center gap-4 rounded-3xl border border-white/60 bg-white/80 px-6 py-4 shadow-xl shadow-blue-100/70 backdrop-blur-sm md:flex-row md:justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/mrcap-light-narrow.png"
              alt="MR Capitals"
              width={180}
              height={60}
              className="h-auto w-auto"
              priority
            />
          </Link>
          <NavLinks />
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link
              href="/login"
              className="rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-white shadow-lg shadow-blue-200 transition hover:bg-blue-500"
            >
              Abrir cuenta
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>

        <main className="mt-16 space-y-24">
          <section className="card relative overflow-hidden px-6 py-12 text-center lg:px-12">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500" />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">
                <Sparkles className="h-3 w-3" />
                Trading powered with AI
              </span>
            </div>
            <div className="mx-auto mt-8 max-w-3xl space-y-6">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Tu trading simple e inteligente.
              </h1>
              <p className="text-lg text-slate-600 lg:text-xl">
              Accedé a un entorno de inversión intuitivo y potente, con alertas en tiempo real 
              e integración de bots algorítmicos que ejecutan estrategias con precisión.
              </p>
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-500"
              >
                Abrir cuenta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="/login"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
              >
                Iniciar sesión
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-12 grid gap-6 text-left sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="card px-6 py-10 lg:px-10">
            <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-semibold text-slate-900">
                Un ecosistema que crece con vos.
                </h2>
                <p className="text-lg text-slate-600">
                Comenzá con tu fondo en vivo y descubrí cómo cada módulo amplía tus posibilidades.
                Pensado para evolucionar con tus inversiones.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200">
                    Ver roadmap
                  </button>
                  <button className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600">
                    Ver demo
                  </button>
                </div>
              </div>
              <div className="relative rounded-[32px] border border-blue-100 bg-gradient-to-b from-white to-blue-50 p-6 shadow-[0_40px_120px_rgba(37,99,235,0.15)]">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-2xl">
                  <p className="text-sm font-semibold text-blue-600">Preview</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    Plataforma
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Visualizá tus participaciones, fondos de inversión y perfil.
                    Accedé a resúmenes y reportes de movimientos.
                  </p>
                  <div className="mt-6 grid gap-4 text-sm">
                    <div className="rounded-2xl border border-slate-100 bg-blue-50/60 p-4">
                      <p className="text-xs uppercase tracking-[0.4em] text-blue-500">
                        Dashboard
                      </p>
                      <p className="text-lg font-semibold text-blue-900">
                        Fondos de inversión
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
                        Próximamente
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        Alertas en Telegram + bots
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card p-8">
                <feature.icon className="h-10 w-10 text-blue-600" />
                <h3 className="mt-6 text-2xl font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-4 text-base text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
