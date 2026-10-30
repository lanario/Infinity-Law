"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { SidebarProvider } from "./sidebar-context";
import { cn } from "@/lib/utils";

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-root flex h-screen bg-[#FAFAFA] overflow-hidden dark:bg-zinc-950">
      {/* Sidebar com variantes Desktop e Mobile */}
      <Sidebar />

      {/* Container Principal adaptável com transição suave */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden min-w-0 lg:ml-[84px]",
          "ml-0"
        )}
      >
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
