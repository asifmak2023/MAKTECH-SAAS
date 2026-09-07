"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import InvoiceRowActions from "@/components/InvoiceRowActions";
import { api } from "@/lib/api";
import { formatStatus, money, statusStyles } from "@/lib/status";

type Invoice = {
  id: number;
  buyer_business_name: string;
  status: string;
  grand_total: number;
  invoice_date: string;
};

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");

  const load = useCallback((q: string) => {
    const url = q.trim() ? `/api/invoices?search=${encodeURIComponent(q.trim())}` : "/api/invoices";
    api<{ data: Invoice[] }>(url).then((res) => setRows(res.data || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Link href="/invoices/create" className="rounded-md bg-win-600 px-4 py-2 text-sm text-white">
          Create invoice
        </Link>
      </div>
      <div className="mb-4 relative max-w-md">
        <svg viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search buyer, invoice ref or FBR no…"
          className="pl-9"
        />
      </div>
      <div className="rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">Buyer</th>
              <th>Date</th>
              <th>Status</th>
              <th className="text-right">Total</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
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
                  <InvoiceRowActions invoice={{ id: inv.id, status: inv.status }} onDeleted={() => load(query)} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-t">
                <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                  {query.trim() ? `No invoices match “${query.trim()}”.` : "No invoices yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
