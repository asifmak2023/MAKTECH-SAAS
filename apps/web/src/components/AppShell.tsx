"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearSession, getToken } from "@/lib/api";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices/create", label: "New invoice" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
];

function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-[8px] bg-gradient-to-b from-win-500 to-win-700 text-white shadow-sm`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]" aria-hidden>
        <path
          d="M6 3.5h8.5L19 8v12.5H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"
          fill="rgba(255,255,255,0.18)"
        />
        <path
          d="M13.5 3.5V8H18M7.5 12.5h6m-6 3h3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const theme = document.documentElement.classList.contains("dark");
    setDark(theme);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<{ user: { name: string }; tenant: { name: string } }>("/api/auth/me")
      .then((res) => {
        setName(`${res.user.name} · ${res.tenant.name}`);
        setReady(true);
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("pral_theme", next ? "dark" : "light");
  }

  if (!ready) {
    return <div className="p-10 text-sm text-slate-500">Loading workspace...</div>;
  }

  const isActive = (href: string) =>
    href === "/invoices/create"
      ? pathname === "/invoices/create" || pathname.startsWith("/invoices/create/")
      : pathname.startsWith("/invoices/")
        ? href === "/invoices"
        : pathname.startsWith("/clients/")
          ? href === "/clients"
          : pathname === href;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight text-win-700">PRAL Invoicing</p>
              <p className="text-xs text-slate-500">Digital invoicing workspace</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 rounded-[10px] bg-black/[0.035] p-1 text-sm">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[7px] px-3 py-1.5 transition-all duration-200 ease-in-out ${
                    active
                      ? "bg-white font-semibold text-win-700 shadow-sm"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button
              className="grid h-9 w-9 place-items-center rounded-[6px] bg-black/[0.06] text-slate-600 transition-all duration-200 ease-in-out hover:scale-[1.05] hover:bg-black/[0.1]"
              onClick={toggleTheme}
              title={dark ? "Switch to light theme" : "Switch to dark theme"}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {dark ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="4.5" />
                  <path d="M12 2.5v2.5m0 13.5v2.5M2.5 12H5m13.5 0H21.5M5.3 5.3l1.8 1.8m9.8 9.8 1.8 1.8m0-13.4-1.8 1.8m-9.8 9.8-1.8 1.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 14.5A8 8 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5Z" />
                </svg>
              )}
            </button>
            <button
              className="rounded-[6px] bg-black/[0.06] px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-200 ease-in-out hover:scale-[1.02] hover:bg-black/[0.1]"
              onClick={() => {
                api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
                clearSession();
                router.replace("/login");
              }}
            >
              Log out
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-2 text-xs text-slate-500">{name}</div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
