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

const capabilities = [
  ["01", "FBR Digital Invoicing", "Direct real-time schema transmission to PRAL production gateways with instant fiscal tracking."],
  ["02", "Buyer Approval Links", "Frictionless public verification links for instant customer sign-off prior to immutable registration."],
  ["03", "Sandbox Validation", "Test every invoice type and credit note risk-free prior to live filing with authentic simulated endpoints."],
  ["04", "Automatic Retry Queue", "Resilient background queues keep temporary network timeouts visible, recoverable, and auditable."],
  ["05", "Credit-Based Billing", "Predictable pay-as-you-go units without vendor lock-in, seat markups, or administrative platform bloat."],
];

const steps = [
  ["01", "Create", "Create your sales invoice with automated 18% sales tax calculation, NTN validation, and product code classification."],
  ["02", "Approve", "Send the buyer a secure, single-use review link. No login required for them to inspect line items and sign off."],
  ["03", "Validate", "Validate against PRAL JSON schemas before final transmission. Eliminate rejection penalties in testing sandbox."],
  ["04", "Submit", "Send the approved invoice through PRAL and receive your official FBR record and verified QR code in seconds."],
];

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
              <a className="nav-chip inline-flex h-10 items-center px-3" href="#how-it-works">
                How it works
              </a>
              <Link className="nav-chip inline-flex h-10 items-center px-3" href="/pricing">
                Pricing
              </Link>
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
        <section className="w-full py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-black" />
                <span className="eyebrow">FBR Digital Invoicing System</span>
              </div>
              <h1 className="text-balance text-4xl font-normal leading-[1.12] tracking-tight text-black sm:text-5xl md:text-6xl">
                Invoicing, without the complexity.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-[#525252]">
                Create invoices, get buyer approval, and submit through PRAL — from one simple workspace built for Pakistani businesses. Direct statutory compliance with zero platform clutter.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link className="btn-primary" href={ctaHref}>
                  Get started
                </Link>
                <a className="btn-ghost" href="#how-it-works">
                  See how it works
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-10">
                {["Create", "Approve", "Validate", "Submit"].map((step) => (
                  <span key={step} className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium tracking-[0.4px] text-[#767676] font-label">
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="card-plain grid grid-cols-1 items-start gap-10 p-8 md:p-12 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <span className="eyebrow mb-3 block">Statutory Directness</span>
                <h2 className="text-3xl font-normal tracking-tight text-black md:text-4xl">From your invoice to FBR.</h2>
              </div>
              <div className="lg:col-span-7">
                <p className="mb-8 text-lg leading-relaxed text-[#3f3f46]">
                  Create the invoice. Let your buyer review it. Submit it through PRAL. Keep the entire fiscal compliance workflow visible from one workspace without fragmented portals or manual errors.
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#f3edf7] p-4">
                    <span className="block text-2xl font-normal tabular-nums text-black md:text-3xl">100%</span>
                    <span className="mt-1 block text-xs font-medium tracking-[0.4px] text-[#767676]">Schema Compliant</span>
                  </div>
                  <div className="rounded-xl bg-[#f3edf7] p-4">
                    <span className="block text-2xl font-normal tabular-nums text-black md:text-3xl">0 Login</span>
                    <span className="mt-1 block text-xs font-medium tracking-[0.4px] text-[#767676]">Buyer Magic Links</span>
                  </div>
                  <div className="rounded-xl bg-[#f3edf7] p-4">
                    <span className="block text-2xl font-normal tabular-nums text-black md:text-3xl">PKR Direct</span>
                    <span className="mt-1 block text-xs font-medium tracking-[0.4px] text-[#767676]">Standard 18% Calc</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="w-full py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="mb-14 max-w-xl">
              <span className="eyebrow mb-2 block">Sequential Architecture</span>
              <h2 className="text-3xl font-normal tracking-tight text-black md:text-4xl">A simpler way to invoice.</h2>
              <p className="mt-2 text-[#525252]">Four deliberate steps between sale and compliance.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(([n, title, body]) => (
                <div key={n} className="card-plain space-y-3 p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e8def8] text-sm font-medium tabular-nums text-black">{n}</span>
                  <h3 className="text-xl font-normal text-black">{title}</h3>
                  <p className="leading-relaxed text-[#525252]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full pb-20 md:pb-28">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="mb-12 max-w-xl">
              <span className="eyebrow mb-2 block">Scope of System</span>
              <h2 className="text-3xl font-normal tracking-tight text-black md:text-4xl">Everything you need. Nothing you don&apos;t.</h2>
            </div>
            <div className="grid gap-3">
              {capabilities.map(([n, title, body]) => (
                <div key={n} className="card-plain flex flex-col justify-between gap-3 p-5 md:flex-row md:items-center">
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs font-medium tabular-nums text-[#a3a3a3]">{n}</span>
                    <span className="text-lg font-normal text-black">{title}</span>
                  </div>
                  <p className="max-w-xl text-[#525252] md:text-right">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="mb-8 max-w-2xl">
              <span className="eyebrow mb-2 block">The Interface</span>
              <h2 className="text-3xl font-normal tracking-tight text-black md:text-4xl">See everything at a glance.</h2>
            </div>
            <div className="card-plain overflow-hidden p-0">
              <div className="flex flex-col justify-between gap-4 px-6 py-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="rounded-full bg-black px-3.5 py-1.5 text-xs font-medium text-white font-label">All Invoices</span>
                  <span className="rounded-full px-3.5 py-1.5 text-xs font-medium text-[#525252] font-label">Approved by Buyer</span>
                  <span className="rounded-full px-3.5 py-1.5 text-xs font-medium text-[#525252] font-label">Submitted to PRAL</span>
                  <span className="rounded-full px-3.5 py-1.5 text-xs font-medium text-[#525252] font-label">Needs Review</span>
                </div>
                <span className="text-xs font-medium tabular-nums text-[#525252]">Seller: ACME TRADERS (4240119-0)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="text-[12px] font-medium tracking-[0.4px] text-[#767676] font-label">
                      <th className="px-6 py-3.5 font-medium">Invoice No.</th>
                      <th className="px-6 py-3.5 font-medium">Counterparty</th>
                      <th className="px-6 py-3.5 text-right font-medium">Amount (PKR)</th>
                      <th className="px-6 py-3.5 font-medium">Compliance State</th>
                      <th className="px-6 py-3.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-6 py-4">
                        <div className="font-medium text-black">SN-2026-0001</div>
                        <div className="text-xs text-[#767676]">Sale Invoice · Registered Buyer</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-black">ACME Traders</div>
                        <div className="text-xs text-[#767676]">Karachi Consumer Pvt Ltd</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums text-black">1,180.00</td>
                      <td className="px-6 py-4">
                        <span className="status-emerald">Submitted (00 Valid)</span>
                        <div className="mt-0.5 font-mono text-[11px] text-[#767676]">FBR: 2026-000000000123</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-xs text-[#525252]">
                          <span>Audit Log</span>
                          <span className="font-medium text-black">View FBR QR</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4">
                        <div className="font-medium text-black">SN-2026-0002</div>
                        <div className="text-xs text-[#767676]">Sale Invoice · B2B Industrial</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-black">Lahore Textile Mills Ltd</div>
                        <div className="text-xs text-[#767676]">Rawalpindi Logistics Corp</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums text-black">450,000.00</td>
                      <td className="px-6 py-4">
                        <span className="status-emerald">Approved by Buyer</span>
                        <div className="mt-0.5 text-[11px] text-[#767676]">Pending Gateway Send</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-xs text-[#525252]">
                          <span>Audit Log</span>
                          <span className="btn-primary px-3 py-1 text-xs">Submit PRAL</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4">
                        <div className="font-medium text-black">SN-2026-0003</div>
                        <div className="text-xs text-[#767676]">Sale Invoice · Wholesale Retail</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-black">Karachi Consumer Goods</div>
                        <div className="text-xs text-[#767676]">Multan Distribution Center</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums text-black">78,500.00</td>
                      <td className="px-6 py-4">
                        <span className="status-sky">Validated in Sandbox</span>
                        <div className="mt-0.5 text-[11px] text-[#767676]">Ready for Production</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-xs text-[#525252]">
                          <span>Copy Link</span>
                          <span className="font-medium text-black">Send Review</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-6 py-3.5 text-xs text-[#525252]">
                <span>Displaying 3 of 1,280 active ledger records</span>
                <span className="font-mono tabular-nums text-[#767676]">PRAL REST API v2.1 Connected</span>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="card-plain p-8 md:p-12">
              <div className="max-w-3xl space-y-4">
                <span className="eyebrow block">Jurisdictional Alignment</span>
                <h2 className="text-3xl font-normal tracking-tight text-black md:text-4xl">
                  Digital invoicing for Pakistani businesses.
                </h2>
                <p className="leading-relaxed text-[#525252]">
                  Built around the realities of FBR digital invoicing and PRAL — with a workflow designed to keep sellers moving smoothly from invoice creation to successful submission across Karachi, Lahore, Islamabad, and nationwide commercial centers.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-6">
                  {["FBR Digital Invoicing", "PRAL Direct", "PKR Denominated", "STGO Compliant"].map((tag) => (
                    <span key={tag} className="rounded-full bg-[#e8def8] px-3.5 py-1.5 text-xs font-medium tracking-[0.4px] text-black font-label">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-xl">
                <span className="eyebrow mb-2 block">Transparent Model</span>
                <h2 className="text-3xl font-normal tracking-tight text-black md:text-4xl">Simple, credit-based pricing.</h2>
                <p className="mt-2 text-[#525252]">Start free, subscribe for a monthly allowance, or top up with packs.</p>
              </div>
              <Link className="btn-ghost" href="/pricing">
                Compare all plans
              </Link>
            </div>
            {catalog && (
              <div className="mt-8 grid gap-3">
                {catalog.plans.map((p, i) => (
                  <Link key={p.id} href="/pricing" className="card-plain flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                    <span className="flex items-center gap-4">
                      <span className="font-label text-[12px] tabular-nums text-[#a3a3a3]">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-sm font-medium text-black">{p.name}</span>
                    </span>
                    <span className="text-sm text-[#525252]">
                      <span className="font-medium tabular-nums text-black">PKR {p.price.toLocaleString("en-PK")}</span>
                      <span className="text-[#767676]"> /{p.billing_interval === "yearly" ? "year" : "month"}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <p className="mt-4 text-sm text-[#767676]">
              Or top up with one-off invoice credit packs.{" "}
              <Link className="font-medium text-black underline underline-offset-4 hover:text-[#767676]" href="/pricing">
                See pricing
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="w-full py-24">
          <div className="mx-auto max-w-7xl px-6 text-center md:px-10 lg:px-12">
            <div className="card-plain mx-auto max-w-2xl space-y-5 p-10 md:p-14">
              <span className="eyebrow block">Get Started</span>
              <h2 className="text-3xl font-normal tracking-tight text-black sm:text-4xl md:text-5xl">Ready to simplify your invoicing?</h2>
              <p className="mx-auto max-w-lg leading-relaxed text-[#525252]">
                Create your workspace and start managing digital invoices with confidence.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <Link className="btn-primary" href={ctaHref}>
                  Get started
                </Link>
                <Link className="btn-ghost" href="/login">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
            <div className="space-y-4 md:col-span-5">
              <BrandMark />
              <p className="max-w-sm text-sm leading-relaxed text-[#525252]">
                Digital Invoicing System for Pakistani businesses. Direct statutory compliance, unified verification, and automated fiscal reporting.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
              <div className="space-y-3">
                <span className="block text-[12px] font-medium tracking-[0.4px] text-[#a3a3a3] font-label">Product</span>
                <ul className="space-y-2.5 text-sm text-[#525252]">
                  <li><a href="#how-it-works">FBR Integration</a></li>
                  <li><Link href="/pricing">Pricing Plans</Link></li>
                  <li><Link href="/register">Create account</Link></li>
                </ul>
              </div>
              <div className="space-y-3">
                <span className="block text-[12px] font-medium tracking-[0.4px] text-[#a3a3a3] font-label">Account</span>
                <ul className="space-y-2.5 text-sm text-[#525252]">
                  <li><Link href="/login">Sign in</Link></li>
                  <li><Link href="/register">Register</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 text-xs text-[#767676]">
            FBR Digital Invoicing System · FBR-compliant invoicing workspace for Pakistan.
          </div>
        </div>
      </footer>
    </div>
  );
}
