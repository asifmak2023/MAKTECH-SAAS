"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { SupportSession, SupportMessage, fmtWhen } from "@/lib/admin";
import { statusStyles, formatStatus } from "@/lib/status";

const card = "card-plain p-4";
const pill = (s: string) => `inline-flex px-2.5 py-1 text-xs font-medium ${statusStyles[s] || "status-sky"}`;
const filters = ["active", "all", "open", "in_progress", "resolved", "archived"] as const;

export default function AdminSupportPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("active");
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [selected, setSelected] = useState<SupportSession | null>(null);
  const [thread, setThread] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadList(f = filter) {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (f !== "all") q.set("status", f);
      const res = await api<{ data: SupportSession[] }>(`/api/admin/support?${q}`);
      setSessions(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  async function openSession(s: SupportSession) {
    setSelected(s);
    try {
      const res = await api<SupportSession & { messages: SupportMessage[] }>(`/api/admin/support/${s.id}`);
      setThread(res.messages);
    } catch (e) {
      setThread([]);
      setError(e instanceof Error ? e.message : "Failed to load thread");
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) openSession(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  async function reply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const body = String(new FormData(e.currentTarget).get("body") ?? "");
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/support/${selected.id}/messages`, { method: "POST", body: JSON.stringify({ body }) });
      e.currentTarget.reset();
      await loadList();
      await openSession(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(s: SupportSession, status: string, note?: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/support/${s.id}/status`, { method: "POST", body: JSON.stringify({ status, note: note || undefined }) });
      await loadList();
      await openSession({ ...s, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status change failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Inbox</p>
          <h1 className="text-3xl font-medium tracking-tight">Support</h1>
        </div>
        <div className="flex border border-[#e5e5e5] text-sm">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); loadList(f); }}
              className={`px-3 py-1.5 capitalize ${
                filter === f ? "bg-black text-white" : "bg-white text-[#525252]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className={`${card} max-h-[70vh] overflow-y-auto lg:col-span-2`}>
          {loading && <p className="text-sm text-slate-500">Loading...</p>}
          {!loading && sessions.length === 0 && <p className="text-sm text-slate-400">No sessions.</p>}
          <ul className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => openSession(s)}
                  className={`w-full px-2 py-3 text-left ${selected?.id === s.id ? "bg-[#f5f5f5]" : "hover:bg-[#fafafa]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{s.reference}</p>
                    <span className={pill(s.priority)}>{s.priority}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-700">{s.subject}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{s.tenant?.name ?? "?"} · {s.category}</span>
                    <span className={pill(s.status)}>{formatStatus(s.status)}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">{s.latestMessage?.body ?? "no messages yet"}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${card} flex max-h-[70vh] flex-col lg:col-span-3`}>
          {!selected ? (
            <p className="text-sm text-slate-400">Select a session to open the conversation.</p>
          ) : (
            <>
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-slate-800">{selected.subject}</h2>
                    <p className="text-xs text-slate-500">
                      {selected.reference} · {selected.tenant?.name} · opened {fmtWhen(selected.opened_at)}
                      {selected.assignedTo ? ` · assigned to ${selected.assignedTo.name}` : ""}
                    </p>
                  </div>
                  <select
                    className="w-auto"
                    value={selected.status}
                    disabled={busy}
                    onChange={(e) => changeStatus(selected, e.target.value)}
                  >
                    {["open", "in_progress", "resolved", "archived"].map((s) => (
                      <option key={s} value={s}>{formatStatus(s)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto py-3">
                {thread.map((m) => {
                  const isAdmin = m.sender_type === "admin";
                  const isSystem = m.sender_type === "system";
                  return (
                    <div key={m.id} className={`max-w-[85%] ${isAdmin ? "ml-auto" : isSystem ? "mx-auto" : ""}`}>
                      <div
                        className={`border border-[#e5e5e5] px-3 py-2 text-sm ${
                          isSystem
                            ? "bg-[#f5f5f5] text-[#525252]"
                            : isAdmin
                              ? "bg-black text-white"
                              : "bg-[#f5f5f5] text-black"
                        }`}
                      >
                        {m.body}
                      </div>
                      <p className={`mt-0.5 text-xs text-slate-400 ${isAdmin ? "text-right" : ""}`}>
                        {isAdmin ? m.sender?.name ?? "Admin" : isSystem ? "System" : m.sender?.name ?? "Tenant"} · {fmtWhen(m.created_at)}
                      </p>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={reply} className="flex items-end gap-2 border-t border-slate-100 pt-3">
                <textarea
                  name="body"
                  rows={2}
                  required
                  placeholder="Write a reply…"
                  className="flex-1"
                />
                <button className="bg-black text-white" disabled={busy}>{busy ? "Sending..." : "Send reply"}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
