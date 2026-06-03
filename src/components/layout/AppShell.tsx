"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MainWorkspace } from "@/components/layout/MainWorkspace";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <MainWorkspace />
      <LoadingOverlay />
    </div>
  );
}
