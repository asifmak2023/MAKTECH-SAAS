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

      <div className="mb-4 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider font-label ${filter === t.key ? "bg-black text-white" : "bg-transparent text-[#525252]"}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-black" role="alert">{error}</p>}

      <div className="border border-[#e5e5e5] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[#767676]">
              <tr>
                <th className="px-4 py-3 font-label text-[11px] font-semibold uppercase tracking-wider">Client</th>
                <th className="font-label text-[11px] font-semibold uppercase tracking-wider">Email</th>
                <th className="font-label text-[11px] font-semibold uppercase tracking-wider">Phone</th>
                <th className="font-label text-[11px] font-semibold uppercase tracking-wider">Tax no</th>
                <th className="font-label text-[11px] font-semibold uppercase tracking-wider">Invoices</th>
                <th className="font-label text-[11px] font-semibold uppercase tracking-wider">Created</th>
                <th className="text-right font-label text-[11px] font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((c) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="py-2 pr-4">
                    <Link href={`/clients/${c.id}`} className="font-medium text-black underline underline-offset-4">
                      {clientDisplayName(c)}
                    </Link>
                    <span className="block text-xs text-slate-400">{c.name !== clientDisplayName(c) ? c.name : ""}</span>
                    {!c.is_active && (
                      <span className="mt-1 inline-block border border-[#e5e5e5] bg-[#f5f5f5] px-2 py-0.5 text-[11px] text-[#525252]">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{c.email || "—"}</td>
                  <td className="py-2 pr-4">{c.phone || "—"}</td>
                  <td className="py-2 pr-4">{clientTaxNo(c) || "—"}</td>
                  <td className="py-2 pr-4">{c.invoices_count ?? 0}</td>
                  <td className="py-2 pr-4">{c.created_at ? c.created_at.slice(0, 10) : "—"}</td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/clients/${c.id}`} className="border border-[#e5e5e5] px-2 py-1 text-xs">
                        View
                      </Link>
                      <Link href={`/clients/${c.id}/edit`} className="border border-[#e5e5e5] px-2 py-1 text-xs">
                        Edit
                      </Link>
                      <button
                        className="border border-black px-2 py-1 text-xs text-black"
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
                  <td colSpan={7} className="py-8 text-center text-slate-400">
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
