"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import InvoiceRowActions from "@/components/InvoiceRowActions";
import SearchInput from "@/components/SearchInput";
import { api } from "@/lib/api";
import { formatStatus, money, statusStyles } from "@/lib/status";

type Stats = {
  draft: number;
  pending_approval: number;
  approved: number;
  submitted: number;
  failed: number;
  total?: number;
  customers?: number;
  products?: number;
  recent: InvoiceRow[];
};

type InvoiceRow = {
  id: number;
  buyer_business_name: string;
  status: string;
  grand_total: number;
  invoice_date: string;
};

type Onboarding = {
  onboarding: {
    seller_profile_complete: boolean;
    sandbox_configured: boolean;
    sandbox_tested: boolean;
    sandbox_suite_passed: boolean;
    production_configured: boolean;
    production_active: boolean;
    can_activate_production: boolean;
  };
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvoiceRow[] | null>(null);
  const [onb, setOnb] = useState<Onboarding | null>(null);

  const load = useCallback(() => {
    api<Stats>("/api/dashboard")
      .then(setStats)
      .catch((err) => setError(err.message));
    api<Onboarding>("/api/settings/fbr").then(setOnb).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const searching = query.trim().length > 0;
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api<{ data: InvoiceRow[] }>(`/api/invoices?search=${encodeURIComponent(q)}`)
        .then((res) => setResults(res.data || []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const list = searching ? results : stats?.recent;

  const cards: Array<[string, number | undefined]> = [
    ["Draft", stats?.draft],
    ["Pending", stats?.pending_approval],
    ["Approved", stats?.approved],
    ["Submitted", stats?.submitted],
    ["Failed", stats?.failed],
    ["Clients", stats?.customers],
  ];

  const pendingSetup =
    onb && !onb.onboarding.sandbox_tested
      ? !onb.onboarding.seller_profile_complete
        ? "Add your seller NTN/CNIC and business name"
        : !onb.onboarding.sandbox_configured
          ? "Add a sandbox token to start validating invoices"
          : "Run the token test and scenario suite"
      : null;

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Workspace</p>
          <h1 className="text-3xl font-medium tracking-tight">Dashboard</h1>
        </div>
        <Link href="/invoices/create" className="btn-primary">
          Create invoice
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-black" role="alert">{error}</p>}

      <div className="grid gap-px border border-[#e5e5e5] bg-[#e5e5e5] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-white p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#767676] font-label">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value ?? 0}</p>
          </div>
        ))}
      </div>

      {onb && pendingSetup && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-[#e5e5e5] bg-[#f5f5f5] px-4 py-3">
          <p className="text-sm text-[#262626]">
            <span className="font-medium text-black">Finish FBR setup.</span> {pendingSetup}.
          </p>
          <Link href="/settings/fbr" className="btn-ghost">
            FBR setup
          </Link>
        </div>
      )}

      {onb && !pendingSetup && onb.onboarding.sandbox_tested && !onb.onboarding.production_active && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-black bg-white px-4 py-3">
          <p className="text-sm text-[#262626]">
            <span className="font-medium text-black">Sandbox verified.</span> Ready to activate production.
          </p>
          <Link href="/settings/fbr" className="btn-ghost">
            Go live
          </Link>
        </div>
      )}

      <div className="mt-8 border border-[#e5e5e5] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] px-6 py-4">
          <h2 className="text-sm font-medium">{searching ? "Search results" : "Recent invoices"}</h2>
          <SearchInput value={query} onChange={setQuery} placeholder="Search all invoices…" className="w-full max-w-xs" />
        </div>
        {searching && results === null ? (
          <p className="px-6 py-4 text-sm text-[#767676]">Searching…</p>
        ) : list && list.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[11px] uppercase tracking-[0.14em] text-[#767676] font-label">
                  <th className="px-6 py-3.5 font-semibold">Invoice</th>
                  <th className="px-6 py-3.5 font-semibold">Buyer</th>
                  <th className="px-6 py-3.5 font-semibold">Date</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Total</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#e5e5e5] last:border-0 hover:bg-[#fafafa]">
                    <td className="px-6 py-4 font-medium tabular-nums text-black">#{inv.id}</td>
                    <td className="px-6 py-4">
                      <Link className="font-medium text-black underline underline-offset-4" href={`/invoices/${inv.id}`}>
                        {inv.buyer_business_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 tabular-nums text-[#525252]">{inv.invoice_date?.slice(0, 10)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium ${statusStyles[inv.status] || ""}`}>
                        {formatStatus(inv.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums">PKR {money(inv.grand_total)}</td>
                    <td className="px-6 py-4 text-right">
                      <InvoiceRowActions invoice={{ id: inv.id, status: inv.status }} onDeleted={() => (searching ? undefined : load())} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-[#767676]">
            {searching ? `No invoices match “${query.trim()}”.` : stats ? "No invoices yet." : "Loading…"}
          </p>
        )}
      </div>
    </AppShell>
  );
}
