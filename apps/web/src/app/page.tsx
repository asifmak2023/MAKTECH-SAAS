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
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-20 border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-10 lg:px-12">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="hidden text-[11px] uppercase tracking-[0.16em] text-[#767676] sm:inline font-label">
              FBR Digital Invoicing System
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.12em] font-label">
            <a className="text-[#262626] transition-colors hover:text-black" href="#how-it-works">
              How it works
            </a>
            <Link className="text-[#262626] transition-colors hover:text-black" href="/pricing">
              Pricing
            </Link>
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
        <section className="w-full border-b border-[#e5e5e5] bg-white py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-black" />
                <span className="eyebrow">FBR Digital Invoicing System</span>
              </div>
              <h1 className="text-balance text-4xl font-medium leading-[1.08] tracking-tight text-black sm:text-5xl md:text-6xl">
                Invoicing, without the complexity.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-[#525252]">
                Create invoices, get buyer approval, and submit through PRAL — from one simple workspace built for Pakistani businesses. Direct statutory compliance with zero platform clutter.
              </p>
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <Link className="btn-primary" href={ctaHref}>
                  Get started
                </Link>
                <a className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-black underline underline-offset-4 hover:text-[#767676] font-label" href="#how-it-works">
                  See how it works
                  <span aria-hidden>→</span>
                </a>
              </div>
              <div className="pt-10">
                <div className="mb-5 h-px w-full bg-[#e5e5e5]" />
                <div className="flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-[0.16em] text-[#767676] font-label">
                  <span className="font-medium text-black">Create</span>
                  <span className="text-[#d4d4d4]">•</span>
                  <span>Approve</span>
                  <span className="text-[#d4d4d4]">•</span>
                  <span>Validate</span>
                  <span className="text-[#d4d4d4]">•</span>
                  <span>Submit</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full border-b border-[#e5e5e5] bg-[#f4f4f5] py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <span className="eyebrow mb-3 block">Statutory Directness</span>
                <h2 className="text-3xl font-medium tracking-tight text-black md:text-4xl">From your invoice to FBR.</h2>
              </div>
              <div className="lg:col-span-7">
                <p className="mb-8 text-lg leading-relaxed text-[#3f3f46]">
                  Create the invoice. Let your buyer review it. Submit it through PRAL. Keep the entire fiscal compliance workflow visible from one workspace without fragmented portals or manual errors.
                </p>
                <div className="grid grid-cols-2 gap-6 border-t border-[#d4d4d4] pt-4 sm:grid-cols-3">
                  <div>
                    <span className="block text-2xl font-semibold tabular-nums text-black md:text-3xl">100%</span>
                    <span className="mt-1 block text-xs uppercase tracking-wider text-[#767676]">Schema Compliant</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-semibold tabular-nums text-black md:text-3xl">0 Login</span>
                    <span className="mt-1 block text-xs uppercase tracking-wider text-[#767676]">Buyer Magic Links</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-semibold tabular-nums text-black md:text-3xl">PKR Direct</span>
                    <span className="mt-1 block text-xs uppercase tracking-wider text-[#767676]">Standard 18% Calc</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="w-full border-b border-[#e5e5e5] bg-white py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="mb-14 max-w-xl">
              <span className="eyebrow mb-2 block">Sequential Architecture</span>
              <h2 className="text-3xl font-medium tracking-tight text-black md:text-4xl">A simpler way to invoice.</h2>
              <p className="mt-2 text-[#525252]">Four deliberate steps between sale and compliance.</p>
            </div>
            <div className="relative w-full">
              <div className="absolute left-0 right-0 top-6 hidden h-px bg-[#e5e5e5] lg:block" />
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                {steps.map(([n, title, body]) => (
                  <div key={n} className="relative space-y-3 pt-2 lg:pt-8">
                    <span className="block text-lg font-semibold tabular-nums text-black">{n}</span>
                    <h3 className="text-xl font-medium text-black">{title}</h3>
                    <p className="leading-relaxed text-[#525252]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full bg-white pb-20 md:pb-28">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="mb-12 max-w-xl">
              <span className="eyebrow mb-2 block">Scope of System</span>
              <h2 className="text-3xl font-medium tracking-tight text-black md:text-4xl">Everything you need. Nothing you don&apos;t.</h2>
            </div>
            <div className="w-full border-t border-[#e5e5e5]">
              {capabilities.map(([n, title, body]) => (
                <div key={n} className="group flex flex-col justify-between border-b border-[#e5e5e5] px-3 py-6 transition-colors duration-150 hover:bg-[#fafafa] md:flex-row md:items-center">
                  <div className="mb-2 flex items-baseline gap-6 md:mb-0">
                    <span className="text-xs font-medium tabular-nums text-[#a3a3a3]">{n}</span>
                    <span className="text-lg font-medium text-black transition-colors group-hover:text-[#3f3f46]">{title}</span>
                  </div>
                  <div className="flex items-center justify-between gap-6 md:w-2/3 md:justify-end">
                    <p className="text-left text-[#525252] md:text-right">{body}</p>
                    <span className="text-[#a3a3a3] transition-all group-hover:translate-x-1 group-hover:text-black" aria-hidden>
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full border-y border-[#e5e5e5] bg-[#f4f4f5] py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="mb-8 max-w-2xl">
              <span className="eyebrow mb-2 block">The Interface</span>
              <h2 className="text-3xl font-medium tracking-tight text-black md:text-4xl">See everything at a glance.</h2>
            </div>
            <div className="w-full overflow-hidden border border-[#e5e5e5] bg-white">
              <div className="flex flex-col justify-between gap-4 border-b border-[#e5e5e5] bg-white px-6 py-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="bg-black px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-white font-label">All Invoices</span>
                  <span className="px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-[#525252] font-label">Approved by Buyer</span>
                  <span className="px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-[#525252] font-label">Submitted to PRAL</span>
                  <span className="px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-[#525252] font-label">Needs Review</span>
                </div>
                <span className="text-xs font-medium tabular-nums text-[#525252]">Seller: ACME TRADERS (4240119-0)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[11px] uppercase tracking-[0.14em] text-[#767676] font-label">
                      <th className="px-6 py-3.5 font-semibold">Invoice No.</th>
                      <th className="px-6 py-3.5 font-semibold">Counterparty</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Amount (PKR)</th>
                      <th className="px-6 py-3.5 font-semibold">Compliance State</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#e5e5e5] transition-colors hover:bg-[#fafafa]/70">
                      <td className="px-6 py-4">
                        <div className="font-medium text-black">SN-2026-0001</div>
                        <div className="text-xs text-[#767676]">Sale Invoice · Registered Buyer</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-black">ACME Traders</div>
                        <div className="text-xs text-[#767676]">Karachi Consumer Pvt Ltd</div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold tabular-nums text-black">1,180.00</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 bg-[#171717] px-2.5 py-1 text-xs font-medium text-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Submitted (00 Valid)
                        </span>
                        <div className="mt-0.5 font-mono text-[11px] text-[#767676]">FBR: 2026-000000000123</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-xs text-[#525252]">
                          <span className="hover:text-black">Audit Log</span>
                          <span className="font-semibold text-black underline underline-offset-2">View FBR QR</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-[#e5e5e5] transition-colors hover:bg-[#fafafa]/70">
                      <td className="px-6 py-4">
                        <div className="font-medium text-black">SN-2026-0002</div>
                        <div className="text-xs text-[#767676]">Sale Invoice · B2B Industrial</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-black">Lahore Textile Mills Ltd</div>
                        <div className="text-xs text-[#767676]">Rawalpindi Logistics Corp</div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold tabular-nums text-black">450,000.00</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 border border-[#d4d4d4] bg-[#f5f5f5] px-2.5 py-1 text-xs font-medium text-[#262626]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#525252]" />
                          Approved by Buyer
                        </span>
                        <div className="mt-0.5 text-[11px] text-[#767676]">Pending Gateway Send</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-xs text-[#525252]">
                          <span className="hover:text-black">Audit Log</span>
                          <span className="bg-black px-3 py-1 font-semibold text-white">Submit PRAL</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="transition-colors hover:bg-[#fafafa]/70">
                      <td className="px-6 py-4">
                        <div className="font-medium text-black">SN-2026-0003</div>
                        <div className="text-xs text-[#767676]">Sale Invoice · Wholesale Retail</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-black">Karachi Consumer Goods</div>
                        <div className="text-xs text-[#767676]">Multan Distribution Center</div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold tabular-nums text-black">78,500.00</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 border border-[#e5e5e5] bg-[#f5f5f5] px-2.5 py-1 text-xs font-medium text-[#3f3f46]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#a3a3a3]" />
                          Validated in Sandbox
                        </span>
                        <div className="mt-0.5 text-[11px] text-[#767676]">Ready for Production</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-xs text-[#525252]">
                          <span className="hover:text-black">Copy Link</span>
                          <span className="font-semibold text-black underline underline-offset-2">Send Review</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[#e5e5e5] bg-[#fafafa] px-6 py-3.5 text-xs text-[#525252]">
                <span>Displaying 3 of 1,280 active ledger records</span>
                <span className="font-mono tabular-nums text-[#767676]">PRAL REST API v2.1 Connected</span>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full bg-white py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="border border-[#e5e5e5] bg-[#fafafa] p-8 md:p-12">
              <div className="max-w-3xl space-y-4">
                <span className="eyebrow block">Jurisdictional Alignment</span>
                <h2 className="text-3xl font-medium tracking-tight text-black md:text-4xl">
                  Digital invoicing for Pakistani businesses.
                </h2>
                <p className="leading-relaxed text-[#525252]">
                  Built around the realities of FBR digital invoicing and PRAL — with a workflow designed to keep sellers moving smoothly from invoice creation to successful submission across Karachi, Lahore, Islamabad, and nationwide commercial centers.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-6">
                  <span className="border border-[#d4d4d4] bg-white px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-black font-label">
                    FBR Digital Invoicing
                  </span>
                  <span className="border border-[#d4d4d4] bg-white px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-black font-label">
                    PRAL Direct
                  </span>
                  <span className="border border-[#d4d4d4] bg-white px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-black font-label">
                    PKR Denominated
                  </span>
                  <span className="border border-[#d4d4d4] bg-white px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-black font-label">
                    STGO Compliant
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full bg-white py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-xl">
                <span className="eyebrow mb-2 block">Transparent Model</span>
                <h2 className="text-3xl font-medium tracking-tight text-black md:text-4xl">Simple, credit-based pricing.</h2>
                <p className="mt-2 text-[#525252]">Start free, subscribe for a monthly allowance, or top up with packs.</p>
              </div>
              <Link className="font-label inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-black underline underline-offset-4 transition-colors hover:text-[#767676]" href="/pricing">
                Compare all plans &amp; credit packs
                <span aria-hidden>→</span>
              </Link>
            </div>
            {catalog && (
              <div className="mt-8 divide-y divide-[#e5e5e5] border border-[#e5e5e5]">
                {catalog.plans.map((p, i) => (
                  <Link key={p.id} href="/pricing" className="group flex items-center justify-between gap-4 bg-white px-5 py-4 transition-colors hover:bg-[#fafafa] md:px-6">
                    <span className="flex items-center gap-4">
                      <span className="font-label text-[10px] tabular-nums text-[#a3a3a3]">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-sm font-medium text-black">{p.name}</span>
                    </span>
                    <span className="flex items-center gap-4">
                      <span className="text-sm text-[#525252]">
                        <span className="font-semibold tabular-nums text-black">PKR {p.price.toLocaleString("en-PK")}</span>
                        <span className="text-[#767676]"> /{p.billing_interval === "yearly" ? "year" : "month"}</span>
                      </span>
                      <span className="text-[#a3a3a3] transition-all group-hover:translate-x-1 group-hover:text-black" aria-hidden>→</span>
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

        <section className="w-full border-t border-[#262626] bg-[#0a0a0a] py-24 text-white">
          <div className="mx-auto max-w-7xl px-6 text-center md:px-10 lg:px-12">
            <div className="mx-auto max-w-2xl space-y-5">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a3a3a3] font-label">Get Started</span>
              <h2 className="text-3xl font-medium tracking-tight text-white sm:text-4xl md:text-5xl">Ready to simplify your invoicing?</h2>
              <p className="mx-auto max-w-lg leading-relaxed text-[#a3a3a3]">
                Create your workspace and start managing digital invoices with confidence.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 pt-6">
                <Link className="inline-flex bg-white px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-[#f5f5f5] font-label" href={ctaHref}>
                  Get started →
                </Link>
                <Link className="text-xs font-medium uppercase tracking-wider text-[#d4d4d4] underline underline-offset-4 hover:text-white font-label" href="/login">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-[#e5e5e5] bg-white">
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
                <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a3a3a3] font-label">Product</span>
                <ul className="space-y-2.5 text-sm text-[#525252]">
                  <li><a className="hover:text-black" href="#how-it-works">FBR Integration</a></li>
                  <li><Link className="hover:text-black" href="/pricing">Pricing Plans</Link></li>
                  <li><Link className="hover:text-black" href="/register">Create account</Link></li>
                </ul>
              </div>
              <div className="space-y-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a3a3a3] font-label">Account</span>
                <ul className="space-y-2.5 text-sm text-[#525252]">
                  <li><Link className="hover:text-black" href="/login">Sign in</Link></li>
                  <li><Link className="hover:text-black" href="/register">Register</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-[#e5e5e5] pt-6 text-xs text-[#767676]">
            FBR Digital Invoicing System · FBR-compliant invoicing workspace for Pakistan.
          </div>
        </div>
      </footer>
    </div>
  );
}
