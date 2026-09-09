"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import InvoiceRowActions from "@/components/InvoiceRowActions";
import SearchInput from "@/components/SearchInput";
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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Ledger</p>
          <h1 className="text-3xl font-medium tracking-tight">Invoices</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search buyer, invoice ref or FBR no…" className="w-full sm:w-80" />
          <Link href="/invoices/create" className="btn-primary">
            Create invoice
          </Link>
        </div>
      </div>
      <div className="overflow-hidden border border-[#e5e5e5] bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[11px] uppercase tracking-[0.14em] text-[#767676] font-label">
              <th className="px-6 py-3.5 font-semibold">Buyer</th>
              <th className="px-6 py-3.5 font-semibold">Date</th>
              <th className="px-6 py-3.5 font-semibold">Status</th>
              <th className="px-6 py-3.5 text-right font-semibold">Total</th>
              <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id} className="border-b border-[#e5e5e5] last:border-0 hover:bg-[#fafafa]">
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
                  <InvoiceRowActions invoice={{ id: inv.id, status: inv.status }} onDeleted={() => load(query)} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-[#767676]">
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
