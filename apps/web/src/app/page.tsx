"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(getToken()));
    fetch("/api/catalog")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCatalog(d))
      .catch(() => undefined);
  }, []);

  const features = [
    ["FBR digital invoicing", "Send buyer-approved invoices straight to PRAL from the seller workspace."],
    ["Sandbox first", "Validate every invoice type against the PRAL sandbox before you go live."],
    ["Buyer approval links", "No-login public links let your buyers approve or reject each invoice."],
    ["Automated retries", "Failed submissions stay visible so you can correct and re-submit."],
    ["Credit-based billing", "Pay per invoice or subscribe for a monthly allowance — no hidden surprises."],
    ["Seller + platform consoles", "Sellers run their workspace; the SaaS operator gets monitoring, billing and support tools."],
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-b from-win-500 to-win-700 text-white shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]" aria-hidden>
                <path d="M6 3.5h8.5L19 8v12.5H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" fill="rgba(255,255,255,0.18)" />
                <path d="M13.5 3.5V8H18M7.5 12.5h6m-6 3h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight text-win-700">PRAL Digital Invoicing</p>
              <p className="text-xs text-slate-500">FBR-compliant invoicing for Pakistani businesses</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <a className="rounded-md px-3 py-1.5 text-slate-600 hover:text-slate-900" href="#features">Features</a>
            <a className="rounded-md px-3 py-1.5 text-slate-600 hover:text-slate-900" href="#pricing">Pricing</a>
            {authed ? (
              <Link className="rounded-md bg-win-600 px-4 py-1.5 font-medium text-white" href="/login">
                Open workspace
              </Link>
            ) : (
              <>
                <Link className="rounded-md px-3 py-1.5 font-medium text-slate-700 hover:text-slate-900" href="/login">
                  Log in
                </Link>
                <Link className="rounded-md bg-win-600 px-4 py-1.5 font-medium text-white" href="/register">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-10 py-20 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-win-50 px-3 py-1 text-xs font-medium text-win-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Sandbox live · FBR Digital Invoicing (PRAL)
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Sales invoicing for Pakistan, <span className="text-win-600">wired to FBR</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-slate-600">
              Create invoices, collect buyer approval with a public link, and submit to the Federal Board of
              Revenue&apos;s digital invoicing system — from a clean workspace built for sellers and SaaS operators.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-md bg-win-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm" href="/register">
                Create your workspace
              </Link>
              <a className="rounded-md bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700" href="#pricing">
                View pricing
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_24px_48px_-20px_rgba(0,0,0,0.25)]">
            <div className="rounded-t-lg bg-slate-100 px-4 py-2 text-xs text-slate-500">Invoice · approved by buyer</div>
            <div className="space-y-3 rounded-b-lg p-5">
              {[
                ["Seller", "ACME TRADERS · 4240119-0"],
                ["Buyer", "Karachi Consumer Pvt Ltd"],
                ["Invoice", "SN-2026-00001 · Sale Invoice"],
                ["Status", "Submitted to PRAL — 00 (Valid)"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-800">{v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="text-slate-500">Total (incl. 18% ST)</span>
                <span className="font-semibold text-slate-900">PKR 1,180.00</span>
              </div>
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                ● FBR Invoice No. 2026-000000000123
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-black/[0.06] py-16">
          <h2 className="text-2xl font-semibold text-slate-900">Everything between &ldquo;new invoice&rdquo; and FBR</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            A focused toolchain for the Pakistani invoicing workflow, with no payments or wallets in between — buyers
            settle sellers directly.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, body]) => (
              <div key={title} className="rounded-xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
                <p className="font-semibold text-slate-800">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-t border-black/[0.06] py-16">
          <h2 className="text-2xl font-semibold text-slate-900">Simple, credit-based pricing</h2>
          <p className="mt-2 text-slate-600">Start free, subscribe for a monthly allowance, or top up with packs.</p>
          {!catalog ? (
            <p className="mt-8 text-sm text-slate-500">Loading plans…</p>
          ) : (
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {catalog.plans.map((p) => (
                <div key={p.id} className="flex flex-col rounded-xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
                  <p className="text-sm font-semibold uppercase tracking-wide text-win-600">{p.name}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">
                    PKR {p.price.toLocaleString("en-PK")}
                    <span className="text-sm font-normal text-slate-500">/{p.billing_interval === "yearly" ? "year" : "month"}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {p.invoice_limit ? `Up to ${p.invoice_limit} invoices` : "Unlimited invoices"}
                    {p.overage_allowed ? " · overage available" : ""}
                  </p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{p.description}</p>
                  <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                    {(p.features || []).map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-emerald-600">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    className="mt-6 rounded-md bg-win-600 px-4 py-2 text-center text-sm font-medium text-white"
                    href="/register"
                  >
                    Start with {p.name}
                  </Link>
                </div>
              ))}
            </div>
          )}
          {catalog && catalog.packages.length > 0 && (
            <div className="mt-6 rounded-xl border border-black/[0.06] bg-white p-5">
              <p className="font-semibold text-slate-800">Top-up packs</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {catalog.packages.map((p) => (
                  <div key={p.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-slate-500">
                      {p.invoice_quantity} invoices · PKR {p.price.toLocaleString("en-PK")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-black/[0.06] py-10 text-center text-sm text-slate-500">
        PRAL Digital Invoicing · FBR-compliant invoicing workspace for Pakistan.
      </footer>
    </div>
  );
}
