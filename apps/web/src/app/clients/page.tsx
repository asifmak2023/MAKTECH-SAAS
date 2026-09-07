"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/clients/create" className="rounded-md bg-win-600 px-4 py-2 text-sm text-white">
          Add client
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-md border border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`px-4 py-2 text-sm ${filter === t.key ? "bg-win-600 text-white" : "bg-white text-slate-600"}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Search name, tax no, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      <div className="rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Client</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Tax no</th>
                <th>Invoices</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((c) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="py-2 pr-4">
                    <Link href={`/clients/${c.id}`} className="font-medium text-win-600">
                      {clientDisplayName(c)}
                    </Link>
                    <span className="block text-xs text-slate-400">{c.name !== clientDisplayName(c) ? c.name : ""}</span>
                    {!c.is_active && (
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
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
                      <Link href={`/clients/${c.id}`} className="rounded-md bg-slate-100 px-2 py-1 text-xs">
                        View
                      </Link>
                      <Link href={`/clients/${c.id}/edit`} className="rounded-md bg-slate-100 px-2 py-1 text-xs">
                        Edit
                      </Link>
                      <button
                        className={`rounded-md px-2 py-1 text-xs ${c.is_active ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
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
