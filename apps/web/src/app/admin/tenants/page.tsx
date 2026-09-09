"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import { api } from "@/lib/api";
import { Paginated, TenantRow } from "@/lib/admin";
import { statusStyles, formatStatus } from "@/lib/status";

const card = "border border-[#e5e5e5] bg-white p-4";
const pill = (s: string) => `inline-flex px-2.5 py-1 text-xs font-medium ${statusStyles[s] || "border border-[#e5e5e5] bg-[#f5f5f5] text-[#262626]"}`;

const statuses = ["", "pending", "trial", "active", "past_due", "grace_period", "suspended", "cancelled"];

export default function AdminTenantsPage() {
  const [page, setPage] = useState<TenantRow[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number }>({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [cur, setCur] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(p = cur, s = search, st = status) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (s) params.set("search", s);
    if (st) params.set("status", st);
    params.set("page", String(p));
    try {
      const res = await api<Paginated<TenantRow>>(`/api/admin/tenants?${params}`);
      setPage(res.data);
      setMeta({ current_page: res.current_page, last_page: res.last_page, total: res.total });
      setCur(res.current_page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sellers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    load(1, search, status);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Directory</p>
          <h1 className="text-3xl font-medium tracking-tight">Sellers</h1>
          <p className="mt-1 text-sm text-[#767676]">SaaS tenants — seller profiles, not their customers or invoices.</p>
        </div>
        <Link href="/admin/tenants/new" className="btn-primary">
          Add seller
        </Link>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label>Search</label>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Name, username, NTN/CNIC, legal name"
            aria-label="Search tenants"
            className="w-full"
          />
        </div>
        <div>
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map((s) => (
              <option key={s} value={s}>{s === "" ? "All statuses" : formatStatus(s)}</option>
            ))}
          </select>
        </div>
        <button className="bg-black text-white">Filter</button>
      </form>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className={card}>
        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {!loading && page.length === 0 && <p className="text-sm text-slate-400">No sellers found.</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="pb-2 font-medium">Seller</th>
              <th className="pb-2 font-medium">NTN / contact</th>
              <th className="pb-2 font-medium">PRAL</th>
              <th className="pb-2 font-medium">Usage</th>
              <th className="pb-2 font-medium">SaaS users</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {page.map((t) => (
              <tr key={t.id} className="group">
                <td className="py-2.5 pr-3">
                  <Link href={`/admin/tenants/${t.id}`} className="font-medium text-black underline underline-offset-4">
                    {t.name}
                  </Link>
                  <p className="text-xs text-slate-500">/{t.slug}{t.legal_name ? ` · ${t.legal_name}` : ""}</p>
                </td>
                <td className="py-2.5 pr-3">
                  <p className="text-slate-700">{t.seller_business_name || "—"}</p>
                  <p className="text-xs text-slate-500">{t.seller_ntn_cnic || t.seller_email || ""}</p>
                </td>
                <td className="py-2.5 pr-3 text-slate-600">{t.fbr_mode || "—"}</td>
                <td className="py-2.5 pr-3 text-slate-600">{t.invoices_count ?? 0}</td>
                <td className="py-2.5 pr-3 text-slate-600">{t.users_count ?? 0}</td>
                <td className="py-2.5">
                  <span className={pill(t.status)}>{formatStatus(t.status)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            className="rounded-md bg-black/[0.06] px-3 py-1.5 text-slate-700 disabled:opacity-40"
            disabled={meta.current_page <= 1 || loading}
            onClick={() => load(meta.current_page - 1)}
          >
            Previous
          </button>
          <span className="text-slate-500">Page {meta.current_page} of {meta.last_page} · {meta.total} sellers</span>
          <button
            className="rounded-md bg-black/[0.06] px-3 py-1.5 text-slate-700 disabled:opacity-40"
            disabled={meta.current_page >= meta.last_page || loading}
            onClick={() => load(meta.current_page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
