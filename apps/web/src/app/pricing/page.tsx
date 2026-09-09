"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "@/components/BrandMark";
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
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-20 border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-10 lg:px-12">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="hidden text-[11px] uppercase tracking-[0.16em] text-[#767676] sm:inline font-label">
              PRAL Digital Invoicing System
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.12em] font-label">
            <a className="text-[#262626] hover:text-black" href="/#how-it-works">
              How it works
            </a>
            <span className="border-b border-black pb-px text-black">Pricing</span>
            {authed ? (
              <Link className="bg-black px-5 py-2.5 text-white hover:bg-[#262626]" href="/login">
                Open workspace
              </Link>
            ) : (
              <>
                <Link className="text-[#262626] hover:text-black" href="/login">
                  Log in
                </Link>
                <Link className="bg-black px-5 py-2.5 text-white hover:bg-[#262626]" href="/register">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="w-full border-b border-[#e5e5e5] bg-white py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="max-w-xl">
              <span className="eyebrow mb-3 block">Transparent Model</span>
              <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Simple, credit-based pricing.</h1>
              <p className="mt-4 text-lg leading-relaxed text-[#525252]">
                Start free, subscribe for a monthly allowance, or top up with packs. No seat markups, no hidden fees.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full bg-white py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            {!catalog ? (
              <p className="text-sm text-[#767676]">Loading plans…</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {catalog.plans.map((p, i) => {
                  const featured = i === 0;
                  return (
                    <div key={p.id} className={`relative flex flex-col justify-between bg-white p-8 ${featured ? "border-2 border-black" : "border border-[#e5e5e5]"}`}>
                      {featured && (
                        <div className="absolute -top-3 right-6">
                          <span className="bg-black px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white font-label">
                            Recommended
                          </span>
                        </div>
                      )}
                      <div className="space-y-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-black font-label">{p.name}</span>
                        <div>
                          <span className="text-3xl font-semibold text-black">PKR {p.price.toLocaleString("en-PK")}</span>
                          <span className="mt-1 block text-xs text-[#767676]">
                            /{p.billing_interval === "yearly" ? "year" : "month"}
                            {p.invoice_limit ? ` · up to ${p.invoice_limit} invoices` : " · unlimited"}
                          </span>
                        </div>
                        <div className="my-4 h-px bg-[#e5e5e5]" />
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
                          className={`block w-full py-3 text-center text-xs font-semibold uppercase tracking-wider font-label ${featured ? "bg-black text-white hover:bg-[#262626]" : "border border-black text-black hover:bg-[#fafafa]"}`}
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
              <div className="mt-8 border border-[#e5e5e5] bg-white p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-black font-label">Credit Packs</span>
                  <span className="text-xs text-[#767676]">One-off invoice credits that never expire on their own.</span>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-px border border-[#e5e5e5] bg-[#e5e5e5] sm:grid-cols-2 lg:grid-cols-4">
                  {catalog.packages.map((p) => (
                    <div key={p.id} className="bg-white px-4 py-4">
                      <p className="text-sm font-semibold text-black">{p.name}</p>
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

      <footer className="w-full border-t border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center md:px-10 lg:px-12">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size={32} />
            <span className="text-[11px] uppercase tracking-[0.16em] text-[#767676] font-label">PRAL Digital Invoicing System</span>
          </Link>
          <nav className="flex items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#525252] font-label">
            <Link className="transition-colors hover:text-black" href="/">Home</Link>
            <Link className="transition-colors hover:text-black" href="/login">Sign in</Link>
            <Link className="transition-colors hover:text-black" href="/register">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
