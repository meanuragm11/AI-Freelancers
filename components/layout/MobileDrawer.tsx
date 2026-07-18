"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";

type Breakpoint = "md" | "lg";

const BREAKPOINT_CLASSES: Record<
  Breakpoint,
  { persistent: string; mobileOnly: string; drawerWidth: string }
> = {
  md: {
    persistent: "md:translate-x-0",
    mobileOnly: "md:hidden",
    drawerWidth: "md:sticky md:h-screen",
  },
  lg: {
    persistent: "lg:translate-x-0",
    mobileOnly: "lg:hidden",
    drawerWidth: "lg:sticky lg:h-screen",
  },
};

export function useMobileDrawer(initialOpen = false) {
  const [open, setOpen] = React.useState(initialOpen);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return {
    open,
    openDrawer: () => setOpen(true),
    closeDrawer: () => setOpen(false),
    toggleDrawer: () => setOpen((value) => !value),
  };
}

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  breakpoint?: Breakpoint;
  widthClass?: string;
  ariaLabel?: string;
  className?: string;
};

export function MobileDrawer({
  open,
  onClose,
  children,
  breakpoint = "md",
  widthClass = "w-64",
  ariaLabel = "Navigation",
  className = "",
}: MobileDrawerProps) {
  const bp = BREAKPOINT_CLASSES[breakpoint];

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className={`fixed inset-0 z-30 bg-black/50 ${bp.mobileOnly}`}
          onClick={onClose}
        />
      )}

      <aside
        aria-label={ariaLabel}
        className={`fixed top-0 left-0 z-40 flex h-screen ${widthClass} shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-900 text-slate-300 transition-transform duration-200 hidden-scrollbar ${bp.drawerWidth} ${
          open ? "translate-x-0" : `-translate-x-full ${bp.persistent}`
        } ${className}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className={`absolute top-4 right-4 z-50 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white ${bp.mobileOnly}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </aside>
    </>
  );
}

type MobileMenuButtonProps = {
  onClick: () => void;
  breakpoint?: Breakpoint;
  className?: string;
  label?: string;
};

export function MobileMenuButton({
  onClick,
  breakpoint = "md",
  className = "",
  label = "Open navigation",
}: MobileMenuButtonProps) {
  const mobileOnly = BREAKPOINT_CLASSES[breakpoint].mobileOnly;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 ${mobileOnly} ${className}`}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
