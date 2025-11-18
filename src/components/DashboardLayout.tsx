"use client";

import { useState } from "react";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f6f9ff]">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <DashboardSidebar
        isCollapsed={isCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main
        className={`flex-1 transition-all duration-300 ${
          isCollapsed ? "lg:ml-16" : "lg:ml-64"
        }`}
      >
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
          aria-label="Abrir menú"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {children}
      </main>
    </div>
  );
}

