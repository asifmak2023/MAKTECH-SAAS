"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function SupportIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 8.6V6.4m0 11.2v-2.2M8.6 12H6.4m11.2 0h-2.2" />
    </svg>
  );
}

/**
 * Global support entry point — floating button, bottom-right, on every page.
 * Opens a small popover that points users to the support centre (seller or
 * platform console depending on the current area).
 */
export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isAdminArea = pathname.startsWith("/admin");
  const centre = isAdminArea ? "/admin/support" : "/support";

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[19rem] max-w-[calc(100vw-2.5rem)] border border-[#e5e5e5] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Help</p>
              <h2 className="mt-1 text-lg font-medium tracking-tight text-black">
                {isAdminArea ? "Platform support" : "PRAL support"}
              </h2>
            </div>
            <button
              type="button"
              className="px-2 py-1 text-[#767676] hover:text-black"
              onClick={() => setOpen(false)}
              aria-label="Close support"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#525252]">
            {isAdminArea
              ? "Manage seller requests and conversations from the support centre."
              : "Questions about invoicing, PRAL, billing or your account — we're here to help."}
          </p>
          <div className="mt-4 space-y-2">
            <Link href={centre} className="block w-full bg-black px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#262626]">
              Open support centre
            </Link>
            {!isAdminArea && (
              <Link href="/support" className="block w-full border border-black px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-black hover:bg-[#fafafa]">
                Start a new request
              </Link>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Support"
        title="Support"
        className="grid h-11 w-11 place-items-center bg-black text-white hover:bg-[#262626]"
      >
        <SupportIcon />
      </button>
    </div>
  );
}
