"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  Settings,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: "My Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Funds",
    href: "/dashboard/funds",
    icon: TrendingUp,
  },
  {
    label: "Configuration",
    href: "/dashboard/configuration",
    icon: Settings,
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, profile } = useAuth();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

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
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white shadow-sm">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/mrcap-light-narrow.png"
              alt="MR CAPITALS"
              width={140}
              height={46}
              className="h-auto w-auto"
              priority
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="space-y-1">
            {navItems.map((item) => {
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
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isDropdownOpen && item.children && (
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
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-900">
              {profile?.full_name || "User"}
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
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

