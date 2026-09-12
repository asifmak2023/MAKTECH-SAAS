"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BrandMark from "@/components/BrandMark";
import PageLoader from "@/components/PageLoader";
import ThemePicker from "@/components/ThemePicker";
import {
  IconDashboard,
  IconLogout,
  IconMenu,
  IconMonitoring,
  IconPayments,
  IconSellers,
  IconSettings,
  IconSubscriptions,
} from "@/components/icons";
import { api, clearSession, getToken } from "@/lib/api";

const nav = [
  { href: "/admin", label: "Overview", exact: true, Icon: IconDashboard },
  { href: "/admin/tenants", label: "Sellers", Icon: IconSellers },
  { href: "/admin/subscriptions", label: "Subscriptions", Icon: IconSubscriptions },
  { href: "/admin/billing", label: "Payments", Icon: IconPayments },
  { href: "/admin/settings", label: "Settings", Icon: IconSettings },
  { href: "/admin/monitoring", label: "Monitoring", Icon: IconMonitoring },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [who, setWho] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
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

  if (!ready) {
    return <PageLoader label="Loading platform console..." />;
  }

  const isActive = (item: (typeof nav)[number]) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 md:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/admin">
              <BrandMark />
            </Link>
            <span className="hidden text-[12px] font-medium tracking-[0.4px] text-[#767676] sm:inline font-label">
              Platform · {who}
            </span>
          </div>
          <nav className="hidden items-center gap-1 text-[12px] font-medium tracking-[0.4px] lg:flex font-label">
            {nav.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-chip inline-flex h-10 items-center gap-1.5 px-3 ${active ? "nav-chip-active" : ""}`}
                >
                  <item.Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ThemePicker />
            <button
              className="btn-ghost hidden h-10 px-4 text-[12px] font-medium tracking-[0.4px] sm:inline-flex items-center gap-1.5 font-label"
              onClick={() => {
                api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
                clearSession();
                router.replace("/login");
              }}
            >
              <IconLogout className="h-4 w-4" />
              Log out
            </button>
            <button
              className="nav-chip grid h-11 w-11 place-items-center lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Open menu"
              aria-expanded={open}
            >
              <IconMenu className="h-4 w-4" />
            </button>
          </div>
        </div>
        {open && (
          <nav className="px-6 py-4 lg:hidden">
            <div className="flex flex-col gap-1 text-[12px] font-medium tracking-[0.4px] font-label">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`nav-chip inline-flex min-h-12 items-center gap-2 px-3 ${isActive(item) ? "nav-chip-active" : ""}`}
                >
                  <item.Icon className="h-4 w-4" />
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
