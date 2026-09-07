"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import InvoiceRowActions from "@/components/InvoiceRowActions";
import { api } from "@/lib/api";
import { formatStatus, money, statusStyles } from "@/lib/status";

type Stats = {
  draft: number;
  pending_approval: number;
  approved: number;
  submitted: number;
  failed: number;
  recent: InvoiceRow[];
};

type InvoiceRow = {
  id: number;
  buyer_business_name: string;
  status: string;
  grand_total: number;
  invoice_date: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvoiceRow[] | null>(null);

  const load = useCallback(() => {
    api<Stats>("/api/dashboard")
      .then(setStats)
      .catch((err) => setError(err.message));
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

  const cards = [
    ["Draft", stats?.draft],
    ["Pending", stats?.pending_approval],
    ["Approved", stats?.approved],
    ["Submitted", stats?.submitted],
    ["Failed", stats?.failed],
  ];

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/invoices/create" className="rounded-md bg-win-600 px-4 py-2 text-sm text-white">
          Create invoice
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
            <p className="text-xs uppercase text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{searching ? "Search results" : "Recent invoices"}</h2>
          <div className="relative w-full max-w-xs">
            <svg viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all invoices…"
              className="pl-9"
            />
          </div>
        </div>
        {searching && results === null ? (
          <p className="py-4 text-sm text-slate-500">Searching…</p>
        ) : list && list.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Buyer</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="py-2">
                    <Link className="text-win-600" href={`/invoices/${inv.id}`}>
                      {inv.buyer_business_name}
                    </Link>
                  </td>
                  <td>{inv.invoice_date?.slice(0, 10)}</td>
                  <td>
                    <span className={`rounded-full px-2 py-1 text-xs ${statusStyles[inv.status] || ""}`}>
                      {formatStatus(inv.status)}
                    </span>
                  </td>
                  <td className="text-right">PKR {money(inv.grand_total)}</td>
                  <td className="text-right">
                    <InvoiceRowActions invoice={{ id: inv.id, status: inv.status }} onDeleted={() => (searching ? load() : undefined)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-4 text-sm text-slate-500">
            {searching ? `No invoices match “${query.trim()}”.` : stats ? "No invoices yet." : "Loading…"}
          </p>
        )}
      </div>
    </AppShell>
  );
}
