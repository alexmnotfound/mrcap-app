"use client";

import DashboardSidebar from "./DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f6f9ff]">
      <DashboardSidebar />
      <main className="ml-64 flex-1">{children}</main>
    </div>
  );
}

