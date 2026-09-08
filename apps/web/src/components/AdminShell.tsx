"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearSession, getToken } from "@/lib/api";

const nav = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/tenants", label: "Sellers" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/billing", label: "Payments" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/monitoring", label: "Monitoring" },
  { href: "/admin/support", label: "Support" },
];

function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-[8px] bg-gradient-to-b from-win-500 to-win-700 text-white shadow-sm`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]" aria-hidden>
        <path
          d="M4 5.5a1.5 1.5 0 0 1 1.5-1.5h7.2l3.8 3.8v10.7a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"
          fill="rgba(255,255,255,0.18)"
        />
        <path d="M12.5 4v4h4M7.5 11h5.5m-5.5 3h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [who, setWho] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const theme = document.documentElement.classList.contains("dark");
    setDark(theme);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<{ user: { name: string; email: string }; tenant: { name: string } | null; is_platform_admin?: boolean; account_kind?: string }>("/api/auth/me")
      .then((res) => {
        if (!res.is_platform_admin && res.account_kind !== "platform_admin") {
          router.replace("/dashboard");
          return;
        }
        setWho(res.user.name || res.user.email || "Platform admin");
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
    return <div className="p-10 text-sm text-slate-500">Loading platform console...</div>;
  }

  const isActive = (item: (typeof nav)[number]) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight text-win-700">PRAL Platform</p>
              <p className="text-xs text-slate-500">SaaS operations console</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 rounded-[10px] bg-black/[0.035] p-1 text-sm">
            {nav.map((item) => {
              const active = isActive(item);
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
        <div className="mx-auto max-w-6xl px-6 pb-2 text-xs text-slate-500">Signed in as {who}</div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
