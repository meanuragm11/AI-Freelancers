"use client";

import React, { createContext, useContext } from "react";
import {
  MobileDrawer,
  MobileMenuButton,
  useMobileDrawer,
} from "@/components/layout/MobileDrawer";

const WorkspaceDrawerContext = createContext<(() => void) | null>(null);

export function useWorkspaceDrawerClose() {
  return useContext(WorkspaceDrawerContext);
}

type WorkspaceShellProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  breakpoint?: "md" | "lg";
  sidebarWidthClass?: string;
  menuLabel?: string;
};

export function WorkspaceShell({
  sidebar,
  children,
  breakpoint = "md",
  sidebarWidthClass = "w-64",
  menuLabel = "Open workspace navigation",
}: WorkspaceShellProps) {
  const { open, openDrawer, closeDrawer } = useMobileDrawer();
  const rowClass = breakpoint === "lg" ? "lg:flex-row" : "md:flex-row";

  return (
    <WorkspaceDrawerContext.Provider value={closeDrawer}>
      <div
        className={`flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-slate-50 font-sans selection:bg-blue-200 selection:text-blue-900 ${rowClass}`}
      >
        <MobileDrawer
          open={open}
          onClose={closeDrawer}
          breakpoint={breakpoint}
          widthClass={sidebarWidthClass}
          ariaLabel="Workspace navigation"
        >
          {sidebar}
        </MobileDrawer>

        <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={`sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur-sm ${
            breakpoint === "lg" ? "lg:hidden" : "md:hidden"
          }`}
        >
          <MobileMenuButton onClick={openDrawer} breakpoint={breakpoint} label={menuLabel} />
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 lg:p-12">
          {children}
        </main>
      </div>
      </div>
    </WorkspaceDrawerContext.Provider>
  );
}
