"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import SearchInput from "@/components/SearchInput";
import { api } from "@/lib/api";
import { Client, clientDisplayName, clientTaxNo } from "@/lib/clients";

type Filter = "active" | "archived" | "all";

export default function ClientsPage() {
  const [rows, setRows] = useState<Client[] | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<{ data: Client[] }>(
      `/api/customers?status=${filter}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    )
      .then((res) => alive && setRows(res.data || []))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Load failed"));
    return () => {
      alive = false;
    };
  }, [filter, search, version]);

  async function toggleActive(client: Client) {
    setBusy(client.id);
    setError("");
    try {
      await api(`/api/customers/${client.id}/${client.is_active ? "archive" : "restore"}`, { method: "POST" });
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const tabs: Array<{ key: Filter; label: string }> = [
    { key: "active", label: "Active" },
    { key: "archived", label: "Archived" },
    { key: "all", label: "All" },
  ];

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Directory</p>
          <h1 className="text-3xl font-medium tracking-tight">Clients</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, tax no, email…" className="w-full sm:w-80" />
          <Link href="/clients/create" className="btn-primary">
            Add client
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 text-xs font-medium tracking-[0.4px] font-label ${filter === t.key ? "bg-black text-white" : "bg-transparent text-[#525252]"}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-black" role="alert">{error}</p>}

      <div className="space-y-3 md:hidden">
        {(rows || []).map((c, index) => (
          <article key={c.id} className="card-plain p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#767676] font-label">#{index + 1}</p>
                <Link href={`/clients/${c.id}`} className="mt-1 block break-words font-medium text-black underline underline-offset-4">
                  {clientDisplayName(c)}
                </Link>
                {c.name !== clientDisplayName(c) ? <p className="mt-1 break-words text-xs text-slate-400">{c.name}</p> : null}
                {!c.is_active && (
                  <span className="status-sky mt-2">
                    Archived
                  </span>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#767676]">Email</dt>
                <dd className="min-w-0 break-all text-right">{c.email || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#767676]">Phone</dt>
                <dd className="min-w-0 break-all text-right">{c.phone || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#767676]">Tax no</dt>
                <dd className="min-w-0 break-all text-right">{clientTaxNo(c) || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#767676]">Invoices</dt>
                <dd>{c.invoices_count ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#767676]">Created</dt>
                <dd>{c.created_at ? c.created_at.slice(0, 10) : "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Link href={`/clients/${c.id}`} className="btn-ghost inline-flex min-h-11 items-center justify-center px-2 text-xs">
                View
              </Link>
              <Link href={`/clients/${c.id}/edit`} className="btn-ghost inline-flex min-h-11 items-center justify-center px-2 text-xs">
                Edit
              </Link>
              <button
                className="btn-secondary inline-flex min-h-11 items-center justify-center px-2 text-xs"
                onClick={() => toggleActive(c)}
                disabled={busy === c.id}
              >
                {c.is_active ? "Archive" : "Restore"}
              </button>
            </div>
          </article>
        ))}
        {rows && rows.length === 0 && (
          <p className="card-plain px-4 py-8 text-center text-sm text-slate-400">
            {filter === "active" && !search ? "No clients yet — add your first buyer." : "No clients match."}
          </p>
        )}
      </div>

      <div className="card-plain hidden overflow-hidden p-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[#767676]">
              <tr>
                <th className="px-4 py-3 font-label text-[11px] font-semibold uppercase tracking-wider">#</th>
                <th className="px-4 py-3 font-label text-[11px] font-semibold uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 font-label text-[11px] font-semibold uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 font-label text-[11px] font-semibold uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 font-label text-[11px] font-semibold uppercase tracking-wider">Tax no</th>
                <th className="px-4 py-3 font-label text-[11px] font-semibold uppercase tracking-wider">Invoices</th>
                <th className="px-4 py-3 font-label text-[11px] font-semibold uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right font-label text-[11px] font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((c, index) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="px-4 py-3 tabular-nums text-[#767676]">{index + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/clients/${c.id}`} className="font-medium text-black underline underline-offset-4">
                      {clientDisplayName(c)}
                    </Link>
                    <span className="block text-xs text-slate-400">{c.name !== clientDisplayName(c) ? c.name : ""}</span>
                    {!c.is_active && (
                      <span className="status-sky mt-1">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{c.email || "—"}</td>
                  <td className="px-4 py-3">{c.phone || "—"}</td>
                  <td className="px-4 py-3">{clientTaxNo(c) || "—"}</td>
                  <td className="px-4 py-3">{c.invoices_count ?? 0}</td>
                  <td className="px-4 py-3">{c.created_at ? c.created_at.slice(0, 10) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-nowrap items-center justify-end gap-2">
                      <Link href={`/clients/${c.id}`} className="btn-ghost inline-flex shrink-0 px-2 py-1 text-xs">
                        View
                      </Link>
                      <Link href={`/clients/${c.id}/edit`} className="btn-ghost inline-flex shrink-0 px-2 py-1 text-xs">
                        Edit
                      </Link>
                      <button
                        className="btn-secondary inline-flex shrink-0 px-2 py-1 text-xs"
                        onClick={() => toggleActive(c)}
                        disabled={busy === c.id}
                      >
                        {c.is_active ? "Archive" : "Restore"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    {filter === "active" && !search ? "No clients yet — add your first buyer." : "No clients match."}
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
