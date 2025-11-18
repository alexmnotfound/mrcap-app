"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronLeft,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { Fund } from "@/types/api";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const baseNavSections: NavSection[] = [
  {
    title: "Gestión",
    items: [
      {
        label: "Mi Dashboard",
        href: "/account/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Fondos",
    items: [
      {
        label: "Fondos",
        href: "/account/funds",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Configuración",
    items: [
      {
        label: "Configuración",
        href: "/account/configuration",
        icon: Settings,
      },
    ],
  },
];

interface DashboardSidebarProps {
  isCollapsed: boolean;
  isMobileMenuOpen?: boolean;
  onToggleCollapse: () => void;
  onMobileMenuClose?: () => void;
}

export default function DashboardSidebar({
  isCollapsed,
  isMobileMenuOpen = false,
  onToggleCollapse,
  onMobileMenuClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, profile, token, apiBase } = useAuth();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundsLoading, setFundsLoading] = useState(false);

  useEffect(() => {
    if (!token || !apiBase) return;

    let cancelled = false;
    async function fetchFunds() {
      setFundsLoading(true);
      try {
        const data = await apiFetch<Fund[]>("/api/funds", {
          token: token ?? undefined,
          baseUrl: apiBase,
        });
        if (!cancelled) {
          setFunds(data);
        }
      } catch (err) {
        // Silently fail - funds will just not show in sidebar
        console.error("Failed to load funds for sidebar:", err);
      } finally {
        if (!cancelled) {
          setFundsLoading(false);
        }
      }
    }
    fetchFunds();
    return () => {
      cancelled = true;
    };
  }, [token, apiBase]);

  const toggleDropdown = (label: string) => {
    const newOpen = new Set(openDropdowns);
    if (newOpen.has(label)) {
      newOpen.delete(label);
    } else {
      newOpen.add(label);
    }
    setOpenDropdowns(newOpen);
  };

  const isActive = (href: string) => {
    if (href === "/account/dashboard") {
      return pathname === "/account/dashboard";
    }
    if (href === "/account/admin") {
      return pathname === "/account/admin";
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Build nav sections with funds as children and conditionally add admin dashboard
  const navSections: NavSection[] = baseNavSections.map((section) => {
    let items = section.items;
    
    // Add Admin Dashboard to Gestión section if user is admin
    if (section.title === "Gestión" && profile?.is_admin) {
      items = [
        ...items,
        {
          label: "Admin Dashboard",
          href: "/account/admin",
          icon: Shield,
        },
      ];
    }
    
    return {
      ...section,
      items: items.map((item) => {
        if (item.label === "Fondos") {
          return {
            ...item,
            children: funds.map((fund) => ({
              label: fund.name,
              href: `/account/funds/${fund.id}`,
            })),
          };
        }
        return item;
      }),
    };
  });

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white shadow-sm transition-all duration-300 ${
        isCollapsed ? "lg:w-16 w-64" : "w-64"
      } ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Logo & Collapse Button */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          {!isCollapsed ? (
            <Link href="/account/dashboard" className="flex items-center flex-1">
              <Image
                src="/mrcap-light-narrow.png"
                alt="MR CAPITALS"
                width={140}
                height={46}
                className="h-auto w-auto"
                priority
              />
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex items-center gap-2">
            {onMobileMenuClose && (
              <button
                onClick={onMobileMenuClose}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 lg:hidden"
                aria-label="Cerrar menú"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onToggleCollapse}
              className="hidden h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 lg:flex"
              aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              <ChevronLeft
                className={`h-4 w-4 transition-transform ${
                  isCollapsed ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="space-y-6">
            {navSections.map((section, sectionIdx) => (
              <li key={section.title || sectionIdx}>
                {!isCollapsed && section.title && (
                  <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                    {section.title}
                  </p>
                )}
                {sectionIdx > 0 && !isCollapsed && (
                  <div className="mb-2 border-t border-slate-200" />
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const hasChildren = item.children && item.children.length > 0;
                    const isDropdownOpen = openDropdowns.has(item.label);

                    return (
                      <li key={item.label}>
                        {hasChildren ? (
                          <>
                            <button
                              onClick={() => toggleDropdown(item.label)}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                active
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-slate-700 hover:bg-slate-50"
                              } ${isCollapsed ? "justify-center" : ""}`}
                              title={isCollapsed ? item.label : undefined}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                {!isCollapsed && <span>{item.label}</span>}
                              </div>
                              {!isCollapsed && (
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${
                                    isDropdownOpen ? "rotate-180" : ""
                                  }`}
                                />
                              )}
                            </button>
                            {!isCollapsed && isDropdownOpen && item.children && (
                              <ul className="ml-11 mt-1 space-y-1">
                                {item.children.map((child) => (
                                  <li key={child.href}>
                                    <Link
                                      href={child.href}
                                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                                        pathname === child.href
                                          ? "bg-blue-50 text-blue-700 font-medium"
                                          : "text-slate-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      {child.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <Link
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                              active
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-700 hover:bg-slate-50"
                            } ${isCollapsed ? "justify-center" : ""}`}
                            title={isCollapsed ? item.label : undefined}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && <span>{item.label}</span>}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        {!isCollapsed && (
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-900">
                {profile?.full_name || "Usuario"}
              </p>
              <p className="text-xs text-slate-600 truncate">
                {profile?.email || ""}
              </p>
              {profile?.is_admin && (
                <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-5 w-5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
        {isCollapsed && (
          <div className="border-t border-slate-200 p-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-50"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

