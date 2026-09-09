"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { ClientShow, clientDisplayName, clientTaxNo } from "@/lib/clients";
import { formatStatus, money, statusStyles } from "@/lib/status";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ClientShow | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<ClientShow>(`/api/customers/${params.id}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive() {
    if (!data) return;
    if (data.customer.is_active && !window.confirm("Archive this client? They will be hidden from new invoice autofill.")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/customers/${data.customer.id}/${data.customer.is_active ? "archive" : "restore"}`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <AppShell>
        <p className="text-sm text-rose-600">{error}</p>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <p>Loading...</p>
      </AppShell>
    );
  }

  const c = data.customer;

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Directory</p>
          <h1 className="text-3xl font-medium tracking-tight">{clientDisplayName(c)}</h1>
          <p className="mt-1 text-sm text-[#767676]">
            {[c.name !== clientDisplayName(c) ? c.name : null, c.city, c.province].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex px-2.5 py-1 text-xs font-medium ${c.is_active ? "bg-black text-white" : "border border-[#e5e5e5] bg-[#f5f5f5] text-[#525252]"}`}>
            {c.is_active ? "Active" : "Archived"}
          </span>
          <Link href={`/clients/${c.id}/edit`} className="btn-ghost">
            Edit
          </Link>
          <button
            className="border border-black px-4 py-2 text-black"
            onClick={toggleActive}
            disabled={busy}
          >
            {c.is_active ? "Archive" : "Restore"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      <div className="mb-6 grid gap-4 border border-[#e5e5e5] bg-white p-5 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-slate-400">Email</p>
          <p className="mt-1 text-sm">{c.email || "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Phone</p>
          <p className="mt-1 text-sm">{c.phone || "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Tax no</p>
          <p className="mt-1 text-sm">{clientTaxNo(c) || "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Registration type</p>
          <p className="mt-1 text-sm">{c.registration_type || "—"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs uppercase text-slate-400">Billing address</p>
          <p className="mt-1 text-sm">{c.address || "—"}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Invoices ({data.customer.invoices_count ?? data.recent_invoices.length})</h2>
        <Link href={`/invoices/create?client=${c.id}`} className="bg-black px-4 py-2 text-white">
          New invoice for this client
        </Link>
      </div>

      <div className="border border-[#e5e5e5] bg-white p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Invoice</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_invoices.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="py-2">
                    <Link href={`/invoices/${inv.id}`} className="text-black underline underline-offset-4">
                      {inv.fbr_invoice_number || `#${inv.id}`}
                    </Link>
                  </td>
                  <td>{inv.invoice_date?.slice(0, 10)}</td>
                  <td>
                    <span className={`rounded-full px-2 py-1 text-xs ${statusStyles[inv.status] || ""}`}>
                      {formatStatus(inv.status)}
                    </span>
                  </td>
                  <td className="text-right">PKR {money(inv.grand_total)}</td>
                </tr>
              ))}
              {data.recent_invoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No invoices for this client yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
