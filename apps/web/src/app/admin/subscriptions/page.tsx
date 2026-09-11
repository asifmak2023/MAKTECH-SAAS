"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminSubscriptionRow, Paginated, fmtDate, money } from "@/lib/admin";
import { formatStatus, statusStyles } from "@/lib/status";

const card = "card-plain p-4";
const pill = (s: string) => `inline-flex px-2.5 py-1 text-xs font-medium ${statusStyles[s] || "status-sky"}`;
const filters = ["", "active", "pending", "trial", "grace_period", "expired"];

export default function AdminSubscriptionsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState<Paginated<AdminSubscriptionRow> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(st = status, p = 1) {
    setLoading(true);
    setError("");
    const q = new URLSearchParams({ page: String(p) });
    if (st) q.set("status", st);
    try {
      setPage(await api<Paginated<AdminSubscriptionRow>>(`/api/admin/subscriptions?${q}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow mb-2">Finance</p>
        <h1 className="text-3xl font-medium tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-[#767676]">Seller SaaS plans — assign and review, without opening their invoicing workspace.</p>
      </div>

      <div className="flex flex-wrap border border-[#e5e5e5] w-fit">
        {filters.map((f) => (
          <button
            key={f || "all"}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider font-label ${status === f ? "bg-black text-white" : "bg-white text-[#525252]"}`}
            onClick={() => { setStatus(f); load(f, 1); }}
          >
            {f === "" ? "All" : formatStatus(f)}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <div className={card}>
        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {!loading && page && page.data.length === 0 && <p className="text-sm text-slate-400">No subscriptions found.</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="pb-2 font-medium">Seller</th>
              <th className="pb-2 font-medium">Plan</th>
              <th className="pb-2 font-medium">Interval</th>
              <th className="pb-2 font-medium">Price</th>
              <th className="pb-2 font-medium">Usage</th>
              <th className="pb-2 font-medium">Period end</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {page?.data.map((s) => (
              <tr key={s.id}>
                <td className="py-2.5 pr-3">
                  {s.tenant ? (
                    <Link className="font-medium text-black underline underline-offset-4" href={`/admin/tenants/${s.tenant.id}`}>{s.tenant.name}</Link>
                  ) : "—"}
                </td>
                <td className="py-2.5 pr-3 text-slate-700">{s.plan?.name ?? "—"}</td>
                <td className="py-2.5 pr-3 text-slate-600">{s.billing_interval}</td>
                <td className="py-2.5 pr-3">PKR {money(s.price)}</td>
                <td className="py-2.5 pr-3 text-slate-600">{s.used_invoices}/{s.invoice_limit ?? "∞"}</td>
                <td className="py-2.5 pr-3 text-slate-600">{fmtDate(s.current_period_end)}</td>
                <td className="py-2.5"><span className={pill(s.status)}>{formatStatus(s.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {page && page.last_page > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <button className="rounded-md bg-black/[0.06] px-3 py-1.5 disabled:opacity-40" disabled={page.current_page <= 1} onClick={() => load(status, page.current_page - 1)}>Previous</button>
            <span className="text-slate-500">Page {page.current_page} of {page.last_page}</span>
            <button className="rounded-md bg-black/[0.06] px-3 py-1.5 disabled:opacity-40" disabled={page.current_page >= page.last_page} onClick={() => load(status, page.current_page + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
