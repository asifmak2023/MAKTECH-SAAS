"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BrandMark from "@/components/BrandMark";
import { api, clearSession, getToken } from "@/lib/api";

const nav = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/tenants", label: "Sellers" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/billing", label: "Payments" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/monitoring", label: "Monitoring" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [who, setWho] = useState("");
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);

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
    return <div className="p-10 text-sm text-[#767676]">Loading platform console...</div>;
  }

  const isActive = (item: (typeof nav)[number]) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 md:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/admin">
              <BrandMark />
            </Link>
            <span className="hidden text-[11px] uppercase tracking-[0.14em] text-[#767676] sm:inline font-label">
              Platform · {who}
            </span>
          </div>
          <nav className="hidden items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.12em] lg:flex font-label">
            {nav.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "text-black underline underline-offset-4" : "text-[#767676] hover:text-black"}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button
              className="grid h-11 w-11 place-items-center border border-[#e5e5e5] text-[#262626] hover:border-black"
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
              className="hidden border border-[#e5e5e5] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#262626] hover:border-black sm:inline-flex font-label"
              onClick={() => {
                api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
                clearSession();
                router.replace("/login");
              }}
            >
              Log out
            </button>
            <button
              className="grid h-11 w-11 place-items-center border border-[#e5e5e5] lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Open menu"
              aria-expanded={open}
            >
              <span className="block h-px w-4 bg-black" />
              <span className="mt-1 block h-px w-4 bg-black" />
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-[#e5e5e5] px-6 py-4 lg:hidden">
            <div className="flex flex-col gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] font-label">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={isActive(item) ? "text-black" : "text-[#767676]"}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
