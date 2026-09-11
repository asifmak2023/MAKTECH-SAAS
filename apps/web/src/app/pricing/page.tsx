"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "@/components/BrandMark";
import ThemePicker from "@/components/ThemePicker";
import { getToken } from "@/lib/api";

type Plan = {
  id: number;
  name: string;
  description: string | null;
  billing_interval: string;
  price: number;
  invoice_limit: number | null;
  overage_allowed: boolean;
  features: string[] | null;
};

type Package = {
  id: number;
  name: string;
  description: string | null;
  invoice_quantity: number;
  price: number;
};

type Catalog = {
  currency: string;
  plans: Plan[];
  packages: Package[];
};

export default function PricingPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(getToken()));
    fetch("/api/catalog")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCatalog(d))
      .catch(() => undefined);
  }, []);

  const ctaHref = authed ? "/login" : "/register";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 md:px-10 lg:px-12">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <span className="hidden text-[14px] font-medium tracking-[0.15px] text-[#767676] sm:inline font-label">
              FBR Digital Invoicing System
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden items-center gap-1 text-[14px] font-medium tracking-[0.1px] font-label sm:flex">
              <a className="nav-chip inline-flex h-10 items-center px-3" href="/#how-it-works">
                How it works
              </a>
              <span className="nav-chip nav-chip-active inline-flex h-10 items-center px-3">Pricing</span>
              {authed ? null : (
                <Link className="nav-chip inline-flex h-10 items-center px-3" href="/login">
                  Log in
                </Link>
              )}
            </nav>
            <ThemePicker />
            {authed ? (
              <Link className="btn-primary px-5 py-2.5 text-[14px] font-medium" href="/login">
                Open workspace
              </Link>
            ) : (
              <Link className="btn-primary px-5 py-2.5 text-[14px] font-medium" href="/register">
                Get started
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="w-full py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="max-w-xl">
              <span className="eyebrow mb-3 block">Transparent Model</span>
              <h1 className="text-4xl font-normal tracking-tight md:text-5xl">Simple, credit-based pricing.</h1>
              <p className="mt-4 text-lg leading-relaxed text-[#525252]">
                Start free, subscribe for a monthly allowance, or top up with packs. No seat markups, no hidden fees.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full pb-16 md:pb-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            {!catalog ? (
              <p className="text-sm text-[#767676]">Loading plans…</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {catalog.plans.map((p, i) => {
                  const featured = i === 0;
                  return (
                    <div key={p.id} className={`card-plain relative flex flex-col justify-between p-8 ${featured ? "ring-2 ring-black" : ""}`}>
                      {featured && (
                        <div className="absolute -top-3 right-6">
                          <span className="rounded-full bg-black px-2.5 py-0.5 text-[10px] font-medium tracking-[0.4px] text-white font-label">
                            Recommended
                          </span>
                        </div>
                      )}
                      <div className="space-y-4">
                        <span className="text-xs font-medium tracking-[0.4px] text-black font-label">{p.name}</span>
                        <div>
                          <span className="text-3xl font-normal text-black">PKR {p.price.toLocaleString("en-PK")}</span>
                          <span className="mt-1 block text-xs text-[#767676]">
                            /{p.billing_interval === "yearly" ? "year" : "month"}
                            {p.invoice_limit ? ` · up to ${p.invoice_limit} invoices` : " · unlimited"}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-[#3f3f46]">{p.description}</p>
                        <ul className="space-y-3 text-sm text-[#3f3f46]">
                          {(p.features || []).map((f) => (
                            <li key={f} className="flex items-center gap-2.5">
                              <span className="text-black" aria-hidden>✓</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-8">
                        <Link
                          className={`${featured ? "btn-primary" : "btn-secondary"} block w-full text-center`}
                          href={ctaHref}
                        >
                          Start with {p.name}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {catalog && catalog.packages.length > 0 && (
              <div className="card-plain mt-8 p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-xs font-medium tracking-[0.4px] text-black font-label">Credit Packs</span>
                  <span className="text-xs text-[#767676]">One-off invoice credits that never expire on their own.</span>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {catalog.packages.map((p) => (
                    <div key={p.id} className="rounded-xl bg-[#f3edf7] px-4 py-4">
                      <p className="text-sm font-medium text-black">{p.name}</p>
                      <p className="mt-1 text-[#767676]">
                        {p.invoice_quantity} invoices · PKR {p.price.toLocaleString("en-PK")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="w-full">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center md:px-10 lg:px-12">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size={32} />
            <span className="text-[14px] font-medium tracking-[0.15px] text-[#767676] font-label">FBR Digital Invoicing System</span>
          </Link>
          <nav className="flex items-center gap-2 text-[14px] font-medium text-[#525252] font-label">
            <Link className="nav-chip inline-flex h-10 items-center px-3" href="/">Home</Link>
            <Link className="nav-chip inline-flex h-10 items-center px-3" href="/login">Sign in</Link>
            <Link className="nav-chip inline-flex h-10 items-center px-3" href="/register">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
